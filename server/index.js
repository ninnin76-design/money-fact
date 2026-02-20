const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Expo } = require('expo-server-sdk');

// --- Expo Push Setup ---
const expo = new Expo();
const PUSH_TOKENS_FILE = path.join(__dirname, 'push_tokens.json');
const PUSH_HISTORY_FILE = path.join(__dirname, 'push_history.json');
let pushTokens = [];
let pushHistory = {}; // { token: 'YYYY-MM-DD' }

if (fs.existsSync(PUSH_TOKENS_FILE)) {
    try { pushTokens = JSON.parse(fs.readFileSync(PUSH_TOKENS_FILE, 'utf8')); } catch (e) { }
}
if (fs.existsSync(PUSH_HISTORY_FILE)) {
    try { pushHistory = JSON.parse(fs.readFileSync(PUSH_HISTORY_FILE, 'utf8')); } catch (e) { }
}

const savePushTokens = () => {
    try { fs.writeFileSync(PUSH_TOKENS_FILE, JSON.stringify(pushTokens, null, 2)); } catch (e) { }
};
const savePushHistory = () => {
    try { fs.writeFileSync(PUSH_HISTORY_FILE, JSON.stringify(pushHistory, null, 2)); } catch (e) { }
};

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

const MARKET_WATCH_STOCKS = [
    { name: '삼성전자', code: '005930', sector: '반도체' }, { name: 'SK하이닉스', code: '000660', sector: '반도체' },
    { name: 'HPSP', code: '403870', sector: '반도체' }, { name: '한미반도체', code: '042700', sector: '반도체' },
    { name: 'LG에너지솔루션', code: '373220', sector: '2차전지' }, { name: 'POSCO홀딩스', code: '005490', sector: '2차전지' },
    { name: '삼성바이오로직스', code: '207940', sector: '바이오' }, { name: '셀트리온', code: '068270', sector: '바이오' },
    { name: '현대차', code: '005380', sector: '자동차' }, { name: '기아', code: '000270', sector: '자동차' },
    { name: 'KB금융', code: '105560', sector: '금융' }, { name: '신한지주', code: '055550', sector: '금융' },
    { name: 'NAVER', code: '035420', sector: '플랫폼' }, { name: '카카오', code: '035720', sector: '플랫폼' }
];

const SNAPSHOT_FILE = path.join(__dirname, 'market_report_snapshot.json');

let cachedToken = '';
let tokenExpiry = null;

let marketAnalysisReport = {
    updateTime: null,
    dataType: 'LIVE',
    status: 'INITIALIZING',
    buyData: {},
    sellData: {},
    sectors: [],
    instFlow: { pnsn: 0, ivtg: 0, ins: 0 }
};

// --- User Portfolio Database ---
const DB_FILE = path.join(__dirname, 'db.json');
let userDb = {};
if (fs.existsSync(DB_FILE)) {
    try { userDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { }
}

const saveDb = () => {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(userDb, null, 2)); } catch (e) { }
};

if (fs.existsSync(SNAPSHOT_FILE)) {
    try {
        marketAnalysisReport = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
    } catch (e) { }
}

const TOKEN_FILE = path.join(__dirname, 'real_token_cache.json');

let tokenRequestPromise = null;

async function getAccessToken() {
    // 1. Try to read from file first
    if (fs.existsSync(TOKEN_FILE)) {
        try {
            const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            const expiry = new Date(saved.expiry);
            // proactive refresh if < 10 mins remaining
            if (new Date(new Date().getTime() + 10 * 60 * 1000) < expiry) {
                return saved.token;
            }
        } catch (e) { }
    }

    // 2. Return existing promise if request pending
    if (tokenRequestPromise) {
        console.log("[Token] Waiting for pending token request...");
        return tokenRequestPromise;
    }

    // 3. Request New Token with Retry Logic
    tokenRequestPromise = (async () => {
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
                // Clear promise before recursive call to allow new request
                tokenRequestPromise = null;
                return getAccessToken();
            }
            return null;
        } finally {
            tokenRequestPromise = null;
        }
    })();

    return tokenRequestPromise;
}

