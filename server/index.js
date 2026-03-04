const express = require('express');
const axios = require('axios');
axios.defaults.timeout = 5000; // 5초 타임아웃 추가: KIS API 무한대기 방지
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
// pushHistory structure: { "token": { "YYYY-MM-DD": { "code_pattern": true, "code_pattern": true } } }
let pushHistory = {};

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
const APP_KEY = process.env.KIS_APP_KEY || 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = process.env.KIS_APP_SECRET || 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

const MARKET_WATCH_STOCKS = [
    { name: '삼성전자', code: '005930', sector: '반도체' }, { name: 'SK하이닉스', code: '000660', sector: '반도체' },
    { name: 'HPSP', code: '403870', sector: '반도체' }, { name: '한미반도체', code: '042700', sector: '반도체' },
    { name: 'LG에너지솔루션', code: '373220', sector: '이차전지' }, { name: 'POSCO홀딩스', code: '005490', sector: '이차전지' },
    { name: '삼성바이오로직스', code: '207940', sector: '바이오 및 헬스케어' }, { name: '셀트리온', code: '068270', sector: '바이오 및 헬스케어' },
    { name: '현대차', code: '005380', sector: '자동차 및 전자부품' }, { name: '기아', code: '000270', sector: '자동차 및 전자부품' },
    { name: 'KB금융', code: '105560', sector: '기타(금융)' }, { name: '신한지주', code: '055550', sector: '기타(금융)' },
    { name: 'NAVER', code: '035420', sector: '엔터 및 플랫폼' }, { name: '카카오', code: '035720', sector: '엔터 및 플랫폼' },
    { name: '레인보우로보틱스', code: '277810', sector: '로봇 및 에너지' }
];

