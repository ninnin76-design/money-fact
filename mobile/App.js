
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Constants from 'expo-constants';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, StatusBar, ActivityIndicator, Dimensions, Alert,
  Platform, Switch, LogBox, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp, TrendingDown, Star, Search, Plus, Trash2,
  AlertTriangle, Settings, RefreshCcw, Download, User, X, Save, UploadCloud, Cloud, BarChart3, LineChart
} from 'lucide-react-native';
import { Svg, Path, G, Line, Rect, Text as TextSVG } from 'react-native-svg';

// Services & Components
import axios from 'axios';
import { AuthService } from './src/services/AuthService';
import { StockService } from './src/services/StockService';
import { StorageService } from './src/services/StorageService';
import Ticker from './src/components/Ticker';
import Thermometer from './src/components/Thermometer';
import SectorHeatmap from './src/components/SectorHeatmap';
import StockCard from './src/components/StockCard';
import { BACKGROUND_TASK_NAME, STORAGE_KEYS, SERVER_URL } from './src/constants/Config';
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

// --- [코다리 부장] 프리미엄 캔들 스틱 + 이동평균선 + 거래량 차트 ---
const StockPriceChart = ({ data }) => {
  if (!data || data.length < 5) return <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', margin: 20 }}>차트 데이터 분석 중...</Text>;

  const screenWidth = Dimensions.get('window').width;
  const width = screenWidth - 40;
  const mainHeight = 220;
  const chartHeight = 150; // 캔들 영역
  const volHeight = 40;  // 거래량 영역
  const paddingRight = 45; // 가격축 공간
  const paddingBottom = 20; // 날짜축 공간
  const paddingTop = 15;

  // 데이터 가공 (과거 -> 최신)
  const history = [...data]
    .filter(d => parseInt(d.stck_clpr || 0) > 0)
    .reverse()
    .slice(-45); // 약 45일치 노출 (이미지 스타일)

  if (history.length < 5) return <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', margin: 20 }}>데이터 로드 중...</Text>;

  const o = history.map(d => parseInt(d.stck_oprc || d.stck_clpr));
  const h = history.map(d => parseInt(d.stck_hgpr || d.stck_clpr));
  const l = history.map(d => parseInt(d.stck_lwpr || d.stck_clpr));
  const c = history.map(d => parseInt(d.stck_clpr));
  const v = history.map(d => parseInt(d.acml_vol || 0));

  // 이동평균선 계산 함수
  const calcMA = (period) => {
    return c.map((_, idx) => {
      if (idx < period - 1) return null;
      const slice = c.slice(idx - period + 1, idx + 1);
      return slice.reduce((acc, val) => acc + val, 0) / period;
    });
  };

  const ma5 = calcMA(5);
  const ma20 = calcMA(20);
  const ma60 = calcMA(60);

  // 스케일 계산
  const priceMax = Math.max(...h) * 1.02;
  const priceMin = Math.min(...l) * 0.98;
  const priceRange = priceMax - priceMin || 1;
  const volMax = Math.max(...v) || 1;

  const getX = (i) => (i / (history.length - 1)) * (width - paddingRight);
  const getY = (price) => chartHeight - ((price - priceMin) / priceRange) * (chartHeight - paddingTop) - 5;
  const getVolY = (vol) => mainHeight - (vol / volMax) * volHeight;

  // 캔들 및 거래량 렌더링
  const candleNodes = history.map((item, i) => {
    const isUp = c[i] >= o[i];
    const color = isUp ? '#ff4d4d' : '#3182f6';
    const candleWidth = (width - paddingRight) / history.length * 0.7;
    const x = getX(i);

    // 캔들 몸통
    const bodyTop = getY(Math.max(o[i], c[i]));
    const bodyBottom = getY(Math.min(o[i], c[i]));
    const bodyHeight = Math.max(Math.abs(bodyTop - bodyBottom), 1);

    // 심 (Wick)
    const highY = getY(h[i]);
    const lowY = getY(l[i]);

    return (
      <G key={`candle-${i}`}>
        {/* 심 */}
        <Line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" />
        {/* 몸통 */}
        <Rect
          x={x - candleWidth / 2}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={color}
        />
        {/* 거래량 바 (하단) */}
        <Rect
          x={x - candleWidth / 2}
          y={getVolY(v[i])}
          width={candleWidth}
          height={(v[i] / volMax) * volHeight}
          fill={color}
          opacity="0.6"
        />
      </G>
    );
  });

  // 이평선 Path 생성
  const generatePath = (maData, color) => {
    const d = maData.map((p, i) => {
      if (p === null) return '';
      return `${i === 0 || maData[i - 1] === null ? 'M' : 'L'} ${getX(i)} ${getY(p)}`;
    }).join(' ');
    return <Path d={d} fill="none" stroke={color} strokeWidth="1.2" />;
  };

  // 최고/최저가 좌표 찾기
  const maxIdx = h.indexOf(Math.max(...h));
  const minIdx = l.indexOf(Math.min(...l));

  const formatPrice = (p) => p.toLocaleString();

  return (
    <View style={{ marginVertical: 10, paddingLeft: 10 }}>
      {/* 범례 */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          <View style={{ width: 8, height: 2, backgroundColor: '#c5f631', marginRight: 4 }} />
          <Text style={{ color: '#ccc', fontSize: 10 }}>5</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          <View style={{ width: 8, height: 2, backgroundColor: '#ff4d4d', marginRight: 4 }} />
          <Text style={{ color: '#ccc', fontSize: 10 }}>20</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 8, height: 2, backgroundColor: '#a855f7', marginRight: 4 }} />
          <Text style={{ color: '#ccc', fontSize: 10 }}>60</Text>
        </View>
      </View>

      <Svg width={width} height={mainHeight}>
        <G>
          {/* AI Character Badge (Mimicking image) */}
          <G x={10} y={15}>
            <Rect x="0" y="0" width="30" height="15" rx="7.5" fill="rgba(49, 130, 246, 0.9)" />
            <TextSVG x="15" y="10.5" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">AI</TextSVG>
          </G>
          {/* 가이드 라인 (수평) */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <Line
              key={`grid-${ratio}`}
              x1="0" y1={chartHeight * ratio} x2={width - paddingRight} y2={chartHeight * ratio}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
          ))}

          {/* 하단 구분선 (거래량 위) */}
          <Line x1="0" y1={chartHeight + 10} x2={width - paddingRight} y2={chartHeight + 10} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {candleNodes}

          {generatePath(ma5, '#c5f631')}
          {generatePath(ma20, '#ff4d4d')}
          {generatePath(ma60, '#a855f7')}

          {/* 최고가 주석 */}
          <G>
            <Line x1={getX(maxIdx)} y1={getY(h[maxIdx])} x2={getX(maxIdx)} y2={getY(h[maxIdx]) - 15} stroke="#ff4d4d" strokeWidth="1" />
            <TextSVG
              x={getX(maxIdx)} y={getY(h[maxIdx]) - 20}
              fill="#ff4d4d" fontSize="9" fontWeight="bold" textAnchor="middle"
            >
              {formatPrice(h[maxIdx])}
            </TextSVG>
          </G>

          {/* 최저가 주석 */}
          <G>
            <Line x1={getX(minIdx)} y1={getY(l[minIdx])} x2={getX(minIdx)} y2={getY(l[minIdx]) + 15} stroke="#3182f6" strokeWidth="1" />
            <TextSVG
              x={getX(minIdx)} y={getY(l[minIdx]) + 25}
              fill="#3182f6" fontSize="9" fontWeight="bold" textAnchor="middle"
            >
              {formatPrice(l[minIdx])}
            </TextSVG>
          </G>

          {/* 우측 가격 라벨 */}
          <TextSVG x={width - paddingRight + 5} y={getY(priceMax)} fill="#666" fontSize="9">{formatPrice(Math.round(priceMax))}</TextSVG>
          <TextSVG x={width - paddingRight + 5} y={getY(priceMin)} fill="#666" fontSize="9">{formatPrice(Math.round(priceMin))}</TextSVG>

          {/* 현재가 강조 라벨 (우측) */}
          <Rect x={width - paddingRight + 2} y={getY(c[c.length - 1]) - 7} width={paddingRight - 2} height={14} fill="#3182f6" rx="2" />
          <TextSVG x={width - paddingRight + 5} y={getY(c[c.length - 1]) + 3} fill="#fff" fontSize="9" fontWeight="bold">
            {formatPrice(c[c.length - 1])}
          </TextSVG>
        </G>
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: width - paddingRight, marginTop: 4 }}>
        <Text style={{ color: '#666', fontSize: 10 }}>{history[0].stck_bsop_date.substring(4, 6)}/{history[0].stck_bsop_date.substring(6, 8)}</Text>
        <Text style={{ color: '#3182f6', fontSize: 10, fontWeight: 'bold' }}>LIVE</Text>
      </View>
    </View>
  );
};

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
          // [코다리 부장 터치] 백그라운드에서도 사용자 설정값(민감도)을 존중합니다!
          const buyLimitRaw = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_BUY_STREAK);
          const sellLimitRaw = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_SELL_STREAK);
          const accumLimitRaw = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_ACCUM_STREAK);
          const buyLimit = parseInt(buyLimitRaw) || 3;
          const sellLimit = parseInt(sellLimitRaw) || 3;
          const accumLimit = parseInt(accumLimitRaw) || 3;

          const { fStreak, iStreak } = StockService.analyzeSupply(data);
          const currentPrice = parseInt(data[0].stck_clpr || 0);
          const vwap = StockService.calculateVWAP(data, buyLimit);
          const isHiddenAcc = StockService.checkHiddenAccumulation(data, accumLimit);

          const currentStatus = `${fStreak}|${iStreak}`;
          if (!history[stock.code]) {
            history[stock.code] = { streak: '', vwapDate: '', hiddenDate: '', streakDate: '' };
          }

          // 1. Streak Alert
          const isBuySignal = fStreak >= buyLimit || iStreak >= buyLimit;
          const isSellSignal = fStreak <= -sellLimit || iStreak <= -sellLimit;

          if (isBuySignal || isSellSignal) {
            if (history[stock.code].streak !== currentStatus && history[stock.code].streakDate !== today) {
              const type = isBuySignal ? "🎯 매수 기회" : "⚠️ 매도 경고";
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
            const accumLimitRaw = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_ACCUM_STREAK);
            const accumLimit = parseInt(accumLimitRaw) || 3;
            const isHiddenAcc = StockService.checkHiddenAccumulation(data, accumLimit);

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
  const [selectedStockHistory, setSelectedStockHistory] = useState([]);
  const [detailModal, setDetailModal] = useState(false);
  const [investorType, setInvestorType] = useState('INSTITUTION'); // INSTITUTION, FOREIGN, ALL
  const [tradingType, setTradingType] = useState('BUY'); // BUY, SELL
  const [suggestions, setSuggestions] = useState([]);
  const [isMarketOpen, setIsMarketOpen] = useState(StockService.isMarketOpen());
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const isRefreshing = useRef(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // [코다리 부장 터치] 감지 민감도 설정 (기본값: 3일)
  const [settingBuyStreak, setSettingBuyStreak] = useState(3);
  const [settingSellStreak, setSettingSellStreak] = useState(3);
  const [settingAccumStreak, setSettingAccumStreak] = useState(3);

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
  const [scanStats, setScanStats] = useState(null); // [코다리 부장] 전종목 레이더 스캔 통계

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
          if (fullData.scanStats) setScanStats(fullData.scanStats);
          if (fullData.updateTime) setLastUpdate(fullData.updateTime);
        }
      } catch (e) { }
    }

    const key = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_NICKNAME);
    if (key) setSyncKey(key);

    const notif = await AsyncStorage.getItem(STORAGE_KEYS.NOTIF_ENABLED);
    setPushEnabled(notif !== 'false');

    const buySet = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_BUY_STREAK);
    if (buySet) setSettingBuyStreak(parseInt(buySet) || 3);
    const sellSet = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_SELL_STREAK);
    if (sellSet) setSettingSellStreak(parseInt(sellSet) || 3);
    const accumSet = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_ACCUM_STREAK);
    if (accumSet) setSettingAccumStreak(parseInt(accumSet) || 3);

    setIsMarketOpen(StockService.isMarketOpen());

    // Stage 2: Deferred detailed analysis
    setTimeout(() => {
      // [코다리 부장] 개선: 장외 시간(밤/주말)이고 이미 캐시된 데이터가 있다면 새로고침을 생략합니다.
      // 이렇게 하면 앱을 껐다 켜도 한투 API를 찌르지 않아 토큰 발행을 아낄 수 있습니다!
      // ⚠️ 주의: sectors는 초기값이 6개(flow:0)라 length로 체크하면 항상 true!
      //    캐시된 데이터가 실제로 존재하는지는 cached 변수로 정확히 판단합니다.
      if (!StockService.isMarketOpen() && cached) {
        // console.log("앱 시작: 장외 시간이고 캐시 데이터 있으므로 유지.");
        return;
      }
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

  // [코다리 부장 터치] 서버 푸시 등록 로직! (설정 ON일 때만 제대로 등록)
  const registerForServerPush = async () => {
    if (Platform.OS === 'web') return;

    try {
      // 1. Check existing permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      // 2. Get Push Token
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      const pushTokenString = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // 3. Send to Server (Only if enabled!)
      // 설정이 OFF면 빈 리스트를 보내서 서버가 알림을 안 쏘게 만듭니다!
      const stocksToSend = pushEnabled ? myStocks : [];

      await axios.post(`${SERVER_URL}/api/push/register`, {
        pushToken: pushTokenString,
        syncKey: syncKey || 'anonymous',
        stocks: stocksToSend,
        settings: {
          buyStreak: settingBuyStreak,
          sellStreak: settingSellStreak,
          accumStreak: settingAccumStreak
        }
      });
      // console.log("Server Push Registered:", pushEnabled ? "ACTIVE" : "INACTIVE");

    } catch (e) {
      // console.log("Push reg failed:", e);
    }
  };

  // 설정이나 종목이 바뀌면 서버에 최신 정보를 다시 알려줍니다!
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        registerForServerPush();
      }, 2000); // Debounce heavily
      return () => clearTimeout(timer);
    }
  }, [pushEnabled, myStocks, syncKey, settingBuyStreak, settingSellStreak, settingAccumStreak]);

  const setupBackground = async () => {
    if (Platform.OS === 'web') return;
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      // 앱 켜질 때도 한 번 등록 시도
      registerForServerPush();
    } catch (e) { }
  };

  const refreshData = async (targetStocks, silent = false) => {
    if (isRefreshing.current) return;

    // [코다리 부장 터치] 장외 시간(오후 8시 ~ 익일 오전 8시)에는 새로운 데이터를 요청하지 않고 현재 화면을 고정합니다!
    // ⚠️ sectors는 초기값이 6개(flow:0)라 length로 체크하면 항상 true!
    //    실제 flow 데이터가 있는 섹터가 있는지, 또는 분석된 종목이 있는지로 판단합니다.
    const hasAnyData = analyzedStocks.length > 0 || sectors.some(s => s.flow !== 0);
    const isUserAction = !!targetStocks;

    if (!StockService.isMarketOpen() && hasAnyData && !isUserAction) {
      // console.log("Off-hours: Holding current data.");
      return;
    }

    // 데이터가 아예 없는 밤(새로 깔았을 때)이거나 유저가 직접 종목을 가져왔을 때는 강제로 한 번 조회합니다.
    const forceFetch = !StockService.isMarketOpen() && (!hasAnyData || isUserAction);
    // console.log(`[refreshData] market=${StockService.isMarketOpen()}, hasData=${hasAnyData}, userAction=${isUserAction}, force=${forceFetch}`);

    isRefreshing.current = true;
    if (!silent) setLoading(true);

    let snapshotStocks = [];

    // [코다리 부장 터치] 밤에 새로 깔았을 때는 서버 스냅샷을 한 방에 받아오는 게 최고!
    // 다만 유저 액션(가져오기 등)일 경우엔 한투 API 조회를 보장하기 위해 바로 리턴하지 않습니다.
    if (forceFetch && !isUserAction && !hasAnyData) {
      try {
        const snapshotRes = await axios.get(`${SERVER_URL}/api/snapshot`, { timeout: 20000 });
        if (snapshotRes.data) {
          const snap = snapshotRes.data;
          const allBuy = snap.buyData || {};
          const allSell = snap.sellData || {};

          const hasServerData = Object.values(allBuy).some(l => l && l.length > 0) ||
            Object.values(allSell).some(l => l && l.length > 0);

          if (hasServerData) {
            const seenCodes = new Set();
            const processServerList = (list, isBuy) => {
              (list || []).forEach(item => {
                if (!seenCodes.has(item.code)) {
                  seenCodes.add(item.code);
                  snapshotStocks.push({
                    name: item.name, code: item.code, price: parseInt(item.price || 0),
                    fStreak: item.fStreak || (isBuy ? (item.streak || 0) : -(item.streak || 0)),
                    iStreak: item.iStreak || 0,
                    sentiment: isBuy ? (50 + (item.streak || 0) * 10) : (50 - (item.streak || 0) * 10),
                    vwap: 0, isHiddenAccumulation: false
                  });
                }
              });
            };

            Object.values(allBuy).forEach(l => processServerList(l, true));
            Object.values(allSell).forEach(l => processServerList(l, false));

            if (snapshotStocks.length > 0) {
              // 섹터와 기관 흐름 정보도 스냅샷에서 바로 업데이트!
              if (snap.sectors) setSectors(snap.sectors);
              if (snap.instFlow) setDetailedInstFlow(snap.instFlow);

              // [코다리 부장] 레이더 스캔 통계 업데이트!
              if (snap.scanStats) setScanStats(snap.scanStats);

              const timeStr = snap.updateTime
                ? new Date(snap.updateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '최근 데이터';
              setLastUpdate(timeStr);

              // 로컬 캐시 저장 (다음 실행 시 0.1초 만에 뜨게 함)
              const localSnapshot = {
                stocks: snapshotStocks,
                sectors: snap.sectors || [],
                instFlow: snap.instFlow || { pnsn: 0, ivtg: 0, ins: 0 },
                scanStats: snap.scanStats || null,
                updateTime: timeStr
              };
              AsyncStorage.setItem(STORAGE_KEYS.CACHED_ANALYSIS, JSON.stringify(localSnapshot));
            }
          }
        }
      } catch (e) {
        console.log('[Snapshot] Failed:', e.message);
      }
    }

    const results = [...snapshotStocks];
    // 기존 스냅샷이 있으면 이미 있는 종목은 KIS에 재조회하지 않도록 방어 (단, 유저 관심종목은 무조건 조회)
    const snapshotExistingCodes = new Set(snapshotStocks.map(s => s.code));

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
      // 기존 스냅샷이 있으면 이미 있는 종목은 KIS에 재조회하지 않도록 방어 (단, 유저 관심종목은 무조건 조회)
      const isMyStock = base.some(bs => bs.code === stock.code);
      if (snapshotExistingCodes.has(stock.code) && !isMyStock) {
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        const [data, livePrice] = await Promise.all([
          StockService.getInvestorData(stock.code, forceFetch),
          StockService.getCurrentPrice(stock.code, forceFetch)
        ]);

        if (data && data.length > 0) {
          const analysis = StockService.analyzeSupply(data);
          const vwap = StockService.calculateVWAP(data, settingBuyStreak);
          const hidden = StockService.checkHiddenAccumulation(data, settingAccumStreak);
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

          const newStockData = {
            ...stock,
            name: stockName,
            ...analysis,
            vwap,
            isHiddenAccumulation: hidden,
            price: currentPrice
          };

          const existingIdx = results.findIndex(r => r.code === stock.code);
          if (existingIdx >= 0) {
            results[existingIdx] = newStockData;
          } else {
            results.push(newStockData);
          }

          if (stock.sector) {
            sectorMap[stock.sector] = (sectorMap[stock.sector] || 0) + netBuy;
          }

          // Sum inst sub-types (Market monitor focus)
          instTotals.pnsn += pnsnBuy;
          instTotals.ivtg += ivtgBuy;
          instTotals.ins += insBuy;

          // Ticker logic for MY stocks only
          if (isMyStock) {
            if (analysis.fStreak >= settingBuyStreak) tickerTexts.push(`🚀 ${stockName}: 외인 ${analysis.fStreak}일 연속 매집 중!`);
            if (analysis.iStreak >= settingBuyStreak) tickerTexts.push(`🏛️ ${stockName}: 기관 ${analysis.iStreak}일 연속 러브콜!`);
            const price = parseInt(data[0].stck_clpr || 0);
            if (vwap > 0 && price < vwap * 0.97) tickerTexts.push(`💎 ${stockName}: 세력평단 대비 저평가 구간 진입!`);
            if (hidden) tickerTexts.push(`🤫 ${stockName}: 수상한 매집 정황 포착!`);
          }
        } else {
          const emptyStock = { ...stock, fStreak: 0, iStreak: 0, sentiment: 50, vwap: 0, price: 0, isHiddenAccumulation: false };
          const existingIdx = results.findIndex(r => r.code === stock.code);
          if (existingIdx >= 0) results[existingIdx] = emptyStock;
          else results.push(emptyStock);
        }
      } catch (e) {
        const errorStock = { ...stock, fStreak: 0, iStreak: 0, sentiment: 50, vwap: 0, price: 0, isHiddenAccumulation: false, error: true };
        const existingIdx = results.findIndex(r => r.code === stock.code);
        if (existingIdx >= 0) results[existingIdx] = errorStock;
        else results.push(errorStock);
      }
    }
    setAnalyzedStocks(results);

    // Finalize sectors (Convert raw KRW to 100M units)
    const updatedSectors = Object.entries(sectorMap).map(([name, rawFlow]) => {
      const flow = Math.round(rawFlow / 100000000);
      return { name, flow };
    });

    // [코다리 부장 터치] 밤 늦게 API가 0을 던져줘도, 화면의 섹터 데이터를 0으로 덮어쓰지 않고 유지합니다!
    const totalFlow = updatedSectors.reduce((acc, s) => acc + Math.abs(s.flow), 0);
    if (updatedSectors.length > 0 && totalFlow > 0) {
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
      const settings = {
        buyStreak: settingBuyStreak,
        sellStreak: settingSellStreak,
        accumStreak: settingAccumStreak
      };
      await StorageService.backup(syncKey, myStocks, settings);
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_NICKNAME, syncKey);
      Alert.alert('성공', '전체 데이터(종목 및 설정) 백업이 완료되었습니다.');
    } catch (e) {
      Alert.alert('오류', '백업 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const data = await StorageService.restore(syncKey);
      if (data) {
        // 1. Restore Stocks
        if (data.stocks) {
          setMyStocks(data.stocks);
          StorageService.saveMyStocks(data.stocks);
          refreshData(data.stocks);
        }

        // 2. Restore Sensitivity Settings
        if (data.settings) {
          const { buyStreak, sellStreak, accumStreak } = data.settings;
          if (buyStreak) {
            setSettingBuyStreak(buyStreak);
            await AsyncStorage.setItem(STORAGE_KEYS.SETTING_BUY_STREAK, buyStreak.toString());
          }
          if (sellStreak) {
            setSettingSellStreak(sellStreak);
            await AsyncStorage.setItem(STORAGE_KEYS.SETTING_SELL_STREAK, sellStreak.toString());
          }
          if (accumStreak) {
            setSettingAccumStreak(accumStreak);
            await AsyncStorage.setItem(STORAGE_KEYS.SETTING_ACCUM_STREAK, accumStreak.toString());
          }
        }

        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_NICKNAME, syncKey);
        Alert.alert('성공', '데이터 및 설정을 성공적으로 가져왔습니다.');
      } else {
        Alert.alert('알림', '해당 키에 저장된 데이터가 없습니다.');
      }
    } catch (e) {
      Alert.alert('오류', '데이터를 가져오지 못했습니다. 키를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (settingBuyStreak) await AsyncStorage.setItem(STORAGE_KEYS.SETTING_BUY_STREAK, settingBuyStreak.toString());
      if (settingSellStreak) await AsyncStorage.setItem(STORAGE_KEYS.SETTING_SELL_STREAK, settingSellStreak.toString());
      if (settingAccumStreak) await AsyncStorage.setItem(STORAGE_KEYS.SETTING_ACCUM_STREAK, settingAccumStreak.toString());

      // 실시간 수급 데이터 다시 분석하도록 유도
      refreshData(myStocks);
      // 서버 푸시 설정도 즉시 갱신
      if (typeof registerForServerPush === 'function') {
        registerForServerPush();
      }

      Alert.alert('성공', '민감도 설정이 안전하게 저장되었습니다.');
    } catch (e) {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
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

  const handleOpenDetail = async (stock) => {
    setSelectedStock(stock);
    setSelectedStockHistory([]);
    setDetailModal(true);
    setFetchingDetail(true);
    try {
      const history = await StockService.getInvestorData(stock.code, true);
      if (history) {
        setSelectedStockHistory(history);
      }
    } catch (e) {
      console.log("Detail fetch failed:", e);
    } finally {
      setFetchingDetail(false);
    }
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

          {/* [코다리 부장] 전종목 레이더 스캔 현황 */}
          {scanStats && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: '#0d1b2a', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(49,130,246,0.15)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 14 }}>📡</Text>
                <Text style={{ color: '#3182f6', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>하이브리드 레이더</Text>
                <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(0,196,113,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ color: '#00c471', fontSize: 10, fontWeight: '700' }}>● LIVE</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#8b95a1', fontSize: 11 }}>전종목 <Text style={{ color: '#fff', fontWeight: '700' }}>{scanStats.totalScanned || '2,800+'}</Text>개</Text>
                <Text style={{ color: '#8b95a1', fontSize: 11 }}>후보 <Text style={{ color: '#fcc419', fontWeight: '700' }}>{scanStats.deepScanned || '-'}</Text>개</Text>
                <Text style={{ color: '#8b95a1', fontSize: 11 }}>분석 <Text style={{ color: '#3182f6', fontWeight: '700' }}>{scanStats.successHits || '-'}</Text>개</Text>
              </View>
            </View>
          )}

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

          <Text style={styles.sectionTitle}>나의 매집 의심 종목 (기준: {settingAccumStreak}일↑)</Text>
          {analyzedStocks.filter(s => s.isHiddenAccumulation)
            .map(s => (
              <StockCard key={s.code} stock={s} onPress={() => handleOpenDetail(s)} />
            ))}
          {analyzedStocks.filter(s => s.isHiddenAccumulation).length === 0
            && <Text style={styles.emptyText}>현재 기준을 만족하는 매집 종목이 없습니다.</Text>}
        </ScrollView>
      );
    }
    if (tab === 'list') {
      const filtered = analyzedStocks.filter(s => {
        const isBuy = tradingType === 'BUY';
        const limit = isBuy ? settingBuyStreak : settingSellStreak;

        if (investorType === 'FOREIGN') return isBuy ? s.fStreak >= limit : s.fStreak <= -limit;
        if (investorType === 'INSTITUTION') return isBuy ? s.iStreak >= limit : s.iStreak <= -limit;
        return isBuy ? (s.fStreak >= limit || s.iStreak >= limit) : (s.fStreak <= -limit || s.iStreak <= -limit);
      });

      return (
        <ScrollView style={styles.scroll}>
          <MarketStatusHeader />
          <Text style={styles.sectionTitle}>
            {isMarketOpen ? "실시간 수급 연속 매매" : "금일 수급 연속 매매 TOP"}
            <Text style={{ fontSize: 13, color: '#888', fontWeight: 'normal' }}>
              {` (기준: ${tradingType === 'BUY' ? settingBuyStreak : settingSellStreak}일↑)`}
            </Text>
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
            <StockCard
              key={s.code}
              stock={s}
              onPress={() => handleOpenDetail(s)}
              buyLimit={settingBuyStreak}
              sellLimit={settingSellStreak}
            />
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
            <Text style={styles.sectionTitle}>관심 종목 현황</Text>
            <TouchableOpacity onPress={() => setSearchModal(true)}>
              <Plus size={20} color="#3182f6" />
            </TouchableOpacity>
          </View>
          {analyzedStocks.filter(s => myStocks.some(ms => ms.code === s.code)).map(s => (
            <StockCard
              key={s.code}
              stock={s}
              onPress={() => handleOpenDetail(s)}
              onDelete={() => handleDeleteStock(s.code)}
              buyLimit={settingBuyStreak}
              sellLimit={settingSellStreak}
            />
          ))}
          {myStocks.length === 0 && <Text style={styles.emptyText}>종목을 추가해 보세요.</Text>}
        </ScrollView>
      );
    }
    if (tab === 'settings') {
      return (
        <ScrollView style={[styles.scroll, { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
          {/* Section: Data sync & Backup */}
          <View style={styles.settingsHeader}>
            <Text style={styles.sectionTitle}>설정 및 관리</Text>
            <Text style={styles.settingsSubTitle}>데이터를 안전하게 관리하고 알림을 최적화하세요.</Text>
          </View>

          <View style={styles.premiumCard}>
            <View style={styles.cardHeader}>
              <UploadCloud size={20} color="#3182f6" />
              <Text style={styles.cardHeaderTitle}>데이터 백업 및 동기화</Text>
            </View>

            <Text style={styles.label}>나만의 고유Key (Backup Key)</Text>
            <View style={styles.premiumInputRow}>
              <TextInput
                style={styles.premiumInput}
                value={syncKey}
                onChangeText={setSyncKey}
                placeholder="사용할 고유Key를 입력하세요"
                placeholderTextColor="#666"
              />
              <TouchableOpacity style={styles.premiumCheckBtn} onPress={handleCheckDuplicate}>
                <Text style={styles.premiumCheckBtnText}>중복 확인</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.premiumDescText}>*중복 확인후 사용 가능한 고유Key로 백업해 주세요</Text>
            <Text style={styles.premiumDescText}>*기기를 변경해도 고유Key만 있으면 관심종목 데이터를 완벽히 복원합니다.</Text>

            <View style={styles.premiumButtonGroup}>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={handleBackup}>
                <UploadCloud size={16} color="#fff" />
                <Text style={styles.actionBtnText}>백업하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleRestore}>
                <Download size={16} color="#fff" />
                <Text style={styles.actionBtnText}>불러오기</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: Push Notification Configuration */}
          <View style={styles.premiumCard}>
            <View style={styles.cardHeader}>
              <Settings size={20} color="#3182f6" />
              <Text style={styles.cardHeaderTitle}>알림 및 실시간 감지</Text>
            </View>

            <View style={styles.settingToggleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.settingMainText}>스마트 푸시 알림</Text>
                <Text style={styles.settingSubText}>관심종목의 이탈 신호와 시장의 매집 정황을 알려드립니다.</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={async (val) => {
                  setPushEnabled(val);
                  await AsyncStorage.setItem(STORAGE_KEYS.NOTIF_ENABLED, val.toString());
                }}
                trackColor={{ true: '#3182f6', false: '#333' }}
                thumbColor={pushEnabled ? '#fff' : '#888'}
              />
            </View>

            {pushEnabled && (
              <View style={styles.dividerLight} />
            )}

            {pushEnabled && (
              <View>
                <View style={styles.sensitivityHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>PRO 기능</Text>
                  </View>
                  <Text style={[styles.cardHeaderTitle, { marginLeft: 8 }]}>감지 민감도 개별 설정</Text>
                </View>

                <View style={styles.sensitivityRow}>
                  <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
                    <Text style={styles.sensitivityLabel} numberOfLines={1}>🎯 매수 포착 기준</Text>
                    <Text style={styles.sensitivityDesc}>{settingBuyStreak}일 이상 연속 매수 시 알림</Text>
                  </View>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      onPress={async () => {
                        const next = Math.max(2, settingBuyStreak - 1);
                        setSettingBuyStreak(next);
                        await AsyncStorage.setItem(STORAGE_KEYS.SETTING_BUY_STREAK, next.toString());
                      }}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{settingBuyStreak}</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        const next = Math.min(30, settingBuyStreak + 1);
                        setSettingBuyStreak(next);
                        await AsyncStorage.setItem(STORAGE_KEYS.SETTING_BUY_STREAK, next.toString());
                      }}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.sensitivityRow, { marginTop: 12 }]}>
                  <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
                    <Text style={styles.sensitivityLabel} numberOfLines={1}>⚠️ 매도 경고 기준</Text>
                    <Text style={styles.sensitivityDesc}>{settingSellStreak}일 이상 연속 매도 시 알림</Text>
                  </View>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      onPress={async () => {
                        const next = Math.max(2, settingSellStreak - 1);
                        setSettingSellStreak(next);
                        await AsyncStorage.setItem(STORAGE_KEYS.SETTING_SELL_STREAK, next.toString());
                      }}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{settingSellStreak}</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        const next = Math.min(30, settingSellStreak + 1);
                        setSettingSellStreak(next);
                        await AsyncStorage.setItem(STORAGE_KEYS.SETTING_SELL_STREAK, next.toString());
                      }}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.sensitivityRow, { marginTop: 12 }]}>
                  <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
                    <Text style={styles.sensitivityLabel} numberOfLines={1}>🤫 매집 포착 기준</Text>
                    <Text style={styles.sensitivityDesc}>{settingAccumStreak}일 이상 매집 정황 시 알림</Text>
                  </View>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      onPress={async () => {
                        const next = Math.max(2, settingAccumStreak - 1);
                        setSettingAccumStreak(next);
                        await AsyncStorage.setItem(STORAGE_KEYS.SETTING_ACCUM_STREAK, next.toString());
                      }}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{settingAccumStreak}</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        const next = Math.min(30, settingAccumStreak + 1);
                        setSettingAccumStreak(next);
                        await AsyncStorage.setItem(STORAGE_KEYS.SETTING_ACCUM_STREAK, next.toString());
                      }}
                      style={styles.stepperBtn}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.premiumDescText, { marginTop: 16, color: '#ff9800', fontWeight: '600' }]}>
                  * 장마감 시간(20:00 ~ 익일 08:00) 중 변경된 설정은 익일 장 시작 시 데이터에 정식 반영됩니다.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { marginTop: 12 }]}
                  onPress={handleSaveSettings}
                >
                  <Save size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>설정 저장 및 적용하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Version Info */}
          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>Money Fact Gold Edition</Text>
            <Text style={styles.footerSubText}>Copyright 2026 Money Fact. All rights reserved.</Text>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={{ marginTop: insets.top + 20 }}>
        <Ticker items={tickerItems} />
      </View>

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
          <Text style={[styles.navText, tab === 'my' && styles.navTextActive]}>관심종목</Text>
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

      {/* Full Screen Detail Modal */}
      <Modal visible={detailModal} transparent={false} animationType="slide">
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <StatusBar barStyle="light-content" />
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            <TouchableOpacity onPress={() => setDetailModal(false)} style={{ flexDirection: 'row', alignItems: 'center' }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: '#3182f6', fontSize: 16, fontWeight: 'bold' }}>← 돌아가기</Text>
            </TouchableOpacity>
          </View>

          {selectedStock && (
            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{selectedStock.name}</Text>
                    <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>{selectedStock.code}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{selectedStock.price?.toLocaleString()}원</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.analysisBox}>
                <Text style={styles.analysisTitle}>📈 주가 변동 추이 (최근 20일)</Text>
                {fetchingDetail ? (
                  <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#3182f6" />
                    <Text style={{ color: '#666', fontSize: 12, marginTop: 8 }}>차트 데이터를 불러오는 중...</Text>
                  </View>
                ) : (
                  <StockPriceChart data={selectedStockHistory} />
                )}
              </View>

              <View style={styles.analysisBox}>
                <Text style={styles.analysisTitle}>📊 외인/기관 연속 수급 현황</Text>
                <View style={{ marginBottom: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#888', width: 45, fontSize: 12 }}>외국인</Text>
                    <View style={{ flex: 1, height: 12, backgroundColor: '#333', borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
                      {selectedStock.fStreak > 0 && <View style={{ width: `${Math.min(selectedStock.fStreak * 10, 100)}%`, backgroundColor: '#ff4d4d', height: '100%' }} />}
                      {selectedStock.fStreak < 0 && <View style={{ width: `${Math.min(Math.abs(selectedStock.fStreak) * 10, 100)}%`, backgroundColor: '#3182f6', height: '100%', marginLeft: 'auto' }} />}
                    </View>
                    <Text style={{ color: selectedStock.fStreak > 0 ? '#ff4d4d' : '#3182f6', width: 45, textAlign: 'right', fontSize: 12, fontWeight: 'bold' }}>
                      {selectedStock.fStreak > 0 ? '+' : (selectedStock.fStreak < 0 ? '-' : '')}{Math.abs(selectedStock.fStreak || 0)}일
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#888', width: 45, fontSize: 12 }}>기관</Text>
                    <View style={{ flex: 1, height: 12, backgroundColor: '#333', borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }}>
                      {selectedStock.iStreak > 0 && <View style={{ width: `${Math.min(selectedStock.iStreak * 10, 100)}%`, backgroundColor: '#ff4d4d', height: '100%' }} />}
                      {selectedStock.iStreak < 0 && <View style={{ width: `${Math.min(Math.abs(selectedStock.iStreak) * 10, 100)}%`, backgroundColor: '#3182f6', height: '100%', marginLeft: 'auto' }} />}
                    </View>
                    <Text style={{ color: selectedStock.iStreak > 0 ? '#ff4d4d' : '#3182f6', width: 45, textAlign: 'right', fontSize: 12, fontWeight: 'bold' }}>
                      {selectedStock.iStreak > 0 ? '+' : (selectedStock.iStreak < 0 ? '-' : '')}{Math.abs(selectedStock.iStreak || 0)}일
                    </Text>
                  </View>
                </View>
              </View>

              {(() => {
                const getScore = (streak) => {
                  if (streak >= 3) return 2;
                  if (streak > 0) return 1;
                  if (streak <= -3) return -2;
                  if (streak < 0) return -1;
                  return 0;
                };
                const fScore = getScore(selectedStock.fStreak || 0);
                const iScore = getScore(selectedStock.iStreak || 0);
                const totalScore = fScore + iScore;

                let blocks = '';
                if (totalScore > 0) blocks = '🟥'.repeat(totalScore) + '⬜'.repeat(4 - totalScore);
                else if (totalScore < 0) blocks = '🟦'.repeat(Math.abs(totalScore)) + '⬜'.repeat(4 - Math.abs(totalScore));
                else blocks = '⬜⬜⬜⬜';

                let patternTag = null;
                let patternColor = '#888';

                if (fScore >= 1 && iScore >= 1 && (fScore + iScore >= 3)) { patternTag = '🔥 동반쌍끌이'; patternColor = '#ff4d4d'; }
                else if ((selectedStock.fStreak === 1 && selectedStock.iStreak >= 1) || (selectedStock.iStreak === 1 && selectedStock.fStreak >= 1)) { patternTag = '✨ 변곡점 발생'; patternColor = '#ffb84d'; }
                else if (selectedStock.isHiddenAccumulation) { patternTag = '🤫 히든 매집'; patternColor = '#00ff00'; }
                else if (iScore >= 2 && fScore <= 0) { patternTag = '🏢 기관 주도'; patternColor = '#3182f6'; }
                else if (fScore >= 2 && iScore <= 0) { patternTag = '🌎 외인 주도'; patternColor = '#c431f6'; }
                else if (totalScore <= -3) { patternTag = '❄️ 동반 이탈'; patternColor = '#888'; }

                return (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>💡 금일 수급 강도 및 패턴</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#16202b', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                      <Text style={{ fontSize: 20, letterSpacing: 2 }}>{blocks}</Text>
                      {patternTag && (
                        <View style={{ marginLeft: 16, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ color: patternColor, fontWeight: '800', fontSize: 13 }}>{patternTag}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}

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

                    let fTrend = fStreak >= settingBuyStreak ? `🌍 외인 ${fStreak}일 연속 매집` : (fStreak <= -settingSellStreak ? `🌍 외인 ${Math.abs(fStreak)}일 연속 매도` : "🌍 외인 수급 중립");
                    let iTrend = iStreak >= settingBuyStreak ? `🏛️ 기관 ${iStreak}일 연속 매집` : (iStreak <= -settingSellStreak ? `🏛️ 기관 ${Math.abs(iStreak)}일 연속 매도` : "🏛️ 기관 수급 중립");

                    analysis += `${fTrend}\n${iTrend}\n\n`;

                    if (fStreak >= settingBuyStreak && iStreak >= settingBuyStreak) {
                      analysis += `🔥 [강력 매수 관점] 외인과 기관이 의기투합하여 물량을 쓸어담는 중입니다. 시세 분출의 가능성이 매우 높습니다.`;
                    } else if (fStreak >= settingBuyStreak && iStreak <= -settingSellStreak) {
                      analysis += `⚔️ [힘겨루기 구간] 외국인은 사고 있지만 기관이 그 물량을 퍼붓고 있습니다. 외국인의 매수세가 기관의 매도세를 압도하는지 확인하며 분할 접근을 권장합니다.`;
                    } else if (fStreak <= -settingSellStreak && iStreak >= settingBuyStreak) {
                      analysis += `⚔️ [힘겨루기 구간] 기관은 하방을 지지하며 사고 있으나 외국인이 차익 실현 중입니다. 기관의 방어선 지지 여부가 핵심입니다.`;
                    } else if (fStreak >= settingBuyStreak || iStreak >= settingBuyStreak) {
                      analysis += `📈 [긍정적 관점] 한쪽 주체의 수급만으로도 시세를 견인할 수 있는 모멘텀이 형성되고 있습니다.`;
                    } else if (fStreak <= -settingSellStreak && iStreak <= -settingSellStreak) {
                      analysis += `⚠️ [위험 관리] 외인과 기관 모두가 등을 돌린 상태입니다. 바닥 확인 전까지는 성급한 진입을 자제해야 합니다.`;
                    } else {
                      analysis += `⚖️ [관망 모드] 뚜렷한 주도 주체가 없어 박스권 흐름이 예상됩니다. 일방향 수급이 터질 때까지 대기하세요.`;
                    }

                    if (vwap > 0) {
                      const margin = ((vwap / price - 1) * 100).toFixed(1);
                      if (price < vwap) analysis += `\n\n💎 현재 주가는 세력 평균 단가(${vwap.toLocaleString()}원)보다 약 ${margin}% 저렴한 저평가 구간에 위치하여 가격 매력도가 높습니다. `;
                      else analysis += `\n\n📊 현재 세력 평단 대비 프리미엄이 붙은 구간이므로, 눌림목 형성 시 분할 매수로 접근하는 것이 유리합니다. `;
                    }

                    if (isHiddenAccumulation) analysis += `\n\n🤫 특이사항: 주가 변동성을 죽인 채 조용히 물량을 확보하는 '매집 정황'이 포착되었습니다. `;

                    return analysis;
                  })()}
                </Text>
              </View>
            </ScrollView>
          )}
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
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
    marginLeft: 4,
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
  controlBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
  controlBtnText: {
    color: '#fff', fontSize: 18, fontWeight: 'bold'
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
  },
  // --- Premium Settings Styles ---
  settingsHeader: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  settingsSubTitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  premiumCard: {
    backgroundColor: '#1a232b',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  premiumInputRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  premiumInput: {
    flex: 1,
    backgroundColor: '#11181e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
  },
  premiumCheckBtn: {
    backgroundColor: '#3182f6',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
  },
  premiumCheckBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  premiumDescText: {
    color: '#666',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  premiumButtonGroup: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#3182f6',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingMainText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  settingSubText: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  dividerLight: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 20,
  },
  sensitivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sensitivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11181e',
    padding: 16,
    borderRadius: 16,
  },
  sensitivityLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sensitivityDesc: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a232b',
    borderRadius: 12,
    padding: 4,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepperValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: 'rgba(49, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#3182f6',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  footerText: {
    color: '#444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerSubText: {
    color: '#333',
    fontSize: 10,
    marginTop: 4,
  }
});
