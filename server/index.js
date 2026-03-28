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
const NOTIFICATION_ARCHIVE_FILE = path.join(__dirname, 'notification_archive.json'); // [v5.3.0] 알림 아카이브용
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

let notificationArchive = {}; // [v5.3.0] 알림 보관함용 서버 아카이브
if (fs.existsSync(NOTIFICATION_ARCHIVE_FILE)) {
    try {
        notificationArchive = JSON.parse(fs.readFileSync(NOTIFICATION_ARCHIVE_FILE, 'utf8'));
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

const saveNotificationArchive = () => {
    try {
        fs.writeFileSync(NOTIFICATION_ARCHIVE_FILE, JSON.stringify(notificationArchive, null, 2));
    } catch (e) { }
};

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;

// [v5.3.1] 듀얼 토큰 엔진: 백그라운드 스캐너 전용 키 (없으면 메인 키로 폴백)
const APP_KEY_BG = process.env.KIS_APP_KEY_BG || APP_KEY;
const APP_SECRET_BG = process.env.KIS_APP_SECRET_BG || APP_SECRET;
const hasDualEngine = !!(process.env.KIS_APP_KEY_BG && process.env.KIS_APP_SECRET_BG);
if (hasDualEngine) console.log('[Server] 🔥 듀얼 토큰 엔진 활성화! BG키=스캐너, 메인키=유저응답');
else console.log('[Server] ⚙️ 싱글 토큰 모드 (KIS_APP_KEY_BG 미설정)');

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
    { name: '현대차', code: '005380', sector: '자동차 및 전자부품' },
    { name: '현대차우', code: '005385', sector: '자동차 및 전자부품' },
    { name: '현대모비스', code: '012330', sector: '자동차 및 전자부품' },
    { name: '기아', code: '000270', sector: '자동차 및 전자부품' },
    { name: '삼성전기', code: '009150', sector: '자동차 및 전자부품' },
    { name: '삼성전기우', code: '009155', sector: '자동차 및 전자부품' },
    // 이차전지
    { name: '삼성SDI', code: '006400', sector: '이차전지' },
    { name: 'LG에너지솔루션', code: '373220', sector: '이차전지' },
    { name: 'LG화학', code: '051910', sector: '이차전지' },
    { name: 'POSCO홀딩스', code: '005490', sector: '이차전지' },
    { name: '에코프로', code: '086520', sector: '이차전지' },
    { name: '에코프로비엠', code: '247540', sector: '이차전지' },
    { name: '엘앤에프', code: '066970', sector: '이차전지' },
    { name: '포스코퓨처엠', code: '003670', sector: '이차전지' },
    { name: '나노신소재', code: '121600', sector: '이차전지' },
    { name: '에코프로머티', code: '450080', sector: '이차전지' },
    { name: '상신이디피', code: '091580', sector: '이차전지' },
    { name: '코스모화학', code: '005420', sector: '이차전지' },
    // 엔터 및 플랫폼
    { name: '하이브', code: '352820', sector: '엔터 및 플랫폼' },
    { name: '와이지엔터테인먼트', code: '122870', sector: '엔터 및 플랫폼' },
    { name: 'JYP Ent.', code: '035900', sector: '엔터 및 플랫폼' },
    { name: '에스엠(SM)', code: '041510', sector: '엔터 및 플랫폼' },
    { name: 'TCC스틸', code: '002710', sector: '자동차 및 전자부품' },
    { name: '디어유', code: '376300', sector: '엔터 및 플랫폼' },
    { name: '카카오', code: '035720', sector: '엔터 및 플랫폼' },
    { name: 'NAVER', code: '035420', sector: '엔터 및 플랫폼' },
    // 로봇 및 에너지
    { name: '레인보우로보틱스', code: '277810', sector: '로봇 및 에너지' },
    { name: '티로보틱스', code: '117730', sector: '로봇 및 에너지' },
    { name: '씨메스', code: '475400', sector: '로봇 및 에너지' },
    { name: '클로봇', code: '466100', sector: '로봇 및 에너지' },
    { name: 'HD현대에너지솔루션', code: '322000', sector: '로봇 및 에너지' },
    { name: 'OCI홀딩스', code: '010060', sector: '로봇 및 에너지' },
    // 반도체
    { name: '삼성전자', code: '005930', sector: '반도체' },
    { name: '삼성전자우', code: '005935', sector: '반도체' },
    { name: 'SK하이닉스', code: '000660', sector: '반도체' },
    { name: '와이씨', code: '232140', sector: '반도체' },
    { name: 'HPSP', code: '403870', sector: '반도체' },
    { name: '테크윙', code: '089030', sector: '반도체' },
    { name: '하나머티리얼즈', code: '166090', sector: '반도체' },
    { name: '하나마이크론', code: '067310', sector: '반도체' },
    { name: '유진테크', code: '084370', sector: '반도체' },
    { name: '피에스케이홀딩스', code: '031980', sector: '반도체' },
    { name: '피에스케이', code: '319660', sector: '반도체' },
    { name: '에스티아이(STI)', code: '039440', sector: '반도체' },
    { name: '디아이(DI)', code: '003160', sector: '반도체' },
    { name: '에스앤에스텍', code: '101490', sector: '반도체' },
    { name: '이오테크닉스', code: '039030', sector: '반도체' },
    { name: '원익IPS', code: '240810', sector: '반도체' },
    { name: 'ISC', code: '095340', sector: '반도체' },
    { name: '두산테스나', code: '131970', sector: '반도체' },
    { name: '에프에스티', code: '036810', sector: '반도체' },
    { name: '한화비전', code: '489790', sector: '반도체' },
    { name: '가온칩스', code: '399720', sector: '반도체' },
    { name: '에이디테크놀로지', code: '158430', sector: '반도체' },
    { name: '주성엔지니어링', code: '036930', sector: '반도체' },
    { name: '한미반도체', code: '042700', sector: '반도체' },
    { name: '케이씨텍', code: '281820', sector: '반도체' },
    { name: '원익QnC', code: '074600', sector: '반도체' },
    { name: '유니샘', code: '036200', sector: '반도체' },
    { name: '티씨케이', code: '064760', sector: '반도체' },
    // 바이오 및 헬스케어
    { name: '한올바이오파마', code: '009420', sector: '바이오 및 헬스케어' },
    { name: '코오롱티슈진', code: '950160', sector: '바이오 및 헬스케어' },
    { name: '한미약품', code: '128940', sector: '바이오 및 헬스케어' },
    { name: 'HLB', code: '028300', sector: '바이오 및 헬스케어' },
    { name: '에이비엘바이오', code: '298380', sector: '바이오 및 헬스케어' },
    { name: '인벤티지랩', code: '389470', sector: '바이오 및 헬스케어' },
    { name: '퓨쳐켐', code: '220100', sector: '바이오 및 헬스케어' },
    { name: '리가켐바이오', code: '141080', sector: '바이오 및 헬스케어' },
    { name: '알테오젠', code: '196170', sector: '바이오 및 헬스케어' },
    { name: '오스코텍', code: '039200', sector: '바이오 및 헬스케어' },
    { name: 'SK바이오사이언스', code: '302440', sector: '바이오 및 헬스케어' },
];

const SNAPSHOT_FILE = path.join(__dirname, 'market_report_snapshot.json');

let cachedToken = '';
let tokenExpiry = null;
let lastRateLimitTime = 0; // [v4.0.12] 마지막 레이트 리미트 발생 시각

// [v4.3.0] KIS API 속도 제한기 (Token Bucket) - 초당 최대 15건으로 제어하여 레이트 리미트 방지
const kisRateLimiter = {
    tokens: 15,
    maxTokens: 15,
    lastRefill: Date.now(),
    refillRate: 1000, // 1초마다 리필
    async waitForToken() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        if (elapsed >= this.refillRate) {
            this.tokens = this.maxTokens;
            this.lastRefill = now;
        }
        if (this.tokens <= 0) {
            const waitTime = this.refillRate - (now - this.lastRefill) + 50;
            await new Promise(r => setTimeout(r, waitTime));
            this.tokens = this.maxTokens;
            this.lastRefill = Date.now();
        }
        this.tokens--;
    }
};