// 섹터별 관심종목 70개 - 서버 스캔 시 무조건 포함!
const SECTOR_WATCH_STOCKS = [
    // 자동차 및 전자부품
    { name: '현대차', code: '005380' }, { name: '현대차우', code: '005385' },
    { name: '현대모비스', code: '012330' }, { name: '기아', code: '000270' },
    { name: '삼성전기', code: '009150' }, { name: '삼성전기우', code: '009155' },
    // 이차전지
    { name: '삼성SDI', code: '006400' }, { name: 'LG에너지솔루션', code: '373220' },
    { name: 'LG화학', code: '051910' }, { name: 'POSCO홀딩스', code: '005490' },
    { name: '에코프로', code: '086520' }, { name: '에코프로비엠', code: '247540' },
    { name: '엘앤에프', code: '066970' }, { name: '포스코퓨처엠', code: '003670' },
    { name: '나노신소재', code: '121600' }, { name: '에코프로머티', code: '450080' },
    { name: '상신이디피', code: '091580' }, { name: '코스모화학', code: '005420' },
    // 엔터 및 플랫폼
    { name: '하이브', code: '352820' }, { name: '와이지엔터테인먼트', code: '122870' },
    { name: 'JYP Ent.', code: '035900' }, { name: '에스엠(SM)', code: '041510' },
    { name: 'TCC스틸', code: '002710' }, { name: '디어유', code: '376300' },
    { name: '카카오', code: '035720' }, { name: 'NAVER', code: '035420' },
    // 로봇 및 에너지
    { name: '레인보우로보틱스', code: '277810' }, { name: '티로보틱스', code: '117730' },
    { name: '씨메스', code: '475400' }, { name: '클로봇', code: '466100' },
    { name: 'HD현대에너지솔루션', code: '322000' }, { name: 'OCI홀딩스', code: '010060' },
    // 반도체
    { name: '삼성전자', code: '005930' }, { name: '삼성전자우', code: '005935' },
    { name: 'SK하이닉스', code: '000660' }, { name: '와이씨', code: '232140' },
    { name: 'HPSP', code: '403870' }, { name: '테크윙', code: '089030' },
    { name: '하나머티리얼즈', code: '166090' }, { name: '하나마이크론', code: '067310' },
    { name: '유진테크', code: '084370' }, { name: '피에스케이홀딩스', code: '031980' },
    { name: '피에스케이', code: '319660' }, { name: '에스티아이(STI)', code: '039440' },
    { name: '디아이(DI)', code: '003160' }, { name: '에스앤에스텍', code: '101490' },
    { name: '이오테크닉스', code: '039030' }, { name: '원익IPS', code: '240810' },
    { name: 'ISC', code: '095340' }, { name: '두산테스나', code: '131970' },
    { name: '에프에스티', code: '036810' }, { name: '한화비전', code: '489790' },
    { name: '가온칩스', code: '399720' }, { name: '에이디테크놀로지', code: '158430' },
    { name: '주성엔지니어링', code: '036930' }, { name: '한미반도체', code: '042700' },
    { name: '케이씨텍', code: '281820' }, { name: '원익QnC', code: '074600' },
    { name: '유니샘', code: '036200' }, { name: '티씨케이', code: '064760' },
    // 바이오 및 헬스케어
    { name: '한올바이오파마', code: '009420' }, { name: '코오롱티슈진', code: '950160' },
    { name: '한미약품', code: '128940' }, { name: 'HLB', code: '028300' },
    { name: '에이비엘바이오', code: '298380' }, { name: '인벤티지랩', code: '389470' },
    { name: '퓨쳐켐', code: '220100' }, { name: '리가켐바이오', code: '141080' },
    { name: '알테오젠', code: '196170' }, { name: '오스코텍', code: '039200' },
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

let scanLock = false; // [v3.9.1] 재진입 방지 락

async function runDeepMarketScan(force = false) {
    // [v3.9.1] 이전 스캔이 아직 실행 중이면 새 스캔을 건너뜀
    if (scanLock) {
        console.log(`[Worker] ⏳ 이전 스캔이 아직 진행 중... 이번 사이클 건너뜀`);
        return;
    }
    scanLock = true;
    const now = new Date();
    // KST calculation (UTC + 9 hours)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const hour = kstDate.getUTCHours();
    const minute = kstDate.getUTCMinutes();
    const day = kstDate.getUTCDay(); // 0=Sun, 6=Sat
    const kstDateStr = `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(kstDate.getUTCDate()).padStart(2, '0')}`;

    console.log(`[Worker] Server(UTC): ${now.toISOString()}, KST: ${kstDateStr} ${hour}:${String(minute).padStart(2, '0')}, Day: ${day}, Force: ${force}`);

    // [v3.9.0 최적화] 시장 감시 시간: 오전 8시 ~ 오후 8시 (20:00) KST
    // 오후 3:30 이후 시간외 및 야간 거래 수급까지 15분마다 추적하여 8시에 최종 확정합니다.
    const isWeekend = (day === 0 || day === 6);
    const isMarketOpen = (hour >= 8 && hour <= 20) && !isWeekend;
    const hasNoData = !marketAnalysisReport.updateTime;

    // [v3.9.8] 가동 주기 쓰로틀링 (15분 이내 중복 스캔 방지)
    const minInterval = 14 * 60 * 1000; // 14분 (약간의 여유)
    const timeSinceLast = marketAnalysisReport.updateTime ? (now.getTime() - new Date(marketAnalysisReport.updateTime).getTime()) : Infinity;

    if (timeSinceLast < minInterval && !force && !hasNoData) {
        console.log(`[Worker] 최근 스캔(${Math.round(timeSinceLast / 1000)}초 전)이 이미 수행되었습니다. 스킵합니다.`);
        scanLock = false;
        return;
    }

    // [v3.9.0] 마지막 업데이트가 오늘 날짜가 아니면 데이터가 오래된 것으로 판단
    let isDataStale = false;
    let lastUpdateDateStr = '없음';
    if (marketAnalysisReport.updateTime) {
        const lastUpdate = new Date(marketAnalysisReport.updateTime);
        const lastUpdateKST = new Date(lastUpdate.getTime() + kstOffset);
        lastUpdateDateStr = `${lastUpdateKST.getUTCFullYear()}-${String(lastUpdateKST.getUTCMonth() + 1).padStart(2, '0')}-${String(lastUpdateKST.getUTCDate()).padStart(2, '0')}`;
        isDataStale = (lastUpdateDateStr !== kstDateStr);
        if (isDataStale) {
            console.log(`[Worker] ⚠️ 데이터 기준일 상이! 마지막: ${lastUpdateDateStr}, 오늘: ${kstDateStr}`);
        }
    }

    // [v3.9.8] 마지막 업데이트가 오늘 날짜가 아니면 무조건 강제 갱신 허용 (단, 장 마감이더라도 1회는 수행)
    if (isDataStale) {
        console.log(`[Worker] 🔄 데이터가 오래됨(${lastUpdateDateStr}) → 강제 갱신 모드 가동! (오늘: ${kstDateStr})`);
        force = true;
    }

    if (!isMarketOpen && !force && !hasNoData) {
        console.log(`[Worker] Market Closed (KST ${hour}:${String(minute).padStart(2, '0')}). Serving cached data.`);
        // [v3.9.0] MARKET_CLOSE 상태는 dataType만 바꾸고 기존 데이터는 보존
        if (marketAnalysisReport.status === 'READY') {
            marketAnalysisReport.dataType = 'MARKET_CLOSE';
        }
        scanLock = false; // [v3.9.1] early return 시 lock 해제!
        return;
    }

    const currentType = 'LIVE';
    console.log(`[Radar] ====== 2단계 하이브리드 레이더 가동! (Force: ${force}) ======`);
    marketAnalysisReport.status = 'SCANNING';
    try {
        const token = await getAccessToken();
        if (!token) {
            console.error("[Radar] ❌ 토큰 발급 실패. 레이더 가동을 중단합니다.");
            marketAnalysisReport.status = 'ERROR';
            scanLock = false;
            return;
        }

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

        // [v3.6.2 우선순위 보정] 핵심 감시 종목 및 섹터 70개 종목은 
        // 800개 상한선에 걸려 누락되지 않도록 가장 먼저 후보에 추가합니다.
        MARKET_WATCH_STOCKS.forEach(s => addCandidate(s.code, s.name));
        SECTOR_WATCH_STOCKS.forEach(s => addCandidate(s.code, s.name));

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
                params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '2', FID_RANK_SORT_CLS_CODE: '1', FID_ETC_CLS_CODE: '0' }
            });
            (sellRankRes.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 4 (Foreign Sell Rank) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 4-B: 기관 순매도 랭킹 (추가)
        try {
            const instSellRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '1', FID_RANK_SORT_CLS_CODE: '1', FID_ETC_CLS_CODE: '0' }
            });
            (instSellRes.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 4-B (Inst Sell Rank) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 5: [코다리 부장] 전종목 배치 스캔 (popular_stocks에서 시세 변동/거래량 이상 감지)
        // 2,882개 전종목을 배치로 시세 확인 → 수상한 종목만 후보에 추가
        console.log(`[Radar 1단계] Source 5: 전종목 ${POPULAR_STOCKS.length}개 시세 배치 스캔 시작...`);
        let wideNetHits = 0;
        const batchSize = 8;  // 동시 요청 수 (API 제한 준수)
        const maxWideScan = Math.min(POPULAR_STOCKS.length, 500); // [v3.9.8] 500개로 확대
        const alreadyInMap = new Set(candidateMap.keys());

        for (let i = 0; i < maxWideScan; i++) {
            const stk = POPULAR_STOCKS[i];
            if (!stk || alreadyInMap.has(stk.code)) continue;
            await new Promise(r => setTimeout(r, 120));
            try {
                const priceRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
                    headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010100', custtype: 'P' },
                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                });
                const d = priceRes.data.output;
                if (!d) continue;

                const price = parseInt(d.stck_prpr || 0);
                const changeRate = parseFloat(d.prdy_ctrt || 0);
                const volume = parseInt(d.acml_vol || 0);
                const avgVolume = parseInt(d.avrg_vol || 0);
                if (Math.abs(changeRate) >= 2.5 || volume > 500000) {
                    addCandidate(stk.code, stk.name);
                    wideNetHits++;
                }
            } catch (e) { console.error(`[Source 5 Error] ${e.message}`); }
        }
        console.log(`[Radar 1단계] Wide Net 완료! 전종목에서 ${wideNetHits}개 추가 후보 발견`);

        // [v3.6.2 fix] 핵심 종목들은 이미 앞에서 추가되었으므로 중복 추가 제거

        // 사용자 관심 종목도 무조건 포함! (푸시 알림 정확도를 위해)
        pushTokens.forEach(entry => {
            (entry.stocks || []).forEach(s => addCandidate(s.code, s.name));
        });

        const totalCandidates = candidateMap.size;
        console.log(`[Radar] ===== 1단계 완료: 총 ${totalCandidates}개 후보 확보! =====`);

        // [v3.6.2] 시장 전체 섹터별 자금 흐름 (2,800개 종목 대변)을 먼저 가져옵니다.
        async function fetchOverallSectors(token) {
            const sectorsToTrack = [
                { name: '반도체(전기전자)', code: '0013', div: 'U' },
                { name: '자동차(운수장비)', code: '0015', div: 'U' },
                { name: '바이오(의약품)', code: '0006', div: 'U' },
                { name: '이차전지(화학)', code: '0005', div: 'U' },
                { name: '엔터/SW(서비스)', code: '0021', div: 'U' },
                { name: '금융/지주', code: '0018', div: 'U' },
                { name: 'IT 하드웨어', code: '1012', div: 'U' },
                { name: '코스닥 제약', code: '1029', div: 'U' },
                { name: '기계/장비', code: '0009', div: 'U' }
            ];

            const results = [];
            for (const s of sectorsToTrack) {
                try {
                    await new Promise(r => setTimeout(r, 80));
                    const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/investor-trend-by-sector`, {
                        headers: {
                            authorization: `Bearer ${token}`,
                            appkey: APP_KEY,
                            appsecret: APP_SECRET,
                            tr_id: 'FHKUP03500100',
                            custtype: 'P'
                        },
                        params: {
                            FID_COND_MRKT_DIV_CODE: s.div,
                            FID_INPUT_ISCD: s.code
                        }
                    });
                    const d = res.data.output;
                    if (d) {
                        // [v3.9.8] prdy_ 접두사 제거 (전일 데이터가 아닌 당일 데이터 사용!)
                        const foreign = parseInt(d.frgn_ntby_tr_pbmn || 0);
                        const institution = parseInt(d.orgn_ntby_tr_pbmn || 0);
                        results.push({ name: s.name, flow: Math.round((foreign + institution) / 100) });
                    }
                } catch (e) { console.error(`Sector API Error [${s.name}]: ${e.message}`); }
            }
            return results.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6);
        }

        const marketSectorsResult = await fetchOverallSectors(token);

        // [v3.6.3] 대한민국 시장 전체(2,800개 종목) 자금 흐름 가져오기
        async function fetchMarketTotalFlow(token) {
            const markets = [
                { name: 'KOSPI', code: '0001' },
                { name: 'KOSDAQ', code: '1001' }
            ];
            let totalF = 0, totalI = 0;
            let pnsn = 0, ivtg = 0, ins = 0;

            for (const m of markets) {
                try {
                    await new Promise(r => setTimeout(r, 100));
                    const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/investor-trend-by-sector`, {
                        headers: {
                            authorization: `Bearer ${token}`,
                            appkey: APP_KEY,
                            appsecret: APP_SECRET,
                            tr_id: 'FHKUP03500100',
                            custtype: 'P'
                        },
                        params: {
                            FID_COND_MRKT_DIV_CODE: 'U',
                            FID_INPUT_ISCD: m.code
                        }
                    });
                    const d = res.data.output;
                    if (d) {
                        // [v3.9.8] prdy_ 접두사 제거 (전일 데이터가 아닌 당일 데이터 사용!)
                        totalF += parseInt(d.frgn_ntby_tr_pbmn || 0);
                        totalI += parseInt(d.orgn_ntby_tr_pbmn || 0);
                        pnsn += parseInt(d.pnsn_ntby_tr_pbmn || 0);
                        ivtg += parseInt(d.ivtg_ntby_tr_pbmn || 0);
                        ins += parseInt(d.ins_ntby_tr_pbmn || 0);
                    }
                } catch (e) { console.error(`Market Total API Error [${m.name}]: ${e.message}`); }
            }
            // KIS 업종별 투자자 데이터(PBmn)는 백만원 단위이므로, 100으로 나누어 '억' 단위로 변환합니다.
            const normalize = (val) => Math.round(val / 100);
            return {
                foreign: normalize(totalF),
                institution: normalize(totalI),
                pnsn: normalize(pnsn),
                ivtg: normalize(ivtg),
                ins: normalize(ins)
            };
        }

        const marketTotalFlow = await fetchMarketTotalFlow(token);

        // ========================================================
        // [코다리 부장] 2단계: 정밀 수급 분석 (The Deep Scan)
        // ========================================================
        console.log(`[Radar 2단계] 정밀 수급 분석 시작...`);

        // [v3.9.0] sectorStockCodes를 Deep Scan 루프 전에 먼저 선언 (ReferenceError 방지)
        const sectorStockCodes = new Set(SECTOR_WATCH_STOCKS.map(s => s.code));

        const candidates = Array.from(candidateMap.values());
        const historyData = new Map();
        let hits = 0;

        // 모든 후보를 정밀 Deep Scan (종목당 150ms 간격으로 순차 진행)
        const fullList = candidates.slice(0, 1000); // 안전 상한: 최대 1000개로 상향
        console.log(`[Radar 2단계] 실제 Deep Scan 대상: ${fullList.length}개 순차 분석 시작...`);

        for (let i = 0; i < fullList.length; i++) {
            const stk = fullList[i];

            // 150ms 간격으로 순차적 요청 (유량 제한 방어)
            await new Promise(r => setTimeout(r, 150));

            try {
                const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                    headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '1' }
                });
                const daily = invRes.data.output || [];

                // [코다리 부장 터치] 장중이라면 잠정치를 가져와서 오늘 데이터를 보정합니다!
                if (isMarketOpen && daily.length > 0) {
                    const d0 = daily[0];
                    const fVal = parseInt(d0.frgn_ntby_qty || 0);
                    const oVal = parseInt(d0.orgn_ntby_qty || 0);

                    // 값이 비어있거나 0인 경우(장중 미지급) 잠정치 조회
                    if ((isNaN(fVal) || fVal === 0) && (isNaN(oVal) || oVal === 0)) {
                        try {
                            const provRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012100', custtype: 'P' },
                                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                            });
                            const prov = provRes.data.output;
                            if (prov) {
                                d0.frgn_ntby_qty = prov.frgn_ntby_qty || '0';
                                d0.orgn_ntby_qty = prov.ivtg_ntby_qty || '0'; // 기관 합계로 보정
                            }
                        } catch (provErr) { /* ignore */ }
                    }
                }

                if (daily.length > 0) {
                    hits++;
                    // [v3.9.9] KIS API inquire-investor TR에서 stck_clpr(종가)는 장중에는 현재가로 사용됩니다.
                    // 향후 더 높은 정확도를 위해 inquire-price TR을 병행할 수 있으나 유량 부하를 고려해 현재 필드를 유지하되
                    // 데이터 기준일을 반드시 확인합니다.
                    const currentPrice = parseInt(daily[0].stck_clpr || 0);
                    const currentRate = parseFloat(daily[0].prdy_ctrt || 0);
                    const currentDate = daily[0].stck_bsop_date || 'Unknown';

                    // [v3.9.5] 데이터 기준일자 로깅 (JYP Ent 등 특정 종목 데이터 정합성 확인용)
                    if (stk.code === '035900') {
                        console.log(`[Radar-Data] JYP Ent. (035900) Data Date: ${currentDate}, Price: ${currentPrice}`);
                    }

                    historyData.set(stk.code, {
                        name: stk.name, price: currentPrice, rate: currentRate, date: currentDate, daily
                    });
                }
            } catch (e) {
                console.error(`[Deep Scan Error] ${stk.name} (${stk.code}): ${e.message}`);
                // [v3.6.2] 핵심 섹터 종목은 실패 시 1회 재시도 (유량 제한 등 일시적 오류 대비)
                if (sectorStockCodes.has(stk.code)) {
                    console.log(`[Radar] 핵심 종목 ${stk.name} 재시도 중...`);
                    await new Promise(r => setTimeout(r, 500));
                    try {
                        const invRes2 = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '1' }
                        });
                        const daily2 = invRes2.data.output || [];
                        if (daily2.length > 0) {
                            hits++;
                            historyData.set(stk.code, { name: stk.name, price: daily2[0].stck_clpr, rate: daily2[0].prdy_ctrt, daily: daily2 });
                        }
                    } catch (e2) { console.error(`[Deep Scan Retry Failed] ${stk.name}: ${e2.message}`); }
                }
            }

            if (i % 50 === 0 && i > 0) console.log(`[Radar 2단계] Deep Scan 진행: ${i}/${fullList.length}`);
        }

        console.log(`[Radar 2단계] Deep Scan 완료! 성공: ${hits}개 / 대상: ${fullList.length}개`);

        if (hits === 0) {
            console.log("[Radar] 데이터를 가져오지 못했습니다. 이전 캐시를 유지합니다.");
            scanLock = false; // [v3.9.1] early return 시 lock 해제!
            return;
        }

        // ========================================================
        // [코다리 부장] 3단계: 결과 리스팅 및 알림 (The Target Alert)
        // 분석 결과를 스냅샷으로 굽고, 사용자별 알림을 발송합니다.
        // ========================================================
        console.log(`[Radar 3단계] 분석 결과 정리 및 알림 발송 중...`);

        const newBuyData = {}, newSellData = {};
        const newAllAnalysis = {}; // [v3.6.2] 분석된 모든 종목 보관용
        const investors = ['0', '2', '1'];

        investors.forEach(inv => {
            newBuyData[`5_${inv}`] = [];
            newSellData[`5_${inv}`] = [];
        });

        // [v3.6.1] 70개 주요 섹터 종목 데이터 강제 포함 (프론트엔드 분석 대기 해결)
        newBuyData['sectors'] = [];
        // [v3.9.0] sectorStockCodes는 2단계 시작 시 이미 선언됨 (위 참조)

        const sectorMap = {};
        // 2,800개 전 종목 수급 데이터를 기본값으로 사용
        const instTotals = {
            pnsn: marketTotalFlow.pnsn || 0,
            ivtg: marketTotalFlow.ivtg || 0,
            ins: marketTotalFlow.ins || 0,
            foreign: marketTotalFlow.foreign || 0,
            institution: marketTotalFlow.institution || 0
        };

        historyData.forEach((val, code) => {
            const d = val.daily[0];
            const netBuy = parseInt(d.frgn_ntby_qty) + parseInt(d.orgn_ntby_qty);
            const pnsnBuy = parseInt(d.pnsn_ntby_qty || 0);
            const ivtgBuy = parseInt(d.ivtg_ntby_qty || 0);
            const insBuy = parseInt(d.ins_ntby_qty || 0);

            const mwc = MARKET_WATCH_STOCKS.find(s => s.code === code);
            if (mwc && mwc.sector) {
                // [v3.8.3] 수량 * 현재가 공식을 통해 자금의 실제 규모(금액)를 계산 후 억 단위로 변환
                const amount = Math.round((netBuy * parseInt(val.price || 0)) / 100000000);
                sectorMap[mwc.sector] = (sectorMap[mwc.sector] || 0) + amount;
            }
            // [v3.6.3] instTotals는 위에서 이미 시장 전체 합계로 초기화되었으므로 개별 합산을 수행하지 않습니다.

            // [v3.9.9] 글로벌 헬퍼 함수를 사용하여 수급 분석 통일
            const fStreakRes = analyzeStreak(val.daily, '2');
            const iStreakRes = analyzeStreak(val.daily, '1');
            const tStreakRes = analyzeStreak(val.daily, '0');

            const indFStreak = fStreakRes.buyStreak > 0 ? fStreakRes.buyStreak : -fStreakRes.sellStreak;
            const indIStreak = iStreakRes.buyStreak > 0 ? iStreakRes.buyStreak : -iStreakRes.sellStreak;
            const indTStreak = tStreakRes.buyStreak > 0 ? tStreakRes.buyStreak : -tStreakRes.sellStreak;

            const stockVwap = calculateVWAP(val.daily);
            const isHid = checkHidden(val.daily);

            // 1. 투자자별 리스트 분류 (5일 기준 등)
            investors.forEach(inv => {
                let currentStreak = 0;
                if (inv === '0') currentStreak = tStreakRes.buyStreak > 0 ? tStreakRes.buyStreak : -tStreakRes.sellStreak;
                else if (inv === '2') currentStreak = fStreakRes.buyStreak > 0 ? fStreakRes.buyStreak : -fStreakRes.sellStreak;
                else if (inv === '1') currentStreak = iStreakRes.buyStreak > 0 ? iStreakRes.buyStreak : -iStreakRes.sellStreak;

                const absStreak = Math.abs(currentStreak);
                if (absStreak >= 2) {
                    const dynamicData = {
                        name: val.name, code, price: val.price, rate: val.rate,
                        streak: absStreak, fStreak: indFStreak, iStreak: indIStreak,
                        vwap: stockVwap, isHiddenAccumulation: isHid
                    };
                    if (currentStreak > 0) newBuyData[`5_${inv}`].push(dynamicData);
                    else newSellData[`5_${inv}`].push(dynamicData);
                }
            });

            // 2. 70개 기본 섹터 종목 데이터 포함
            if (sectorStockCodes.has(code)) {
                newBuyData['sectors'].push({
                    name: val.name, code, price: val.price, rate: val.rate,
                    streak: indFStreak, // 하위 호환성 유지
                    fStreak: indFStreak, iStreak: indIStreak,
                    vwap: stockVwap,
                    isHiddenAccumulation: isHid
                });
            }

            // 3. 모든 분석 종목 요약 정보 저장
            newAllAnalysis[code] = {
                name: val.name,
                price: val.price,
                rate: val.rate,
                fStreak: indFStreak,
                iStreak: indIStreak,
                vwap: stockVwap,
                isHiddenAccumulation: isHid,
                sentiment: Math.max(0, Math.min(100, 50 + (indFStreak * 10) + (indIStreak * 10)))
            };
        });

        const SECTOR_ORDER = [
            '반도체', '이차전지', '바이오 및 헬스케어', '자동차 및 전자부품', '로봇 및 에너지', '엔터 및 플랫폼'
        ];
        const sectorList = Object.entries(sectorMap).map(([name, flow]) => ({ name, flow }));
        // [v3.8.0] 섹터별 자금 흐름을 금액(절대값)이 큰 순서대로 정렬하여 시장 활성도를 우선적으로 보여줌
        sectorList.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));

        investors.forEach(inv => {
            newBuyData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
            newSellData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
        });

        // [코다리 부장 터치] 밤 늦게 데이터가 0으로 들어와도, 낮의 뜨거웠던 자금 흐름 데이터를 삭제하지 않고 보존합니다!
        const buyCount = Object.values(newBuyData).reduce((acc, l) => acc + l.length, 0);
        const sellCount = Object.values(newSellData).reduce((acc, l) => acc + l.length, 0);
        console.log(`[Radar 3단계] 분석 완료! 매수:${buyCount}건, 매도:${sellCount}건, 전체:${Object.keys(newAllAnalysis).length}건`);

        marketAnalysisReport.buyData = newBuyData;
        marketAnalysisReport.sellData = newSellData;
        marketAnalysisReport.allAnalysis = newAllAnalysis; // [v3.6.2] 대규모 맵 저장

        if (marketSectorsResult && marketSectorsResult.length > 0) {
            // [v3.8.2] 외부 API 데이터 기반 섹터 정렬 (확실하게 절대값 큰 순서)
            marketSectorsResult.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));
            marketAnalysisReport.sectors = marketSectorsResult.slice(0, 6);
            marketAnalysisReport.instFlow = instTotals;
        } else {
            // 자체 집계 데이터 사용 시에도 정렬 보장
            sectorList.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));
            marketAnalysisReport.sectors = sectorList.slice(0, 6);
            marketAnalysisReport.instFlow = instTotals;
        }
        // [v3.9.8] 전광판(Ticker)용 동적 텍스트 생성 로직
        const tickerItems = [];
        const fF = instTotals.foreign || 0;
        const iF = instTotals.institution || 0;

        // 1. 시장 전체 수급 기반 메시지
        const now = new Date();
        const hour = now.getUTCHours() + 9;
        const minute = now.getUTCMinutes();
        const currentTimeVal = hour * 100 + minute;

        // 실제 장 운영 시간 (09:00 ~ 15:30) 여부 확인
        const isActuallyTrading = currentTimeVal >= 900 && currentTimeVal <= 1530 && !isWeekend;

        if (!isActuallyTrading && currentTimeVal > 1530) {
            tickerItems.push(`🏁 [마감] ${kstDateStr} 장 마감. ${fF > 0 ? '외인 매수' : '외인 매도'}/${iF > 0 ? '기관 매수' : '기관 매도'}로 최종 집계되었습니다.`);
        } else if (!isActuallyTrading && currentTimeVal < 900) {
            tickerItems.push(`⏳ [개장전] ${kstDateStr} 장 시작 전입니다. 전일 대비 수급 변동에 유의하세요.`);
        } else {
            if (fF > 1500 && iF > 1500) tickerItems.push("🔥 [시장] 외인/기관 쌍끌이 풀매수 포착! 시장 주도주의 강력한 상승세가 예상됩니다.");
            else if (fF > 1000 && iF > 1000) tickerItems.push("🔥 [시장] 외인/기관 동반 매수 중! 지수 견인력이 강화되고 있습니다.");
            else if (fF < -1500 && iF < -1500) tickerItems.push("🚨 [시장] 외인/기관 패닉 셀링 포착! 리스크 관리와 현금 비중 확대를 권장합니다.");
            else if (fF < -1000 && iF < -1000) tickerItems.push("⚠️ [시장] 외인/기관 동반 매도세... 보수적인 관점으로 시장에 대응하세요.");
            else if (fF > 1500) tickerItems.push("🌍 [시장] 외국인 대규모 자금 유입! 대형주 중심의 지수 방어 흐름이 뚜렷합니다.");
            else if (iF > 1500) tickerItems.push("🏛️ [시장] 기관의 강력한 러브콜! 배당주 및 기관 선호 종목군의 수급이 우수합니다.");
            else if (fF < -1500) tickerItems.push("📉 [시장] 외국인 대규모 이탈 중... 수급 공백으로 인한 변동성에 유의하세요.");
            else if (iF < -1500) tickerItems.push("📉 [시장] 기관의 집중 매도세... 단기 차익 실현 물량 출회 가능성이 높습니다.");
            else tickerItems.push("⚖️ [시장] 외인/기관 공방전... 명확한 주도 주체가 나타날 때까지 관망을 권장합니다.");
        }

        // 2. 섹터 흐름 기반 메시지 (절대값 기반이 아닌 실제 유입/유출 최상위 추출)
        const sortedByFlow = [...(marketAnalysisReport.sectors || [])].sort((a, b) => b.flow - a.flow);
        const topFlowSector = sortedByFlow.length > 0 ? sortedByFlow[0] : null;
        const bottomFlowSector = sortedByFlow.length > 0 ? sortedByFlow[sortedByFlow.length - 1] : null;

        if (topFlowSector && topFlowSector.flow > 50) {
            tickerItems.push(`🚀 [핵심섹터] ${topFlowSector.name}에 강력한 자금 유입중! 관련주 수급을 확인하세요.`);
        }
        if (bottomFlowSector && bottomFlowSector.flow < -50) {
            tickerItems.push(`📉 [매물출회] ${bottomFlowSector.name} 섹터는 현재 차익실현 물량이 쏟아지고 있습니다.`);
        }

        // 3. 실시간 급등락 및 특이 정황 (v3.9.9 추가)
        const bullCount = newBuyData['5_0'].length;
        if (bullCount > 20) {
            tickerItems.push(`🎯 [시장포착] 현재 ${bullCount}개 종목에서 외인/기관의 강력한 쌍끌이 매수가 포착되었습니다.`);
        }

        marketAnalysisReport.tickerItems = tickerItems;
        marketAnalysisReport.updateTime = new Date().toISOString();
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

        // --- SERVER PUSH: 사용자별 맞춤 알림 발송 (핵심 변곡 시간대 3번) ---
        // 발송 타겟 시간 (근사치, 15분 주기이므로 넓게 잡음)
        // 1. 아침 (9:00 ~ 9:25) - 시가 추이
        // 2. 점심 (13:00 ~ 13:25) - 오후장 방향성
        // 3. 종가 (15:00 ~ 15:25) - 종가 배팅
        let isPushTime = false;
        if (isMarketOpen) {
            const mList = [
                { h: 9, m1: 0, m2: 25 },
                { h: 13, m1: 0, m2: 25 },
                { h: 15, m1: 0, m2: 25 }
            ];
            const currentMins = kstDate.getUTCMinutes();
            isPushTime = mList.some(t => hour === t.h && currentMins >= t.m1 && currentMins <= t.m2);
        }

        if (pushTokens.length > 0 && isPushTime) {
            console.log(`[Push] 타겟 시간 도달! ${pushTokens.length}명의 등록 사용자에게 4대 핵심 패턴 알림 확인 중...`);
            const pushMessages = [];
            const todayStr = kstDate.toISOString().split('T')[0];

            for (const tokenEntry of pushTokens) {
                if (!Expo.isExpoPushToken(tokenEntry.token)) continue;
                // Initialize today's history for this token
                if (!pushHistory[tokenEntry.token]) pushHistory[tokenEntry.token] = {};
                if (!pushHistory[tokenEntry.token][todayStr]) pushHistory[tokenEntry.token][todayStr] = {};

                const userStocks = tokenEntry.stocks || [];
                if (userStocks.length === 0) continue;

                const userSettings = tokenEntry.settings || { buyStreak: 3, sellStreak: 3, accumStreak: 3 };
                const tokenDailyHistory = pushHistory[tokenEntry.token][todayStr];

                const userAlerts = [];
                let highestPriority = 4; // 1: 이탈, 2: 쌍끌이, 3: 변곡, 4: 매집
                let pushTitle = '📊 Money Fact 알림';

                for (const us of userStocks) {
                    const stockData = historyData.get(us.code);
                    if (!stockData) continue;

                    const foreign = analyzeStreak(stockData.daily, '2');
                    const inst = analyzeStreak(stockData.daily, '1');

                    const fBuy = foreign.buyStreak;
                    const fSell = foreign.sellStreak;
                    const iBuy = inst.buyStreak;
                    const iSell = inst.sellStreak;

                    // 종가 등락 정보 추출
                    const isPriceStable = Math.abs(parseFloat(stockData.rate)) <= 2;

                    let msg = null;
                    let patternKey = 'none'; // 기본 상태 (특이사항 없음)
                    let priority = 99;

                    // 1. 동반 이탈 🚨
                    const isEscapeSignal = fSell >= userSettings.sellStreak && iSell >= userSettings.sellStreak;
                    // 2. 동반 쌍끌이 🔥
                    const isBullSignal = fBuy >= 1 && iBuy >= 1 && (fBuy + iBuy) >= userSettings.buyStreak;
                    // 3. 변곡점 발생 ✨
                    const isTurnSignal = (fBuy === 1 && iSell >= userSettings.sellStreak) || (iBuy === 1 && fSell >= userSettings.sellStreak);
                    // 4. 히든 매집 🤫
                    const isHiddenAcc = isPriceStable && (fBuy >= userSettings.accumStreak || iBuy >= userSettings.accumStreak);

                    if (isEscapeSignal) {
                        patternKey = 'escape';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `❄️ [동반 이탈 경고] ${us.name}: 외인·기관 모두 손절 중! 리스크 관리가 시급합니다.`;
                            priority = 1;
                        }
                    } else if (isBullSignal) {
                        patternKey = 'bull';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `🔥 [동반 쌍끌이 포착] ${us.name}: 외인·기관이 작정하고 쓸어담는 중! 시세 분출이 임박했습니다.`;
                            priority = 2;
                        }
                    } else if (isTurnSignal) {
                        patternKey = 'turn';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `✨ [변곡점 발생] ${us.name}: 기나긴 매도세를 멈추고 수급이 상방으로 꺾였습니다. 신규 진입 적기!`;
                            priority = 3;
                        }
                    } else if (isHiddenAcc) {
                        patternKey = 'hidden';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `🤫 [히든 매집] ${us.name}: 주가는 고요하지만 세력은 은밀히 물량 확보 중입니다. 소문나기 전에 확인하세요.`;
                            priority = 4;
                        }
                    }

                    // [코다리 부장] 상태 갱신 점검: 이전 기록(어느 시간대든)과 현재 상태가 다르면 덮어쓰고 알림! 
                    if (tokenDailyHistory[us.code] !== patternKey) {
                        tokenDailyHistory[us.code] = patternKey; // 최신 상태 낙인 쾅!

                        // 'none' 상태로 변한 것은 알림 주지 않고, 유의미한 패턴으로 변했을 때만 알림
                        if (msg && patternKey !== 'none') {
                            userAlerts.push(msg);
                            if (priority < highestPriority) {
                                highestPriority = priority;
                            }
                        }
                    }
                } // End user stocks loop

                if (userAlerts.length > 0) {
                    if (highestPriority === 1) pushTitle = '🚨 수급 이탈 알림!';
                    else if (highestPriority === 2) pushTitle = '🔥 특급 쌍끌이 시그널!';
                    else if (highestPriority === 3) pushTitle = '✨ 변곡점 포착!';
                    else if (highestPriority === 4) pushTitle = '🤫 히든 매집 포착!';

                    // 시간대별 맞춤 타이틀 적용
                    if (hour === 15) pushTitle = `[종가 배팅] ${pushTitle}`;

                    // Limit to 3 messages per push so it doesn't get cut off entirely
                    const limitedAlerts = userAlerts.slice(0, 3);
                    if (userAlerts.length > 3) limitedAlerts.push(`...외 ${userAlerts.length - 3}건`);

                    pushMessages.push({
                        to: tokenEntry.token,
                        title: pushTitle,
                        body: limitedAlerts.join('\n'),
                        sound: 'default',
                        priority: 'high',
                        data: { type: 'pattern_alert' }
                    });
                }
            } // End user tokens loop

            if (pushMessages.length > 0) {
                await sendPushNotifications(pushMessages);
                savePushHistory();
            } else {
                console.log(`[Push] 패턴 조건 충족 종목이 없거나 이미 발송 완료.`);
            }
        } else if (pushTokens.length > 0) {
            // Not push time
            console.log(`[Push] 사용자 스캔 생략 (지정된 알림 시간이 아님)`);
        }

        console.log(`[Radar] ====== 2단계 하이브리드 레이더 임무 완료! ======`);

    } catch (e) {
        console.error("[Radar] Worker Error:", e.message, e.stack ? e.stack.split('\n')[1] : '');
        marketAnalysisReport.status = marketAnalysisReport.updateTime ? 'READY' : 'ERROR';
    } finally {
        // [v3.9.1] 반드시 lock 해제!
        scanLock = false;
        console.log(`[Worker] 🔓 스캔 락 해제 완료. 상태: ${marketAnalysisReport.status}`);
    }
}

