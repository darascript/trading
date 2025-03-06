import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Picker} from 'react-native';
import { createChart } from 'lightweight-charts';
//import { LineTool } from 'lightweight-chart-line-tools';
import axios from 'axios';


const Backtest = () => {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [candlestickSeries, setCandlestickSeries] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [trades, setTrades] = useState([]);
  const [totalPnL, setTotalPnL] = useState(0);
  //const [lineToolInstance, setLineToolInstance] = useState(null);
  //const [selectedTool, setSelectedTool] = useState(null);
  const [timeInterval, setTimeInterval] = useState('1');  

  useEffect(() => {
    if (!chartContainerRef.current || !hasStarted) return;


    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        backgroundColor: '#ffffff',
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#eee' },
        horzLines: { color: '#eee' },
    },
      priceScale: {
        minMove: 0.00001,
      },
      timeScale: {
        timeVisible: true,   
        secondsVisible: false,
        borderColor: '#ccc', 
      },  
    });


    const series = chart.addCandlestickSeries({
      priceFormat: { precision: 5, minMove: 0.00001 },
    });
    setCandlestickSeries(series);
    chartInstanceRef.current = chart;

    axios.post('http://127.0.0.1:5000/api/historical_data', { startDate, timeInterval })
    .then((response) => {
      if (response.data.length > 0) {
        const adjustedData = response.data.map(candle => ({
          time: new Date(candle.time).getTime() / 1000, // Ensure Unix timestamp (seconds)
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
}, [hasStarted, timeInterval]);



  const handleTrade = async (action) => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/account', {
        action,
        price: candlestickSeries.currentData().close,
        quantity: 1,
        time: new Date().toISOString().split('T')[0]
      });


      setTrades(response.data.trades);
      setTotalPnL(response.data.totalPnL);
    } catch (error) {
      console.error('Error placing trade:', error);
    }
  };


  const addNewCandle = async () => {
    if (!candlestickSeries || !hasStarted) return;


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
        setTrades(response.data.trades);
        setTotalPnL(response.data.totalPnL);
      }
    } catch (error) {
      console.error('Error fetching new candlestick:', error);
    }
  };


  return (
    <View style={styles.container}>
      {!hasStarted ? (
        <View style={styles.startContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Start Date (YYYY-MM-DD)"
            value={startDate}
            onChangeText={setStartDate}
          />
          <Picker
            selectedValue={timeInterval}
            style={styles.picker}
            onValueChange={(itemValue) => setTimeInterval(itemValue)}
          >
            <Picker.Item label="1 Minute" value="1" />
            <Picker.Item label="5 Minutes" value="5" />
            <Picker.Item label="15 Minutes" value="15" />
            <Picker.Item label="30 Minutes" value="30" />
            <Picker.Item label="1 Hour" value="60" />
          </Picker>
          <Button title="Load Historical Data" onPress={() => setHasStarted(true)} />
        </View>
      ) : (
        <>
          <View ref={chartContainerRef} style={styles.chartContainer} />
          <View style={styles.buttonContainer}>
            <Button title="Buy" color="green" onPress={() => handleTrade('buy')} />
            <Button title="Sell" color="red" onPress={() => handleTrade('sell')} />
            <Button title="Next Candle" color="blue" onPress={addNewCandle} />
          </View>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Trading Summary</Text>
            <Text style={styles.pnlText}>Total P/L:
              <Text style={totalPnL >= 0 ? styles.positivePnL : styles.negativePnL}>
                ${totalPnL.toFixed(5)}
              </Text>
            </Text>
          </View>
        </>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center' },
  startContainer: { alignItems: 'center', marginTop: 20 },
  input: { borderWidth: 1, padding: 8, marginBottom: 10, width: 200, borderRadius: 5 },
  chartContainer: { width: '100%', height: 400, borderWidth: 1, borderRadius: 5 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  summaryContainer: { marginTop: 20, padding: 10, borderWidth: 1, borderRadius: 5 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  pnlText: { fontSize: 16, marginBottom: 10 },
  positivePnL: { color: 'green', fontWeight: 'bold' },
  negativePnL: { color: 'red', fontWeight: 'bold' },
  picker: {height: 50,  width: 200,  },
});


export default Backtest;


