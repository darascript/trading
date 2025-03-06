import React from 'react';
import Backtest from './Backtest';
import Form from './Form';
import TradeList from './TradeList';

function App() {
    return (
        <div style={{ padding: '20px' }}>
            <h2>Trading Practice App</h2>
            <Backtest />
            <Form />
            

        </div>
    );
}

export default App;
