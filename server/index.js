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
    try {
        pushTokens = JSON.parse(fs.readFileSync(PUSH_TOKENS_FILE, 'utf8'));
    } catch (e) { }

}
if (fs.existsSync(PUSH_HISTORY_FILE)) {
    try {
        pushHistory = JSON.parse(fs.readFileSync(PUSH_HISTORY_FILE, 'utf8'));
    } catch (e) { }

}

const savePushTokens = () => {
    try {
        fs.writeFileSync(PUSH_TOKENS_FILE, JSON.stringify(pushTokens, null, 2));
    } catch (e) { }

};
const savePushHistory = () => {
    try {
        fs.writeFileSync(PUSH_HISTORY_FILE, JSON.stringify(pushHistory, null, 2));
    } catch (e) { }

};

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = process.env.KIS_APP_SECRET || 'uxLk5zL+ozOiV8NarXq0kt0E7GOsHt+Alb4S8k2CciUL6VXlK4hnF8tW+wzE7DZ1vfwmiOniz0cDM+1pWsCiJYirzrmuXQI52hR0=nzhsUM0B+ipW9MjmLZNxeRPBByUtG5/k/j5xGt1+ZwVaf';

const MARKET_WATCH_STOCKS = [
    { name: '삼성전자', code: '005930', sector: '반도체' }, { name: 'SK하이닉스', code: '000660', sector: '반도체' },
    { name: 'HPSP', code: '403870', sector: '반도체' }, { name: '한미반도체', code: '042700', sector: '반도체' },
    { name: 'LG에너지솔루션', code: '373220', sector: '이차전지' }, { name: 'POSCO홀딩스', code: '005490', sector: '이차전지' },
    { name: '삼성바이오로직스', code: '207940', sector: '바이오 및 헬스케어' }, { name: '셀트리온', code: '068270', sector: '바이오 및 헬스케어' },
    { name: '현대차', code: '005380', sector: '자동차 및 전자부품' }, { name: '기아', code: '000270', sector: '자동차 및 전자부품' },
    { name: 'KB금융', code: '105560', sector: '기타(금융)' }, { name: '신한지주', code: '055550', sector: '기타(금융)' },
    { name: 'NAVER', code: '035420', sector: '엔터 및 플랫폼' }, { name: '카카오', code: '035720', sector: '엔터 및 플랫폼' },
    { name: '레인보우로보틱스', code: '277810', sector: '로봇 및 에너지' },
    { name: 'SK바이오사이언스', code: '302440', sector: '바이오 및 헬스케어' }
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
    { name: '알테오젠', code: '196170' }, { name: '오스코텍', code: '039200' }, { name: 'SK바이오사이언스', code: '302440' },
];

const SNAPSHOT_FILE = path.join(__dirname, 'market_report_snapshot.json');

let cachedToken = '';
let tokenExpiry = null;

// [v4.0.2] 서버 재시작 시에도 마지막 성공 시간을 유지하기 위해 스냅샷 파일에서 로드합니다.
let initialUpdateTime = null;

try {

    if (fs.existsSync(SNAPSHOT_FILE)) {
        const snap = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
        initialUpdateTime = snap.updateTime;

    }

} catch (e) { }



let marketAnalysisReport = {
    updateTime: initialUpdateTime,
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
    try {
        userDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) { }

}