// [v3.9.0 코다리 부장] 서버 기동 시 데이터 갱신 판단 로직 개선
// - 데이터가 없거나 마지막 업데이트가 오늘 날짜가 아니면 즉시 강제 스캔
// - 연휴/주말을 지나 장이 시작될 때 반드시 새 데이터를 가져오도록 보장
const _kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
const _todayStr = `${_kstNow.getUTCFullYear()}-${String(_kstNow.getUTCMonth() + 1).padStart(2, '0')}-${String(_kstNow.getUTCDate()).padStart(2, '0')}`;
let _lastUpdateStr = '';
if (marketAnalysisReport.updateTime) {
    const _lastKST = new Date(new Date(marketAnalysisReport.updateTime).getTime() + 9 * 60 * 60 * 1000);
    _lastUpdateStr = `${_lastKST.getUTCFullYear()}-${String(_lastKST.getUTCMonth() + 1).padStart(2, '0')}-${String(_lastKST.getUTCDate()).padStart(2, '0')}`;
}
const snapshotDate = marketAnalysisReport.updateTime?.split('T')[0] || '';
const isSellListEmpty = Object.values(marketAnalysisReport.sellData || {}).every(list => !list || list.length === 0);
const _hour = _kstNow.getUTCHours();
const _day = _kstNow.getUTCDay();
const _isMarketOpen = (_hour >= 9 && _hour < 16 && _day >= 1 && _day <= 5);

