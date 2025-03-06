import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Form = () => {
  const [trade, setTrade] = useState({
    action: '',
    price: '',
    quantity: ''
  });
  const [trades, setTrades] = useState([]);
  const [closeTrade, setCloseTrade] = useState({
    tradeIndex: '',
    quantity: '',
    closePrice: ''
  });
  const [currentPrice, setCurrentPrice] = useState(null);
  const [summary, setSummary] = useState({
    unrealized: 0,
    realized: 0,
    total: 0
  });

  const handleInputChange = (key, value) => {
    setTrade({ ...trade, [key]: value });
  };

  const handleCloseInputChange = (key, value) => {
    setCloseTrade({ ...closeTrade, [key]: value });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to fetch current price
  const fetchCurrentPrice = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/api/current_price');
      setCurrentPrice(response.data.currentPrice);
      
      // Auto-fill the entry price if not already filled
      if (!trade.price) {
        setTrade(prev => ({
          ...prev,
          price: response.data.currentPrice
        }));
      }
      
      // Auto-fill the close price if not already filled
      if (!closeTrade.closePrice) {
        setCloseTrade(prev => ({
          ...prev,
          closePrice: response.data.currentPrice
        }));
      }
    } catch (error) {
      console.error('Error fetching current price:', error.response?.data || error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent multiple submissions

    setIsSubmitting(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...trade,
          time: new Date().toISOString().split("T")[0]
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Trade placed successfully!");
        setTrade({ action: "", price: "", quantity: "" });
        // Refresh the trades list after adding a new trade
        fetchTrades();
        fetchCurrentPrice();
      } else {
        throw new Error(data.error || "Failed to place trade");
      }
    } catch (error) {
      console.error("Error saving trade:", error);
      alert("Failed to save trade. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async (e) => {
    e.preventDefault();
    if (isClosing) return; // Prevent multiple submissions

    setIsClosing(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/close_trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tradeIndex: closeTrade.tradeIndex, 
          quantity: closeTrade.quantity,
          closePrice: closeTrade.closePrice || currentPrice // Use entered price or current price
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Trade closed successfully! Realized P/L: $${data.realizedPL}`);
        // Reset the form
        setCloseTrade({ tradeIndex: '', quantity: '', closePrice: '' });
        // Refresh the trades list
        fetchTrades();
        fetchCurrentPrice();
      } else {
        throw new Error(data.error || "Failed to close trade");
      }
    } catch (error) {
      console.error("Error closing trade:", error);
      alert("Failed to close trade. Please try again.");
    } finally {
      setIsClosing(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/api/account');
      setTrades(response.data.trades);
      setSummary(response.data.pnl || { unrealized: 0, realized: 0, total: 0 });
      if (response.data.currentPrice) {
        setCurrentPrice(response.data.currentPrice);
      }
    } catch (error) {
      console.error('Error fetching trades:', error.response?.data || error.message);
    }
  };

  const initializeSystem = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/api/initialize');
      if (response.data.currentPrice) {
        setCurrentPrice(response.data.currentPrice);
        // Auto-fill the price fields with current price
        setTrade(prev => ({ ...prev, price: response.data.currentPrice }));
        setCloseTrade(prev => ({ ...prev, closePrice: response.data.currentPrice }));
      }
      fetchTrades(); // Get trades after initialization
    } catch (error) {
      console.error('Error initializing system:', error.response?.data || error.message);
    }
  };

  // Initialize system and setup periodic updates
  useEffect(() => {
    initializeSystem();
    
    // Update prices and P/L periodically (every 5 seconds)
    const intervalId = setInterval(() => {
      fetchCurrentPrice();
      fetchTrades();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Get only open trades for the dropdown
  const openTrades = trades.filter(trade => trade.isOpen);

  // Update price field when action changes
  useEffect(() => {
    if (currentPrice) {
      setTrade(prev => ({...prev, price: currentPrice}));
    }
  }, [trade.action]);

  // Get the selected trade for display
  const selectedTrade = closeTrade.tradeIndex !== '' ? 
    trades.find(t => t.index === parseInt(closeTrade.tradeIndex)) : null;

  return (
    <div className="form-container">
      <div className="market-info">
        <h2>Market Information</h2>
        <p><strong>Current Price:</strong> ${currentPrice ? currentPrice.toFixed(5) : 'Loading...'}</p>
        <div className="pnl-summary">
          <p><strong>Unrealized P/L:</strong> <span className={summary.unrealized >= 0 ? 'profit' : 'loss'}>${summary.unrealized.toFixed(2)}</span></p>
          <p><strong>Realized P/L:</strong> <span className={summary.realized >= 0 ? 'profit' : 'loss'}>${summary.realized.toFixed(2)}</span></p>
          <p><strong>Total P/L:</strong> <span className={summary.total >= 0 ? 'profit' : 'loss'}>${summary.total.toFixed(2)}</span></p>
        </div>
      </div>

      <h2>Place Trade</h2>
      <form onSubmit={handleSubmit} className="trade-form">
        <div className="form-group">
          <label>Action</label>
          <select
            value={trade.action}
            onChange={(e) => handleInputChange('action', e.target.value)}
          >
            <option value="">Select Action</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div className="form-group">
          <label>Price</label>
          <input
            type="number"
            step="0.0001"
            value={trade.price}
            onChange={(e) => handleInputChange('price', e.target.value)}
            placeholder="Enter Price"
          />
          {currentPrice && (
            <button 
              type="button" 
              className="use-current-btn"
              onClick={() => handleInputChange('price', currentPrice)}
            >
              Use Current
            </button>
          )}
        </div>

        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            step="0.01"
            value={trade.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            placeholder="Enter Quantity"
          />
        </div>

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Placing...' : 'Place Trade'}
        </button>
      </form>

      {trade.action && trade.price && trade.quantity && (
        <div className="trade-preview">
          <h3>Trade Preview:</h3>
          <p>Action: {trade.action.toUpperCase()}</p>
          <p>Price: ${Number(trade.price).toFixed(4)}</p>
          <p>Quantity: {trade.quantity}</p>
          <p>Total Value: ${(Number(trade.price) * Number(trade.quantity)).toFixed(2)}</p>
        </div>
      )}

      <h2>Close Trade</h2>
      <form onSubmit={handleClose} className="trade-form">
        <div className="form-group">
          <label>Select Trade</label>
          <select
            value={closeTrade.tradeIndex}
            onChange={(e) => handleCloseInputChange('tradeIndex', e.target.value)}
          >
            <option value="">Select a trade to close</option>
            {openTrades.map((trade) => (
              <option key={trade.index} value={trade.index}>
                {trade.action.toUpperCase()} {trade.remainingQuantity} at ${trade.entryPrice} (P/L: ${trade.profitLoss})
              </option>
            ))}
          </select>
        </div>

        {selectedTrade && (
          <div className="selected-trade-info">
            <p>Entry Price: ${selectedTrade.entryPrice}</p>
            <p>Remaining Quantity: {selectedTrade.remainingQuantity}</p>
            <p>Current P/L: <span className={selectedTrade.profitLoss >= 0 ? 'profit' : 'loss'}>${selectedTrade.profitLoss}</span></p>
          </div>
        )}

        <div className="form-group">
          <label>Quantity to Close</label>
          <input
            type="number"
            step="0.01"
            value={closeTrade.quantity}
            onChange={(e) => handleCloseInputChange('quantity', e.target.value)}
            placeholder="Enter Quantity to Close"
          />
          {selectedTrade && (
            <button 
              type="button" 
              className="use-current-btn"
              onClick={() => handleCloseInputChange('quantity', selectedTrade.remainingQuantity)}
            >
              Close All
            </button>
          )}
        </div>

        <div className="form-group">
          <label>Close Price</label>
          <input
            type="number"
            step="0.0001"
            value={closeTrade.closePrice}
            onChange={(e) => handleCloseInputChange('closePrice', e.target.value)}
            placeholder="Enter Close Price"
          />
          {currentPrice && (
            <button 
              type="button" 
              className="use-current-btn"
              onClick={() => handleCloseInputChange('closePrice', currentPrice)}
            >
              Use Current
            </button>
          )}
        </div>

        <button 
          type="submit" 
          className="submit-button" 
          disabled={isClosing || !closeTrade.tradeIndex}
        >
          {isClosing ? 'Closing...' : 'Close Trade'}
        </button>
      </form>

      <div className="trades-container">
        <h3>Current Trades</h3>
        {trades.length > 0 ? (
          <div className="trades-list">
            {trades.map((trade) => (
              <div key={trade.index} className={`trade-item ${trade.isOpen ? 'open-trade' : 'closed-trade'}`}>
                <div className="trade-header">
                  <span className="trade-action">{trade.action.toUpperCase()}</span>
                  <span className="trade-status">{trade.isOpen ? 'OPEN' : 'CLOSED'}</span>
                </div>
                <div className="trade-details">
                  <p>Entry: ${trade.entryPrice} ({trade.entryTime})</p>
                  {trade.closePrice && <p>Close: ${trade.closePrice} ({trade.closeTime})</p>}
                  <p>Quantity: {trade.quantity} {trade.isOpen && trade.remainingQuantity !== trade.quantity && `(${trade.remainingQuantity} remaining)`}</p>
                  {trade.isOpen ? (
                    <p>Unrealized P/L: <span className={trade.profitLoss >= 0 ? 'profit' : 'loss'}>${trade.profitLoss}</span></p>
                  ) : (
                    <p>Realized P/L: <span className={trade.realizedProfitLoss >= 0 ? 'profit' : 'loss'}>${trade.realizedProfitLoss}</span></p>
                  )}
                  {trade.isOpen && (<p>Trade Index: {trade.index}</p>)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No trades available.</p>
        )}
      </div>
      
      <style jsx>{`
        .form-container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .market-info {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .pnl-summary {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .pnl-summary p {
          margin-right: 20px;
        }
        .trade-form {
          margin-bottom: 30px;
        }
        .form-group {
          margin-bottom: 15px;
          position: relative;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .use-current-btn {
          position: absolute;
          right: 0;
          top: 30px;
          background: #f0f0f0;
          border: 1px solid #ccc;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 4px;
        }
        .submit-button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .submit-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        .trade-preview {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .selected-trade-info {
          background-color: #f0f0f0;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        .trades-container {
          margin-top: 30px;
        }
        .trades-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
        }
        .trade-item {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
        }
        .open-trade {
          border-left: 4px solid #4CAF50;
        }
        .closed-trade {
          border-left: 4px solid #999;
          opacity: 0.8;
        }
        .trade-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #eee;
        }
        .trade-action {
          font-weight: bold;
        }
        .trade-status {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8em;
        }
        .open-trade .trade-status {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        .closed-trade .trade-status {
          background-color: #f5f5f5;
          color: #.closed-trade .trade-status {
  background-color: #f5f5f5;
  color: #757575;
}
.trade-details p {
  margin: 5px 0;
}
.profit {
  color: #4CAF50;
}
.loss {
  color: #f44336;
}
      `}</style>
    </div>
  );
};

export default Form;