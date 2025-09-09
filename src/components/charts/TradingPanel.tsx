"use client";

import React, { useState, useEffect } from 'react';
import { BinanceApiService, AccountInfo, OpenOrder } from '../../api/BinanceOrder';
import BalanceViewer from '../Order/balance';

interface TradingPanelProps {
    selectedSymbol: string;
    apiService: BinanceApiService;
}

interface OrderForm {
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    quantity: string;
    price: string;
    timeInForce: 'GTC' | 'IOC' | 'FOK';
}

const TradingPanel: React.FC<TradingPanelProps> = ({
    selectedSymbol,
    apiService
}) => {
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderLoading, setOrderLoading] = useState(false);

    const [orderForm, setOrderForm] = useState<OrderForm>({
        side: 'BUY',
        type: 'LIMIT',
        quantity: '',
        price: '',
        timeInForce: 'GTC'
    });

    // Log form changes whenever orderForm updates
    useEffect(() => {
        console.log('📝 Form Updated:', {
            symbol: selectedSymbol,
            side: orderForm.side,
            type: orderForm.type,
            quantity: orderForm.quantity,
            price: orderForm.price,
            timeInForce: orderForm.timeInForce
        });
    }, [orderForm, selectedSymbol]);

    // Helper function to update form and log changes
    const updateOrderForm = (updates: Partial<OrderForm>) => {
        const newForm = { ...orderForm, ...updates };
        setOrderForm(newForm);
        console.log('🔄 Form Change:', newForm);
    };

    // Load account data
    const loadAccountData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const [account, orders] = await Promise.all([
                apiService.getAccountInfo(),
                apiService.getOpenOrders(selectedSymbol)
            ]);

            setAccountInfo(account);
            setOpenOrders(orders);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load account data';
            setError(errorMessage);
            console.error('❌ Account data error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedSymbol) {
            loadAccountData();
        }
    }, [selectedSymbol]);

    // Validate order form
    const validateOrder = (): string | null => {
        if (!selectedSymbol) {
            return 'No symbol selected';
        }

        if (!orderForm.quantity || parseFloat(orderForm.quantity) <= 0) {
            return 'Please enter a valid quantity greater than 0';
        }

        if (orderForm.type === 'LIMIT') {
            if (!orderForm.price || parseFloat(orderForm.price) <= 0) {
                return 'Please enter a valid price greater than 0';
            }
        }

        // Check balance
        if (accountInfo) {
            const requiredAsset = orderForm.side === 'BUY' ? 'USDT' : selectedSymbol.replace('USDT', '');
            const balance = accountInfo.balances.find(b => b.asset === requiredAsset);
            
            if (balance) {
                const requiredAmount = orderForm.side === 'BUY' 
                    ? parseFloat(orderForm.quantity) * (orderForm.type === 'LIMIT' ? parseFloat(orderForm.price) : 0)
                    : parseFloat(orderForm.quantity);
                    
                if (orderForm.side === 'BUY' && orderForm.type === 'LIMIT' && parseFloat(balance.free) < requiredAmount) {
                    return `Insufficient ${requiredAsset} balance. Available: ${balance.free}`;
                }
                
                if (orderForm.side === 'SELL' && parseFloat(balance.free) < requiredAmount) {
                    return `Insufficient ${requiredAsset} balance. Available: ${balance.free}`;
                }
            }
        }

        return null;
    };

    // Place order
    const handlePlaceOrder = async () => {
        // Validate form
        const validationError = validateOrder();
        if (validationError) {
            console.log('❌ Validation Error:', validationError);
            alert(validationError);
            return;
        }

        setOrderLoading(true);
        setError(null);

        try {
            // Prepare order data - exactly matching your Swagger format
            const orderData = {
                symbol: selectedSymbol,
                side: orderForm.side,
                type: orderForm.type,
                quantity: orderForm.quantity,
                ...(orderForm.type === 'LIMIT' && {
                    price: orderForm.price,
                    timeInForce: orderForm.timeInForce
                })
            };

            console.log('🚀 PLACING ORDER - Final Format:', orderData);
            console.log('📋 Order JSON String:', JSON.stringify(orderData, null, 2));
            
            const result = await apiService.placeOrder(orderData);
            
            console.log('✅ Order placed successfully:', result);
            
            // Show success message with order details
            alert(`✅ Order placed successfully!\n\nOrder ID: ${result.orderId}\nSymbol: ${result.symbol}\nSide: ${result.side}\nQuantity: ${result.origQty}\nPrice: ${result.price}\nStatus: ${result.status}`);
            
            // Reset form
            setOrderForm({
                side: 'BUY',
                type: 'LIMIT',
                quantity: '',
                price: '',
                timeInForce: 'GTC'
            });
            
            // Reload account data
            await loadAccountData();

        } catch (err) {
            console.error('❌ Order placement failed:', err);
            
            let errorMessage = 'Unknown error occurred';
            
            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            
            setError(`Order failed: ${errorMessage}`);
            alert(`❌ Order failed: ${errorMessage}`);
        } finally {
            setOrderLoading(false);
        }
    };

    // Calculate percentage amounts
    const calculatePercentageAmount = (percent: number) => {
        if (!accountInfo) return;

        const requiredAsset = orderForm.side === 'BUY' ? 'USDT' : selectedSymbol.replace('USDT', '');
        const balance = accountInfo.balances.find(b => b.asset === requiredAsset);
        
        if (!balance) return;

        let maxAmount = 0;
        
        if (orderForm.side === 'BUY' && orderForm.type === 'LIMIT' && orderForm.price) {
            // For BUY orders: available USDT / price
            maxAmount = parseFloat(balance.free) / parseFloat(orderForm.price);
        } else if (orderForm.side === 'SELL') {
            // For SELL orders: available base asset
            maxAmount = parseFloat(balance.free);
        }

        const calculatedAmount = (maxAmount * percent / 100).toFixed(8);
        console.log(`💰 Calculated ${percent}% amount:`, calculatedAmount);
        updateOrderForm({ quantity: calculatedAmount });
    };

    return (
        <div className="space-y-4">
            {/* Account Balance */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="space-y-2">
                    <div className="border-b border-gray-200 pb-4">
                        <BalanceViewer
                            selectedSymbol={selectedSymbol}
                            apiService={apiService}
                            showLocked={true}
                            compact={true}
                        />
                    </div>
                </div>
            </div>

            {/* Order Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="space-y-3">
                    {/* Order Type Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => {
                                console.log('🔄 Order Type Changed to: LIMIT');
                                updateOrderForm({ type: 'LIMIT' });
                            }}
                            className={`flex-1 pb-2 text-xs font-medium border-b-2 transition-colors ${
                                orderForm.type === 'LIMIT'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Limit
                        </button>
                        <button
                            onClick={() => {
                                console.log('🔄 Order Type Changed to: MARKET');
                                updateOrderForm({ type: 'MARKET' });
                            }}
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
                            onClick={() => {
                                console.log('🔄 Side Changed to: BUY');
                                updateOrderForm({ side: 'BUY' });
                            }}
                            className={`py-2 text-xs font-medium rounded transition-colors ${
                                orderForm.side === 'BUY'
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Buy
                        </button>
                        <button
                            onClick={() => {
                                console.log('🔄 Side Changed to: SELL');
                                updateOrderForm({ side: 'SELL' });
                            }}
                            className={`py-2 text-xs font-medium rounded transition-colors ${
                                orderForm.side === 'SELL'
                                    ? 'bg-red-400 text-white shadow-sm'
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
                                    onChange={(e) => {
                                        console.log('💰 Price Changed:', e.target.value);
                                        updateOrderForm({ price: e.target.value });
                                    }}
                                    className="w-full text-gray-700 text-sm border border-gray-300 rounded px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    step="0.01"
                                    min="0"
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
                                onChange={(e) => {
                                    console.log('📦 Quantity Changed:', e.target.value);
                                    updateOrderForm({ quantity: e.target.value });
                                }}
                                className="w-full text-sm border border-gray-300 rounded px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                step="0.00000001"
                                min="0"
                            />
                            <span className="absolute right-3 top-2 text-xs text-gray-500">
                                {selectedSymbol.replace('USDT', '')}
                            </span>
                        </div>
                    </div>

                    {/* Time in Force (for LIMIT orders only) */}
                    {orderForm.type === 'LIMIT' && (
                        <div>
                            <label className="block text-xs text-gray-900 mb-1">Time in Force</label>
                            <select
                                value={orderForm.timeInForce}
                                onChange={(e) => {
                                    console.log('⏰ Time in Force Changed:', e.target.value);
                                    updateOrderForm({ timeInForce: e.target.value as 'GTC' | 'IOC' | 'FOK' });
                                }}
                                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            >
                                <option value="GTC">GTC (Good Till Cancelled)</option>
                                <option value="IOC">IOC (Immediate or Cancel)</option>
                                <option value="FOK">FOK (Fill or Kill)</option>
                            </select>
                        </div>
                    )}

                    {/* Percentage Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                        {[25, 50, 75, 100].map(percent => (
                            <button
                                key={percent}
                                className="py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                                onClick={() => calculatePercentageAmount(percent)}
                                disabled={orderLoading}
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
                                {orderForm.type === 'LIMIT' && orderForm.price && orderForm.quantity
                                    ? (parseFloat(orderForm.price) * parseFloat(orderForm.quantity)).toFixed(2)
                                    : orderForm.type === 'MARKET' ? 'Market Price' : '0.00'
                                } USDT
                            </span>
                        </div>
                    </div>

                    {/* Place Order Button */}
                    <button
                        onClick={handlePlaceOrder}
                        disabled={orderLoading || loading || !orderForm.quantity || (orderForm.type === 'LIMIT' && !orderForm.price)}
                        className={`w-full py-3 rounded font-medium text-sm transition-colors ${
                            orderForm.side === 'BUY'
                                ? 'bg-blue-600 hover:bg-blue-600 text-white disabled:bg-blue-300'
                                : 'bg-red-400 hover:bg-red-400 text-white disabled:bg-red-300'
                        } disabled:cursor-not-allowed`}
                    >
                        {orderLoading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Placing Order...
                            </div>
                        ) : (
                            `${orderForm.side} ${selectedSymbol.replace('USDT', '')}`
                        )}
                    </button>
                </div>
            </div>

            {/* Open Orders */}
            {openOrders.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">Open Orders</h3>
                        <button
                            onClick={loadAccountData}
                            className="text-xs text-blue-600 hover:text-blue-800"
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Refresh'}
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
                                    onClick={async () => {
                                        if (confirm('Cancel this order?')) {
                                            try {
                                                await apiService.cancelOrder(selectedSymbol, order.orderId);
                                                await loadAccountData();
                                                alert('Order cancelled successfully!');
                                            } catch (err) {
                                                const errorMsg = err instanceof Error ? err.message : 'Cancel failed';
                                                alert(`Cancel failed: ${errorMsg}`);
                                            }
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