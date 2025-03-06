import React from 'react';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function PortfolioChart({ holdings }) {
    const chartData = Object.keys(holdings || {}).map(symbol => ({
        name: symbol,
        population: holdings[symbol],
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        legendFontColor: "#7F7F7F",
        legendFontSize: 15,
    }));

    return (
        <PieChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
        />
    );
}
