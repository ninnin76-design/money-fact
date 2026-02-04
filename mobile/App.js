import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, SafeAreaView, StatusBar,
  ActivityIndicator, Dimensions, Alert, ImageBackground, Platform
} from 'react-native';
import {
  TrendingUp, TrendingDown, Wand2,
  CheckCircle2, X, ClipboardList
} from 'lucide-react-native';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_BASE = 'http://192.168.45.7:3000'; // 대표님의 서버 로컬 IP

export default function App() {
  const [mode, setMode] = useState('buy');
  const [period, setPeriod] = useState('5');
  const [investor, setInvestor] = useState('0');
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [seedMoney, setSeedMoney] = useState('10,000,000');
  const [loading, setLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportTitle, setReportTitle] = useState('');

  const formatNumber = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const unformatNumber = (s) => s.replace(/,/g, '');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/analysis/supply/${period}/${investor}?mode=${mode}`);
      setStocks(res.data.output || []);
    } catch (e) {
      console.error(e);
      Alert.alert('연결 오류', '서버가 켜져 있는지 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [mode, period, investor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleStock = (code) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  };

  const handleRecommend = async () => {
    const budget = parseInt(unformatNumber(seedMoney)) || 0;
    const affordable = stocks.filter(s => parseInt(s.price) <= budget);
    if (affordable.length === 0) {
      Alert.alert('알림', '현재 자산으로 매수 가능한 종목이 없습니다.');
      return;
    }
    const top3 = [...affordable].sort((a, b) => b.streak - a.streak).slice(0, 3);
    const codes = new Set(top3.map(s => s.code));
    setSelected(codes);
    runAnalysis("✨ 자산 최적화 AI 추천 리포트", false, top3);
  };

  const runAnalysis = async (title, isPure = true, targetStocks = null) => {
    const finalTargets = targetStocks || stocks.filter(s => selected.has(s.code));
    if (finalTargets.length === 0) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/portfolio/recommend`, {
        stocks: finalTargets,
        amount: unformatNumber(seedMoney),
        mode,
        ignoreBudget: isPure
      });
      setReportData(res.data.portfolio);
      setReportTitle(title || "📊 전문가 심층 리서치 보고서");
      setReportVisible(true);
    } catch (e) {
      Alert.alert('분석 실패', '서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Set status bar to translucent to handle notch better on Android */}
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* 1. Slim Branding Banner (Fixed Top with Safe Area Padding) */}
      <ImageBackground
        source={require('./assets/banner.png')}
        style={styles.bannerContainer}
        resizeMode="cover"
      >
        <Text style={styles.bannerBrandText}>Money Fact</Text>
      </ImageBackground>

      {/* 2. Mode Tabs (Side by Side) */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'buy' && styles.modeTabActiveBuy]}
          onPress={() => { setMode('buy'); setSelected(new Set()); }}
        >
          <TrendingUp size={16} color={mode === 'buy' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'buy' && styles.modeTextActive]}>수급 기회 (BUY)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'sell' && styles.modeTabActiveSell]}
          onPress={() => { setMode('sell'); setSelected(new Set()); }}
        >
          <TrendingDown size={16} color={mode === 'sell' ? '#fff' : '#888'} />
          <Text style={[styles.modeTabText, mode === 'sell' && styles.modeTextActive]}>위험 감지 (SELL)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filters & Wallet */}
        <View style={styles.stickySection}>
          {mode === 'buy' && (
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>운용 자산 규모 (₩)</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.moneyInput}
                  value={seedMoney}
                  keyboardType="numeric"
                  onFocus={() => setSeedMoney('')}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^0-9]/g, '');
                    setSeedMoney(clean === '' ? '' : formatNumber(clean));
                  }}
                  onBlur={() => { if (seedMoney === '') setSeedMoney('1,000,000') }}
                />
                <TouchableOpacity style={styles.btnMagic} onPress={handleRecommend}>
                  <Wand2 size={16} color="#fff" />
                  <Text style={styles.btnMagicText}>AI 추천</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['0', '4', '2', '1'].map((v, i) => {
              const labels = ['전체 주체', '연기금', '외국인', '기관 합계'];
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, investor === v && styles.chipActive]}
                  onPress={() => setInvestor(v)}
                >
                  <Text style={[styles.chipText, investor === v && styles.chipTextActive]}>{labels[i]}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['5', '10', '20', '30'].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, period === v && styles.chipActive]}
                onPress={() => setPeriod(v)}
              >
                <Text style={[styles.chipText, period === v && styles.chipTextActive]}>{v}일 연속</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stock List */}
        <View style={styles.listContainer}>
          <View style={styles.statusBar}>
            <View style={styles.dot} />
            <Text style={styles.statusText}>{loading ? '데이터 스캔 중...' : '✅ 실시간 수급 데이터 동기화 완료'}</Text>
          </View>

          {stocks.map((item) => {
            const isSelected = selected.has(item.code);
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.stockCard, isSelected && styles.stockCardSelected]}
                onPress={() => toggleStock(item.code)}
              >
                <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
                  {isSelected && <CheckCircle2 size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockName}>{item.name}</Text>
                  <Text style={styles.stockStreak}>{item.streak}일 연속 {mode === 'buy' ? '매집' : '이탈'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.stockPrice}>{parseInt(item.price).toLocaleString()}원</Text>
                  <Text style={[styles.stockRate, { color: parseFloat(item.rate) > 0 ? '#F04452' : '#3182F6' }]}>
                    {item.rate}%
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom FAB */}
      {selected.size > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fab} onPress={() => runAnalysis()}>
            <ClipboardList size={20} color="#fff" />
            <Text style={styles.fabText}>심층 리서치 보고서 ({selected.size})</Text>
          </TouchableOpacity>
        </View>
      )}

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
                    <View style={styles.shareBadge}><Text style={styles.shareBadgeText}>{p.shares}주 매수 가능</Text></View>
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

      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#3182F6" /></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  bannerContainer: {
    width: '100%',
    height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EB',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0
  },
  bannerBrandText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3182F6',
    letterSpacing: -1,
    marginTop: Platform.OS === 'android' ? 5 : 0
  },

  modeTabs: { flexDirection: 'row', backgroundColor: '#EEE', marginHorizontal: 15, marginVertical: 10, borderRadius: 12, padding: 4 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 9, gap: 8 },
  modeTabActiveBuy: { backgroundColor: '#3182F6' },
  modeTabActiveSell: { backgroundColor: '#F04452' },
  modeTabText: { fontSize: 13, fontWeight: '900', color: '#888' },
  modeTextActive: { color: '#fff' },

  stickySection: { backgroundColor: '#F4F7FB', paddingBottom: 10 },
  walletCard: { backgroundColor: '#fff', marginHorizontal: 15, padding: 18, borderRadius: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
  walletLabel: { fontSize: 12, fontWeight: '800', color: '#4E5968', marginBottom: 10 },
  inputGroup: { flexDirection: 'row', backgroundColor: '#F4F7FB', borderRadius: 14, overflow: 'hidden' },
  moneyInput: { flex: 1, padding: 14, fontSize: 18, fontWeight: '900', textAlign: 'right', color: '#191F28' },
  btnMagic: { backgroundColor: '#6227FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 6 },
  btnMagicText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  chipScroll: { paddingHorizontal: 15, marginBottom: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#fff', borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#E5E8EB' },
  chipActive: { backgroundColor: '#3182F6', borderColor: '#3182F6' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#4E5968' },
  chipTextActive: { color: '#fff' },

  listContainer: { paddingHorizontal: 15, paddingTop: 10, backgroundColor: '#F4F7FB' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3182F6' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#4E5968' },

  stockCard: { backgroundColor: '#fff', padding: 18, borderRadius: 22, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  stockCardSelected: { borderColor: '#3182F6', borderWidth: 2, backgroundColor: '#F0F7FF' },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: '#3182F6', borderColor: '#3182F6' },
  stockName: { fontSize: 16, fontWeight: '800', color: '#191F28' },
  stockStreak: { fontSize: 11, fontWeight: '900', color: '#3182F6', marginTop: 3 },
  stockPrice: { fontSize: 16, fontWeight: '800', color: '#191F28' },
  stockRate: { fontSize: 12, fontWeight: '900' },

  fabContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center', paddingHorizontal: 20 },
  fab: { backgroundColor: '#3182F6', flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, width: '100%', justifyContent: 'center', gap: 10, elevation: 10, shadowColor: '#3182F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#191F28' },
  reportCard: { backgroundColor: '#F9FAFB', padding: 22, borderRadius: 24, marginBottom: 15, borderLeftWidth: 6, borderLeftColor: '#3182F6' },
  reportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  reportCardName: { fontSize: 19, fontWeight: '900', color: '#191F28' },
  reportCardCode: { fontSize: 10, color: '#999' },
  shareBadge: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#3182F6' },
  shareBadgeText: { fontSize: 11, fontWeight: '900', color: '#3182F6' },
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
