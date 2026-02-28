import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Flame, Thermometer as ThermoIcon, Trash2, Star } from 'lucide-react-native';

const StockCard = ({ stock, onPress, onDelete, buyLimit = 3, sellLimit = 3, isFavorite = false, onFavoriteToggle = null }) => {
    const { name, price = 0, fStreak, iStreak, sentiment, isHiddenAccumulation } = stock;

    // --- 수급박스 양음블럭 & 패턴 로직 ---
    const getScore = (streak) => {
        if (streak >= 3) return 2;
        if (streak > 0) return 1;
        if (streak <= -3) return -2;
        if (streak < 0) return -1;
        return 0;
    };

    const fScore = getScore(fStreak || 0);
    const iScore = getScore(iStreak || 0);
    const totalScore = fScore + iScore;

    let blocks = '';
    if (totalScore > 0) {
        blocks = '🟥'.repeat(totalScore) + '⬜'.repeat(4 - totalScore);
    } else if (totalScore < 0) {
        blocks = '🟦'.repeat(Math.abs(totalScore)) + '⬜'.repeat(4 - Math.abs(totalScore));
    } else {
        blocks = '⬜⬜⬜⬜';
    }

    let patternTag = null;
    let patternColor = '#888';

    if (fScore >= 1 && iScore >= 1 && (fScore + iScore >= 3)) {
        patternTag = '🔥 동반쌍끌이';
        patternColor = '#ff4d4d';
    } else if ((fStreak === 1 && iStreak >= 1) || (iStreak === 1 && fStreak >= 1)) {
        patternTag = '✨ 변곡점 발생';
        patternColor = '#ffb84d';
    } else if (isHiddenAccumulation) {
        patternTag = '🤫 히든 매집';
        patternColor = '#00ff00';
    } else if (iScore >= 2 && fScore <= 0) {
        patternTag = '🏢 기관 주도';
        patternColor = '#3182f6';
    } else if (fScore >= 2 && iScore <= 0) {
        patternTag = '🌎 외인 주도';
        patternColor = '#c431f6';
    } else if (totalScore <= -3) {
        patternTag = '❄️ 동반 이탈';
        patternColor = '#888';
    }
    // ---------------------------------

    // [v3.6.2 개선] streak 배지: 기준일수 이상 → 주요 배지, 그 외 → 보조 배지
    // 연속매매 탭에서 기관 5일인 종목이 보일 때, 외인 streak도 함께 보이도록 개선
    const getStreakBadge = (label, streak, limit) => {
        if (!streak || streak === 0) return null;
        const abStreak = Math.abs(streak);
        const isBuy = streak > 0;
        const meetsLimit = isBuy ? streak >= limit : streak <= -limit;

        return {
            text: `${label} ${abStreak}일 연속 ${isBuy ? '매수' : '매도'}`,
            color: isBuy ? '#ff4d4d' : '#3182f6',
            icon: isBuy
                ? <TrendingUp size={12} color="#ff4d4d" />
                : <TrendingDown size={12} color="#3182f6" />,
            isPrimary: meetsLimit,  // 기준일수를 넘으면 주요 배지
        };
    };

    const fBadge = getStreakBadge('외인', fStreak, fStreak > 0 ? buyLimit : sellLimit);
    const iBadge = getStreakBadge('기관', iStreak, iStreak > 0 ? buyLimit : sellLimit);

    // 최소 하나라도 streak가 있으면 배지 영역 표시
    const hasBadge = fBadge || iBadge;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            {onFavoriteToggle && (
                <TouchableOpacity onPress={onFavoriteToggle} style={styles.starBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Star size={22} color={isFavorite ? "#FFD700" : "#666"} fill={isFavorite ? "#FFD700" : "transparent"} />
                </TouchableOpacity>
            )}
            <View style={styles.cardContent}>
                {/* 1행: 종목이름 + 블럭 */}
                <View style={styles.row1}>
                    <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.4}>{name}</Text>
                    <View style={styles.blocksBox}>
                        <Text style={styles.blocksText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.4}>{blocks}</Text>
                    </View>
                    {onDelete && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Trash2 size={18} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* 2행: 수급 배지 (외인/기관) - 모든 streak 표시 */}
                {hasBadge && (
                    <View style={styles.badgeRow}>
                        {fBadge && (
                            <View style={[styles.badge, !fBadge.isPrimary && styles.badgeSub]}>
                                {fBadge.icon}
                                <Text style={[styles.badgeText, { color: fBadge.color }, !fBadge.isPrimary && styles.badgeTextSub]}>{fBadge.text}</Text>
                            </View>
                        )}
                        {iBadge && (
                            <View style={[styles.badge, !iBadge.isPrimary && styles.badgeSub]}>
                                {iBadge.icon}
                                <Text style={[styles.badgeText, { color: iBadge.color }, !iBadge.isPrimary && styles.badgeTextSub]}>{iBadge.text}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* 3행: 패턴 + 가격 + 온도 */}
                <View style={styles.row3}>
                    <View style={styles.row3Left}>
                        {patternTag && (
                            <Text style={[styles.patternTag, { color: patternColor }]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.4}>{patternTag}</Text>
                        )}
                        <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.4}>{price?.toLocaleString()}원</Text>
                    </View>
                    <View style={styles.sentimentBox}>
                        <ThermoIcon size={12} color={sentiment > 70 ? '#ff4d4d' : (sentiment < 30 ? '#3182f6' : '#888')} />
                        <Text style={[styles.sentimentText, { color: sentiment > 70 ? '#ff4d4d' : (sentiment < 30 ? '#3182f6' : '#888') }]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.4}>{sentiment}도</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    starBtn: {
        marginRight: 10,
        padding: 4,
        marginTop: 2,
    },
    cardContent: {
        flex: 1,
    },
    row1: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        flexShrink: 1,
        marginRight: 8,
    },
    blocksBox: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    blocksText: {
        fontSize: 10,
        letterSpacing: 1,
    },
    deleteBtn: {
        marginLeft: 'auto',
        padding: 5,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 5,
    },
    badgeSub: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 3,
    },
    badgeTextSub: {
        fontSize: 10,
        fontWeight: '600',
        opacity: 0.7,
    },
    row3: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    row3Left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
        flex: 1,
    },
    patternTag: {
        fontSize: 12,
        fontWeight: '800',
        flexShrink: 1,
    },
    price: {
        color: '#aaa',
        fontSize: 14,
        flexShrink: 0,
    },
    sentimentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
        marginLeft: 4,
    },
    sentimentText: {
        color: '#888',
        fontSize: 12,
        marginLeft: 3,
    },
});

export default StockCard;
