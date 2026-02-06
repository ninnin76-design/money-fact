const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

const SNAPSHOT_FILE = './market_report_snapshot.json';

let cachedToken = '';
let tokenExpiry = null;

let marketAnalysisReport = {
    updateTime: null,
    dataType: 'LIVE',
    status: 'INITIALIZING',
    buyData: {},
    sellData: {}
};

if (fs.existsSync(SNAPSHOT_FILE)) {
    try {
        marketAnalysisReport = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
    } catch (e) { }
}

async function getAccessToken() {
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) return cachedToken;
    try {
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        cachedToken = res.data.access_token;
        tokenExpiry = new Date(new Date().getTime() + (res.data.expires_in - 3600) * 1000);
        return cachedToken;
    } catch (e) { return cachedToken; }
}

async function runDeepMarketScan() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=Sun, 6=Sat

    // Market Hours: 8 AM - 8 PM, Weekdays only
    const isWeekend = (day === 0 || day === 6);
    const isMarketOpen = (hour >= 8 && hour < 20) && !isWeekend;

    if (!isMarketOpen) {
        console.log(`[Worker] Market Closed (${now.toLocaleTimeString()}). Serving cached data.`);
        marketAnalysisReport.dataType = 'MARKET_CLOSE';
        return; // Skip fetching, just serve cached snapshot
    }

    const currentType = 'LIVE';
    console.log(`[Worker] Starting DEEP SCAN (Top 100) at ${now.toLocaleTimeString()}`);
    try {
        const token = await getAccessToken();

        // Source 1: Foreign/Inst Net Buy Rank (Market Leaders)
        const rankRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
        });

        // Source 2: Volume Rank (KOSPI - 0001)
        const volResKospi = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPST01710000', custtype: 'P' },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '0001',
                FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000',
                FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: ''
            }
        });

        // Source 3: Volume Rank (KOSDAQ - 1001)
        const volResKosdaq = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPST01710000', custtype: 'P' },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '1001',
                FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000',
                FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: ''
            }
        });

        // Merge Candidates
        const raw1 = rankRes.data.output || [];
        const raw2 = volResKospi.data.output || [];
        const raw3 = volResKosdaq.data.output || [];

        const candidateMap = new Map();
        const add = (arr) => arr.forEach(c => {
            if (c.mksc_shrn_iscd) candidateMap.set(c.mksc_shrn_iscd, { code: c.mksc_shrn_iscd, name: c.hts_kor_isnm });
        });
        add(raw1); add(raw2); add(raw3);

        const candidates = Array.from(candidateMap.values());
        console.log(`[Worker] Deep Scan Targets: ${candidates.length} unique from (Rank:${raw1.length}, KOSPI:${raw2.length}, KOSDAQ:${raw3.length})`);

        if (candidates.length === 0) return;

        const historyData = new Map();
        let hits = 0;

        // Scan ALL candidates (Increased up to 200)
        const fullList = candidates.slice(0, 200);
        for (let i = 0; i < fullList.length; i += 10) {
            const chunk = fullList.slice(i, i + 10);
            await Promise.all(chunk.map(async (stk) => {
                try {
                    const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                    });
                    const daily = invRes.data.output || [];
                    if (daily.length > 5) {
                        hits++;
                        const currentPrice = daily[0].stck_clpr;
                        const currentRate = daily[0].prdy_ctrt;
                        historyData.set(stk.code, {
                            name: stk.name, price: currentPrice, rate: currentRate, daily
                        });
                    }
                } catch (e) { }
            }));
            await new Promise(r => setTimeout(r, 120)); // High speed scan (120ms)
            if (i % 50 === 0) console.log(`[Worker] Progress: ${i}/${fullList.length}`);
        }

        if (hits === 0) return;

        const newBuyData = {}, newSellData = {};
        const investors = ['0', '2', '1'];

        // Initialize buckets for 5+ days (representing "General List")
        investors.forEach(inv => {
            newBuyData[`5_${inv}`] = [];
            newSellData[`5_${inv}`] = [];
        });

        historyData.forEach((val, code) => {
            investors.forEach(inv => {
                let buyStreak = 0, sellStreak = 0;

                // Calculate Strict Streak (allowing 0 net change to not break, but opposite breaks)
                for (let j = 0; j < val.daily.length; j++) {
                    const d = val.daily[j];
                    let net = 0;
                    if (inv === '0') net = parseInt(d.frgn_ntby_qty) + parseInt(d.orgn_ntby_qty);
                    else if (inv === '2') net = parseInt(d.frgn_ntby_qty);
                    else if (inv === '1') net = parseInt(d.orgn_ntby_qty);

                    if (net > 0) {
                        buyStreak++;
                        if (sellStreak > 0) break; // Direction changed
                    } else if (net < 0) {
                        sellStreak++;
                        if (buyStreak > 0) break; // Direction changed
                    } else {
                        // Net is 0. Does it break streak? 
                        // For "Trend", maybe not. For "Consecutive", yes.
                        // User wants "Trend" effectively. Let's strictly break on 0 for purity.
                        break;
                    }
                }

                if (buyStreak >= 3) {
                    newBuyData[`5_${inv}`].push({ name: val.name, code, price: val.price, rate: val.rate, streak: buyStreak });
                }
                if (sellStreak >= 3) {
                    newSellData[`5_${inv}`].push({ name: val.name, code, price: val.price, rate: val.rate, streak: sellStreak });
                }
            });
        });

        // Sort by Streak Descending
        investors.forEach(inv => {
            newBuyData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
            newSellData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
        });

        marketAnalysisReport.buyData = newBuyData;
        marketAnalysisReport.sellData = newSellData;
        marketAnalysisReport.updateTime = new Date();
        marketAnalysisReport.dataType = currentType;
        marketAnalysisReport.status = 'READY';
        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(marketAnalysisReport));
    } catch (e) { console.error("Worker Error", e.message); }
}

