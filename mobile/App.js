import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, StatusBar,
  ActivityIndicator, Dimensions, Alert, ImageBackground, Platform
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';
import {
  TrendingUp, TrendingDown, Wand2,
  CheckCircle2, X, ClipboardList, Search, Plus, Trash2, Star, AlertTriangle
} from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const API_BASE = 'https://money-fact-server.onrender.com';
const MY_STOCKS_KEY = '@my_stocks';

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
  const [dangerAlert, setDangerAlert] = useState(null); // 위험 알림

  // Load MyStocks from AsyncStorage on mount
  useEffect(() => {
    loadMyStocks();
  }, []);

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

      // Check for danger stocks and set alert
      const dangerStocks = result.filter(s => s.isDanger);
      if (dangerStocks.length > 0) {
        setDangerAlert(`⚠️ ${dangerStocks.map(s => s.name).join(', ')} 종목에서 기관/외인 이탈이 감지되었습니다!`);
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
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.stockCard, analysis?.isDanger && styles.stockCardDanger]}
                onPress={() => runAnalysis({ ...item, price: analysis?.price || '0' })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockName}>{item.name}</Text>
                  {analysis && (
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      {analysis.isDanger && (
                        <View style={styles.dangerBadge}>
                          <Text style={styles.dangerBadgeText}>⚠️ 기관/외인 이탈</Text>
                        </View>
                      )}
                      {analysis.isOpportunity && !analysis.isDanger && (
                        <View style={styles.opportunityBadge}>
                          <Text style={styles.opportunityBadgeText}>💰 수급 유입</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {analysis && (
                    <Text style={styles.stockPrice}>{parseInt(analysis.price).toLocaleString()}원</Text>
                  )}
                  <TouchableOpacity onPress={() => removeStock(item.code)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Trash2 size={18} color="#F04452" />
                  </TouchableOpacity>
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
  modalCloseBtnText: { color: '#fff', fontWeight: '900', fontSize: 17 }
});
