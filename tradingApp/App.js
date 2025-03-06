
import React from 'react';
import { ScrollView, Text } from 'react-native';
import Form from './Form';
import Backtest from './Backtest';


function App() {
    return (
        <ScrollView>
            <Text style={{ fontSize: 24 }}>Trading Practice App</Text>
            <Backtest />
            <Form />
           
        </ScrollView>
    );
}


export default App;

