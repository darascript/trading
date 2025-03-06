import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { createChart } from 'lightweight-charts';
import ChartAndControls from './ChartAndControls';
import StartForm from './StartForm';


const Backtest = () => {
  const chartContainerRef = useRef(null);
  const [candlestickSeries, setCandlestickSeries] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [timeInterval, setTimeInterval] = useState('1');
  const [clickedPoint, setClickedPoint] = useState(null);
  const [totalPnL, setTotalPnL] = useState(0);
  const [trades, setTrades] = useState([]);

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
    <div style={{ padding: '20px', textAlign: 'center' }}>
      {!hasStarted ? (
        <StartForm setStartDate={setStartDate} setTimeInterval={setTimeInterval} setHasStarted={setHasStarted} />
      ) : (
        <>
          <ChartAndControls
            chartContainerRef={chartContainerRef}
            candlestickSeries={candlestickSeries}
            setCandlestickSeries={setCandlestickSeries}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            startDate={startDate}
            timeInterval={timeInterval}
            setClickedPoint={setClickedPoint}
            setTotalPnL={setTotalPnL}
            setTrades={setTrades}
            handleTrade={handleTrade}
            addNewCandle={addNewCandle}
          />

          {clickedPoint && (
            <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
              <h4>Last Clicked Point:</h4>
              <p><strong>Time:</strong> {clickedPoint.time}</p>
              <p><strong>Price:</strong> {clickedPoint.price.toFixed(5)}</p>
            </div>
          )}


        </>
      )}
    </div>
  );
};

export default Backtest;