if (_isMarketOpen || snapshotDate !== _todayStr || isSellListEmpty) {
    console.log(`[Server] ${_isMarketOpen ? '장중이거나' : ''}${snapshotDate !== _todayStr ? '데이터가 옛날 것이거나' : ''}${isSellListEmpty ? '매도 리스트가 비어 있어' : ''} 즉시 스캔 시작...`);
    runDeepMarketScan(true);
} else {
    console.log(`[Server] 데이터가 오늘(${_todayStr}) 것입니다. 정기 스케줄로 갱신합니다.`);
}

// [코다리 부장] setInterval은 app.listen 콜백에서 1회만 실행 (중복 방지)

app.get('/api/analysis/supply/:period/:investor', (req, res) => {
    const key = `${req.params.period}_${req.params.investor}`;
    const mode = req.query.mode || 'buy';
    const data = (mode === 'buy') ? marketAnalysisReport.buyData[key] : marketAnalysisReport.sellData[key];
    res.json({ output: data || [], updateTime: marketAnalysisReport.updateTime, dataType: marketAnalysisReport.dataType });
});

// [코다리 부장 터치] 앱이 밤에도 한 방에 전체 데이터를 받아갈 수 있는 스냅샷 API!
// [v3.9.8] 앱의 스냅샷 요청 시에도 데이터 신선도를 체크하여 필요시 스캐너 가동
app.get('/api/snapshot', (req, res) => {
    const isStale = (marketAnalysisReport.updateTime &&
        new Date().getDate() !== new Date(marketAnalysisReport.updateTime).getDate());

    // 비동기로 실행하여 응답 지연 방지
    runDeepMarketScan(false);

    res.json({
        ...marketAnalysisReport,
        _scanTriggered: isStale ? 'STALE_FORCE' : 'CHECKED'
    });
});

