// components/portfolio/performance.tsx
'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { AccountSnapshotResponse } from '../../infrastructure/api/PortfolioApi';

interface PerformanceTabProps {
  snapshotData: AccountSnapshotResponse | null;
}

export default function PerformanceTab({ snapshotData }: PerformanceTabProps) {
  if (!snapshotData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-pulse bg-muted rounded-full h-12 w-12 mx-auto"></div>
          <p className="text-muted">Loading performance data...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data (reverse for oldest to newest, filter tiny values)
  const chartData = useMemo(() => {
    if (!snapshotData.snapshots.length) return [];
    
    return [...snapshotData.snapshots]
      .reverse()
      .filter(snapshot => snapshot.totalValueUSD > 0.01) // Filter out $0.00225
      .map(snapshot => ({
        date: snapshot.date,
        value: snapshot.totalValueUSD,
      }));
  }, [snapshotData]);

  // Performance metrics
  const metrics = useMemo(() => {
    const performance = snapshotData.performance;
    
    return {
      totalReturn: parseFloat(performance.totalReturn),
      rawTotalReturn: parseFloat(performance.rawTotalReturn),
      avgDailyReturn: parseFloat(performance.avgDailyReturn),
      currentValue: snapshotData.currentValue,
      days: performance.days,
      meaningfulInitialValue: snapshotData.meaningfulInitialValue,
    };
  }, [snapshotData]);

  // Top assets with proper USD values
  const topAssets = useMemo(() => {
    if (!snapshotData.summary.topAssets.length) return [];
    
    return snapshotData.summary.topAssets
      .map((asset: any) => ({
        asset: asset.asset,
        value: parseFloat(asset.value),
        percentage: parseFloat(asset.percentage),
      }))
      .filter(asset => asset.value > 0);
  }, [snapshotData]);

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-default rounded-lg p-4">
          <p className="text-sm text-muted mb-1">Portfolio Value</p>
          <p className="text-xl font-medium text-card-foreground">
            ${metrics.currentValue.toFixed(2)}
          </p>
          <p className="text-xs text-muted mt-1">As of {snapshotData.snapshots[0]?.date}</p>
        </div>
        
        <div className="bg-card border border-default rounded-lg p-4">
          <p className="text-sm text-muted mb-1">Total Growth</p>
          <p className={`text-xl font-medium ${
            metrics.totalReturn >= 0 ? 'text-success' : 'text-danger'
          }`}>
            {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(1)}%
          </p>
          <p className="text-xs text-muted mt-1">
            From ${metrics.meaningfulInitialValue.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-card border border-default rounded-lg p-4">
          <p className="text-sm text-muted mb-1">Tracking Period</p>
          <p className="text-xl font-medium text-card-foreground">
            {metrics.days} days
          </p>
          <p className="text-xs text-muted mt-1">{chartData.length} data points</p>
        </div>
      </div>

      {/* Portfolio Value Chart */}
      <div className="bg-card border border-default rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-medium text-card-foreground">Portfolio Value Over Time</p>
          <span className="text-xs text-muted">
            ${metrics.currentValue.toFixed(2)} • {chartData.length} days
          </span>
        </div>
        
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(value: string | number) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                domain={['dataMin * 0.95', 'dataMax * 1.05']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio Value']}
                labelFormatter={(label: string | number) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="var(--primary)" 
                strokeWidth={2}
                dot={{
                  fill: 'var(--primary)',
                  strokeWidth: 1,
                  r: 3
                }}
                activeDot={{ 
                  r: 5, 
                  strokeWidth: 2, 
                  stroke: 'var(--primary)',
                  fill: 'var(--primary)',
                  fillOpacity: 0.8
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : chartData.length === 1 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Current Portfolio Value</p>
              <p className="text-3xl font-semibold text-primary">
                ${metrics.currentValue.toFixed(2)}
              </p>
            </div>
            <div className="bg-muted px-4 py-3 rounded-lg max-w-md">
              <p className="text-xs text-muted-foreground">
                Historical performance data is not available yet. The chart will populate as daily snapshots are collected over time.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted">
            <p>Not enough data for chart (need 2+ days)</p>
          </div>
        )}
      </div>

      {/* Current Allocation */}
      {topAssets.length > 0 && (
        <div className="bg-card border border-default rounded-lg p-4">
          <p className="text-sm font-medium text-card-foreground mb-4">Current Portfolio Allocation</p>
          <div className="space-y-3">
            {topAssets.map((asset, index) => (
              <div key={index} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">{asset.asset}</span>
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{asset.asset}</p>
                    <p className="text-xs text-muted">
                      Value: ${asset.value.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    asset.percentage > 50 ? 'text-warning' : 'text-card-foreground'
                  }`}>
                    {asset.percentage}%
                  </p>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-default text-xs text-muted text-center">
              Total: 100% • {topAssets.length} assets
            </div>
          </div>
        </div>
      )}
    </div>
  );
}