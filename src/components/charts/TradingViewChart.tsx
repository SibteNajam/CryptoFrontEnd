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
    theme = "light", // ✅ CHANGED - Default to light theme
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
    const isCreatingWidget = useRef(false);

    useEffect(() => {
        setChartId(`tradingview_${Math.random().toString(36).substr(2, 9)}`);
        setIsMounted(true);
    }, []);

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
            if (isCreatingWidget.current || widgetRef.current) return;
            
            const TradingView = (window as any).TradingView;
            
            if (containerRef.current && TradingView && chartId) {
                isCreatingWidget.current = true;
                containerRef.current.innerHTML = '';
                
                const widget = new TradingView.widget({
                    autosize: true,
                    symbol: symbol,
                    interval: interval,
                    timezone: "Etc/UTC",
                    theme: theme, // ✅ Uses the theme prop
                    style: "1",
                    locale: "en",
                    toolbar_bg: theme === "light" ? "#ffffff" : "#1e1e1e", // ✅ ADDED - Dynamic toolbar color
                    enable_publishing: false,
                    allow_symbol_change: true,
                    container_id: chartId,
                    studies: indicators,
                    hide_side_toolbar: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    save_image: true,
                    range: "1D",
                    // ✅ ADDED - Custom overrides for white theme
                    overrides: theme === "light" ? {
                        "paneProperties.background": "#ffffff",
                        "paneProperties.backgroundType": "solid",
                        "paneProperties.vertGridProperties.color": "#e8e8e8",
                        "paneProperties.horzGridProperties.color": "#e8e8e8",
                        "symbolWatermarkProperties.transparency": 90,
                        "scalesProperties.textColor": "#333333",
                        "scalesProperties.backgroundColor": "#ffffff",
                        "mainSeriesProperties.candleStyle.upColor": "#26a69a",
                        "mainSeriesProperties.candleStyle.downColor": "#ef5350",
                        "mainSeriesProperties.candleStyle.drawWick": true,
                        "mainSeriesProperties.candleStyle.drawBorder": true,
                        "mainSeriesProperties.candleStyle.borderColor": "#378658",
                        "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
                        "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
                        "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
                        "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
                        "volumePaneSize": "medium"
                    } : {}
                });
                
                widgetRef.current = widget;
                isCreatingWidget.current = false;
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
    }, [isMounted, chartId, theme]); // ✅ ADDED theme to dependencies for recreation when theme changes

    useEffect(() => {
        if (widgetRef.current && symbol && interval) {
            try {
                widgetRef.current.setSymbol(symbol, interval, () => {
                    console.log('Symbol updated to:', symbol);
                });
            } catch (error) {
                console.warn('Could not update symbol:', error);
            }
        }
    }, [symbol, interval]);

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
                    backgroundColor: theme === "light" ? '#ffffff' : '#1a1a1a', // ✅ ADDED - Dynamic loading background
                    color: theme === "light" ? '#333333' : '#4CAF50', // ✅ ADDED - Dynamic loading text color
                    border: `1px solid ${theme === "light" ? '#e2e8f0' : '#333'}` // ✅ ADDED - Dynamic border
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