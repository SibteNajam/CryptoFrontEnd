"use client";

import React, { useState, useEffect } from 'react';

interface DVOLData {
    dvol_value: number;
    expected_daily_move: string;
    timestamp: number;
    volatility_level: 'Low' | 'Medium' | 'High' | 'Extreme';
}

const DVOLDashboard: React.FC = () => {
    const [bitcoinDVOL, setBitcoinDVOL] = useState<DVOLData | null>(null);
    const [ethereumDVOL, setEthereumDVOL] = useState<DVOLData | null>(null);
    const [loading, setLoading] = useState(true);

    const getVolatilityLevel = (dvol: number): DVOLData['volatility_level'] => {
        if (dvol < 50) return 'Low';
        if (dvol < 80) return 'Medium';  
        if (dvol < 120) return 'High';
        return 'Extreme';
    };

    const fetchDVOL = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/deribit-dvol');
            const data = await response.json();
            
            if (data.bitcoin) {
                setBitcoinDVOL({
                    ...data.bitcoin,
                    volatility_level: getVolatilityLevel(data.bitcoin.dvol_value)
                });
            }
            
            if (data.ethereum) {
                setEthereumDVOL({
                    ...data.ethereum,
                    volatility_level: getVolatilityLevel(data.ethereum.dvol_value)
                });
            }
        } catch (error) {
            console.error('Error fetching DVOL:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDVOL();
        const interval = setInterval(fetchDVOL, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const DVOLCard = ({ title, data, symbol }: { 
        title: string; 
        data: DVOLData | null; 
        symbol: string;
    }) => (
        <div className="dvol-card">
            <div className="card-header">
                <h3>{symbol} {title}</h3>
                <div className={`volatility-badge ${data?.volatility_level.toLowerCase()}`}>
                    {data?.volatility_level} Volatility
                </div>
            </div>
            
            {data ? (
                <div className="card-content">
                    <div className="dvol-value">
                        {data.dvol_value.toFixed(2)}
                    </div>
                    <div className="expected-move">
                        Expected Daily Move: <strong>{data.expected_daily_move}</strong>
                    </div>
                    <div className="timestamp">
                        Updated: {new Date(data.timestamp).toLocaleTimeString()}
                    </div>
                    
                    {/* Interpretation */}
                    <div className="interpretation">
                        {data.volatility_level === 'Low' && '📊 Market expects calm trading'}
                        {data.volatility_level === 'Medium' && '⚡ Normal volatility expected'}
                        {data.volatility_level === 'High' && '🔥 High volatility expected'}
                        {data.volatility_level === 'Extreme' && '💥 Extreme volatility expected'}
                    </div>
                </div>
            ) : (
                <div className="loading">Loading...</div>
            )}
        </div>
    );

    return (
        <div className="dvol-dashboard">
            <div className="dashboard-header">
                <h1>📈 DVOL - Crypto Volatility Index</h1>
                <p>30-day forward-looking implied volatility based on options data</p>
                <button onClick={fetchDVOL} disabled={loading}>
                    🔄 {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            <div className="cards-container">
                <DVOLCard 
                    title="DVOL Index" 
                    data={bitcoinDVOL} 
                    symbol="₿" 
                />
                <DVOLCard 
                    title="DVOL Index" 
                    data={ethereumDVOL} 
                    symbol="⟠" 
                />
            </div>

            <div className="info-section">
                <h3>📚 How to Use DVOL:</h3>
                <ul>
                    <li><strong>Low DVOL (&lt;50):</strong> Market expects stable prices</li>
                    <li><strong>Medium DVOL (50-80):</strong> Normal volatility expected</li>
                    <li><strong>High DVOL (80-120):</strong> Big moves expected</li>
                    <li><strong>Extreme DVOL (&gt;120):</strong> Very large moves expected</li>
                </ul>
                
                <div className="formula">
                    <strong>Quick Formula:</strong> Expected Daily Move ≈ DVOL ÷ 20
                </div>
            </div>
        </div>
    );
};

export default DVOLDashboard;