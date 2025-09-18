'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, Calendar } from 'lucide-react';
import { AccountSnapshot } from '../../infrastructure/api/PortfolioApi';

interface PerformanceTabProps {
  accountSnapshot: AccountSnapshot | null;
}

export default function PerformanceTab({ accountSnapshot }: PerformanceTabProps) {
  if (!accountSnapshot || !accountSnapshot.snapshotVos?.length) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading performance data...</p>
      </div>
    );
  }

  const snapshots = accountSnapshot.snapshotVos.sort((a, b) => a.updateTime - b.updateTime);
  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];
  
  // Calculate total portfolio value in USDT
  const getCurrentPortfolioValue = (snapshot: any) => {
    const usdtBalance = snapshot.data.balances.find((b: any) => b.asset === 'USDT');
    const btcBalance = snapshot.data.balances.find((b: any) => b.asset === 'BTC');
    const ethBalance = snapshot.data.balances.find((b: any) => b.asset === 'ETH');
    const bnbBalance = snapshot.data.balances.find((b: any) => b.asset === 'BNB');
    
    const btcPrice = 45000; // Fake price for testnet
    const ethPrice = 2500;
    const bnbPrice = 320;
    
    let total = 0;
    if (usdtBalance) total += parseFloat(usdtBalance.free);
    if (btcBalance) total += parseFloat(btcBalance.free) * btcPrice;
    if (ethBalance) total += parseFloat(ethBalance.free) * ethPrice;
    if (bnbBalance) total += parseFloat(bnbBalance.free) * bnbPrice;
    
    return total;
  };

  const currentValue = getCurrentPortfolioValue(latest);
  const previousValue = previous ? getCurrentPortfolioValue(previous) : currentValue;
  const change = currentValue - previousValue;
  const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate performance metrics
  const getPerformanceMetrics = () => {
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    
    const initialValue = getCurrentPortfolioValue(firstSnapshot);
    const finalValue = getCurrentPortfolioValue(lastSnapshot);
    const totalReturn = finalValue - initialValue;
    const totalReturnPercent = initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;
    
    // Calculate best and worst days
    let bestDay = { value: 0, date: '' };
    let worstDay = { value: 0, date: '' };
    
    for (let i = 1; i < snapshots.length; i++) {
      const currentVal = getCurrentPortfolioValue(snapshots[i]);
      const previousVal = getCurrentPortfolioValue(snapshots[i - 1]);
      const dailyChange = currentVal - previousVal;
      const dailyChangePercent = previousVal > 0 ? (dailyChange / previousVal) * 100 : 0;
      
      if (dailyChangePercent > bestDay.value) {
        bestDay = {
          value: dailyChangePercent,
          date: new Date(snapshots[i].updateTime).toLocaleDateString()
        };
      }
      
      if (dailyChangePercent < worstDay.value) {
        worstDay = {
          value: dailyChangePercent,
          date: new Date(snapshots[i].updateTime).toLocaleDateString()
        };
      }
    }
    
    return {
      totalReturn,
      totalReturnPercent,
      bestDay,
      worstDay,
      daysTracked: snapshots.length
    };
  };

  const metrics = getPerformanceMetrics();

  return (
    <div className="space-y-6">
      {/* Portfolio Value Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Portfolio Performance
          </h3>
          <span className="text-sm text-gray-500">
            Last {metrics.daysTracked} days
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Value */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">Current Portfolio Value</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(currentValue)}</p>
            <div className={`flex items-center justify-center gap-1 mt-2 ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent.toFixed(2)}%)
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">24h change</p>
          </div>

          {/* Total Return */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">Total Return</p>
            <p className={`text-3xl font-bold ${
              metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(metrics.totalReturn)}
            </p>
            <div className={`flex items-center justify-center gap-1 mt-2 ${
              metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.totalReturn >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {metrics.totalReturnPercent.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Since tracking started</p>
          </div>

          {/* Best Day */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">Best Day</p>
            <p className="text-3xl font-bold text-green-600">
              +{metrics.bestDay.value.toFixed(2)}%
            </p>
            <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">{metrics.bestDay.date}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Highest daily gain</p>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Portfolio Value Chart
          </h3>
        </div>

        {/* Simple Line Chart Representation */}
        <div className="relative h-64 bg-gradient-to-t from-blue-50 to-white rounded-lg p-4">
          <div className="flex items-end justify-between h-full">
            {snapshots.map((snapshot, index) => {
              const value = getCurrentPortfolioValue(snapshot);
              const maxValue = Math.max(...snapshots.map(s => getCurrentPortfolioValue(s)));
              const minValue = Math.min(...snapshots.map(s => getCurrentPortfolioValue(s)));
              const height = ((value - minValue) / (maxValue - minValue)) * 100;
              
              return (
                <div
                  key={index}
                  className="flex flex-col items-center group relative"
                  style={{ height: '100%' }}
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {formatCurrency(value)}
                    <div className="text-xs text-gray-300">
                      {new Date(snapshot.updateTime).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Bar */}
                  <div
                    className="w-3 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-colors"
                    style={{ height: `${height}%`, minHeight: '2px' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart Labels */}
        <div className="flex justify-between mt-4 text-xs text-gray-500">
          <span>{new Date(snapshots[0].updateTime).toLocaleDateString()}</span>
          <span>{new Date(snapshots[snapshots.length - 1].updateTime).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Performance */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Best Day</span>
              <span className="text-sm font-medium text-green-600">
                +{metrics.bestDay.value.toFixed(2)}% ({metrics.bestDay.date})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Worst Day</span>
              <span className="text-sm font-medium text-red-600">
                {metrics.worstDay.value.toFixed(2)}% ({metrics.worstDay.date})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Daily Change</span>
              <span className="text-sm font-medium text-gray-900">
                {(metrics.totalReturnPercent / metrics.daysTracked).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Allocation</h3>
          <div className="space-y-3">
            {latest.data.balances.map((balance: any) => {
              const assetPrices: Record<string, number> = {
                BTC: 45000,
                ETH: 2500,
                BNB: 320,
                USDT: 1
              };
              
              const price = assetPrices[balance.asset] || 1;
              const value = parseFloat(balance.free) * price;
              const percentage = (value / currentValue) * 100;
              
              if (percentage < 1) return null;
              
              return (
                <div key={balance.asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {balance.asset.slice(0, 1)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{balance.asset}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}