"use client";

import React, { useState, useEffect } from 'react';
import { BinanceApiService } from '../../api/BinanceOrder';

interface PriceClickHandlerProps {
    selectedSymbol: string;
    apiService: BinanceApiService;
}

const PriceClickHandler: React.FC<PriceClickHandlerProps> = ({ 
    selectedSymbol, 
    apiService 
}) => {
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [showQuickOrder, setShowQuickOrder] = useState(false);

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
        const interval = setInterval(fetchPrice, 3000);
        return () => clearInterval(interval);
    }, [selectedSymbol]);

    const quickOrderPrices = [
        { label: '+1%', price: currentPrice * 1.01 },
        { label: 'Market', price: currentPrice },
        { label: '-1%', price: currentPrice * 0.99 }
    ];

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
        } catch (error) {
            alert(`Order failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Quick Trade</h3>
                <button
                    onClick={() => setShowQuickOrder(!showQuickOrder)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                >
                    {showQuickOrder ? 'Hide' : 'Show'}
                </button>
            </div>

            <div className="text-center mb-3">
                <div className="text-lg font-bold text-gray-800">
                    ${currentPrice.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">{selectedSymbol}</div>
            </div>

            {showQuickOrder && (
                <div className="space-y-2">
                    {quickOrderPrices.map((item, index) => (
                        <div key={index} className="flex gap-1">
                            <button
                                onClick={() => placeQuickOrder('BUY', item.price)}
                                className="flex-1 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            >
                                Buy {item.label}
                            </button>
                            <button
                                onClick={() => placeQuickOrder('SELL', item.price)}
                                className="flex-1 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                Sell {item.label}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PriceClickHandler;