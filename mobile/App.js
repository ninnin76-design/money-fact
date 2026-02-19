
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, StatusBar, ActivityIndicator, Dimensions, Alert,
  Platform, Switch, LogBox, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp, TrendingDown, Star, Search, Plus, Trash2,
  AlertTriangle, Settings, RefreshCcw, CloudUpload, Download, User, X
} from 'lucide-react-native';

// Services & Components
import axios from 'axios';
import { AuthService } from './src/services/AuthService';
import { StockService } from './src/services/StockService';
import { StorageService } from './src/services/StorageService';
import Ticker from './src/components/Ticker';
import Thermometer from './src/components/Thermometer';
import SectorHeatmap from './src/components/SectorHeatmap';
import StockCard from './src/components/StockCard';
import { BACKGROUND_TASK_NAME, STORAGE_KEYS } from './src/constants/Config';
import { ALL_STOCKS } from './src/constants/StockData';

const MARKET_WATCH_STOCKS = [
  // 반도체 (10)
  { name: '삼성전자', code: '005930', sector: '반도체' }, { name: 'SK하이닉스', code: '000660', sector: '반도체' },
  { name: 'HPSP', code: '403870', sector: '반도체' }, { name: '한미반도체', code: '042700', sector: '반도체' },
  { name: '제주반도체', code: '080220', sector: '반도체' }, { name: '리노공업', code: '058470', sector: '반도체' },
  { name: '가온칩스', code: '399720', sector: '반도체' }, { name: '주성엔지니어링', code: '036930', sector: '반도체' },
  { name: '이오테크닉스', code: '039030', sector: '반도체' }, { name: 'ISC', code: '095340', sector: '반도체' },

  // 2차전지 (10)
  { name: 'LG에너지솔루션', code: '373220', sector: '2차전지' }, { name: 'POSCO홀딩스', code: '005490', sector: '2차전지' },
  { name: '삼성SDI', code: '006400', sector: '2차전지' }, { name: '에코프로비엠', code: '247540', sector: '2차전지' },
  { name: '에코프로', code: '086520', sector: '2차전지' }, { name: '엘앤에프', code: '066970', sector: '2차전지' },
  { name: '금양', code: '001570', sector: '2차전지' }, { name: '포스코퓨처엠', code: '003670', sector: '2차전지' },
  { name: '엔켐', code: '348370', sector: '2차전지' }, { name: '레이크머티리얼즈', code: '281740', sector: '2차전지' },

  // 바이오 (10)
  { name: '삼성바이오로직스', code: '207940', sector: '바이오' }, { name: '셀트리온', code: '068270', sector: '바이오' },
  { name: 'HLB', code: '028300', sector: '바이오' }, { name: '알테오젠', code: '196170', sector: '바이오' },
  { name: '유한양행', code: '000100', sector: '바이오' }, { name: '한미약품', code: '128940', sector: '바이오' },
  { name: '에스티팜', code: '237690', sector: '바이오' }, { name: '리가켐바이오', code: '141080', sector: '바이오' },
  { name: '휴젤', code: '145020', sector: '바이오' }, { name: '삼천당제약', code: '000250', sector: '바이오' },

  // 자동차 (6)
  { name: '현대차', code: '005380', sector: '자동차' }, { name: '기아', code: '000270', sector: '자동차' },
  { name: '현대모비스', code: '012330', sector: '자동차' }, { name: 'HL만도', code: '204320', sector: '자동차' },
  { name: '현대위아', code: '011210', sector: '자동차' }, { name: '서연이화', code: '200880', sector: '자동차' },

  // 로봇 (6)
  { name: '레인보우로보틱스', code: '277810', sector: '로봇' }, { name: '두산로보틱스', code: '454910', sector: '로봇' },
  { name: '루닛', code: '328130', sector: '로봇' }, { name: '뷰노', code: '338220', sector: '로봇' },
  { name: '마음AI', code: '377480', sector: '로봇' }, { name: '엔젤로보틱스', code: '455390', sector: '로봇' },

  // 금융 (6)
  { name: 'KB금융', code: '105560', sector: '금융' }, { name: '신한지주', code: '055550', sector: '금융' },
  { name: '하나금융지주', code: '086790', sector: '금융' }, { name: '삼성생명', code: '032830', sector: '금융' },
  { name: '메리츠금융지주', code: '138040', sector: '금융' }, { name: '포스코인터내셔널', code: '047050', sector: '금융' },

  // IT/플랫폼/엔터 (5)
  { name: 'NAVER', code: '035420', sector: '플랫폼' }, { name: '카카오', code: '035720', sector: '플랫폼' },
  { name: '하이브', code: '352820', sector: '엔터' }, { name: 'JYP Ent.', code: '035900', sector: '엔터' },
  { name: '에스엠', code: '041510', sector: '엔터' },

  // 중공업/방산/화학 (7)
  { name: '포스코DX', code: '022100', sector: '기계' }, { name: 'LS ELECTRIC', code: '010120', sector: '기계' },
  { name: 'LG화학', code: '051910', sector: '화학' }, { name: '한화에어로스페이스', code: '012450', sector: '방산' },
  { name: '현대로템', code: '064350', sector: '방산' }, { name: '두산에너빌리티', code: '034020', sector: '에너지' },
  { name: 'LIG넥스원', code: '079550', sector: '방산' },
];

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreAllLogs();