// [v4.1.1] 서버 가동 시 기존 스냅샷(market_report_snapshot.json)을 통째로 메모리에 복원합니다!
// 어플을 새로 깔거나 서버가 재시작되어도, 장 마감 시점의 데이터를 항상 볼 수 있도록 보장합니다.
let marketAnalysisReport = {
    updateTime: null,
    dataType: 'LIVE',
    status: 'INITIALIZING',
    buyData: {},
    sellData: {},
    sectors: [],
    instFlow: { pnsn: 0, ivtg: 0, ins: 0 },
    lastError: null
};

try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
        const snap = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
        if (snap && (snap.updateTime || snap.marketReport)) {
            // 구조 보정: snap 자체가 데이터거나 snap.marketReport 안에 데이터가 있을 수 있음
            const restoredData = snap.marketReport || snap;
            marketAnalysisReport = { ...marketAnalysisReport, ...restoredData };
            marketAnalysisReport.status = 'READY'; // 복원된 데이터가 있으므로 즉시 READY 상태로 전환
            console.log(`[Server] 🏛️ Snapshot restored successfully. Last update: ${marketAnalysisReport.updateTime}`);
        }
    }
} catch (e) {
    console.error("[Server] Critical error loading snapshot:", e.message);
}

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

const TOKEN_FILE = path.join(__dirname, 'real_token_cache.json');
const TOKEN_FILE_BG = path.join(__dirname, 'real_token_cache_bg.json'); // [v5.3.1] BG 토큰 별도 캐시

let tokenRequestPromise = null;
let tokenRequestPromiseBG = null; // [v5.3.1] BG 토큰 요청 전용
let lastRateLimitTimeBG = 0; // [v5.3.1] BG 키 전용 Rate Limit 쿨다운

// =====================================================
// [메인 토큰] 유저 실시간 응답용 (stock-daily, stock-price 등)
// =====================================================
async function getAccessToken() {
    // 1. Try to read from file first
    if (fs.existsSync(TOKEN_FILE)) {
        try {
            const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            const expiry = new Date(saved.expiry);
            if (new Date(new Date().getTime() + 10 * 60 * 1000) < expiry) {
                return saved.token;
            }
        } catch (e) { }
    }

    // 2. Return existing promise if request pending
    if (tokenRequestPromise) {
        console.log("[Token-Main] Waiting for pending token request...");
        return tokenRequestPromise;
    }

    // 3. Check if we are currently in Rate Limit cooldown
    const now = Date.now();
    if (now - lastRateLimitTime < 65000) {
        console.log("[Token-Main] Skipping request due to active Rate Limit cooldown...");
        return null;
    }

    // 4. Request New Token
    tokenRequestPromise = (async () => {
        try {
            console.log("[Token-Main] Requesting NEW token from KIS...");
            const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
                grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
            });
            if (!res.data.access_token) throw new Error("KIS response does not contain access_token");
            const newToken = res.data.access_token;
            const newExpiry = new Date(now + (res.data.expires_in - 60) * 1000);
            fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token: newToken, expiry: newExpiry }));
            console.log("[Token-Main] New token saved/refreshed.");
            marketAnalysisReport.lastError = null;
            return newToken;
        } catch (e) {
            const errData = e.response ? e.response.data : null;
            const errDetail = errData ? JSON.stringify(errData) : e.message;
            console.error("[Token-Main] Failed to get token:", errDetail);
            if (fs.existsSync(TOKEN_FILE)) { try { fs.unlinkSync(TOKEN_FILE); } catch (f) { } }
            marketAnalysisReport.lastError = `[Token Error] ${errDetail}`;
            if (e.response?.status === 403) { console.log("[Token-Main] Rate Limit Hit! 65s cooldown..."); lastRateLimitTime = Date.now(); }
            return null;
        } finally { tokenRequestPromise = null; }
    })();
    return tokenRequestPromise;
}