const saveDb = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(userDb, null, 2));
    } catch (e) { }

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

    // [v3.6 최적화] 시장 감시 시간: 오전 8시 ~ 오후 8시 (20:00) KST
    // 오후 3:30 이후 시간외 및 야간 거래 수급까지 15분마다 추적하여 8시에 최종 확정합니다.
    const isWeekend = (day === 0 || day === 6);
    const isMarketOpen = (hour >= 8 && hour <= 20) && !isWeekend;
    const hasNoData = !marketAnalysisReport.updateTime;

    if (!isMarketOpen && !force && !hasNoData) {
        console.log(`[Worker] Market Closed (KST ${hour}:xx). Serving cached data.`);
        marketAnalysisReport.dataType = 'MARKET_CLOSE';
        return;
    }

    const currentType = 'LIVE';
    console.log(`[Radar] ====== 2단계 하이브리드 레이더 가동! ======`);
    // [코다리 부장 터치] 데이터가 아예 없을 때(최초 실행)만 SCANNING 상태를 보여줍니다.
    // 기존 데이터가 있다면 화면을 멈추지 않고 백그라운드에서 조용히 업데이트합니다.
    if (hasNoData) {
        marketAnalysisReport.status = 'SCANNING';
    }
    try {
        const token = await getAccessToken();

        // [v3.6.1] 70개 주요 섹터 종목 코드 미리 생성 (하단 루프 및 재시도 로직에서 사용)
        const sectorStockCodes = new Set(SECTOR_WATCH_STOCKS.map(s => s.code));

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
        const maxWideScan = Math.min(POPULAR_STOCKS.length, 1200); // 1200개로 축소하여 업데이트 속도 개선
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
                        const foreign = parseInt(d.prdy_frgn_ntby_tr_pbmn || 0) / 10000;
                        const institution = parseInt(d.prdy_orgn_ntby_tr_pbmn || 0) / 10000;
                        results.push({ name: s.name, flow: foreign + institution });
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
                        totalF += parseInt(d.prdy_frgn_ntby_tr_pbmn || 0) / 10000;
                        totalI += parseInt(d.prdy_orgn_ntby_tr_pbmn || 0) / 10000;
                        pnsn += parseInt(d.pnsn_ntby_tr_pbmn || 0) / 100;
                        ivtg += parseInt(d.ivtg_ntby_tr_pbmn || 0) / 100;
                        ins += parseInt(d.ins_ntby_tr_pbmn || 0) / 100;
                    }
                } catch (e) { console.error(`Market Total API Error [${m.name}]: ${e.message}`); }
            }
            return { foreign: totalF, institution: totalI, pnsn, ivtg, ins };
        }

        const marketTotalFlow = await fetchMarketTotalFlow(token);

        // ========================================================
        // [코다리 부장] 2단계: 정밀 수급 분석 (The Deep Scan)
        // ========================================================
        console.log(`[Radar 2단계] 정밀 수급 분석 시작...`);

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
                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' }
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
                    const currentPrice = daily[0].stck_clpr;
                    const currentRate = daily[0].prdy_ctrt;
                    historyData.set(stk.code, {
                        name: stk.name, price: currentPrice, rate: currentRate, daily
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
                            params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' }
                        });
                        const daily2 = invRes2.data.output || [];
                        if (daily2.length > 0) {
                            hits++;
                            historyData.set(stk.code, { name: stk.name, price: daily2[0].stck_clpr, rate: daily2[0].prdy_ctrt, daily: daily2 });
                        }
                    } catch (e2) { console.error(`[Deep Scan Retry Failed] ${stk.name}: ${e2.message}`); }
                }
            }

            if (i % 50 === 0 && i > 0) {
                console.log(`[Radar 2단계] Deep Scan 진행: ${i}/${fullList.length}`);
                // [코다리 부장 터치] 최초 실행 시 사용자에게 실시간 진행률을 보여줍니다.
                if (hasNoData) {
                    marketAnalysisReport.scanStats = {
                        totalScanned: candidateMap.size,
                        deepScanned: i,
                        successHits: hits,
                        wideNetAdded: wideNetHits
                    };
                }
            }
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
        const newAllAnalysis = {}; // [v3.6.2] 분석된 모든 종목 보관용
        const investors = ['0', '2', '1'];

        investors.forEach(inv => {
            newBuyData[`5_${inv}`] = [];
            newSellData[`5_${inv}`] = [];
        });

        // [v3.6.1] 70개 주요 섹터 종목 데이터 강제 포함 (프론트엔드 분석 대기 해결)
        newBuyData['sectors'] = [];

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
                sectorMap[mwc.sector] = (sectorMap[mwc.sector] || 0) + netBuy;
            }
            // [v3.6.3] instTotals는 위에서 이미 시장 전체 합계로 초기화되었으므로 개별 합산을 수행하지 않습니다.

            // [v3.6.2 핵심 수정] 외인/기관 streak를 독립적으로 계산!
            // 기존에는 투자자별 루프에서 fStreak=iStreak=같은 값이 들어가는 버그가 있었습니다.
            const calcIndependentStreak = (daily, investorType) => {
                if (!daily || daily.length === 0) return 0;
                const getNet = (row) => {
                    const fQ = parseInt(String(row.frgn_ntby_qty || 0).replace(/,/g, '')) || 0;
                    const oQ = parseInt(String(row.orgn_ntby_qty || 0).replace(/,/g, '')) || 0;
                    if (investorType === '2') return fQ;
                    if (investorType === '1') return oQ;
                    return fQ + oQ;
                };

                const firstNet = getNet(daily[0]);
                if (firstNet === 0) return 0;

                const isBuy = firstNet > 0;
                let count = 0;
                for (let j = 0; j < daily.length; j++) {
                    const net = getNet(daily[j]);
                    if (isBuy && net > 0) count++;
                    else if (!isBuy && net < 0) count++;
                    else break;
                }
                return isBuy ? count : -count;
            };

            // 각 종목의 외인/기관 streak를 한 번에 독립 계산
            const indFStreak = calcIndependentStreak(val.daily, '2');
            const indIStreak = calcIndependentStreak(val.daily, '1');

            investors.forEach(inv => {
                const streakCount = calcIndependentStreak(val.daily, inv);

                if (streakCount >= 2) {
                    newBuyData[`5_${inv}`].push({
                        name: val.name, code, price: val.price, rate: val.rate,
                        streak: streakCount, fStreak: indFStreak, iStreak: indIStreak
                    });
                } else if (streakCount <= -2) {
                    newSellData[`5_${inv}`].push({
                        name: val.name, code, price: val.price, rate: val.rate,
                        streak: Math.abs(streakCount), fStreak: indFStreak, iStreak: indIStreak
                    });
                }
            });

            // 70개 기본 섹터 종목은 무조건 snapshot에 포함하여 프론트에서 KIS API를 우회하도록 함
            if (sectorStockCodes.has(code)) {
                const fSt = calcIndependentStreak(val.daily, '2');
                const iSt = calcIndependentStreak(val.daily, '1');

                newBuyData['sectors'].push({
                    name: val.name, code, price: val.price, rate: val.rate,
                    streak: fSt, // 프론트에서 sentiment(50 + streak*10) 계산 시 기반이 됨
                    fStreak: fSt, iStreak: iSt
                });
            }

            // [v3.6.2] 모든 분석 종목 요약 정보를 맵에 저장 (관심종목용)
            const allFSt = calcIndependentStreak(val.daily.slice(0, 31), '2');
            const allISt = calcIndependentStreak(val.daily.slice(0, 31), '1');

            newAllAnalysis[code] = {
                name: val.name,
                price: val.price,
                rate: val.rate,
                fStreak: allFSt,
                iStreak: allISt,
                sentiment: 50 + (allFSt + allISt) * 5
            };
        });

        const SECTOR_ORDER = [
            '반도체', '이차전지', '바이오 및 헬스케어', '자동차 및 전자부품', '로봇 및 에너지', '엔터 및 플랫폼'
        ];
        const sectorList = Object.entries(sectorMap).map(([name, flow]) => ({ name, flow }));
        // [v3.8.0] 섹터별 자금 흐름을 금액(절대값)이 큰 순서대로 정렬하여 시장 활성도를 우선적으로 보여줌
        sectorList.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));

        if (marketSectorsResult && marketSectorsResult.length > 0) {
            // 외부 API에서 가져온 섹터 데이터도 금액 순으로 정렬
            marketSectorsResult.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));
            marketAnalysisReport.sectors = marketSectorsResult;
        } else {
            // 자체 집계된 섹터 데이터 사용 시 상위 6개 노출
            marketAnalysisReport.sectors = sectorList.slice(0, 6);
        }

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
            marketAnalysisReport.sectors = marketSectorsResult;
            marketAnalysisReport.instFlow = instTotals;
        }
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
        console.error("[Radar] Worker Error:", e.message);
        marketAnalysisReport.status = marketAnalysisReport.updateTime ? 'READY' : 'ERROR';
    }
}

