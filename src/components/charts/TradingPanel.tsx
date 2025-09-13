"use client";

import React, { useState, useEffect } from 'react';
import { BinanceApiService, AccountInfo, OpenOrder } from '../../api/BinanceOrder';
import BalanceViewer from '../Order/balance';
import OpenedOrders from '../OrderPlacment/openedOrder';

interface TradingPanelProps {
    selectedSymbol: string;
    apiService: BinanceApiService;
}
interface TP_SL_Form {
    enabled: boolean;
    stopLossPrice: string;
    takeProfitPrice: string;
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
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [showQuickOrder, setShowQuickOrder] = useState(false);
    const [activeTab, setActiveTab] = useState<'orders' | 'quick'>('orders');

    const [orderForm, setOrderForm] = useState<OrderForm>({
        side: 'BUY',
        type: 'LIMIT',
        quantity: '',
        price: '',
        timeInForce: 'GTC'
    });
    const [tpSlForm, setTPSLForm] = useState<TP_SL_Form>({
        enabled: false,
        stopLossPrice: '',
        takeProfitPrice: ''
    });
    const updateTPSLForm = (updates: Partial<TP_SL_Form>) => {
        setTPSLForm({ ...tpSlForm, ...updates });
    };

    const updateOrderForm = (updates: Partial<OrderForm>) => {
        setOrderForm({ ...orderForm, ...updates });
    };

