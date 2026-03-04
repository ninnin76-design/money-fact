
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SectorHeatmap = ({ sectors = [] }) => {
    const kstDate = new Date(new Date().getTime() + (new Date().getTimezoneOffset() + 540) * 60000);
    const hour = kstDate.getHours();
    const isWorkingHours = hour >= 9 && hour < 20;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>📈 섹터별 자금 흐름 TOP</Text>
                <Text style={[styles.noticeText, !isWorkingHours && { color: '#00ff00', fontWeight: 'bold' }]}>
                    {isWorkingHours ? '*장중 실시간 예상치' : '✅ 당일 최종 확정'}
                </Text>
            </View>
            <View style={styles.grid}>
                {sectors.map((sector, index) => {
                    const isPositive = sector.flow >= 0;
                    const formatFlow = (val) => {
                        const absVal = Math.abs(val);
                        if (absVal >= 10000) {
                            return (val / 10000).toFixed(1) + '조';
                        }
                        return val + '억';
                    };

                    return (
                        <View
                            key={index}
                            style={[
                                styles.block,
                                {
                                    backgroundColor: isPositive ? 'rgba(255, 77, 77, 0.08)' : 'rgba(49, 130, 246, 0.08)',
                                    borderColor: isPositive ? 'rgba(255, 77, 77, 0.3)' : 'rgba(49, 130, 246, 0.3)',
                                }
                            ]}
                        >
                            <Text style={styles.sectorName} numberOfLines={1}>{sector.name}</Text>
                            <View style={styles.flowRow}>
                                <Text
                                    style={[styles.flowText, { color: isPositive ? '#ff4d4d' : '#3182f6' }]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit={true}
                                    minimumFontScale={0.5}
                                >
                                    {isPositive ? '↑' : '↓'} {formatFlow(sector.flow)}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
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
    title: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    noticeText: {
        color: '#666',
        fontSize: 10,
        fontWeight: '500',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5,
    },
    block: {
        width: (width - 64) / 3, // 3-column grid
        marginHorizontal: 5,
        height: 65,
        borderRadius: 12,
        borderWidth: 1,
        padding: 8,
        marginBottom: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectorName: {
        color: '#999',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    flowRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        paddingHorizontal: 4,
        width: '100%',
    },
    flowText: {
        fontSize: 14,
        fontWeight: '900',
        flexShrink: 1,
    },
    unit: {
        color: '#555',
        fontSize: 10,
        marginLeft: 2,
    },
});

export default SectorHeatmap;