// =====================================================
// [v5.3.1] 듀얼 토큰 엔진: 백그라운드 스캐너 전용 토큰
// 메인 키와 완전히 독립적으로 동작하여 서로 간섭하지 않습니다.
// BG 키가 미설정이면 메인 토큰으로 폴백합니다.
// =====================================================
async function getAccessTokenBG() {
    if (!hasDualEngine) return getAccessToken(); // 폴백: 싱글 모드

    // 1. BG 캐시 파일에서 읽기
    if (fs.existsSync(TOKEN_FILE_BG)) {
        try {
            const saved = JSON.parse(fs.readFileSync(TOKEN_FILE_BG, 'utf8'));
            const expiry = new Date(saved.expiry);
            if (new Date(new Date().getTime() + 10 * 60 * 1000) < expiry) {
                return saved.token;
            }
        } catch (e) { }
    }

    // 2. 중복 요청 방지
    if (tokenRequestPromiseBG) {
        console.log("[Token-BG] Waiting for pending BG token request...");
        return tokenRequestPromiseBG;
    }

    // 3. BG 키 전용 Rate Limit 쿨다운 체크
    const now = Date.now();
    if (now - lastRateLimitTimeBG < 65000) {
        console.log("[Token-BG] BG 키 Rate Limit 쿨다운 중... 메인 키로 폴백");
        return getAccessToken(); // BG 키가 막혔으면 임시로 메인 키 사용
    }

    // 4. BG 전용 토큰 발급
    tokenRequestPromiseBG = (async () => {
        try {
            console.log("[Token-BG] 🔑 Requesting NEW BG token from KIS...");
            const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
                grant_type: 'client_credentials', appkey: APP_KEY_BG, appsecret: APP_SECRET_BG
            });
            if (!res.data.access_token) throw new Error("BG: KIS response does not contain access_token");
            const newToken = res.data.access_token;
            const newExpiry = new Date(now + (res.data.expires_in - 60) * 1000);
            fs.writeFileSync(TOKEN_FILE_BG, JSON.stringify({ token: newToken, expiry: newExpiry }));
            console.log("[Token-BG] 🔑 BG token saved/refreshed.");
            return newToken;
        } catch (e) {
            const errDetail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
            console.error("[Token-BG] Failed to get BG token:", errDetail);
            if (fs.existsSync(TOKEN_FILE_BG)) { try { fs.unlinkSync(TOKEN_FILE_BG); } catch (f) { } }
            if (e.response?.status === 403) { console.log("[Token-BG] BG Rate Limit Hit! 65s cooldown..."); lastRateLimitTimeBG = Date.now(); }
            // BG 키 실패 시 메인 키로 폴백
            console.log("[Token-BG] ⚠️ BG 키 실패, 메인 키로 폴백합니다.");
            return getAccessToken();
        } finally { tokenRequestPromiseBG = null; }
    })();
    return tokenRequestPromiseBG;
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

