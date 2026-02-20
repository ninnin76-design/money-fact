
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Ticker = ({ items = [] }) => {
    const scrollX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
    const [contentWidth, setContentWidth] = useState(0);

    useEffect(() => {
        if (items.length === 0 || contentWidth === 0) return;

        const runAnimation = () => {
            scrollX.setValue(SCREEN_WIDTH);
            const totalDistance = SCREEN_WIDTH + contentWidth;
            Animated.timing(scrollX, {
                toValue: -contentWidth,
                duration: totalDistance * 25, // Control speed here
                useNativeDriver: true,
                easing: (t) => t, // Linear
            }).start(({ finished }) => {
                if (finished) runAnimation();
            });
        };

        runAnimation();
        return () => scrollX.stopAnimation();
    }, [items, contentWidth]);

    const onLayout = (event) => {
        const measuredWidth = event.nativeEvent.layout.width;
        if (measuredWidth > 0 && Math.abs(measuredWidth - contentWidth) > 1) {
            setContentWidth(measuredWidth);
        }
    };

    return (
        <View style={styles.container}>
            {/* Hidden measuring container to get real width - it must NOT have position absolute for width expansion */}
            <View style={{ position: 'absolute', top: -1000, left: 0 }}>
                <View
                    style={[styles.scrollContainer, { width: undefined }]}
                    onLayout={onLayout}
                >
                    {items.map((item, idx) => (
                        <Text key={`m-${idx}`} style={styles.text} numberOfLines={1}>
                            {item}  |
                        </Text>
                    ))}
                </View>
            </View>

            {/* Actual Animated Ticker */}
            <Animated.View style={[styles.scrollContainer, { transform: [{ translateX: scrollX }] }]}>
                {items.map((item, index) => (
                    <Text key={index} style={styles.text} numberOfLines={1}>
                        {item}  <Text style={{ color: '#555' }}>|</Text>
                    </Text>
                ))}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 30,
        backgroundColor: '#1a232b',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    scrollContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        color: '#3182f6',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 25,
    },
});

export default Ticker;
