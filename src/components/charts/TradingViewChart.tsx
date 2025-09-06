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
    enableTrading?: boolean; // ✅ NEW - Enable trading features
    onOrderPlace?: (orderData: any) => void; // ✅ NEW - Order callback
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
    symbol = "BINANCE:BTCUSDT",
    interval = "5",
    theme = "light",
    height = "500px",
    width = "100%",
    indicators = [],
    enableTrading = true, // ✅ NEW - Enable by default
    onOrderPlace
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);
    const [chartId, setChartId] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);
    const isCreatingWidget = useRef(false);

    useEffect(() => {
        setChartId(`tradingview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        setIsMounted(true);
    }, [theme]);

    useEffect(() => {
        if (!isMounted || !chartId || isCreatingWidget.current) return;

        if (widgetRef.current) {
            try {
                widgetRef.current.remove();
            } catch (e) {
                console.warn('Error removing widget:', e);
            }
            widgetRef.current = null;
        }

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
                    enabled_features: [
                        "study_templates",
                        "side_toolbar_in_fullscreen_mode",
                        "header_in_fullscreen_mode",
                        "create_volume_indicator_by_default",

                        // ✅ ADD THESE for Long/Short tools:
                        "trading_orders",           // Order placement
                        "trading_positions",        // Position tracking  
                        "trading_account_manager",  // Account management
                        "order_panel",             // Order entry panel
                        "dom_widget",              // Depth of market
                        "position_trading_manager", // ✅ Position management
                        "show_chart_property_page", // Chart properties
                        "chart_crosshair_menu",    // Right-click menu orders

                        // ✅ DRAWING TOOLS for positions:
                        "left_toolbar",            // Enable left toolbar
                        "header_widget",           // Header widgets
                        "timeframes_toolbar",      // Timeframe selection
                    ],
                    drawings_access: {
                        type: "black",
                        tools: [
                            { name: "LineToolTrendLine" },
                            { name: "LineToolRectangle" },
                            { name: "LineToolCircle" },
                            { name: "LineToolLongPosition" },  // ✅ Long position tool
                            { name: "LineToolShortPosition" }, // ✅ Short position tool
                        ]
                    },
                    autosize: true,
                    symbol: symbol,
                    interval: interval,
                    timezone: "Etc/UTC",
                    theme: theme,
                    style: "1",
                    locale: "en",
                    toolbar_bg: theme === "light" ? "#ffffff" : "#1e1e1e",
                    enable_publishing: false,
                    allow_symbol_change: true,
                    container_id: chartId,
                    studies: indicators,
                    hide_side_toolbar: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    save_image: true,
                    range: "1D",

                    // ✅ NEW - Enable trading features
                    ...(enableTrading && {

                        // Trading-specific settings
                        trading_enabled: true,
                        show_order_panel: true,
                        show_positions: true,
                        show_orders: true,
                        show_executions: true,

                        // Custom trading controller
                        trading_controller: {
                            // ✅ Handle order placement
                            placeOrder: (order: any) => {
                                console.log('Order placement requested:', order);
                                if (onOrderPlace) {
                                    onOrderPlace(order);
                                }
                                return Promise.resolve();
                            },

                            // ✅ Handle order modification
                            modifyOrder: (order: any) => {
                                console.log('Order modification requested:', order);
                                return Promise.resolve();
                            },

                            // ✅ Handle order cancellation
                            cancelOrder: (orderId: string) => {
                                console.log('Order cancellation requested:', orderId);
                                return Promise.resolve();
                            }
                        }
                    }),

                    overrides: theme === "light" ? {
                        "paneProperties.background": "#ffffff",
                        "paneProperties.backgroundType": "solid",
                        "paneProperties.vertGridProperties.color": "#f0f0f0",
                        "paneProperties.horzGridProperties.color": "#f0f0f0",
                        "symbolWatermarkProperties.transparency": 90,
                        "scalesProperties.textColor": "#333333",
                        "scalesProperties.backgroundColor": "#ffffff",
                        "scalesProperties.lineColor": "#e0e0e0",
                        "mainSeriesProperties.candleStyle.upColor": "#4caf50",
                        "mainSeriesProperties.candleStyle.downColor": "#f44336",
                        "mainSeriesProperties.candleStyle.drawWick": true,
                        "mainSeriesProperties.candleStyle.drawBorder": true,
                        "mainSeriesProperties.candleStyle.borderUpColor": "#4caf50",
                        "mainSeriesProperties.candleStyle.borderDownColor": "#f44336",
                        "mainSeriesProperties.candleStyle.wickUpColor": "#4caf50",
                        "mainSeriesProperties.candleStyle.wickDownColor": "#f44336"
                    } : {}
                });

                // ✅ NEW - Set up trading event listeners
                if (enableTrading) {
                    widget.onChartReady(() => {
                        console.log('Chart ready - trading features enabled');

                        // Access the trading terminal
                        const tradingTerminal = widget.tradingTerminal();

                        if (tradingTerminal) {
                            // Listen for order events
                            tradingTerminal.onOrderPlaced((order: any) => {
                                console.log('Order placed via chart:', order);
                                if (onOrderPlace) {
                                    onOrderPlace(order);
                                }
                            });
                        }
                    });
                }

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
    }, [isMounted, chartId, enableTrading]);

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
                    backgroundColor: theme === "light" ? '#ffffff' : '#1a1a1a',
                    color: theme === "light" ? '#333333' : '#4CAF50',
                    border: `1px solid ${theme === "light" ? '#e2e8f0' : '#333'}`
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