// --- Notification Config ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- Background Task ---
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
      // [코다리 부장 터치] 장외 시간에는 백그라운드도 푹 쉬어야죠! 배터리 절약!
      if (!StockService.isMarketOpen()) return BackgroundFetch.BackgroundFetchResult.NoData;

      const rawStocks = await AsyncStorage.getItem(STORAGE_KEYS.MY_STOCKS);
      if (!rawStocks) return BackgroundFetch.BackgroundFetchResult.NoData;

      const notifEnabled = await AsyncStorage.getItem(STORAGE_KEYS.NOTIF_ENABLED);
      if (notifEnabled === 'false') return BackgroundFetch.BackgroundFetchResult.NoData;

      const myStocks = JSON.parse(rawStocks);

      const rawHistory = await AsyncStorage.getItem(STORAGE_KEYS.NOTIF_HISTORY);
      let history = rawHistory ? JSON.parse(rawHistory) : {};
      const today = new Date().toISOString().split('T')[0];
      let hasNewData = false;

      for (const stock of myStocks) {
        const data = await StockService.getInvestorData(stock.code);
        if (data && data.length > 0) {
          const { fStreak, iStreak } = StockService.analyzeSupply(data);
          const currentPrice = parseInt(data[0].stck_clpr || 0);
          const vwap = StockService.calculateVWAP(data, 3);
          const isHiddenAcc = StockService.checkHiddenAccumulation(data);

          const currentStatus = `${fStreak}|${iStreak}`;
          if (!history[stock.code]) {
            history[stock.code] = { streak: '', vwapDate: '', hiddenDate: '', streakDate: '' };
          }

          // 1. Streak Alert (Once per day unless status flips significantly)
          // Only alert if streaks are severe (>=3) AND (different status OR first time today)
          if ((Math.abs(fStreak) >= 3 || Math.abs(iStreak) >= 3)) {
            if (history[stock.code].streak !== currentStatus && history[stock.code].streakDate !== today) {
              const type = fStreak >= 3 || iStreak >= 3 ? "🎯 매수 기회" : "⚠️ 매도 경고";
              await Notifications.scheduleNotificationAsync({
                content: { title: `Money Fact: ${stock.name}`, body: `${stock.name} ${type} 기류 포착 (${fStreak}/${iStreak})` },
                trigger: null,
              });
              history[stock.code].streak = currentStatus;
              history[stock.code].streakDate = today;
              hasNewData = true;
            }
          }

          // 2. Value Buy Zone Alert (Once per day)
          if (vwap > 0 && currentPrice < vwap * 0.95 && history[stock.code].vwapDate !== today) {
            await Notifications.scheduleNotificationAsync({
              content: { title: "💸 세력보다 싸게 살 기회!", body: `${stock.name}: 세력평단(${vwap.toLocaleString()}원)보다 5% 이상 저렴!` },
              trigger: null,
            });
            history[stock.code].vwapDate = today;
            hasNewData = true;
          }

          // 3. Hidden Accumulation Alert (Once per day)
          if (isHiddenAcc && history[stock.code].hiddenDate !== today) {
            await Notifications.scheduleNotificationAsync({
              content: { title: "🤫 조용한 매집 포착", body: `${stock.name}: 주가는 조용하지만 세력이 몰래 사고 있어요.` },
              trigger: null,
            });
            history[stock.code].hiddenDate = today;
            hasNewData = true;
          }
        }
      }

      // --- [New] Check Watch List for Suspicious Accumulation (All Stocks) ---
      // Filter out stocks already in my list to avoid duplicate checks
      const watchList = MARKET_WATCH_STOCKS.filter(ws => !myStocks.some(ms => ms.code === ws.code));

      // Limit check to avoid timeout (check first 10 or randomize, but here we do all watch list ~30 items)
      for (const stock of watchList) {
        try {
          const data = await StockService.getInvestorData(stock.code);
          if (data && data.length > 0) {
            const isHiddenAcc = StockService.checkHiddenAccumulation(data);

            if (isHiddenAcc) {
              if (!history[stock.code]) history[stock.code] = { streak: '', vwapDate: '', hiddenDate: '' };

              if (history[stock.code].hiddenDate !== today) {
                await Notifications.scheduleNotificationAsync({
                  content: { title: "🤫 [시장감시] 조용한 매집 포착", body: `${stock.name}: 시장 주도 섹터에서 세력 매집 포착!` },
                  trigger: null,
                });
                history[stock.code].hiddenDate = today;
                hasNewData = true;
              }
            }
          }
        } catch (e) { }
      }

      if (hasNewData) {
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIF_HISTORY, JSON.stringify(history));
        return BackgroundFetch.BackgroundFetchResult.NewData;
      }
      return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (err) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('home'); // home, list, my, settings
  const [loading, setLoading] = useState(false);
  const [myStocks, setMyStocks] = useState([]);
  const [analyzedStocks, setAnalyzedStocks] = useState([]);
  const [tickerItems, setTickerItems] = useState(["전체 시장 매수세가 강해지고 있습니다", "반도체 섹터 자금 유입 중"]);
  const [syncKey, setSyncKey] = useState('');
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [investorType, setInvestorType] = useState('INSTITUTION'); // INSTITUTION, FOREIGN, ALL
  const [tradingType, setTradingType] = useState('BUY'); // BUY, SELL
  const [suggestions, setSuggestions] = useState([]);
  const [isMarketOpen, setIsMarketOpen] = useState(StockService.isMarketOpen());
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const isRefreshing = useRef(false);

  // Sample Sectors
  const [sectors, setSectors] = useState([
    { name: '반도체', flow: 0 },
    { name: '2차전지', flow: 0 },
    { name: '바이오', flow: 0 },
    { name: '자동차', flow: 0 },
    { name: '금융', flow: 0 },
    { name: '로봇', flow: 0 },
  ]);
  const [detailedInstFlow, setDetailedInstFlow] = useState({ pnsn: 0, ivtg: 0, ins: 0 });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Hybrid Loading Stage 1: Fast data
    const stocks = await StorageService.loadMyStocks();
    setMyStocks(stocks);

    // [코다리 부장 터치] 앱 켤 때 섹터, 수급 금액까지 전재산(Full Snapshot)을 한 번에 복원합니다!
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_ANALYSIS);
    if (cached) {
      try {
        const fullData = JSON.parse(cached);
        // 옛날 방식(배열만 저장)과 새 방식(객체 저장) 모두 대응하는 지능형 복구!
        if (Array.isArray(fullData)) {
          setAnalyzedStocks(fullData);
        } else {
          setAnalyzedStocks(fullData.stocks || []);
          if (fullData.sectors) setSectors(fullData.sectors);
          if (fullData.instFlow) setDetailedInstFlow(fullData.instFlow);
          if (fullData.updateTime) setLastUpdate(fullData.updateTime);
        }
      } catch (e) { }
    }

    const key = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_NICKNAME);
    if (key) setSyncKey(key);

    const notif = await AsyncStorage.getItem(STORAGE_KEYS.NOTIF_ENABLED);
    setPushEnabled(notif !== 'false');

    setIsMarketOpen(StockService.isMarketOpen());

    // Stage 2: Deferred detailed analysis
    setTimeout(() => {
      refreshData(stocks);
    }, 500);

    setupBackground();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const open = StockService.isMarketOpen();
      setIsMarketOpen(open);
      if (open && tab !== 'settings') {
        refreshData(undefined, true); // Silent refresh
      }
    }, 30000); // Auto refresh every 30s
    return () => clearInterval(timer);
  }, [tab, myStocks]);

  const setupBackground = async () => {
    if (Platform.OS === 'web') return;
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch (e) { }
  };

  const refreshData = async (targetStocks, silent = false) => {
    if (isRefreshing.current) return;

    // [코다리 부장 터치] 장종료 시간이라도 데이터가 아예 없다면(새로 깔았을 때) 한 번은 가져오게 허용!
    const hasData = analyzedStocks.length > 0;
    if (!StockService.isMarketOpen() && hasData) return;

    // 데이터가 없는 밤이라면 force 모드로 억지로라도 데이터를 긁어옵니다.
    const forceFetch = !StockService.isMarketOpen() && !hasData;

    isRefreshing.current = true;
    if (!silent) setLoading(true);

    // [코다리 부장 터치] 밤에 새로 깔았을 때는 서버 스냅샷을 한 방에 받아오는 게 최고!
    // 48개 종목 개별 호출 대신 서버가 이미 분석해둔 완성 데이터를 0.5초 만에 받아옵니다!
    if (forceFetch) {
      try {
        const { SERVER_URL } = require('./src/constants/Config');
        const snapshotRes = await axios.get(`${SERVER_URL}/api/snapshot`, { timeout: 15000 });
        if (snapshotRes.data && snapshotRes.data.status === 'READY') {
          const snap = snapshotRes.data;
          // 서버 스냅샷의 연속매매 데이터를 종목 리스트로 변환
          const serverStocks = [];
          const allBuy = { ...(snap.buyData || {}) };
          const allSell = { ...(snap.sellData || {}) };

          // buyData에서 종목 추출 (외국인+기관 합산)
          const seenCodes = new Set();
          Object.values(allBuy).forEach(list => {
            (list || []).forEach(item => {
              if (!seenCodes.has(item.code)) {
                seenCodes.add(item.code);
                serverStocks.push({
                  name: item.name, code: item.code, price: parseInt(item.price || 0),
                  fStreak: item.streak || 0, iStreak: 0, sentiment: 50 + (item.streak || 0) * 10,
                  vwap: 0, isHiddenAccumulation: false
                });
              }
            });
          });
          Object.values(allSell).forEach(list => {
            (list || []).forEach(item => {
              if (!seenCodes.has(item.code)) {
                seenCodes.add(item.code);
                serverStocks.push({
                  name: item.name, code: item.code, price: parseInt(item.price || 0),
                  fStreak: -(item.streak || 0), iStreak: 0, sentiment: 50 - (item.streak || 0) * 10,
                  vwap: 0, isHiddenAccumulation: false
                });
              }
            });
          });

          if (serverStocks.length > 0) {
            setAnalyzedStocks(serverStocks);
            const timeStr = snap.updateTime
              ? new Date(snap.updateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '서버 캐시';
            setLastUpdate(timeStr);
            // 스냅샷 캐싱
            const snapshot = { stocks: serverStocks, sectors: sectors, instFlow: detailedInstFlow, updateTime: timeStr };
            AsyncStorage.setItem(STORAGE_KEYS.CACHED_ANALYSIS, JSON.stringify(snapshot));
            setLoading(false);
            isRefreshing.current = false;
            return; // 서버 데이터로 충분! 개별 KIS 호출 불필요!
          }
        }
      } catch (e) {
        console.log('[Snapshot] Server snapshot unavailable, falling back to KIS direct...', e.message);
      }
    }

    const results = [];
    // Analyze both user stocks and default market watch stocks
    const base = targetStocks || myStocks;
    const combined = [...base];

    // Add market watch stocks if not already in there
    MARKET_WATCH_STOCKS.forEach(ms => {
      if (!combined.find(c => c.code === ms.code)) {
        combined.push(ms);
      }
    });

    const tickerTexts = ["전체 시장 매수세가 강해지고 있습니다", "반도체 섹터 자금 유입 중"];
    const sectorMap = {};
    const instTotals = { pnsn: 0, ivtg: 0, ins: 0 };

    for (const stock of combined) {
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        const [data, livePrice] = await Promise.all([
          StockService.getInvestorData(stock.code, forceFetch),
          StockService.getCurrentPrice(stock.code, forceFetch)
        ]);

        if (data && data.length > 0) {
          const analysis = StockService.analyzeSupply(data);
          const vwap = StockService.calculateVWAP(data, 3);
          const hidden = StockService.checkHiddenAccumulation(data);
          const netBuy = StockService.getNetBuyAmount(data, 1, 'ALL');
          const pnsnBuy = StockService.getNetBuyAmount(data, 1, 'PNSN');
          const ivtgBuy = StockService.getNetBuyAmount(data, 1, 'IVTG');
          const insBuy = StockService.getNetBuyAmount(data, 1, 'INS');

          // Prioritize live price (ATS or KRX real-time) over daily close
          let currentPrice = 0;
          if (livePrice && livePrice.stck_prpr) {
            currentPrice = parseInt(livePrice.stck_prpr);
          } else {
            currentPrice = parseInt(data[0].stck_clpr || 0);
          }

          // Auto-fix stock names that were registered by code only
          let stockName = stock.name;
          if (stock.name.startsWith('종목(') && livePrice && livePrice.hts_kor_isnm) {
            stockName = livePrice.hts_kor_isnm.trim();
            // Persist the corrected name
            const idx = myStocks.findIndex(s => s.code === stock.code);
            if (idx >= 0) {
              const updatedStocks = [...myStocks];
              updatedStocks[idx] = { ...updatedStocks[idx], name: stockName };
              setMyStocks(updatedStocks);
              StorageService.saveMyStocks(updatedStocks);
            }
          }

          results.push({
            ...stock,
            name: stockName,
            ...analysis,
            vwap,
            isHiddenAccumulation: hidden,
            price: currentPrice
          });

          if (stock.sector) {
            sectorMap[stock.sector] = (sectorMap[stock.sector] || 0) + netBuy;
          }

          // Sum inst sub-types (Market monitor focus)
          instTotals.pnsn += pnsnBuy;
          instTotals.ivtg += ivtgBuy;
          instTotals.ins += insBuy;

          // Ticker logic for MY stocks only
          const isMyStock = base.some(bs => bs.code === stock.code);
          if (isMyStock) {
            if (analysis.fStreak >= 3) tickerTexts.push(`🚀 ${stock.name}: 외인 ${analysis.fStreak}일 연속 매집 중!`);
            if (analysis.iStreak >= 3) tickerTexts.push(`🏛️ ${stock.name}: 기관 ${analysis.iStreak}일 연속 러브콜!`);
            const price = parseInt(data[0].stck_clpr || 0);
            if (vwap > 0 && price < vwap * 0.97) tickerTexts.push(`💎 ${stock.name}: 세력평단 대비 저평가 구간 진입!`);
            if (hidden) tickerTexts.push(`🤫 ${stock.name}: 수상한 매집 정황 포착!`);
          }
        } else {
          results.push({ ...stock, fStreak: 0, iStreak: 0, sentiment: 50, vwap: 0, price: 0, isHiddenAccumulation: false });
        }
      } catch (e) {
        results.push({ ...stock, fStreak: 0, iStreak: 0, sentiment: 50, vwap: 0, price: 0, isHiddenAccumulation: false, error: true });
      }
    }
    setAnalyzedStocks(results);

    // Finalize sectors (Convert raw KRW to 100M units)
    const updatedSectors = Object.entries(sectorMap).map(([name, rawFlow]) => {
      const flow = Math.round(rawFlow / 100000000);
      return { name, flow };
    });

    if (updatedSectors.length > 0) {
      setSectors(updatedSectors.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6));
    }
    // Round inst sub-types to billion KRW
    const roundedInstTotals = {
      pnsn: Math.round(instTotals.pnsn / 100000000),
      ivtg: Math.round(instTotals.ivtg / 100000000),
      ins: Math.round(instTotals.ins / 100000000),
    };
    setDetailedInstFlow(roundedInstTotals);

    if (tickerTexts.length > 2) setTickerItems(tickerTexts);
    const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastUpdate(timeStr);
    // [코다리 부장 터치] 분석된 모든 보물들(종목, 섹터, 기관수급)을 금고에 통째로 저장!
    if (results.length > 0) {
      const snapshot = {
        stocks: results,
        sectors: updatedSectors.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6),
        instFlow: roundedInstTotals,
        updateTime: timeStr
      };
      AsyncStorage.setItem(STORAGE_KEYS.CACHED_ANALYSIS, JSON.stringify(snapshot));
    }

    setLoading(false);
    isRefreshing.current = false;
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      // 1. Local Search
      const localFiltered = ALL_STOCKS.filter(s =>
        s.name.toLowerCase().includes(text.toLowerCase()) || s.code.includes(text)
      );

      // 2. Server Search (If local is empty or few results)
      if (localFiltered.length < 5 && !/^\d+$/.test(text)) {
        const serverResults = await StockService.searchStock(text);
        const combined = [...localFiltered];
        serverResults.forEach(ss => {
          if (!combined.some(c => c.code === ss.code)) {
            combined.push(ss);
          }
        });
        setSuggestions(combined.slice(0, 10));
      } else {
        setSuggestions(localFiltered.slice(0, 10));
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleAddStock = async (selected) => {
    let name, code;

    if (selected && selected.name) {
      name = selected.name;
      code = selected.code;
    } else {
      // 1. Local Check
      const found = ALL_STOCKS.find(s => s.name === searchQuery || s.code === searchQuery);
      if (found) {
        name = found.name;
        code = found.code;
      } else if (searchQuery.length === 6 && /^\d+$/.test(searchQuery)) {
        // 2. 6-digit Code Input
        code = searchQuery;
        try {
          const priceData = await StockService.getCurrentPrice(code);
          if (priceData && priceData.hts_kor_isnm) {
            name = priceData.hts_kor_isnm.trim();
          } else {
            name = `종목(${code})`;
          }
        } catch (e) {
          name = `종목(${code})`;
        }
      } else if (searchQuery.length >= 2) {
        // 3. Name Input -> Try Server Search
        setLoading(true);
        const serverResults = await StockService.searchStock(searchQuery);
        setLoading(false);
        if (serverResults.length > 0) {
          // If exactly one match or first one
          name = serverResults[0].name;
          code = serverResults[0].code;
        }
      }

      if (!code) {
        name = searchQuery;
        code = null;
      }
    }

    if (code) {
      const newStock = { code, name };
      const isAlreadyAdded = myStocks.some(s => s.code === code);
      if (isAlreadyAdded) {
        Alert.alert('알림', '이미 추가된 종목입니다.');
      } else {
        const updated = [...myStocks, newStock];
        setMyStocks(updated);
        StorageService.saveMyStocks(updated);
        refreshData(updated);
        setSearchQuery('');
        setSuggestions([]);
        setSearchModal(false);
      }
    } else {
      Alert.alert('검색 실패', '정확한 종목명이나 6자리 종목코드를 입력해주세요.');
    }
  };

  const handleCheckDuplicate = async () => {
    if (!syncKey) {
      Alert.alert('알림', '먼저 닉네임을 입력해주세요.');
      return;
    }
    const isTaken = await StorageService.checkNickname(syncKey);
    if (isTaken) {
      Alert.alert('중복 확인', '이미 사용 중인 닉네임입니다. 본인이라면 [가져오기]를, 아니라면 다른 키를 사용해 주세요.');
    } else {
      Alert.alert('중복 확인', '사용 가능한 닉네임입니다!');
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      await StorageService.backup(syncKey, myStocks);
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_NICKNAME, syncKey);
      Alert.alert('성공', '백업이 완료되었습니다.');
    } catch (e) {
      Alert.alert('오류', '백업 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const stocks = await StorageService.restore(syncKey);
      if (stocks && stocks.length > 0) {
        setMyStocks(stocks);
        StorageService.saveMyStocks(stocks);
        refreshData(stocks);
        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_NICKNAME, syncKey);
        Alert.alert('성공', '데이터를 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('알림', '해당 키에 저장된 데이터가 없습니다.');
      }
    } catch (e) {
      Alert.alert('오류', '데이터를 가져오지 못했습니다. 키를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStock = (code) => {
    Alert.alert(
      '종목 삭제',
      '이 종목을 목록에서 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const updated = myStocks.filter(s => s.code !== code);
            setMyStocks(updated);
            await StorageService.saveMyStocks(updated);
          }
        }
      ]
    );
  };

  const MarketStatusHeader = () => (
    <View style={[styles.marketHeader, isMarketOpen ? styles.marketOpenBg : styles.marketClosedBg]}>
      <View style={styles.marketInfo}>
        <View style={[styles.statusDot, isMarketOpen ? styles.dotOpen : styles.dotClosed]} />
        <View>
          <Text style={styles.marketStatusText}>
            {isMarketOpen ? "장중 - 실시간 대응 모드" : "장후 - 심층 분석 모드"}
          </Text>
          {lastUpdate && <Text style={styles.updateText}>{lastUpdate} 마지막 갱신</Text>}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.marketTimeText}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        {isMarketOpen && <Text style={styles.liveBadge}>LIVE</Text>}
      </View>
    </View>
  );

  const renderContent = () => {
    if (tab === 'home') {
      const fStrength = analyzedStocks.reduce((acc, s) => acc + (s.fStreak || 0), 0);
      const iStrength = analyzedStocks.reduce((acc, s) => acc + (s.iStreak || 0), 0);

      const getSentimentInfo = () => {
        if (isMarketOpen) {
          return {
            title: "급변하는 실시간 수급 현황",
            desc: `🔥 외국인(${fStrength > 0 ? '매수우위' : '매도우위'})과 기관(${iStrength > 0 ? '매수우위' : '매도우위'})이 현재 시장의 방향성을 결정하고 있습니다.`,
            temp: 50 + (fStrength * 2) + (iStrength * 2)
          };
        } else {
          return {
            title: "오늘의 시장 종합 심리",
            desc: `📅 금일 외국인은 ${fStrength > 0 ? '순매수' : '순매도'}를, 기관은 ${iStrength > 0 ? '순매수' : '순매도'}를 기록하며 장을 마감했습니다.`,
            temp: 50 + (fStrength * 2) + (iStrength * 2)
          };
        }
      };

      const info = getSentimentInfo();

      return (
        <ScrollView style={styles.scroll}>
          <MarketStatusHeader />
          <SectorHeatmap sectors={sectors} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{info.title}</Text>
            <View style={styles.row}>
              <Thermometer temperature={Math.max(10, Math.min(95, info.temp))} label={info.temp > 50 ? "매수세 강세" : "관망세 우세"} />
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{info.desc}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>나의 매집 의심 종목</Text>
          {analyzedStocks.filter(s => s.isHiddenAccumulation).map(s => (
            <StockCard key={s.code} stock={s} onPress={() => { setSelectedStock(s); setDetailModal(true); }} />
          ))}
          {analyzedStocks.filter(s => s.isHiddenAccumulation).length === 0 && <Text style={styles.emptyText}>현재 조용히 매집 중인 종목이 없습니다.</Text>}
        </ScrollView>
      );
    }
    if (tab === 'list') {
      const filtered = analyzedStocks.filter(s => {
        const isBuy = tradingType === 'BUY';
        if (investorType === 'FOREIGN') return isBuy ? s.fStreak >= 3 : s.fStreak <= -3;
        if (investorType === 'INSTITUTION') return isBuy ? s.iStreak >= 3 : s.iStreak <= -3;
        return isBuy ? (s.fStreak >= 3 || s.iStreak >= 3) : (s.fStreak <= -3 || s.iStreak <= -3);
      });

      return (
        <ScrollView style={styles.scroll}>
          <MarketStatusHeader />
          <Text style={styles.sectionTitle}>
            {isMarketOpen ? "실시간 수급 연속 매매" : "금일 수급 연속 매매 TOP"}
          </Text>

          <View style={styles.mainFilterRow}>
            <TouchableOpacity
              style={[styles.mainFilterBtn, tradingType === 'BUY' && styles.buyActive]}
              onPress={() => setTradingType('BUY')}>
              <Text style={[styles.mainFilterText, tradingType === 'BUY' && styles.activeTabText]}>매수</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainFilterBtn, tradingType === 'SELL' && styles.sellActive]}
              onPress={() => setTradingType('SELL')}>
              <Text style={[styles.mainFilterText, tradingType === 'SELL' && styles.activeTabText]}>매도</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={investorType === 'INSTITUTION' ? styles.filterBtnActive : styles.filterBtn}
              onPress={() => setInvestorType('INSTITUTION')}>
              <Text style={styles.filterBtnText}>기관</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={investorType === 'FOREIGN' ? styles.filterBtnActive : styles.filterBtn}
              onPress={() => setInvestorType('FOREIGN')}>
              <Text style={styles.filterBtnText}>외국인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={investorType === 'ALL' ? styles.filterBtnActive : styles.filterBtn}
              onPress={() => setInvestorType('ALL')}>
              <Text style={styles.filterBtnText}>전체</Text>
            </TouchableOpacity>
          </View>

          {filtered.sort((a, b) => {
            const getVal = (s) => {
              if (investorType === 'FOREIGN') return Math.abs(s.fStreak);
              if (investorType === 'INSTITUTION') return Math.abs(s.iStreak);
              return Math.abs(s.fStreak) + Math.abs(s.iStreak);
            };
            return getVal(b) - getVal(a);
          }).map(s => (
            <StockCard key={s.code} stock={s} onPress={() => { setSelectedStock(s); setDetailModal(true); }} />
          ))}
          {filtered.length === 0 && !loading && <Text style={styles.emptyText}>조건에 맞는 종목이 없습니다.</Text>}
          {loading && <ActivityIndicator size="small" color="#3182f6" style={{ marginTop: 20 }} />}
        </ScrollView>
      );
    }
    if (tab === 'my') {
      return (
        <ScrollView style={styles.scroll}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>보유 종목 현황</Text>
            <TouchableOpacity onPress={() => setSearchModal(true)}>
              <Plus size={20} color="#3182f6" />
            </TouchableOpacity>
          </View>
          {analyzedStocks.filter(s => myStocks.some(ms => ms.code === s.code)).map(s => (
            <StockCard
              key={s.code}
              stock={s}
              onPress={() => { setSelectedStock(s); setDetailModal(true); }}
              onDelete={() => handleDeleteStock(s.code)}
            />
          ))}
          {myStocks.length === 0 && <Text style={styles.emptyText}>종목을 추가해 보세요.</Text>}
        </ScrollView>
      );
    }
    if (tab === 'settings') {
      return (
        <View style={styles.scroll}>
          <Text style={styles.sectionTitle}>관리 및 백업</Text>
          <View style={styles.card}>
            <Text style={styles.label}>닉네임 백업 키</Text>
            <View style={styles.nickRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={syncKey}
                onChangeText={setSyncKey}
                placeholder="나만의 키 입력"
                placeholderTextColor="#555"
              />
              <TouchableOpacity style={styles.checkBtn} onPress={handleCheckDuplicate}>
                <Text style={styles.checkBtnText}>중복 확인</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.descText}>* 중복 확인 후 사용 가능한 키로 백업해 주세요.</Text>

            <View style={[styles.row, { marginTop: 15 }]}>
              <TouchableOpacity style={styles.btn} onPress={handleBackup}>
                <CloudUpload size={16} color="#fff" />
                <Text style={styles.btnText}>백업하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#333' }]} onPress={handleRestore}>
                <Download size={16} color="#fff" />
                <Text style={styles.btnText}>가져오기</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>알림 설정</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>종합 알림 (내 종목 이탈 / 시장 매집 / 세력평단 찬스)</Text>
              <Switch
                value={pushEnabled}
                onValueChange={async (val) => {
                  setPushEnabled(val);
                  await AsyncStorage.setItem(STORAGE_KEYS.NOTIF_ENABLED, val.toString());
                }}
                trackColor={{ true: '#3182f6' }}
              />
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Ticker items={tickerItems} />

      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Nav BAr */}
      <View style={[styles.nav, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setTab('home')}>
          <TrendingUp size={24} color={tab === 'home' ? '#3182f6' : '#888'} />
          <Text style={[styles.navText, tab === 'home' && styles.navTextActive]}>대시보드</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setTab('list')}>
          <RefreshCcw size={24} color={tab === 'list' ? '#3182f6' : '#888'} />
          <Text style={[styles.navText, tab === 'list' && styles.navTextActive]}>연속매매</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setTab('my')}>
          <Star size={24} color={tab === 'my' ? '#3182f6' : '#888'} />
          <Text style={[styles.navText, tab === 'my' && styles.navTextActive]}>내 종목</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setTab('settings')}>
          <Settings size={24} color={tab === 'settings' ? '#3182f6' : '#888'} />
          <Text style={[styles.navText, tab === 'settings' && styles.navTextActive]}>설정</Text>
        </TouchableOpacity>
      </View>

      {/* Search Modal */}
      <Modal visible={searchModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior="padding" style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>종목 추가</Text>
            <TextInput
              style={styles.modalInput}
              autoFocus
              placeholder="종목명 또는 코드 입력"
              placeholderTextColor="#555"
              value={searchQuery}
              onChangeText={handleSearch}
            />

            {suggestions.length > 0 && (
              <View style={styles.suggestionList}>
                {suggestions.map(s => (
                  <TouchableOpacity
                    key={s.code}
                    style={styles.suggestionItem}
                    onPress={() => handleAddStock(s)}>
                    <Text style={styles.suggestionName}>{s.name}</Text>
                    <Text style={styles.suggestionCode}>{s.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={() => handleAddStock()}>
              <Text style={styles.modalBtnText}>직접 추가/검색</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => { setSearchModal(false); setSuggestions([]); }}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stock Details Modal */}
      <Modal visible={detailModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContentLarge}>
            {selectedStock && (
              <>
                <View style={styles.modalHeaderClose}>
                  <TouchableOpacity onPress={() => setDetailModal(false)}>
                    <X size={24} color="#888" />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailHeader}>
                  <Text style={styles.modalTitleLarge}>{selectedStock.name}</Text>
                  <Text style={styles.modalPriceLarge}>{selectedStock.price.toLocaleString()}원</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Thermometer temperature={selectedStock.sentiment} label="투자 심리 온도" />
                  <View style={styles.detailStats}>
                    <Text style={styles.statLabel}>세력 평단가(VWAP)</Text>
                    <Text style={styles.statValue}>
                      {selectedStock.vwap > 0 ? `${selectedStock.vwap.toLocaleString()}원` : '분석 중...'}
                    </Text>
                    {selectedStock.vwap > 0 && (
                      <Text style={[styles.statDiff, { color: selectedStock.price < selectedStock.vwap ? '#00ff00' : '#ff4d4d' }]}>
                        {selectedStock.price < selectedStock.vwap
                          ? `세력보다 ${(100 - (selectedStock.price / selectedStock.vwap) * 100).toFixed(1)}% 저렴!`
                          : '세력보다 비싼 구간'}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.analysisBox}>
                  <Text style={styles.analysisTitle}>🔍 수급 집중 상세 분석</Text>
                  <Text style={styles.analysisText}>
                    {(() => {
                      const { fStreak, iStreak, price, vwap, isHiddenAccumulation } = selectedStock;
                      let analysis = "";

                      // 1. Foreigner & Institution Trend Detail
                      let fTrend = fStreak >= 3 ? `🌍 외인 ${fStreak}일 연속 매집` : (fStreak <= -3 ? `🌍 외인 ${Math.abs(fStreak)}일 연속 매도` : "🌍 외인 수급 중립");
                      let iTrend = iStreak >= 3 ? `🏛️ 기관 ${iStreak}일 연속 매집` : (iStreak <= -3 ? `🏛️ 기관 ${Math.abs(iStreak)}일 연속 매도` : "🏛️ 기관 수급 중립");

                      analysis += `${fTrend}\n${iTrend}\n\n`;

                      // 1-2. Strategic Advice (Synthesis)
                      if (fStreak >= 3 && iStreak >= 3) {
                        analysis += `🔥 [강력 매수 관점] 외인과 기관이 의기투합하여 물량을 쓸어담는 중입니다. 시세 분출의 가능성이 매우 높습니다.`;
                      } else if (fStreak >= 3 && iStreak <= -3) {
                        analysis += `⚔️ [힘겨루기 구간] 외국인은 사고 있지만 기관이 그 물량을 퍼붓고 있습니다. 외국인의 매수세가 기관의 매도세를 압도하는지 확인하며 분할 접근을 권장합니다.`;
                      } else if (fStreak <= -3 && iStreak >= 3) {
                        analysis += `⚔️ [힘겨루기 구간] 기관은 하방을 지지하며 사고 있으나 외국인이 차익 실현 중입니다. 기관의 방어선 지지 여부가 핵심입니다.`;
                      } else if (fStreak >= 3 || iStreak >= 3) {
                        analysis += `📈 [긍정적 관점] 한쪽 주체의 수급만으로도 시세를 견인할 수 있는 모멘텀이 형성되고 있습니다.`;
                      } else if (fStreak <= -3 && iStreak <= -3) {
                        analysis += `⚠️ [위험 관리] 외인과 기관 모두가 등을 돌린 상태입니다. 바닥 확인 전까지는 성급한 진입을 자제해야 합니다.`;
                      } else {
                        analysis += `⚖️ [관망 모드] 뚜렷한 주도 주체가 없어 박스권 흐름이 예상됩니다. 일방향 수급이 터질 때까지 대기하세요.`;
                      }

                      // 2. VWAP & Safety Margin
                      if (vwap > 0) {
                        const margin = ((vwap / price - 1) * 100).toFixed(1);
                        if (price < vwap) analysis += `\n\n💎 현재 주가는 세력 평균 단가(${vwap.toLocaleString()}원)보다 약 ${margin}% 저렴한 저평가 구간에 위치하여 가격 매력도가 높습니다. `;
                        else analysis += `\n\n📊 현재 세력 평단 대비 프리미엄이 붙은 구간이므로, 눌림목 형성 시 분할 매수로 접근하는 것이 유리합니다. `;
                      }

                      // 3. Hidden Accumulation
                      if (isHiddenAccumulation) analysis += `\n\n🤫 특이사항: 주가 변동성을 죽인 채 조용히 물량을 확보하는 '매집 정황'이 포착되었습니다. `;

                      return analysis;
                    })()}
                  </Text>
                </View>

                <TouchableOpacity style={styles.modalBtn} onPress={() => setDetailModal(false)}>
                  <Text style={styles.modalBtnText}>확인</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3182f6" />
          <Text style={styles.loadingText}>수급 분석 중...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1219',
  },
  bannerContainer: {
    height: 100,
    width: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 25, 0.6)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  bannerBrandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },
  content: {
    flex: 1,
  },
  scroll: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
    marginLeft: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 10,
  },
  infoText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: '#161e27',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  navTextActive: {
    color: '#3182f6',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a232b',
    color: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3182f6',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    color: '#ccc',
    fontSize: 14,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161e27',
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#1a232b',
    color: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  modalBtn: {
    backgroundColor: '#3182f6',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeBtn: {
    marginTop: 15,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#888',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 25, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#3182f6',
    marginTop: 10,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContentLarge: {
    backgroundColor: '#161e27',
    padding: 25,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  detailHeader: {
    marginBottom: 20,
  },
  modalTitleLarge: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  modalPriceLarge: {
    color: '#3182f6',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailStats: {
    flex: 1,
    marginLeft: 20,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statDiff: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  analysisBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
  },
  analysisTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  analysisText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  filterBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#3182f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalHeaderClose: {
    alignItems: 'flex-end',
    marginBottom: -10,
  },
  mainFilterRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  mainFilterBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  buyActive: {
    backgroundColor: '#ff4d4d',
  },
  sellActive: {
    backgroundColor: '#3182f6',
  },
  mainFilterText: {
    color: '#888',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  suggestionList: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestionCode: {
    color: '#3182f6',
    fontSize: 12,
  },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  marketOpenBg: {
    backgroundColor: 'rgba(49, 130, 246, 0.1)', // Light blue
  },
  marketClosedBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle gray
  },
  marketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  dotOpen: {
    backgroundColor: '#3182f6',
  },
  dotClosed: {
    backgroundColor: '#888',
  },
  marketStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  marketTimeText: {
    color: '#888',
    fontSize: 11,
  },
  updateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  liveBadge: {
    color: '#00ff00',
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,255,0,0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  nickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkBtn: {
    backgroundColor: '#3182f6',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  checkBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  descText: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
  },
  instDetailBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  instDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  instLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 2,
  },
  instValue: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});
