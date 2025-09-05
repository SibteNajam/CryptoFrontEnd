"use client";

import React, { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        TradingView?: {
            widget: new (config: any) => any;
        };
    }
}

interface TradingViewChartProps {
    symbol?: string;
    interval?: string;
    theme?: 'light' | 'dark';
    height?: string;
    width?: string;
    indicators?: string[];
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
    symbol = "BINANCE:BTCUSDT",
    interval = "5",
    theme = "light",
    height = "500px",
    width = "100%",
    indicators = [
        "RSI@tv-basicstudies",
        "BB@tv-basicstudies",
        "ATR@tv-basicstudies",
        "MACD@tv-basicstudies",
        "Volume@tv-basicstudies"
    ]
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);
    const [chartId, setChartId] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);
    const isCreatingWidget = useRef(false); // ✅ ADD THIS - Prevent multiple creations

    // ✅ Generate ID only after component mounts (client-side)
    useEffect(() => {
        setChartId(`tradingview_${Math.random().toString(36).substr(2, 9)}`);
        setIsMounted(true);
    }, []);

    // ✅ SEPARATE EFFECT - Only create widget once when mounted
    useEffect(() => {
        if (!isMounted || !chartId || isCreatingWidget.current) return;

        const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
        
        if (existingScript && window.TradingView) {
            createWidget();
        } else {
            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = createWidget;
            document.head.appendChild(script);
        }

        function createWidget() {
            if (isCreatingWidget.current || widgetRef.current) return; // ✅ Prevent duplicate creation
            
            const TradingView = (window as any).TradingView;
            
            if (containerRef.current && TradingView && chartId) {
                isCreatingWidget.current = true; // ✅ Mark as creating
                containerRef.current.innerHTML = '';
                
                const widget = new TradingView.widget({
                    autosize: true,
                    symbol: symbol,
                    interval: interval,
                    timezone: "Etc/UTC",
                    theme: theme,
                    style: "1",
                    locale: "en",
                    toolbar_bg: "#f1f3f6",
                    enable_publishing: false,
                    allow_symbol_change: true,
                    container_id: chartId,
                    studies: indicators,
                    hide_side_toolbar: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    save_image: true,
                    range: "1D"
                });
                
                widgetRef.current = widget;
                isCreatingWidget.current = false; // ✅ Mark as done
            }
        }

        return () => {
            if (widgetRef.current) {
                try {
                    widgetRef.current.remove();
                } catch (e) {
                    console.warn('Error cleaning up widget:', e);
                }
                widgetRef.current = null;
            }
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            isCreatingWidget.current = false;
        };
    }, [isMounted, chartId]); // ✅ REMOVE symbol, interval, theme from dependencies

    // ✅ ADD THIS - Handle symbol/interval changes without recreating widget
    useEffect(() => {
        if (widgetRef.current && symbol && interval) {
            try {
                // Use TradingView's built-in method to change symbol
                widgetRef.current.setSymbol(symbol, interval, () => {
                    console.log('Symbol updated to:', symbol);
                });
            } catch (error) {
                console.warn('Could not update symbol:', error);
                // If setSymbol fails, we might need to recreate (uncomment below if needed)
                // location.reload();
            }
        }
    }, [symbol, interval]); // ✅ Only symbol and interval changes

    // ✅ Cleanup on unmount
    useEffect(() => {
        return () => {
            if (widgetRef.current) {
                try {
                    widgetRef.current.remove();
                } catch (e) {
                    console.warn('Error on unmount cleanup:', e);
                }
            }
        };
    }, []);

    if (!isMounted) {
        return (
            <div className="tradingview-widget-container">
                <div style={{ 
                    height, 
                    width, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#1a1a1a',
                    color: '#4CAF50',
                    border: '1px solid #333'
                }}>
                    Loading TradingView Chart...
                </div>
            </div>
        );
    }

    return (
        <div className="tradingview-widget-container">
            <div 
                ref={containerRef}
                id={chartId}
                style={{ height, width }}
            />
        </div>
    );
};

export default TradingViewChart;