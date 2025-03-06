import React, { useEffect, useState } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions, View, Text } from 'react-native';
import axios from 'axios';

const screenWidth = Dimensions.get('window').width;
const BASE_URL = 'http://localhost:5000';

export default function LineChartComponent({ symbol }) {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        axios.get(`${BASE_URL}/historical-data?symbol=${symbol}`)
            .then(response => {
                const data = response.data;
                const labels = data.map(item => item.date).slice(-10);
                const prices = data.map(item => item.close).slice(-10);
                setChartData({ labels, datasets: [{ data: prices }] });
            })
            .catch(error => console.error(error));
    }, [symbol]);

    if (!chartData) {
        return <Text>Loading chart...</Text>;
    }

    return (
        <LineChart
            data={{
                labels: chartData.labels,
                datasets: chartData.datasets,
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
                backgroundColor: '#e26a00',
                backgroundGradientFrom: '#fb8c00',
                backgroundGradientTo: '#ffa726',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            style={{ marginVertical: 20 }}
        />
    );
}
