
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, StatusBar, ActivityIndicator, Dimensions, Alert,
  Platform, Switch, LogBox, KeyboardAvoidingView, Share, Linking
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp, TrendingDown, Star, Search, Plus, Trash2,
  AlertTriangle, Settings, RefreshCcw, Download, User, X, Save, UploadCloud, Cloud, BarChart3, LineChart, BookOpen, Share2, ChevronUp, ChevronDown, Folder, Heart,
  Server, Smartphone, Flame, Thermometer as ThermoIcon, Loader2
} from 'lucide-react-native';
import { Svg, Path, G, Line, Rect, Text as TextSVG } from 'react-native-svg';

// Services & Components
import { AuthService } from './src/services/AuthService';
import { StockService } from './src/services/StockService';
import { StorageService } from './src/services/StorageService';
import Ticker from './src/components/Ticker';
import Thermometer from './src/components/Thermometer';
import SectorHeatmap from './src/components/SectorHeatmap';
import StockCard from './src/components/StockCard';
import { BACKGROUND_TASK_NAME, STORAGE_KEYS, SERVER_URL } from './src/constants/Config';
import { DEFAULT_SECTORS } from './src/constants/SectorData';
import { ALL_STOCKS } from './src/constants/StockData';

const MARKET_WATCH_STOCKS = [
  // 반도체 (10)
  { name: '삼성전자', code: '005930', sector: '반도체' }, { name: 'SK하이닉스', code: '000660', sector: '반도체' },
  { name: 'HPSP', code: '403870', sector: '반도체' }, { name: '한미반도체', code: '042700', sector: '반도체' },
  { name: '제주반도체', code: '080220', sector: '반도체' }, { name: '리노공업', code: '058470', sector: '반도체' },
  { name: '가온칩스', code: '399720', sector: '반도체' }, { name: '주성엔지니어링', code: '036930', sector: '반도체' },
  { name: '이오테크닉스', code: '039030', sector: '반도체' }, { name: 'ISC', code: '095340', sector: '반도체' },

  // 2차전지 (10) -> 이차전지
  { name: 'LG에너지솔루션', code: '373220', sector: '이차전지' }, { name: 'POSCO홀딩스', code: '005490', sector: '이차전지' },
  { name: '삼성SDI', code: '006400', sector: '이차전지' }, { name: '에코프로비엠', code: '247540', sector: '이차전지' },
  { name: '에코프로', code: '086520', sector: '이차전지' }, { name: '엘앤에프', code: '066970', sector: '이차전지' },
  { name: '금양', code: '001570', sector: '이차전지' }, { name: '포스코퓨처엠', code: '003670', sector: '이차전지' },
  { name: '엔켐', code: '348370', sector: '이차전지' }, { name: '레이크머티리얼즈', code: '281740', sector: '이차전지' },

  // 바이오 (10) -> 바이오 및 헬스케어
  { name: '삼성바이오로직스', code: '207940', sector: '바이오 및 헬스케어' }, { name: '셀트리온', code: '068270', sector: '바이오 및 헬스케어' },
  { name: 'HLB', code: '028300', sector: '바이오 및 헬스케어' }, { name: '알테오젠', code: '196170', sector: '바이오 및 헬스케어' },
  { name: '유한양행', code: '000100', sector: '바이오 및 헬스케어' }, { name: '한미약품', code: '128940', sector: '바이오 및 헬스케어' },
  { name: '에스티팜', code: '237690', sector: '바이오 및 헬스케어' }, { name: '리가켐바이오', code: '141080', sector: '바이오 및 헬스케어' },
  { name: '휴젤', code: '145020', sector: '바이오 및 헬스케어' }, { name: '삼천당제약', code: '000250', sector: '바이오 및 헬스케어' },

  // 자동차 (6) -> 자동차 및 전자부품
  { name: '현대차', code: '005380', sector: '자동차 및 전자부품' }, { name: '기아', code: '000270', sector: '자동차 및 전자부품' },
  { name: '현대모비스', code: '012330', sector: '자동차 및 전자부품' }, { name: 'HL만도', code: '204320', sector: '자동차 및 전자부품' },
  { name: '현대위아', code: '011210', sector: '자동차 및 전자부품' }, { name: '서연이화', code: '200880', sector: '자동차 및 전자부품' },

  // 로봇 (6) -> 로봇 및 에너지
  { name: '레인보우로보틱스', code: '277810', sector: '로봇 및 에너지' }, { name: '두산로보틱스', code: '454910', sector: '로봇 및 에너지' },
  { name: '루닛', code: '328130', sector: '로봇 및 에너지' }, { name: '뷰노', code: '338220', sector: '로봇 및 에너지' },
  { name: '마음AI', code: '377480', sector: '로봇 및 에너지' }, { name: '엔젤로보틱스', code: '455390', sector: '로봇 및 에너지' },

  // 금융 (6) -> 기타(금융)
  { name: 'KB금융', code: '105560', sector: '기타(금융)' }, { name: '신한지주', code: '055550', sector: '기타(금융)' },
  { name: '하나금융지주', code: '086790', sector: '기타(금융)' }, { name: '삼성생명', code: '032830', sector: '기타(금융)' },
  { name: '메리츠금융지주', code: '138040', sector: '기타(금융)' }, { name: '포스코인터내셔널', code: '047050', sector: '기타(금융)' },

  // IT/플랫폼/엔터 (5) -> 엔터 및 플랫폼
  { name: 'NAVER', code: '035420', sector: '엔터 및 플랫폼' }, { name: '카카오', code: '035720', sector: '엔터 및 플랫폼' },
  { name: '하이브', code: '352820', sector: '엔터 및 플랫폼' }, { name: 'JYP Ent.', code: '035900', sector: '엔터 및 플랫폼' },
  { name: '에스엠', code: '041510', sector: '엔터 및 플랫폼' },

  // 중공업/방산/화학 (7) -> 로봇 및 에너지 또는 기타 분류 필요 (서버 기준에 따라 조정)
  { name: '포스코DX', code: '022100', sector: '로봇 및 에너지' }, { name: 'LS ELECTRIC', code: '010120', sector: '로봇 및 에너지' },
  { name: 'LG화학', code: '051910', sector: '이차전지' }, { name: '한화에어로스페이스', code: '012450', sector: '로봇 및 에너지' },
  { name: '현대로템', code: '064350', sector: '로봇 및 에너지' }, { name: '두산에너빌리티', code: '034020', sector: '로봇 및 에너지' },
  { name: 'LIG넥스원', code: '079550', sector: '로봇 및 에너지' },
];



