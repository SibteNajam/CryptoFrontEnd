"use client";

import React, { useState, useEffect } from 'react';
import { BinanceApiService, AccountInfo, OpenOrder } from '../../api/BinanceOrder';
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
    const [symbolInfo, setSymbolInfo] = useState<any>(null);

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
            alert(`✅ OTOCO Order List placed successfully! List ID: ${result.orderListId}`);

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
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Order failed: ${errorMessage}`);
            alert(`❌ Order failed: ${errorMessage}`);
        } finally {
            setOrderLoading(false);
        }
    };

    const baseAsset = selectedSymbol.replace('USDT', '');
    const usdtBalance = accountInfo?.balances.find(b => b.asset === 'USDT');
    const baseBalance = accountInfo?.balances.find(b => b.asset === baseAsset);

    return (
        <div className="space-y-2">
            {/* Header: Place Order + Symbol */}
            <div className="flex items-center justify-start gap-2">
                <h3 className="text-sm font-semibold text-card-foreground">Place OTOCO Order</h3>
                <span className="text-sm font-bold text-blue-600">{selectedSymbol}</span>
            </div>

            {/* Balance: Base Asset and USDT */}
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
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded">
                    <button
                        onClick={() => setOrderForm(prev => ({ ...prev, side: 'BUY' }))}
                        className={`py-1.5 text-xs font-medium rounded transition-colors ${orderForm.side === 'BUY'
                            ? 'bg-green-500 text-card-foreground'
                            : 'text-gray-600'
                            }`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setOrderForm(prev => ({ ...prev, side: 'SELL' }))}
                        className={`py-1.5 text-xs font-medium rounded transition-colors ${orderForm.side === 'SELL'
                            ? 'bg-red-500 text-card-foreground'
                            : 'text-gray-600'
                            }`}
                    >
                        Sell
                    </button>
                </div>

                {/* Input Fields: Price, Amount, Time */}
                <div className="flex gap-1">
                    <div className="flex-1">
                        <label className="block text-xs text-card-foreground mb-0.5">Price</label>
                        <input
                            type="text"
                            placeholder="0.00000"
                            value={orderForm.price}
                            onChange={(e) => handleInputChange('price', e.target.value, true)}
                            onKeyDown={(e) => handleInputKeyDown(e, 'price', true, symbolInfo?.pricePrecision ?? 5)}
                            className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                            style={{
                                backgroundColor: 'var(--input)',
                                color: 'var(--input-foreground)',
                                borderColor: 'var(--input-border)'
                            }}
                        />
                    </div>

                    <div className="flex-1">
                        <label className="block text-xs text-card-foreground mb-0.5">Amount</label>
                        <input
                            type="text"
                            placeholder="0.0"
                            value={orderForm.quantity}
                            onChange={(e) => handleInputChange('quantity', e.target.value, true)}
                            onKeyDown={(e) => handleInputKeyDown(e, 'quantity', true, symbolInfo?.quantityPrecision ?? 1)}
                            className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                            style={{
                                backgroundColor: 'var(--input)',
                                color: 'var(--input-foreground)',
                                borderColor: 'var(--input-border)'
                            }}
                        />
                    </div>

                    <div className="flex-1">
                        <label className="block text-xs text-card-foreground mb-0.5">Time</label>
                        <select
                            value={orderForm.timeInForce}
                            onChange={(e) => setOrderForm(prev => ({ ...prev, timeInForce: e.target.value as 'GTC' | 'IOC' | 'FOK' }))}
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
                </div>

                {/* TP/SL Section */}
                <div className="space-y-1">
                    <div className="text-xs font-medium text-card-foreground">Take Profit / Stop Loss</div>
                    <div className="grid grid-cols-2 gap-1">
                        <div>
                            <label className="block text-xs text-card-foreground mb-0.5">Stop Loss</label>
                            <input
                                type="text"
                                placeholder="0.00000"
                                value={tpSlForm.stopLossPrice}
                                onChange={(e) => handleInputChange('stopLossPrice', e.target.value, false)}
                                onKeyDown={(e) => handleInputKeyDown(e, 'stopLossPrice', false, symbolInfo?.pricePrecision ?? 5)}
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
                                type="text"
                                placeholder="0.00000"
                                value={tpSlForm.takeProfitPrice}
                                onChange={(e) => handleInputChange('takeProfitPrice', e.target.value, false)}
                                onKeyDown={(e) => handleInputKeyDown(e, 'takeProfitPrice', false, symbolInfo?.pricePrecision ?? 5)}
                                className="w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                                style={{
                                    backgroundColor: 'var(--input)',
                                    color: 'var(--input-foreground)',
                                    borderColor: 'var(--input-border)'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Total */}
                <div className="bg-gray-50 rounded px-2 py-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Total</span>
                        <span className="font-medium text-gray-900">
                            {orderForm.price && orderForm.quantity
                                ? `${(parseFloat(orderForm.price) * parseFloat(orderForm.quantity)).toFixed(2)} USDT`
                                : '0.00 USDT'}
                        </span>
                    </div>
                </div>

                {/* Place Order Button */}
                <button
                    onClick={handlePlaceOTOCOOrder}
                    disabled={orderLoading || loading || !symbolInfo || !orderForm.quantity || !orderForm.price || !tpSlForm.stopLossPrice || !tpSlForm.takeProfitPrice}
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
                        `Place OTOCO ${orderForm.side} ${baseAsset}`
                    )}
                </button>

                {/* Error Display */}
                {error && (
                    <div className="p-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {error}
                    </div>
                )}
            </div>

            {/* Open Orders */}
            <div className="bg-card rounded border border-gray-200 p-2">
                <div className="text-xs font-medium text-card-foreground mb-1">Open Orders ({openOrders.length})</div>
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
        </div>
    );
};

export default TradingPanel;