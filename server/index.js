const express = require('express');
const axios = require('axios');
axios.defaults.timeout = 5000; // 5ì´??€?„ì•„??ì¶”ê?: KIS API ë¬´í•œ?€ê¸?ë°©ì?
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
let APP_KEY = process.env.KIS_APP_KEY || 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
let APP_SECRET = process.env.KIS_APP_SECRET || 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

// [v3.9.9] ?¼ì¼ ? í° ë°œê¸‰ ?œë„ ì´ˆê³¼(EGW00103) ??êµì²´???¬ë²Œ ??(ëª¨ë°”?¼ì•± ê¸°ë³¸ ??ê¸°ì? ê³ ì •)
const FALLBACK_APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const FALLBACK_APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';

const MARKET_WATCH_STOCKS = [
    { name: '?¼ì„±?„ì', code: '005930', sector: 'ë°˜ë„ì²? }, { name: 'SK?˜ì´?‰ìŠ¤', code: '000660', sector: 'ë°˜ë„ì²? },
    { name: 'HPSP', code: '403870', sector: 'ë°˜ë„ì²? }, { name: '?œë?ë°˜ë„ì²?, code: '042700', sector: 'ë°˜ë„ì²? },
    { name: 'LG?ë„ˆì§€?”ë£¨??, code: '373220', sector: '?´ì°¨?„ì?' }, { name: 'POSCO?€?©ìŠ¤', code: '005490', sector: '?´ì°¨?„ì?' },
    { name: '?¼ì„±ë°”ì´?¤ë¡œì§ìŠ¤', code: '207940', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? }, { name: '?€?¸ë¦¬??, code: '068270', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? },
    { name: '?„ë?ì°?, code: '005380', sector: '?ë™ì°?ë°??„ìë¶€?? }, { name: 'ê¸°ì•„', code: '000270', sector: '?ë™ì°?ë°??„ìë¶€?? },
    { name: 'KBê¸ˆìœµ', code: '105560', sector: 'ê¸°í?(ê¸ˆìœµ)' }, { name: '? í•œì§€ì£?, code: '055550', sector: 'ê¸°í?(ê¸ˆìœµ)' },
    { name: 'NAVER', code: '035420', sector: '?”í„° ë°??Œë«?? }, { name: 'ì¹´ì¹´??, code: '035720', sector: '?”í„° ë°??Œë«?? },
    { name: '?ˆì¸ë³´ìš°ë¡œë³´?±ìŠ¤', code: '277810', sector: 'ë¡œë´‡ ë°??ë„ˆì§€' }
];

const SECTOR_WATCH_STOCKS = [
    // ?ë™ì°?ë°??„ìë¶€??
    { name: '?„ë?ì°?, code: '005380', sector: '?ë™ì°?ë°??„ìë¶€?? }, { name: '?„ë?ì°¨ìš°', code: '005385', sector: '?ë™ì°?ë°??„ìë¶€?? },
    { name: '?„ë?ëª¨ë¹„??, code: '012330', sector: '?ë™ì°?ë°??„ìë¶€?? }, { name: 'ê¸°ì•„', code: '000270', sector: '?ë™ì°?ë°??„ìë¶€?? },
    { name: '?¼ì„±?„ê¸°', code: '009150', sector: '?ë™ì°?ë°??„ìë¶€?? }, { name: '?¼ì„±?„ê¸°??, code: '009155', sector: '?ë™ì°?ë°??„ìë¶€?? },
    // ?´ì°¨?„ì?
    { name: '?¼ì„±SDI', code: '006400', sector: '?´ì°¨?„ì?' }, { name: 'LG?ë„ˆì§€?”ë£¨??, code: '373220', sector: '?´ì°¨?„ì?' },
    { name: 'LG?”í•™', code: '051910', sector: '?´ì°¨?„ì?' }, { name: 'POSCO?€?©ìŠ¤', code: '005490', sector: '?´ì°¨?„ì?' },
    { name: '?ì½”?„ë¡œ', code: '086520', sector: '?´ì°¨?„ì?' }, { name: '?ì½”?„ë¡œë¹„ì— ', code: '247540', sector: '?´ì°¨?„ì?' },
    { name: '?˜ì•¤?í”„', code: '066970', sector: '?´ì°¨?„ì?' }, { name: '?¬ìŠ¤ì½”í“¨ì²˜ì— ', code: '003670', sector: '?´ì°¨?„ì?' },
    { name: '?˜ë…¸? ì†Œ??, code: '121600', sector: '?´ì°¨?„ì?' }, { name: '?ì½”?„ë¡œë¨¸í‹°', code: '450080', sector: '?´ì°¨?„ì?' },
    { name: '?ì‹ ?´ë””??, code: '091580', sector: '?´ì°¨?„ì?' }, { name: 'ì½”ìŠ¤ëª¨í™”??, code: '005420', sector: '?´ì°¨?„ì?' },
    // ?”í„° ë°??Œë«??
    { name: '?˜ì´ë¸?, code: '352820', sector: '?”í„° ë°??Œë«?? }, { name: '?€?´ì??”í„°?Œì¸ë¨¼íŠ¸', code: '122870', sector: '?”í„° ë°??Œë«?? },
    { name: 'JYP Ent.', code: '035900', sector: '?”í„° ë°??Œë«?? }, { name: '?ìŠ¤??SM)', code: '041510', sector: '?”í„° ë°??Œë«?? },
    { name: 'TCC?¤í‹¸', code: '002710', sector: '?”í„° ë°??Œë«?? }, { name: '?”ì–´??, code: '376300', sector: '?”í„° ë°??Œë«?? },
    { name: 'ì¹´ì¹´??, code: '035720', sector: '?”í„° ë°??Œë«?? }, { name: 'NAVER', code: '035420', sector: '?”í„° ë°??Œë«?? },
    // ë¡œë´‡ ë°??ë„ˆì§€
    { name: '?ˆì¸ë³´ìš°ë¡œë³´?±ìŠ¤', code: '277810', sector: 'ë¡œë´‡ ë°??ë„ˆì§€' }, { name: '?°ë¡œë³´í‹±??, code: '117730', sector: 'ë¡œë´‡ ë°??ë„ˆì§€' },
    { name: '?¨ë©”??, code: '475400', sector: 'ë¡œë´‡ ë°??ë„ˆì§€' }, { name: '?´ë¡œë´?, code: '466100', sector: 'ë¡œë´‡ ë°??ë„ˆì§€' },
    { name: 'HD?„ë??ë„ˆì§€?”ë£¨??, code: '322000', sector: 'ë¡œë´‡ ë°??ë„ˆì§€' }, { name: 'OCI?€?©ìŠ¤', code: '010060', sector: 'ë¡œë´‡ ë°??ë„ˆì§€' },
    // ë°˜ë„ì²?
    { name: '?¼ì„±?„ì', code: '005930', sector: 'ë°˜ë„ì²? }, { name: '?¼ì„±?„ì??, code: '005935', sector: 'ë°˜ë„ì²? },
    { name: 'SK?˜ì´?‰ìŠ¤', code: '000660', sector: 'ë°˜ë„ì²? }, { name: '?€?´ì”¨', code: '232140', sector: 'ë°˜ë„ì²? },
    { name: 'HPSP', code: '403870', sector: 'ë°˜ë„ì²? }, { name: '?Œí¬??, code: '089030', sector: 'ë°˜ë„ì²? },
    { name: '?˜ë‚˜ë¨¸í‹°ë¦¬ì–¼ì¦?, code: '166090', sector: 'ë°˜ë„ì²? }, { name: '?˜ë‚˜ë§ˆì´?¬ë¡ ', code: '067310', sector: 'ë°˜ë„ì²? },
    { name: '? ì§„?Œí¬', code: '084370', sector: 'ë°˜ë„ì²? }, { name: '?¼ì—?¤ì??´í??©ìŠ¤', code: '031980', sector: 'ë°˜ë„ì²? },
    { name: '?¼ì—?¤ì???, code: '319660', sector: 'ë°˜ë„ì²? }, { name: '?ìŠ¤?°ì•„??STI)', code: '039440', sector: 'ë°˜ë„ì²? },
    { name: '?”ì•„??DI)', code: '003160', sector: 'ë°˜ë„ì²? }, { name: '?ìŠ¤?¤ì—?¤í…', code: '101490', sector: 'ë°˜ë„ì²? },
    { name: '?´ì˜¤?Œí¬?‰ìŠ¤', code: '039030', sector: 'ë°˜ë„ì²? }, { name: '?ìµIPS', code: '240810', sector: 'ë°˜ë„ì²? },
    { name: 'ISC', code: '095340', sector: 'ë°˜ë„ì²? }, { name: '?ì‚°?ŒìŠ¤??, code: '131970', sector: 'ë°˜ë„ì²? },
    { name: '?í”„?ìŠ¤??, code: '036810', sector: 'ë°˜ë„ì²? }, { name: '?œí™”ë¹„ì „', code: '489790', sector: 'ë°˜ë„ì²? },
    { name: 'ê°€?¨ì¹©??, code: '399720', sector: 'ë°˜ë„ì²? }, { name: '?ì´?”í…Œ?¬ë?ë¡œì?', code: '158430', sector: 'ë°˜ë„ì²? },
    { name: 'ì£¼ì„±?”ì??ˆì–´ë§?, code: '036930', sector: 'ë°˜ë„ì²? }, { name: '?œë?ë°˜ë„ì²?, code: '042700', sector: 'ë°˜ë„ì²? },
    { name: 'ì¼€?´ì”¨??, code: '281820', sector: 'ë°˜ë„ì²? }, { name: '?ìµQnC', code: '074600', sector: 'ë°˜ë„ì²? },
    { name: '? ë‹ˆ??, code: '036200', sector: 'ë°˜ë„ì²? }, { name: '?°ì”¨ì¼€??, code: '064760', sector: 'ë°˜ë„ì²? },
    // ë°”ì´??ë°??¬ìŠ¤ì¼€??
    { name: '?œì˜¬ë°”ì´?¤íŒŒë§?, code: '009420', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? }, { name: 'ì½”ì˜¤ë¡±í‹°?ˆì§„', code: '950160', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? },
    { name: '?œë??½í’ˆ', code: '128940', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? }, { name: 'HLB', code: '028300', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? },
    { name: '?ì´ë¹„ì—˜ë°”ì´??, code: '298380', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? }, { name: '?¸ë²¤?°ì???, code: '389470', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? },
    { name: '?¨ì³ì¼?, code: '220100', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? }, { name: 'ë¦¬ê?ì¼ë°”?´ì˜¤', code: '141080', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? },
    { name: '?Œí…Œ?¤ì  ', code: '196170', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? }, { name: '?¤ìŠ¤ì½”í…', code: '039200', sector: 'ë°”ì´??ë°??¬ìŠ¤ì¼€?? }
];

const SNAPSHOT_FILE = path.join(__dirname, 'market_report_snapshot.json');

let cachedToken = '';
let tokenExpiry = null;

let marketAnalysisReport = {
    updateTime: null,
    lastScanAttemptTime: null, // [v4.0.0] ?¤ì œ ?œë²„?ì„œ ?¤ìº”???œë„??ë§ˆì?ë§??œê° (ê²°ê³¼?€ ?ê??†ìŒ)
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

let lastTokenFailureTime = 0; // [v4.0.2] ? í° ë°œê¸‰ ?¤íŒ¨ ??ë°±ì˜¤?„ìš©

async function getAccessToken() {
    // [v4.0.2] ? í° ë°œê¸‰??ìµœê·¼???¤íŒ¨?ˆë‹¤ë©?5ë¶„ê°„ ?¬ì‹œ???ì œ
    if (Date.now() - lastTokenFailureTime < 5 * 60 * 1000) {
        console.log("[Token] Recent failure detected. Backing off for 5 mins...");
        return null;
    }

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
            if (e.response) {
                console.error("[Token] HTTP Status:", e.response.status);
                console.error("[Token] Error Details:", JSON.stringify(e.response.data));
            }
            // [v3.9.9] ? í° ë°œê¸‰ ?œë„ ì´ˆê³¼ (EGW00103) ?±ì¼ ??Fallback ?¤ë¡œ ?ë™ ?„í™˜
            if (e.response?.data?.error_code === 'EGW00103' && APP_KEY !== FALLBACK_APP_KEY) {
                console.log("? ï¸ ? í° ë°œê¸‰ ?œë„ ì´ˆê³¼! ?¬ë²Œ(Fallback) KIS API KEYë¡?êµì²´?˜ì—¬ ?¬ì‹œ?„í•©?ˆë‹¤.");
                APP_KEY = FALLBACK_APP_KEY;
                APP_SECRET = FALLBACK_APP_SECRET;
                tokenRequestPromise = null;
                return getAccessToken();
            }

            // If 403 (Rate Limit), wait 65s and retry once
            if (e.response?.status === 403 || e.response?.status === 429) {
                console.log("[Token] Rate Limit Hit! Waiting 65s for retry...");
                await new Promise(r => setTimeout(r, 65000));
                tokenRequestPromise = null;
                return getAccessToken();
            }
            console.log("[Token] All keys exhausted or persistent error. Setting 5 min backoff.");
            lastTokenFailureTime = Date.now();
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
                        signal: `${item.streak}???°ì† ë§¤ìˆ˜??
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

let scanLock = false; // [v3.9.1] ?¬ì§„??ë°©ì? ??
let scanLockStartTime = 0; // [v4.0.2] ???€?„ì•„??ê°ì‹œ??


async function runDeepMarketScan(force = false) {
    // [v4.0.2] ???€?„ì•„??ê°ì‹œ: 30ë¶??´ìƒ ? ê²¨?ˆìœ¼ë©?ê°•ì œ ?´ì œ
    if (scanLock && (Date.now() - scanLockStartTime > 30 * 60 * 1000)) {
        console.log(`[Worker] ? ï¸ 30ë¶?ì´ˆê³¼????ê°ì?! ê°•ì œë¡??´ì œ?˜ê³  ì§„í–‰?©ë‹ˆ??`);
        scanLock = false;
    }

    // [v3.9.1] ?´ì „ ?¤ìº”???„ì§ ?¤í–‰ ì¤‘ì´ë©????¤ìº”??ê±´ë„ˆ?€

    if (scanLock) {
        console.log(`[Worker] ???´ì „ ?¤ìº”???„ì§ ì§„í–‰ ì¤?.. ?´ë²ˆ ?¬ì´??ê±´ë„ˆ?€`);
        return;
    }
    scanLock = true;
    scanLockStartTime = Date.now();

    const now = new Date();
    // KST calculation (UTC + 9 hours)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    const hour = kstDate.getUTCHours();
    const minute = kstDate.getUTCMinutes();
    const day = kstDate.getUTCDay(); // 0=Sun, 6=Sat
    const kstDateStr = `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(kstDate.getUTCDate()).padStart(2, '0')}`;

    console.log(`[Worker] Server(UTC): ${now.toISOString()}, KST: ${kstDateStr} ${hour}:${String(minute).padStart(2, '0')}, Day: ${day}, Force: ${force}`);

    // [v3.9.9] ?œì¥ ê°ì‹œ ?œê°„: ?¤ì „ 8??~ ?¤í›„ 10??(22:00) KST
    // ??ë§ˆê° ?„ì—??ìµœì¢… ê¸°ê? ì§‘ê³„ ë°?ë¶„ì„???„í•´ ì¶©ë¶„???œê°„???•ë³´?©ë‹ˆ??
    const isWeekend = (day === 0 || day === 6);
    const isMarketOpen = (hour >= 8 && hour <= 22) && !isWeekend;
    const hasNoData = !marketAnalysisReport.updateTime;

    // [v3.9.8] ê°€??ì£¼ê¸° ?°ë¡œ?€ë§?(15ë¶??´ë‚´ ì¤‘ë³µ ?¤ìº” ë°©ì?)
    const minInterval = 14 * 60 * 1000; // 14ë¶?(?½ê°„???¬ìœ )
    const timeSinceLast = marketAnalysisReport.updateTime ? (now.getTime() - new Date(marketAnalysisReport.updateTime).getTime()) : Infinity;

    if (timeSinceLast < minInterval && !force && !hasNoData) {
        console.log(`[Worker] ìµœê·¼ ?¤ìº”(${Math.round(timeSinceLast / 1000)}ì´??????´ë? ?˜í–‰?˜ì—ˆ?µë‹ˆ?? ?¤í‚µ?©ë‹ˆ??`);
        scanLock = false;
        return;
    }

    // [v3.9.0] ë§ˆì?ë§??…ë°?´íŠ¸ê°€ ?¤ëŠ˜ ? ì§œê°€ ?„ë‹ˆë©??°ì´?°ê? ?¤ë˜??ê²ƒìœ¼ë¡??ë‹¨
    let isDataStale = false;
    let lastUpdateDateStr = '?†ìŒ';
    if (marketAnalysisReport.updateTime) {
        const lastUpdate = new Date(marketAnalysisReport.updateTime);
        const lastUpdateKST = new Date(lastUpdate.getTime() + kstOffset);
        lastUpdateDateStr = `${lastUpdateKST.getUTCFullYear()}-${String(lastUpdateKST.getUTCMonth() + 1).padStart(2, '0')}-${String(lastUpdateKST.getUTCDate()).padStart(2, '0')}`;
        isDataStale = (lastUpdateDateStr !== kstDateStr);
        if (isDataStale) {
            console.log(`[Worker] ? ï¸ ?°ì´??ê¸°ì????ì´! ë§ˆì?ë§? ${lastUpdateDateStr}, ?¤ëŠ˜: ${kstDateStr}`);
        }
    }

    // [v3.9.8] ë§ˆì?ë§??…ë°?´íŠ¸ê°€ ?¤ëŠ˜ ? ì§œê°€ ?„ë‹ˆë©?ë¬´ì¡°ê±?ê°•ì œ ê°±ì‹  ?ˆìš© (?? ??ë§ˆê°?´ë”?¼ë„ 1?ŒëŠ” ?˜í–‰)
    if (isDataStale) {
        console.log(`[Worker] ?”„ ?°ì´?°ê? ?¤ë˜??${lastUpdateDateStr}) ??ê°•ì œ ê°±ì‹  ëª¨ë“œ ê°€?? (?¤ëŠ˜: ${kstDateStr})`);
        force = true;
    }

    if (!isMarketOpen && !force && !hasNoData) {
        console.log(`[Worker] Market Closed (KST ${hour}:${String(minute).padStart(2, '0')}). Serving cached data.`);
        // [v3.9.0] MARKET_CLOSE ?íƒœ??dataTypeë§?ë°”ê¾¸ê³?ê¸°ì¡´ ?°ì´?°ëŠ” ë³´ì¡´
        if (marketAnalysisReport.status === 'READY') {
            marketAnalysisReport.dataType = 'MARKET_CLOSE';
        }
        scanLock = false; // [v3.9.1] early return ??lock ?´ì œ!
        return;
    }

    const currentType = 'LIVE';
    console.log(`[Radar] ====== 2?¨ê³„ ?˜ì´ë¸Œë¦¬???ˆì´??ê°€?? (Force: ${force}) ======`);

    // [v4.0.2] ?¤ìº” ?íƒœ?€ ?œë„?œê°??ì¦‰ì‹œ ?€??(ì£½ì—ˆ???Œë? ?€ë¹?
    marketAnalysisReport.status = 'SCANNING';
    marketAnalysisReport.lastScanAttemptTime = new Date().toISOString();
    try { fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(marketAnalysisReport)); } catch (e) { }

    try {
        const token = await getAccessToken();
        if (!token) {
            console.error("[Radar] ??? í° ë°œê¸‰ ?¤íŒ¨. ?ˆì´??ê°€?™ì„ ì¤‘ë‹¨?©ë‹ˆ??");
            marketAnalysisReport.status = 'ERROR';
            scanLock = false;
            return;
        }

        // ========================================================
        // [ì½”ë‹¤ë¦?ë¶€?? 1?¨ê³„: ê´‘ë²”???„í„° (The Wide Net)
        // ???œì¥?ì„œ '?˜ìƒ???ˆë“¤'??ë¹ ë¥´ê²??„ë³´ ë¦¬ìŠ¤?¸ì— ?¬ë¦½?ˆë‹¤.
        // ========================================================
        console.log(`[Radar 1?¨ê³„] ê´‘ë²”???„í„° ê°€??- ???œì¥ ?¤ìº” ì¤?..`);

        const candidateMap = new Map();
        const addCandidate = (code, name) => {
            if (code && !candidateMap.has(code)) {
                candidateMap.set(code, { code, name: name || code });
            }
        };

        // [v3.6.2 ?°ì„ ?œìœ„ ë³´ì •] ?µì‹¬ ê°ì‹œ ì¢…ëª© ë°??¹í„° 70ê°?ì¢…ëª©?€ 
        // 800ê°??í•œ? ì— ê±¸ë ¤ ?„ë½?˜ì? ?Šë„ë¡?ê°€??ë¨¼ì? ?„ë³´??ì¶”ê??©ë‹ˆ??
        MARKET_WATCH_STOCKS.forEach(s => addCandidate(s.code, s.name));
        SECTOR_WATCH_STOCKS.forEach(s => addCandidate(s.code, s.name));

        // Source 1: ?¸ì¸/ê¸°ê? ?œë§¤????‚¹ (?œì¥ ì£¼ë„ì£?
        try {
            const rankRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' }
            });
            (rankRes.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 1 (Foreign/Inst Rank) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 2: ì½”ìŠ¤??ê±°ë˜???œìœ„
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

        // Source 3: ì½”ìŠ¤??ê±°ë˜???œìœ„
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

        // Source 4: ?¸ì¸ ?œë§¤????‚¹ (?´íƒˆ ê°ì???
        try {
            const sellRankRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '2', FID_RANK_SORT_CLS_CODE: '1', FID_ETC_CLS_CODE: '0' }
            });
            (sellRankRes.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 4 (Foreign Sell Rank) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 4-B: ê¸°ê? ?œë§¤????‚¹ (ì¶”ê?)
        try {
            const instSellRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/foreign-institution-total`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHPTJ04400000', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '1', FID_RANK_SORT_CLS_CODE: '1', FID_ETC_CLS_CODE: '0' }
            });
            (instSellRes.data.output || []).forEach(c => addCandidate(c.mksc_shrn_iscd, c.hts_kor_isnm));
        } catch (e) { console.warn('[Radar] Source 4-B (Inst Sell Rank) failed:', e.message); }
        await new Promise(r => setTimeout(r, 120));

        // Source 5: [ì½”ë‹¤ë¦?ë¶€?? ?„ì¢…ëª?ë°°ì¹˜ ?¤ìº” (popular_stocks?ì„œ ?œì„¸ ë³€??ê±°ë˜???´ìƒ ê°ì?)
        // 2,882ê°??„ì¢…ëª©ì„ ë°°ì¹˜ë¡??œì„¸ ?•ì¸ ???˜ìƒ??ì¢…ëª©ë§??„ë³´??ì¶”ê?
        console.log(`[Radar 1?¨ê³„] Source 5: ?„ì¢…ëª?${POPULAR_STOCKS.length}ê°??œì„¸ ë°°ì¹˜ ?¤ìº” ?œì‘...`);
        let wideNetHits = 0;
        const batchSize = 8;  // ?™ì‹œ ?”ì²­ ??(API ?œí•œ ì¤€??
        const maxWideScan = Math.min(POPULAR_STOCKS.length, 500); // [v3.9.8] 500ê°œë¡œ ?•ë?
        const alreadyInMap = new Set(candidateMap.keys());

        for (let i = 0; i < maxWideScan; i++) {
            const stk = POPULAR_STOCKS[i];
            if (!stk || alreadyInMap.has(stk.code)) continue;
            await new Promise(r => setTimeout(r, 120));
            try {
                // [v4.0.0] ?˜ì •ì£¼ê?(FID_ORG_ADJ_PRC)ë¥?'0'(ë¯¸ë°˜???¼ë¡œ ë³€ê²½í•´ ?¸í™˜???ŒìŠ¤??
                const priceRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
                    headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010100', custtype: 'P' },
                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                });
                const d = priceRes.data.output;
                if (!d) {
                    if (priceRes.data.msg_cd === '500' || priceRes.data.error_code) {
                        console.error(`[Source 5 API Error] ${stk.name}(${stk.code}): ${priceRes.data.msg1}`);
                    }
                    continue;
                }

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
        console.log(`[Radar 1?¨ê³„] Wide Net ?„ë£Œ! ?„ì¢…ëª©ì—??${wideNetHits}ê°?ì¶”ê? ?„ë³´ ë°œê²¬`);

        // [v3.6.2 fix] ?µì‹¬ ì¢…ëª©?¤ì? ?´ë? ?ì—??ì¶”ê??˜ì—ˆ?¼ë?ë¡?ì¤‘ë³µ ì¶”ê? ?œê±°

        // ?¬ìš©??ê´€??ì¢…ëª©??ë¬´ì¡°ê±??¬í•¨! (?¸ì‹œ ?Œë¦¼ ?•í™•?„ë? ?„í•´)
        pushTokens.forEach(entry => {
            (entry.stocks || []).forEach(s => addCandidate(s.code, s.name));
        });

        const totalCandidates = candidateMap.size;
        console.log(`[Radar] ===== 1?¨ê³„ ?„ë£Œ: ì´?${totalCandidates}ê°??„ë³´ ?•ë³´! =====`);

        // [v3.9.5] ê³ ì¥??KIS ?…ì¢…ë³??˜ê¸‰ API ?¸ì¶œ ë¶€ë¶??„ì „ ?œê±° (?œê°„ ì§€??ë°©ì?)
        // ?€???œë²„ êµ¬ë™ ??ê°•ì œë¡??¤ìº”???µì‹¬ 70ì¢…ëª©???œë§¤???€ê¸ˆì„ ?©ì‚°?˜ëŠ” ë°©ì‹ ?¬ìš©

        // [v3.6.3] ?€?œë?êµ??œì¥ ?„ì²´(2,800ê°?ì¢…ëª©) ?ê¸ˆ ?ë¦„ ê°€?¸ì˜¤ê¸?
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
                    if (d && typeof d === 'object') {
                        // [v3.9.2] ?ˆì „???Œì‹±
                        totalF += parseInt(d.frgn_ntby_tr_pbmn || 0);
                        totalI += parseInt(d.orgn_ntby_tr_pbmn || 0);
                        pnsn += parseInt(d.pnsn_ntby_tr_pbmn || 0);
                        ivtg += parseInt(d.ivtg_ntby_tr_pbmn || 0);
                        ins += parseInt(d.ins_ntby_tr_pbmn || 0);
                    }
                } catch (e) { console.error(`Market Total API Error [${m.name}]: ${e.message}`); }
            }
            // KIS ?…ì¢…ë³??¬ì???°ì´??PBmn)??ë°±ë§Œ???¨ìœ„?´ë?ë¡? 100?¼ë¡œ ?˜ëˆ„??'?? ?¨ìœ„ë¡?ë³€?˜í•©?ˆë‹¤.
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
        // [ì½”ë‹¤ë¦?ë¶€?? 2?¨ê³„: ?•ë? ?˜ê¸‰ ë¶„ì„ (The Deep Scan)
        // ========================================================
        console.log(`[Radar 2?¨ê³„] ?•ë? ?˜ê¸‰ ë¶„ì„ ?œì‘...`);

        // [v3.9.0] sectorStockCodesë¥?Deep Scan ë£¨í”„ ?„ì— ë¨¼ì? ? ì–¸ (ReferenceError ë°©ì?)
        const sectorStockCodes = new Set(SECTOR_WATCH_STOCKS.map(s => s.code));

        const candidates = Array.from(candidateMap.values());
        const historyData = new Map();
        let hits = 0;

        // ëª¨ë“  ?„ë³´ë¥??•ë? Deep Scan (ì¢…ëª©??150ms ê°„ê²©?¼ë¡œ ?œì°¨ ì§„í–‰)
        const fullList = candidates.slice(0, 1000); // ?ˆì „ ?í•œ: ìµœë? 1000ê°œë¡œ ?í–¥
        console.log(`[Radar 2?¨ê³„] ?¤ì œ Deep Scan ?€?? ${fullList.length}ê°??œì°¨ ë¶„ì„ ?œì‘...`);

        for (let i = 0; i < fullList.length; i++) {
            const stk = fullList[i];

            // 150ms ê°„ê²©?¼ë¡œ ?œì°¨???”ì²­ (? ëŸ‰ ?œí•œ ë°©ì–´)
            await new Promise(r => setTimeout(r, 150));

            try {
                const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                    headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '1' }
                });
                const daily = invRes.data.output || [];

                // [v3.9.5] ?¥ì¤‘ ?°ì´??ë³´ì •: ? ì§œ ?•í•©???•ì¸ ??? ì •ì¹?Interim) ë°˜ì˜
                const todayStr = kstDateStr.replace(/-/g, '');
                if (isMarketOpen && daily.length > 0) {
                    let d0 = daily[0];
                    // ë§Œì•½ ì²?ë²ˆì§¸ ?°ì´??? ì§œê°€ ?¤ëŠ˜???„ë‹ˆë©? ?¤ëŠ˜ ?ë¦¬ë¥??ˆë¡œ ë§Œë“¤??ì¤€ ??? ì •ì¹˜ë? ì±„ì›?ˆë‹¤.
                    if (d0.stck_bsop_date !== todayStr) {
                        daily.unshift({
                            stck_bsop_date: todayStr,
                            frgn_ntby_qty: '0',
                            orgn_ntby_qty: '0',
                            stck_clpr: d0.stck_clpr, // ì¢…ê?/?„ì¬ê°€ ?€??ë³µì‚¬
                            prdy_ctrt: '0'
                        });
                        d0 = daily[0];
                    }

                    const fVal = parseInt(d0.frgn_ntby_qty || 0);
                    const oVal = parseInt(d0.orgn_ntby_qty || 0);

                    // ê°’ì´ 0?´ê±°??ë¹„ì–´?ˆëŠ” ê²½ìš° ? ì •ì¹?FHKST01012100) ?°ì´?°ë¡œ ë³´ì •
                    if ((fVal === 0 && oVal === 0) || force) {
                        try {
                            const provRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01012100', custtype: 'P' },
                                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stk.code }
                            });
                            const prov = provRes.data.output;
                            if (prov) {
                                d0.frgn_ntby_qty = prov.frgn_ntby_qty || '0';
                                d0.orgn_ntby_qty = prov.orgn_ntby_qty || '0'; // [FIXED] ivtg -> orgn ?„ìˆ˜ ?°ì´?°ë¡œ ë³€ê²?
                            }
                        } catch (provErr) { /* ignore */ }
                    }
                }

                if (daily.length > 0) {
                    hits++;
                    // [v3.9.9] KIS API inquire-investor TR?ì„œ stck_clpr(ì¢…ê?)???¥ì¤‘?ëŠ” ?„ì¬ê°€ë¡??¬ìš©?©ë‹ˆ??
                    // ?¥í›„ ???’ì? ?•í™•?„ë? ?„í•´ inquire-price TR??ë³‘í–‰?????ˆìœ¼??? ëŸ‰ ë¶€?˜ë? ê³ ë ¤???„ì¬ ?„ë“œë¥?? ì??˜ë˜
                    // ?°ì´??ê¸°ì??¼ì„ ë°˜ë“œ???•ì¸?©ë‹ˆ??
                    const currentPrice = parseInt(daily[0].stck_clpr || 0);
                    const currentRate = parseFloat(daily[0].prdy_ctrt || 0);
                    const currentDate = daily[0].stck_bsop_date || 'Unknown';

                    // [v3.9.5] ?°ì´??ê¸°ì??¼ì ë¡œê¹… (JYP Ent ???¹ì • ì¢…ëª© ?°ì´???•í•©???•ì¸??
                    if (stk.code === '035900') {
                        console.log(`[Radar-Data] JYP Ent. (035900) Data Date: ${currentDate}, Price: ${currentPrice}`);
                    }

                    historyData.set(stk.code, {
                        name: stk.name, price: currentPrice, rate: currentRate, date: currentDate, daily
                    });
                }
            } catch (e) {
                console.error(`[Deep Scan Error] ${stk.name} (${stk.code}): ${e.message}`);
                // [v3.6.2] ?µì‹¬ ?¹í„° ì¢…ëª©?€ ?¤íŒ¨ ??1???¬ì‹œ??(? ëŸ‰ ?œí•œ ???¼ì‹œ???¤ë¥˜ ?€ë¹?
                if (sectorStockCodes.has(stk.code)) {
                    console.log(`[Radar] ?µì‹¬ ì¢…ëª© ${stk.name} ?¬ì‹œ??ì¤?..`);
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

            if (i % 50 === 0 && i > 0) console.log(`[Radar 2?¨ê³„] Deep Scan ì§„í–‰: ${i}/${fullList.length}`);
        }

        console.log(`[Radar 2?¨ê³„] Deep Scan ?„ë£Œ! ?±ê³µ: ${hits}ê°?/ ?€?? ${fullList.length}ê°?);

        if (hits === 0) {
            console.log("[Radar] ?°ì´?°ë? ê°€?¸ì˜¤ì§€ ëª»í–ˆ?µë‹ˆ?? ?´ì „ ìºì‹œë¥?? ì??©ë‹ˆ??");
            marketAnalysisReport.status = 'READY'; // ?íƒœ ë³µêµ¬: ?±ì´ ?€ê¸??íƒœ?ì„œ ë¹ ì ¸?˜ì˜¬ ???ˆê²Œ ??
            scanLock = false; // lock ?´ì œ
            return;
        }

        // ========================================================
        // [ì½”ë‹¤ë¦?ë¶€?? 3?¨ê³„: ê²°ê³¼ ë¦¬ìŠ¤??ë°??Œë¦¼ (The Target Alert)
        // ë¶„ì„ ê²°ê³¼ë¥??¤ëƒ…?·ìœ¼ë¡?êµ½ê³ , ?¬ìš©?ë³„ ?Œë¦¼??ë°œì†¡?©ë‹ˆ??
        // ========================================================
        console.log(`[Radar 3?¨ê³„] ë¶„ì„ ê²°ê³¼ ?•ë¦¬ ë°??Œë¦¼ ë°œì†¡ ì¤?..`);

        const newBuyData = {}, newSellData = {};
        const newAllAnalysis = {}; // [v3.6.2] ë¶„ì„??ëª¨ë“  ì¢…ëª© ë³´ê???
        const investors = ['0', '2', '1'];

        investors.forEach(inv => {
            newBuyData[`5_${inv}`] = [];
            newSellData[`5_${inv}`] = [];
        });

        // [v3.6.1] 70ê°?ì£¼ìš” ?¹í„° ì¢…ëª© ?°ì´??ê°•ì œ ?¬í•¨ (?„ë¡ ?¸ì—”??ë¶„ì„ ?€ê¸??´ê²°)
        newBuyData['sectors'] = [];
        // [v3.9.0] sectorStockCodes??2?¨ê³„ ?œì‘ ???´ë? ? ì–¸??(??ì°¸ì¡°)

        const sectorMap = {
            'ë°˜ë„ì²?: 0, '?´ì°¨?„ì?': 0, 'ë°”ì´??ë°??¬ìŠ¤ì¼€??: 0,
            '?ë™ì°?ë°??„ìë¶€??: 0, 'ë¡œë´‡ ë°??ë„ˆì§€': 0, '?”í„° ë°??Œë«??: 0
        };
        // 2,800ê°???ì¢…ëª© ?˜ê¸‰ ?°ì´?°ë? ê¸°ë³¸ê°’ìœ¼ë¡??¬ìš©
        const instTotals = {
            pnsn: marketTotalFlow.pnsn || 0,
            ivtg: marketTotalFlow.ivtg || 0,
            ins: marketTotalFlow.ins || 0,
            foreign: marketTotalFlow.foreign || 0,
            institution: marketTotalFlow.institution || 0
        };

        historyData.forEach((val, code) => {
            const d = val.daily[0];
            if (!d || typeof d !== 'object') return; // [v3.9.2] ?ˆì „ ì¡°ì¹˜

            const netBuy = (parseInt(d.frgn_ntby_qty) || 0) + (parseInt(d.orgn_ntby_qty) || 0);
            const pnsnBuy = parseInt(d.pnsn_ntby_qty || 0) || 0;
            const ivtgBuy = parseInt(d.ivtg_ntby_qty || 0) || 0;
            const insBuy = parseInt(d.ins_ntby_qty || 0) || 0;

            const mwc = SECTOR_WATCH_STOCKS.find(s => s.code === code);
            if (mwc && mwc.sector) {
                // [v3.8.3] ?˜ëŸ‰ * ?„ì¬ê°€ ê³µì‹???µí•´ ?ê¸ˆ???¤ì œ ê·œëª¨(ê¸ˆì•¡)ë¥?ê³„ì‚° ?????¨ìœ„ë¡?ë³€??
                const amount = Math.round((netBuy * parseInt(val.price || 0)) / 100000000);
                sectorMap[mwc.sector] = (sectorMap[mwc.sector] || 0) + amount;
            }
            // [v3.6.3] instTotals???„ì—???´ë? ?œì¥ ?„ì²´ ?©ê³„ë¡?ì´ˆê¸°?”ë˜?ˆìœ¼ë¯€ë¡?ê°œë³„ ?©ì‚°???˜í–‰?˜ì? ?ŠìŠµ?ˆë‹¤.

            // [v3.9.9] ê¸€ë¡œë²Œ ?¬í¼ ?¨ìˆ˜ë¥??¬ìš©?˜ì—¬ ?˜ê¸‰ ë¶„ì„ ?µì¼
            const fStreakRes = analyzeStreak(val.daily, '2');
            const iStreakRes = analyzeStreak(val.daily, '1');
            const tStreakRes = analyzeStreak(val.daily, '0');

            const indFStreak = fStreakRes.buyStreak > 0 ? fStreakRes.buyStreak : -fStreakRes.sellStreak;
            const indIStreak = iStreakRes.buyStreak > 0 ? iStreakRes.buyStreak : -iStreakRes.sellStreak;
            const indTStreak = tStreakRes.buyStreak > 0 ? tStreakRes.buyStreak : -tStreakRes.sellStreak;

            const stockVwap = calculateVWAP(val.daily);
            const isHid = checkHidden(val.daily);

            // 1. ?¬ì?ë³„ ë¦¬ìŠ¤??ë¶„ë¥˜ (5??ê¸°ì? ??
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

            // 2. 70ê°?ê¸°ë³¸ ?¹í„° ì¢…ëª© ?°ì´???¬í•¨
            if (sectorStockCodes.has(code)) {
                newBuyData['sectors'].push({
                    name: val.name, code, price: val.price, rate: val.rate,
                    streak: indFStreak, // ?˜ìœ„ ?¸í™˜??? ì?
                    fStreak: indFStreak, iStreak: indIStreak,
                    vwap: stockVwap,
                    isHiddenAccumulation: isHid
                });
            }

            // 3. ëª¨ë“  ë¶„ì„ ì¢…ëª© ?”ì•½ ?•ë³´ ?€??
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
            'ë°˜ë„ì²?, '?´ì°¨?„ì?', 'ë°”ì´??ë°??¬ìŠ¤ì¼€??, '?ë™ì°?ë°??„ìë¶€??, 'ë¡œë´‡ ë°??ë„ˆì§€', '?”í„° ë°??Œë«??
        ];
        const sectorList = Object.entries(sectorMap).map(([name, flow]) => ({ name, flow }));
        // [v3.8.0] ?¹í„°ë³??ê¸ˆ ?ë¦„??ê¸ˆì•¡(?ˆë?ê°??????œì„œ?€ë¡??•ë ¬?˜ì—¬ ?œì¥ ?œì„±?„ë? ?°ì„ ?ìœ¼ë¡?ë³´ì—¬ì¤?
        sectorList.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));

        investors.forEach(inv => {
            newBuyData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
            newSellData[`5_${inv}`].sort((a, b) => b.streak - a.streak);
        });

        // [ì½”ë‹¤ë¦?ë¶€???°ì¹˜] ë°???²Œ ?°ì´?°ê? 0?¼ë¡œ ?¤ì–´?€?? ??˜ ?¨ê±°? ë˜ ?ê¸ˆ ?ë¦„ ?°ì´?°ë? ?? œ?˜ì? ?Šê³  ë³´ì¡´?©ë‹ˆ??
        const buyCount = Object.values(newBuyData).reduce((acc, l) => acc + l.length, 0);
        const sellCount = Object.values(newSellData).reduce((acc, l) => acc + l.length, 0);
        console.log(`[Radar 3?¨ê³„] ë¶„ì„ ?„ë£Œ! ë§¤ìˆ˜:${buyCount}ê±? ë§¤ë„:${sellCount}ê±? ?„ì²´:${Object.keys(newAllAnalysis).length}ê±?);

        marketAnalysisReport.buyData = newBuyData;
        marketAnalysisReport.sellData = newSellData;
        marketAnalysisReport.allAnalysis = newAllAnalysis; // [v3.6.2] ?€ê·œëª¨ ë§??€??

        // [v3.9.5] 70ê°??µì‹¬ ì¢…ëª© ê¸°ë°˜ ?ì²´ ì§‘ê³„ ?°ì´???¬ìš© ë°??•ë ¬ ë³´ì¥
        sectorList.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));
        marketAnalysisReport.sectors = sectorList.slice(0, 6);
        marketAnalysisReport.instFlow = instTotals;
        // [v3.9.8] ?„ê´‘??Ticker)???™ì  ?ìŠ¤???ì„± ë¡œì§
        const tickerItems = [];
        const fF = instTotals.foreign || 0;
        const iF = instTotals.institution || 0;

        // 1. ?œì¥ ?„ì²´ ?˜ê¸‰ ê¸°ë°˜ ë©”ì‹œì§€
        const now = new Date();
        const hour = now.getUTCHours() + 9;
        const minute = now.getUTCMinutes();
        const currentTimeVal = hour * 100 + minute;

        // ?¤ì œ ???´ì˜ ?œê°„ (09:00 ~ 15:30) ?¬ë? ?•ì¸
        const isActuallyTrading = currentTimeVal >= 900 && currentTimeVal <= 1530 && !isWeekend;

        if (!isActuallyTrading && currentTimeVal > 1530) {
            tickerItems.push(`? [ë§ˆê°] ${kstDateStr} ??ë§ˆê°. ${fF > 0 ? '?¸ì¸ ë§¤ìˆ˜' : '?¸ì¸ ë§¤ë„'}/${iF > 0 ? 'ê¸°ê? ë§¤ìˆ˜' : 'ê¸°ê? ë§¤ë„'}ë¡?ìµœì¢… ì§‘ê³„?˜ì—ˆ?µë‹ˆ??`);
        } else if (!isActuallyTrading && currentTimeVal < 900) {
            tickerItems.push(`??[ê°œì¥?? ${kstDateStr} ???œì‘ ?„ì…?ˆë‹¤. ?„ì¼ ?€ë¹??˜ê¸‰ ë³€?™ì— ? ì˜?˜ì„¸??`);
        } else {
            if (fF > 1500 && iF > 1500) tickerItems.push("?”¥ [?œì¥] ?¸ì¸/ê¸°ê? ?ëŒ???€ë§¤ìˆ˜ ?¬ì°©! ?œì¥ ì£¼ë„ì£¼ì˜ ê°•ë ¥???ìŠ¹?¸ê? ?ˆìƒ?©ë‹ˆ??");
            else if (fF > 1000 && iF > 1000) tickerItems.push("?”¥ [?œì¥] ?¸ì¸/ê¸°ê? ?™ë°˜ ë§¤ìˆ˜ ì¤? ì§€??ê²¬ì¸?¥ì´ ê°•í™”?˜ê³  ?ˆìŠµ?ˆë‹¤.");
            else if (fF < -1500 && iF < -1500) tickerItems.push("?š¨ [?œì¥] ?¸ì¸/ê¸°ê? ?¨ë‹‰ ?€ë§??¬ì°©! ë¦¬ìŠ¤??ê´€ë¦¬ì? ?„ê¸ˆ ë¹„ì¤‘ ?•ë?ë¥?ê¶Œì¥?©ë‹ˆ??");
            else if (fF < -1000 && iF < -1000) tickerItems.push("? ï¸ [?œì¥] ?¸ì¸/ê¸°ê? ?™ë°˜ ë§¤ë„??.. ë³´ìˆ˜?ì¸ ê´€?ìœ¼ë¡??œì¥???€?‘í•˜?¸ìš”.");
            else if (fF > 1500) tickerItems.push("?Œ [?œì¥] ?¸êµ­???€ê·œëª¨ ?ê¸ˆ ? ì…! ?€?•ì£¼ ì¤‘ì‹¬??ì§€??ë°©ì–´ ?ë¦„???œë ·?©ë‹ˆ??");
            else if (iF > 1500) tickerItems.push("?›ï¸?[?œì¥] ê¸°ê???ê°•ë ¥???¬ë¸Œì½? ë°°ë‹¹ì£?ë°?ê¸°ê? ? í˜¸ ì¢…ëª©êµ°ì˜ ?˜ê¸‰???°ìˆ˜?©ë‹ˆ??");
            else if (fF < -1500) tickerItems.push("?“‰ [?œì¥] ?¸êµ­???€ê·œëª¨ ?´íƒˆ ì¤?.. ?˜ê¸‰ ê³µë°±?¼ë¡œ ?¸í•œ ë³€?™ì„±??? ì˜?˜ì„¸??");
            else if (iF < -1500) tickerItems.push("?“‰ [?œì¥] ê¸°ê???ì§‘ì¤‘ ë§¤ë„??.. ?¨ê¸° ì°¨ìµ ?¤í˜„ ë¬¼ëŸ‰ ì¶œíšŒ ê°€?¥ì„±???’ìŠµ?ˆë‹¤.");
            else tickerItems.push("?–ï¸ [?œì¥] ?¸ì¸/ê¸°ê? ê³µë°©??.. ëª…í™•??ì£¼ë„ ì£¼ì²´ê°€ ?˜í????Œê¹Œì§€ ê´€ë§ì„ ê¶Œì¥?©ë‹ˆ??");
        }

        // 2. ?¹í„° ?ë¦„ ê¸°ë°˜ ë©”ì‹œì§€ (?ˆë?ê°?ê¸°ë°˜???„ë‹Œ ?¤ì œ ? ì…/? ì¶œ ìµœìƒ??ì¶”ì¶œ)
        const sortedByFlow = [...(marketAnalysisReport.sectors || [])].sort((a, b) => b.flow - a.flow);
        const topFlowSector = sortedByFlow.length > 0 ? sortedByFlow[0] : null;
        const bottomFlowSector = sortedByFlow.length > 0 ? sortedByFlow[sortedByFlow.length - 1] : null;

        if (topFlowSector && topFlowSector.flow > 50) {
            tickerItems.push(`?? [?µì‹¬?¹í„°] ${topFlowSector.name}??ê°•ë ¥???ê¸ˆ ? ì…ì¤? ê´€?¨ì£¼ ?˜ê¸‰???•ì¸?˜ì„¸??`);
        }
        if (bottomFlowSector && bottomFlowSector.flow < -50) {
            tickerItems.push(`?“‰ [ë§¤ë¬¼ì¶œíšŒ] ${bottomFlowSector.name} ?¹í„°???„ì¬ ì°¨ìµ?¤í˜„ ë¬¼ëŸ‰???Ÿì•„ì§€ê³??ˆìŠµ?ˆë‹¤.`);
        }

        // 3. ?¤ì‹œê°?ê¸‰ë“±??ë°??¹ì´ ?•í™© (v3.9.9 ì¶”ê?)
        const bullCount = newBuyData['5_0'].length;
        if (bullCount > 20) {
            tickerItems.push(`?¯ [?œì¥?¬ì°©] ?„ì¬ ${bullCount}ê°?ì¢…ëª©?ì„œ ?¸ì¸/ê¸°ê???ê°•ë ¥???ëŒ??ë§¤ìˆ˜ê°€ ?¬ì°©?˜ì—ˆ?µë‹ˆ??`);
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

        console.log(`[Radar] ===== ?¤ëƒ…???€???„ë£Œ! ë§¤ìˆ˜ ê°ì?: ${Object.values(newBuyData).reduce((a, b) => a + b.length, 0)}ê±? ë§¤ë„ ê°ì?: ${Object.values(newSellData).reduce((a, b) => a + b.length, 0)}ê±?=====`);

        // --- SERVER PUSH: ?¬ìš©?ë³„ ë§ì¶¤ ?Œë¦¼ ë°œì†¡ (?µì‹¬ ë³€ê³??œê°„?€ 3ë²? ---
        // ë°œì†¡ ?€ê²??œê°„ (ê·¼ì‚¬ì¹? 15ë¶?ì£¼ê¸°?´ë?ë¡??“ê²Œ ?¡ìŒ)
        // 1. ?„ì¹¨ (9:00 ~ 9:25) - ?œê? ì¶”ì´
        // 2. ?ì‹¬ (13:00 ~ 13:25) - ?¤í›„??ë°©í–¥??
        // 3. ì¢…ê? (15:00 ~ 15:25) - ì¢…ê? ë°°íŒ…
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
            console.log(`[Push] ?€ê²??œê°„ ?„ë‹¬! ${pushTokens.length}ëª…ì˜ ?±ë¡ ?¬ìš©?ì—ê²?4?€ ?µì‹¬ ?¨í„´ ?Œë¦¼ ?•ì¸ ì¤?..`);
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
                let highestPriority = 4; // 1: ?´íƒˆ, 2: ?ëŒ?? 3: ë³€ê³? 4: ë§¤ì§‘
                let pushTitle = '?“Š Money Fact ?Œë¦¼';

                for (const us of userStocks) {
                    const stockData = historyData.get(us.code);
                    if (!stockData) continue;

                    const foreign = analyzeStreak(stockData.daily, '2');
                    const inst = analyzeStreak(stockData.daily, '1');

                    const fBuy = foreign.buyStreak;
                    const fSell = foreign.sellStreak;
                    const iBuy = inst.buyStreak;
                    const iSell = inst.sellStreak;

                    // ì¢…ê? ?±ë½ ?•ë³´ ì¶”ì¶œ
                    const isPriceStable = Math.abs(parseFloat(stockData.rate)) <= 2;

                    let msg = null;
                    let patternKey = 'none'; // ê¸°ë³¸ ?íƒœ (?¹ì´?¬í•­ ?†ìŒ)
                    let priority = 99;

                    // 1. ?™ë°˜ ?´íƒˆ ?š¨
                    const isEscapeSignal = fSell >= userSettings.sellStreak && iSell >= userSettings.sellStreak;
                    // 2. ?™ë°˜ ?ëŒ???”¥
                    const isBullSignal = fBuy >= 1 && iBuy >= 1 && (fBuy + iBuy) >= userSettings.buyStreak;
                    // 3. ë³€ê³¡ì  ë°œìƒ ??
                    const isTurnSignal = (fBuy === 1 && iSell >= userSettings.sellStreak) || (iBuy === 1 && fSell >= userSettings.sellStreak);
                    // 4. ?ˆë“  ë§¤ì§‘ ?¤«
                    const isHiddenAcc = isPriceStable && (fBuy >= userSettings.accumStreak || iBuy >= userSettings.accumStreak);

                    if (isEscapeSignal) {
                        patternKey = 'escape';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `?„ï¸ [?™ë°˜ ?´íƒˆ ê²½ê³ ] ${us.name}: ?¸ì¸Â·ê¸°ê? ëª¨ë‘ ?ì ˆ ì¤? ë¦¬ìŠ¤??ê´€ë¦¬ê? ?œê¸‰?©ë‹ˆ??`;
                            priority = 1;
                        }
                    } else if (isBullSignal) {
                        patternKey = 'bull';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `?”¥ [?™ë°˜ ?ëŒ???¬ì°©] ${us.name}: ?¸ì¸Â·ê¸°ê????‘ì •?˜ê³  ?¸ì–´?´ëŠ” ì¤? ?œì„¸ ë¶„ì¶œ???„ë°•?ˆìŠµ?ˆë‹¤.`;
                            priority = 2;
                        }
                    } else if (isTurnSignal) {
                        patternKey = 'turn';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `??[ë³€ê³¡ì  ë°œìƒ] ${us.name}: ê¸°ë‚˜ê¸?ë§¤ë„?¸ë? ë©ˆì¶”ê³??˜ê¸‰???ë°©?¼ë¡œ êº¾ì??µë‹ˆ?? ? ê·œ ì§„ì… ?ê¸°!`;
                            priority = 3;
                        }
                    } else if (isHiddenAcc) {
                        patternKey = 'hidden';
                        if (tokenDailyHistory[us.code] !== patternKey) {
                            msg = `?¤« [?ˆë“  ë§¤ì§‘] ${us.name}: ì£¼ê???ê³ ìš”?˜ì?ë§??¸ë ¥?€ ?€ë°€??ë¬¼ëŸ‰ ?•ë³´ ì¤‘ì…?ˆë‹¤. ?Œë¬¸?˜ê¸° ?„ì— ?•ì¸?˜ì„¸??`;
                            priority = 4;
                        }
                    }

                    // [ì½”ë‹¤ë¦?ë¶€?? ?íƒœ ê°±ì‹  ?ê?: ?´ì „ ê¸°ë¡(?´ëŠ ?œê°„?€??ê³??„ì¬ ?íƒœê°€ ?¤ë¥´ë©???–´?°ê³  ?Œë¦¼! 
                    if (tokenDailyHistory[us.code] !== patternKey) {
                        tokenDailyHistory[us.code] = patternKey; // ìµœì‹  ?íƒœ ?™ì¸ ì¾?

                        // 'none' ?íƒœë¡?ë³€??ê²ƒì? ?Œë¦¼ ì£¼ì? ?Šê³ , ? ì˜ë¯¸í•œ ?¨í„´?¼ë¡œ ë³€?ˆì„ ?Œë§Œ ?Œë¦¼
                        if (msg && patternKey !== 'none') {
                            userAlerts.push(msg);
                            if (priority < highestPriority) {
                                highestPriority = priority;
                            }
                        }
                    }
                } // End user stocks loop

                if (userAlerts.length > 0) {
                    if (highestPriority === 1) pushTitle = '?š¨ ?˜ê¸‰ ?´íƒˆ ?Œë¦¼!';
                    else if (highestPriority === 2) pushTitle = '?”¥ ?¹ê¸‰ ?ëŒ???œê·¸??';
                    else if (highestPriority === 3) pushTitle = '??ë³€ê³¡ì  ?¬ì°©!';
                    else if (highestPriority === 4) pushTitle = '?¤« ?ˆë“  ë§¤ì§‘ ?¬ì°©!';

                    // ?œê°„?€ë³?ë§ì¶¤ ?€?´í? ?ìš©
                    if (hour === 15) pushTitle = `[ì¢…ê? ë°°íŒ…] ${pushTitle}`;

                    // Limit to 3 messages per push so it doesn't get cut off entirely
                    const limitedAlerts = userAlerts.slice(0, 3);
                    if (userAlerts.length > 3) limitedAlerts.push(`...??${userAlerts.length - 3}ê±?);

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
                console.log(`[Push] ?¨í„´ ì¡°ê±´ ì¶©ì¡± ì¢…ëª©???†ê±°???´ë? ë°œì†¡ ?„ë£Œ.`);
            }
        } else if (pushTokens.length > 0) {
            // Not push time
            console.log(`[Push] ?¬ìš©???¤ìº” ?ëµ (ì§€?•ëœ ?Œë¦¼ ?œê°„???„ë‹˜)`);
        }

        console.log(`[Radar] ====== 2?¨ê³„ ?˜ì´ë¸Œë¦¬???ˆì´???„ë¬´ ?„ë£Œ! ======`);

    } catch (e) {
        console.error("[Radar] Worker Error:", e.message, e.stack ? e.stack.split('\n')[1] : '');
        marketAnalysisReport.status = marketAnalysisReport.updateTime ? 'READY' : 'ERROR';
    } finally {
        // [v3.9.1] ë°˜ë“œ??lock ?´ì œ!
        scanLock = false;
        console.log(`[Worker] ?”“ ?¤ìº” ???´ì œ ?„ë£Œ. ?íƒœ: ${marketAnalysisReport.status}`);
    }
}

// [v3.9.9 ì½”ë‹¤ë¦?ë¶€?? ?œë²„ ê¸°ë™ ???°ì´??ê°±ì‹  ?ë‹¨ ë¡œì§ ?µì¼ (KST ê¸°ì?)
const _kstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
const _todayStr = `${_kstNow.getUTCFullYear()}-${String(_kstNow.getUTCMonth() + 1).padStart(2, '0')}-${String(_kstNow.getUTCDate()).padStart(2, '0')}`;
const snapshotDate = marketAnalysisReport.updateTime ? new Date(new Date(marketAnalysisReport.updateTime).getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
const isSellListEmpty = Object.values(marketAnalysisReport.sellData || {}).every(list => !list || list.length === 0);
const _hour = _kstNow.getUTCHours();
const _day = _kstNow.getUTCDay();
const _isWeekend = (_day === 0 || _day === 6);
// ?„ì—­ ê°ì‹œ ?œê°„ (08:00 ~ 22:00)
const _isGlobalWatchTime = (_hour >= 8 && _hour <= 22) && !_isWeekend;

if (_isGlobalWatchTime || snapshotDate !== _todayStr || isSellListEmpty) {
    console.log(`[Server] Boot Check: ${_isGlobalWatchTime ? 'ê°ì‹œ ?œê°„?€' : ''} ${snapshotDate !== _todayStr ? '? ì§œ ?¤ë¦„' : ''} ??ì¦‰ì‹œ ?¤íƒœ??ê°€??);
    runDeepMarketScan(true);
} else {
    console.log(`[Server] Boot Check: ?´ì¥ ?ëŠ” ìµœì‹  ?°ì´???ˆìŒ (${snapshotDate}).`);
}

// [ì½”ë‹¤ë¦?ë¶€?? setInterval?€ app.listen ì½œë°±?ì„œ 1?Œë§Œ ?¤í–‰ (ì¤‘ë³µ ë°©ì?)

app.get('/api/analysis/supply/:period/:investor', (req, res) => {
    const key = `${req.params.period}_${req.params.investor}`;
    const mode = req.query.mode || 'buy';
    const data = (mode === 'buy') ? marketAnalysisReport.buyData[key] : marketAnalysisReport.sellData[key];
    res.json({ output: data || [], updateTime: marketAnalysisReport.updateTime, dataType: marketAnalysisReport.dataType });
});

// [ì½”ë‹¤ë¦?ë¶€???°ì¹˜] ?±ì´ ë°¤ì—????ë°©ì— ?„ì²´ ?°ì´?°ë? ë°›ì•„ê°????ˆëŠ” ?¤ëƒ…??API!
// [v3.9.8] ?±ì˜ ?¤ëƒ…???”ì²­ ?œì—???°ì´??? ì„ ?„ë? ì²´í¬?˜ì—¬ ?„ìš”???¤ìº??ê°€??
app.get('/api/snapshot', (req, res) => {
    // [v3.9.9] ?°ì´??? ì„ ??ì²´í¬ (20ë¶?ê¸°ì?)
    const now = new Date();
    const lastUpdateDate = marketAnalysisReport.updateTime ? new Date(marketAnalysisReport.updateTime) : new Date(0);
    const lastAttemptDate = marketAnalysisReport.lastScanAttemptTime ? new Date(marketAnalysisReport.lastScanAttemptTime) : new Date(0);
    const diffMin = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60);
    const attemptDiffMin = (now.getTime() - lastAttemptDate.getTime()) / (1000 * 60);

    // [v4.0.0] ë¡œì§ ê°œì„ : ê°•ì œ ?¸ì¶œ(force)?´ê±°?? ?°ì´?°ê? 20ë¶??˜ê²Œ ?¤ë˜?˜ì—ˆ?”ë° + ë§ˆì?ë§??œë„ ??15ë¶??´ìƒ ì§€?¬ì„ ?Œë§Œ ?¬ì‹œ??
    const isStale = (req.query.force === 'true') ||
        (diffMin > 20 && attemptDiffMin > 15) ||
        (now.getDate() !== lastUpdateDate.getDate());

    if (isStale && !scanLock) {
        marketAnalysisReport.status = 'SCANNING';
        marketAnalysisReport.lastScanAttemptTime = new Date().toISOString(); // ?œë„?œê° ?…ë°?´íŠ¸
        console.log(`[Snapshot] ?¤ìº” ?¸ë¦¬ê±? (?°ì´??${Math.round(diffMin)}ë¶„ì „, ?œë„:${Math.round(attemptDiffMin)}ë¶„ì „) status=SCANNING`);
        setTimeout(() => runDeepMarketScan(true), 1500);
    }

    res.json({
        ...marketAnalysisReport,
        _scanTriggered: isStale ? 'FORCE' : 'CHECKED'
    });
});

const ALL_STOCKS = require('./popular_stocks');
// Deduplicate stocks by code
const POPULAR_STOCKS = Array.from(new Map(ALL_STOCKS.map(s => [s.code, s])).values());
console.log(`[Server] Loaded ${POPULAR_STOCKS.length} unique stocks (Deduplicated from ${ALL_STOCKS.length})`);

// --- Global Helper Functions for Supply & Demand Analysis ---

/**
 * [ê°€?´ë“œ] ?°ì† ?˜ê¸‰(Streak) ê³„ì‚° ?¨ìˆ˜
 * - net > 0 (ë§¤ìˆ˜), net < 0 (ë§¤ë„), net == 0 (ë¬´ì‹œ ?ëŠ” ì¤‘ë‹¨ ? íƒ ê°€??
 * - ?„ì¬ ?„ë¡œ?íŠ¸ ?•ì±…: 0(ì£¼ë§/?´ì¥/ë³´í•©)?€ ë¬´ì‹œ?˜ê³  ?°ì†?±ì„ ? ì??˜ë„ë¡??µì¼ (v3.9.9)
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

        if (net === 0) continue; // 0??? ì? ê±´ë„ˆ?€ (?°ì†??? ì?)

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
 * [ê°€?´ë“œ] VWAP(ê±°ë˜??ê°€ì¤??‰ê· ê°€) ë°??ˆë“  ë§¤ì§‘ ê³„ì‚°
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

// [v3.9.9] ?ˆë“  ë§¤ì§‘ ê°ì? ë¡œì§ ê³ ë„?? ?¡ë³´ ?ì • ê°•í™”
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
            dayVolatility = ((high - low) / (close || 1)) * 100;
        } else {
            dayVolatility = Math.abs(parseFloat(row.prdy_ctrt || 0));
        }
        totalVolatility += dayVolatility;
    }
    const avgVol = totalVolatility / 5;

    // 5?¼ê°„ ?„ì²´ ?„ì  ?±ë½ë¥?(ë°•ìŠ¤ê¶??¡ë³´ ?•ì¸)
    const currentClose = parseInt(daily[0].stck_clpr || 0);
    const fiveDaysAgoClose = parseInt(daily[4].stck_clpr || 0);

    // 0 ?˜ëˆ„ê¸?ë°©ì?
    const totalChange = fiveDaysAgoClose > 0
        ? ((currentClose - fiveDaysAgoClose) / fiveDaysAgoClose) * 100
        : 0;

    const fRes = analyzeStreak(daily, '2');
    const iRes = analyzeStreak(daily, '1');

    const todayChange = Math.abs(parseFloat(daily[0].prdy_ctrt || 0));

    // [ìµœì¢… ê¸°ì?] ë³€?™ì„± 2.5% ë¯¸ë§Œ + ?¹ì¼ 3% ë¯¸ë§Œ + 5???„ì  ?±ë½ 3% ?´ë‚´ + ?¸ì¸/ê¸°ê? ë§¤ì§‘
    return avgVol < 2.5 &&
        todayChange < 3.0 &&
        Math.abs(totalChange) < 3.0 &&
        (fRes.buyStreak >= threshold || iRes.buyStreak >= threshold);
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
        // Local data exists ??sync TO Firebase as safety backup
        console.log('[Firebase] Local data found. Syncing to cloud...');
        try {
            await axios.put(`${FIREBASE_DB_URL}/sync.json`, userStore);
            console.log('[Firebase] ??All local data backed up to cloud!');
        } catch (e) {
            console.error('[Firebase] Cloud backup failed:', e.message);
        }
        return;
    }
    // Local is empty ??recover FROM Firebase
    try {
        console.log('[Firebase] ? ï¸ Local data empty! Attempting cloud recovery...');
        const res = await axios.get(`${FIREBASE_DB_URL}/sync.json`);
        const cloudData = res.data;
        if (cloudData && typeof cloudData === 'object' && Object.keys(cloudData).length > 0) {
            userStore = cloudData;
            fs.writeFileSync(SYNC_FILE, JSON.stringify(userStore, null, 2));
            console.log(`[Firebase] ??Recovered ${Object.keys(userStore).length} user profiles from cloud!`);
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
                .then(() => console.log(`[Firebase] ?ï¸ Backed up: ${changedKey}`))
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
                console.log(`[Firebase] ?ï¸ Recovered data for: ${syncKey}`);
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

    // [v3.9.9] ?œì°¨ ë¶„ì„ + ? ì •ì¹?ë³´ì • + TPS ë°©ì–´
    const now = new Date();
    const kstHour = (now.getUTCHours() + 9) % 24;
    const kstDay = (now.getUTCDay());
    const isTradingTime = (kstHour >= 9 && kstHour <= 16) && (kstDay >= 1 && kstDay <= 5);

    for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        await new Promise(r => setTimeout(r, 150)); // 150ms ê°„ê²©?¼ë¡œ TPS ë°©ì–´

        try {
            const meta = POPULAR_STOCKS.find(s => s.code === code) || { name: code, code };
            const invRes = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: 'FHKST01010900', custtype: 'P' },
                params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '1' }
            });
            let daily = invRes.data.output || [];

            if (daily.length > 0 && isTradingTime) {
                // ?¥ì¤‘ ? ì •ì¹?ë³´ì • ë¡œì§ ì¶”ê?
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
                            d0.orgn_ntby_qty = prov.orgn_ntby_qty || '0'; // [FIXED] ivtg -> orgn ?„ìˆ˜ ?°ì´?°ë¡œ ë³€ê²?
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
            finance = { per: d.per || '-', pbr: d.pbr || '-', cap: d.hts_avls ? Math.round(parseInt(d.hts_avls) / 1000) + "ì¡? : '-' };
            if (perVal > 0 && perVal < 8) perText = "ì´ˆì??‰ê?(?˜ìµ?„íƒ„)";
            else if (perVal >= 8 && perVal < 15) perText = "?ì •?˜ì?(?ˆì •??";
            else if (perVal >= 15) perText = "ê¸°ë?ì¹˜ë†’???±ì¥??";
            if (pbrVal > 0 && pbrVal < 0.6) pbrText = "?ì‚° ?€ë¹??ê°’(?ˆì „)";
            else if (pbrVal >= 0.6 && pbrVal < 1.0) pbrText = "?ì‚° ê°€ì¹??€?‰ê?";
            else if (pbrVal >= 1.0) pbrText = "?„ë¦¬ë¯¸ì—„(ë¸Œëœ?œê?ì¹?";
        } catch (e) { }

        return {
            ...s, finance, perText, pbrText,
            shares: buyableShares,
            insight: isBuy ? "?˜ê¸‰ ì£¼ì²´?¤ì˜ ê°•ë ¥??ë§¤ìˆ˜?¸ê? ?•ì¸?˜ë©°, ?¬ë¬´ ê±´ì „?±ì´ ?°ìˆ˜?©ë‹ˆ??" : "?˜ê¸‰ ?´íƒˆ ì§•í›„ê°€ ?¬ì°©?˜ì–´ ì£¼ì˜ê°€ ?„ìš”?©ë‹ˆ??",
            isBuyable: ignoreBudget ? true : (buyableShares > 0)
        };
    }));
    res.json({ portfolio: detailedPortfolio });
});

// [v3.9.9] ì¢…ëª©ë³??¼ë³„ ?°ì´???„ë¡??API (?±ì—??ì§ì ‘ KIS API ?¸ì¶œ ?¤íŒ¨ ???œë²„ ê²½ìœ  ?´ë°±??
app.get('/api/stock-daily/:code', async (req, res) => {
    const { code } = req.params;
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Invalid stock code' });

    try {
        const token = await getAccessToken();
        if (!token) return res.status(500).json({ error: 'Token unavailable' });

        // 150ms ê°„ê²©?¼ë¡œ TPS ë°©ì–´
        const fetchKIS = async (trId, params) => {
            const urlPath = trId === 'FHKST01010900' ? 'inquire-investor' : 'inquire-daily-price';
            const r = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/${urlPath}`, {
                headers: { authorization: `Bearer ${token}`, appkey: APP_KEY, appsecret: APP_SECRET, tr_id: trId, custtype: 'P' },
                params
            });
            return r.data.output || [];
        };

        const baseParams = { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code, FID_PERIOD_DIV_CODE: 'D', FID_ORG_ADJ_PRC: '0' };

        // ?¬ì???°ì´??+ ê°€ê²??°ì´???™ì‹œ ì¡°íšŒ
        const [investorData, priceData] = await Promise.all([
            fetchKIS('FHKST01010900', baseParams),
            fetchKIS('FHKST01010400', baseParams)
        ]);

        if (!investorData || investorData.length === 0) {
            return res.json({ daily: [], source: 'server_proxy_empty' });
        }

        // ?¬ì???°ì´?°ì— ê°€ê²??°ì´??ë³‘í•© (ìº”ë“¤ì°¨íŠ¸ + VWAP???„ìš”)
        const merged = investorData.map((inv, idx) => {
            const priceItem = priceData.find(p => p.stck_bsop_date === inv.stck_bsop_date) || priceData[idx] || priceData[0];
            if (priceItem) {
                return {
                    ...inv,
                    stck_clpr: priceItem.stck_clpr,
                    stck_hgpr: priceItem.stck_hgpr,
                    stck_lwpr: priceItem.stck_lwpr,
                    stck_oprc: priceItem.stck_oprc,
                    acml_vol: priceItem.acml_vol
                };
            }
            return inv;
        });

        console.log(`[Proxy] ì¢…ëª© ${code} ?¼ë³„ ?°ì´??${merged.length}ê±??„ë‹¬`);
        res.json({ daily: merged, source: 'server_proxy' });
    } catch (e) {
        console.error(`[Proxy] Stock daily error for ${code}:`, e.message);
        res.status(500).json({ error: 'Fetch failed', message: e.message });
    }
});

// (Legacy duplicate routes removed - now handled by Cloud Sync system above)

app.get('/', (req, res) => res.sendFile(path.join(__dirname, './index.html')));
app.get('/manual', (req, res) => res.sendFile(path.join(__dirname, './money_fact_manual.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Deep Scan Server Online on port ${PORT}`);

    // [v3.9.0 ì½”ë‹¤ë¦?ë¶€?? 15ë¶?ì£¼ê¸° ?¤ìº” (?¥ì¤‘ ?ë™ ê°±ì‹ ???µì‹¬!)
    setInterval(() => {
        runDeepMarketScan(false);
    }, 15 * 60 * 1000);

    // Render ?œë²„ ?ˆì „ ëª¨ë“œ ë°©ì????ì²´ ??(14ë¶?ì£¼ê¸°)
    setInterval(() => {
        axios.get('https://money-fact-server.onrender.com/').catch(() => { });
    }, 14 * 60 * 1000);

    // [v3.9.0] ?œë²„ ?œì‘ ??ì¤‘ë³µ ?¤ìº” ?œê±° - ?„ì˜ shouldScanNow?ì„œ ?´ë? ì²˜ë¦¬??
    // force=false ì¤‘ë³µ ?¸ì¶œ???????œê°„??MARKET_CLOSEë¡???–´?°ëŠ” ë²„ê·¸ ë°©ì?
    console.log(`[Server] 15ë¶?ì£¼ê¸° ?¤ìº” ?¤ì?ì¤„ëŸ¬ ?œì„±???„ë£Œ`);
});
