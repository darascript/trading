import React, { useState } from 'react';



const Form = () => {
  const [trade, setTrade] = useState({
    action: '',
    price: '',
    quantity: ''
  });


  const handleInputChange = (key, value) => {
    setTrade({ ...trade, [key]: value });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();


    if (!trade.action || !trade.price || !trade.quantity) {
      alert('All fields are required!');
      return;
    }


    try {
      const response = await fetch('http://127.0.0.1:5000/api/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...trade,
          time: new Date().toISOString().split('T')[0]
        }),
      });


      const data = await response.json();
     
      if (response.ok) {
        alert('Trade placed successfully!');
        setTrade({ action: '', price: '', quantity: '' });
      } else {
        throw new Error(data.error || 'Failed to place trade');
      }
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('Failed to save trade. Please try again.');
    }
  };


  return (
    <div className="form-container">
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


        <button type="submit" className="submit-button">
          Place Trade
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
    </div>
  );
};


export default Form;