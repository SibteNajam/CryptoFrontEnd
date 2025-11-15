'use client';

import React, { useEffect, useMemo } from 'react';
import { useAppSelector } from '../../infrastructure/store/hooks';
import { TradeHistory, TradePair } from '@/infrastructure/features/trades/tradeSlice';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line, Area } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SymbolPnLData {
  symbol: string;
  totalPnL: number;
  pairCount: number;
}

// Helper function to create a pair (same logic as filledOrders)
const createPair = (buys: TradeHistory[], sells: TradeHistory[]): TradePair => {
  let totalBuySize = 0;
  let totalBuyCost = 0;
  
  for (const buy of buys) {
    const size = parseFloat(buy.size || '0');
    const price = parseFloat(buy.price || '0');
    const feeDetail = buy.feeDetail;
    
    let effectiveBuySize = size;
    if (feeDetail && feeDetail.feeCoin !== 'USDT') {
      const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
      effectiveBuySize = size - feeInAsset;
    }
    
    totalBuySize += effectiveBuySize;
    totalBuyCost += size * price;
    
    if (feeDetail && feeDetail.feeCoin === 'USDT') {
      const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
      totalBuyCost += fee;
    }
  }
  
  const avgBuyPrice = totalBuySize > 0 ? totalBuyCost / totalBuySize : 0;
  
  let totalSellSize = 0;
  let totalSellRevenue = 0;
  
  for (const sell of sells) {
    const size = parseFloat(sell.size || '0');
    const price = parseFloat(sell.price || '0');
    totalSellSize += size;
    totalSellRevenue += size * price;
    
    const feeDetail = sell.feeDetail;
    if (feeDetail && feeDetail.feeCoin === 'USDT') {
      const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
      totalSellRevenue -= fee;
    } else if (feeDetail && feeDetail.feeCoin !== 'USDT') {
      const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
      const feeInUSDT = feeInAsset * price;
      totalSellRevenue -= feeInUSDT;
    }
  }
  
  const avgSellPrice = totalSellSize > 0 ? totalSellRevenue / totalSellSize : 0;
  
  let pnl = null;
  let pnlPercent = null;
  
  if (totalBuySize > 0 && totalSellSize > 0 && avgBuyPrice > 0) {
    const effectiveSize = Math.min(totalBuySize, totalSellSize);
    const costBasis = effectiveSize * avgBuyPrice;
    pnl = totalSellRevenue - costBasis;
    pnlPercent = (pnl / costBasis) * 100;
  }
  
  return {
    buys,
    sells,
    pnl,
    pnlPercent,
    avgBuyPrice,
    totalBuySize,
    totalBuyCost,
    avgSellPrice,
    totalSellSize,
    totalSellRevenue
  };
};