const ALL_STOCKS = require('./popular_stocks');
// Deduplicate stocks by code
const POPULAR_STOCKS = Array.from(new Map(ALL_STOCKS.map(s => [s.code, s])).values());
console.log(`[Server] Loaded ${POPULAR_STOCKS.length} unique stocks (Deduplicated from ${ALL_STOCKS.length})`);

// --- Global Helper Functions for Supply & Demand Analysis ---

/**
 * [가이드] 연속 수급(Streak) 계산 함수
 * - net > 0 (매수), net < 0 (매도), net == 0 (무시 또는 중단 선택 가능)
 * - 현재 프로젝트 정책: 0(주말/휴장/보합)은 무시하고 연속성을 유지하도록 통일 (v3.9.9)
 */
function analyzeStreak(daily, inv) {
    if (!daily || daily.length === 0) return { buyStreak: 0, sellStreak: 0 };

    let buyStreak = 0, sellStreak = 0;
    let firstDirection = 0; // 1: buy, -1: sell

    for (let j = 0; j < daily.length; j++) {
        const d = daily[j];
        let net = 0;
        const fQty = parseInt(d.frgn_ntby_qty || 0) || 0;
        const oQty = parseInt(d.orgn_ntby_qty || 0) || 0;

        if (inv === '0') net = fQty + oQty;
        else if (inv === '2') net = fQty;
        else if (inv === '1') net = oQty;

        if (net === 0) continue; // 0인 날은 건너뜀 (연속성 유지)

        if (firstDirection === 0) {
            firstDirection = net > 0 ? 1 : -1;
        }

        if (firstDirection === 1) {
            if (net > 0) buyStreak++;
            else break;
        } else {
            if (net < 0) sellStreak++;
            else break;
        }
    }
    return { buyStreak, sellStreak };
}

