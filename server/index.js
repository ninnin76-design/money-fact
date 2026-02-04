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
    const currentType = (now.getHours() >= 20 || now.getHours() < 9) ? 'MARKET_CLOSE' : 'LIVE';

    console.log(`[Worker] Starting DEEP SCAN (Top 100) at ${now.toLocaleTimeString()}`);
    try {
        const token = await getAccessToken();

        // Fetch Top 100 Market Leaders (Increased from 40 for more scrolling content)
        const rankRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
            params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
        });

        const candidates = rankRes.data.output || [];
        if (candidates.length === 0) return;

        const historyData = new Map();
        let hits = 0;

        // Scan Top 100 in chunks to respect rate limits
        const fullList = candidates.slice(0, 100);
        for (let i = 0; i < fullList.length; i += 10) {
            const chunk = fullList.slice(i, i + 10);
            await Promise.all(chunk.map(async (stk) => {
                try {
                    const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012200', custtype: 'P' },
                        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.mksc_shrn_iscd }
                    });
                    const daily = invRes.data.output || [];
                    if (daily.length > 5) {
                        hits++;
                        historyData.set(stk.mksc_shrn_iscd, {
                            name: stk.hts_kor_isnm, price: stk.stck_prpr, rate: stk.prdy_ctrt, daily
                        });
                    }
                } catch (e) { }
            }));
            await new Promise(r => setTimeout(r, 1200)); // Throttle
        }

        if (hits === 0) return;

        const newBuyData = {}, newSellData = {};
        const periods = [5, 10, 20, 30];
        const investors = ['0', '4', '2', '1'];

        periods.forEach(p => {
            investors.forEach(inv => {
                const buys = [], sells = [];
                historyData.forEach((val, code) => {
                    let b = 0, s = 0;
                    for (let j = 0; j < val.daily.length; j++) {
                        let net = 0;
                        const d = val.daily[j];
                        if (inv === '0') net = parseInt(d.frgn_ntby_qty) + parseInt(d.orgn_ntby_qty);
                        else if (inv === '4') net = parseInt(d.pnsn_ntby_qty);
                        else if (inv === '2') net = parseInt(d.frgn_ntby_qty);
                        else if (inv === '1') net = parseInt(d.orgn_ntby_qty);

                        if (net > 0) { b++; if (s > 0) break; }
                        else if (net < 0) { s++; if (b > 0) break; }
                        else break;
                    }
                    if (b >= p) buys.push({ name: val.name, code, price: val.price, rate: val.rate, streak: b });
                    if (s >= p) sells.push({ name: val.name, code, price: val.price, rate: val.rate, streak: s });
                });
                newBuyData[`${p}_${inv}`] = buys.sort((a, b) => b.streak - a.streak);
                newSellData[`${p}_${inv}`] = sells.sort((a, b) => b.streak - a.streak);
            });
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
app.listen(3000, () => console.log('Deep Scan Server Online'));