export default function PerformanceAnalysis() {
  // Fetch tradeHistory from Redux state
  const { tradeHistory } = useAppSelector(state => state.trades);

  // Console.log tradeHistory when component loads
  useEffect(() => {
    console.log('Performance tab loaded with tradeHistory:', tradeHistory);
  }, [tradeHistory]);

  // Process tradeHistory to group by symbols and create pairs (same logic as filledOrders)
  const processedData = useMemo(() => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return {
        symbolGroups: [],
        allPairs: [],
        winLossData: [],
        topSymbolsData: []
      };
    }

    // Group trades by symbol
    const groupedBySymbol = tradeHistory.reduce((acc, trade) => {
      if (!acc[trade.symbol]) {
        acc[trade.symbol] = [];
      }
      acc[trade.symbol].push(trade);
      return acc;
    }, {} as Record<string, TradeHistory[]>);

    // Sort symbols by most recent trade
    const sortedSymbols = Object.entries(groupedBySymbol).sort(([, tradesA], [, tradesB]) => {
      const mostRecentA = Math.max(...tradesA.map(t => Number(t.cTime)));
      const mostRecentB = Math.max(...tradesB.map(t => Number(t.cTime)));
      return mostRecentB - mostRecentA;
    });

    // Process each symbol to create pairs
    const allPairs: (TradePair & { symbol: string })[] = [];
    const symbolPnLMap: Record<string, SymbolPnLData> = {};

    sortedSymbols.forEach(([symbol, trades]) => {
      // Sort trades by time (oldest first for pairing logic)
      const sortedTrades = [...trades].sort((a, b) => Number(a.cTime) - Number(b.cTime));
      
      const pairs: TradePair[] = [];
      let currentBuyGroup: TradeHistory[] = [];
      let currentSellGroup: TradeHistory[] = [];
      
      // Pairing logic (same as filledOrders)
      for (const trade of sortedTrades) {
        if (trade.side === 'buy') {
          // Complete previous pair if exists
          if (currentBuyGroup.length > 0 && currentSellGroup.length > 0) {
            const pair = createPair(currentBuyGroup, currentSellGroup);
            pairs.push(pair);
            currentBuyGroup = [];
            currentSellGroup = [];
          } else if (currentSellGroup.length > 0) {
            // Unpaired sells
            const pair = createPair([], currentSellGroup);
            pairs.push(pair);
            currentSellGroup = [];
          }
          currentBuyGroup.push(trade);
        } else if (trade.side === 'sell') {
          currentSellGroup.push(trade);
        }
      }
      
      // Handle remaining unpaired groups
      if (currentBuyGroup.length > 0 && currentSellGroup.length > 0) {
        const pair = createPair(currentBuyGroup, currentSellGroup);
        pairs.push(pair);
      } else if (currentBuyGroup.length > 0) {
        const pair = createPair(currentBuyGroup, []);
        pairs.push(pair);
      } else if (currentSellGroup.length > 0) {
        const pair = createPair([], currentSellGroup);
        pairs.push(pair);
      }

      // Store pairs with symbol
      pairs.forEach(pair => {
        allPairs.push({ ...pair, symbol });
      });

      // Calculate total P&L for this symbol
      const totalPnL = pairs.reduce((sum, pair) => {
        return sum + (pair.pnl || 0);
      }, 0);

      symbolPnLMap[symbol] = {
        symbol,
        totalPnL,
        pairCount: pairs.length
      };
    });

    // Calculate win/loss data
    const completedPairs = allPairs.filter(pair => pair.pnl !== null);
    const wins = completedPairs.filter(pair => pair.pnl! > 0).length;
    const losses = completedPairs.filter(pair => pair.pnl! < 0).length;

    const winLossData = [
      { name: 'Wins', value: wins, color: '#10b981' },
      { name: 'Losses', value: losses, color: '#ef4444' }
    ];

    // Get top 10 symbols by total P&L
    const topSymbolsData = Object.values(symbolPnLMap)
      .sort((a, b) => b.totalPnL - a.totalPnL)
      .slice(0, 10)
      .map(item => ({
        symbol: item.symbol,
        pnl: parseFloat(item.totalPnL.toFixed(2))
      }));

    return {
      symbolGroups: sortedSymbols,
      allPairs,
      winLossData,
      topSymbolsData
    };
  }, [tradeHistory]);

  // Custom label for pie chart
  const renderCustomLabel = (entry: any) => {
    return `${entry.name}: ${entry.value}`;
  };

  if (!tradeHistory || tradeHistory.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-card border border-default rounded-lg p-6">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">
            Performance Analysis
          </h2>
          <div className="text-center text-muted py-8">
            <p>No trade data available. Please load filled orders first.</p>
          </div>
        </div>
      </div>
    );
  }

  const { winLossData, topSymbolsData } = processedData;
  const totalTrades = winLossData.reduce((sum, item) => sum + item.value, 0);
  const winRate = totalTrades > 0 ? ((winLossData[0]?.value || 0) / totalTrades * 100).toFixed(1) : '0';

  // Calculate total P&L and stats
  const totalPnL = processedData.allPairs
    .filter(pair => pair.pnl !== null)
    .reduce((sum, pair) => sum + (pair.pnl || 0), 0);

  const avgPnLPerTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;

  // Calculate symbol trade frequency
  const symbolFrequency = useMemo(() => {
    const frequencyMap: Record<string, number> = {};
    
    tradeHistory.forEach(trade => {
      frequencyMap[trade.symbol] = (frequencyMap[trade.symbol] || 0) + 1;
    });
    
    return Object.entries(frequencyMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, count }));
  }, [tradeHistory]);

  // Prepare comprehensive trading performance data
  const comprehensivePerformanceData = useMemo(() => {
    const { allPairs } = processedData;
    
    // Group by date and calculate cumulative metrics
    const dailyStats: Record<string, {
      date: string;
      trades: number;
      wins: number;
      losses: number;
      totalPnL: number;
      avgPnL: number;
      winRate: number;
      cumulativePnL: number;
    }> = {};
    
    let cumulativePnL = 0;
    
    allPairs
      .filter(pair => pair.pnl !== null && pair.sells.length > 0)
      .sort((a, b) => {
        const timeA = Math.max(...a.sells.map(s => Number(s.cTime)));
        const timeB = Math.max(...b.sells.map(s => Number(s.cTime)));
        return timeA - timeB; // Sort chronologically
      })
      .forEach(pair => {
        const sellTime = Math.max(...pair.sells.map(s => Number(s.cTime)));
        const dateKey = new Date(sellTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            date: dateKey,
            trades: 0,
            wins: 0,
            losses: 0,
            totalPnL: 0,
            avgPnL: 0,
            winRate: 0,
            cumulativePnL: 0
          };
        }
        
        const pnl = pair.pnl || 0;
        dailyStats[dateKey].trades += 1;
        dailyStats[dateKey].totalPnL += pnl;
        cumulativePnL += pnl;
        dailyStats[dateKey].cumulativePnL = cumulativePnL;
        
        if (pnl > 0) {
          dailyStats[dateKey].wins += 1;
        } else if (pnl < 0) {
          dailyStats[dateKey].losses += 1;
        }
      });
    
    // Calculate averages and win rates
    const result = Object.values(dailyStats).map(day => ({
      date: day.date,
      trades: day.trades,
      wins: day.wins,
      losses: day.losses,
      totalPnL: parseFloat(day.totalPnL.toFixed(2)),
      avgPnL: parseFloat((day.trades > 0 ? day.totalPnL / day.trades : 0).toFixed(2)),
      winRate: day.trades > 0 ? (day.wins / day.trades) * 100 : 0,
      cumulativePnL: parseFloat(day.cumulativePnL.toFixed(2))
    })).slice(-20); // Last 20 days
    
    // Console log for verification
    console.log('📊 Chart Data Verification:');
    console.log('Total pairs processed:', allPairs.filter(pair => pair.pnl !== null && pair.sells.length > 0).length);
    console.log('Days with data:', result.length);
    console.log('Sample daily data (first 3):', result.slice(0, 3));
    console.log('Final cumulative P&L:', result[result.length - 1]?.cumulativePnL);
    
    return result;
  }, [processedData]);

  // Calculate symbol win rates
  const symbolWinRates = useMemo(() => {
    const { allPairs } = processedData;
    const symbolStats: Record<string, { wins: number; losses: number; total: number; totalPnL: number }> = {};
    
    allPairs
      .filter(pair => pair.pnl !== null)
      .forEach(pair => {
        if (!symbolStats[pair.symbol]) {
          symbolStats[pair.symbol] = { wins: 0, losses: 0, total: 0, totalPnL: 0 };
        }
        
        symbolStats[pair.symbol].total += 1;
        symbolStats[pair.symbol].totalPnL += pair.pnl || 0;
        
        if ((pair.pnl || 0) > 0) {
          symbolStats[pair.symbol].wins += 1;
        } else if ((pair.pnl || 0) < 0) {
          symbolStats[pair.symbol].losses += 1;
        }
      });
    
    return Object.entries(symbolStats)
      .map(([symbol, stats]) => ({
        symbol,
        winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
        trades: stats.total,
        totalPnL: parseFloat(stats.totalPnL.toFixed(2)),
        wins: stats.wins,
        losses: stats.losses
      }))
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 8); // Top 8 most traded symbols
  }, [processedData]);

  return (
    <div className="space-y-4">
      {/* Header Stats - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-default rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Total Trades</p>
          <p className="text-lg font-semibold text-card-foreground">{tradeHistory.length}</p>
        </div>
        <div className="bg-card border border-default rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Completed Pairs</p>
          <p className="text-lg font-semibold text-card-foreground">{totalTrades}</p>
        </div>
        <div className="bg-card border border-default rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Win Rate</p>
          <p className="text-lg font-semibold text-success">{winRate}%</p>
        </div>
        <div className="bg-card border border-default rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Total P&L</p>
          <p className={`text-lg font-semibold ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="bg-card border border-default rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Avg P&L/Trade</p>
          <p className={`text-lg font-semibold ${avgPnLPerTrade >= 0 ? 'text-success' : 'text-danger'}`}>
            {avgPnLPerTrade >= 0 ? '+' : ''}${avgPnLPerTrade.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Top Row Charts - Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Win/Loss Pie Chart - Smaller */}
        <div className="bg-card border border-default rounded-lg p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-2">Win/Loss</h3>
          {totalTrades > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={60}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={24}
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value, entry: any) => (
                      `${value}: ${entry.payload.value} (${((entry.payload.value / totalTrades) * 100).toFixed(0)}%)`
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted text-xs">
              <p>No data</p>
            </div>
          )}
        </div>

        {/* Top 5 Symbols - Smaller */}
        <div className="bg-card border border-default rounded-lg p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-2">Top 5 Symbols P&L</h3>
          {topSymbolsData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSymbolsData.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="symbol" 
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                  />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                    {topSymbolsData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted text-xs">
              <p>No data</p>
            </div>
          )}
        </div>

        {/* Symbol Trade Frequency */}
        <div className="bg-card border border-default rounded-lg p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-2">Most Traded</h3>
          {symbolFrequency.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={symbolFrequency.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="symbol" 
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}
                    formatter={(value: number) => [`${value}`, 'Trades']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted text-xs">
              <p>No data</p>
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Trading Performance Chart - Multi-Metric Analysis */}
      {comprehensivePerformanceData.length > 0 && (
        <div className="bg-card border border-default rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-card-foreground mb-2">
              📊 Comprehensive Trading Performance
            </h3>
            <p className="text-xs text-muted mb-3">
              Track your cumulative profits, daily P&L, and win rate over time
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Cumulative P&L</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                <div className="w-2.5 h-2.5 rounded bg-purple-500"></div>
                <span className="text-purple-600 dark:text-purple-400 font-medium">Daily P&L (Bars)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span className="text-green-600 dark:text-green-400 font-medium">Win Rate %</span>
              </div>
            </div>
          </div>
          
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={comprehensivePerformanceData}
                margin={{ top: 20, right: 50, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  stroke="var(--border)"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  label={{ 
                    value: 'Profit & Loss ($)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fontSize: 12, fill: 'var(--text-card-foreground)', fontWeight: 600 } 
                  }}
                  stroke="var(--border)"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  label={{ 
                    value: 'Win Rate (%)', 
                    angle: 90, 
                    position: 'insideRight', 
                    style: { fontSize: 12, fill: 'var(--text-card-foreground)', fontWeight: 600 } 
                  }}
                  domain={[0, 100]}
                  stroke="var(--border)"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Cumulative P&L') {
                      return [
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          ${value.toFixed(2)}
                        </span>, 
                        '💰 ' + name
                      ];
                    }
                    if (name === 'Daily P&L') {
                      return [
                        <span className={`font-semibold ${value >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${value.toFixed(2)}
                        </span>, 
                        '📊 ' + name
                      ];
                    }
                    if (name === 'Win Rate') {
                      return [
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {value.toFixed(1)}%
                        </span>, 
                        '🎯 ' + name
                      ];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => {
                    const data = comprehensivePerformanceData.find(d => d.date === label);
                    return (
                      <div className="font-semibold text-card-foreground border-b border-default pb-2 mb-2">
                        📅 {label}
                        <div className="text-xs text-muted font-normal mt-1">
                          {data?.trades || 0} trades • {data?.wins || 0} wins • {data?.losses || 0} losses
                        </div>
                      </div>
                    );
                  }}
                />
                
                {/* Area for cumulative P&L trend - Blue gradient */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="cumulativePnL"
                  name="Cumulative P&L"
                  fill="url(#colorCumulative)"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={0.2}
                />
                
                {/* Bars for daily P&L - Purple/Red */}
                <Bar 
                  yAxisId="left"
                  dataKey="totalPnL" 
                  name="Daily P&L"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {comprehensivePerformanceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.totalPnL >= 0 ? '#8b5cf6' : '#ef4444'}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
                
                {/* Line for win rate - Green */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="winRate"
                  name="Win Rate"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Compact stats on right side */}
          <div className="mt-4 flex justify-end">
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎉</span>
                  <div>
                    <p className="text-[10px] text-green-700 dark:text-green-400 font-medium">Best Day</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      +${Math.max(...comprehensivePerformanceData.map(d => d.totalPnL)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📉</span>
                  <div>
                    <p className="text-[10px] text-red-700 dark:text-red-400 font-medium">Worst Day</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      ${Math.min(...comprehensivePerformanceData.map(d => d.totalPnL)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📊</span>
                  <div>
                    <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">Avg Daily</p>
                    <p className={`text-sm font-bold ${
                      (comprehensivePerformanceData.reduce((sum, d) => sum + d.totalPnL, 0) / comprehensivePerformanceData.length) >= 0 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(comprehensivePerformanceData.reduce((sum, d) => sum + d.totalPnL, 0) / comprehensivePerformanceData.length) >= 0 ? '+' : ''}
                      ${(comprehensivePerformanceData.reduce((sum, d) => sum + d.totalPnL, 0) / comprehensivePerformanceData.length).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Symbol Performance Analysis - Win Rate vs P&L */}
      {symbolWinRates.length > 0 && (
        <div className="bg-card border border-default rounded-lg p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-card-foreground mb-2">
              🎯 Symbol Performance Analysis
            </h3>
            <p className="text-xs text-muted mb-3">
              Compare win rates with profitability for each symbol • Higher win rate doesn't always mean higher profit
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                <div className="w-2.5 h-2.5 rounded bg-green-500"></div>
                <span className="text-green-600 dark:text-green-400 font-medium">Total P&L (Bars)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Win Rate % (Line)</span>
              </div>
            </div>
          </div>
          
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={symbolWinRates}
                margin={{ top: 20, right: 50, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis 
                  dataKey="symbol"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  stroke="var(--border)"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  label={{ 
                    value: 'Total Profit & Loss ($)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fontSize: 12, fill: 'var(--text-card-foreground)', fontWeight: 600 } 
                  }}
                  stroke="var(--border)"
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  label={{ 
                    value: 'Win Rate (%)', 
                    angle: 90, 
                    position: 'insideRight', 
                    style: { fontSize: 12, fill: 'var(--text-card-foreground)', fontWeight: 600 } 
                  }}
                  domain={[0, 100]}
                  stroke="var(--border)"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)',
                    border: '2px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Total P&L') {
                      return [
                        <span className={`font-semibold ${value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${value.toFixed(2)}
                        </span>, 
                        '💰 ' + name
                      ];
                    }
                    if (name === 'Win Rate') {
                      return [
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {value.toFixed(1)}%
                        </span>, 
                        '🎯 ' + name
                      ];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => {
                    const data = symbolWinRates.find(d => d.symbol === label);
                    return (
                      <div className="font-semibold text-card-foreground border-b border-default pb-2 mb-2">
                        🪙 {label}
                        <div className="text-xs text-muted font-normal mt-1">
                          {data?.trades || 0} total trades • {data?.wins || 0} wins • {data?.losses || 0} losses
                        </div>
                      </div>
                    );
                  }}
                />
                
                {/* Bars for Total P&L with gradient effect */}
                <Bar 
                  yAxisId="left"
                  dataKey="totalPnL" 
                  name="Total P&L"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                >
                  {symbolWinRates.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.totalPnL >= 0 ? '#10b981' : '#ef4444'}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
                
                {/* Line for Win Rate with prominent styling */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="winRate"
                  name="Win Rate"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Compact symbol insights on right side */}
          <div className="mt-4 flex justify-end">
            <div className="flex flex-wrap gap-3 text-xs">
              {symbolWinRates.length > 0 && (() => {
                const best = symbolWinRates.reduce((max, s) => s.totalPnL > max.totalPnL ? s : max);
                return (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">👑</span>
                      <div>
                        <p className="text-[10px] text-green-700 dark:text-green-400 font-medium">Most Profitable</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          {best.symbol}
                        </p>
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                          +${best.totalPnL.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {symbolWinRates.length > 0 && (() => {
                const bestWR = symbolWinRates.reduce((max, s) => s.winRate > max.winRate ? s : max);
                return (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🎯</span>
                      <div>
                        <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">Best Win Rate</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {bestWR.symbol}
                        </p>
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {bestWR.winRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