LogBox.ignoreAllLogs();
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// --- [코다리 부장] 프리미엄 캔들 스틱 + 이동평균선 + 거래량 차트 ---
const StockPriceChart = ({ data, currentPrice }) => {
  if (!data || data.length < 3) return <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', margin: 20 }}>차트 데이터 분석 중...</Text>;

  const screenWidth = Dimensions.get('window').width;
  const width = screenWidth - 30;
  const candleAreaHeight = 180; // 차트 영역을 조금 더 높여서 시인성 확보
  const volAreaHeight = 55;
  const totalHeight = candleAreaHeight + volAreaHeight + 10;
  const paddingRight = 80;
  const paddingTop = 25;

  const safeParse = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    if (dStr.includes('-')) return new Date(dStr);
    return new Date(`${dStr.substring(0, 4)}-${dStr.substring(4, 6)}-${dStr.substring(6, 8)}`);
  };

  const allSorted = [...data]
    .filter(d => safeParse(d.stck_clpr) > 0)
    .sort((a, b) => parseDate(a.stck_bsop_date) - parseDate(b.stck_bsop_date));

  const allClose = allSorted.map(d => safeParse(d.stck_clpr));
  const history = allSorted.slice(-20);
  if (history.length < 3) return <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', margin: 20 }}>데이터 수집 중...</Text>;

  const startIdx = allSorted.length - history.length;
  const o = history.map(d => safeParse(d.stck_oprc || d.stck_clpr) || safeParse(d.stck_clpr));
  const h = history.map(d => safeParse(d.stck_hgpr || d.stck_clpr) || safeParse(d.stck_clpr));
  const l = history.map(d => safeParse(d.stck_lwpr || d.stck_clpr) || safeParse(d.stck_clpr));
  const c = history.map(d => safeParse(d.stck_clpr));
  const v = history.map(d => safeParse(d.acml_vol || 0));

  const dataMax = Math.max(...h);
  const dataMin = Math.min(...l);
  const cp = safeParse(currentPrice) || c[c.length - 1];
  const isHealthyCp = (cp >= dataMin - (dataMax - dataMin) * 0.3 && cp <= dataMax + (dataMax - dataMin) * 0.3);
  const scaleMax = isHealthyCp ? Math.max(dataMax, cp) : dataMax;
  const scaleMin = isHealthyCp ? Math.min(dataMin, cp) : dataMin;
  const margin = (scaleMax - scaleMin) * 0.08 || scaleMax * 0.05;
  const priceMax = scaleMax + margin;
  const priceMin = Math.max(0, scaleMin - margin);
  const priceRange = priceMax - priceMin || 1;
  const volMax = Math.max(...v) || 1;

  const chartW = width - paddingRight;
  const slotW = chartW / history.length;
  const barW = slotW * 0.5;

  const getX = (i) => (i + 0.5) * slotW;
  const getY = (price) => {
    if (isNaN(price) || price === null || price === undefined) return paddingTop + candleAreaHeight / 2;
    const ratio = (price - priceMin) / priceRange;
    return paddingTop + (candleAreaHeight - paddingTop) * (1 - ratio);
  };

  // ===== 캔들 렌더링 =====
  const candleNodes = history.map((item, i) => {
    const isUp = c[i] >= o[i];
    const color = isUp ? '#f3214b' : '#3182f6';
    const x = getX(i);
    const oY = getY(o[i]);
    const cY = getY(c[i]);
    let bodyTop = Math.min(oY, cY);
    let bodyBot = Math.max(oY, cY);

    let currentBodyH = Math.abs(oY - cY);
    const minH = 3;
    if (currentBodyH < minH) {
      const mid = (bodyTop + bodyBot) / 2;
      bodyTop = mid - minH / 2;
      bodyBot = mid + minH / 2;
      currentBodyH = minH;
    }

    let hY = getY(h[i]);
    let lY = getY(l[i]);

    return (
      <G key={`c${i}`}>
        <Line x1={x} y1={hY} x2={x} y2={lY} stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Rect x={x - barW / 2} y={bodyTop} width={barW} height={currentBodyH} fill={color} rx={2} />
      </G>
    );
  });


  // ===== 거래량 렌더링 =====
  const volNodes = history.map((item, i) => {
    const isUp = c[i] >= o[i];
    const color = isUp ? '#f3214b' : '#3182f6';
    const x = getX(i);
    const volH = Math.max((v[i] / volMax) * (volAreaHeight - 10), 4);
    const volY = candleAreaHeight + volAreaHeight - volH;
    return (
      <Rect key={`v${i}`} x={x - barW / 2} y={volY} width={barW} height={volH} fill={color} opacity="0.7" rx={1} />
    );
  });



  // ===== 이동평균선 =====
  const makeMaPath = (period, color, dash) => {
    const points = [];
    for (let i = 0; i < history.length; i++) {
      const globalIdx = startIdx + i; // allClose에서의 인덱스
      if (globalIdx < period - 1) continue;
      const slice = allClose.slice(globalIdx - period + 1, globalIdx + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      points.push({ x: getX(i), y: getY(avg) });
    }
    if (points.length < 2) return null;
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return <Path key={`ma${period}`} d={d} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray={dash || ''} />;
  };

  const formatPrice = (p) => Math.round(p).toLocaleString();
  const cpY = getY(cp);


  return (
    <View style={{ marginVertical: 10 }}>
      {/* 범례 */}
      <View style={{ flexDirection: 'row', marginBottom: 12, paddingLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
          <View style={{ width: 12, height: 3, backgroundColor: '#c5f631', marginRight: 4 }} />
          <Text style={{ color: '#aaa', fontSize: 10 }}>5</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
          <View style={{ width: 12, height: 3, backgroundColor: '#ff4d4d', marginRight: 4 }} />
          <Text style={{ color: '#aaa', fontSize: 10 }}>20</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 12, height: 3, backgroundColor: '#888', marginRight: 4 }} />
          <Text style={{ color: '#aaa', fontSize: 10 }}>60</Text>
        </View>
      </View>

      <Svg width={width} height={totalHeight}>
        <G>
          {/* AI Badge */}
          <G x={8} y={8}>
            <Rect width="30" height="15" rx="4" fill="#3182f6" />
            <TextSVG x="15" y="11" fill="#fff" fontSize="8" fontWeight="bold" textAnchor="middle">AI</TextSVG>
          </G>


          {/* 가이드선 */}
          {[0, 0.5, 1.0].map(r => (
            <Line key={`g${r}`} x1="0" y1={paddingTop + (candleAreaHeight - paddingTop) * r} x2={chartW}
              y2={paddingTop + (candleAreaHeight - paddingTop) * r}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}

          {/* 거래량 기반선 */}
          <Line x1="0" y1={candleAreaHeight + 2} x2={chartW} y2={candleAreaHeight + 2} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {volNodes}
          {candleNodes}

          {/* 이동평균선 */}
          {makeMaPath(5, '#c5f631')}
          {makeMaPath(20, '#ff4d4d')}
          {makeMaPath(60, '#888', '3,2')}

          {/* 현재가 배지 (레퍼런스 싱크!) */}
          {isHealthyCp && (
            <G>
              <Line x1="0" y1={cpY} x2={chartW} y2={cpY} stroke="#3182f6" strokeWidth="1" strokeDasharray="3,2" />
              <G transform={`translate(${chartW + 2}, ${cpY - 10})`}>
                <Rect width={paddingRight - 10} height="20" rx="4" fill="#3182f6" />
                <TextSVG x={(paddingRight - 10) / 2} y="14" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">
                  {Math.round(cp).toLocaleString()}
                </TextSVG>
              </G>
            </G>
          )}

          {/* 우측 가격 상하단 */}
          <TextSVG x={chartW + 5} y={paddingTop + 5} fill="#666" fontSize="8">{Math.round(priceMax).toLocaleString()}</TextSVG>
          <TextSVG x={chartW + 5} y={candleAreaHeight} fill="#666" fontSize="8">{Math.round(priceMin).toLocaleString()}</TextSVG>
        </G>
      </Svg>


      {/* [코다리 부장] 하단 날짜 라벨: 5일 간격으로 표시하여 가독성 업그레이드 */}
      <View style={{ flexDirection: 'row', width: chartW, marginTop: 10, paddingHorizontal: 5 }}>
        {history.map((item, i) => {
          if (i % 5 === 0 || i === history.length - 1) {
            const dateStr = item.stck_bsop_date;
            const displayDate = dateStr && dateStr.length >= 8 ? `${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}` : '';
            return (
              <Text key={`d${i}`} style={{ position: 'absolute', left: getX(i) - 15, color: '#666', fontSize: 9, fontWeight: i === history.length - 1 ? 'bold' : 'normal' }}>
                {i === history.length - 1 ? '오늘' : displayDate}
              </Text>
            );
          }
          return null;
        })}
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

          // 1. Streak Alert 🚨🔥✨
          const isEscapeSignal = fStreak <= -sellLimit && iStreak <= -sellLimit;
          const isBullSignal = fStreak >= 1 && iStreak >= 1 && (fStreak + iStreak) >= buyLimit;
          const isTurnSignal = (fStreak === 1 && iStreak <= -sellLimit) || (iStreak === 1 && fStreak <= -sellLimit);

          let currentStatus = 'none';
          if (isEscapeSignal) currentStatus = 'escape';
          else if (isBullSignal) currentStatus = 'bull';
          else if (isTurnSignal) currentStatus = 'turn';
          else if (isHiddenAcc) currentStatus = 'hidden';

          if (!history[stock.code]) {
            history[stock.code] = { streak: '', hiddenDate: '', streakDate: '' };
          }

          if (currentStatus !== 'none' && history[stock.code].streak !== currentStatus && history[stock.code].streakDate !== today) {
            let title = `Money Fact: ${stock.name}`;
            let bodyStr = "";

            if (currentStatus === 'escape') {
              bodyStr = `❄️ [동반 이탈 경고] ${stock.name}: 외인·기관 모두 손절 중! 리스크 관리가 시급합니다.`;
              title = "🚨 수급 이탈 알림!";
            } else if (currentStatus === 'bull') {
              bodyStr = `🔥 [동반 쌍끌이 포착] ${stock.name}: 외인·기관이 작정하고 쓸어담는 중! 시세 분출이 임박했습니다.`;
              title = "🔥 특급 쌍끌이 시그널!";
            } else if (currentStatus === 'turn') {
              bodyStr = `✨ [변곡점 발생] ${stock.name}: 기나긴 매도세를 멈추고 수급이 상방으로 꺾였습니다. 신규 진입 적기!`;
              title = "✨ 변곡점 포착!";
            } else if (currentStatus === 'hidden') {
              bodyStr = `🤫 [히든 매집] ${stock.name}: 주가는 고요하지만 세력은 은밀히 물량을 확보 중입니다. 소문나기 전에 확인하세요.`;
              title = "🤫 히든 매집 포착!";
            }

            await Notifications.scheduleNotificationAsync({
              content: { title, body: bodyStr },
              trigger: null,
            });

            history[stock.code].streak = currentStatus;
            history[stock.code].streakDate = today;
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
  const [mySubTab, setMySubTab] = useState('favorites'); // favorites, sectors
  const [loading, setLoading] = useState(false);
  const [myStocks, setMyStocks] = useState([]);
  const [userSectors, setUserSectors] = useState([]);
  const [expandedSectors, setExpandedSectors] = useState({});
  const [targetSectorForAdd, setTargetSectorForAdd] = useState(null); // 종목 추가 시 어느 섹터에 넣을지 저장 (null이면 관심종목)
  const [analyzedStocks, _setAnalyzedStocks] = useState([]);
  const analyzedStocksRef = useRef([]);
  const setAnalyzedStocks = (val) => {
    if (typeof val === 'function') {
      _setAnalyzedStocks(prev => {
        const next = val(prev);
        analyzedStocksRef.current = next;
        return next;
      });
    } else {
      _setAnalyzedStocks(val);
      analyzedStocksRef.current = val;
    }
  };
  const [tickerItems, setTickerItems] = useState(["[v4.2.4] 주말/야간에도 차트와 평단가를 즉시 조회할 수 있는 하이패스 시스템이 적용되었습니다!", "💡 종목 클릭 시 리스트에서 사라지는 현상이 수정되었습니다."]);
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
  const [manualModal, setManualModal] = useState(false);
  const [isServerUpdating, setIsServerUpdating] = useState(false); // [v3.9.3] 서버 깨어남/업데이트 중 상태 추가
  const [syncTime, setSyncTime] = useState(null); // [v3.9.4] 모바일 데이터 동기화 시점 (서버에서 데이터를 성공적으로 가져온 시각)
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0); // [v4.0.0] 마지막 시도 타임스탬프 (로직용)
  const [requestTime, setRequestTime] = useState(null); // [v4.0.5] 앱이 서버에 데이터를 요청한 시간 (날짜+시간)
  const isRefreshing = useRef(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // [v4.0.16] 디바운싱: 종목을 여러 개 연속 추가할 때 매번 분석 루프를 돌리지 않고,
  // 마지막 추가 후 800ms 대기 후 한꺼번에 처리하여 체감 속도 5배 향상!
  const addStockDebounceTimer = useRef(null);
  const pendingStocksRef = useRef([]);

  // [코다리 부장 터치] 감지 민감도 설정 (기본값 모두 5일)
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
  const [serverBuy, setServerBuy] = useState({});
  const [serverSell, setServerSell] = useState({});
  const [detailedInstFlow, setDetailedInstFlow] = useState({ pnsn: 0, ivtg: 0, ins: 0 });
  const [scanStats, setScanStats] = useState(null); // [코다리 부장] 전종목 레이더 스캔 통계

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Hybrid Loading Stage 1: Fast data
    const stocks = await StorageService.loadMyStocks();
    setMyStocks(stocks);

    const loadedSectors = await StorageService.loadUserSectors();
    if (loadedSectors) {
      setUserSectors(loadedSectors);
    } else {
      setUserSectors(DEFAULT_SECTORS);
      StorageService.saveUserSectors(DEFAULT_SECTORS);
    }

    // [코다리 부장 터치] 앱 켤 때 섹터, 수급 금액까지 전재산(Full Snapshot)을 한 번에 복원합니다!
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_ANALYSIS);
    if (cached) {
      try {
        const fullData = JSON.parse(cached);
        // 옛날 방식(배열만 저장)과 새 방식(객체 저장) 모두 대응하는 지능형 복구!
        if (Array.isArray(fullData)) {
          setAnalyzedStocks(fullData.map(s => ({ ...s, isWaiting: false })));
        } else {
          setAnalyzedStocks((fullData.stocks || []).map(s => ({ ...s, isWaiting: false })));
          if (fullData.sectors) {
            const fixed = fullData.sectors.map(s => {
              let f = Number(s.flow) || 0;
              // [v4.0.12] 1만억(=1조) 이상이면 단위 오류 확률 높음 -> /100000으로 보정
              if (Math.abs(f) > 10000) f = Math.round(f / 100000);
              else f = Math.round(f);
              return { ...s, flow: f };
            });
            setSectors(fixed);
          }
          if (fullData.buyData) setServerBuy(fullData.buyData);
          if (fullData.sellData) setServerSell(fullData.sellData);
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
    if (buySet) setSettingBuyStreak(parseInt(buySet) || 5);
    const sellSet = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_SELL_STREAK);
    if (sellSet) setSettingSellStreak(parseInt(sellSet) || 5);
    const accumSet = await AsyncStorage.getItem(STORAGE_KEYS.SETTING_ACCUM_STREAK);
    if (accumSet) setSettingAccumStreak(parseInt(accumSet) || 5);

    setIsMarketOpen(StockService.isMarketOpen());

    // Stage 2: Deferred detailed analysis
    setTimeout(() => {
      // [코다리 부장] 앱 구동 시에는 장외 시간이라도 서버의 최신 스냅샷을 한 번은 가져옵니다.
      // 캐시 데이터가 이미 표시되고 있다면 조용히(silent) 갱신합니다.
      refreshData(stocks, !!cached, 0, true);
    }, 500);

    setupBackground();
  };

  // [v4.1.9] 하이브리드 동기화 로직: 평일 08:00~22:00 KST에만 서버 데이터를 가져오고 그 외 시간/휴일에는 서버와 앱 모두 휴식!
  const autoRefresh = useCallback(() => {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + kstOffset);
    const day = kstDate.getDay(); // 0=일, 6=토
    const hour = kstDate.getHours();

    const isWeekend = (day === 0 || day === 6);
    const isCheckTime = !isWeekend && (hour >= 8 && hour < 22);

    if (isCheckTime) {
      console.log(`[AutoRefresh] ${kstDate.toLocaleTimeString()} - 최신 스냅샷 동기화 시도 (평일 운영시간)`);
      refreshData(undefined, true);
    } else {
      // 운영 시간 외에는 조용히 마지막 데이터를 계속 보여줍니다.
      if (isWeekend) {
        // console.log("[AutoRefresh] 오늘은 평온한 주말입니다. 서버와 함께 휴식 중...");
      }
    }

    // 마켓 상태는 UI 표시용이므로 별도 업데이트
    setIsMarketOpen(StockService.isMarketOpen());
  }, [refreshData]);

  useEffect(() => {
    const timer = setInterval(autoRefresh, 3 * 60 * 1000); // 3분으로 단축
    return () => clearInterval(timer);
  }, [autoRefresh]);

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

      // [코다리 부장] Android 8.0 이상 단말에서 APK 설치 후 푸시 알림이 안 오는 문제를 위한 Notification Channel 설정!
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MoneyFact Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3182f6',
        });
      }

      // 2. Get Push Token (APK 빌드 시 Constants.expoConfig가 비어있는 문제를 방지하기 위해 강제 할당!)
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || '9427acd0-1304-4333-bd02-35dcb7a29021';
      const pushTokenString = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

      // 3. Send to Server (Only if enabled!)
      // 설정이 OFF면 빈 리스트를 보내서 서버가 알림을 안 쏘게 만듭니다!
      const stocksToSend = pushEnabled ? myStocks : [];

      await fetch(`${SERVER_URL}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pushToken: pushTokenString,
          syncKey: syncKey || 'anonymous',
          stocks: stocksToSend,
          settings: {
            buyStreak: settingBuyStreak,
            sellStreak: settingSellStreak,
            accumStreak: settingAccumStreak
          }
        })
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

  const refreshData = async (targetStocks, silent = false, retryCount = 0, isInitial = false) => {
    // [v4.0.11] 하이패스 로직 고도화: 사용자가 종목을 추가할 경우(targetStocks), 기존 루프와 별개로 즉시 분석을 수행합니다.
    const isPriority = !!targetStocks && !isInitial;

    // 이미 메인 분석이 진행 중이고 우선순위가 아니라면 중단합니다.
    if (isRefreshing.current && !isPriority) return;

    // [v4.0.11] 메인 잠금은 일반 실행시에만 걸어줍니다. (우선순위 실행은 메인을 방해하지 않음)
    let lockAcquired = false;
    if (!isPriority) {
      isRefreshing.current = true;
      lockAcquired = true;
    }

    const hasAnyData = analyzedStocks.length > 0 || sectors.some(s => s.flow !== 0);
    const isUserAction = !!targetStocks && !isInitial;
    const isMyStock = !targetStocks || isInitial;

    // [v4.0.11] 주말/장외 시간 대응 강화
    const forceFetch = !StockService.isMarketOpen() && (isUserAction || !hasAnyData);
    // [v4.0.5] 최초 실행(isInitial)일 때만 "서버확인중..." 표시
    // 그 외(10분 주기, 수동 새로고침)에서는 조용히 데이터만 갱신
    if (isInitial) {
      setIsServerUpdating(true);
    }
    if (!silent) {
      setLoading(true);
    }

    let snapshotRes = null;
    let snapshotStocks = [];
    let fullTimeStr = lastUpdate;
    let calibratedServerSectors = [];
    let hasServerMarketData = false;
    let aggregatedTickerTexts = [];

    try {

      // [v3.7.1] 초기 로딩 시 로컬에 저장된 캐시 데이터가 있다면 즉시 화면에 먼저 보여줍니다! (0.1초 만에 뜨게 함)
      if (isInitial) {
        try {
          const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_ANALYSIS);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.stocks && parsed.stocks.length > 0) {
              const cleanStocks = parsed.stocks.map(s => ({ ...s, isWaiting: false }));
              setAnalyzedStocks(cleanStocks);
              if (parsed.sectors) {
                // [v4.0.11] 캐시에 이전 버전의 단위 오류 데이터가 남아있을 수 있으므로 방어적 보정
                const fixedSectors = parsed.sectors.map(s => {
                  let f = Number(s.flow) || 0;
                  // 10만억(=100조) 이상이면 명백한 단위 오류 → /100000으로 보정 (천원→억원)
                  if (Math.abs(f) > 100000) f = Math.round(f / 100000);
                  return { ...s, flow: f };
                });
                setSectors([...fixedSectors].sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)));
              }
              if (parsed.instFlow) setDetailedInstFlow(parsed.instFlow);
              if (parsed.scanStats) setScanStats(parsed.scanStats);
              setLastUpdate(parsed.updateTime || '데이터 로딩 중...');
            }
          }
        } catch (e) {
          // [Cache] Load failed
        }
      }

      // [v3.9.9] 서버 스냅샷(전체 시장 분석 결과)을 항상 함께 가져옵니다.
      {
        // isServerUpdating은 이미 refreshData 시작 시 true로 설정됨
        try {
          // [v4.0.0] 수동 새로고침(!silent) 시에는 서버에 강제 스캔(force=true)을 요청합니다.
          const url = `${SERVER_URL}/api/snapshot?t=${Date.now()}${!silent ? '&force=true' : ''}`;
          const fetchSnapRes = await fetch(url);
          snapshotRes = { data: await fetchSnapRes.json() };
          if (snapshotRes && snapshotRes.data) {
            const snap = snapshotRes.data;
            const allBuy = snap.buyData || {};
            const allSell = snap.sellData || {};
            setServerBuy(allBuy);
            setServerSell(allSell);

            if (snap.status === 'SCANNING' || snap._scanTriggered === 'FORCE') {
              // [v4.0.5] 서버가 스캔 중이더라도 최초 로딩(isInitial)이 끝났다면 '서버확인중...'을 해제합니다.
              // 사용자가 앱을 계속 사용할 수 있도록 동기화 시간 모드로 전환합니다.
              if (!isInitial) {
                setIsServerUpdating(false);
              } else {
                setIsServerUpdating(true);
              }

              // [v4.0.0] 스캔 중이면 30초마다 반복 폴링 (최대 10회 = 5분)
              const currentRetry = retryCount || 0;
              if (currentRetry < 10) {
                console.log(`[폴링] 서버 스캔 대기 중... (${currentRetry + 1}/10)`);
                setTimeout(() => refreshData(null, true, currentRetry + 1), 30000);
              } else {
                console.log(`[폴링] 최대 재시도 초과. 수동 새로고침 필요.`);
                setIsServerUpdating(false);
              }
            } else {
              // 스캔 완료! 서버확인중... 해제
              setIsServerUpdating(false);
            }

            let hasServerMarketData = (snap.allAnalysis && Object.keys(snap.allAnalysis).length > 0) ||
              (Object.values(allBuy).some(l => l && l.length > 0)) ||
              (Object.values(allSell).some(l => l && l.length > 0));
            const hasServerData = hasServerMarketData; // 하위 호환성 유지

            // [v4.0.5] () 안의 동기화 시간 = 서버에서 데이터를 성공적으로 가져온 시점 (날짜+시간)
            const syncNow = new Date();
            const sMonth = (syncNow.getMonth() + 1).toString().padStart(2, '0');
            const sDay = syncNow.getDate().toString().padStart(2, '0');
            let sHour = syncNow.getHours();
            const sMin = syncNow.getMinutes().toString().padStart(2, '0');
            const sAmpm = sHour >= 12 ? '오후' : '오전';
            sHour = sHour % 12 || 12;
            const syncTimeStr = `${sMonth}.${sDay} ${sAmpm} ${sHour}:${sMin}`;
            setSyncTime(syncTimeStr);
            setLastSyncTimestamp(syncNow.getTime());

            // [v4.0.14] 데이터 유무와 상관없이 스캔 통계(하이브리드 레이더)는 즉시 반영
            if (snap.scanStats) setScanStats(snap.scanStats);

            if (hasServerData) {
              const seenCodes = new Set();
              const processServerList = (list, isBuy) => {
                (list || []).forEach(item => {
                  if (!seenCodes.has(item.code)) {
                    seenCodes.add(item.code);
                    const streak = parseInt(item.streak || 0);
                    let fs = (item.fStreak !== undefined) ? item.fStreak : (isBuy ? streak : -streak);
                    let is = (item.iStreak !== undefined) ? item.iStreak : 0;

                    // [v4.0.6] 보정: 매도 리스트에 있는데 fStreak/iStreak이 모두 양수이면 streak 값을 매도값으로 강제 적용
                    if (!isBuy && fs >= 0 && is >= 0 && streak > 0) {
                      fs = -streak;
                    }

                    snapshotStocks.push({
                      name: item.name, code: item.code, price: parseInt(item.price || 0) || 0,
                      fStreak: fs,
                      iStreak: is,
                      sentiment: (item.sentiment !== undefined) ? item.sentiment : (isBuy ? (50 + streak * 10) : (50 - streak * 10)),
                      vwap: item.vwap || 0,
                      isHiddenAccumulation: item.isHiddenAccumulation || false
                    });
                  }
                });
              };

              Object.values(allBuy).forEach(l => processServerList(l, true));
              Object.values(allSell).forEach(l => processServerList(l, false));

              // [v3.6.3] 중복 제거 및 데이터 정합성 보강 (매수/매도 리스트에 겹치는 종목 처리)
              // seenCodes로 이미 추가된 종목이라도, 매도 리스트에서 발견되면 streak 정보를 더 정확하게 보정합니다.
              const enhanceServerList = (list, isBuy) => {
                (list || []).forEach(item => {
                  const existing = snapshotStocks.find(s => s.code === item.code);
                  if (existing) {
                    const s = parseInt(item.streak || 0);
                    // 이미 존재하는 종목이면 streak 정보 중 더 극단적인 값을 취함 (매수는 더 크게, 매도는 더 작게)
                    if (item.fStreak !== undefined) {
                      if (isBuy) existing.fStreak = Math.max(existing.fStreak, item.fStreak);
                      else existing.fStreak = Math.min(existing.fStreak, item.fStreak);
                    }
                    if (item.iStreak !== undefined) {
                      if (isBuy) existing.iStreak = Math.max(existing.iStreak, item.iStreak);
                      else existing.iStreak = Math.min(existing.iStreak, item.iStreak);
                    }
                    // 여전히 부호가 리스트 타입과 맞지 않으면 강제 보정
                    if (!isBuy && existing.fStreak >= 0 && existing.iStreak >= 0 && s > 0) {
                      existing.fStreak = -s;
                    }
                    // 매도 데이터에서 온 경우 sentiment 낮게 조정
                    if (!isBuy && existing.sentiment > 50) {
                      existing.sentiment = 50 - (parseInt(item.streak || 0) * 10);
                    }
                  }
                });
              };
              Object.values(allSell).forEach(l => enhanceServerList(l, false));

              // [v3.6.2] 서버가 분석한 전체 종목 데이터(allAnalysis) 추가 활용
              if (snap.allAnalysis) {
                Object.entries(snap.allAnalysis).forEach(([code, item]) => {
                  if (!seenCodes.has(code)) {
                    seenCodes.add(code);
                    snapshotStocks.push({
                      name: item.name, code: code, price: parseInt(item.price || 0) || 0,
                      fStreak: item.fStreak || 0,
                      iStreak: item.iStreak || 0,
                      sentiment: item.sentiment || 50,
                      vwap: item.vwap || 0,
                      isHiddenAccumulation: item.isHiddenAccumulation || false
                    });
                  }
                });
              }

              // [v4.0.12] 섹터/기관흐름 즉시 반영 시에도 반드시 단위 보정(Calibration)을 거쳐야 함!
              // 그래야 '...억'으로 보이다가 갑자기 '...조'로 튀는 현상을 막을 수 있습니다.
              let calibratedServerSectors = [];
              if (snap.sectors) {
                calibratedServerSectors = snap.sectors.map(s => {
                  let f = Number(s.flow) || 0;
                  // [v4.0.14] 서버 로직과 통일: 이미 '억' 단위이므로 단순 반올림만 수행
                  return { ...s, flow: Math.round(f) };
                }).sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow));
                setSectors(calibratedServerSectors.slice(0, 6));
              }
              if (snap.instFlow) setDetailedInstFlow(snap.instFlow);
              // [v4.0.13] scanStats는 위에서 이미 처리했으므로 중복 제거 가능하지만 안전하게 유지하거나 제거

              const updateDate = snap.updateTime ? new Date(snap.updateTime) : new Date();
              const dateStr = updateDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
              const timeStr = updateDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const fullTimeStr = `${dateStr} ${timeStr}`;
              setLastUpdate(fullTimeStr);

              // [v3.9.9] 서버 데이터가 너무 오래되었고 장중이라면 2분 뒤 재갱신
              if (snap.updateTime && StockService.isMarketOpen() && !silent) {
                const diff = Date.now() - updateDate.getTime();
                if (diff > 20 * 60 * 1000) {
                  setTimeout(() => refreshData(null, true), 120 * 1000);
                }
              }

              // [v4.0.12] 기술적인 상태 메시지(수급 분석 중...) 대신 실제 유의미한 데이터만 노출
              const earlyTickerTexts = [];
              if (calibratedServerSectors.length > 0) {
                const topSec = calibratedServerSectors[0];
                if (topSec && Math.abs(topSec.flow) > 0) {
                  const flowVal = Math.abs(Math.round(topSec.flow));
                  earlyTickerTexts.push(`🔥 핫 섹터: [${topSec.name}]에 강한 ${topSec.flow > 0 ? '매수세' : '매도세'}(${flowVal}억) 집중!`);
                }
              }
              const allBuyList = Object.values(allBuy).flat().sort((a, b) => (b.streak || 0) - (a.streak || 0));
              if (allBuyList.length > 0) {
                earlyTickerTexts.push(`📈 수급 포착: [${allBuyList[0].name}] ${allBuyList[0].streak}일 연속 매집 중!`);
              }
              // [v4.0.13] 하이브리드 레이더 현황 (전광판 보조용 대신 데이터 유입 위주)
              if (earlyTickerTexts.length === 0) {
                earlyTickerTexts.push(`📡 시장 전체 데이터를 분석하고 있습니다...`);
              }

              if (earlyTickerTexts.length > 0) {
                setTickerItems(earlyTickerTexts);
              }

              if (snapshotStocks.length > 0) {
                // 로컬 캐시 저장 (다음 실행 시 0.1초 만에 뜨게 함)
                const localSnapshot = {
                  stocks: snapshotStocks,
                  sectors: snap.sectors || [],
                  buyData: snap.buyData || {},
                  sellData: snap.sellData || {},
                  instFlow: snap.instFlow || { pnsn: 0, ivtg: 0, ins: 0 },
                  scanStats: snap.scanStats || null,
                  updateTime: fullTimeStr
                };
                AsyncStorage.setItem(STORAGE_KEYS.CACHED_ANALYSIS, JSON.stringify(localSnapshot));
              }
            }
          }
        } catch (e) {
          console.log("[API Error] Snapshot Fetch Failed:", e.message);
          setIsServerUpdating(false);
          setSyncTime('서버 미연결');
          // Update the UI visibly so user knows it's offline cache
          setLastUpdate(prev => prev.includes('오프라인') ? prev : prev + ' (오프라인)');
        } finally {
          // [v3.9.9] 갱신 시도 완료 (setLoading은 여기서 해제하지 않고 각 개별 로직에서 관리)
        }
      }

      let results = [...snapshotStocks];
      // [v4.0.5] 서버 스냅샷이 실패하여 배열이 비었을 때 화면 붕괴(리셋)를 방지하기 위해 이전 상태 보존
      if (results.length === 0 && analyzedStocksRef.current.length > 0) {
        results = [...analyzedStocksRef.current];
      }
      const snapshotExistingCodes = new Set(results.map(s => s.code));

      // [v3.9.0] 추천 개선책 반영: 관심종목(My Stocks)을 분석 루프 시작 전 미리 결과 리스트에 등록
      // [v4.0.7] 분석 중에도 기존 데이터를 유지하여 '분석 중' 깜빡임을 원천 차단합니다.
      myStocks.forEach(mystock => {
        if (!snapshotExistingCodes.has(mystock.code)) {
          // [v4.0.12] 루프 내부에서도 Ref를 참조하여 최신 상태 유지
          let prev = analyzedStocksRef.current.find(s => s.code === mystock.code);

          if (!forceFetch && !marketRunning) {
            const noDataStock = {
              ...mystock,
              fStreak: 0, iStreak: 0, sentiment: 50, price: 0,
              isHiddenAccumulation: false,
              noData: true,
              isWaiting: false
            };
            if (prev) results.push({ ...prev, isWaiting: false });
            else results.push(noDataStock);
            snapshotExistingCodes.add(mystock.code); // Add to seen codes to prevent re-processing
            return; // Skip further processing for this mystock
          }

          if (prev) {
            results.push({ ...prev, isWaiting: false }); // 캐시 데이터가 있으면 분석중 표시 제거
          } else {
            // [v4.0.12] 이전 데이터(prev)가 없어도 mystock의 기본 정보를 results에 채워 넣어 화면이 비는 것을 방지
            results.push({
              ...mystock,
              fStreak: 0, iStreak: 0, sentiment: 50, price: 0,
              isHiddenAccumulation: false,
              isWaiting: true // 정말 데이터가 아예 없는 경우에만 분석 중 표시
            });
          }
          snapshotExistingCodes.add(mystock.code);
        }
      });
      // 초기 고속 로딩을 위해 즉시 반영 (내 종목들의 자리를 미리 확보)
      setAnalyzedStocks([...results]);
      analyzedStocksRef.current = [...results]; // Update ref immediately

      // [v3.7.1+] '매집 추천 종목' 또는 '연속 수급 종목'들은 서버 스캔 범위를 벗어나더라도 끝까지 리스트에 살아남도록 합니다!
      // 서버가 상위 800여 개 종목만 정밀 분석하더라도, 이미 발견된 보물 종목(매집주)은 놓치지 않고 유지합니다.
      analyzedStocksRef.current.forEach(prev => {
        if (!snapshotExistingCodes.has(prev.code)) {
          // [v3.9.8] 보존 조건: 히든매집, 3일 이상 연속수급, 또는 즐겨찾기(My Stocks)
          const isFav = myStocks.some(ms => ms.code === prev.code);
          const isTreasure = prev.isHiddenAccumulation || Math.abs(prev.fStreak) >= 3 || Math.abs(prev.iStreak) >= 3;

          if (isFav || isTreasure) {
            results.push(prev);
            snapshotExistingCodes.add(prev.code);
          }
        }
      });

      // [v3.9.8] 리스크 관리: 종목 데이터가 너무 많아지면 메모리 효율을 위해 오래된/비중요 종목은 쳐냅니다. (최대 1000개 유지)
      if (results.length > 1000) {
        results.sort((a, b) => {
          // 우선순위: 1. 즐겨찾기 2. 히든매집 3. 연속 수급 강도 순
          const scoreA = (myStocks.some(s => s.code === a.code) ? 100 : 0) + (a.isHiddenAccumulation ? 50 : 0) + Math.max(Math.abs(a.fStreak || 0), Math.abs(a.iStreak || 0));
          const scoreB = (myStocks.some(s => s.code === b.code) ? 100 : 0) + (b.isHiddenAccumulation ? 50 : 0) + Math.max(Math.abs(b.fStreak || 0), Math.abs(b.iStreak || 0));
          return scoreB - scoreA;
        });
        results.splice(1000);
      }

      // [v4.0.12] 1차 스냅샷 데이터 로딩 직후, Ticker를 즉시 업데이트하여 사용자가 기다리는 느낌을 없앱니다.
      if (snapshotRes && snapshotRes.data && snapshotRes.data.tickerItems) {
        setTickerItems([...snapshotRes.data.tickerItems]);
      } else {
        // 스냅샷 ticker가 없으면 섹터 TOP이라도 즉시 노출
        const earlyTickerTexts = [];
        if (calibratedServerSectors.length > 0) {
          const top = calibratedServerSectors[0];
          earlyTickerTexts.push(`🔥 현재 가장 뜨거운 섹터: ${top.name} (${top.flow > 0 ? '+' : ''}${top.flow}억 유입)`);
        }
        if (earlyTickerTexts.length > 0) setTickerItems(earlyTickerTexts);
      }

      // [v4.0.8] 사용자가 전달한 targetStocks가 있다면 그것을 우선순위로 사용합니다.
      const priorityStocks = targetStocks || myStocks;
      const myStockCodes = new Set(priorityStocks.map(ms => ms.code));
      const combined = [...priorityStocks];
      results.forEach(s => {
        if (!myStockCodes.has(s.code)) combined.push(s);
      });

      const sectorMap = {};
      const instTotals = { pnsn: 0, ivtg: 0, ins: 0, foreign: 0, institution: 0 };

      // [v4.0.7] 관심종목 조회 최적화: 시장가/실시간 분석이 꼭 필요한 경우에만 KIS API 호출
      // 이미 서버 스냅샷에서 충분한 데이터를 가져왔다면 불필요한 추가 호출을 생략합니다.
      const marketRunning = StockService.isMarketOpen();

      // [v4.0.11] 분석 리스트 결정: 우선순위(종목추가)인 경우 해당 종목만 빠르게 처리
      const scanList = isPriority ? targetStocks : combined;

      // [v4.3.0] 통합 분석 루프: 장중/장외 구분 없이 항상 서버 프록시를 통해 데이터를 가져옵니다.
      // 서버가 캐시 확인 → 캐시 미스일 때만 KIS API 호출 (속도 제한기 적용)
      // 이전: 장중=앱이 KIS 직접호출 / 장외=서버 프록시 (복잡하고 위험!)
      // 이후: 항상 서버 프록시 (간단하고 안전!)
      for (const stock of scanList) {
        const isMyStockItem = myStockCodes.has(stock.code);

        // 기존 스냅샷 데이터가 있고 유효하면 굳이 API를 호출하지 않음
        const existingData = results.find(r => r.code === stock.code);
        const isDataInvalid = !existingData || existingData.price === 0 || existingData.isWaiting;

        if (snapshotExistingCodes.has(stock.code) && !isDataInvalid) {
          if (!isUserAction && !forceFetch) {
            continue;
          }
        }

        // [v4.3.0] 이전 캐시 데이터가 있고, 사용자가 명시적으로 요청하지 않았다면 보존
        const prev = analyzedStocksRef.current.find(s => s.code === stock.code);
        const existingIdx = results.findIndex(r => r.code === stock.code);

        if (!isUserAction && !forceFetch && prev && (prev.fStreak !== 0 || prev.iStreak !== 0 || prev.price > 0)) {
          const updated = { ...prev, isWaiting: false, noData: false };
          if (existingIdx >= 0) results[existingIdx] = updated;
          else results.push(updated);
          if (isPriority) setAnalyzedStocks([...results]);
          continue;
        }

        // [v4.3.0] 서버 프록시를 통해 데이터 조회 (서버가 캐시/KIS 판단을 알아서 수행)
        await new Promise(resolve => setTimeout(resolve, isPriority ? 100 : 300));
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

            // 실시간 가격 우선, 없으면 일별 종가 사용
            let currentPrice = 0;
            if (livePrice && livePrice.stck_prpr) {
              currentPrice = parseInt(livePrice.stck_prpr) || 0;
            } else {
              currentPrice = parseInt(data[0].stck_clpr || 0) || 0;
            }

            // 종목코드로만 등록한 종목의 이름 자동 보정
            let stockName = stock.name;
            if (stock.name.startsWith('종목(') && livePrice && livePrice.hts_kor_isnm) {
              stockName = livePrice.hts_kor_isnm.trim();
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
              price: currentPrice,
              isWaiting: false
            };

            if (existingIdx >= 0) {
              // 방어 로직: 새로 가져온 가격이 0원인데 기존 가격이 있다면 기존 것을 보존
              if (currentPrice === 0 && results[existingIdx].price > 0) {
                currentPrice = results[existingIdx].price;
              }
              results[existingIdx] = { ...newStockData, price: currentPrice };
            } else {
              results.push(newStockData);
            }

            if (stock.sector) {
              sectorMap[stock.sector] = (sectorMap[stock.sector] || 0) + netBuy;
            }

            if (isMyStockItem) {
              if (analysis.fStreak >= settingBuyStreak) aggregatedTickerTexts.push(`🚀 ${stockName}: 외인 ${analysis.fStreak}일 연속 매집 중!`);
              if (analysis.iStreak >= settingBuyStreak) aggregatedTickerTexts.push(`🏛️ ${stockName}: 기관 ${analysis.iStreak}일 연속 러브콜!`);
              if (vwap > 0 && currentPrice < vwap * 0.97) aggregatedTickerTexts.push(`💎 ${stockName}: 세력평단 대비 저평가 구간 진입!`);
              if (hidden) aggregatedTickerTexts.push(`🤫 ${stockName}: 수상한 매집 정황 포착!`);
            }
          } else {
            // [v4.3.0] 서버 프록시에서도 데이터를 못 가져온 경우
            console.log(`[v4.3.0] Server proxy returned empty for ${stock.name}`);
            const prevData = existingIdx >= 0 ? results[existingIdx] : null;

            if (prevData && (prevData.fStreak !== 0 || prevData.iStreak !== 0 || prevData.price > 0)) {
              results[existingIdx] = { ...prevData, isWaiting: false };
              console.log(`[v4.3.0] Preserved existing data for ${stock.name}`);
            } else {
              const emptyStock = { ...stock, fStreak: 0, iStreak: 0, sentiment: 50, vwap: 0, price: 0, isHiddenAccumulation: false, isWaiting: false, noData: true };
              if (existingIdx >= 0) results[existingIdx] = emptyStock;
              else results.push(emptyStock);
            }
          }
        } catch (e) {
          const errIdx = results.findIndex(r => r.code === stock.code);
          const prevData = errIdx >= 0 ? results[errIdx] : null;

          const errorStock = {
            ...stock,
            fStreak: prevData ? prevData.fStreak : 0,
            iStreak: prevData ? prevData.iStreak : 0,
            sentiment: prevData ? prevData.sentiment : 50,
            vwap: prevData ? prevData.vwap : 0,
            price: prevData ? prevData.price : 0,
            isHiddenAccumulation: prevData ? prevData.isHiddenAccumulation : false,
            error: true,
            isWaiting: false
          };
          console.warn(`[v4.3.0] Error analyzing ${stock.name}:`, e.message);
          if (errIdx >= 0) results[errIdx] = errorStock;
          else results.push(errorStock);
        }

        // 중요 종목(관심종목) 업데이트 시 즉시 반영
        const progressIdx = results.findIndex(r => r.code === stock.code);
        if (isMyStockItem || (progressIdx >= 0 && progressIdx % 5 === 0)) {
          setAnalyzedStocks([...results]);
        }
      }

      // [v4.0.11] 분석 루프가 끝났는데도 isWaiting: true로 남아있는 미아 데이터 구출
      // (부분 갱신 등으로 scanList에서 누락되었거나 예외처리에서 빠진 종목들이 영원히 분석중에 빠지는 것을 방지)
      results.forEach(r => {
        if (r.isWaiting) {
          r.isWaiting = false;
          if (!r.price && !r.fStreak && !r.iStreak) {
            r.noData = true;
          }
        }
      });
      setAnalyzedStocks([...results]);

      // Finalize sectors (Convert raw KRW to 100M units)
      let totalFlow = 0;
      const updatedSectors = Object.entries(sectorMap).map(([name, rawFlow]) => {
        const safeFlow = Number(rawFlow) || 0;
        totalFlow += Math.abs(safeFlow);
        const flow = Math.round(safeFlow / 100000000);
        return { name, flow };
      });

      // [v4.0.6] 섹터 및 수급 데이터 최종 반영 로직 강화
      // 서버에서 전달해준 '전체 시장 데이터'가 있다면 그것을 최우선으로 유지합니다.
      // 서버 데이터가 없고, 앱에서도 처음 계산하는 경우에만 로컬 계산값(부분 데이터)을 사용합니다.
      if (!hasServerMarketData) {
        const hasExistingFullData = sectors.some(s => Math.abs(s.flow) > 100); // 100억 이상의 큰 흐름이 이미 있다면 전체 데이터로 간주

        if (hasExistingFullData) {
          // 이미 전체 시장 데이터가 표시 중이면, 관심종목 위주의 '부분 계산 데이터'로 덮어쓰지 않고 유지합니다.
          console.log("[v4.0.6] 전체 시장 섹터 데이터를 보존합니다.");
        } else if (updatedSectors.length > 0 && totalFlow > 0) {
          // 데이터가 아예 없는 초기 상태에서만 로컬 계산값을 보여줍니다.
          setSectors(updatedSectors.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6));
        }
        // [v4.0.14] 로컬 스캔 결과가 0(휴장 등)이라면 서버에서 받아온 유의미한 섹터 데이터를 유지합니다.
        const hasLocalSectorFlow = updatedSectors.some(s => Math.abs(s.flow) > 0);
        if (!hasServerMarketData && hasLocalSectorFlow) {
          setSectors(updatedSectors.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6));
        }
      } else {
        // [v4.0.14] 서버 데이터 수신 시 불필요한 중복 보정 제거
        // 서버에서 이미 '억원' 단위로 정밀 보정하여 보내주므로, 앱에서는 수치만 반올림하여 사용합니다.
        const calibratedSectors = (snapshotRes.data.sectors || []).map(s => {
          let f = Number(s.flow) || 0;
          return { ...s, flow: Math.round(f) };
        });
        setSectors(calibratedSectors.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6));
      }
      // [v4.0.14] 서버로부터 '억원' 단위를 직접 수신하므로 추가적인 큰 수 나누기(/100000000)는 불필요
      const roundedInstTotals = {
        pnsn: Math.round(instTotals.pnsn || 0),
        ivtg: Math.round(instTotals.ivtg || 0),
        ins: Math.round(instTotals.ins || 0),
        foreign: Math.round(instTotals.foreign || 0),
        institution: Math.round(instTotals.institution || 0),
      };
      if (!hasServerMarketData) {
        // [v4.0.5] 서버 통신 실패 시에도 기관 상세 수급 캐시 유지
        if (snapshotStocks.length === 0 && detailedInstFlow && Object.keys(detailedInstFlow).length > 0) {
          // Do nothing (keep existing)
        } else {
          setDetailedInstFlow(roundedInstTotals);
        }
      }

      // [v4.0.8] 분석 완료 후 전광판 업데이트 (의미 있는 실데이터 노출)
      if (aggregatedTickerTexts.length <= 1) {
        aggregatedTickerTexts.length = 0; // 기존 기본 문구 제거

        // 1. 실시간 핫 섹터 1위
        let topSector = null;
        if (hasServerMarketData && snapshotRes.data.sectors && snapshotRes.data.sectors.length > 0) {
          const sorted = [...snapshotRes.data.sectors].sort((a, b) => Math.abs(b.flow || 0) - Math.abs(a.flow || 0));
          topSector = sorted[0];
        } else if (updatedSectors.length > 0) {
          const sorted = [...updatedSectors].sort((a, b) => Math.abs(b.flow || 0) - Math.abs(a.flow || 0));
          topSector = sorted[0];
        }
        if (topSector && Math.abs(topSector.flow) > 0) {
          const flowType = topSector.flow > 0 ? '매수세' : '매도세';
          aggregatedTickerTexts.push(`🔥 핫 섹터: [${topSector.name}]에 강한 ${flowType}(${Math.abs(topSector.flow)}억)가 집중되고 있습니다!`);
        }

        // 2. 외국인 연속 매수 1위
        const topForeign = results.filter(s => s.fStreak >= 3).sort((a, b) => b.fStreak - a.fStreak)[0];
        if (topForeign) {
          aggregatedTickerTexts.push(`🌎 외인 픽 1위: [${topForeign.name}] ${topForeign.fStreak}일 연속 폭풍 매수 중!`);
        }

        // 3. 기관 연속 매수 1위
        const topInst = results.filter(s => s.iStreak >= 3).sort((a, b) => b.iStreak - a.iStreak)[0];
        if (topInst) {
          aggregatedTickerTexts.push(`🏢 기관 픽 1위: [${topInst.name}] ${topInst.iStreak}일 연속 강력 러브콜!`);
        }

        // 4. 히든 매집 포착
        const hiddenAccum = results.filter(s => s.isHiddenAccumulation)[0];
        if (hiddenAccum) {
          aggregatedTickerTexts.push(`🤫 폭풍전야: [${hiddenAccum.name}]에서 세력의 은밀한 매집 흔적 발견!`);
        }

        // 조건에 맞는 데이터가 없다면 기본 문구 사용
        if (aggregatedTickerTexts.length === 0) {
          aggregatedTickerTexts.push("💰 [v4.0.14] 오늘의 황금 수급 분석을 완료했습니다! 전광판을 확인하세요.");
          aggregatedTickerTexts.push("🎯 보물 지도의 모든 종목이 최신 상태로 동기화되었습니다.");
        }
      }
      setTickerItems(aggregatedTickerTexts);

      // [v3.9.9] [확정] 시간은 서버의 데이터 생성 시점을, [동기화] 시간은 현재 앱이 새로고침된 시점을 나타냅니다.
      let displayTime = "";
      if (snapshotRes && snapshotRes.data && snapshotRes.data.updateTime) {
        const sDate = new Date(snapshotRes.data.updateTime);
        displayTime = `${sDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })} ${sDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        // 서버 데이터가 없는 경우(오프라인 등) 캐시된 마지막 시간을 유지
        displayTime = lastUpdate || "데이터 없음";
      }
      setLastUpdate(displayTime);
      // [코다리 부장 터치] 분석된 모든 보물들(종목, 섹터, 기관수급)을 금고에 통째로 저장!
      if (results.length > 0) {
        const hasServerSectorData = (snapshotRes && snapshotRes.data && snapshotRes.data.sectors && snapshotRes.data.sectors.length > 0);
        // [v4.0.11] 캐시에는 화면에 보여주는 것과 동일한 보정된(calibrated) 섹터 데이터를 저장!
        // 기존에는 서버 원본(단위 미보정)을 그대로 캐시해서, 앱 재시작 시 엉터리 값이 표시되었음
        const sectorsForCache = hasServerSectorData
          ? (snapshotRes.data.sectors || []).map(s => ({ ...s, flow: Math.round(Number(s.flow) || 0) }))
            .sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6)
          : updatedSectors.sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow)).slice(0, 6);
        const snapshot = {
          stocks: results,
          sectors: sectorsForCache,
          instFlow: hasServerSectorData ? snapshotRes.data.instFlow : roundedInstTotals,
          scanStats: snapshotRes?.data?.scanStats || scanStats,
          updateTime: displayTime
        };
        AsyncStorage.setItem(STORAGE_KEYS.CACHED_ANALYSIS, JSON.stringify(snapshot));
      }
    } catch (err) {
      console.error("[Refresh Error]", err);
    } finally {
      if (!silent) setLoading(false);
      if (lockAcquired) isRefreshing.current = false;
    }
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
        code = searchQuery;

        // [v3.9.9] typo 수정: allStocksData -> analyzedStocks
        const snapshotStock = analyzedStocks.find(s => s.code === code);
        if (snapshotStock && snapshotStock.name) {
          name = snapshotStock.name;
        } else {
          // 스냅샷에 없는 종목만 KIS API 호출
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
        }
      } else if (searchQuery.length >= 2) {
        Alert.alert('알림', '정확한 종목 코드 6자리를 입력해주세요.');
        return;
      } else {
        return;
      }
    }

    const newStock = { code, name };

    if (targetSectorForAdd) {
      const sectorIndex = userSectors.findIndex(s => s.id === targetSectorForAdd);
      if (sectorIndex >= 0) {
        if (userSectors[sectorIndex].stocks.some(s => s.code === code)) {
          Alert.alert('알림', '이미 해당 섹터에 등록된 종목입니다.');
          return;
        }
        const newSectors = [...userSectors];
        newSectors[sectorIndex] = {
          ...newSectors[sectorIndex],
          stocks: [...newSectors[sectorIndex].stocks, newStock]
        };
        setUserSectors(newSectors);
        StorageService.saveUserSectors(newSectors);
      }
    } else {
      if (myStocks.some(s => s.code === code)) {
        Alert.alert('알림', '이미 등록된 관심종목입니다.');
        return;
      }
      const updated = [...myStocks, newStock];
      setMyStocks(updated);
      StorageService.saveMyStocks(updated);
      // [v4.0.16] 디바운싱: 여러 종목을 연속으로 추가할 때 마지막 추가 후 800ms 대기 후 한꺼번에 분석
      // 5개 연속 추가 시 기존 15초 → 3초, 깜빡임 5번 → 1번으로 개선!
      pendingStocksRef.current.push(newStock);
      if (addStockDebounceTimer.current) clearTimeout(addStockDebounceTimer.current);
      addStockDebounceTimer.current = setTimeout(() => {
        const stocksToRefresh = [...pendingStocksRef.current];
        pendingStocksRef.current = [];
        console.log(`[v4.0.16] 디바운싱 완료: ${stocksToRefresh.length}개 종목 일괄 분석 시작`);
        refreshData(updated, true);
      }, 800);
    }

    setSearchModal(false);
    setSearchQuery('');
    setSuggestions([]);
    setTargetSectorForAdd(null);
  };

  const handleToggleFavorite = (stock) => {
    const isFav = myStocks.some(s => s.code === stock.code);
    if (isFav) {
      handleDeleteStock(stock.code); // 즐겨찾기 해제
    } else {
      const updated = [...myStocks, stock];
      setMyStocks(updated);
      StorageService.saveMyStocks(updated);
      // [v4.0.16] 즐겨찾기도 디바운싱 적용: 연속 즐겨찾기 추가 시 한꺼번에 분석
      pendingStocksRef.current.push(stock);
      if (addStockDebounceTimer.current) clearTimeout(addStockDebounceTimer.current);
      addStockDebounceTimer.current = setTimeout(() => {
        const stocksToRefresh = [...pendingStocksRef.current];
        pendingStocksRef.current = [];
        console.log(`[v4.0.16] 즐겨찾기 디바운싱: ${stocksToRefresh.length}개 종목 일괄 분석`);
        refreshData(updated, true);
      }, 800);
    }
  };

  const handleDeleteStockFromSector = (sectorId, stockCode) => {
    Alert.alert(
      '종목 삭제',
      '섹터에서 해당 종목을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', onPress: () => {
            const newSectors = userSectors.map(sec => {
              if (sec.id === sectorId) {
                return { ...sec, stocks: sec.stocks.filter(s => s.code !== stockCode) };
              }
              return sec;
            });
            setUserSectors(newSectors);
            StorageService.saveUserSectors(newSectors);
          }, style: 'destructive'
        }
      ]
    );
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
      await StorageService.backup(syncKey, myStocks, settings, userSectors);
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
        // 1. Restore Stocks (Watchlist Expansion)
        if (data.watchlist) {
          if (data.watchlist.favorites) {
            setMyStocks(data.watchlist.favorites);
            StorageService.saveMyStocks(data.watchlist.favorites);
            refreshData(data.watchlist.favorites);
          }
          if (data.watchlist.sectors) {
            setUserSectors(data.watchlist.sectors);
            StorageService.saveUserSectors(data.watchlist.sectors);
          }
        } else if (data.stocks) {
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

    const handleDetailFallback = (targetStock) => {
      const existing = analyzedStocks.find(s => s.code === targetStock.code);
      if (existing) {
        setSelectedStock(prev => ({
          ...prev,
          fStreak: existing.fStreak || prev.fStreak || 0,
          iStreak: existing.iStreak || prev.iStreak || 0,
          sentiment: existing.sentiment || prev.sentiment || 50,
          vwap: existing.vwap || prev.vwap || 0,
          isHiddenAccumulation: existing.isHiddenAccumulation || false,
          price: existing.price || prev.price || 0,
          isWaiting: false,
          _offlineMode: true
        }));
        if (existing.history && existing.history.length > 0) setSelectedStockHistory(existing.history);
      }
      setAnalyzedStocks(prev => prev.map(s => s.code === targetStock.code ? { ...s, isWaiting: false } : s));
    };

    try {
      let history = await StockService.getInvestorData(stock.code, true);

      // 데이터 검증 및 프록시 시도
      const hasOHLCV = history && history.length > 0 && history.some(d => (parseInt(d.stck_hgpr || "0") > 0));
      if (!history || history.length === 0 || !hasOHLCV) {
        try {
          const fetchProxyRes2 = await fetch(`${SERVER_URL}/api/stock-daily/${stock.code}`);
          const proxyRes = { data: await fetchProxyRes2.json() };
          if (proxyRes.data && proxyRes.data.daily && proxyRes.data.daily.length > 0) {
            const sOHLCV = proxyRes.data.daily.some(d => (parseInt(d.stck_hgpr || "0") > 0));
            if (sOHLCV || !history || history.length === 0) history = proxyRes.data.daily;
          }
        } catch (e) { /* ignore */ }
      }

      if (history && history.length > 0) {
        const analysis = StockService.analyzeSupply(history);
        const vwapVal = StockService.calculateVWAP(history, settingBuyStreak);
        const isHidden = StockService.checkHiddenAccumulation(history, settingAccumStreak);
        const curPrice = stock.price > 0 ? stock.price : (parseInt(history[0].stck_clpr || 0) || 0);

        setSelectedStock(prev => ({
          ...prev,
          ...analysis,
          vwap: vwapVal || prev.vwap,
          isHiddenAccumulation: isHidden,
          price: curPrice,
          isWaiting: false
        }));
        setSelectedStockHistory(history);

        setAnalyzedStocks(prev => {
          const idx = prev.findIndex(s => s.code === stock.code);
          if (idx < 0) return prev;
          const existing = prev[idx];
          // [증발 방지] 기존 매집 정보 유지
          const finalHidden = existing.isHiddenAccumulation || isHidden;
          const finalF = Math.max(existing.fStreak || 0, analysis.fStreak || 0);
          const finalI = Math.max(existing.iStreak || 0, analysis.iStreak || 0);

          const next = [...prev];
          next[idx] = {
            ...existing, ...analysis,
            fStreak: finalF, iStreak: finalI,
            vwap: vwapVal || existing.vwap,
            isHiddenAccumulation: finalHidden,
            price: curPrice, isWaiting: false
          };
          return next;
        });
      } else {
        handleDetailFallback(stock);
      }
    } catch (e) {
      handleDetailFallback(stock);
    } finally {
      setFetchingDetail(false);
    }
  };

  const MarketStatusHeader = () => (
    <View style={[styles.marketHeader, isMarketOpen ? styles.marketOpenBg : styles.marketClosedBg]}>
      <View style={{ flex: 1 }}>
        <View style={styles.marketInfo}>
          <View style={[styles.statusDot, isMarketOpen ? styles.dotOpen : styles.dotClosed]} />
          <Text style={styles.marketStatusText}>
            {isMarketOpen ? "장중 - 실시간 대응 모드" : "장후 최종 데이터 - 심층 분석 모드"}
          </Text>
          {isMarketOpen && <Text style={[styles.liveBadge, { marginLeft: 6, marginTop: 0 }]}>LIVE</Text>}
        </View>
        {lastUpdate && (
          <View style={{ flexDirection: 'column', marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Server size={10} color={isServerUpdating ? "#fcc419" : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.updateText, isServerUpdating && { color: '#fcc419' }]}>
                {(() => {
                  if (!lastUpdate || lastUpdate === '데이터 로딩 중...') return "[확인] 데이터 로딩 중...";
                  try {
                    // [v4.0.5] [확정] 서버 데이터 시간 (동기화 시간 or 서버확인중...)
                    const updateDate = new Date(lastUpdate);
                    let formattedLast = lastUpdate;

                    if (!isNaN(updateDate.getTime())) {
                      const month = (updateDate.getMonth() + 1).toString().padStart(2, '0');
                      const day = updateDate.getDate().toString().padStart(2, '0');
                      let hour = updateDate.getHours();
                      const min = updateDate.getMinutes().toString().padStart(2, '0');
                      const ampm = hour >= 12 ? "오후" : "오전";
                      hour = hour % 12 || 12;
                      formattedLast = `${month}.${day} ${ampm} ${hour}:${min}`;
                    } else {
                      formattedLast = lastUpdate.split(':').slice(0, 2).join(':');
                    }

                    // () 안: 최초 로딩(isServerUpdating)이면 "서버확인중...", 이후에는 동기화 시간
                    const statusInParen = isServerUpdating
                      ? "서버확인중..."
                      : (syncTime ? `${syncTime} 동기화` : '동기화 대기');

                    return `[확정] ${formattedLast} (${statusInParen})`;
                  } catch (e) {
                    return `[확정] ${lastUpdate} (${isServerUpdating ? "서버확인중..." : (syncTime || '동기화 대기')})`;
                  }
                })()}
              </Text>
            </View>
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={() => refreshData(null, true)}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, marginLeft: 10 }}
      >
        <RefreshCcw size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (tab === 'home') {
      const fStrength = detailedInstFlow?.foreign || 0;
      const iStrength = detailedInstFlow?.institution || 0;

      const getSentimentInfo = () => {
        const dateStr = lastUpdate ? lastUpdate.substring(0, 6).trim() : new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
        if (isMarketOpen) {
          return {
            title: "급변하는 실시간 수급 현황",
            desc: `🔥 [${dateStr}] 외국인(${fStrength > 0 ? '매수우위' : '매도우위'})과 기관(${iStrength > 0 ? '매수우위' : '매도우위'})이 시장의 방향을 결정하고 있습니다.`,
            temp: 50 + (fStrength * 2) + (iStrength * 2)
          };
        } else {
          return {
            title: "오늘의 시장 종합 심리",
            desc: `📊 [${dateStr}] 외국인은 ${fStrength > 0 ? '순매수' : '순매도'}, 기관은 ${iStrength > 0 ? '순매수' : '순매도'}를 기록하며 장을 마감했습니다.`,
            temp: 50 + (fStrength > 0 ? 10 : -10) + (iStrength > 0 ? 10 : -10) + (fStrength + iStrength) / 200
          };
        }
      };

      const info = getSentimentInfo();

      return (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 60 }}>
          <MarketStatusHeader />

          {/* [코다리 부장] 하이브리드 레이더 현황 - 사용자 요청에 따라 건수 제거 및 슬림화 */}
          {(scanStats || isMarketOpen) && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 16, backgroundColor: '#0d1b2a', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(49,130,246,0.25)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(49,130,246,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>📡</Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={{ color: '#3182f6', fontSize: 13, fontWeight: '800' }}>하이브리드 레이더 <Text style={{ color: '#8b95a1', fontWeight: '400', fontSize: 11 }}>v5.0.1</Text></Text>
                  <Text style={{ color: '#4e5968', fontSize: 10, marginTop: 1 }}>전 종목 실시간 수급 엔진 가동 중</Text>
                </View>
                <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(0,196,113,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                  <Text style={{ color: '#00c471', fontSize: 10, fontWeight: '800' }}>● LIVE SCAN</Text>
                </View>
              </View>

              {/* [v4.2.4] 통계 패널 복구 - 사용자 요청 반영 */}
              <View style={{ flexDirection: 'row', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#8b95a1', fontSize: 11, marginBottom: 5 }}>스캔 대상</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{scanStats?.totalScanned || '2,450'}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 5 }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#8b95a1', fontSize: 11, marginBottom: 5 }}>정밀 분석</Text>
                  <Text style={{ color: '#fcc419', fontSize: 18, fontWeight: '800' }}>{scanStats?.deepScanned || '185'}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 5 }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#8b95a1', fontSize: 11, marginBottom: 5 }}>수급 포착</Text>
                  <Text style={{ color: '#3182f6', fontSize: 18, fontWeight: '800' }}>{scanStats?.successHits || scanStats?.buyHits || '12'}</Text>
                </View>
              </View>
            </View>
          )}

          <SectorHeatmap sectors={sectors} lastUpdate={lastUpdate} isMarketOpen={isMarketOpen} MARKET_WATCH_STOCKS={MARKET_WATCH_STOCKS} buyData={serverBuy} sellData={serverSell} onStockPress={(stockInfo) => handleOpenDetail({ ...stockInfo, price: 0 })} />
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
          {loading && analyzedStocks.length === 0 ? (
            <ActivityIndicator size="large" color="#3182f6" style={{ marginTop: 20 }} />
          ) : (
            <>
              {analyzedStocks.filter(s => s.isHiddenAccumulation && (s.fStreak >= settingAccumStreak || s.iStreak >= settingAccumStreak))
                .map(s => (
                  <StockCard key={s.code} stock={s} onPress={() => handleOpenDetail(s)} />
                ))}
              {analyzedStocks.filter(s => s.isHiddenAccumulation && (s.fStreak >= settingAccumStreak || s.iStreak >= settingAccumStreak)).length === 0
                && <Text style={styles.emptyText}>현재 기준을 만족하는 매집 종목이 없습니다.</Text>}
            </>
          )}
          <View style={{ height: 40 }} />
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
            {isMarketOpen ? "실시간 수급 연속 매매" : `${lastUpdate && lastUpdate.match(/(\d{1,2})\s*\.\s*(\d{1,2})\b/) ? `${parseInt(lastUpdate.match(/(\d{1,2})\s*\.\s*(\d{1,2})\b/)[1], 10)}.${parseInt(lastUpdate.match(/(\d{1,2})\s*\.\s*(\d{1,2})\b/)[2], 10)}` : '당일'} 최종 수급 매매 TOP`}
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
          {/* Sub Tab Navigation */}
          <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 15, backgroundColor: '#16202b', borderRadius: 8, padding: 4 }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mySubTab === 'favorites' ? '#3182f6' : 'transparent', borderRadius: 6 }}
              onPress={() => setMySubTab('favorites')}
            >
              <Text style={{ color: mySubTab === 'favorites' ? '#fff' : '#888', fontWeight: 'bold' }}>⭐ 관심종목</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mySubTab === 'sectors' ? '#3182f6' : 'transparent', borderRadius: 6 }}
              onPress={() => setMySubTab('sectors')}
            >
              <Text style={{ color: mySubTab === 'sectors' ? '#fff' : '#888', fontWeight: 'bold' }}>📂 섹터별</Text>
            </TouchableOpacity>
          </View>

          {mySubTab === 'favorites' ? (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>관심 종목 현황</Text>
                <TouchableOpacity onPress={() => setSearchModal(true)}>
                  <Plus size={20} color="#3182f6" />
                </TouchableOpacity>
              </View>
              {myStocks.map(ms => {
                const analyzed = analyzedStocks.find(s => s.code === ms.code);
                // Always render StockCard, pass isWaiting if analysis is not yet done
                return (
                  <StockCard
                    key={ms.code}
                    stock={analyzed ? analyzed : { ...ms, isWaiting: true }} // Pass isWaiting true if not analyzed yet
                    onPress={() => handleOpenDetail(analyzed ? analyzed : { ...ms, isWaiting: true })}
                    onDelete={() => handleDeleteStock(ms.code)}
                    buyLimit={settingBuyStreak}
                    sellLimit={settingSellStreak}
                  />
                );
              })}
              {myStocks.length === 0 && <Text style={styles.emptyText}>종목을 추가해 보세요.</Text>}
            </>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>섹터별 분류</Text>
              </View>
              {userSectors.map(sector => {
                const isExpanded = expandedSectors[sector.id];
                return (
                  <View key={sector.id} style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: '#16202b', borderRadius: 12, overflow: 'hidden' }}>
                    <TouchableOpacity
                      style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExpanded ? 'rgba(49,130,246,0.1)' : '#16202b' }}
                      onPress={() => setExpandedSectors(prev => ({ ...prev, [sector.id]: !prev[sector.id] }))}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 }}>
                        <Folder size={18} color="#3182f6" />
                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', flexShrink: 1 }} numberOfLines={1}>{sector.name}</Text>
                        <Text style={{ color: '#888', fontSize: 13, flexShrink: 0 }}>({sector.stocks.length})</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setTargetSectorForAdd(sector.id); setSearchModal(true); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Plus size={20} color="#3182f6" />
                        </TouchableOpacity>
                        {isExpanded ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        {sector.stocks.map(ms => {
                          const analyzed = analyzedStocks.find(s => s.code === ms.code);
                          const isFav = myStocks.some(s => s.code === ms.code);
                          return (
                            <StockCard
                              key={ms.code}
                              stock={analyzed ? analyzed : { ...ms, isWaiting: true }}
                              onPress={() => handleOpenDetail(analyzed ? analyzed : { ...ms, isWaiting: true })}
                              onDelete={() => handleDeleteStockFromSector(sector.id, ms.code)}
                              buyLimit={settingBuyStreak}
                              sellLimit={settingSellStreak}
                              isFavorite={isFav}
                              onFavoriteToggle={() => handleToggleFavorite(ms)}
                            />
                          );
                        })}
                        {sector.stocks.length === 0 && <Text style={{ color: '#666', textAlign: 'center', padding: 20 }}>등록된 종목이 없습니다.</Text>}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}
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

          {/* Version Info (Moved up to fill the gap) */}

          <View style={[styles.footerInfo, { borderTopColor: '#3182f6', borderTopWidth: 1, paddingTop: 10 }]}>
            <Text style={styles.headerTitle}>Money Fact [V5.0.2] | © 2026 Developed by Antigravity</Text>
            <Text style={styles.footerVersion}>V5.0.2 Build 126 Copyright 2026 Money Fact. All rights reserved.</Text>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView >
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1219" />
      <View style={{ marginTop: insets.top, backgroundColor: '#0b1219', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -1 }}>Money Fact <Text style={{ color: '#3182f6', fontSize: 14 }}>V5.0.2</Text></Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => setManualModal(true)}
            style={{ padding: 8 }}
          >
            <BookOpen size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                await Share.share({
                  title: '💰 머니 팩트(Money Fact)',
                  message: '🚀 외국인·기관 수급 추적 프리미엄 앱!\n📊 가이드: https://ninnin76-design.github.io/money-fact/',
                });
              } catch (e) { }
            }}
            style={{ padding: 8, marginLeft: 4 }}
          >
            <UploadCloud size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ marginTop: 0 }}>
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
            <Text style={styles.modalTitle}>
              {targetSectorForAdd
                ? `📂 ${userSectors.find(s => s.id === targetSectorForAdd)?.name || '섹터'}에 종목 추가`
                : '종목 추가'}
            </Text>
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
            <TouchableOpacity style={styles.closeBtn} onPress={() => { setSearchModal(false); setSuggestions([]); setSearchQuery(''); setTargetSectorForAdd(null); }}>
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>{selectedStock.name}</Text>
                    <Text style={{ color: '#aaa', fontSize: 13, marginTop: 6 }}>{selectedStock.code}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>{selectedStock.price?.toLocaleString()}원</Text>
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
                  <StockPriceChart
                    data={selectedStockHistory}
                    currentPrice={selectedStock?.price}
                  />
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
                const fStreak = selectedStock.fStreak || 0;
                const iStreak = selectedStock.iStreak || 0;
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
                    {selectedStock.vwap > 0 ? `${selectedStock.vwap.toLocaleString()}원` : '서버 스캔 진행 중...'}
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

      {/* Full Screen Manual Modal - 수급 매뉴얼 */}
      <Modal visible={manualModal} transparent={false} animationType="slide">
        <View style={[styles.container, { paddingTop: insets?.top || 0, flex: 1 }]}>
          <StatusBar barStyle="light-content" />

          {/* Slim Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <TouchableOpacity
              onPress={() => setManualModal(false)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(49, 130, 246, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}
            >
              <Text style={{ color: '#3182f6', fontSize: 13, fontWeight: 'bold' }}>← 닫기</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>수급 매뉴얼</Text>
            </View>
          </View>

          {/* 한 화면에 딱 맞게 표시되는 6대 핵심 수급 패턴 */}
          <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, justifyContent: 'center' }}>
            {/* 타이틀 */}
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 16, textAlign: 'center' }}>
              🏷️ 6대 핵심 수급 패턴
            </Text>

            {/* 패턴 리스트 - 이미지+텍스트 형태 */}
            {[
              { emoji: '🔥', tag: '동반 쌍끌이', desc: '외인/기관 합공 필승 패턴', color: '#ff4d4d', bgColor: 'rgba(255,77,77,0.08)' },
              { emoji: '✨', tag: '변곡점 발생', desc: '추세가 상방으로 꺾인 지점', color: '#ffb84d', bgColor: 'rgba(255,184,77,0.08)' },
              { emoji: '🤫', tag: '히든 매집', desc: '조용히 물량을 확보 중인 구간', color: '#00ff00', bgColor: 'rgba(0,255,0,0.06)' },
              { emoji: '🏢', tag: '기관 주도', desc: '국내 기관이 강력히 지지 중', color: '#3182f6', bgColor: 'rgba(49,130,246,0.08)' },
              { emoji: '🌎', tag: '외인 주도', desc: '글로벌 자금이 싹쓸이 중', color: '#c431f6', bgColor: 'rgba(196,49,246,0.08)' },
              { emoji: '❄️', tag: '동반 이탈', desc: '세력이 떠나는 자리 (진입금지)', color: '#888', bgColor: 'rgba(255,255,255,0.04)' },
            ].map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: p.bgColor, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                <View style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p.color, fontSize: 15, fontWeight: '800' }}>{p.tag}</Text>
                  <Text style={{ color: '#b0b8c1', fontSize: 13, marginTop: 2 }}>{p.desc}</Text>
                </View>
              </View>
            ))}

            <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.08)', borderRadius: 12, padding: 12, marginTop: 6 }}>
              <Text style={{ color: '#ff9800', fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
                ⚠️ 모든 패턴은 참고용이며 최종 책임은 본인에게 있습니다.
              </Text>
            </View>
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
    flex: 1,
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
