"use client";

import React, { useState, useEffect } from 'react';

interface PriceClickHandlerProps {
    selectedSymbol: string;
    apiService: any;
}

const PriceClickHandler: React.FC<PriceClickHandlerProps> = ({ selectedSymbol, apiService }) => {
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [clickPrice, setClickPrice] = useState<number | null>(null);
    const [showOrderForm, setShowOrderForm] = useState(false);

    // ✅ Get current price from chart or API
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

        fetchPrice();
        const interval = setInterval(fetchPrice, 1000); // Update every second
        return () => clearInterval(interval);
    }, [selectedSymbol]);

    // ✅ Handle price level clicks (simulate chart clicks)
    const handlePriceClick = (price: number) => {
        setClickPrice(price);
        setShowOrderForm(true);
    };

    const placeQuickOrder = async (side: 'BUY' | 'SELL', quantity: string) => {
        try {
            const order = {
                symbol: selectedSymbol,
                side,
                type: 'LIMIT' as const,
                quantity,
                price: clickPrice?.toString() || currentPrice.toString(),
                timeInForce: 'GTC' as const
            };

            await apiService.placeOrder(order);
            alert(`${side} order placed at $${clickPrice}`);
            setShowOrderForm(false);
            setClickPrice(null);
        } catch (error) {
            alert(`Order failed: ${error.message}`);
        }
    };

    return (
        <div className="bg-white rounded-lg p-4 mt-4">
            <h3 className="font-semibold mb-3">Quick Order Entry</h3>
            
            {/* Current Price Display */}
            <div className="text-center mb-4">
                <div className="text-2xl font-bold text-green-600">
                    ${currentPrice.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{selectedSymbol}</div>
            </div>

            {/* Price Level Buttons */}
            <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium">Click Price to Order:</h4>
                {[
                    currentPrice * 1.02, // +2%
                    currentPrice * 1.01, // +1%
                    currentPrice,        // Current
                    currentPrice * 0.99, // -1%
                    currentPrice * 0.98  // -2%
                ].map((price, index) => (
                    <button
                        key={index}
                        onClick={() => handlePriceClick(price)}
                        className={`w-full p-2 text-sm rounded ${
                            price > currentPrice 
                                ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                                : price < currentPrice
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        ${price.toFixed(2)} {price > currentPrice ? '(+)' : price < currentPrice ? '(-)' : '(Current)'}
                    </button>
                ))}
            </div>

            {/* Quick Order Form */}
            {showOrderForm && clickPrice && (
                <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Order at ${clickPrice.toFixed(2)}</h4>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                            onClick={() => placeQuickOrder('BUY', '0.001')}
                            className="bg-green-500 text-white px-3 py-2 rounded text-sm"
                        >
                            BUY 0.001
                        </button>
                        <button
                            onClick={() => placeQuickOrder('SELL', '0.001')}
                            className="bg-red-500 text-white px-3 py-2 rounded text-sm"
                        >
                            SELL 0.001
                        </button>
                    </div>
                    <button
                        onClick={() => setShowOrderForm(false)}
                        className="w-full text-gray-500 text-sm"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
};

export default PriceClickHandler;