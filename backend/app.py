from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
from datetime import datetime


app = Flask(__name__)
CORS(app)


class Trade:
    def __init__(self, trade_data):
        self.entry_price = float(trade_data['price'])
        self.quantity = float(trade_data['quantity'])
        self.action = trade_data['action'].lower()
        self.entry_time = trade_data.get('time', datetime.now().strftime('%Y-%m-%d %H:%M'))
        self.profit_loss = 0
        self.is_open = True
        self.remaining_quantity = self.quantity  # Track remaining quantity for partial closure
        self.close_price = None
        self.close_time = None
        self.realized_profit_loss = 0  # Track realized P/L for closed trades

    def update_profit_loss(self, current_price):
        if self.is_open:
            if self.action == "buy":
                self.profit_loss = (current_price - self.entry_price) * self.remaining_quantity
            elif self.action == "sell":
                self.profit_loss = (self.entry_price - current_price) * self.remaining_quantity
        return self.profit_loss

    def close_trade(self, close_price, closing_quantity=None):
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        # Calculate realized P/L based on closing price
        if closing_quantity is None or closing_quantity >= self.remaining_quantity:
            # Full close
            closing_qty = self.remaining_quantity
            self.is_open = False
        else:
            # Partial close
            closing_qty = float(closing_quantity)
            
        # Calculate realized P/L for the closed portion
        if self.action == "buy":
            realized_pl = (close_price - self.entry_price) * closing_qty
        else:  # sell
            realized_pl = (self.entry_price - close_price) * closing_qty
            
        self.realized_profit_loss += realized_pl
        self.close_price = close_price
        self.close_time = current_time
        
        # Update remaining quantity
        self.remaining_quantity -= closing_qty
        if self.remaining_quantity <= 0:
            self.is_open = False
            self.remaining_quantity = 0
            
        # Update current P/L for any remaining position
        if self.is_open:
            self.update_profit_loss(close_price)
        else:
            self.profit_loss = 0  # No unrealized P/L if fully closed
            
        return realized_pl

    def to_dict(self):
        return {
            'entryPrice': self.entry_price,
            'quantity': self.quantity,
            'remainingQuantity': self.remaining_quantity,
            'action': self.action,
            'entryTime': self.entry_time,
            'closePrice': self.close_price,
            'closeTime': self.close_time,
            'profitLoss': round(self.profit_loss, 2),  # Unrealized P/L
            'realizedProfitLoss': round(self.realized_profit_loss, 2),  # Realized P/L
            'isOpen': self.is_open
        }


class TradingSystem:
    def __init__(self):
        self.trades = []
        self.current_candle = None
        self.historical_data = None
        self.realized_profit_loss = 0  # Total realized P/L for all trades
    
    def load_historical_data(self, csv_path):
        df = pd.read_csv(csv_path, sep='\t', header=None)
        df.columns = ['datetime', 'open', 'high', 'low', 'close', 'volume']
        df['time'] = pd.to_datetime(df['datetime']).dt.strftime('%Y-%m-%d %H:%M')  # Format to minute precision
        self.historical_data = df
        
        # Initialize current candle with the first data point if available
        if not df.empty:
            self.current_candle = {
                'open': float(df.iloc[0]['open']),
                'high': float(df.iloc[0]['high']),
                'low': float(df.iloc[0]['low']),
                'close': float(df.iloc[0]['close']),
                'time': df.iloc[0]['time']
            }
            
        return df

    def update_trades(self, current_price):
        unrealized_pnl = 0
        for trade in self.trades:
            if trade.is_open:
                trade.update_profit_loss(current_price)
                unrealized_pnl += trade.profit_loss
        
        # Return both unrealized and realized P/L
        return {
            'unrealized': unrealized_pnl,
            'realized': self.realized_profit_loss,
            'total': unrealized_pnl + self.realized_profit_loss
        }

    def get_current_price(self):
        if self.current_candle:
            return float(self.current_candle['close'])
        return None


trading_system = TradingSystem()

# Initialize system on startup
@app.route('/api/initialize', methods=['GET'])
def initialize():
    csv_path = os.path.join(os.path.dirname(__file__), 'EURUSD1.csv')
    
    if not os.path.exists(csv_path):
        return jsonify({'error': 'File not found'}), 404

    df = trading_system.load_historical_data(csv_path)
    if df.empty:
        return jsonify({'error': 'No data found'}), 404

    return jsonify({
        'message': 'System initialized',
        'currentCandle': trading_system.current_candle,
        'currentPrice': trading_system.get_current_price()
    })

@app.route('/api/current_price', methods=['GET'])
def get_current_price():
    current_price = trading_system.get_current_price()
    if current_price is None:
        return jsonify({'error': 'No price data available'}), 404
        
    return jsonify({
        'currentPrice': current_price
    })