// --- Shared Token Endpoint (For 5 Users Sharing 1 Token) ---
app.get('/api/token', async (req, res) => {
    try {
        const token = await getAccessToken();
        if (!token) {
            return res.status(500).json({ error: 'Token unavailable' });
        }
        // Read expiry from cache file
        let expiry = null;
        if (fs.existsSync(TOKEN_FILE)) {
            const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            expiry = saved.expiry;
        }
        res.json({ token, expiry, source: 'server_shared' });
    } catch (e) {
        res.status(500).json({ error: 'Token fetch failed' });
    }
});

// --- Push Token Registration ---
app.post('/api/push/register', (req, res) => {
    const { pushToken, syncKey, stocks, settings } = req.body;
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
        return res.status(400).json({ error: 'Invalid Expo Push Token' });
    }
    // Update or add
    const idx = pushTokens.findIndex(t => t.token === pushToken);
    const entry = {
        token: pushToken,
        syncKey: syncKey || 'anonymous',
        stocks: stocks || [],
        settings: settings || { buyStreak: 3, sellStreak: 3, accumStreak: 3 },
        updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
        pushTokens[idx] = entry;
    } else {
        pushTokens.push(entry);
    }
    savePushTokens();
    console.log(`[Push] Registered token for ${syncKey || 'anonymous'} (Total: ${pushTokens.length})`);
    res.json({ status: 'registered', total: pushTokens.length });
});

// --- Server Push Notification Sender ---
async function sendPushNotifications(messages) {
    if (messages.length === 0) return;
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (e) {
            console.error('[Push] Send error:', e.message);
        }
    }
    console.log(`[Push] Sent ${messages.length} notifications`);
}