runDeepMarketScan();
setInterval(runDeepMarketScan, 15 * 60 * 1000);

app.get('/api/analysis/supply/:period/:investor', (req, res) => {
    const key = `${req.params.period}_${req.params.investor}`;
    const mode = req.query.mode || 'buy';
    const data = (mode === 'buy') ? marketAnalysisReport.buyData[key] : marketAnalysisReport.sellData[key];
    res.json({ output: data || [], updateTime: marketAnalysisReport.updateTime, dataType: marketAnalysisReport.dataType });
});

app.post('/api/portfolio/recommend', async (req, res) => {
    const { stocks, amount, mode, ignoreBudget } = req.body;
    const token = await getAccessToken();
    const isBuy = mode === 'buy';
    const budgetTotal = parseInt(amount) || 0;
    const budgetPerStock = budgetTotal / Math.max(1, stocks.length);

    const detailedPortfolio = await Promise.all(stocks.map(async (s) => {
        let finance = { per: '-', pbr: '-', cap: '-' };
        let perText = "-", pbrText = "-";
        const price = parseInt(s.price);
        const buyableShares = budgetPerStock > 0 ? Math.floor(budgetPerStock / price) : 0;

        try {
            const fRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010100', custtype: 'P' },
                params: { fid_cond_mrkt_div_code: 'J', fid_input_iscd: s.code }
            });
            const d = fRes.data.output;
            const perVal = parseFloat(d.per);
            const pbrVal = parseFloat(d.pbr);
            finance = { per: d.per || '-', pbr: d.pbr || '-', cap: d.hts_avls ? Math.round(parseInt(d.hts_avls) / 1000) + "조" : '-' };
            if (perVal > 0 && perVal < 8) perText = "초저평가(수익탄탄)";
            else if (perVal >= 8 && perVal < 15) perText = "적정수준(안정적)";
            else if (perVal >= 15) perText = "기대치높음(성장형)";
            if (pbrVal > 0 && pbrVal < 0.6) pbrText = "자산 대비 헐값(안전)";
            else if (pbrVal >= 0.6 && pbrVal < 1.0) pbrText = "자산 가치 저평가";
            else if (pbrVal >= 1.0) pbrText = "프리미엄(브랜드가치)";
        } catch (e) { }

        return {
            ...s, finance, perText, pbrText,
            shares: buyableShares,
            insight: isBuy ? "수급 주체들의 강력한 매수세가 확인되며, 재무 건전성이 우수합니다." : "수급 이탈 징후가 포착되어 주의가 필요합니다.",
            isBuyable: ignoreBudget ? true : (buyableShares > 0)
        };
    }));
    res.json({ portfolio: detailedPortfolio });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Deep Scan Server Online on port ${PORT}`));
