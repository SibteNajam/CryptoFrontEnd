"use client";

import React, { useState, useEffect } from 'react';
import { BinanceApiService, AccountInfo, OpenOrder } from '../../api/BinanceOrder';

interface TradingPanelProps {
    selectedSymbol: string;
    apiService: BinanceApiService;
}

const TradingPanel: React.FC<TradingPanelProps> = ({ 
    selectedSymbol, 
    apiService 
}) => {
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [orderForm, setOrderForm] = useState({
        side: 'BUY' as 'BUY' | 'SELL',
        type: 'LIMIT' as 'LIMIT' | 'MARKET',
        quantity: '',
        price: ''
    });

    const loadAccountData = async () => {
        setLoading(true);
        try {
            const [account, orders] = await Promise.all([
                apiService.getAccountInfo(),
                apiService.getOpenOrders(selectedSymbol)
            ]);
            
            setAccountInfo(account);
            setOpenOrders(orders);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccountData();
    }, [selectedSymbol]);

    const handlePlaceOrder = async () => {
        if (!orderForm.quantity || (orderForm.type === 'LIMIT' && !orderForm.price)) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const order = {
                symbol: selectedSymbol,
                side: orderForm.side,
                type: orderForm.type,
                quantity: orderForm.quantity,
                ...(orderForm.type === 'LIMIT' && { price: orderForm.price }),
                timeInForce: 'GTC' as const
            };

            await apiService.placeOrder(order);
            alert('Order placed successfully!');
            
            setOrderForm({ side: 'BUY', type: 'LIMIT', quantity: '', price: '' });
            loadAccountData();
        } catch (err) {
            alert(`Order failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const getRelevantBalances = () => {
        if (!accountInfo) return [];
        
        const baseAsset = selectedSymbol.replace('USDT', '').replace('BUSD', '').replace('BTC', '');
        const quoteAssets = ['USDT', 'BUSD', 'BTC'];
        
        return accountInfo.balances.filter(balance => 
            balance.asset === baseAsset || 
            quoteAssets.includes(balance.asset) ||
            parseFloat(balance.free) > 0
        ).slice(0, 3); // Show only top 3 for compact view
    };

    return (
        <div className="space-y-4">
            {/* Account Balance - Compact */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
                <h3 className="text-sm font-semibold mb-2 text-gray-800">Balance</h3>
                {error && (
                    <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                        {error}
                    </div>
                )}
                <div className="space-y-2">
                    {getRelevantBalances().map((balance) => (
                        <div key={balance.asset} className="flex justify-between text-xs">
                            <span className="font-medium text-gray-700">{balance.asset}</span>
                            <span className="text-gray-600">{parseFloat(balance.free).toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Form - Binance Style */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="space-y-3">
                    {/* Order Type Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setOrderForm({...orderForm, type: 'LIMIT'})}
                            className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${
                                orderForm.type === 'LIMIT' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Limit
                        </button>
                        <button
                            onClick={() => setOrderForm({...orderForm, type: 'MARKET'})}
                            className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${
                                orderForm.type === 'MARKET' 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Market
                        </button>
                    </div>

                    {/* Buy/Sell Toggle */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded">
                        <button
                            onClick={() => setOrderForm({...orderForm, side: 'BUY'})}
                            className={`py-2 text-xs font-medium rounded transition-colors ${
                                orderForm.side === 'BUY'
                                    ? 'bg-green-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Buy
                        </button>
                        <button
                            onClick={() => setOrderForm({...orderForm, side: 'SELL'})}
                            className={`py-2 text-xs font-medium rounded transition-colors ${
                                orderForm.side === 'SELL'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Sell
                        </button>
                    </div>

                    {/* Price Input (for LIMIT orders) */}
                    {orderForm.type === 'LIMIT' && (
                        <div>
                            <label className="block text-xs text-gray-900 mb-1">Price</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={orderForm.price}
                                    onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                                    className="w-full text-gray-700 text-sm border border-gray-300 rounded px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <span className="absolute right-3 top-2 text-xs text-gray-500">USDT</span>
                            </div>
                        </div>
                    )}

                    {/* Quantity Input */}
                    <div>
                        <label className="block text-xs text-gray-900 mb-1">Amount</label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0.00"
                                value={orderForm.quantity}
                                onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
                                className="w-full text-sm border border-gray-300 rounded px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="absolute right-3 top-2 text-xs text-gray-500">
                                {selectedSymbol.replace('USDT', '')}
                            </span>
                        </div>
                    </div>

                    {/* Percentage Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(percent => (
                            <button
                                key={percent}
                                className="py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                                onClick={() => {
                                    // Calculate amount based on percentage
                                    const balance = accountInfo?.balances.find(b => 
                                        b.asset === (orderForm.side === 'BUY' ? 'USDT' : selectedSymbol.replace('USDT', ''))
                                    );
                                    if (balance) {
                                        const maxAmount = orderForm.side === 'BUY' 
                                            ? parseFloat(balance.free) / (parseFloat(orderForm.price) || 1)
                                            : parseFloat(balance.free);
                                        setOrderForm({
                                            ...orderForm, 
                                            quantity: (maxAmount * percent / 100).toFixed(6)
                                        });
                                    }
                                }}
                            >
                                {percent}%
                            </button>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="bg-gray-50 rounded p-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Total</span>
                            <span className="font-medium">
                                {(parseFloat(orderForm.price || '0') * parseFloat(orderForm.quantity || '0')).toFixed(2)} USDT
                            </span>
                        </div>
                    </div>

                    {/* Place Order Button */}
                    <button
                        onClick={handlePlaceOrder}
                        disabled={loading}
                        className={`w-full py-3 rounded font-medium text-sm transition-colors ${
                            orderForm.side === 'BUY'
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Placing...' : `${orderForm.side} ${selectedSymbol.replace('USDT', '')}`}
                    </button>
                </div>
            </div>

            {/* Open Orders - Compact */}
            {openOrders.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">Open Orders</h3>
                        <button
                            onClick={loadAccountData}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Refresh
                        </button>
                    </div>
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {openOrders.slice(0, 3).map((order) => (
                            <div key={order.orderId} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                                <div>
                                    <div className="font-medium">
                                        {order.side} {parseFloat(order.origQty).toFixed(4)}
                                    </div>
                                    <div className="text-gray-600">
                                        @ ${parseFloat(order.price).toFixed(2)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm('Cancel this order?')) {
                                            apiService.cancelOrder(selectedSymbol, order.orderId)
                                                .then(() => loadAccountData())
                                                .catch(err => alert(`Cancel failed: ${err.message}`));
                                        }
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TradingPanel;