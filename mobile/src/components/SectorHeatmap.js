import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, UIManager, Platform } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SectorRow = ({ sector, isHot, buyData, sellData, MARKET_WATCH_STOCKS, index, onStockPress }) => {
    const [expanded, setExpanded] = useState(false);

    const dataObj = isHot ? (buyData || {}) : (sellData || {});
    const foreignList = dataObj['5_2'] || [];
    const instList = dataObj['5_1'] || [];

    // [v4.1.0] 서버에서 내려준 sector 정보를 최우선으로 사용하되, 
    // 정보가 없는 경우 기존 MARKET_WATCH_STOCKS 매핑으로 보완하는 하이브리드 로직!
    const foreignMatches = foreignList.filter(fb => {
        if (fb.sector) return fb.sector === sector.name;
        return MARKET_WATCH_STOCKS?.some(ss => ss.code === fb.code && ss.sector === sector.name);
    });
    const instMatches = instList.filter(ib => {
        if (ib.sector) return ib.sector === sector.name;
        return MARKET_WATCH_STOCKS?.some(ss => ss.code === ib.code && ss.sector === sector.name);
    });

    const allMatchesMap = new Map();
    foreignMatches.forEach(s => allMatchesMap.set(s.code, { name: s.name, code: s.code }));
    instMatches.forEach(s => allMatchesMap.set(s.code, { name: s.name, code: s.code }));

    let allMatched = Array.from(allMatchesMap.values());
    const isFallback = allMatched.length === 0;

    if (isFallback) {
        // [v4.3.1] 2연속 매수 조건을 달성한 종목이 없더라도, 섹터의 자금 흐름이 감지되었다면
        // 섹터 대표 종목들을 징후 종목으로 띄워주어 '포착 대기중' 빈칸을 채운다
        const fallbackStocks = (MARKET_WATCH_STOCKS || []).filter(s => s.sector === sector.name);
        allMatched = fallbackStocks.map(s => ({ name: s.name, code: s.code }));
    }

    const allMatchedNames = allMatched.map(s => s.name);
    const top2 = allMatchedNames.slice(0, 2);
    const restCount = Math.max(0, allMatchedNames.length - 2);

    const hasForeign = foreignMatches.length > 0;
    const hasInst = instMatches.length > 0;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    // 가장 강력한 1위를 95%로 잡고 내려갑니다.
    const percent = Math.max(10, Math.min(100, 95 - (index * 15)));

    // [v4.2.1] 종목 클릭 핸들러
    const handleStockPress = (stockInfo) => {
        if (onStockPress && stockInfo.code) {
            onStockPress({ name: stockInfo.name, code: stockInfo.code });
        }
    };

    return (
        <View style={styles.sectorCard}>
            <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7}>
                <View style={styles.cardHeader}>
                    <Text style={styles.sectorTitle}>{index + 1}. {sector.name}</Text>
                    <View style={styles.badges}>
                        {(hasForeign && hasInst) && (
                            <View style={[styles.badge, { backgroundColor: isHot ? '#FF3B30' : '#4E5968' }]}><Text style={styles.badgeText}>{isHot ? '쌍끌이' : '동반 이탈'}</Text></View>
                        )}
                        {hasForeign && !hasInst && (
                            <View style={[styles.badge, { backgroundColor: isHot ? '#FF4D4D' : '#4D94FF' }]}><Text style={styles.badgeText}>외인 주도</Text></View>
                        )}
                        {!hasForeign && hasInst && (
                            <View style={[styles.badge, { backgroundColor: isHot ? '#FF8A8A' : '#8A8AFF' }]}><Text style={styles.badgeText}>기관 주도</Text></View>
                        )}
                        {isFallback && top2.length > 0 && (
                            <View style={[styles.badge, { backgroundColor: isHot ? 'rgba(255,100,100,0.4)' : 'rgba(100,148,255,0.4)' }]}><Text style={styles.badgeText}>{isHot ? '자금 유입' : '자금 유출'}</Text></View>
                        )}
                    </View>
                </View>

                {/* 게이지 바 */}
                <View style={[styles.gaugeBg, { justifyContent: isHot ? 'flex-start' : 'flex-end' }]}>
                    <View style={[styles.gaugeFill, { width: `${percent}%`, backgroundColor: isHot ? '#FF4D4D' : '#4D94FF' }]} />
                </View>

                <View style={styles.descRow}>
                    <Text style={styles.mainDesc} numberOfLines={1}>
                        {isHot ? '🔥' : '❄️'} {top2.length > 0 ? top2.join(', ') : '포착 대기중'} {restCount > 0 ? `외 ${restCount}종목 ${isFallback ? (isHot ? '유입중' : '유출중') : (isHot ? '포착' : '이탈')}` : (allMatchedNames.length > 0 ? (isFallback ? (isHot ? ' 유입중' : ' 유출중') : (isHot ? ' 포착' : ' 이탈')) : '')}
                    </Text>
                    <Text style={styles.moreBtn}>{expanded ? '▲ 접기' : '▼ 더보기'}</Text>
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedArea}>
                    {allMatched.map((stockInfo, idx) => (
                        <TouchableOpacity key={idx} style={styles.tag} onPress={() => handleStockPress(stockInfo)} activeOpacity={0.6}>
                            <Text style={[styles.tagText, onStockPress && { color: '#6DB3F2' }]}>{stockInfo.name}</Text>
                        </TouchableOpacity>
                    ))}
                    {allMatched.length === 0 && <Text style={[styles.tagText, { color: '#666' }]}>주요 리스트 랭킹 진입 종목이 아직 없습니다.</Text>}
                </View>
            )}
        </View>
    );
};

