import React from 'react';
import axios from 'axios';

const TradeList = ({ trades = [], updateTrades }) => {
  const closeTrade = async (tradeId, closeQuantity) => {
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/close_trade', {
        tradeId,
        quantity: closeQuantity,
      });

      updateTrades(response.data.trades);
    } catch (error) {
      console.error('Error closing trade:', error);
    }
  };

  return (
    <div>
      <h2>Active Trades</h2>
      {trades.length > 0 ? (
        trades.map((trade, index) => (
          <div key={index}>
            <p>{trade.action} - {trade.quantity} @ ${trade.entryPrice}</p>
            <button onClick={() => closeTrade(index, trade.quantity)}>Close Full</button>
          </div>
        ))
      ) : (
        <p>No active trades</p>
      )}
    </div>
  );
};

export default TradeList;
