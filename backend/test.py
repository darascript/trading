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
        self.entry_time = trade_data.get('time', datetime.now().strftime('%Y-%m-%d %H:%M'))  # Minute precision
        self.profit_loss = 0
        self.is_open = True
   
    def update_profit_loss(self, current_price):
        if self.is_open:
            if self.action == "buy":
                self.profit_loss = (current_price - self.entry_price) * self.quantity
            elif self.action == "sell":
                self.profit_loss = (self.entry_price - current_price) * self.quantity
        return self.profit_loss


    def to_dict(self):
        return {
            'entryPrice': self.entry_price,
            'quantity': self.quantity,
            'action': self.action,
            'entryTime': self.entry_time,
            'profitLoss': round(self.profit_loss, 2),
            'isOpen': self.is_open
        }


class TradingSystem:
    def __init__(self):
        self.trades = []
        self.current_candle = None
        self.historical_data = None
    
    def load_historical_data(self, csv_path):
        df = pd.read_csv(csv_path, sep='\t', header=None)
        df.columns = ['datetime', 'open', 'high', 'low', 'close', 'volume']
        df['time'] = pd.to_datetime(df['datetime']).dt.strftime('%Y-%m-%d %H:%M')  # Format to minute precision
        self.historical_data = df
        return df

   
    def update_trades(self, current_price):
        total_pnl = 0
        for trade in self.trades:
            trade.update_profit_loss(current_price)
            total_pnl += trade.profit_loss
        return total_pnl


trading_system = TradingSystem()


@app.route('/api/historical_data', methods=['POST'])
def get_historical_data():
    start_date = request.json.get('startDate', None)
    time_interval = int(request.json.get('timeInterval', 1)) 

    csv_path = os.path.join(os.path.dirname(__file__), 'EURUSD1.csv')


    if not os.path.exists(csv_path):
        return jsonify({'error': 'File not found'}), 404


    df = trading_system.load_historical_data(csv_path)
   
    if start_date:
        df = df[df['time'] <= start_date]

    df['datetime'] = pd.to_datetime(df['datetime'])
    df = df.set_index('datetime')

    # Resample the data based on the selected time interval
    resampled_df = df.resample(f'{time_interval}min').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }).dropna()

    # Reset the index to get datetime as a column again
    resampled_df = resampled_df.reset_index()
    resampled_df['time'] = resampled_df['datetime'].dt.strftime('%Y-%m-%d %H:%M')

    data = resampled_df[['time', 'open', 'high', 'low', 'close']].to_dict(orient='records')
    return jsonify(data)

@app.route('/api/account', methods=['POST'])
def track_trade():
    if trading_system.current_candle is None:
        return jsonify({'error': 'Current closing price is not available'}), 400


    trade_data = request.json
    new_trade = Trade(trade_data)
    new_trade.update_profit_loss(trading_system.current_candle['close'])
    trading_system.trades.append(new_trade)


    return jsonify({
        "message": "Trade saved successfully!",
        "trades": [trade.to_dict() for trade in trading_system.trades],
        "totalPnL": round(sum(trade.profit_loss for trade in trading_system.trades), 2)
    })


@app.route('/api/backtest', methods=['POST'])
def get_next_candlestick():
    csv_path = os.path.join(os.path.dirname(__file__), 'EURUSD1.csv')


    if not os.path.exists(csv_path):
        return jsonify({'error': 'File not found'}), 404


    if trading_system.historical_data is None:
        trading_system.load_historical_data(csv_path)

    df = trading_system.load_historical_data(csv_path)
   

    df['datetime'] = pd.to_datetime(df['datetime'])
    df = df.set_index('datetime')

    time_interval = int(request.json.get('timeInterval', 1)) 

    # Resample the data based on the selected time interval
    resampled_df = df.resample(f'{time_interval}min').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    }).dropna()

    # Reset the index to get datetime as a column again
    resampled_df = resampled_df.reset_index()
    resampled_df['time'] = resampled_df['datetime'].dt.strftime('%Y-%m-%d %H:%M')

    data = resampled_df[['time', 'open', 'high', 'low', 'close']].to_dict(orient='records')
    current_index = request.json.get('currentIndex', 0)


    if current_index >= len(data):
        return jsonify({'error': 'No more data'}), 400


    trading_system.current_candle = data[current_index]
    total_pnl = trading_system.update_trades(trading_system.current_candle['close'])


    return jsonify({
        'nextCandlestick': trading_system.current_candle,
        'nextIndex': current_index + 1,
        'trades': [trade.to_dict() for trade in trading_system.trades],
        'totalPnL': round(total_pnl, 2)
    })


if __name__ == '__main__':
    app.run(debug=True)
