"use client";

import React, { useState, useEffect } from 'react';
import { BinanceApiService, AccountInfo, OpenOrder } from '../../infrastructure/api/BinanceOrder';
import OpenedOrders from '../OrderPlacment/openedOrder';
import { Info, TrendingDown, TrendingUp } from 'lucide-react';

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
    quantity: string;
    price: string;
    timeInForce: 'GTC' | 'IOC' | 'FOK';
}

const TradingPanel: React.FC<TradingPanelProps> = ({
    selectedSymbol,
    apiService
}) => {
    const [activeTab, setActiveTab] = useState('limit');
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderLoading, setOrderLoading] = useState(false);
    const [symbolInfo, setSymbolInfo] = useState<any>(null);
    const [enableTPSL, setEnableTPSL] = useState(true);


    const [orderForm, setOrderForm] = useState<OrderForm>({
        side: 'BUY',
        quantity: '',
        price: '',
        timeInForce: 'GTC'
    });
    const [tpSlForm, setTPSLForm] = useState<TP_SL_Form>({
        enabled: true,
        stopLossPrice: '',
        takeProfitPrice: ''
    });
    const [marketForm, setMarketForm] = useState({
        side: 'BUY',
        quantity: '',
        quoteOrderQty: ''
    });


    const formatToPrecision = (value: string, precision: number): string => {
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        return num.toFixed(precision);
    };

    const padZeros = (value: string, precision: number): string => {
        if (!value || value === '.') return '';
        const [integerPart, decimalPart = ''] = value.split('.');
        const paddedDecimal = decimalPart.padEnd(precision, '0').slice(0, precision);
        return decimalPart ? `${integerPart}.${paddedDecimal}` : `${integerPart}.` + '0'.repeat(precision);
    };

    const handleInputChange = (
        field: keyof OrderForm | keyof TP_SL_Form,
        value: string,
        isOrderForm: boolean
    ) => {
        if (isOrderForm) {
            setOrderForm(prev => ({ ...prev, [field]: value }));
        } else {
            setTPSLForm(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleInputKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        field: keyof OrderForm | keyof TP_SL_Form,
        isOrderForm: boolean,
        precision: number
    ) => {
        if (e.key === 'Enter') {
            const rawValue = isOrderForm ? orderForm[field as keyof OrderForm] : tpSlForm[field as keyof TP_SL_Form];
            const value = typeof rawValue === 'string' ? rawValue : '';
            const formattedValue = padZeros(value, precision);
            if (isOrderForm) {
                setOrderForm(prev => ({ ...prev, [field]: formattedValue }));
            } else {
                setTPSLForm(prev => ({ ...prev, [field]: formattedValue }));
            }
        }
    };

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchSymbolInfo = async () => {
            try {
                const exchangeInfo = await apiService.getExchangeInfo();
                const info = exchangeInfo.symbols.find((s: any) => s.symbol === selectedSymbol);
                if (!info) {
                    throw new Error(`Symbol ${selectedSymbol} not found in exchange info`);
                }
                setSymbolInfo({
                    ...info,
                    pricePrecision: info.filters.find((f: any) => f.filterType === 'PRICE_FILTER').tickSize.toString().split('.')[1]?.length || 5,
                    quantityPrecision: info.filters.find((f: any) => f.filterType === 'LOT_SIZE').stepSize.toString().split('.')[1]?.length || 1
                });
            } catch (err) {
                console.error('Error fetching symbol info:', err);
                setError(`Failed to load symbol information for ${selectedSymbol}. Using default precision.`);
            }
        };

        if (selectedSymbol) {
            fetchSymbolInfo();
            loadAccountData();
        }
    }, [selectedSymbol, apiService]);

    const validateOrder = (): string | null => {
        if (!selectedSymbol) return 'No symbol selected';
        if (!orderForm.quantity || parseFloat(orderForm.quantity) <= 0) return 'Please enter a valid quantity';
        if (!orderForm.price || parseFloat(orderForm.price) <= 0) return 'Please enter a valid price';
        if (!tpSlForm.stopLossPrice || parseFloat(tpSlForm.stopLossPrice) <= 0) return 'Please enter a valid Stop Loss price';
        if (!tpSlForm.takeProfitPrice || parseFloat(tpSlForm.takeProfitPrice) <= 0) return 'Please enter a valid Take Profit price';
        if (!symbolInfo) return 'Symbol information not loaded. Please wait or select a valid symbol.';

        const pricePrecision = symbolInfo.pricePrecision ?? 5;
        const quantityPrecision = symbolInfo.quantityPrecision ?? 1;
        const minNotional = parseFloat(symbolInfo.filters.find((f: any) => f.filterType === 'NOTIONAL')?.minNotional) || 5;

        // Validate precision
        if (orderForm.quantity !== parseFloat(orderForm.quantity).toFixed(quantityPrecision)) {
            return `Quantity must have ${quantityPrecision} decimal places`;
        }
        if (orderForm.price !== parseFloat(orderForm.price).toFixed(pricePrecision)) {
            return `Price must have ${pricePrecision} decimal places`;
        }
        if (tpSlForm.stopLossPrice !== parseFloat(tpSlForm.stopLossPrice).toFixed(pricePrecision)) {
            return `Stop Loss price must have ${pricePrecision} decimal places`;
        }
        if (tpSlForm.takeProfitPrice !== parseFloat(tpSlForm.takeProfitPrice).toFixed(pricePrecision)) {
            return `Take Profit price must have ${pricePrecision} decimal places`;
        }

        const price = parseFloat(orderForm.price);
        const quantity = parseFloat(orderForm.quantity);
        const slPrice = parseFloat(tpSlForm.stopLossPrice);
        const tpPrice = parseFloat(tpSlForm.takeProfitPrice);

        // Validate notional
        if (price * quantity < minNotional) {
            return `Order value must be at least ${minNotional} USDT, got ${(price * quantity).toFixed(6)} USDT`;
        }

        // Validate TP/SL logic
        if (orderForm.side === 'BUY') {
            if (slPrice >= price) return 'Stop Loss should be below order price for BUY';
            if (tpPrice <= price) return 'Take Profit should be above order price for BUY';
        } else {
            if (slPrice <= price) return 'Stop Loss should be above order price for SELL';
            if (tpPrice >= price) return 'Take Profit should be below order price for SELL';
        }

        return null;
    };

    const handlePlaceOTOCOOrder = async () => {
        // Pad zeros for all fields before submitting
        const pricePrecision = symbolInfo?.pricePrecision ?? 5;
        const quantityPrecision = symbolInfo?.quantityPrecision ?? 1;
        const formattedOrderForm = {
            ...orderForm,
            price: padZeros(orderForm.price, pricePrecision),
            quantity: padZeros(orderForm.quantity, quantityPrecision)
        };
        const formattedTPSLForm = {
            ...tpSlForm,
            stopLossPrice: padZeros(tpSlForm.stopLossPrice, pricePrecision),
            takeProfitPrice: padZeros(tpSlForm.takeProfitPrice, pricePrecision)
        };

        setOrderForm(formattedOrderForm);
        setTPSLForm(formattedTPSLForm);

        const validationError = validateOrder();
        if (validationError) {
            setError(validationError);
            alert(validationError);
            return;
        }

        setOrderLoading(true);
        setError(null);

        try {
            const pendingSide = orderForm.side === 'BUY' ? 'SELL' : 'BUY';
            const otocoPayload = {
                symbol: selectedSymbol,
                workingType: 'LIMIT',
                workingSide: orderForm.side,
                workingPrice: formattedOrderForm.price,
                workingQuantity: formattedOrderForm.quantity,
                workingTimeInForce: orderForm.timeInForce,
                pendingSide,
                pendingQuantity: formattedOrderForm.quantity,
                pendingAboveType: orderForm.side === 'BUY' ? 'TAKE_PROFIT_LIMIT' : 'STOP_LOSS_LIMIT',
                pendingAbovePrice: formattedTPSLForm.takeProfitPrice,
                pendingAboveStopPrice: formattedTPSLForm.takeProfitPrice,
                pendingAboveTimeInForce: 'GTC',
                pendingBelowType: orderForm.side === 'BUY' ? 'STOP_LOSS_LIMIT' : 'TAKE_PROFIT_LIMIT',
                pendingBelowPrice: formattedTPSLForm.stopLossPrice,
                pendingBelowStopPrice: formattedTPSLForm.stopLossPrice,
                pendingBelowTimeInForce: 'GTC'
            };

            const result = await apiService.placeOrderListOTOCO(otocoPayload);

            setOrderForm({
                side: 'BUY',
                quantity: '',
                price: '',
                timeInForce: 'GTC'
            });
            setTPSLForm({
                enabled: true,
                stopLossPrice: '',
                takeProfitPrice: ''
            });

            await loadAccountData();
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Order failed: ${errorMessage}`);
            alert(`❌ Order failed: ${errorMessage}`);
        } finally {
            setOrderLoading(false);
        }
    };

    const handleMarketOrder = async () => {
    try {
        if (!marketForm.quantity || parseFloat(marketForm.quantity) <= 0) {
            throw new Error('Please enter a valid quantity');
        }
        
        const quantityPrecision = symbolInfo?.quantityPrecision ?? 1;
        const formattedQuantity = padZeros(marketForm.quantity, quantityPrecision);
        
        const result = await apiService.placeOrder({
            symbol: selectedSymbol,
            side: marketForm.side,
            type: 'MARKET',
            quantity: formattedQuantity
            // Note: no price or timeInForce for market orders
        });
        
        alert(`✅ Market order placed! Order ID: ${result.orderId}`);
        
        // Reset form
        setMarketForm({
            side: 'BUY',
            quantity: '',
            quoteOrderQty: ''
        });
        
        await loadAccountData();
        return result;
    } catch (err) {
        throw err; // Let handlePlaceOrder handle the error
    }
};

  const handlePlaceOrder = async () => {
    setOrderLoading(true);
    setError(null);
    
    try {
        let result;
        
        if (activeTab === 'limit' && enableTPSL) {
            // OTOCO order with TP/SL
            result = await handlePlaceOTOCOOrder();
            alert(`✅ OTOCO Order placed! List ID: ${result?.orderListId}`);
        } else if (activeTab === 'limit' && !enableTPSL) {
            // Regular limit order without TP/SL
            const pricePrecision = symbolInfo?.pricePrecision ?? 5;
            const quantityPrecision = symbolInfo?.quantityPrecision ?? 1;
            
            const formattedOrder = {
                symbol: selectedSymbol,
                side: orderForm.side,
                type: 'LIMIT' as const,
                quantity: padZeros(orderForm.quantity, quantityPrecision),
                price: padZeros(orderForm.price, pricePrecision),
                timeInForce: orderForm.timeInForce
            };
            
            result = await apiService.placeOrder(formattedOrder);
            alert(`✅ Limit order placed! Order ID: ${result.orderId}`);
            
            // Reset form
            setOrderForm({
                side: 'BUY',
                quantity: '',
                price: '',
                timeInForce: 'GTC'
            });
            
            await loadAccountData();
        } else if (activeTab === 'market') {
            // Market order
            await handleMarketOrder();
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        alert(`❌ Order failed: ${errorMessage}`);
    } finally {
        setOrderLoading(false);
    }
};


    const baseAsset = selectedSymbol.replace('USDT', '');
    const usdtBalance = accountInfo?.balances.find(b => b.asset === 'USDT');
    const baseBalance = accountInfo?.balances.find(b => b.asset === baseAsset);

    return (
        <div className="h-full flex flex-col bg-card">
            {/* Header with Symbol and Balance */}
            <div className="bg-card px-4 py-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-900">{selectedSymbol}</span>
                        <span className="text-sm text-gray-500">Perpetual</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">Available:</span>
                            <span className="font-semibold text-gray-900">
                                {usdtBalance ? parseFloat(usdtBalance.free).toFixed(2) : '0.00'} USDT
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-500">{baseAsset}:</span>
                            <span className="font-semibold text-gray-900">
                                {baseBalance ? parseFloat(baseBalance.free).toFixed(6) : '0.000000'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-card border-t border-default px-3">
                <div className="flex items-center gap-6 text-xs font-medium">
                    <button
                        onClick={() => setActiveTab('limit')}
                        className={`relative py-3 transition-colors ${
                            activeTab === 'limit'
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Limit
                        {activeTab === 'limit' && (
                            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`relative py-3 transition-colors ${
                            activeTab === 'market'
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Market
                        {activeTab === 'market' && (
                            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Trading Form */}
            <div className="flex-1 bg-card px-4 pb-4 pt-3">
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                        onClick={() => {
                            setOrderForm(prev => ({ ...prev, side: 'BUY' }));
                            setMarketForm(prev => ({ ...prev, side: 'BUY' }));
                        }}
                        className={`py-2.5 rounded-lg font-semibold text-xs tracking-wide border transition-all ${
                            (activeTab === 'limit' ? orderForm.side : marketForm.side) === 'BUY'
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Buy {baseAsset}
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            setOrderForm(prev => ({ ...prev, side: 'SELL' }));
                            setMarketForm(prev => ({ ...prev, side: 'SELL' }));
                        }}
                        className={`py-2.5 rounded-lg font-semibold text-xs tracking-wide border transition-all ${
                            (activeTab === 'limit' ? orderForm.side : marketForm.side) === 'SELL'
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            Sell {baseAsset}
                        </div>
                    </button>
                </div>

                {activeTab === 'limit' ? (
                    <div className="space-y-4">
                        {/* Price & Amount row */}
                        <div className="flex gap-3">
                            {/* Price Input */}
                            <div className="flex-1">
                                <label className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                    <span>Price</span>
                                    <span className="text-[10px] uppercase">USDT</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="0.00"
                                        value={orderForm.price}
                                        onChange={(e) =>
                                            setOrderForm((prev) => ({ ...prev, price: e.target.value }))
                                        }
                                        className="w-full px-3 py-2.5 rounded-md bg-muted border border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                                    />
                                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-primary hover:text-primary/80 font-medium">
                                        Last
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="flex-1">
                                <label className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                    <span>Amount</span>
                                    <span className="text-[10px] uppercase">{baseAsset}</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="0.00"
                                    value={orderForm.quantity}
                                    onChange={(e) =>
                                        setOrderForm((prev) => ({ ...prev, quantity: e.target.value }))
                                    }
                                    className="w-full px-3 py-2.5 rounded-md bg-muted border border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                                />
                            </div>
                        </div>

                        {/* Percentage buttons */}
                        <div className="flex gap-1 mt-2">
                            {['25%', '50%', '75%', '100%'].map(pct => (
                                <button
                                    key={pct}
                                    className="flex-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                >
                                    {pct}
                                </button>
                            ))}
                        </div>


                        {/* OCO Checkbox and TP/SL */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableTPSL}
                                    onChange={(e) => setEnableTPSL(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-0"
                                />
                                <span className="text-sm font-medium text-gray-700">Enable TP/SL</span>
                                <Info className="w-3.5 h-3.5 text-gray-400" />
                            </label>

                            {enableTPSL && (
                                <div className="p-3 bg-card rounded-lg space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-600 mb-1 block ">Stop Loss</label>
                                            <input
                                                type="text"
                                                placeholder="0.00"
                                                value={tpSlForm.stopLossPrice}
                                                onChange={(e) => setTPSLForm(prev => ({ ...prev, stopLossPrice: e.target.value }))}
                                                className="bg-gray-100 w-full px-2.5 py-2 text-sm border  rounded-md focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600 mb-1 block">Take Profit</label>
                                            <input
                                                type="text"
                                                placeholder="0.00"
                                                value={tpSlForm.takeProfitPrice}
                                                onChange={(e) => setTPSLForm(prev => ({ ...prev, takeProfitPrice: e.target.value }))}
                                                className=" bg-gray-100 w-full px-2.5 py-2 text-sm border rounded-md focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time in Force */}
                        <div>
                            <label className="text-sm text-gray-600 mb-2 block">Time in Force</label>
                            <select
                                value={orderForm.timeInForce}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, timeInForce: e.target.value as 'GTC' | 'IOC' | 'FOK' }))}
                                className="w-full px-3 py-2.5 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-0 "
                                aria-label="Time in Force"
                            >
                                <option value="GTC">GTC (Good Till Cancel)</option>
                                <option value="IOC">IOC (Immediate or Cancel)</option>
                                <option value="FOK">FOK (Fill or Kill)</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Market Order Form */}
                        <div className="p-3 bg-card rounded-lg">
                            <p className="text-[11px] text-muted-foreground">
                                Market orders execute immediately at the best available price
                            </p>
                        </div>

                        <div>
                            <label className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                <span>Amount</span>
                                <span className="text-[10px] uppercase">{baseAsset}</span>
                            </label>
                            <input
                                type="text"
                                placeholder="0.00"
                                value={marketForm.quantity}
                                onChange={(e) => setMarketForm(prev => ({ ...prev, quantity: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-muted rounded-lg border border-default text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 "
                            />
                            <div className="flex gap-1 mt-2">
                                {['25%', '50%', '75%', '100%'].map(pct => (
                                    <button
                                        key={pct}
                                        className="flex-1 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                    >
                                        {pct}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Total and Submit */}
                    <div className="mt-2 space-y-2">
                    <div className="px-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Total</span>
                            <span className="text-base font-semibold text-foreground">
                                {activeTab === 'limit' && orderForm.price && orderForm.quantity
                                    ? `${(parseFloat(orderForm.price) * parseFloat(orderForm.quantity)).toFixed(2)} USDT`
                                    : '0.00 USDT'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handlePlaceOrder}
                        disabled={orderLoading}
                        className={`mt-2 w-full py-3 rounded-md text-sm font-semibold text-white transition-colors ${(activeTab === 'limit' ? orderForm.side : marketForm.side) === 'BUY'
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : 'bg-rose-500 hover:bg-rose-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {orderLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Placing Order...
                            </span>
                        ) : (
                            `${(activeTab === 'limit' ? orderForm.side : marketForm.side)} ${baseAsset}`
                        )}
                    </button>
                </div>

                {/* Open Orders */}
                <div className="mt-6 pt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Open Orders ({openOrders.length})</h3>
                        <button className="text-xs text-blue-600 hover:text-blue-700">View All</button>
                    </div>
                    {openOrders.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-500">
                            No open orders
                        </div>
                    ) : (
                        <div className="space-y-1 overflow-y-auto max-h-48 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            <OpenedOrders openOrders={openOrders} selectedSymbol={selectedSymbol} apiService={apiService} refresh={loadAccountData}  />
                            {/* Order list would go here */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradingPanel;
