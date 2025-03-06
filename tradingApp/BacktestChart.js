import React, { useEffect, useRef, useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { createChart } from 'lightweight-charts';
import axios from 'axios';

const BacktestChart = ({ startDate, timeInterval }) => {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [candlestickSeries, setCandlestickSeries] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { backgroundColor: '#ffffff', textColor: '#333' },
      grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
      priceScale: { minMove: 0.00001 },
      timeScale: { timeVisible: true, borderColor: '#ccc' },
    });

    const series = chart.addCandlestickSeries({ priceFormat: { precision: 5, minMove: 0.00001 } });
    setCandlestickSeries(series);
    chartInstanceRef.current = chart;

    axios.post('http://127.0.0.1:5000/api/historical_data', { startDate, timeInterval })
      .then((response) => {
        if (response.data.length > 0) {
          const adjustedData = response.data.map(candle => ({
            time: new Date(candle.time).getTime() / 1000,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));
          series.setData(adjustedData);
          setCurrentIndex(adjustedData.length);
        }
      })
      .catch((error) => console.error('Error fetching data:', error));

    return () => chart.remove();
  }, [startDate, timeInterval]);

  const handleTrade = async (action) => {
    try {
      const price = candlestickSeries.currentData().close;
      const entryTime = new Date().getTime() / 1000;

      createProjection(entryTime, price, action);

      const response = await axios.post('http://127.0.0.1:5000/api/account', {
        action, price, quantity: 1, time: new Date().toISOString().split('T')[0]
      });

      setTotalPnL(response.data.totalPnL);
    } catch (error) {
      console.error('Error placing trade:', error);
    }
  };

  const createProjection = (entryTime, entryPrice, action) => {
    if (!chartInstanceRef.current) return;

    const projectionDuration = 10;
    const priceStep = action === 'buy' ? 0.05 : -0.05;
    let projectedData = [];

    for (let i = 0; i < projectionDuration; i++) {
      projectedData.push({
        time: entryTime + i * 60,
        value: entryPrice + priceStep * i,
      });
    }

    const projectionLine = chartInstanceRef.current.addLineSeries({
      color: action === 'buy' ? 'green' : 'red',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
    });

    projectionLine.setData(projectedData);
  };

  const addNewCandle = async () => {
    if (!candlestickSeries) return;

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/backtest', { currentIndex, timeInterval });

      if (response.data.nextCandlestick) {
        const newCandle = {
          time: new Date(response.data.nextCandlestick.time).getTime() / 1000,
          open: response.data.nextCandlestick.open,
          high: response.data.nextCandlestick.high,
          low: response.data.nextCandlestick.low,
          close: response.data.nextCandlestick.close,
        };

        candlestickSeries.update(newCandle);
        setCurrentIndex(response.data.nextIndex);
      }
    } catch (error) {
      console.error('Error fetching new candlestick:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View ref={chartContainerRef} style={styles.chartContainer} />
      <View style={styles.buttonContainer}>
        <Button title="Buy" color="green" onPress={() => handleTrade('buy')} />
        <Button title="Sell" color="red" onPress={() => handleTrade('sell')} />
        <Button title="Next Candle" color="blue" onPress={addNewCandle} />
      </View>
      <View style={styles.summaryContainer}>
        <Text style={styles.pnlText}>Total P/L: ${totalPnL.toFixed(5)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  chartContainer: { width: '100%', height: 400, borderWidth: 1, borderRadius: 5 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  summaryContainer: { marginTop: 20, padding: 10, borderWidth: 1, borderRadius: 5 },
  pnlText: { fontSize: 16, marginBottom: 10 },
});

export default BacktestChart;
