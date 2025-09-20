'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, Calendar } from 'lucide-react';
import { AccountSnapshot } from '../../infrastructure/api/PortfolioApi';

interface PerformanceTabProps {
  accountSnapshot: AccountSnapshot | null;
}

// --- helper: normalize balances from different snapshot types ---
const extractBalances = (snapshot: any) => {
  if (!snapshot) return [];

  switch (snapshot.type) {
    case 'spot':
      return snapshot.data.balances?.map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
      })) || [];

    case 'margin':
      return snapshot.data.userAssets?.map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.free),
      })) || [];

    case 'futures':
      return snapshot.data.assets?.map((b: any) => ({
        asset: b.asset,
        free: parseFloat(b.walletBalance), // walletBalance is like free balance
      })) || [];

    default:
      return [];
  }
};

// --- helper: prices (placeholder) ---
const assetPrices: Record<string, number> = {
  BTC: 45000,
  ETH: 2500,
  BNB: 320,
  USDT: 1,
  XRP: 0.5,
};

const getAssetPrice = (asset: string) => assetPrices[asset] || 1;

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

  // Calculate total portfolio value
  const getCurrentPortfolioValue = (snapshot: any) => {
    const balances = extractBalances(snapshot);
    return balances.reduce((acc: number, b: { free: number; asset: string; }) => {
      return acc + b.free * getAssetPrice(b.asset);
    }, 0);
  };

  const currentValue = getCurrentPortfolioValue(latest);
  const previousValue = previous ? getCurrentPortfolioValue(previous) : currentValue;
  const change = currentValue - previousValue;
  const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Performance metrics
  const getPerformanceMetrics = () => {
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];

    const initialValue = getCurrentPortfolioValue(firstSnapshot);
    const finalValue = getCurrentPortfolioValue(lastSnapshot);
    const totalReturn = finalValue - initialValue;
    const totalReturnPercent = initialValue > 0 ? (totalReturn / initialValue) * 100 : 0;

    let bestDay = { value: -Infinity, date: '' };
    let worstDay = { value: Infinity, date: '' };

    for (let i = 1; i < snapshots.length; i++) {
      const curr = getCurrentPortfolioValue(snapshots[i]);
      const prev = getCurrentPortfolioValue(snapshots[i - 1]);
      const dailyChangePercent = prev > 0 ? ((curr - prev) / prev) * 100 : 0;

      if (dailyChangePercent > bestDay.value) {
        bestDay = { value: dailyChangePercent, date: new Date(snapshots[i].updateTime).toLocaleDateString() };
      }
      if (dailyChangePercent < worstDay.value) {
        worstDay = { value: dailyChangePercent, date: new Date(snapshots[i].updateTime).toLocaleDateString() };
      }
    }

    return { totalReturn, totalReturnPercent, bestDay, worstDay, daysTracked: snapshots.length };
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
          <span className="text-sm text-gray-500">Last {metrics.daysTracked} days</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Value */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">Current Portfolio Value</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(currentValue)}</p>
            <div
              className={`flex items-center justify-center gap-1 mt-2 ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {change >= 0 ? '+' : ''}
                {formatCurrency(change)} ({changePercent.toFixed(2)}%)
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">24h change</p>
          </div>

          {/* Total Return */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">Total Return</p>
            <p
              className={`text-3xl font-bold ${
                metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(metrics.totalReturn)}
            </p>
            <div
              className={`flex items-center justify-center gap-1 mt-2 ${
                metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {metrics.totalReturn >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">{metrics.totalReturnPercent.toFixed(2)}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Since tracking started</p>
          </div>

          {/* Best Day */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-1">Best Day</p>
            <p className="text-3xl font-bold text-green-600">+{metrics.bestDay.value.toFixed(2)}%</p>
            <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">{metrics.bestDay.date}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Highest daily gain</p>
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Allocation</h3>
        <div className="space-y-3">
          {extractBalances(latest).map((balance: any) => {
            const price = getAssetPrice(balance.asset);
            const value = balance.free * price;
            const percentage = (value / currentValue) * 100;
            if (percentage < 1) return null;

            return (
              <div key={balance.asset} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">{balance.asset.slice(0, 1)}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{balance.asset}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">{formatCurrency(value)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