// --- Buy Opportunity Detection ---
app.get('/api/alerts/opportunities', async (req, res) => {
    try {
        const buyData = marketAnalysisReport.buyData || {};
        const opportunities = [];
        Object.keys(buyData).forEach(key => {
            const items = buyData[key] || [];
            items.forEach(item => {
                if (item.streak >= 2) {
                    opportunities.push({
                        ...item,
                        investor: key.split('_')[1],
                        type: 'buy',
                        signal: `${item.streak}일 연속 매수세`
                    });
                }
            });
        });
        // Deduplicate by code, keep the one with highest streak
        const deduped = new Map();
        opportunities.forEach(op => {
            if (!deduped.has(op.code) || deduped.get(op.code).streak < op.streak) {
                deduped.set(op.code, op);
            }
        });
        res.json({
            opportunities: Array.from(deduped.values()).sort((a, b) => b.streak - a.streak).slice(0, 20),
            updateTime: marketAnalysisReport.updateTime
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to get opportunities' });
    }
});

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
    const hasNoData = !marketAnalysisReport.updateTime;

    if (!isMarketOpen && !force && !hasNoData) {
        console.log(`[Worker] Market Closed (KST ${hour}:xx). Serving cached data.`);
        marketAnalysisReport.dataType = 'MARKET_CLOSE';
        return;
    }

    const currentType = 'LIVE';
    console.log(`[Radar] ====== 2단계 하이브리드 레이더 가동! ======`);
    try {
        const token = await getAccessToken();

        // ========================================================
        // [코다리 부장] 1단계: 광범위 필터 (The Wide Net)
        // 전 시장에서 '수상한 놈들'을 빠르게 후보 리스트에 올립니다.
        // ========================================================
        console.log(`[Radar 1단계] 광범위 필터 가동 - 전 시장 스캔 중...`);

        const candidateMap = new Map();
        const addCandidate = (code, name) => {
            if (code && !candidateMap.has(code)) {
                candidateMap.set(code, { code, name: name || code });
            }
        };

        // Source 1: 외인/기관 순매수 랭킹 (시장 주도주)
        try {
            const rankRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
            });
            (rankRes.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 1 (Foreign/Inst Rank) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 2: 코스피 거래량 순위
        try {
            const volResKospi = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPST01710000', custtype: 'P' },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '0001',
                    FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000',
                    FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: ''
                }
            });
            (volResKospi.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 2 (KOSPI Volume) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 3: 코스닥 거래량 순위
        try {
            const volResKosdaq = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPST01710000', custtype: 'P' },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '1001',
                    FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000',
                    FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: ''
                }
            });
            (volResKosdaq.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 3 (KOSDAQ Volume) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 4: 외인 순매도 랭킹 (이탈 감지용)
        try {
            const sellRankRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '1', FID_ETC_CLS_CODE: '0' }
            });
            (sellRankRes.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 4 (Sell Rank) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 5: [코다리 부장] 전종목 배치 스캔 (popular_stocks에서 시세 변동/거래량 이상 감지)
        // 2,882개 전종목을 배치로 시세 확인 → 수상한 종목만 후보에 추가
        console.log(`[Radar 1단계] Source 5: 전종목 ${POPULAR_STOCKS.length}개 시세 배치 스캔 시작...`);
        let wideNetHits = 0;
        const batchSize = 8;  // 동시 요청 수 (API 제한 준수)
        const maxWideScan = Math.min(POPULAR_STOCKS.length, 2000); // 최대 2000개까지 스캔
        const alreadyInMap = new Set(candidateMap.keys());

        for (let i = 0; i < maxWideScan; i += batchSize) {
            const batch = POPULAR_STOCKS.slice(i, i + batchSize).filter(s => !alreadyInMap.has(s.code));
            if (batch.length === 0) continue;

            await Promise.all(batch.map(async (stk) => {
                try {
                    const priceRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
                        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010100', custtype: 'P' },
                        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                    });
                    const d = priceRes.data.output;
                    if (!d) return;

                    const price = parseInt(d.stck_prpr || 0);
                    const changeRate = parseFloat(d.prdy_ctrt || 0);
                    const volume = parseInt(d.acml_vol || 0);
                    const avgVolume = parseInt(d.avrg_vol || 0); // 평균 거래량

                    // [코다리 부장 핵심 필터] 아래 조건 중 하나라도 걸리면 '수상한 놈'으로 판정!
                    const isVolumeSpike = avgVolume > 0 && volume > avgVolume * 2;  // 거래량 200% 이상 폭발
                    const isQuietAccum = Math.abs(changeRate) < 2 && avgVolume > 0 && volume > avgVolume * 1.3; // 조용한 매집형 (등락 ±2% 미만인데 거래량 130%↑)
                    const isHighVolume = volume > 500000; // 절대 거래량 50만 이상 (활성 종목)

                    if (isVolumeSpike || isQuietAccum || isHighVolume) {
                        addCandidate(stk.code, stk.name);
                        wideNetHits++;
                    }
                } catch (e) { /* 개별 실패는 무시 */ }
            }));
            await new Promise(r => setTimeout(r, 150)); // API 유량 제어 (150ms)

            // 진행 상황 로그 (500개마다)
            if (i > 0 && i % 500 === 0) {
                console.log(`[Radar 1단계] Wide Net 진행: ${i}/${maxWideScan} 스캔 완료, 후보 ${wideNetHits}개 추가 발견`);
            }
        }
        console.log(`[Radar 1단계] Wide Net 완료! 전종목에서 ${wideNetHits}개 추가 후보 발견`);

        // 핵심 감시 종목은 무조건 포함!
        MARKET_WATCH_STOCKS.forEach(s => addCandidate(s.code, s.name));

        // 사용자 관심 종목도 무조건 포함! (푸시 알림 정확도를 위해)
        pushTokens.forEach(entry => {
            (entry.stocks || []).forEach(s => addCandidate(s.code, s.name));
        });

        const totalCandidates = candidateMap.size;
        console.log(`[Radar] ===== 1단계 완료: 총 ${totalCandidates}개 후보 확보! =====`);

        // ========================================================
        // [코다리 부장] 2단계: 정밀 수급 분석 (The Deep Scan)
        // 1단계에서 걸러낸 '수상한 놈들'의 투자자별 매집 현황을 정밀 분석합니다.
        // ========================================================
        console.log(`[Radar 2단계] 정밀 수급 분석 시작 - ${totalCandidates}개 종목 Deep Scan...`);

        const candidates = Array.from(candidateMap.values());
        const historyData = new Map();
        let hits = 0;

        // 모든 후보를 Deep Scan (배치 10개씩, 120ms 간격)
        const fullList = candidates.slice(0, 800); // 안전 상한: 최대 800개
        console.log(`[Radar 2단계] 실제 Deep Scan 대상: ${fullList.length}개`);

        for (let i = 0; i < fullList.length; i += 10) {
            const chunk = fullList.slice(i, i + 10);
            await Promise.all(chunk.map(async (stk) => {
                try {
                    const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                        headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                    });
                    const daily = invRes.data.output || [];

                    // [코다리 부장 터치] 장중이라면 잠정치를 가져와서 오늘 데이터를 보정합니다!
                    if (isMarketOpen && daily.length > 0) {
                        const d0 = daily[0];
                        if (parseInt(d0.frgn_ntby_qty || 0) === 0 && parseInt(d0.orgn_ntby_qty || 0) === 0) {
                            try {
                                const provRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                                    headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012100', custtype: 'P' },
                                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                                });
                                const prov = provRes.data.output;
                                if (prov) {
                                    d0.frgn_ntby_qty = prov.frgn_ntby_qty || '0';
                                    d0.orgn_ntby_qty = prov.ivtg_ntby_qty || '0';
                                }
                            } catch (provErr) { /* 잠정치 실패해도 조용히 넘어갑니다 */ }
                        }
                    }

                    if (daily.length > 0) {
                        hits++;
                        const currentPrice = daily[0].stck_clpr;
                        const currentRate = daily[0].prdy_ctrt;
                        historyData.set(stk.code, {
                            name: stk.name, price: currentPrice, rate: currentRate, daily
                        });
                    }
                } catch (e) { /* 개별 실패는 무시 */ }
            }));
            await new Promise(r => setTimeout(r, 120)); // 유량 제어 (120ms)
            if (i % 100 === 0 && i > 0) console.log(`[Radar 2단계] Deep Scan 진행: ${i}/${fullList.length}`);
        }

        console.log(`[Radar 2단계] Deep Scan 완료! 성공: ${hits}개 / 대상: ${fullList.length}개`);

        if (hits === 0) {
            console.log("[Radar] 데이터를 가져오지 못했습니다. 이전 캐시를 유지합니다.");
            return;
        }

        // ========================================================
        // [코다리 부장] 3단계: 결과 리스팅 및 알림 (The Target Alert)
        // 분석 결과를 스냅샷으로 굽고, 사용자별 알림을 발송합니다.
        // ========================================================
        console.log(`[Radar 3단계] 분석 결과 정리 및 알림 발송 중...`);

        const newBuyData = {}, newSellData = {};
        const investors = ['0', '2', '1'];

        investors.forEach(inv => {
            newBuyData[`5_${inv}`] = [];
            newSellData[`5_${inv}`] = [];
        });

        const sectorMap = {};
        const instTotals = { pnsn: 0, ivtg: 0, ins: 0 };

        historyData.forEach((val, code) => {
            const d = val.daily[0];
            const netBuy = parseInt(d.frgn_ntby_qty) + parseInt(d.orgn_ntby_qty);
            const pnsnBuy = parseInt(d.pnsn_ntby_qty || 0);
            const ivtgBuy = parseInt(d.ivtg_ntby_qty || 0);
            const insBuy = parseInt(d.ins_ntby_qty || 0);

            const mwc = MARKET_WATCH_STOCKS.find(s => s.code === code);
            if (mwc && mwc.sector) {
                sectorMap[mwc.sector] = (sectorMap[mwc.sector] || 0) + netBuy;
            }
            instTotals.pnsn += pnsnBuy;
            instTotals.ivtg += ivtgBuy;
            instTotals.ins += insBuy;

            investors.forEach(inv => {
                let buyStreak = 0, sellStreak = 0;

                for (let j = 0; j < val.daily.length; j++) {
                    const row = val.daily[j];
                    let net = 0;
                    if (inv === '0') net = parseInt(row.frgn_ntby_qty) + parseInt(row.orgn_ntby_qty);
                    else if (inv === '2') net = parseInt(row.frgn_ntby_qty);
                    else if (inv === '1') net = parseInt(row.orgn_ntby_qty);

                    if (net > 0) {
                        buyStreak++;
                        if (sellStreak > 0) break;
                    } else if (net < 0) {
                        sellStreak++;
                        if (buyStreak > 0) break;
                    } else break;
                }

                if (buyStreak >= 2) {
                    newBuyData[`5_${inv}`].push({
                        name: val.name, code, price: val.price, rate: val.rate,
                        streak: buyStreak, fStreak: buyStreak, iStreak: (inv === '0' || inv === '1') ? buyStreak : 0
                    });
                }
                if (sellStreak >= 2) {
                    newSellData[`5_${inv}`].push({
                        name: val.name, code, price: val.price, rate: val.rate,
                        streak: sellStreak, fStreak: -sellStreak, iStreak: (inv === '0' || inv === '1') ? -sellStreak : 0
                    });
                }
            });
        });

        const sectorList = Object.entries(sectorMap).map(([name, flow]) => ({ name, flow }));

        investors.forEach(inv => {
            newBuyData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
            newSellData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
        });

        marketAnalysisReport.buyData = newBuyData;
        marketAnalysisReport.sellData = newSellData;
        marketAnalysisReport.sectors = sectorList;
        marketAnalysisReport.instFlow = instTotals;
        marketAnalysisReport.updateTime = new Date();
        marketAnalysisReport.dataType = currentType;
        marketAnalysisReport.status = 'READY';
        marketAnalysisReport.scanStats = {
            totalScanned: totalCandidates,
            deepScanned: fullList.length,
            successHits: hits,
            wideNetAdded: wideNetHits
        };
        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(marketAnalysisReport));

        console.log(`[Radar] ===== 스냅샷 저장 완료! 매수 감지: ${Object.values(newBuyData).reduce((a, b) => a + b.length, 0)}건, 매도 감지: ${Object.values(newSellData).reduce((a, b) => a + b.length, 0)}건 =====`);

        // --- SERVER PUSH: 사용자별 맞춤 알림 발송 ---
        if (pushTokens.length > 0) {
            console.log(`[Push] ${pushTokens.length}명의 등록 사용자에게 알림 확인 중...`);
            const pushMessages = [];
            const todayStr = kstDate.toISOString().split('T')[0];

            for (const tokenEntry of pushTokens) {
                if (pushHistory[tokenEntry.token] === todayStr) continue;
                if (!Expo.isExpoPushToken(tokenEntry.token)) continue;
                const userStocks = tokenEntry.stocks || [];
                if (userStocks.length === 0) continue;

                const dangerAlerts = [];
                const buyAlerts = [];
                const accumAlerts = [];

                const userSettings = tokenEntry.settings || { buyStreak: 3, sellStreak: 3, accumStreak: 3 };

                for (const us of userStocks) {
                    const stockData = historyData.get(us.code);
                    if (!stockData) continue;

                    const foreign = analyzeStreak(stockData.daily, '2');
                    const inst = analyzeStreak(stockData.daily, '1');

                    if (foreign.sellStreak >= userSettings.sellStreak) dangerAlerts.push(`${us.name} 외인 ${foreign.sellStreak}일 매도`);
                    if (inst.sellStreak >= userSettings.sellStreak) dangerAlerts.push(`${us.name} 기관 ${inst.sellStreak}일 매도`);
                    if (foreign.buyStreak >= userSettings.buyStreak) buyAlerts.push(`${us.name} 외인 ${foreign.buyStreak}일 매수`);
                    if (inst.buyStreak >= userSettings.buyStreak) buyAlerts.push(`${us.name} 기관 ${inst.buyStreak}일 매수`);

                    if (foreign.buyStreak >= userSettings.accumStreak || inst.buyStreak >= userSettings.accumStreak) {
                        accumAlerts.push(`${us.name} 매집 정황(${Math.max(foreign.buyStreak, inst.buyStreak)}일↑)`);
                    }
                }

                if (dangerAlerts.length > 0 || buyAlerts.length > 0 || accumAlerts.length > 0) {
                    const combinedBody = [...dangerAlerts, ...buyAlerts, ...accumAlerts].join('\n');
                    let pushTitle = '📊 Money Fact 알림';
                    if (dangerAlerts.length > 0) pushTitle = '🚨 수급 이탈 알림!';
                    else if (accumAlerts.length > 0) pushTitle = '🤫 매집 포착 알림!';
                    else if (buyAlerts.length > 0) pushTitle = '🎯 매수 기회 알림!';

                    pushMessages.push({
                        to: tokenEntry.token,
                        title: pushTitle,
                        body: combinedBody,
                        sound: 'default',
                        priority: 'high',
                        data: { type: dangerAlerts.length > 0 ? 'danger' : 'alert' }
                    });
                    pushHistory[tokenEntry.token] = todayStr;
                }
            }

            if (pushMessages.length > 0) {
                await sendPushNotifications(pushMessages);
                savePushHistory();
            }
        }

        console.log(`[Radar] ====== 2단계 하이브리드 레이더 임무 완료! ======`);

    } catch (e) { console.error("[Radar] Worker Error:", e.message); }
}