    const loadAccountData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [account, orders] = await Promise.all([
                apiService.getAccountInfo(),
                apiService.getOpenOrders(selectedSymbol)
            ]);
            console.log('Orders opened:', orders);
            setAccountInfo(account);
            setOpenOrders(orders);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load account data';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Fetch current price for quick orders
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${selectedSymbol}`);
                const data = await response.json();
                setCurrentPrice(parseFloat(data.price));
            } catch (error) {
                console.error('Error fetching price:', error);
            }
        };

        if (selectedSymbol) {
            fetchPrice();
            loadAccountData();
            const interval = setInterval(fetchPrice, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedSymbol]);

    const validateOrder = (): string | null => {
        if (!selectedSymbol) return 'No symbol selected';
        if (!orderForm.quantity || parseFloat(orderForm.quantity) <= 0) return 'Please enter a valid quantity';
        if (orderForm.type === 'LIMIT' && (!orderForm.price || parseFloat(orderForm.price) <= 0)) return 'Please enter a valid price';

        if (tpSlForm.enabled) {
            if (!tpSlForm.stopLossPrice || parseFloat(tpSlForm.stopLossPrice) <= 0) return 'Please enter a valid Stop Loss price';
            if (!tpSlForm.takeProfitPrice || parseFloat(tpSlForm.takeProfitPrice) <= 0) return 'Please enter a valid Take Profit price';

            const price = orderForm.type === 'LIMIT' ? parseFloat(orderForm.price) : currentPrice;
            const slPrice = parseFloat(tpSlForm.stopLossPrice);
            const tpPrice = parseFloat(tpSlForm.takeProfitPrice);

            if (orderForm.side === 'BUY') {
                if (slPrice >= price) return 'Stop Loss should be below order price for BUY';
                if (tpPrice <= price) return 'Take Profit should be above order price for BUY';
            } else {
                if (slPrice <= price) return 'Stop Loss should be above order price for SELL';
                if (tpPrice >= price) return 'Take Profit should be below order price for SELL';
            }
        }
        return null;
    };

    const handlePlaceOrder = async () => {
        const validationError = validateOrder();
        if (validationError) {
            alert(validationError);
            return;
        }

        setOrderLoading(true);
        setError(null);

        try {
            if (tpSlForm.enabled && orderForm.type === 'LIMIT') {
                // Use OTOCO for LIMIT with TP/SL
                const pendingSide = orderForm.side === 'BUY' ? 'SELL' : 'BUY';
                const timestamp = Date.now();

                let pendingAboveType, pendingAbovePrice, pendingAboveStopPrice, pendingAboveTimeInForce;
                let pendingBelowType, pendingBelowPrice, pendingBelowStopPrice, pendingBelowTimeInForce;

                if (orderForm.side === 'BUY') {
                    // Above: TP (higher), Below: SL (lower)
                    pendingAboveType = 'TAKE_PROFIT_LIMIT';
                    pendingAbovePrice = tpSlForm.takeProfitPrice;
                    pendingAboveStopPrice = tpSlForm.takeProfitPrice;
                    pendingAboveTimeInForce = 'GTC';
                    pendingBelowType = 'STOP_LOSS_LIMIT';
                    pendingBelowPrice = tpSlForm.stopLossPrice;
                    pendingBelowStopPrice = tpSlForm.stopLossPrice;
                    pendingBelowTimeInForce = 'GTC';
                } else {
                    // Above: SL (higher), Below: TP (lower)
                    pendingAboveType = 'STOP_LOSS_LIMIT';
                    pendingAbovePrice = tpSlForm.stopLossPrice;
                    pendingAboveStopPrice = tpSlForm.stopLossPrice;
                    pendingAboveTimeInForce = 'GTC';
                    pendingBelowType = 'TAKE_PROFIT_LIMIT';
                    pendingBelowPrice = tpSlForm.takeProfitPrice;
                    pendingBelowStopPrice = tpSlForm.takeProfitPrice;
                    pendingBelowTimeInForce = 'GTC';
                }

                const otocoPayload = {
                    symbol: selectedSymbol,
                    workingType: 'LIMIT',
                    workingSide: orderForm.side,
                    workingPrice: orderForm.price,
                    workingQuantity: orderForm.quantity,
                    workingTimeInForce: orderForm.timeInForce,
                    pendingSide,
                    pendingQuantity: orderForm.quantity, // Same qty to close position
                    pendingAboveType,
                    pendingAbovePrice,
                    pendingAboveStopPrice,
                    pendingAboveTimeInForce,
                    pendingBelowType,
                    pendingBelowPrice,
                    pendingBelowStopPrice,
                    pendingBelowTimeInForce,
                    timestamp
                };

                const result = await apiService.placeOrderListOTOCO(otocoPayload);
                alert(`✅ OTOCO Order List placed successfully! List ID: ${result.orderListId}`);
            } else if (tpSlForm.enabled && orderForm.type === 'MARKET') {
                // Keep your existing logic for MARKET with separate TP/SL (non-OCO)
                const orderData = {
                    symbol: selectedSymbol,
                    side: orderForm.side,
                    type: 'MARKET',
                    quantity: orderForm.quantity
                };

                const result = await apiService.placeOrder(orderData);
                alert(`✅ Market Order placed successfully! ID: ${result.orderId}`);

                if (result.status !== 'FILLED') {
                    throw new Error('Main order not fully filled. TP/SL not placed.');
                }
                const executedQty = result.executedQty;
                const oppositeSide = orderForm.side === 'BUY' ? 'SELL' : 'BUY';

                // Place Stop Loss order (STOP_LOSS_LIMIT)
                const slData = {
                    symbol: selectedSymbol,
                    side: oppositeSide,
                    type: 'STOP_LOSS_LIMIT',
                    quantity: executedQty,
                    price: tpSlForm.stopLossPrice,
                    stopPrice: tpSlForm.stopLossPrice,
                    timeInForce: 'GTC'
                };
                const slResult = await apiService.placeOrder(slData);
                alert(`✅ Stop Loss order placed! ID: ${slResult.orderId}`);

                // Place Take Profit order (TAKE_PROFIT_LIMIT)
                const tpData = {
                    symbol: selectedSymbol,
                    side: oppositeSide,
                    type: 'TAKE_PROFIT_LIMIT',
                    quantity: executedQty,
                    price: tpSlForm.takeProfitPrice,
                    stopPrice: tpSlForm.takeProfitPrice,
                    timeInForce: 'GTC'
                };
                const tpResult = await apiService.placeOrder(tpData);
                alert(`✅ Take Profit order placed! ID: ${tpResult.orderId}`);
            } else {
                // Single order (no TP/SL)
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

                const result = await apiService.placeOrder(orderData);
                alert(`✅ Order placed successfully! ID: ${result.orderId}`);
            }

            setOrderForm({
                side: 'BUY',
                type: 'LIMIT',
                quantity: '',
                price: '',
                timeInForce: 'GTC'
            });
            setTPSLForm({
                enabled: false,
                stopLossPrice: '',
                takeProfitPrice: ''
            });

            await loadAccountData();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Order failed: ${errorMessage}`);
            alert(`❌ Order failed: ${errorMessage}`);
        } finally {
            setOrderLoading(false);
        }
    };

    const calculatePercentageAmount = (percent: number) => {
        if (!accountInfo) return;

        const requiredAsset = orderForm.side === 'BUY' ? 'USDT' : selectedSymbol.replace('USDT', '');
        const balance = accountInfo.balances.find(b => b.asset === requiredAsset);

        if (!balance) return;

        let maxAmount = 0;

        if (orderForm.side === 'BUY' && orderForm.type === 'LIMIT' && orderForm.price) {
            maxAmount = parseFloat(balance.free) / parseFloat(orderForm.price);
        } else if (orderForm.side === 'SELL') {
            maxAmount = parseFloat(balance.free);
        }

        const calculatedAmount = (maxAmount * percent / 100).toFixed(8);
        updateOrderForm({ quantity: calculatedAmount });
    };

    const placeQuickOrder = async (side: 'BUY' | 'SELL', price: number) => {
        try {
            await apiService.placeOrder({
                symbol: selectedSymbol,
                side,
                type: 'LIMIT',
                quantity: '0.001',
                price: price.toFixed(2),
                timeInForce: 'GTC'
            });
            alert(`Quick ${side} order placed!`);
            await loadAccountData();
        } catch (error) {
            alert(`Order failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const quickOrderPrices = [
        { label: '+1%', price: currentPrice * 1.01 },
        { label: 'Market', price: currentPrice },
        { label: '-1%', price: currentPrice * 0.99 }
    ];

    const baseAsset = selectedSymbol.replace('USDT', '');
    const usdtBalance = accountInfo?.balances.find(b => b.asset === 'USDT');
    const baseBalance = accountInfo?.balances.find(b => b.asset === baseAsset);

    return (
        <div className="space-y-2">
            {/* Header: Place Order + Symbol in one line */}
            <div className="flex items-center justify-start gap-2">
                <h3 className="text-sm font-semibold text-card-foreground">Place Order</h3>
                <span className="text-sm font-bold text-blue-600">{selectedSymbol}</span>
            </div>

            {/* Balance: BTC and USDT in one line */}
            <div className="bg-card rounded border border-gray-200 p-2 overflow-hidden">
                <div className="flex justify-start items-center text-xs gap-2">
                    <div className="flex items-center gap-1">
                        <span className="text-primary">{baseAsset}:</span>
                        <span className="font-medium text-card-foreground">
                            {baseBalance ? parseFloat(baseBalance.free).toFixed(6) : '0.000000'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-primary">USDT:</span>
                        <span className="font-medium text-card-foreground">
                            {usdtBalance ? parseFloat(usdtBalance.free).toFixed(2) : '0.00'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Order Form */}
            <div className="bg-card rounded border border-gray-200 p-2 space-y-2">
                {/* Limit/Market Toggle */}
                <div className="flex bg-gray-100 rounded p-0.5">
                    <button
                        onClick={() => updateOrderForm({ type: 'LIMIT' })}
                        className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${orderForm.type === 'LIMIT'
                            ? 'bg-card text-card-foreground shadow-sm'
                            : 'text-gray-600'
                            }`}
                    >
                        Limit
                    </button>
                    <button
                        onClick={() => updateOrderForm({ type: 'MARKET' })}
                        className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${orderForm.type === 'MARKET'
                            ? 'bg-card text-card-foreground shadow-sm'
                            : 'text-gray-600'
                            }`}
                    >
                        Market
                    </button>
                </div>

                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded">
                    <button
                        onClick={() => updateOrderForm({ side: 'BUY' })}
                        className={`py-1.5 text-xs font-medium rounded transition-colors ${orderForm.side === 'BUY'
                            ? 'bg-green-500 text-card-foreground'
                            : 'text-gray-600'
                            }`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => updateOrderForm({ side: 'SELL' })}
                        className={`py-1.5 text-xs font-medium rounded transition-colors ${orderForm.side === 'SELL'
                            ? 'bg-red-500 text-card-foreground'
                            : 'text-gray-600'
                            }`}
                    >
                        Sell
                    </button>
                </div>

                {/* Input Fields: Price, Amount, Time in one line */}
                <div className="flex gap-1">
                    {/* Price Input - Only for LIMIT orders */}
                    {orderForm.type === 'LIMIT' && (
                        <div className="flex-1">
                            <label className="block text-xs text-card-foreground mb-0.5">Price</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={orderForm.price}
                                onChange={(e) => updateOrderForm({ price: e.target.value })}
                                className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                                style={{
                                    backgroundColor: 'var(--input)',
                                    color: 'var(--input-foreground)',
                                    borderColor: 'var(--input-border)'
                                }}
                            />
                        </div>
                    )}

                    {/* Amount Input */}
                    <div className="flex-1">
                        <label className="block text-xs text-card-foreground mb-0.5">Amount</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={orderForm.quantity}
                            onChange={(e) => updateOrderForm({ quantity: e.target.value })}
                            className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                            style={{
                                backgroundColor: 'var(--input)',
                                color: 'var(--input-foreground)',
                                borderColor: 'var(--input-border)'
                            }}
                        />
                    </div>

                    {/* Time in Force - Only for LIMIT orders */}
                    {orderForm.type === 'LIMIT' && (
                        <div className="flex-1">
                            <label className="block text-xs text-card-foreground mb-0.5">Time</label>
                            <select
                                value={orderForm.timeInForce}
                                onChange={(e) => updateOrderForm({ timeInForce: e.target.value as 'GTC' | 'IOC' | 'FOK' })}
                                className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                                style={{
                                    backgroundColor: 'var(--input)',
                                    color: 'var(--input-foreground)',
                                    borderColor: 'var(--input-border)'
                                }}
                            >
                                <option value="GTC">GTC</option>
                                <option value="IOC">IOC</option>
                                <option value="FOK">FOK</option>
                            </select>
                        </div>
                    )}
                </div>

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

                {/* TP/SL Section */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={tpSlForm.enabled}
                            onChange={(e) => updateTPSLForm({ enabled: e.target.checked })}
                            className="h-4 w-4"
                        />
                        <label className="text-xs font-medium text-card-foreground">Enable TP/SL</label>
                    </div>
                    {tpSlForm.enabled && (
                        <div className="grid grid-cols-2 gap-1">
                            <div>
                                <label className="block text-xs text-card-foreground mb-0.5">Stop Loss</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={tpSlForm.stopLossPrice}
                                    onChange={(e) => updateTPSLForm({ stopLossPrice: e.target.value })}
                                    className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                                    style={{
                                        backgroundColor: 'var(--input)',
                                        color: 'var(--input-foreground)',
                                        borderColor: 'var(--input-border)'
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-card-foreground mb-0.5">Take Profit</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={tpSlForm.takeProfitPrice}
                                    onChange={(e) => updateTPSLForm({ takeProfitPrice: e.target.value })}
                                    className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                                    style={{
                                        backgroundColor: 'var(--input)',
                                        color: 'var(--input-foreground)',
                                        borderColor: 'var(--input-border)'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Total */}
                <div className="bg-gray-50 rounded px-2 py-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Total</span>
                        <span className="font-medium text-gray-900">
                            {orderForm.type === 'LIMIT' && orderForm.price && orderForm.quantity
                                ? `${(parseFloat(orderForm.price) * parseFloat(orderForm.quantity)).toFixed(2)} USDT`
                                : orderForm.type === 'MARKET' ? 'Market Price' : '0.00 USDT'
                            }
                        </span>
                    </div>
                </div>

                {/* Place Order Button */}
                <button
                    onClick={handlePlaceOrder}
                    disabled={orderLoading || loading || !orderForm.quantity || (orderForm.type === 'LIMIT' && !orderForm.price)}
                    className={`w-full py-2 rounded font-medium text-sm transition-colors ${orderForm.side === 'BUY'
                        ? 'bg-green-700 hover:bg-green-600 text-card-foreground disabled:bg-green-300'
                        : 'bg-red-500 hover:bg-red-600 text-card-foreground disabled:bg-red-300'
                        } disabled:cursor-not-allowed`}
                >
                    {orderLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Placing...
                        </div>
                    ) : (
                        `${orderForm.side} ${baseAsset}`
                    )}
                </button>

                {/* Error Display */}
                {error && (
                    <div className="p-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {error}
                    </div>
                )}
            </div>

            {/* Tabbed Section: Open Orders / Quick Orders */}
            <div className="bg-card rounded border border-gray-200">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'orders'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Open Orders ({openOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('quick')}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'quick'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Quick Trade
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-2" style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }} >
                    {activeTab === 'orders' ? (
                        /* Open Orders Content */
                        <div className=''>
                            {openOrders.length === 0 ? (
                                <div className="text-center py-3 text-xs text-gray-500">
                                    No open orders
                                </div>
                            ) : (
                                <div className="space-y-1 overflow-y-auto max-h-48 scrollbar-hide">
                                    <OpenedOrders
                                        openOrders={openOrders}
                                        selectedSymbol={selectedSymbol}
                                        apiService={apiService}
                                        refresh={loadAccountData}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Quick Trade Content */
                        <div>
                            <div className="text-center mb-2">
                                <div className="text-sm font-bold text-gray-800">
                                    ${currentPrice.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">{selectedSymbol}</div>
                            </div>

                            <div className="space-y-1">
                                {quickOrderPrices.map((item, index) => (
                                    <div key={index} className="flex gap-1">
                                        <button
                                            onClick={() => placeQuickOrder('BUY', item.price)}
                                            className="flex-1 py-1.5 text-xs bg-green-500 text-card-foreground rounded hover:bg-green-600 transition-colors"
                                        >
                                            Buy {item.label}
                                        </button>
                                        <button
                                            onClick={() => placeQuickOrder('SELL', item.price)}
                                            className="flex-1 py-1.5 text-xs bg-red-500 text-card-foreground rounded hover:bg-red-600 transition-colors"
                                        >
                                            Sell {item.label}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default TradingPanel;