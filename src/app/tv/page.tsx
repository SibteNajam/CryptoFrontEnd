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
    theme = "dark",
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
    const [chartId, setChartId] = useState<string>(''); // ✅ Start with empty string
    const [isMounted, setIsMounted] = useState(false);   // ✅ Track mounting state

    // ✅ Generate ID only after component mounts (client-side)
    useEffect(() => {
        setChartId(`tradingview_${Math.random().toString(36).substr(2, 9)}`);
        setIsMounted(true);
    }, []);

    useEffect(() => {
        // ✅ Only run when component is mounted and chartId is set
        if (!isMounted || !chartId) return;

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
            const TradingView = (window as any).TradingView;
            
            if (containerRef.current && TradingView && chartId) {
                new TradingView.widget({
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
                    container_id: chartId, // ✅ Use state-based chartId
                    studies: indicators,
                    hide_side_toolbar: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    save_image: true,
                    range: "1D"
                });
            }
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [symbol, interval, theme, indicators, isMounted, chartId]); // ✅ Include dependencies

    // ✅ Show loading state until mounted
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
                id={chartId} // ✅ Now uses stable client-side generated ID
                style={{ height, width }}
            />
        </div>
    );
};

export default TradingViewChart;