import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, StatusBar,
  ActivityIndicator, Dimensions, Alert, ImageBackground, Platform, Switch, LogBox,
  KeyboardAvoidingView
} from 'react-native';

// Ignore specific Expo Go warnings
LogBox.ignoreLogs(['expo-notifications', 'New Architecture', 'AxiosError', 'Network Error']);
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';
import {
  TrendingUp, TrendingDown, Wand2,
  CheckCircle2, X, ClipboardList, Search, Plus, Trash2, Star, AlertTriangle, Bell, BellOff
} from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const { width } = Dimensions.get('window');

// --- Notifications Configuration ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- CONSTANTS ---
// const SERVER_URL = 'http://127.0.0.1:3000'; 
const SERVER_URL = 'https://money-fact-server.onrender.com';
const MY_STOCKS_KEY = '@my_stocks';
const NOTIF_STORAGE_KEY = '@notif_enabled';
const SYNC_KEY_STORAGE = '@sync_nickname';
const BACKGROUND_TASK_NAME = 'BACKGROUND_STOCK_CHECK';
const TOKEN_STORAGE_KEY = '@kis_token';

// KIS API CONFIG (Client-Side Direct Access)
const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
const APP_KEY = 'PSpAyCQS1AvvJCDi6VWtoZOBMsSy1VRuyE34';
const APP_SECRET = 'LpPkeiUNYGTfBw8V+jFimhhjv6QUMVVP3hHXEzEPXvVZAsP3r1+Bs1ZafccTx+D9zvTvNqR8nkeWR9wMS+SPEjxTgk0lHqZzun3ErjZMATfwToIEeJMzRYxX2AQvY26R/98eM0Ib6D4qd4iShfgBW9UuJVqvdWaLxAzlW6yHlOn+f2BWajk=';
// --- HELPER: Get KIS Token (Direct with Singleton & Memory Cache) ---
let memToken = null;
let memExpiry = null;
let tokenRequestPromise = null;
let expoPushToken = null; // Expo Push Token for server-side notifications

async function getKisToken() {
  // 1. Check Memory Cache first (Fastest)
  if (memToken && memExpiry && new Date() < memExpiry) {
    return memToken;
  }

  // 2. If already requesting, wait for it (Singleton)
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  tokenRequestPromise = (async () => {
    try {
      // 3. Check Persistent Storage
      const saved = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (saved) {
        const { token, expiry } = JSON.parse(saved);
        const expDate = new Date(expiry);
        // Safety buffer: treat as expired if within 10 mins of expiry
        const safeNow = new Date(new Date().getTime() + 10 * 60 * 1000);

        if (safeNow < expDate) {
          console.log('[App] Restored Valid KIS Token from Storage');
          memToken = token;
          memExpiry = expDate;
          return token;
        }
      }

      // 4. Try Server Shared Token FIRST (For 5-user sharing)
      try {
        console.log('[App] Requesting Shared Token from Server...');
        const serverRes = await axios.get(`${SERVER_URL}/api/token`, { timeout: 5000 });
        if (serverRes.data && serverRes.data.token) {
          const serverToken = serverRes.data.token;
          const serverExpiry = new Date(serverRes.data.expiry);
          memToken = serverToken;
          memExpiry = serverExpiry;
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token: serverToken, expiry: serverExpiry }));
          console.log('[App] Using Server Shared Token (5-user mode)');
          return serverToken;
        }
      } catch (serverErr) {
        console.log('[App] Server token unavailable, falling back to direct...');
      }

      // 5. Direct Token Request (Fallback)
      console.log('[App] Issuing NEW KIS Token (Direct)...');
      const res = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: APP_KEY.trim(),
        appsecret: APP_SECRET.trim()
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      const newToken = res.data.access_token;
      if (!newToken) throw new Error(res.data.msg1 || 'Token fetch failed');

      // Expiry is typically 86400s (24h). We use a slight buffer.
      const newExpiry = new Date(new Date().getTime() + (res.data.expires_in - 300) * 1000);

      memToken = newToken;
      memExpiry = newExpiry;
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token: newToken, expiry: newExpiry }));
      console.log('[App] New Token Issued & Saved (Direct)');
      return newToken;
    } catch (e) {
      console.error('[Token Error]', e.message);
      return null;
    } finally {
      tokenRequestPromise = null;
    }
  })();

  return tokenRequestPromise;
}