app.get('/api/debug', async (req, res) => {
    const report = {
        time: new Date().toISOString(),
        env: {
            KIS_BASE_URL: KIS_BASE_URL,
            HAS_KEY: !!APP_KEY,
            HAS_SECRET: !!APP_SECRET,
            KEY_LEN: APP_KEY ? APP_KEY.length : 0,
            SEC_LEN: APP_SECRET ? APP_SECRET.length : 0
        },
        marketAnalysisReport: {
            updateTime: marketAnalysisReport.updateTime,
            status: marketAnalysisReport.status,
            lastError: marketAnalysisReport.lastError,
            dataType: marketAnalysisReport.dataType
        }
    };

    try {
        const tokenRes = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials', appkey: APP_KEY, appsecret: APP_SECRET
        });
        report.tokenTest = "SUCCESS";
    } catch (e) {
        report.tokenTest = "FAILED";
        report.tokenError = e.response ? e.response.data : e.message;
    }

    res.json(report);
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
    const isMarketOpen = (hour >= 8 && hour < 22) && !isWeekend;
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
        // [v5.3.1] 듀얼 토큰 엔진: 백그라운드 스캐너는 BG 전용 토큰을 사용합니다!
        const token = await getAccessTokenBG();
        const bgKey = hasDualEngine ? APP_KEY_BG : APP_KEY;
        const bgSecret = hasDualEngine ? APP_SECRET_BG : APP_SECRET;

        // [v3.6.1] 70개 주요 섹터 종목 코드 미리 생성 (하단 루프 및 재시도 로직에서 사용)
        const sectorStockCodes = new Set(SECTOR_WATCH_STOCKS.map(s => s.code));

        // ========================================================
        // [코다리 부장] 1단계: 광범위 필터 (The Wide Net)
        // 전 시장에서 '수상한 놈들'을 빠르게 후보 리스트에 올립니다.
        // ========================================================
        console.log(`[Radar 1단계] 광범위 필터 가동 - 전 시장 스캔 중...`);

        const candidateMap = new Map();
        const provisionalMap = new Map(); // [v5.2.0] 장중 잠정치 가집계 맵 (Sector Radar 실시간 보정용)
        let wideNetHits = 0;
        const addCandidate = (code, name) => {
            if (code && !candidateMap.has(code)) {
                candidateMap.set(code, { code, name: name || code });
                wideNetHits++;
            }
        };

        // [v3.6.2 우선순위 보정] 핵심 감시 종목 및 섹터 70개 종목은 
        // 800개 상한선에 걸려 누락되지 않도록 가장 먼저 후보에 추가합니다.
        MARKET_WATCH_STOCKS.forEach(s => addCandidate(s.code, s.name));
        SECTOR_WATCH_STOCKS.forEach(s => addCandidate(s.code, s.name));

        // [v4.0.15] 랭킹 API 호출용 헬퍼 함수 (500 에러 시 1회 재시도)
        async function fetchRankingWithRetry(url, params, sourceName) {
            try {
                const res = await axios.get(url, {
                    headers: { authorization: `Bearer ${token}`, appkey: bgKey, appsecret: bgSecret, tr_id: params.tr_id, custtype: 'P' },
                    params: params.fields
                });
                return res.data.output || [];
            } catch (e) {
                if (e.response && e.response.status === 500) {
                    console.warn(`[Radar] ${sourceName} 500 에러 - 10초 후 1회 재시도...`);
                    await new Promise(r => setTimeout(r, 10000));
                    try {
                        const res2 = await axios.get(url, {
                            headers: { authorization: `Bearer ${token}`, appkey: bgKey, appsecret: bgSecret, tr_id: params.tr_id, custtype: 'P' },
                            params: params.fields
                        });
                        return res2.data.output || [];
                    } catch (e2) {
                        console.warn(`[Radar] ${sourceName} 재시도 실패:`, e2.message);
                        return [];
                    }
                }
                console.warn(`[Radar] ${sourceName} 실패:`, e.message);
                return [];
            }
        }

        // Source 1: 외인/기관 순매수 랭킹
        const s1Output = await fetchRankingWithRetry(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
            tr_id: 'FHPTJ04400000',
            fields: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
        }, 'Source 1');
        s1Output.forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        await new Promise(r => setTimeout(r, 500));

        // Source 2: 코스피 거래량 순위
        const s2Output = await fetchRankingWithRetry(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`, {
            tr_id: 'FHPST01710000',
            fields: {
                FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '0001',
                FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000',
                FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: ''
            }
        }, 'Source 2');
        s2Output.forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        await new Promise(r => setTimeout(r, 500));

        // Source 3: 코스닥 거래량 순위
        const s3Output = await fetchRankingWithRetry(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`, {
            tr_id: 'FHPST01710000',
            fields: {
                FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '1001',
                FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000',
                FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: ''
            }
        }, 'Source 3');
        s3Output.forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        await new Promise(r => setTimeout(r, 500));

        // [v5.2.0] 장중 수급 레이더용 가집계 데이터 확보 (외인/기관/합계 랭킹 4종 활용)
        // 개별 종목 잠정치 API가 불안정하므로, 시장 전체 스냅샷을 먼저 떠서 매핑합니다.
        const snapshotSorts = [
            { id: '0', name: '외인순매수' }, { id: '1', name: '외인순매도' },
            { id: '4', name: '합계순매수' }, { id: '5', name: '합계순매도' }
        ];

        console.log(`[Radar 1단계] 장중 가집계 스냅샷 확보 중...`);
        for (const sort of snapshotSorts) {
            const out = await fetchRankingWithRetry(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                tr_id: 'FHPTJ04400000',
                fields: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: sort.id, FID_ETC_CLS_CODE: '0' }
            }, `Source-Prov-${sort.name}`);

            out.forEach(c => {
                if (c.mksc_shrn_iscd) {
                    // 가집계 데이터 맵에 기록 (이미 있으면 덮어쓰지 않음 - 우선순위 유지)
                    if (!provisionalMap.has(c.mksc_shrn_iscd)) {
                        provisionalMap.set(c.mksc_shrn_iscd, c);
                    }
                    addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm);
                }
            });
            await new Promise(r => setTimeout(r, 200));
        }

        // [v4.0.15] 엑기스 집중 모드: 전종목 배치 스캔(Source 5) 제거
        // 500 에러의 주원인이었던 2,800개 전종목 무작위 스캔을 생략하고, 검증된 랭킹 종목 위주로 분석합니다.
        console.log(`[Radar 1단계] 엑기스 집중모드 가동: 핵심 후보군과 사용자 관심 종목 위주로 분석 리스트를 구성합니다. (v4.0.15)`);

        // 사용자 관심 종목도 무조건 포함! (푸시 알림 정확도를 위해)
        pushTokens.forEach(entry => {
            (entry.stocks || []).forEach(s => addCandidate(s.code, s.name));
        });

        // [v4.0.16] 스냅샷 자동 포함: sync로 저장된 사용자 관심종목도 스캔 대상에 자동 포함!
        // 이렇게 하면 다음 15분 주기부터 해당 종목이 스냅샷에 포함되어,
        // 앱에서 추가 API 호출 없이 즉시(0초) 데이터를 표시할 수 있습니다.
        let userStockCount = 0;
        Object.values(userStore).forEach(user => {
            (user.stocks || []).forEach(s => {
                if (s.code && !candidateMap.has(s.code)) {
                    addCandidate(s.code, s.name);
                    userStockCount++;
                }
            });
        });
        if (userStockCount > 0) {
            console.log(`[Radar] 사용자 관심종목 ${userStockCount}개 추가 포함 (스냅샷 자동 포함)`);
        }

        const totalCandidates = candidateMap.size;
        console.log(`[Radar] ===== 1단계 완료: 총 ${totalCandidates}개 후보 확보! =====`);        // ========================================================
        // [코다리 부장] 2단계: 정밀 수급 분석 (The Deep Scan)
        // ========================================================
        console.log(`[Radar 2단계] 정밀 수급 분석 시작...`);

        const candidates = Array.from(candidateMap.values());
        const historyData = new Map();
        let hits = 0;

        // 모든 후보를 정밀 Deep Scan (종목당 150ms 간격으로 순차 진행)
        // [v4.0.15] 엑기스 집중 모드: 최대 600개 후보만 정밀 분석 (실제로는 약 200~400개 예상)
        const fullList = candidates.slice(0, 600);
        console.log(`[Radar 2단계] "엑기스 집중 모드" 정밀 분석 시작 (대상: ${fullList.length}개, v4.0.15)`);

        for (let i = 0; i < fullList.length; i++) {
            const stk = fullList[i];

            // [v4.0.15] 600ms 간격으로 더 천천히 진행 (유량 제한 및 500 에러 방지)
            await new Promise(r => setTimeout(r, 600));

            // [v4.0.15] 안전 장치: 30개 종목마다 3초간 휴식 (Cool-down)
            if (i > 0 && i % 30 === 0) {
                console.log(`[Radar] KIS 서버 과부하 방지: 3초간 휴식 중... (${i}/${fullList.length})`);
                await new Promise(r => setTimeout(r, 3000));
            }

            let retryCount = 0;
            const maxRetries = 2; // 총 3회 시도
            let success = false;

            while (retryCount <= maxRetries && !success) {
                try {
                    const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                        headers: { authorization: `Bearer ${token}`, appkey: bgKey, appsecret: bgSecret, tr_id: 'FHKST01010900', custtype: 'P' },
                        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' }
                    });
                    const daily = invRes.data.output || [];

                    // 장중 잠정치 보정 로직
                    if (isMarketOpen && daily.length > 0) {
                        const d0 = daily[0];
                        const fVal = parseInt(d0.frgn_ntby_qty || 0);
                        const oVal = parseInt(d0.orgn_ntby_qty || 0);

                        if ((isNaN(fVal) || fVal === 0) && (isNaN(oVal) || oVal === 0)) {
                            // [v5.2.0] 실패하던 개별 종목 잠정치 API(FHKST01012100) 대신, 
                            // 1단계에서 확보한 가집계 스냅샷(Snapshot)에서 데이터를 보정합니다.
                            const prov = provisionalMap.get(stk.code);
                            if (prov) {
                                d0.frgn_ntby_qty = String(prov.frgn_ntby_qty || '0');
                                d0.orgn_ntby_qty = String(prov.orgn_ntby_qty || '0');
                            }
                        }
                    }

                    if (daily.length > 0) {
                        hits++;
                        historyData.set(stk.code, {
                            name: stk.name,
                            price: daily[0].stck_clpr,
                            rate: daily[0].prdy_ctrt,
                            daily
                        });
                    }
                    success = true;
                } catch (e) {
                    const status = e.response ? e.response.status : 0;
                    if (status === 500) {
                        retryCount++;
                        console.error(`[Deep Scan 500 에러] ${stk.name}(${stk.code}): 10초 대기 후 재시도 (${retryCount}/${maxRetries})`);
                        await new Promise(r => setTimeout(r, 10000));
                    } else {
                        console.error(`[Deep Scan Error] ${stk.name} (${stk.code}): ${e.message}`);
                        break; // 500 에러 아니면 바로 중단(다음 종목으로)
                    }
                }
            }

            if (i % 20 === 0 && i > 0) {
                console.log(`[Radar 2단계] 진행 중: ${i}/${fullList.length} (성공:${hits})`);
                // [v4.2.1] 중간 진행 상황은 _scanProgress에 저장하여, 완성된 scanStats를 덮어쓰지 않음
                // → 앱이 스캔 도중 스냅샷을 읽어도 이전 완료된 수급 포착 수를 유지!
                marketAnalysisReport._scanProgress = {
                    totalScanned: candidateMap.size,
                    deepScanned: i,
                    successHits: hits
                };
                // [v4.1.0] 진행 상황을 즉시 파일에 써서 모바일 앱이 '서버확인중...' 상태에서 진행률을 보게 함
                fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(marketAnalysisReport));
            }
        }

        console.log(`[Radar 2단계] Deep Scan 완료! 성공: ${hits}개 / 대상: ${fullList.length}개`);

        if (hits === 0) {
            const errorMsg = "데이터를 가져오지 못했습니다. KIS API 응답이나 토큰을 확인하세요.";
            console.log(`[Radar] ${errorMsg}`);
            marketAnalysisReport.lastError = errorMsg;
            marketAnalysisReport.status = 'READY';
            fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(marketAnalysisReport));
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
        // 개별 분석된 데이터에서 거래대금(억원) 기준으로 시장과 섹터 흐름 역산
        const instTotals = { pnsn: 0, ivtg: 0, ins: 0, foreign: 0, institution: 0 };

        historyData.forEach((val, code) => {
            const d = val.daily[0] || {};

            // [v4.0.17] KIS API 404 에러 방지 - 개별 주식의 거래량과 가격을 곱하여 '억원' 단위 매수 금액 추산
            const currentPrice = parseInt(String(val.price || '0').replace(/,/g, '')) || 0;
            const amtRatio = currentPrice / 100000000;

            const fQty = parseInt(String(d.frgn_ntby_qty || 0).replace(/,/g, '')) || 0;
            const oQty = parseInt(String(d.orgn_ntby_qty || 0).replace(/,/g, '')) || 0;
            const pnsnQty = parseInt(String(d.pnsn_ntby_qty || 0).replace(/,/g, '')) || 0;
            const ivtgQty = parseInt(String(d.ivtg_ntby_qty || 0).replace(/,/g, '')) || 0;
            const insQty = parseInt(String(d.ins_ntby_qty || 0).replace(/,/g, '')) || 0;

            instTotals.foreign += Math.round(fQty * amtRatio);
            instTotals.institution += Math.round(oQty * amtRatio);
            instTotals.pnsn += Math.round(pnsnQty * amtRatio);
            instTotals.ivtg += Math.round(ivtgQty * amtRatio);
            instTotals.ins += Math.round(insQty * amtRatio);

            // [v4.1.0] 섹터 자금 흐름 추적 대상 확대 (MARKET_WATCH + SECTOR_WATCH)
            const allMappedStocks = [...MARKET_WATCH_STOCKS, ...SECTOR_WATCH_STOCKS];
            const mwc = allMappedStocks.find(s => s.code === code);
            if (mwc && mwc.sector) {
                sectorMap[mwc.sector] = (sectorMap[mwc.sector] || 0) + Math.round((fQty + oQty) * amtRatio);
            }
            // [v3.6.3] 외부 API 제거됨. 시장 전체 합계 대신 관심종목 위주의 의미있는 자금 합산 수행.

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

                // [v4.0.12] KIS API는 장 시작 전 오늘 데이터를 0으로 미리 주는 경우가 많습니다.
                // 0인 날은 무시하고, 실제 거래가 있었던 가장 최근일부터 연속성을 체크하여 장전에도 어제까지의 streak을 보여줍니다.
                let startIdx = 0;
                while (startIdx < daily.length && getNet(daily[startIdx]) === 0) {
                    startIdx++;
                }

                if (startIdx >= daily.length) return 0;

                const firstNet = getNet(daily[startIdx]);
                const isBuy = firstNet > 0;
                let count = 0;
                for (let j = startIdx; j < daily.length; j++) {
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

            // [v4.1.0] 모든 포착 종목에 섹터 정보를 부여하여 모바일 앱 UI에서 섹터별로 정확히 분류되게 함
            const currentMapped = [...MARKET_WATCH_STOCKS, ...SECTOR_WATCH_STOCKS].find(s => s.code === code);
            const stockSector = currentMapped ? currentMapped.sector : '기타';

            // [v4.1.9] 매집 의심 종목(Hidden Accumulation) 계산 로직: 가격 변동성이 죽고 횡보하는 '정적' 구간 포착
            const isQuietPattern = (daily) => {
                if (!daily || daily.length < 5) return false;
                let totalRange = 0;
                for (let j = 0; j < 5; j++) {
                    const close = parseInt(String(daily[j].stck_clpr || '1').replace(/,/g, ''));
                    const high = parseInt(String(daily[j].stck_hgpr || daily[j].stck_clpr || '1').replace(/,/g, ''));
                    const low = parseInt(String(daily[j].stck_lwpr || daily[j].stck_clpr || '1').replace(/,/g, ''));
                    totalRange += ((high - low) / close) * 100;
                }
                const avgRange = totalRange / 5;
                const currentPrice = parseInt(String(daily[0].stck_clpr || '0').replace(/,/g, '')) || 0;
                const fiveDayAgo = parseInt(String(daily[4].stck_clpr || '0').replace(/,/g, '')) || 0;
                const fiveDayChange = fiveDayAgo > 0 ? ((currentPrice - fiveDayAgo) / fiveDayAgo) * 100 : 0;
                const rate = parseFloat(daily[0].prdy_ctrt || 0);

                // 아주 좁은 박스권(3%) 이내에서 변동성(2.5%)이 죽어있는 상태
                return avgRange < 2.5 && Math.abs(rate) < 3.0 && Math.abs(fiveDayChange) < 3.0;
            };

            const isQuiet = isQuietPattern(val.daily);
            const isAccum = isQuiet && (indFStreak >= 2 || indIStreak >= 2);

            investors.forEach(inv => {
                const streakCount = calcIndependentStreak(val.daily, inv);

                if (streakCount >= 2) {
                    newBuyData[`5_${inv}`].push({
                        name: val.name, code, price: val.price, rate: val.rate,
                        streak: streakCount, fStreak: indFStreak, iStreak: indIStreak,
                        sector: stockSector, // 섹터 정보 추가
                        isHiddenAccumulation: isAccum // 매집 여부 추가
                    });
                } else if (streakCount <= -2) {
                    newSellData[`5_${inv}`].push({
                        name: val.name, code, price: val.price, rate: val.rate,
                        streak: Math.abs(streakCount), fStreak: indFStreak, iStreak: indIStreak,
                        sector: stockSector, // 섹터 정보 추가
                        isHiddenAccumulation: false
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
                    fStreak: fSt, iStreak: iSt,
                    sector: stockSector,
                    isHiddenAccumulation: isAccum
                });
            }

            // [v4.2.2] 세력 평단가(VWAP) 계산 (최근 5일 기준)
            const calcVWAP = (data, days = 5) => {
                if (!data || data.length === 0) return 0;
                let totalValue = 0, totalVol = 0;
                const limit = Math.min(data.length, days);
                for (let j = 0; j < limit; j++) {
                    const v = parseInt(String(data[j].acml_vol || 0).replace(/,/g, ''));
                    const p = parseInt(String(data[j].stck_clpr || 0).replace(/,/g, ''));
                    if (v > 0 && p > 0) {
                        totalValue += (v * p);
                        totalVol += v;
                    }
                }
                return totalVol > 0 ? Math.round(totalValue / totalVol) : 0;
            };

            // [v4.3.2] 배경 스캔이 돌아도 이전 클릭으로 확보된 OHLCV(시고저+거래량)를 보존합니다.
            // 수급 전용 API(FHKST01010900)는 시가/고가/저가/거래량을 주지 않으므로,
            // 이전에 차트 클릭으로 받아두었던 값이 있다면 그것을 합쳐서 캐시를 갱신합니다.
            const prevCached = marketAnalysisReport.allAnalysis ? marketAnalysisReport.allAnalysis[code] : null;
            const rawHistory = val.daily.slice(0, 30);
            const mergedHistory = rawHistory.map((invItem) => {
                if (prevCached && prevCached.history && prevCached.history.length > 0) {
                    const prevItem = prevCached.history.find(p => p.stck_bsop_date === invItem.stck_bsop_date);
                    if (prevItem && prevItem.stck_oprc && parseInt(prevItem.stck_oprc) > 0) {
                        return {
                            ...invItem,
                            stck_oprc: prevItem.stck_oprc,
                            stck_hgpr: prevItem.stck_hgpr,
                            stck_lwpr: prevItem.stck_lwpr,
                            acml_vol: prevItem.acml_vol || invItem.acml_vol || '0'
                        };
                    }
                }
                return invItem;
            });

            // 거래량이 보존된 데이터로 VWAP 재계산 (더 정확한 세력 평단가)
            const mergedVwap = calcVWAP(mergedHistory, 5) || calcVWAP(rawHistory, 5);

            // [v3.6.2] 모든 분석 종목 요약 정보를 맵에 저장 (관심종목용)
            const allFSt = calcIndependentStreak(val.daily.slice(0, 31), '2');
            const allISt = calcIndependentStreak(val.daily.slice(0, 31), '1');

            newAllAnalysis[code] = {
                name: val.name,
                price: val.price,
                rate: val.rate,
                fStreak: allFSt,
                iStreak: allISt,
                sentiment: 50 + (allFSt + allISt) * 5,
                isHiddenAccumulation: isAccum,
                vwap: mergedVwap, // [v4.3.2] 보존된 거래량으로 재계산된 VWAP
                history: mergedHistory // [v4.3.2] OHLCV 보존된 히스토리
            };
        });

        const SECTOR_ORDER = [
            '반도체', '이차전지', '바이오 및 헬스케어', '자동차 및 전자부품', '로봇 및 에너지', '엔터 및 플랫폼'
        ];
        const sectorList = Object.entries(sectorMap).map(([name, flow]) => ({ name, flow }));
        // [v3.8.0] 섹터별 자금 흐름을 금액(절대값)이 큰 순서대로 정렬하여 시장 활성도를 우선적으로 보여줌
        sectorList.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));

        marketAnalysisReport.sectors = sectorList.slice(0, 6);

        investors.forEach(inv => {
            newBuyData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
            newSellData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
        });

        // [코다리 부장 터치] 밤 늦게 데이터가 0으로 들어와도, 낮의 뜨거웠던 자금 흐름 데이터를 삭제하지 않고 보존합니다!
        const buyCount = Object.values(newBuyData).reduce((acc, l) => acc + l.length, 0);
        const sellCount = Object.values(newSellData).reduce((acc, l) => acc + l.length, 0);
        console.log(`[Radar 3단계] 분석 완료! 매수:${buyCount}건, 매도:${sellCount}건, 전체:${Object.keys(newAllAnalysis).length}건`);

        // [v4.0.14] 주말이나 장 종료 후 분석 결과가 0건일 경우, 기존의 '유의미한' 스냅샷 데이터를 보존합니다.
        // 이를 통해 앱을 켰을 때 연속매매 종목이 사라지는 현상을 방지합니다.
        const isCurrentlyEmpty = buyCount === 0 && sellCount === 0;
        const hasExistingData = marketAnalysisReport.buyData && Object.values(marketAnalysisReport.buyData).some(l => l && l.length > 0);

        // [v4.1.0] 시장 전체 수급(instFlow)과 섹터 정보는 종목 포착 여부와 상관없이 '항상' 최신으로 유지합니다.
        marketAnalysisReport.instFlow = instTotals;
        marketAnalysisReport.sectors = sectorList.slice(0, 6);

        if (!isCurrentlyEmpty || !hasExistingData) {
            marketAnalysisReport.buyData = newBuyData;
            marketAnalysisReport.sellData = newSellData;
            marketAnalysisReport.allAnalysis = newAllAnalysis; // [v3.6.2] 대규모 맵 저장
            console.log(`[Radar] 스냅샷 데이터 업데이트 완료 (매수:${buyCount}건, 매도:${sellCount}건)`);
        } else {
            console.log(`[Radar] 현재 주말/휴장 등으로 분석 결과가 0건이므로 기존 유의미한 데이터를 보존합니다.`);
        }
        marketAnalysisReport.updateTime = new Date().toISOString();
        marketAnalysisReport.dataType = currentType;
        marketAnalysisReport.status = 'READY';
        marketAnalysisReport.scanStats = {
            totalScanned: totalCandidates,
            deepScanned: fullList.length,
            successHits: hits,
            wideNetAdded: wideNetHits,
            // [v4.2.1] 앱 UI에서 매수/매도 밸런스 바를 위해 추가
            buyHits: buyCount,
            sellHits: sellCount
        };
        // [v4.2.1] 스캔 진행 중 임시 데이터 제거
        delete marketAnalysisReport._scanProgress;
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
                // [v5.3.1] 관심종목이 없어도 시장감시 목록(MARKET_WATCH_STOCKS)으로 알림 수신 가능
                const scanStocks = userStocks.length > 0 ? userStocks : MARKET_WATCH_STOCKS;

                const userSettings = tokenEntry.settings || { buyStreak: 3, sellStreak: 3, accumStreak: 3 };
                const tokenDailyHistory = pushHistory[tokenEntry.token][todayStr];

                const userAlerts = [];
                let highestPriority = 4; // 1: 이탈, 2: 쌍끌이, 3: 변곡, 4: 매집
                let pushTitle = '📊 Money Fact 알림';

                for (const us of scanStocks) {
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
                            userAlerts.push({ msg, stockCode: us.code, stockName: us.name, type: patternKey });
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

                    // [v5.3.1] 첫 번째 알림의 종목 정보를 data에 포함 (알림 보관함에서 종목명/코드 표시용)
                    const firstAlert = userAlerts[0];

                    // Limit to 3 messages per push so it doesn't get cut off entirely
                    const limitedAlerts = userAlerts.slice(0, 3).map(a => a.msg);
                    if (userAlerts.length > 3) limitedAlerts.push(`...외 ${userAlerts.length - 3}건`);

                    pushMessages.push({
                        to: tokenEntry.token,
                        title: pushTitle,
                        body: limitedAlerts.join('\n'),
                        sound: 'default',
                        priority: 'high',
                        data: {
                            type: firstAlert.type || 'pattern_alert',
                            stockCode: firstAlert.stockCode || '',
                            stockName: firstAlert.stockName || ''
                        }
                    });

                    // [v5.3.1] 각 알림별로 아카이브에 개별 저장 (종목별 추적 가능하게)
                    userAlerts.forEach(alert => {
                        if (!notificationArchive[tokenEntry.token]) notificationArchive[tokenEntry.token] = [];
                        const notifId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                        notificationArchive[tokenEntry.token].unshift({
                            id: notifId,
                            timestamp: Date.now(),
                            title: pushTitle,
                            body: alert.msg,
                            type: alert.type || 'pattern_alert',
                            stockCode: alert.stockCode || '',
                            stockName: alert.stockName || '',
                        });
                        if (notificationArchive[tokenEntry.token].length > 100) {
                            notificationArchive[tokenEntry.token] = notificationArchive[tokenEntry.token].slice(0, 100);
                        }
                    });
                }
            } // End user tokens loop

            if (pushMessages.length > 0) {
                await sendPushNotifications(pushMessages);
                savePushHistory();

                // [v5.3.1] 알림 아카이브는 이미 개별 알림별로 위에서 저장됨 (종목별 추적 가능)
                saveNotificationArchive();
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

// [v5.3.0] 특정 토큰에 대한 알림 아카이브 조회 API
app.get('/api/notifications/:token', (req, res) => {
    const { token } = req.params;
    const messages = notificationArchive[token] || [];
    res.json({ messages });
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

app.get('/api/snapshot', (req, res) => {
    res.json(marketAnalysisReport);
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

// [v4.3.0] 모바일 앱의 모든 종목 데이터 요청을 서버가 중앙 관리합니다.
// 캐시 우선 조회 → 캐시 없을 때만 KIS API 호출 (속도 제한기 적용)
app.get('/api/stock-daily/:code', async (req, res) => {
    const code = req.params.code;
    const needChart = req.query.chart === 'true';
    if (!code) return res.status(400).json({ error: 'Missing stock code' });

    try {
        const cached = marketAnalysisReport.allAnalysis ? marketAnalysisReport.allAnalysis[code] : null;
        let cachedDataOk = false;
        let cacheAge = Infinity;

        // [v4.3.1] 1단계: 서버 캐시(allAnalysis) 우선 확인
        if (cached && cached.history && cached.history.length > 0) {
            cacheAge = marketAnalysisReport.updateTime ? Date.now() - new Date(marketAnalysisReport.updateTime).getTime() : Infinity;
            const now = new Date();
            const isMarketClosed = (now.getDay() === 0 || now.getDay() === 6 || now.getHours() < 8 || now.getHours() >= 16);

            // 캐시가 유효한지 확인
            if (cacheAge < 20 * 60 * 1000 || isMarketClosed) {
                cachedDataOk = true;
                // [v4.3.2] 차트 요청 시 OHLCV(시고저가)와 acml_vol(거래량) 모두 있어야 유효한 캐시로 인정
                // - stck_oprc 없으면 캔들 차트가 점(Dot)으로 보임
                // - acml_vol 없으면 세력 평단가(VWAP)가 0이 되어 '서버 스캔 진행 중...' 표시됨
                if (needChart) {
                    const h0 = cached.history[0];
                    const hasOHLC = h0.stck_oprc && parseInt(h0.stck_oprc) > 0;
                    const hasVol = h0.acml_vol && parseInt(String(h0.acml_vol).replace(/,/g, '')) > 0;
                    if (!hasOHLC || !hasVol) cachedDataOk = false;
                }
            }
        }

        // 캐시 조건 충족 시 KIS 호출 0건으로 즉시 반환!
        if (cachedDataOk) {
            console.log(`[Server] ⚡ Cache hit for ${code} (age: ${Math.round(cacheAge / 1000)}s) [chart:${needChart}]`);
            return res.json({ daily: cached.history, cached: true });
        }

        // [v4.3.1] 2단계: 캐시 미스 → 속도 제한기 통과 후 KIS API 필요부분만 호출
        await kisRateLimiter.waitForToken();
        const token = await getAccessToken();

        // 날짜 범위 설정 (차트용: 최근 2개월)
        const d = new Date();
        const endDate = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
        d.setMonth(d.getMonth() - 2);
        const startDate = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');

        const promises = [];
        let investorData = [];

        // 1. 투자자 동향 (FHKST01010900) - 만약 최근 캐시가 있다면 최대한 재사용해서 KIS 호출 절약
        if (cached && cached.history && cached.history.length > 0 && cacheAge < 20 * 60 * 1000) {
            investorData = cached.history;
        } else {
            promises.push(
                axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                    headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code }
                }).then(r => r.data.output || []).catch(() => [])
            );
        }

        // 2. 가격 데이터 (FHKST03010100) - 차트를 그려야 할 때만 KIS API에 OHLCV 요청!
        let priceData = [];
        if (needChart) {
            promises.push(
                axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`, {
                    headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST03010100', custtype: 'P' },
                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code, FID_INPUT_DATE_1: startDate, FID_INPUT_DATE_2: endDate, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' }
                }).then(r => r.data.output2 || []).catch(() => [])
            );
        }

        // 비동기 통신 동시 진행 (최대 2개 혹은 1개)
        const resArr = await Promise.all(promises);
        let ptr = 0;
        if (investorData.length === 0) investorData = resArr[ptr++];
        if (needChart) priceData = resArr[ptr++];

        // 오류/주말/야간 빈 응답 시 처리
        if (investorData.length === 0) {
            if (cached && cached.history && cached.history.length > 0) {
                console.log(`[Server] KIS empty, returning cached history for ${code}`);
                return res.json({ daily: cached.history, cached: true });
            }
            return res.json({ daily: [] });
        }

        // 3. 투자자 데이터에 차트용 가격 데이터 병합
        const merged = investorData.map((invItem, index) => {
            let pItem = null;
            if (needChart && priceData.length > 0) {
                pItem = priceData.find(p => p.stck_bsop_date === invItem.stck_bsop_date) || priceData[index] || priceData[0];
            } else if (needChart && cached && cached.history && cached.history.length > 0) {
                // [v4.3.2] 차트 데이터 호출 실패(500 등) 시 기존 캐시에서 OHLCV 데이터를 살려냅니다.
                pItem = cached.history.find(p => p.stck_bsop_date === invItem.stck_bsop_date && p.stck_oprc);
            }

            if (pItem && pItem.stck_oprc) {
                return {
                    ...invItem,
                    stck_clpr: pItem.stck_clpr || invItem.stck_clpr,
                    stck_oprc: pItem.stck_oprc,
                    stck_hgpr: pItem.stck_hgpr,
                    stck_lwpr: pItem.stck_lwpr,
                    acml_vol: pItem.acml_vol || '0'
                };
            }
            return invItem;
        });

        // 4. 차트 데이터를 가져온 김에 서버 캐시에 덮어씌움 -> 다음부턴 캐시 히트 달성!
        if (needChart && merged.some(m => m.stck_oprc)) {
            if (!marketAnalysisReport.allAnalysis) marketAnalysisReport.allAnalysis = {};
            if (!marketAnalysisReport.allAnalysis[code]) marketAnalysisReport.allAnalysis[code] = {};
            marketAnalysisReport.allAnalysis[code].history = merged;
        }

        console.log(`[Server] 🌐 API fetched for ${code} (${merged.length} days) [chart:${needChart}]`);
        res.json({ daily: merged });
    } catch (error) {
        console.error(`[Server] Daily fetch error for ${code}:`, error.message);
        // 에러 발생 시에도 캐시 확인
        const cached = marketAnalysisReport.allAnalysis ? marketAnalysisReport.allAnalysis[code] : null;
        if (cached && cached.history && cached.history.length > 0) {
            return res.json({ daily: cached.history, cached: true });
        }
        res.status(500).json({ error: 'Failed to fetch daily data', daily: [] });
    }
});

// [v4.3.0] 실시간 현재가 프록시 API (캐시 우선 + 속도 제한)
app.get('/api/stock-price/:code', async (req, res) => {
    const code = req.params.code;
    if (!code) return res.status(400).json({ error: 'Missing stock code' });

    try {
        // 1단계: allAnalysis 캐시에서 최근 종가 확인
        const cached = marketAnalysisReport.allAnalysis ? marketAnalysisReport.allAnalysis[code] : null;
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const isMarketClosed = (day === 0 || day === 6 || hour < 9 || hour >= 16);

        // 장 마감 시에는 캐시 종가를 바로 반환
        if (isMarketClosed && cached && cached.history && cached.history.length > 0) {
            const latestDay = cached.history[0];
            return res.json({
                stck_prpr: latestDay.stck_clpr,
                hts_kor_isnm: cached.name || code,
                prdy_ctrt: latestDay.prdy_ctrt || '0',
                cached: true
            });
        }

        // 2단계: 장중에는 KIS API로 실시간 조회 (속도 제한 적용)
        await kisRateLimiter.waitForToken();
        const token = await getAccessToken();
        const priceRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
            headers: {
                authorization: `Bearer ${token}`,
                appkey: APP_KEY,
                appsecret: APP_SECRET,
                tr_id: 'FHKST01010100',
                custtype: 'P'
            },
            params: {
                FID_COND_MRKT_DIV_CODE: 'J',
                FID_INPUT_ISCD: code
            }
        });

        const output = priceRes.data && priceRes.data.output ? priceRes.data.output : null;
        if (output) {
            return res.json(output);
        }

        // KIS 응답이 없으면 캐시 반환
        if (cached && cached.history && cached.history.length > 0) {
            return res.json({
                stck_prpr: cached.history[0].stck_clpr,
                hts_kor_isnm: cached.name || code,
                cached: true
            });
        }
        res.json({ stck_prpr: '0' });
    } catch (error) {
        console.error(`[Server] Price fetch error for ${code}:`, error.message);
        const cached = marketAnalysisReport.allAnalysis ? marketAnalysisReport.allAnalysis[code] : null;
        if (cached && cached.history && cached.history.length > 0) {
            return res.json({
                stck_prpr: cached.history[0].stck_clpr,
                hts_kor_isnm: cached.name || code,
                cached: true
            });
        }
        res.json({ stck_prpr: '0' });
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