const SectorHeatmap = ({ sectors = [], lastUpdate, isMarketOpen, MARKET_WATCH_STOCKS, buyData, sellData, onStockPress }) => {
    let confirmText = '당일 확정';
    if (lastUpdate && typeof lastUpdate === 'string') {
        const match = lastUpdate.match(/(\d{1,2})\s*\.\s*(\d{1,2})\b/);
        if (match) confirmText = `${parseInt(match[1], 10)}.${parseInt(match[2], 10)} 기준`;
    }

    // sectors 정렬 (서버에서 절대값 순이었으므로 다시 +, - 로 분류)
    const hotSectors = sectors.filter(s => s.flow > 0).sort((a, b) => b.flow - a.flow).slice(0, 3);
    const coldSectors = sectors.filter(s => s.flow < 0).sort((a, b) => a.flow - b.flow).slice(0, 3);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>🎯 주도 섹터 레이더</Text>
                <Text style={[styles.noticeText, !isMarketOpen && { color: '#00ff00', fontWeight: 'bold' }]}>
                    {isMarketOpen ? '*실시간 집계중' : `✅ ${confirmText}`}
                </Text>
            </View>

            {/* HOT Section */}
            {hotSectors.length > 0 ? (
                <View style={styles.sectionArea}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: '#FF4D4D' }]}>HOT</Text>
                        <Text style={styles.sectionSubtitle}>외인·기관 수급 집중</Text>
                    </View>
                    {hotSectors.map((s, idx) => (
                        <SectorRow key={'hot' + idx} sector={s} isHot={true} index={idx} buyData={buyData} sellData={sellData} MARKET_WATCH_STOCKS={MARKET_WATCH_STOCKS} onStockPress={onStockPress} />
                    ))}
                </View>
            ) : coldSectors.length > 0 && (
                <View style={{ backgroundColor: 'rgba(255,77,77,0.05)', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,77,77,0.1)' }}>
                    <Text style={{ color: '#8b95a1', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                        🧊 오늘은 전 섹터 외인·기관 순매도 중 — 수급 유입 섹터 없음
                    </Text>
                </View>
            )}

            {/* COLD Section */}
            {coldSectors.length > 0 && (
                <View style={[styles.sectionArea, { marginTop: 12 }]}>
                    <View style={styles.sectionTitleRow}>
                        <Text style={[styles.sectionTitle, { color: '#4D94FF' }]}>COLD</Text>
                        <Text style={styles.sectionSubtitle}>수급 이탈 주의</Text>
                    </View>
                    {coldSectors.map((s, idx) => (
                        <SectorRow key={'cold' + idx} sector={s} isHot={false} index={idx} buyData={buyData} sellData={sellData} MARKET_WATCH_STOCKS={MARKET_WATCH_STOCKS} onStockPress={onStockPress} />
                    ))}
                </View>
            )}
            {sectors.length === 0 && <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>분석된 섹터 데이터가 없습니다.</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#161b22',
        borderRadius: 20,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 18, // 기존 15에서 키움
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    noticeText: {
        color: '#8b95a1',
        fontSize: 11,
        fontWeight: '500',
    },
    sectionArea: {
        marginBottom: 8,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '900',
        marginRight: 6,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#E0E0E0',
        fontWeight: '600'
    },
    sectorCard: {
        backgroundColor: '#20242b',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.02)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sectorTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    badges: {
        flexDirection: 'row',
        gap: 4,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    gaugeBg: {
        height: 6,
        backgroundColor: '#30363d',
        borderRadius: 3,
        flexDirection: 'row',
        marginBottom: 8,
        overflow: 'hidden',
    },
    gaugeFill: {
        height: '100%',
        borderRadius: 3,
    },
    descRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    mainDesc: {
        color: '#8b95a1',
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    moreBtn: {
        color: '#8b95a1',
        fontSize: 11,
        marginLeft: 8,
    },
    expandedArea: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tagText: {
        color: '#d1d5db',
        fontSize: 11,
    }
});

export default SectorHeatmap;
