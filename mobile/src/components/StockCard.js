import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, Flame, Thermometer as ThermoIcon, Trash2 } from 'lucide-react-native';

const StockCard = ({ stock, onPress, onDelete }) => {
    const { name, price = 0, fStreak, iStreak, sentiment, isHiddenAccumulation } = stock;

    const getStreakText = (streak) => {
        if (streak >= 3) return { text: `${streak}일 연속 매수`, color: '#ff4d4d', icon: <TrendingUp size={12} color="#ff4d4d" /> };
        if (streak <= -3) return { text: `${Math.abs(streak)}일 연속 매도`, color: '#3182f6', icon: <TrendingDown size={12} color="#3182f6" /> };
        return null;
    };

    const fInfo = getStreakText(fStreak);
    const iInfo = getStreakText(iStreak);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.cardContent}>
                <View style={styles.left}>
                    <Text style={styles.name}>{name}</Text>
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
                    {isHiddenAccumulation && (
                        <View style={[styles.badge, styles.hiddenBadge]}>
                            <Text style={styles.hiddenText}>🤫 매집 의심</Text>
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
    price: {
        color: '#aaa',
        fontSize: 14,
        marginTop: 2,
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