// [코다리 부장 터치] 서버가 켜질 때 데이터가 너무 오래됐거나 없으면 즉시 한 번 구워줍니다!
const shouldScanNow = !marketAnalysisReport.updateTime || (new Date() - new Date(marketAnalysisReport.updateTime) > 60 * 60 * 1000);
if (shouldScanNow) {
    console.log("[Server] Data stale or missing. Starting immediate market scan...");
    runDeepMarketScan(true);
}

setInterval(runDeepMarketScan, 15 * 60 * 1000);

app.get('/api/analysis/supply/:period/:investor', (req, res) => {
    const key = `${req.params.period}_${req.params.investor}`;
    const mode = req.query.mode || 'buy';
    const data = (mode === 'buy') ? marketAnalysisReport.buyData[key] : marketAnalysisReport.sellData[key];
    res.json({ output: data || [], updateTime: marketAnalysisReport.updateTime, dataType: marketAnalysisReport.dataType });
});

// [코다리 부장 터치] 앱이 밤에도 한 방에 전체 데이터를 받아갈 수 있는 스냅샷 API!
app.get('/api/snapshot', (req, res) => {
    res.json(marketAnalysisReport);
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

// --- Cloud Sync for Mobile Data Persistence (File + Firebase) ---
const SYNC_FILE = path.join(__dirname, 'sync_data.json');
const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL || '';
let userStore = {};
let isSyncWriting = false;

function loadUserStore() {
    // 1. Load from sync_data.json
    if (fs.existsSync(SYNC_FILE)) {
        try {
            const raw = fs.readFileSync(SYNC_FILE, 'utf8');
            userStore = JSON.parse(raw);
            console.log(`[Sync] Loaded ${Object.keys(userStore).length} user profiles from disk.`);
        } catch (e) {
            console.error('[Sync] Load error, starting fresh:', e.message);
            userStore = {};
        }
    }
    // 2. Migrate legacy db.json data (one-time)
    if (fs.existsSync(DB_FILE)) {
        try {
            const legacy = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            let migrated = 0;
            Object.keys(legacy).forEach(key => {
                if (!userStore[key] && Array.isArray(legacy[key]) && legacy[key].length > 0) {
                    userStore[key] = { stocks: legacy[key], updatedAt: new Date().toISOString(), version: 1 };
                    migrated++;
                }
            });
            if (migrated > 0) {
                console.log(`[Sync] Migrated ${migrated} profiles from legacy db.json`);
                fs.writeFileSync(SYNC_FILE, JSON.stringify(userStore, null, 2));
            }
        } catch (e) { }
    }
}
loadUserStore();

// --- Firebase Cloud Recovery (runs async after startup) ---
const firebaseKey = (key) => encodeURIComponent(key).replace(/\./g, '%2E');

async function recoverFromFirebase() {
    if (!FIREBASE_DB_URL) {
        console.log('[Firebase] FIREBASE_DB_URL not set. Cloud backup disabled.');
        return;
    }
    if (Object.keys(userStore).length > 0) {
        // Local data exists → sync TO Firebase as safety backup
        console.log('[Firebase] Local data found. Syncing to cloud...');
        try {
            await axios.put(`${FIREBASE_DB_URL}/sync.json`, userStore);
            console.log('[Firebase] ✅ All local data backed up to cloud!');
        } catch (e) {
            console.error('[Firebase] Cloud backup failed:', e.message);
        }
        return;
    }
    // Local is empty → recover FROM Firebase
    try {
        console.log('[Firebase] ⚠️ Local data empty! Attempting cloud recovery...');
        const res = await axios.get(`${FIREBASE_DB_URL}/sync.json`);
        const cloudData = res.data;
        if (cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0) {
            userStore = cloudData;
            fs.writeFileSync(SYNC_FILE, JSON.stringify(userStore, null, 2));
            console.log(`[Firebase] ✅ Recovered ${Object.keys(userStore).length} user profiles from cloud!`);
        } else {
            console.log('[Firebase] No cloud data available.');
        }
    } catch (e) {
        console.error('[Firebase] Recovery failed:', e.message);
    }
}
recoverFromFirebase();

const saveSyncFile = async (changedKey) => {
    if (isSyncWriting) {
        await new Promise(r => setTimeout(r, 100));
    }
    isSyncWriting = true;
    try {
        // 1. Always save to local file
        fs.writeFileSync(SYNC_FILE, JSON.stringify(userStore, null, 2));
        // 2. Also save to Firebase (non-blocking, per-key)
        if (FIREBASE_DB_URL && changedKey) {
            const safeKey = firebaseKey(changedKey);
            axios.put(`${FIREBASE_DB_URL}/sync/${safeKey}.json`, userStore[changedKey])
                .then(() => console.log(`[Firebase] ☁️ Backed up: ${changedKey}`))
                .catch(e => console.error(`[Firebase] Backup failed for ${changedKey}:`, e.message));
        }
    } finally {
        isSyncWriting = false;
    }
};

app.post('/api/sync/save', async (req, res) => {
    const { syncKey, stocks, settings } = req.body;
    if (!syncKey || !stocks) return res.status(400).json({ error: 'Invalid data' });

    // Add timestamp for backup tracking
    userStore[syncKey] = {
        stocks,
        settings: settings || {},
        updatedAt: new Date().toISOString(),
        version: (userStore[syncKey]?.version || 0) + 1
    };
    try {
        await saveSyncFile(syncKey);
        console.log(`[Sync] Saved data for key: ${syncKey} (v${userStore[syncKey].version})`);
        res.json({ status: 'success', version: userStore[syncKey].version });
    } catch (e) {
        res.status(500).json({ error: 'File save error' });
    }
});

app.get('/api/sync/check', (req, res) => {
    const { syncKey } = req.query;
    if (!syncKey) return res.status(400).json({ error: 'Missing syncKey' });
    const exists = !!userStore[syncKey];
    res.json({ exists, version: userStore[syncKey]?.version || 0 });
});

app.get('/api/sync/load', async (req, res) => {
    const { syncKey } = req.query;
    let data = userStore[syncKey];

    // Fallback: Try Firebase if not found locally
    if (!data && FIREBASE_DB_URL) {
        try {
            const safeKey = firebaseKey(syncKey);
            const fbRes = await axios.get(`${FIREBASE_DB_URL}/sync/${safeKey}.json`);
            if (fbRes.data) {
                data = fbRes.data;
                userStore[syncKey] = data;
                console.log(`[Firebase] ☁️ Recovered data for: ${syncKey}`);
            }
        } catch (e) { }
    }

    if (!data) return res.status(404).json({ error: 'No data found' });
    console.log(`[Sync] Loaded data for key: ${syncKey}`);
    const stocks = Array.isArray(data) ? data : (data.stocks || []);
    const settings = data.settings || {};
    res.json({ stocks, settings, version: data.version || 1, updatedAt: data.updatedAt });
});

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

// (Legacy duplicate routes removed - now handled by Cloud Sync system above)

app.get('/', (req, res) => res.sendFile(path.join(__dirname, './index.html')));
app.get('/manual', (req, res) => res.sendFile(path.join(__dirname, './money_fact_manual.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Deep Scan Server Online on port ${PORT}`));
