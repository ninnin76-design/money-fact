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

    const getStreakText = (streak) => {
        if (streak >= buyLimit) return { text: `${streak}일 연속 매수`, color: '#ff4d4d', icon: <TrendingUp size={12} color="#ff4d4d" /> };
        if (streak <= -sellLimit) return { text: `${Math.abs(streak)}일 연속 매도`, color: '#3182f6', icon: <TrendingDown size={12} color="#3182f6" /> };
        return null;
    };

    const fInfo = getStreakText(fStreak);
    const iInfo = getStreakText(iStreak);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            {onFavoriteToggle && (
                <TouchableOpacity onPress={onFavoriteToggle} style={{ marginRight: 12, padding: 4 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Star size={22} color={isFavorite ? "#FFD700" : "#666"} fill={isFavorite ? "#FFD700" : "transparent"} />
                </TouchableOpacity>
            )}
            <View style={styles.cardContent}>
                <View style={styles.left}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.name}>{name}</Text>
                        <View style={{ marginLeft: 8, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={styles.blocksText}>{blocks}</Text>
                        </View>
                    </View>
                    {patternTag && (
                        <Text style={[styles.patternTag, { color: patternColor }]}>{patternTag}</Text>
                    )}
                    <Text style={styles.price}>{price?.toLocaleString()}원</Text>
                </View>

                <View style={styles.right}>
                    {fInfo && (
                        <View style={styles.badge}>
                            {fInfo.icon}
                            <Text style={[styles.badgeText, { color: fInfo.color }]}>외인 {fInfo.text}</Text>
                        </View>
                    )}
                    {iInfo && (
                        <View style={styles.badge}>
                            {iInfo.icon}
                            <Text style={[styles.badgeText, { color: iInfo.color }]}>기관 {iInfo.text}</Text>
                        </View>
                    )}
                    <View style={styles.sentimentBox}>
                        <ThermoIcon size={12} color={sentiment > 70 ? '#ff4d4d' : '#888'} />
                        <Text style={styles.sentimentText}>{sentiment}도</Text>
                    </View>
                </View>
            </View>

            {onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Trash2 size={20} color="#666" />
                </TouchableOpacity>
            )}
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
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    // ... existing ...
    deleteBtn: {
        marginLeft: 15,
        padding: 5,
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    blocksText: {
        fontSize: 10,
        letterSpacing: 1,
    },
    patternTag: {
        fontSize: 11,
        fontWeight: '800',
        marginTop: 6,
    },
    price: {
        color: '#aaa',
        fontSize: 14,
        marginTop: 4,
    },
    right: {
        alignItems: 'flex-end',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 5,
        marginBottom: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 3,
    },
    hiddenBadge: {
        backgroundColor: 'rgba(122, 255, 122, 0.14)',
    },
    hiddenText: {
        color: '#00ff00',
        fontSize: 10,
        fontWeight: 'bold',
    },
    sentimentBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    sentimentText: {
        color: '#888',
        fontSize: 11,
        marginLeft: 3,
    },
});

export default StockCard;