// --- HELPER: Get Market Data (Direct) ---
async function getMarketData(code) {
  const token = await getKisToken();
  if (!token) return [];

  try {
    const res = await axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor`, {
      headers: {
        authorization: `Bearer ${token}`,
        appkey: APP_KEY.trim(),
        appsecret: APP_SECRET.trim(),
        tr_id: 'FHKST01012200',
        custtype: 'P'
      },
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: code
      }
    });
    return res.data.output || [];
  } catch (e) {
    console.warn(`[Data Error ${code}]`, e.message); // Warn instead of Error to reduce noise
    return [];
  }
}

// --- LOGIC: Streak Analysis ---
function analyzeStreak(dailyData, type) {
  if (!dailyData || dailyData.length < 5) return 0;

  let buyStreak = 0;
  let sellStreak = 0;

  for (let i = 0; i < dailyData.length; i++) {
    const day = dailyData[i];
    let vol = 0;

    // FHKST01012200 Field Mapping
    if (type === '2') vol = parseInt(day.fgnn_ntby_qty);
    else if (type === '1') vol = parseInt(day.orgn_ntby_qty);
    else vol = parseInt(day.prsn_ntby_qty);

    if (vol > 0) {
      if (sellStreak > 0) break;
      buyStreak++;
    } else if (vol < 0) {
      if (buyStreak > 0) break;
      sellStreak++;
    } else {
      break;
    }
  }
  return buyStreak > 0 ? buyStreak : -sellStreak;
}

const NOTIF_HISTORY_KEY = '@notif_history';

// 2. Background Task Definition (15 min Interval)
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    // 1. Time Check (08:00 ~ 20:00, Mon-Fri)
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const hour = now.getHours();

    // Skip on weekends or late night to save battery
    if (day === 0 || day === 6 || hour < 8 || hour > 20) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 2. Load MY Stocks
    const saved = await AsyncStorage.getItem(MY_STOCKS_KEY);
    if (!saved) return BackgroundFetch.BackgroundFetchResult.NoData;
    const myStocks = JSON.parse(saved);
    if (myStocks.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    // 3. Scan for Danger AND Opportunity
    let notifyItems = [];
    const today = new Date().toISOString().split('T')[0];
    const historyRaw = await AsyncStorage.getItem(NOTIF_HISTORY_KEY);
    let history = historyRaw ? JSON.parse(historyRaw) : {};
    let updatedHistory = { ...history };

    for (const stock of myStocks) {
      // Small delay between calls to be gentle on API
      await new Promise(r => setTimeout(r, 200));

      const data = await getMarketData(stock.code);
      if (data && data.length > 0) {
        const fStreak = analyzeStreak(data, '2'); // Foreigner
        const iStreak = analyzeStreak(data, '1'); // Institution

        if (!updatedHistory[stock.code]) updatedHistory[stock.code] = { foreigner: '', institution: '', fBuy: '', iBuy: '' };

        // Danger Condition: Sell Streak >= 3 days
        if (fStreak <= -3 && updatedHistory[stock.code].foreigner !== today) {
          notifyItems.push({ type: 'danger', msg: `${stock.name} 외인 ${Math.abs(fStreak)}일 연속 매도` });
          updatedHistory[stock.code].foreigner = today;
        }
        if (iStreak <= -3 && updatedHistory[stock.code].institution !== today) {
          notifyItems.push({ type: 'danger', msg: `${stock.name} 기관 ${Math.abs(iStreak)}일 연속 매도` });
          updatedHistory[stock.code].institution = today;
        }

        // Opportunity Condition: Buy Streak >= 3 days
        if (fStreak >= 3 && updatedHistory[stock.code].fBuy !== today) {
          notifyItems.push({ type: 'opportunity', msg: `${stock.name} 외인 ${fStreak}일 연속 매수` });
          updatedHistory[stock.code].fBuy = today;
        }
        if (iStreak >= 3 && updatedHistory[stock.code].iBuy !== today) {
          notifyItems.push({ type: 'opportunity', msg: `${stock.name} 기관 ${iStreak}일 연속 매수` });
          updatedHistory[stock.code].iBuy = today;
        }
      }
    }

    // 4. Send Notifications
    const dangerItems = notifyItems.filter(n => n.type === 'danger');
    const oppItems = notifyItems.filter(n => n.type === 'opportunity');

    if (dangerItems.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 Money Fact 위험 감지",
          body: dangerItems.map(n => n.msg).join('\n'),
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    }

    if (oppItems.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎯 Money Fact 매수 기회!",
          body: oppItems.map(n => n.msg).join('\n'),
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });
    }

    if (notifyItems.length > 0) {
      await AsyncStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(updatedHistory));
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[Background Task Error]', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

function MainApp() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('buy'); // 'buy', 'sell', 'my'
  const [investor, setInvestor] = useState('2'); // Default to Foreigner
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTitle, setReportTitle] = useState('');

  // MY Portfolio State
  const [myStocks, setMyStocks] = useState([]);
  const [myAnalysis, setMyAnalysis] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [dangerAlert, setDangerAlert] = useState(null);
  const [searchTimer, setSearchTimer] = useState(null);

  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const [syncKey, setSyncKey] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Expo Push Token Registration ---
  const registerPushToken = useCallback(async (stocks = []) => {
    try {
      if (!Device.isDevice) {
        console.log('[Push] Not a physical device, skipping push registration');
        return;
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('[Push] Permission not granted');
        return;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined // Uses default from app.json
      });
      expoPushToken = tokenData.data;
      console.log('[Push] Expo Push Token:', expoPushToken);

      // Register with server (send current stocks for server-side alerts)
      const savedSyncKey = await AsyncStorage.getItem(SYNC_KEY_STORAGE);
      await axios.post(`${SERVER_URL}/api/push/register`, {
        pushToken: expoPushToken,
        syncKey: savedSyncKey || 'anonymous',
        stocks: stocks
      }, { timeout: 5000 });
      console.log('[Push] Token registered with server!');
    } catch (e) {
      console.warn('[Push] Registration failed:', e.message);
    }
  }, []);

  // Load Init
  useEffect(() => {
    const init = async () => {
      const loadedStocks = await loadMyStocks();
      const savedNotif = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
      const enabled = savedNotif !== null ? JSON.parse(savedNotif) : true;
      setIsNotificationEnabled(enabled);

      const savedSyncKey = await AsyncStorage.getItem(SYNC_KEY_STORAGE);
      if (savedSyncKey) setSyncKey(savedSyncKey);

      setupBackgroundTasks(enabled);

      // Register for server-side push notifications
      await registerPushToken(loadedStocks || []);
    };
    init();
  }, []);

  const saveSyncKey = async (val) => {
    setSyncKey(val);
    await AsyncStorage.setItem(SYNC_KEY_STORAGE, val);
  };

  const handleBackup = async () => {
    const trimmedKey = syncKey.trim();
    if (!trimmedKey) { Alert.alert('알림', '사용할 키를 입력해주세요.'); return; }
    setIsSyncing(true);
    try {
      await axios.post(`${SERVER_URL}/api/sync/save`, { syncKey: trimmedKey, stocks: myStocks });
      Alert.alert('성공', '내 종목이 클라우드에 안전하게 보관되었습니다!');
    } catch (e) {
      Alert.alert('실패', '서버 통신 중 오류가 발생했습니다.');
    } finally { setIsSyncing(false); }
  };

  const handleRestore = async () => {
    const trimmedKey = syncKey.trim();
    if (!trimmedKey) { Alert.alert('알림', '키를 입력해주세요.'); return; }
    setIsSyncing(true);
    try {
      const res = await axios.get(`${SERVER_URL}/api/sync/load?syncKey=${trimmedKey}`);
      const restored = res.data.stocks || [];
      if (restored.length > 0) {
        setMyStocks(restored);
        await AsyncStorage.setItem(MY_STOCKS_KEY, JSON.stringify(restored));
        Alert.alert('성공', `${restored.length}개의 종목을 복구했습니다!`);
      }
    } catch (e) {
      Alert.alert('실패', '해당 키로 저장된 데이터를 찾을 수 없습니다.');
    } finally { setIsSyncing(false); }
  };

  const checkSyncKey = async () => {
    const trimmedKey = syncKey.trim();
    if (!trimmedKey) { Alert.alert('알림', '키를 입력해주세요.'); return; }
    try {
      const res = await axios.get(`${SERVER_URL}/api/sync/check?syncKey=${trimmedKey}`);
      if (res.data.exists) {
        Alert.alert('경고', '이미 사용 중인 키입니다. 키가 중복되니 다른 키를 입력해 주세요.');
      } else {
        Alert.alert('성공', '사용 가능한 키입니다! 지금 바로 백업해 보세요.');
      }
    } catch (e) { }
  };

  const toggleNotification = async (val) => {
    setIsNotificationEnabled(val);
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(val));
    setupBackgroundTasks(val);
  };

  const setupBackgroundTasks = async (enabled) => {
    if (!enabled) {
      try { await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME); } catch (e) { }
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 15 * 60, stopOnTerminate: false, startOnBoot: true,
      });
    } catch (err) { }
  };

  const loadMyStocks = async () => {
    try {
      const saved = await AsyncStorage.getItem(MY_STOCKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMyStocks(parsed);
        return parsed;
      }
      return [];
    } catch (e) { return []; }
  };

  const saveMyStocks = async (data) => {
    try {
      await AsyncStorage.setItem(MY_STOCKS_KEY, JSON.stringify(data));
      // Update server with latest stock list for push alerts
      registerPushToken(data);
    } catch (e) { }
  };

  const addStock = (stock) => {
    setMyStocks((prev) => {
      if (prev.find(s => s.code === stock.code)) {
        Alert.alert('알림', '이미 등록된 종목입니다.');
        return prev;
      }
      const updated = [...prev, stock];
      saveMyStocks(updated);
      return updated;
    });
    setSearchVisible(false); setSearchKeyword(''); setSearchResults([]);
  };

  const removeStock = (code) => {
    const updated = myStocks.filter(s => s.code !== code);
    setMyStocks(updated);
    saveMyStocks(updated);
    setMyAnalysis(myAnalysis.filter(s => s.code !== code));
  };

  const searchStock = (keyword) => {
    setSearchKeyword(keyword);
    if (searchTimer) clearTimeout(searchTimer);
    if (keyword.length < 1) { setSearchResults([]); return; }

    const timer = setTimeout(async () => {
      try {
        // Search still uses Server (it's hardcoded list anyway)
        const res = await axios.get(`${SERVER_URL}/api/search?keyword=${encodeURIComponent(keyword)}`);
        setSearchResults(res.data.result || []);
      } catch (e) { setSearchResults([]); }
    }, 400);
    setSearchTimer(timer);
  };

  // --- STORE: Memory Cache for Market Data ---
  const marketStore = React.useRef({ data: new Map(), lastScan: 0, lastMyScan: 0 });
  const [scanProgress, setScanProgress] = useState(0);
  const [foundCount, setFoundCount] = useState(0);

  // Helper: Get formatted date YYYYMMDD for last business day in KST (UTC+9)
  const getLatestBusinessDay = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstDate = new Date(utcTime + (9 * 3600000));

    let d = kstDate;
    const isWeekend = (day) => day === 0 || day === 6;

    // In KST, if before 4 PM (16:00), today's close data might not be ready
    if (d.getHours() < 16) d.setDate(d.getDate() - 1);

    while (isWeekend(d.getDay())) {
      d.setDate(d.getDate() - 1);
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const bday = String(d.getDate()).padStart(2, '0');

    // 추가: 만약 주말이거나 오늘 데이터가 아직 안 올라왔을 경우를 대비해 어제 날짜도 준비
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    while (isWeekend(prev.getDay())) prev.setDate(prev.getDate() - 1);
    const py = prev.getFullYear();
    const pm = String(prev.getMonth() + 1).padStart(2, '0');
    const pbday = String(prev.getDate()).padStart(2, '0');

    return { today: `${y}${m}${bday}`, yesterday: `${py}${pm}${pbday}` };
  };

  const fetchDirectData = useCallback(async (force = false) => {
    // --- 1. MY Mode Cache Check ---
    if (mode === 'my' && !force) {
      const isRecentlyScanned = Date.now() - marketStore.current.lastMyScan < 5 * 60 * 1000;
      if (isRecentlyScanned && myAnalysis.length > 0) {
        console.log('[App] Using MY cache (last scanned < 5min)');
        return;
      }
    }

    setLoading(true);
    setScanProgress(0);
    setFoundCount(0);

    try {
      // --- 2. SERVER MODE ---
      let serverDataSuccess = false;
      if (mode !== 'my' && !force) {
        try {
          console.log(`[App] Requesting Server Analysis (Mode: ${mode}, Inv: ${investor})`);
          const res = await axios.get(`${SERVER_URL}/api/analysis/supply/5/${investor}?mode=${mode}`);
          if (res.data && res.data.output && res.data.output.length > 0) {
            console.log(`[App] Server data received: ${res.data.output.length} items`);
            setStocks(res.data.output);
            serverDataSuccess = true;
          }
        } catch (serverErr) {
          console.log('[App] Server fallback to Direct Mode.');
        }
      }

      // --- 3. DIRECT MODE ---
      const token = await getKisToken();
      if (!token) {
        setLoading(false);
        return;
      }

      let candidates = [];
      if (mode === 'my') {
        candidates = myStocks;
      } else if (!serverDataSuccess) {
        const candidateMap = new Map();
        const add = (arr) => arr?.forEach(c => {
          const code = c.stck_shrn_iscd || c.mksc_shrn_iscd;
          const name = c.hts_kor_isnm;
          if (code && !candidateMap.has(code)) candidateMap.set(code, { code, name });
        });

        const fetchRank = async (dateStr = '') => {
          const endpoints = [
            { tid: 'FHPTJ04400000', p: { FID_COND_MRKT_DIV_CODE: 'V', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' } },
            { tid: 'FHPTJ04400000', p: { FID_COND_MRKT_DIV_CODE: 'W', FID_COND_SCR_DIV_CODE: '16449', FID_INPUT_ISCD: '0000', FID_DIV_CLS_CODE: '0', FID_RANK_SORT_CLS_CODE: '0', FID_ETC_CLS_CODE: '0' } },
            { tid: 'FHPST01710000', p: { FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '0001', FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000', FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: dateStr } },
            { tid: 'FHPST01710000', p: { FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20171', FID_INPUT_ISCD: '1001', FID_DIV_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000', FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: dateStr } },
            { tid: 'FHPST01700000', p: { FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20170', FID_INPUT_ISCD: '0001', FID_RANK_SORT_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000', FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: dateStr } },
            { tid: 'FHPST01700000', p: { FID_COND_MRKT_DIV_CODE: 'J', FID_COND_SCR_DIV_CODE: '20170', FID_INPUT_ISCD: '1001', FID_RANK_SORT_CLS_CODE: '0', FID_BLNG_CLS_CODE: '0', FID_TRGT_CLS_CODE: '111111111', FID_TRGT_EXLS_CLS_CODE: '000000', FID_INPUT_PRICE_1: '', FID_INPUT_PRICE_2: '', FID_VOL_CNT: '', FID_INPUT_DATE_1: dateStr } }
          ];
          const resArr = await Promise.all(endpoints.map(e =>
            axios.get(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/${e.tid === 'FHPTJ04400000' ? 'foreign-institution-total' : (e.tid === 'FHPST01710000' ? 'volume-rank' : 'fluctuation-rank')}`, {
              headers: { authorization: `Bearer ${token}`, appkey: APP_KEY.trim(), appsecret: APP_SECRET.trim(), tr_id: e.tid, custtype: 'P' },
              params: e.p
            }).catch(() => ({ data: { output: [] } }))
          ));
          resArr.forEach(r => add(r.data.output));
        };

        const { today, yesterday } = getLatestBusinessDay();
        await fetchRank(today);
        if (candidateMap.size < 30) await fetchRank(yesterday);
        if (candidateMap.size < 10) await fetchRank('');
        candidates = Array.from(candidateMap.values()).slice(0, 450);
      }

      if (mode !== 'my' && !serverDataSuccess && candidates.length === 0) {
        setStocks([]); setLoading(false); return;
      }

      const nextDataMap = new Map();
      const results = [];
      const analysisList = [];
      let found = 0;

      // Always scan myStocks for badges/alerts, plus candidates if no server data
      let monitorList = [];
      if (mode === 'my') {
        monitorList = myStocks;
      } else {
        const otherStocks = serverDataSuccess ? [] : candidates;
        // Merge without duplicates
        const combined = [...otherStocks];
        myStocks.forEach(ms => {
          if (!combined.find(c => c.code === ms.code)) combined.push(ms);
        });
        monitorList = combined;
      }

      for (let i = 0; i < monitorList.length; i++) {
        const stock = monitorList[i];
        if (i % 5 === 0) setScanProgress(Math.round(((i + 1) / monitorList.length) * 100));

        const daily = await getMarketData(stock.code);
        if (daily && daily.length > 0) {
          const fStreak = analyzeStreak(daily, '2');
          const iStreak = analyzeStreak(daily, '1');
          const price = parseInt(daily[0].stck_clpr);
          // Store last 5 days net buy data for UI trend display
          const history = daily.slice(0, 5).map(d => ({
            f: parseInt(d.fgnn_ntby_qty || 0),
            i: parseInt(d.orgn_ntby_qty || 0)
          }));
          const analyzedItem = { code: stock.code, name: stock.name, price, fStreak, iStreak, history };
          nextDataMap.set(stock.code, analyzedItem);

          const isMyStock = myStocks.find(ms => ms.code === stock.code);
          const isDanger = fStreak <= -1 || iStreak <= -1; // TEST: Lowered to 1 day

          if (isMyStock || mode === 'my') {
            analysisList.push({
              ...analyzedItem, isDanger,
              analysis: {
                foreigner: { buy: fStreak > 0 ? fStreak : 0, sell: fStreak < 0 ? Math.abs(fStreak) : 0 },
                institution: { buy: iStreak > 0 ? iStreak : 0, sell: iStreak < 0 ? Math.abs(iStreak) : 0 }
              }
            });
          }
          if (mode !== 'my' && !serverDataSuccess) {
            const streak = (investor === '2' ? fStreak : iStreak);
            const isMatch = (mode === 'buy' && streak >= 3) || (mode === 'sell' && streak <= -3);
            if (isMatch) {
              found++; setFoundCount(found);
              results.push({ ...analyzedItem, streak: Math.abs(streak) });
            }
          }
        }
        await new Promise(r => setTimeout(r, 70));
      }

      // --- ALERTS ---
      const dangerMsgs = [];
      const nowKst = new Date(new Date().getTime() + (9 * 60 * 60 * 1000) + (new Date().getTimezoneOffset() * 60000));
      const todayStr = nowKst.toISOString().split('T')[0];
      const isMarketStarted = nowKst.getHours() >= 9;

      for (const s of analysisList) {
        if (!s.isDanger) continue;
        const { foreigner, institution } = s.analysis;
        const stockSignals = [];
        const notifyIfNecessary = async (type, count) => {
          stockSignals.push(`${type}${count}일연속매도`);
          if (isNotificationEnabled && isMarketStarted) {
            const storageKey = `@notif_${s.code}_${type}`;
            const lastDate = await AsyncStorage.getItem(storageKey);
            if (lastDate !== todayStr) {
              Notifications.scheduleNotificationAsync({
                content: { title: '⚠️ MY 종목 리스크 포착!', body: `${s.name} ${type} ${count}일 연속 매매 이탈 중`, sound: true },
                trigger: null,
              });
              await AsyncStorage.setItem(storageKey, todayStr);
            }
          }
        };
        if (foreigner.sell >= 1) await notifyIfNecessary('외인', foreigner.sell);
        if (institution.sell >= 1) await notifyIfNecessary('기관', institution.sell);
        if (stockSignals.length > 0) dangerMsgs.push(`${s.name}(${stockSignals.join(',')})`);
      }
      setDangerAlert(dangerMsgs.length > 0 ? `매도주의: ${dangerMsgs.join(' / ')}` : null);

      // --- BUY OPPORTUNITY ALERTS ---
      const oppMsgs = [];
      for (const s of analysisList) {
        const { foreigner, institution } = s.analysis;
        if (foreigner.buy >= 1) oppMsgs.push(`${s.name} 외인 ${foreigner.buy}일 매수`);
        if (institution.buy >= 1) oppMsgs.push(`${s.name} 기관 ${institution.buy}일 매수`);
      }
      // Send buy opportunity alert (once per day per stock)
      if (oppMsgs.length > 0 && isNotificationEnabled && isMarketStarted) {
        for (const msg of oppMsgs) {
          const oppKey = `@opp_${msg.split(' ')[0]}_${todayStr}`;
          const alreadySent = await AsyncStorage.getItem(oppKey);
          if (!alreadySent) {
            Notifications.scheduleNotificationAsync({
              content: { title: '🎯 매수 기회 포착!', body: msg, sound: true },
              trigger: null,
            });
            await AsyncStorage.setItem(oppKey, 'sent');
          }
        }
      }

      // Always update myAnalysis state so badges and banners work in any mode
      setMyAnalysis(analysisList);

      if (mode === 'my') {
        marketStore.current.lastMyScan = Date.now();
      } else {
        marketStore.current = { ...marketStore.current, data: nextDataMap, lastScan: Date.now() };
        if (!serverDataSuccess) setStocks(results.sort((a, b) => b.streak - a.streak));
      }
    } catch (e) {
      console.error(e);
      Alert.alert('오류', '데이터 분석 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [mode, investor, myStocks, isNotificationEnabled]);

  // Initial Fetch & Refresh (Combined Logic)
  useEffect(() => {
    fetchDirectData();
  }, [mode, investor]);

  // Refresh interval (24/7 Scan)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDirectData();
    }, 60 * 1000 * 15); // 15 min (aligned with server & background task)
    return () => clearInterval(interval);
  }, [fetchDirectData]);


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {dangerAlert && (
        <TouchableOpacity style={styles.dangerBanner} onPress={() => setReportVisible(true)}>
          <View style={styles.dangerIconBox}>
            <AlertTriangle size={18} color="#fff" strokeWidth={3} />
          </View>
          <View style={styles.dangerTextBox}>
            <Text style={styles.dangerTitleText}>⚠️ 긴급 위험 감지</Text>
            <Text style={styles.dangerBannerText} numberOfLines={1}>{dangerAlert}</Text>
          </View>
          <TouchableOpacity onPress={() => setDangerAlert(null)} style={styles.closeDangerBtn}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <ImageBackground source={require('./assets/banner.png')} style={styles.bannerContainer} resizeMode="cover">
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerBrandText}>Money Fact (Direct)</Text>
          <Text style={{ fontSize: 10, color: '#3182F6', fontWeight: 'bold' }}>v1.0.8-Test</Text>
        </View>
      </ImageBackground>

      <View style={styles.modeTabs}>
        <TouchableOpacity style={[styles.modeTab, mode === 'buy' && styles.modeTabActiveBuy]} onPress={() => setMode('buy')}>
          <TrendingUp size={14} color={mode === 'buy' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'buy' && styles.modeTextActive]}>BUY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'sell' && styles.modeTabActiveSell]} onPress={() => setMode('sell')}>
          <TrendingDown size={14} color={mode === 'sell' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'sell' && styles.modeTextActive]}>SELL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'my' && styles.modeTabActiveMy]} onPress={() => setMode('my')}>
          <Star size={14} color={mode === 'my' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'my' && styles.modeTextActive]}>MY</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {mode !== 'my' && (
          <View style={styles.stickySection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {['2', '1'].map((v, i) => { // Removed '0' (Total) as it's complex to calc direct
                const labels = ['외국인', '기관'];
                return (
                  <TouchableOpacity key={v} style={[styles.chip, investor === v && styles.chipActive]} onPress={() => setInvestor(v)}>
                    <Text style={[styles.chipText, investor === v && styles.chipTextActive]}>{labels[i]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.listContainer}>
          <View style={styles.statusBar}>
            <View style={styles.dot} />
            <Text style={styles.statusText}>
              {loading ? '⚡ KIS 직접 연결 중...' : '✅ 실시간 데이터 수신 완료'}
            </Text>
          </View>

          {mode === 'my' && (
            <TouchableOpacity style={styles.addStockBtn} onPress={() => setSearchVisible(true)}>
              <Plus size={18} color="#3182F6" />
              <Text style={styles.addStockBtnText}>내 종목 추가</Text>
            </TouchableOpacity>
          )}

          {!loading && mode !== 'my' && stocks.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: '#888', textAlign: 'center' }}>조건에 맞는 종목이 없습니다.{"\n"}(가장 최근 마감 데이터를 분석 중입니다.)</Text>
            </View>
          )}

          {mode !== 'my' && stocks.map((item) => (
            <View key={item.code} style={styles.stockCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stockName}>{item.name}</Text>
                <Text style={styles.stockStreak}>{item.streak}일 연속 {mode === 'buy' ? '매집' : '이탈'} 🔥</Text>
              </View>
              <Text style={styles.stockPrice}>{item.price.toLocaleString()}원</Text>
            </View>
          ))}

          {mode === 'my' && myStocks.map((item) => {
            const analysis = myAnalysis.find(a => a.code === item.code);
            const a = analysis?.analysis;
            return (
              <View key={item.code} style={[styles.stockCard, styles.stockCardMy, analysis?.isDanger && styles.stockCardDanger]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeStock(item.code)}><Trash2 size={16} color="#F04452" /></TouchableOpacity>
                  </View>
                  {analysis && <Text style={styles.stockPriceMy}>{analysis.price.toLocaleString()}원</Text>}
                  {a && (
                    <View style={styles.badgeGrid}>
                      {a.foreigner.buy >= 1 && <View style={[styles.statusTag, styles.tagBuy]}><Text style={styles.tagText}>외인 {a.foreigner.buy}일 매수 ↑</Text></View>}
                      {a.foreigner.sell >= 1 && <View style={[styles.statusTag, styles.tagSell]}><Text style={styles.tagText}>외인 {a.foreigner.sell}일 매도 ↓</Text></View>}
                      {a.institution.buy >= 1 && <View style={[styles.statusTag, styles.tagBuy]}><Text style={styles.tagText}>기관 {a.institution.buy}일 매수 ↑</Text></View>}
                      {a.institution.sell >= 1 && <View style={[styles.statusTag, styles.tagSell]}><Text style={styles.tagText}>기관 {a.institution.sell}일 매도 ↓</Text></View>}
                    </View>
                  )}
                  {analysis?.history && (
                    <View style={styles.trendContainer}>
                      <View style={styles.trendRow}>
                        <Text style={styles.trendLabel}>외인</Text>
                        <View style={styles.trendBars}>
                          {analysis.history.map((h, idx) => (
                            <View key={`f-${idx}`} style={[styles.trendDot, h.f > 0 ? styles.dotBuy : (h.f < 0 ? styles.dotSell : styles.dotNeutral)]} />
                          ))}
                        </View>
                      </View>
                      <View style={styles.trendRow}>
                        <Text style={styles.trendLabel}>기관</Text>
                        <View style={styles.trendBars}>
                          {analysis.history.map((h, idx) => (
                            <View key={`i-${idx}`} style={[styles.trendDot, h.i > 0 ? styles.dotBuy : (h.i < 0 ? styles.dotSell : styles.dotNeutral)]} />
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          {/* MY Mode Sync Section */}
          {mode === 'my' && (
            <View style={styles.syncCard}>
              <Text style={styles.syncTitle}>☁️ 종목 클라우드 키(Key) 백업</Text>
              <Text style={styles.syncDesc}>앱을 새로 깔아도 고유 키(Key)만 있으면 바로 복구됩니다.</Text>
              <View style={styles.syncInputRow}>
                <TextInput
                  style={styles.syncInput}
                  placeholder="나만의 보안 키 (예: mysecret7)"
                  value={syncKey}
                  onChangeText={saveSyncKey}
                />
                <TouchableOpacity style={styles.syncCheckBtn} onPress={checkSyncKey}>
                  <Text style={styles.syncCheckBtnText}>중복확인</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.syncBtnRow}>
                <TouchableOpacity style={[styles.syncBtn, { backgroundColor: '#3182F6' }]} onPress={handleBackup}>
                  <Text style={styles.syncBtnText}>서버에 저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.syncBtn, { backgroundColor: '#6227FF' }]} onPress={handleRestore}>
                  <Text style={styles.syncBtnText}>데이터 복구</Text>
                </TouchableOpacity>
              </View>
              {isSyncing && <ActivityIndicator size="small" color="#3182F6" style={{ marginTop: 10 }} />}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Search Modal (Same as before) */}
      <Modal visible={searchVisible} animationType="slide" transparent={true} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <View style={styles.searchSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>종목 검색</Text>
                <TouchableOpacity onPress={() => setSearchVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
              </View>
              <TextInput style={styles.searchInput} placeholder="종목명 입력" value={searchKeyword} onChangeText={searchStock} autoFocus />
              <ScrollView style={{ maxHeight: 300 }}>
                {searchResults.map(s => (
                  <TouchableOpacity key={s.code} style={styles.searchResultItem} onPress={() => addStock(s)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultName}>{s.name}</Text>
                      <Text style={styles.searchResultCode}>{s.code}</Text>
                    </View>
                    <View style={styles.plusCircle}>
                      <Plus size={16} color="#3182F6" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3182F6" />
          <Text style={{ marginTop: 15, fontWeight: 'bold', color: '#191F28', fontSize: 16 }}>
            ⚡ KIS 데이터 분석 중... ({scanProgress}%)
          </Text>
          <Text style={{ marginTop: 8, color: '#4E5968', fontSize: 14 }}>
            {foundCount > 0 ? `🔥 현재까지 ${foundCount}개 종목 포착!` : '시장의 모든 수급을 훑고 있습니다.'}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
            (약 450개 종목 전수 조사 중)
          </Text>
        </View>
      )}
    </View>
  );
}

export default function App() { return <SafeAreaProvider><MainApp /></SafeAreaProvider>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  dangerBanner: { backgroundColor: '#FF4D4D', flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 15, marginTop: 10, borderRadius: 16, gap: 12, elevation: 8, shadowColor: '#FF4D4D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  dangerIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 },
  dangerTextBox: { flex: 1 },
  dangerTitleText: { color: '#fff', fontSize: 10, fontWeight: '900', marginBottom: 2, opacity: 0.9 },
  dangerBannerText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  closeDangerBtn: { padding: 4 },
  dangerBannerTextLegacy: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '700' },
  bannerContainer: { width: '100%', height: 60, justifyContent: 'center', alignItems: 'center' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  bannerBrandText: { fontSize: 22, fontWeight: '900', color: '#3182F6', letterSpacing: -1 },
  modeTabs: { flexDirection: 'row', backgroundColor: '#EEE', marginHorizontal: 15, marginVertical: 10, borderRadius: 12, padding: 4 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 9, gap: 6 },
  modeTabActiveBuy: { backgroundColor: '#3182F6' },
  modeTabActiveSell: { backgroundColor: '#F04452' },
  modeTabActiveMy: { backgroundColor: '#6227FF' },
  modeTabText: { fontSize: 13, fontWeight: '900', color: '#888' },
  modeTextActive: { color: '#fff' },
  stickySection: { backgroundColor: '#F4F7FB', paddingBottom: 10 },
  chipScroll: { paddingHorizontal: 15, marginBottom: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#fff', borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#E5E8EB' },
  chipActive: { backgroundColor: '#3182F6', borderColor: '#3182F6' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#4E5968' },
  chipTextActive: { color: '#fff' },
  listContainer: { paddingHorizontal: 15, paddingTop: 10, backgroundColor: '#F4F7FB' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3182F6' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#4E5968' },
  addStockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#3182F6', borderStyle: 'dashed', marginBottom: 15 },
  addStockBtnText: { fontSize: 14, fontWeight: '800', color: '#3182F6' },
  stockCard: { backgroundColor: '#fff', padding: 18, borderRadius: 22, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  stockCardDanger: { borderWidth: 2, borderColor: '#F04452', backgroundColor: '#FFF5F5' },
  stockName: { fontSize: 16, fontWeight: '800', color: '#191F28' },
  stockStreak: { fontSize: 11, fontWeight: '900', color: '#3182F6', marginTop: 3 },
  stockPrice: { fontSize: 16, fontWeight: '800', color: '#191F28' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  searchSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#191F28' },
  searchInput: { padding: 14, fontSize: 16, fontWeight: '600', color: '#191F28', backgroundColor: '#F4F7FB', borderRadius: 14, marginBottom: 15 },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F2F4F6' },
  searchResultName: { fontSize: 15, fontWeight: '700', color: '#191F28' },
  searchResultCode: { fontSize: 12, color: '#888' },
  // MY Tab Styles
  stockCardMy: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  stockPriceMy: { fontSize: 14, fontWeight: '700', color: '#4E5968', marginTop: 4 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badgeBuy: { backgroundColor: '#EBF4FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeBuyText: { fontSize: 11, fontWeight: '800', color: '#3182F6' },
  badgeSell: { backgroundColor: '#FFF0F0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeSellText: { fontSize: 11, fontWeight: '800', color: '#F04452' },
  badgeNeutralText: { fontSize: 11, fontWeight: '700', color: '#888' },
  // Trend Styles
  trendContainer: { marginTop: 12, padding: 10, backgroundColor: '#F8F9FA', borderRadius: 12 },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  trendLabel: { width: 35, fontSize: 11, fontWeight: '800', color: '#4E5968' },
  trendBars: { flexDirection: 'row', gap: 4 },
  trendDot: { width: 14, height: 6, borderRadius: 3 },
  dotBuy: { backgroundColor: '#3182F6' },
  dotSell: { backgroundColor: '#F04452' },
  dotNeutral: { backgroundColor: '#D1D6DB' },
  // Status Tags
  statusTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
  tagBuy: { backgroundColor: '#3182F6' },
  tagSell: { backgroundColor: '#F04452' },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  // Sync Styles
  syncCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20, borderTopWidth: 4, borderTopColor: '#3182F6' },
  syncTitle: { fontSize: 16, fontWeight: '900', color: '#191F28', marginBottom: 5 },
  syncDesc: { fontSize: 12, color: '#888', marginBottom: 15 },
  syncInputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  syncInput: { flex: 1, backgroundColor: '#F4F7FB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, fontWeight: '600' },
  syncCheckBtn: { backgroundColor: '#E5E8EB', paddingHorizontal: 12, borderRadius: 12, justifyContent: 'center' },
  syncCheckBtnText: { fontSize: 12, fontWeight: '700', color: '#4E5968' },
  syncBtnRow: { flexDirection: 'row', gap: 10 },
  syncBtn: { flex: 1, paddingVertical: 14, borderRadius: 15, alignItems: 'center' },
  syncBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  plusCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EBF4FF', alignItems: 'center', justifyContent: 'center' }
});