/**
 * [가이드] VWAP(거래량 가중 평균가) 및 히든 매집 계산
 */
function calculateVWAP(daily, days = 5) {
    if (!daily || daily.length === 0) return 0;
    let totalValue = 0, totalVol = 0;
    const actual = Math.min(daily.length, days);
    for (let j = 0; j < actual; j++) {
        const row = daily[j];
        const v = parseInt(row.acml_vol || row.prdy_vol || 0);
        const p = parseInt(row.stck_clpr || 0);
        if (v > 0 && p > 0) { totalValue += (v * p); totalVol += v; }
    }
    return totalVol === 0 ? 0 : Math.round(totalValue / totalVol);
}

// [v3.8.6] 히든 매집 감지 로직 고도화: 최근 5거래일 변동성(고가-저가) 기반 횡보 판정
function checkHidden(daily, threshold = 3) {
    if (!daily || daily.length < 5) return false;
    let totalVolatility = 0;
    for (let j = 0; j < 5; j++) {
        const row = daily[j];
        const high = parseInt(row.stck_hgpr || 0);
        const low = parseInt(row.stck_lwpr || 0);
        const close = parseInt(row.stck_clpr || 1);

        let dayVolatility = 0;
        if (high > 0 && low > 0) {
            // 가이드 원칙: (고가 - 저가) / 종가
            dayVolatility = ((high - low) / close) * 100;
        } else {
            // 데이터 미비 시 전일비(prdy_ctrt)의 1.2배를 일중 변동성으로 추정 적용
            dayVolatility = Math.abs(parseFloat(row.prdy_ctrt || 0)) * 1.2;
        }
        totalVolatility += dayVolatility;
    }
    const avgVol = totalVolatility / 5;
    const fRes = analyzeStreak(daily, '2');
    const iRes = analyzeStreak(daily, '1');
    // 변동성 3% 미만 + 외인 또는 기관의 연속 순매수가 기준치 이상
    return avgVol < 3 && (fRes.buyStreak >= threshold || iRes.buyStreak >= threshold);
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
    const { syncKey, stocks, settings, watchlist } = req.body;
    if (!syncKey || !stocks) return res.status(400).json({ error: 'Invalid data' });

    // Add timestamp for backup tracking
    userStore[syncKey] = {
        stocks,
        settings: settings || {},
        watchlist: watchlist || null,
        updatedAt: new Date().toISOString(),
        version: (userStore[syncKey]?.version || 0) + 1
    };
    try {
        await saveSyncFile(syncKey);
        console.log(`[Sync] Saved data for key: ${syncKey} (v${userStore[syncKey].version})${watchlist ? ' +watchlist' : ''}`);
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
    const watchlist = data.watchlist || null;
    res.json({ stocks, settings, watchlist, version: data.version || 1, updatedAt: data.updatedAt });
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
    const { codes } = req.body;
    if (!codes || !Array.isArray(codes) || codes.length === 0) return res.json({ result: [] });

    const token = await getAccessToken();
    const analyzed = [];

    // [v3.9.9] 순차 분석 + 잠정치 보정 + TPS 방어
    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstDay = (now.getUTCDay());
    const isTradingTime = (kstHour >= 9 && kstHour <= 16) && (kstDay >= 1 && kstDay <= 5);

    for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        await new Promise(r => setTimeout(r, 150)); // 150ms 간격으로 TPS 방어

        try {
            const meta = POPULAR_STOCKS.find(s => s.code === code) || { name: code, code };
            const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '1' }
            });
            let daily = invRes.data.output || [];

            if (daily.length > 0 && isTradingTime) {
                // 장중 잠정치 보정 로직 추가
                const d0 = daily[0];
                const fVal = parseInt(d0.frgn_ntby_qty || 0);
                const oVal = parseInt(d0.orgn_ntby_qty || 0);

                if (fVal === 0 && oVal === 0) {
                    try {
                        const provRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                            headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012100', custtype: 'P' },
                            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code }
                        });
                        const prov = provRes.data.output;
                        if (prov) {
                            d0.frgn_ntby_qty = prov.frgn_ntby_qty || '0';
                            d0.orgn_ntby_qty = prov.ivtg_ntby_qty || '0';
                        }
                    } catch (e) { }
                }
            }

            if (daily.length === 0) continue;

            const currentPrice = daily[0].stck_clpr;
            const currentRate = daily[0].prdy_ctrt;

            const foreign = analyzeStreak(daily, '2');
            const inst = analyzeStreak(daily, '1');
            const total = analyzeStreak(daily, '0');

            const isDanger = (foreign.sellStreak >= 3 || inst.sellStreak >= 3 || total.sellStreak >= 3);
            const isOpportunity = (foreign.buyStreak >= 3 || inst.buyStreak >= 3 || total.buyStreak >= 3);

            analyzed.push({
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
                isOpportunity,
                vwap: calculateVWAP(daily),
                isHiddenAccumulation: checkHidden(daily)
            });
        } catch (e) {
            console.error(`[Portfolio Analyze Error] ${code}: ${e.message}`);
        }
    }

    res.json({ result: analyzed });
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
app.listen(PORT, () => {
    console.log(`Deep Scan Server Online on port ${PORT}`);

    // [v3.9.0 코다리 부장] 15분 주기 스캔 (장중 자동 갱신의 핵심!)
    setInterval(() => {
        runDeepMarketScan(false);
    }, 15 * 60 * 1000);

    // Render 서버 절전 모드 방지용 자체 핑 (14분 주기)
    setInterval(() => {
        axios.get('https://money-fact-server.onrender.com/').catch(() => { });
    }, 14 * 60 * 1000);

    // [v3.9.0] 서버 시작 시 중복 스캔 제거 - 위의 shouldScanNow에서 이미 처리됨
    // force=false 중복 호출이 장 외 시간에 MARKET_CLOSE로 덮어쓰는 버그 방지
    console.log(`[Server] 15분 주기 스캔 스케줄러 활성화 완료`);
});
