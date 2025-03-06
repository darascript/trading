import { useEffect, useState } from 'react';
import axios from 'axios';
import { createChart } from 'lightweight-charts';

const ChartAndControls = ({
  chartContainerRef,
  candlestickSeries,
  setCandlestickSeries,
  currentIndex,
  setCurrentIndex,
  startDate,
  timeInterval,
  setClickedPoint,
  setTotalPnL,
  setTrades,
  handleTrade,
  addNewCandle
}) => {
  const [projectionMode, setProjectionMode] = useState('long');
  const [projections, setProjections] = useState([]);
  const [chart, setChart] = useState(null);
  const [predictionTimeRange, setPredictionTimeRange] = useState(3600); 
  const [candlestickData, setCandlestickData] = useState([]);



  useEffect(() => {
    if (!chartContainerRef.current) return;

    const newChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { backgroundColor: '#ffffff', textColor: '#333' },
      grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
      priceScale: { minMove: 0.0001 },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#ccc' },
    });

    const series = newChart.addCandlestickSeries();
    setCandlestickSeries(series);
    setChart(newChart);

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
          setCandlestickData(adjustedData);
          setCurrentIndex(adjustedData.length);
        }
      })
      .catch((error) => console.error('Error fetching data:', error));

    return () => newChart.remove();
  }, [chartContainerRef, setCandlestickSeries, setCurrentIndex, startDate, timeInterval]);

  useEffect(() => {
    if (!chart || !candlestickSeries) return;

    const handleClick = (param) => {
      if (!param || !param.time || !param.point) return;
    
      const price = candlestickSeries.coordinateToPrice(param.point.y);
      setClickedPoint({ time: new Date(param.time * 1000).toLocaleString(), price });
    
      const pipValue = 0.0001;
      const longPips = 40 * pipValue;
      const shortPips = 30 * pipValue;
    
      let topPrice, bottomPrice, topColor, bottomColor;
    
      if (projectionMode === 'long') {
        topPrice = price + longPips;
        bottomPrice = price - shortPips;
        topColor = 'green';
        bottomColor = 'red';
      } else {
        topPrice = price + shortPips;
        bottomPrice = price - longPips;
        topColor = 'red';
        bottomColor = 'green';
      }
    
      // Get the last candle time from state
      const lastCandle = candlestickData.length > 0 ? candlestickData[candlestickData.length - 1] : null;
      const lastTime = lastCandle ? lastCandle.time : param.time; // Default to clicked time if no candles exist
    
      // Extend projection into the future
      const extendedTime = lastTime + 10 * 3600; // 10 hours ahead
    
      const topLine = chart.addLineSeries({ color: topColor, lineWidth: 2 });
      topLine.setData([
        { time: param.time, value: topPrice },
        { time: extendedTime, value: topPrice },
      ]);
    
      const bottomLine = chart.addLineSeries({ color: bottomColor, lineWidth: 2 });
      bottomLine.setData([
        { time: param.time, value: bottomPrice },
        { time: extendedTime, value: bottomPrice },
      ]);
    
      const newProjection = { id: Date.now(), topLine, bottomLine };
      setProjections((prev) => [...prev, newProjection]);
    };
    

    chart.subscribeClick(handleClick);
    return () => chart.unsubscribeClick(handleClick);
  }, [chart, candlestickSeries, setClickedPoint, projectionMode]);

const removeProjection = (id) => {
  setProjections((prev) => {
    if (!chart) {
      console.error("Chart is undefined");
      return prev;
    }

    const projectionToRemove = prev.find((p) => p.id === id);
    if (!projectionToRemove) {
      console.error(`Projection with ID ${id} not found`);
      return prev;
    }

    try {
      if (projectionToRemove.topLine) {
        chart.removeSeries(projectionToRemove.topLine);
      }
      if (projectionToRemove.bottomLine) {
        chart.removeSeries(projectionToRemove.bottomLine);
      }
    } catch (error) {
      console.error("Error removing projection series:", error);
    }

    return prev.filter((p) => p.id !== id);
  });

  
};


  return (
    <>
      <div ref={chartContainerRef} style={{ width: '100%', height: '400px', border: '1px solid black' }}></div>

      <div style={{ marginTop: '10px' }}>
        <button onClick={() => setProjectionMode('long')} style={{ backgroundColor: projectionMode === 'long' ? 'green' : 'lightgray', color: 'white', padding: '10px' }}>
          Long Mode
        </button>
        <button onClick={() => setProjectionMode('short')} style={{ backgroundColor: projectionMode === 'short' ? 'red' : 'lightgray', color: 'white', padding: '10px', marginLeft: '10px' }}>
          Short Mode
        </button>
        <button onClick={() => handleTrade('buy')} style={{ backgroundColor: 'green', color: 'white', padding: '10px', marginLeft: '10px' }}>
          Buy
        </button>
        <button onClick={() => handleTrade('sell')} style={{ backgroundColor: 'red', color: 'white', padding: '10px', marginLeft: '10px' }}>
          Sell
        </button>
        <button onClick={addNewCandle} style={{ backgroundColor: 'blue', color: 'white', padding: '10px', marginLeft: '10px' }}>
          Next Candle
        </button>
      </div>

      <div style={{ marginTop: '10px' }}>
        {projections.map((proj, index) => (
          <button key={proj.id} onClick={() => removeProjection(proj.id)} style={{ marginRight: '10px', padding: '5px', backgroundColor: 'gray', color: 'white' }}>
            Delete Projection {index + 1}
          </button>
        ))}
      </div>
    </>
  );
};

export default ChartAndControls;