// [코다리 부장 터치] 서버가 켜질 때 데이터가 너무 오래됐거나 없으면 즉시 한 번 구워줍니다!
const shouldScanNow = !marketAnalysisReport.updateTime || (new Date() - new Date(marketAnalysisReport.updateTime) > 60 * 60 * 1000);
if (shouldScanNow) {
    console.log("[Server] Data stale or missing. Starting immediate market scan...");
    runDeepMarketScan(true);
}

// [코다리 부장] setInterval은 app.listen 콜백에서 1회만 실행 (중복 방지)

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
        const fQty = parseInt(d.frgn_ntby_qty || 0) || 0;
        const oQty = parseInt(d.orgn_ntby_qty || 0) || 0;

        if (inv === '0') net = fQty + oQty;
        else if (inv === '2') net = fQty;
        else if (inv === '1') net = oQty;

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

// [코다리 부장] 모바일 앱 추가 종목 및 상세 보기용 개별 API
app.get('/api/stock-daily/:code', async (req, res) => {
    const code = req.params.code;
    if (!code) return res.status(400).json({ error: 'Missing stock code' });

    try {
        const token = await getAccessToken();
        const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010900',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: code
            }
        });

        if (invRes.data && invRes.data.output) {
            res.json({ daily: invRes.data.output });
        } else {
            res.json({ daily: [] });
        }
    } catch (error) {
        console.error(`[Server] Daily fetch error for ${code}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch daily data', daily: [] });
    }
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
app.listen(PORT, () => {
    console.log(`Deep Scan Server Online on port ${PORT}`);

    // [코다리 부장 터치] 어플을 켜지 않아도 서버가 알아서 푸시를 날리도록 15분 주기로 스캔 가동!
    setInterval(() => {
        runDeepMarketScan(false);
    }, 15 * 60 * 1000);

    // Render 서버 절전 모드 방지용 자체 핑 (14분 주기)
    setInterval(() => {
        axios.get('https://money-fact-server.onrender.com/').catch(() => { });
    }, 14 * 60 * 1000);

    // 구동 시 1회 즉시 스캔
    setTimeout(() => runDeepMarketScan(true), 5000);
});