@app.route('/api/historical_data', methods=['POST'])
def get_historical_data():
    start_date = request.json.get('startDate', None)
    time_interval = int(request.json.get('timeInterval', 1))

    # Select the right file based on time interval
    file_map = {
        1: 'EURUSD1.csv',
        5: 'EURUSD5.csv',
        15: 'EURUSD15.csv',
        30: 'EURUSD30.csv',
        60: 'EURUSD60.csv'
    }

    csv_filename = file_map.get(time_interval, 'EURUSD1.csv')
    csv_path = os.path.join(os.path.dirname(__file__), csv_filename)

    if not os.path.exists(csv_path):
        return jsonify({'error': f'File {csv_filename} not found'}), 404

    df = trading_system.load_historical_data(csv_path)

    if start_date:
        df = df[df['time'] <= start_date]

    data = df[['time', 'open', 'high', 'low', 'close']].to_dict(orient='records')
    return jsonify(data)

@app.route('/api/account', methods=['POST', 'GET'])
def track_trade():
    if request.method == 'GET':
        # Handle GET request - Return all trades with their index
        trades_with_index = []
        for i, trade in enumerate(trading_system.trades):
            trade_dict = trade.to_dict()
            trade_dict['index'] = i  # Add index to each trade
            trades_with_index.append(trade_dict)
            
        # Calculate total P/L
        pnl = trading_system.update_trades(trading_system.get_current_price() or 0)
            
        return jsonify({
            "trades": trades_with_index,
            "pnl": pnl,
            "currentPrice": trading_system.get_current_price()
        }), 200

    elif request.method == 'POST':
        trade_data = request.json
        
        # If price was not provided, use current price
        if not trade_data.get('price') and trading_system.current_candle:
            trade_data['price'] = trading_system.current_candle['close']
        
        new_trade = Trade(trade_data)
        current_price = trading_system.get_current_price() or float(trade_data['price'])
        new_trade.update_profit_loss(current_price)
        trading_system.trades.append(new_trade)

        return jsonify({
            "message": "Trade saved successfully!",
            "trade": new_trade.to_dict(),
            "currentPrice": current_price
        })


@app.route('/api/close_trade', methods=['POST'])
def close_trade():
    trade_index = request.json.get('tradeIndex')
    closing_quantity = float(request.json.get('quantity', 0)) if request.json.get('quantity') else None
    close_price = request.json.get('closePrice', None)
    
    # Use current market price if close price not provided
    if close_price is None:
        close_price = trading_system.get_current_price()
        if close_price is None:
            return jsonify({'error': 'No current price available and no close price provided'}), 400
    else:
        close_price = float(close_price)

    if trade_index is None:
        return jsonify({'error': 'Trade index is required'}), 400
    
    try:
        trade_index = int(trade_index)
        if trade_index < 0 or trade_index >= len(trading_system.trades):
            return jsonify({'error': 'Invalid trade index'}), 404
            
        trade = trading_system.trades[trade_index]
        
        # Close the trade with current price
        realized_pl = trade.close_trade(close_price, closing_quantity)
        
        # Update system's total realized P/L
        trading_system.realized_profit_loss += realized_pl
        
        return jsonify({
            'message': 'Trade closed successfully!',
            'trade': trade.to_dict(),
            'realizedPL': round(realized_pl, 2),
            'pnl': trading_system.update_trades(close_price)
        })
    except ValueError:
        return jsonify({'error': 'Trade index must be a number'}), 400


@app.route('/api/backtest', methods=['POST'])
def get_next_candlestick():
    time_interval = int(request.json.get('timeInterval', 1))

    # Select the right file
    file_map = {
        1: 'EURUSD1.csv',
        5: 'EURUSD5.csv',
        15: 'EURUSD15.csv',
        30: 'EURUSD30.csv',
        60: 'EURUSD60.csv'
    }

    csv_filename = file_map.get(time_interval, 'EURUSD1.csv')
    csv_path = os.path.join(os.path.dirname(__file__), csv_filename)

    if not os.path.exists(csv_path):
        return jsonify({'error': f'File {csv_filename} not found'}), 404

    if trading_system.historical_data is None:
        trading_system.load_historical_data(csv_path)

    df = trading_system.load_historical_data(csv_path)
    df['datetime'] = pd.to_datetime(df['datetime'])
    df = df.set_index('datetime')

    data = df[['time', 'open', 'high', 'low', 'close']].to_dict(orient='records')
    current_index = request.json.get('currentIndex', 0)

    if current_index >= len(data):
        return jsonify({'error': 'No more data'}), 400

    trading_system.current_candle = data[current_index]
    current_price = float(trading_system.current_candle['close'])
    pnl = trading_system.update_trades(current_price)

    # Add indices to trades in the response
    trades_with_index = []
    for i, trade in enumerate(trading_system.trades):
        trade_dict = trade.to_dict()
        trade_dict['index'] = i
        trades_with_index.append(trade_dict)

    return jsonify({
        'nextCandlestick': trading_system.current_candle,
        'nextIndex': current_index + 1,
        'trades': trades_with_index,
        'pnl': pnl,
        'currentPrice': current_price
    })


# Initialize the system when the server starts
csv_path = os.path.join(os.path.dirname(__file__), 'EURUSD1.csv')
if os.path.exists(csv_path):
    trading_system.load_historical_data(csv_path)

if __name__ == '__main__':
    app.run(debug=True)