import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, StatusBar,
  ActivityIndicator, Dimensions, Alert, ImageBackground, Platform, Switch, LogBox
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

const { width } = Dimensions.get('window');
const API_BASE = 'https://money-fact-server.onrender.com';
const MY_STOCKS_KEY = '@my_stocks';
const BACKGROUND_TASK_NAME = 'BACKGROUND_STOCK_CHECK';

// 1. Notification Configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NOTIF_HISTORY_KEY = '@notif_history';

// 2. Background Task Definition
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const saved = await AsyncStorage.getItem(MY_STOCKS_KEY);
    if (!saved) return BackgroundFetch.BackgroundFetchResult.NoData;

    const myStocks = JSON.parse(saved);
    if (myStocks.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    const codes = myStocks.map(s => s.code);
    const res = await axios.post(`${API_BASE}/api/my-portfolio/analyze`, { codes }, { timeout: 20000 });
    const result = res.data.result || [];

    const dangerStocks = result.filter(s => s.isDanger);
    if (dangerStocks.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    // --- Daily Notification Throttling Logic ---
    const today = new Date().toISOString().split('T')[0]; // "2024-05-20"
    const historyRaw = await AsyncStorage.getItem(NOTIF_HISTORY_KEY);
    let history = historyRaw ? JSON.parse(historyRaw) : {};

    // Notify only if not notified today
    const stocksToNotify = dangerStocks.filter(s => history[s.code] !== today);

    if (stocksToNotify.length > 0) {
      const names = stocksToNotify.map(s => s.name).join(', ');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Money Fact 위험 감지!",
          body: `${names} 종목에서 외인/기관의 강한 이탈이 포착되었습니다! 내용을 확인하세요.`,
          data: { screen: 'my' },
        },
        trigger: null,
      });

      // Update history
      stocksToNotify.forEach(s => { history[s.code] = today; });
      await AsyncStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(history));

      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("[Background] Task Error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

function MainApp() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('buy'); // 'buy', 'sell', 'my'
  const period = '5';
  const [investor, setInvestor] = useState('0');
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportTitle, setReportTitle] = useState('');
  const [lastUpdate, setLastUpdate] = useState('-');

  // MY Portfolio State
  const [myStocks, setMyStocks] = useState([]); // [{code, name}]
  const [myAnalysis, setMyAnalysis] = useState([]); // Analyzed data from server
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [dangerAlert, setDangerAlert] = useState(null); // 위험 알림 정의 복구

  // Notifications state
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  const NOTIF_STORAGE_KEY = '@notif_enabled';

  // Load Everything on mount
  useEffect(() => {
    const init = async () => {
      await loadMyStocks();
      const savedNotif = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
      const enabled = savedNotif !== null ? JSON.parse(savedNotif) : true;
      setIsNotificationEnabled(enabled);
      setupBackgroundTasks(enabled);
    };
    init();
  }, []);

  const toggleNotification = async (val) => {
    setIsNotificationEnabled(val);
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(val));
    setupBackgroundTasks(val);
  };

  const setupBackgroundTasks = async (enabled) => {
    if (!enabled) {
      try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
        console.log("[App] Background task UNREGISTERED");
      } catch (e) { }
      return;
    }

    // Permission for notifications
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission NOT granted');
      return;
    }

    // Register Background Fetch
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false, // Continue after app closes
        startOnBoot: true, // Auto start on phone boot
      });
      console.log("[App] Background task registered successfully");
    } catch (err) {
      console.log("[App] Background registration failed:", err);
    }
  };

  // Analyze MyStocks when mode is 'my' or on initial load
  useEffect(() => {
    if (myStocks.length > 0) {
      analyzeMyPortfolio();
    }
  }, [myStocks]);

  const loadMyStocks = async () => {
    try {
      const saved = await AsyncStorage.getItem(MY_STOCKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMyStocks(parsed);
      }
    } catch (e) { console.error('Load MyStocks Error', e); }
  };

  const saveMyStocks = async (data) => {
    try {
      await AsyncStorage.setItem(MY_STOCKS_KEY, JSON.stringify(data));
    } catch (e) { console.error('Save MyStocks Error', e); }
  };

  const addStock = (stock) => {
    if (myStocks.find(s => s.code === stock.code)) {
      Alert.alert('알림', '이미 등록된 종목입니다.');
      return;
    }
    const updated = [...myStocks, stock];
    setMyStocks(updated);
    saveMyStocks(updated);
    setSearchVisible(false);
    setSearchKeyword('');
    setSearchResults([]);
  };

  const removeStock = (code) => {
    const updated = myStocks.filter(s => s.code !== code);
    setMyStocks(updated);
    saveMyStocks(updated);
    setMyAnalysis(myAnalysis.filter(s => s.code !== code));
  };

  const searchStock = async (keyword) => {
    setSearchKeyword(keyword);
    if (keyword.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/search?keyword=${encodeURIComponent(keyword)}`);
      setSearchResults(res.data.result || []);
    } catch (e) { setSearchResults([]); }
  };

  const analyzeMyPortfolio = async () => {
    if (myStocks.length === 0) return;
    setLoading(true);
    try {
      const codes = myStocks.map(s => s.code);
      const res = await axios.post(`${API_BASE}/api/my-portfolio/analyze`, { codes }, { timeout: 30000 });
      const result = res.data.result || [];
      setMyAnalysis(result);

      // Check for danger stocks and set detailed alert
      const alerts = [];
      result.forEach(s => {
        const a = s.analysis;
        if (a.foreigner.sell >= 3) alerts.push(`${s.name} 외인 이탈 ${a.foreigner.sell}일`);
        if (a.institution.sell >= 3) alerts.push(`${s.name} 기관 이탈 ${a.institution.sell}일`);
      });
      if (alerts.length > 0) {
        setDangerAlert(`⚠️ ${alerts.join(', ')}`);
      } else {
        setDangerAlert(null);
      }
    } catch (e) {
      console.error('Analyze MyPortfolio Error', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketData = useCallback(async (retryCount = 0) => {
    if (retryCount === 0) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/analysis/supply/${period}/${investor}?mode=${mode}`, { timeout: 15000 });
      setStocks(res.data.output || []);
      setLastUpdate(res.data.updateTime ? new Date(res.data.updateTime).toLocaleTimeString() : '-');
      setLoading(false);
    } catch (e) {
      if (retryCount < 4) {
        setTimeout(() => fetchMarketData(retryCount + 1), 3000);
      } else {
        setLoading(false);
      }
    }
  }, [mode, investor]);

  useEffect(() => {
    if (mode !== 'my') {
      fetchMarketData();
      const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [mode, investor, fetchMarketData]);

  const runAnalysis = async (stk) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/portfolio/recommend`, {
        stocks: [{ ...stk, price: stk.price || '0' }],
        amount: '10000000',
        mode: mode === 'my' ? 'buy' : mode,
        ignoreBudget: true
      }, { timeout: 15000 });
      setReportData(res.data.portfolio);
      setReportTitle(`📊 ${stk.name} 심층 분석 보고서`);
      setReportVisible(true);
    } catch (e) {
      Alert.alert('분석 실패', '서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisForStock = (code) => {
    return myAnalysis.find(a => a.code === code);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Danger Alert Banner */}
      {dangerAlert && (
        <View style={styles.dangerBanner}>
          <AlertTriangle size={16} color="#fff" />
          <Text style={styles.dangerBannerText}>{dangerAlert}</Text>
          <TouchableOpacity onPress={() => setDangerAlert(null)}>
            <X size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Banner */}
      <ImageBackground
        source={require('./assets/banner.png')}
        style={styles.bannerContainer}
        resizeMode="cover"
      >
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerBrandText}>Money Fact</Text>
        </View>
      </ImageBackground>

      {/* Mode Tabs: BUY, SELL, MY */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'buy' && styles.modeTabActiveBuy]}
          onPress={() => setMode('buy')}
        >
          <TrendingUp size={14} color={mode === 'buy' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'buy' && styles.modeTextActive]}>BUY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'sell' && styles.modeTabActiveSell]}
          onPress={() => setMode('sell')}
        >
          <TrendingDown size={14} color={mode === 'sell' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'sell' && styles.modeTextActive]}>SELL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'my' && styles.modeTabActiveMy]}
          onPress={() => { setMode('my'); analyzeMyPortfolio(); }}
        >
          <Star size={14} color={mode === 'my' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'my' && styles.modeTextActive]}>MY</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Investor Filter (only for buy/sell) */}
        {mode !== 'my' && (
          <View style={styles.stickySection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {['0', '2', '1'].map((v, i) => {
                const labels = ['전체 주체', '외국인', '기관 합계'];
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, investor === v && styles.chipActive]}
                    onPress={() => setInvestor(v)}
                  >
                    <Text style={[styles.chipText, investor === v && styles.chipTextActive]}>{labels[i]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.listContainer}>
          {/* Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.dot} />
            <Text style={styles.statusText}>
              {loading ? '데이터 분석 중...' : mode === 'my' ? `내 종목 ${myStocks.length}개 관리 중` : '✅ 실시간 수급 데이터 동기화 완료'}
            </Text>
          </View>

          {/* MY Mode: Notification Settings Toggle */}
          {mode === 'my' && (
            <View style={styles.notifSettingCard}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {isNotificationEnabled ? <Bell size={20} color="#6227FF" /> : <BellOff size={20} color="#888" />}
                <View>
                  <Text style={styles.notifLabel}>실시간 위험 감지 알림</Text>
                  <Text style={styles.notifSubLabel}>
                    {isNotificationEnabled ? '15분마다 수급 이탈을 감시합니다' : '알림이 꺼져 있습니다'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isNotificationEnabled}
                onValueChange={toggleNotification}
                trackColor={{ false: '#D1D1D6', true: '#6227FF' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : isNotificationEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}

          {/* MY Mode: Add Stock Button */}
          {mode === 'my' && (
            <TouchableOpacity style={styles.addStockBtn} onPress={() => setSearchVisible(true)}>
              <Plus size={18} color="#3182F6" />
              <Text style={styles.addStockBtnText}>내 종목 추가</Text>
            </TouchableOpacity>
          )}

          {/* Empty State */}
          {!loading && mode !== 'my' && stocks.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ fontSize: 14, color: '#888' }}>해당 조건의 종목이 없습니다.</Text>
            </View>
          )}
          {!loading && mode === 'my' && myStocks.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ fontSize: 14, color: '#888' }}>등록된 종목이 없습니다.</Text>
              <Text style={{ fontSize: 12, color: '#aaa', marginTop: 5 }}>위의 버튼을 눌러 종목을 추가하세요.</Text>
            </View>
          )}

          {/* BUY/SELL Mode Stock List */}
          {mode !== 'my' && stocks.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={styles.stockCard}
              onPress={() => runAnalysis(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.stockName}>{item.name}</Text>
                <Text style={styles.stockStreak}>
                  {item.streak}일 연속 {mode === 'buy' ? '매집' : '이탈'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.stockPrice}>{parseInt(item.price).toLocaleString()}원</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* MY Mode Stock List */}
          {mode === 'my' && myStocks.map((item) => {
            const analysis = getAnalysisForStock(item.code);
            const a = analysis?.analysis; // { foreigner: {buy, sell}, institution: {buy, sell} }
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.stockCard, styles.stockCardMy, analysis?.isDanger && styles.stockCardDanger]}
                onPress={() => runAnalysis({ ...item, price: analysis?.price || '0' })}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeStock(item.code)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Trash2 size={16} color="#F04452" />
                    </TouchableOpacity>
                  </View>
                  {analysis && (
                    <Text style={styles.stockPriceMy}>{parseInt(analysis.price).toLocaleString()}원</Text>
                  )}
                  {a && (
                    <View style={styles.badgeGrid}>
                      {/* 외국인 수급 */}
                      {a.foreigner.buy >= 3 && (
                        <View style={styles.badgeBuy}>
                          <Text style={styles.badgeBuyText}>💰 외인 수급 {a.foreigner.buy}일</Text>
                        </View>
                      )}
                      {/* 외국인 이탈 */}
                      {a.foreigner.sell >= 3 && (
                        <View style={styles.badgeSell}>
                          <Text style={styles.badgeSellText}>⚠️ 외인 이탈 {a.foreigner.sell}일</Text>
                        </View>
                      )}
                      {/* 기관 수급 */}
                      {a.institution.buy >= 3 && (
                        <View style={styles.badgeBuy}>
                          <Text style={styles.badgeBuyText}>💰 기관 수급 {a.institution.buy}일</Text>
                        </View>
                      )}
                      {/* 기관 이탈 */}
                      {a.institution.sell >= 3 && (
                        <View style={styles.badgeSell}>
                          <Text style={styles.badgeSellText}>⚠️ 기관 이탈 {a.institution.sell}일</Text>
                        </View>
                      )}
                      {/* 아무 신호도 없을 때 */}
                      {a.foreigner.buy < 3 && a.foreigner.sell < 3 && a.institution.buy < 3 && a.institution.sell < 3 && (
                        <View style={styles.badgeNeutral}>
                          <Text style={styles.badgeNeutralText}>특이 신호 없음</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={searchVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.searchSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>종목 검색</Text>
              <TouchableOpacity onPress={() => { setSearchVisible(false); setSearchKeyword(''); setSearchResults([]); }}>
                <X size={24} color="#191F28" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputContainer}>
              <Search size={18} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="종목명 또는 코드 입력"
                placeholderTextColor="#aaa"
                value={searchKeyword}
                onChangeText={searchStock}
                autoFocus={true}
              />
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {searchResults.map((item) => (
                <TouchableOpacity key={item.code} style={styles.searchResultItem} onPress={() => addStock(item)}>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultCode}>{item.code}</Text>
                </TouchableOpacity>
              ))}
              {searchKeyword.length > 0 && searchResults.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>검색 결과가 없습니다.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{reportTitle}</Text>
              <TouchableOpacity onPress={() => setReportVisible(false)}>
                <X size={24} color="#191F28" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {reportData.map((p) => (
                <View key={p.code} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportCardName}>{p.name} <Text style={styles.reportCardCode}>{p.code}</Text></Text>
                  </View>
                  <View style={styles.grid}>
                    <View style={styles.gridItem}><Text style={styles.gridLabel}>PER (수익성)</Text><Text style={styles.gridValue}>{p.finance.per}배</Text><Text style={styles.gridEval}>👉 {p.perText}</Text></View>
                    <View style={styles.gridItem}><Text style={styles.gridLabel}>PBR (자산가치)</Text><Text style={styles.gridValue}>{p.finance.pbr}배</Text><Text style={styles.gridEval}>👉 {p.pbrText}</Text></View>
                  </View>
                  <View style={styles.insightBox}><Text style={styles.insightLabel}>💡 AI 리서치 인사이트</Text><Text style={styles.insightText}>{p.insight}</Text></View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setReportVisible(false)}><Text style={styles.modalCloseBtnText}>확인</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3182F6" />
          <Text style={{ marginTop: 10, fontWeight: 'bold', color: '#555' }}>데이터 분석 중...</Text>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  dangerBanner: { backgroundColor: '#F04452', flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  dangerBannerText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '700' },
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
  dangerBadge: { backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dangerBadgeText: { fontSize: 10, fontWeight: '800', color: '#F04452' },
  opportunityBadge: { backgroundColor: '#EBF4FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  opportunityBadgeText: { fontSize: 10, fontWeight: '800', color: '#3182F6' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '88%' },
  searchSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#191F28' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F7FB', borderRadius: 14, paddingHorizontal: 14, gap: 10, marginBottom: 15 },
  searchInput: { flex: 1, padding: 14, fontSize: 16, fontWeight: '600', color: '#191F28' },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F2F4F6' },
  searchResultName: { fontSize: 15, fontWeight: '700', color: '#191F28' },
  searchResultCode: { fontSize: 12, color: '#888' },
  reportCard: { backgroundColor: '#F9FAFB', padding: 22, borderRadius: 24, marginBottom: 15, borderLeftWidth: 6, borderLeftColor: '#3182F6' },
  reportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  reportCardName: { fontSize: 19, fontWeight: '900', color: '#191F28' },
  reportCardCode: { fontSize: 10, color: '#999' },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  gridItem: { flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 16 },
  gridLabel: { fontSize: 10, color: '#888', fontWeight: '800', marginBottom: 5 },
  gridValue: { fontSize: 15, fontWeight: '900', color: '#191F28' },
  gridEval: { fontSize: 10, color: '#3182F6', fontWeight: '800', marginTop: 5 },
  insightBox: { backgroundColor: '#fff', padding: 18, borderRadius: 16 },
  insightLabel: { fontSize: 11, fontWeight: '900', color: '#3182F6', marginBottom: 6 },
  insightText: { fontSize: 13, color: '#313131', lineHeight: 19 },
  modalCloseBtn: { backgroundColor: '#3182F6', padding: 20, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  modalCloseBtnText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  // MY Tab Styles
  stockCardMy: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  stockPriceMy: { fontSize: 14, fontWeight: '700', color: '#4E5968', marginTop: 4 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badgeBuy: { backgroundColor: '#EBF4FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeBuyText: { fontSize: 11, fontWeight: '800', color: '#3182F6' },
  badgeSell: { backgroundColor: '#FFF0F0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeSellText: { fontSize: 11, fontWeight: '800', color: '#F04452' },
  badgeNeutral: { backgroundColor: '#F2F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeNeutralText: { fontSize: 11, fontWeight: '700', color: '#888' },
  // Notification Toggle Styles
  notifSettingCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F2F4F6' },
  notifLabel: { fontSize: 14, fontWeight: '800', color: '#191F28' },
  notifSubLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 2 }
});
