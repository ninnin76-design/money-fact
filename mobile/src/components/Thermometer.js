
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const Thermometer = ({ temperature = 50, label = "보통" }) => {
    const radius = 40;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const progress = (temperature / 100) * circumference;

    const getColor = (temp) => {
        if (temp >= 80) return '#ff4d4d'; // Hot
        if (temp >= 60) return '#ffcc00'; // Warm
        if (temp >= 40) return '#3182f6'; // Normal/Cool
        return '#4d94ff'; // Cold
    };

    return (
        <View style={styles.container}>
            <Svg width="100" height="100" viewBox="0 0 100 100">
                <G rotation="-90" origin="50, 50">
                    <Circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#1a232b"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    <Circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke={getColor(temperature)}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${progress} ${circumference}`}
                        strokeLinecap="round"
                    />
                </G>
            </Svg>
            <View style={styles.textOverlay}>
                <Text style={[styles.tempText, { color: getColor(temperature) }]}>{Math.round(temperature)}°</Text>
                <Text style={styles.labelText}>{label}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    textOverlay: {
        position: 'absolute',
        alignItems: 'center',
    },
    tempText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    labelText: {
        color: '#888',
        fontSize: 10,
        marginTop: -2,
    },
});

export default Thermometer;
