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
app.use(express.static(path.join(__dirname, './')));

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

const TOKEN_FILE = './real_token_cache.json';

async function getAccessToken() {
    // 1. Try to read from file first
    if (fs.existsSync(TOKEN_FILE)) {
        try {
            const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            const expiry = new Date(saved.expiry);
            if (new Date() < expiry) {
                return saved.token;
            }
        } catch (e) { }
    }

    // 2. Request New Token with Retry Logic
    try {
        console.log("[Token] Requesting NEW token from KIS...");
        const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        const newToken = res.data.access_token;
        const newExpiry = new Date(new Date().getTime() + (res.data.expires_in - 60) * 1000);

        fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token: newToken, expiry: newExpiry }));
        console.log("[Token] New token saved/refreshed.");
        return newToken;
    } catch (e) {
        console.error("[Token] Failed to get token:", e.response?.data || e.message);
        // If 403 (Rate Limit), wait 65s and retry once
        if (e.response?.status === 403) {
            console.log("[Token] Rate Limit Hit! Waiting 65s for retry...");
            await new Promise(r => setTimeout(r, 65000));
            return getAccessToken(); // Recursive retry once
        }
        return null;
    }
}

async function runDeepMarketScan(force = false) {
    const now = new Date();
    // KST calculation (UTC + 9 hours)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const hour = kstDate.getUTCHours();
    const day = kstDate.getUTCDay(); // 0=Sun, 6=Sat

    console.log(`[Worker] Server(UTC): ${now.toISOString()}, Target(KST): ${kstDate.toISOString()}, Hour: ${hour}, Day: ${day}`);

    // Market Hours: 8 AM - 8 PM KST, Weekdays only
    const isWeekend = (day === 0 || day === 6);
    const isMarketOpen = (hour >= 8 && hour < 20) && !isWeekend;

    if (!isMarketOpen && !force) {
        console.log(`[Worker] Market Closed (KST ${hour}:xx). Serving cached data.`);
        marketAnalysisReport.dataType = 'MARKET_CLOSE';
        return;
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

        if (candidates.length === 0) {
            console.log("[Worker] No candidates found from initial ranking.");
            return;
        }

        const historyData = new Map();
        let hits = 0;

        // Scan ALL candidates (Increased up to 200)
        const fullList = candidates.slice(0, 200);
        console.log(`[Worker] Starting detail scan for ${fullList.length} items...`);

        for (let i = 0; i < fullList.length; i += 10) {
            const chunk = fullList.slice(i, i + 10);
            await Promise.all(chunk.map(async (stk) => {
                try {
                    const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                    });
                    const daily = invRes.data.output || [];
                    if (daily.length > 0) { // Changed > 5 to > 0 to see any data
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

        console.log(`[Worker] Detail scan complete. Success hits: ${hits}`);

        if (hits === 0) {
            console.log("[Worker] No detail data retrieved. Using cache if available.");
            return;
        }

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

runDeepMarketScan(true);
setInterval(runDeepMarketScan, 15 * 60 * 1000);

app.get('/api/analysis/supply/:period/:investor', (req, res) => {
    const key = `${req.params.period}_${req.params.investor}`;
    const mode = req.query.mode || 'buy';
    const data = (mode === 'buy') ? marketAnalysisReport.buyData[key] : marketAnalysisReport.sellData[key];
    res.json({ output: data || [], updateTime: marketAnalysisReport.updateTime, dataType: marketAnalysisReport.dataType });
});

const ALL_STOCKS = require('./popular_stocks');
// Deduplicate stocks by code
const POPULAR_STOCKS = Array.from(new Map(ALL_STOCKS.map(s => [s.code, s])).values());
console.log(`[Server] Loaded ${POPULAR_STOCKS.length} unique stocks (Deduplicated from ${ALL_STOCKS.length})`);

// Helper: Calculate Streak
function analyzeStreak(daily, inv) {
    let buyStreak = 0, sellStreak = 0;
    for (let j = 0; j < daily.length; j++) {
        const d = daily[j];
        let net = 0;
        if (inv === '0') net = parseInt(d.frgn_ntby_qty) + parseInt(d.orgn_ntby_qty);
        else if (inv === '2') net = parseInt(d.frgn_ntby_qty);
        else if (inv === '1') net = parseInt(d.orgn_ntby_qty);

        if (net > 0) {
            buyStreak++;
            if (sellStreak > 0) break;
        } else if (net < 0) {
            sellStreak++;
            if (buyStreak > 0) break;
        } else {
            break;
        }
    }
    return { buyStreak, sellStreak };
}

// Secret Admin Endpoint to Force Scan
app.get('/api/admin/force-scan', async (req, res) => {
    console.log("[Admin] Force Scan Triggered!");
    runDeepMarketScan(true); // Fire and forget
    res.json({ status: 'Scan Started', time: new Date() });
});

app.get('/api/search', (req, res) => {
    const keyword = req.query.keyword || '';
    console.log(`[Server] Search Request: "${keyword}"`);
    if (!keyword || keyword.length < 1) return res.json({ result: [] });

    // Case-insensitive search
    const k = keyword.toLowerCase();
    const results = POPULAR_STOCKS.filter(s =>
        s.name.toLowerCase().includes(k) || s.code.includes(k)
    );
    console.log(`[Server] Search Found: ${results.length} items`);
    res.json({ result: results.slice(0, 20) }); // Limit 20
});

app.post('/api/my-portfolio/analyze', async (req, res) => {
    const { codes } = req.body; // Array of codes
    if (!codes || !Array.isArray(codes) || codes.length === 0) return res.json({ result: [] });

    const token = await getAccessToken();
    const analyzed = await Promise.all(codes.map(async (code) => {
        try {
            // Find name from popular list or use code
            const meta = POPULAR_STOCKS.find(s => s.code === code) || { name: code, code };

            const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code }
            });
            const daily = invRes.data.output || [];

            if (daily.length === 0) return null;

            const currentPrice = daily[0].stck_clpr;
            const currentRate = daily[0].prdy_ctrt;

            // Analyse Streaks for Foreigner(2) and Inst(1)
            const foreign = analyzeStreak(daily, '2');
            const inst = analyzeStreak(daily, '1');
            const total = analyzeStreak(daily, '0'); // Sum

            // Check Warning Condition: 3+ days SELL by Foreign or Inst or Total
            const isDanger = (foreign.sellStreak >= 3 || inst.sellStreak >= 3 || total.sellStreak >= 3);
            const isOpportunity = (foreign.buyStreak >= 3 || inst.buyStreak >= 3 || total.buyStreak >= 3);

            return {
                code,
                name: meta.name,
                price: currentPrice,
                rate: currentRate,
                analysis: {
                    foreigner: { buy: foreign.buyStreak, sell: foreign.sellStreak },
                    institution: { buy: inst.buyStreak, sell: inst.sellStreak },
                    total: { buy: total.buyStreak, sell: total.sellStreak }
                },
                isDanger,
                isOpportunity
            };
        } catch (e) { return null; }
    }));

    res.json({ result: analyzed.filter(x => x !== null) });
});

// Reuse existing Portfolio Recommend Endpoint
app.post('/api/portfolio/recommend', async (req, res) => {
    // ... existing content ...
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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, './index.html')));
app.get('/manual', (req, res) => res.sendFile(path.join(__dirname, './money_fact_manual.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Deep Scan Server Online on port ${PORT}`));
