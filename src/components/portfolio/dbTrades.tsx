'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RefreshCw, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, 
  AlertCircle, Target, Shield, Activity, BarChart3, PieChart as PieChartIcon,
  Calendar, ChevronDown, ChevronUp, Wallet, DollarSign, Percent
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Area, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart,
  ReferenceLine
} from 'recharts';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface EntryOrder {
  orderId: number;
  symbol: string;
  exchange: string;
  side: string;
  type: string;
  quantity: number;
  executedQty: number;
  price: number;
  status: string;
  filledAt: string | null;
  createdAt: string;
}

interface ExitOrder {
  orderId: number;
  role: string;
  type: string;
  quantity: number;
  executedQty: number;
  price: number;
  status: string;
  filledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PnL {
  realized: number;
  unrealized: number;
  total: number;
  realizedPercent: number;
  unrealizedPercent: number;
  totalPercent: number;
  entryCost: number;
  realizedQty: number;
  unrealizedQty: number;
  currentMarketPrice: number | null;
  isComplete: boolean;
}

interface Trade {
  tradeId: string;
  entryOrder: EntryOrder;
  exitOrders: ExitOrder[];
  pnl: PnL;
}

interface Summary {
  totalTrades: number;
  completedTrades: number;
  activeTrades: number;
  totalRealizedPnl: number;
  totalUnrealizedPnl: number;
  totalPnl: number;
}

interface TradesResponse {
  status: string;
  data: {
    trades: Trade[];
    summary: Summary;
  };
  statusCode: number;
  message: string;
}

// Chart data interfaces
interface EquityCurvePoint {
  date: string;
  timestamp: number;
  pnl: number;
  cumulative: number;
}

interface DailyPnLData {
  date: string;
  pnl: number;
  trades: number;
}

interface SymbolPerformance {
  symbol: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface HeatmapDay {
  date: string;
  pnl: number;
  trades: number;
  week: number;
  dayOfWeek: number;
}

// ============================================
// API FUNCTION
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://146.59.93.94:3000';

async function fetchTrades(exchange?: string, symbol?: string): Promise<TradesResponse> {
  const params = new URLSearchParams();
  if (exchange) params.append('exchange', exchange.toUpperCase());
  if (symbol) params.append('symbol', symbol);
  
  const url = `${API_BASE_URL}/exchanges/trades${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// ============================================
// CHART COLORS
// ============================================

const CHART_COLORS = {
  green: '#0ecb81',
  red: '#f6465d',
  blue: '#609dff',
  purple: '#a855f7',
  orange: '#f59e0b',
  cyan: '#06b6d4',
  gray: '#848e9c',
};

const PIE_COLORS = ['#0ecb81', '#f6465d', '#609dff', '#f59e0b', '#a855f7', '#06b6d4'];

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatPrice = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  if (Math.abs(value) >= 1) {
    return value.toFixed(2);
  }
  return value.toFixed(6);
};

const formatAmount = (value: number | null | undefined, decimals = 4): string => {
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals);
};

const formatPnL = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}$${value.toFixed(4)}`;
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
};

const getStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'FILLED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'NEW':
    case 'PARTIALLY_FILLED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'CANCELED':
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
};

const getRoleIcon = (role: string) => {
  if (role.startsWith('TP')) {
    return <Target className="w-3 h-3 text-green-500" />;
  }
  if (role === 'SL') {
    return <Shield className="w-3 h-3 text-red-500" />;
  }
  return null;
};

const getRoleBadgeColor = (role: string): string => {
  if (role.startsWith('TP')) {
    return 'bg-success/20 text-success';
  }
  if (role === 'SL') {
    return 'bg-danger/20 text-danger';
  }
  return 'bg-muted text-muted-foreground';
};

// ============================================
// CUSTOM TOOLTIP COMPONENT
// ============================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-card-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? `$${entry.value.toFixed(2)}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================
// MAIN COMPONENT
// ============================================

interface DbTradesTabProps {
  selectedExchange?: string;
}

type ViewMode = 'overview' | 'trades';
type TimeRange = 'all' | '7d' | '30d' | '90d';

export default function DbTradesTab({ selectedExchange }: DbTradesTabProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const loadTrades = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchTrades(selectedExchange);
      
      if (response.status === 'Success') {
        setTrades(response.data.trades);
        setSummary(response.data.summary);
        setLastUpdate(new Date());
      } else {
        setError(response.message || 'Failed to fetch trades');
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trades');
    } finally {
      setLoading(false);
    }
  }, [selectedExchange]);

  // Initial load
  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTrades();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadTrades]);

  // Filter trades by time range
  const filteredByTimeRange = useMemo(() => {
    if (timeRange === 'all') return trades;
    
    const now = Date.now();
    const ranges: Record<TimeRange, number> = {
      'all': 0,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    
    return trades.filter(trade => {
      const tradeDate = new Date(trade.entryOrder.createdAt).getTime();
      return now - tradeDate <= ranges[timeRange];
    });
  }, [trades, timeRange]);

  // Process chart data
  const chartData = useMemo(() => {
    const completedTrades = filteredByTimeRange
      .filter(t => t.pnl.isComplete)
      .sort((a, b) => new Date(a.entryOrder.createdAt).getTime() - new Date(b.entryOrder.createdAt).getTime());

    // Equity Curve
    let cumulative = 0;
    const equityCurve: EquityCurvePoint[] = completedTrades.map(trade => {
      cumulative += trade.pnl.realized;
      const date = new Date(trade.entryOrder.filledAt || trade.entryOrder.createdAt);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: date.getTime(),
        pnl: trade.pnl.realized,
        cumulative,
      };
    });

    // Daily PnL
    const dailyMap = new Map<string, { pnl: number; trades: number }>();
    completedTrades.forEach(trade => {
      const date = new Date(trade.entryOrder.filledAt || trade.entryOrder.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = dailyMap.get(date) || { pnl: 0, trades: 0 };
      dailyMap.set(date, { pnl: existing.pnl + trade.pnl.realized, trades: existing.trades + 1 });
    });
    const dailyPnL: DailyPnLData[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      pnl: data.pnl,
      trades: data.trades,
    }));

    // Weekly PnL
    const weeklyMap = new Map<string, { pnl: number; trades: number }>();
    completedTrades.forEach(trade => {
      const date = new Date(trade.entryOrder.filledAt || trade.entryOrder.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = weeklyMap.get(weekKey) || { pnl: 0, trades: 0 };
      weeklyMap.set(weekKey, { pnl: existing.pnl + trade.pnl.realized, trades: existing.trades + 1 });
    });
    const weeklyPnL = Array.from(weeklyMap.entries()).map(([date, data]) => ({
      date: `W ${date}`,
      pnl: data.pnl,
      trades: data.trades,
    }));

    // Monthly PnL
    const monthlyMap = new Map<string, { pnl: number; trades: number }>();
    completedTrades.forEach(trade => {
      const date = new Date(trade.entryOrder.filledAt || trade.entryOrder.createdAt);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const existing = monthlyMap.get(monthKey) || { pnl: 0, trades: 0 };
      monthlyMap.set(monthKey, { pnl: existing.pnl + trade.pnl.realized, trades: existing.trades + 1 });
    });
    const monthlyPnL = Array.from(monthlyMap.entries()).map(([date, data]) => ({
      date,
      pnl: data.pnl,
      trades: data.trades,
    }));

    // Symbol Performance
    const symbolMap = new Map<string, { pnl: number; wins: number; losses: number }>();
    completedTrades.forEach(trade => {
      const symbol = trade.entryOrder.symbol;
      const existing = symbolMap.get(symbol) || { pnl: 0, wins: 0, losses: 0 };
      symbolMap.set(symbol, {
        pnl: existing.pnl + trade.pnl.realized,
        wins: existing.wins + (trade.pnl.realized >= 0 ? 1 : 0),
        losses: existing.losses + (trade.pnl.realized < 0 ? 1 : 0),
      });
    });
    const symbolPerformance: SymbolPerformance[] = Array.from(symbolMap.entries())
      .map(([symbol, data]) => ({
        symbol: symbol.replace('USDT', ''),
        pnl: data.pnl,
        trades: data.wins + data.losses,
        winRate: data.wins / (data.wins + data.losses) * 100,
      }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 10);

    // Win/Loss Distribution
    const wins = completedTrades.filter(t => t.pnl.realized >= 0).length;
    const losses = completedTrades.filter(t => t.pnl.realized < 0).length;
    const winLossData = [
      { name: 'Wins', value: wins, color: CHART_COLORS.green },
      { name: 'Losses', value: losses, color: CHART_COLORS.red },
    ];

    // Win Rate
    const winRate = completedTrades.length > 0 ? (wins / completedTrades.length) * 100 : 0;

    // Average Win/Loss
    const avgWin = wins > 0 ? completedTrades.filter(t => t.pnl.realized >= 0).reduce((sum, t) => sum + t.pnl.realized, 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(completedTrades.filter(t => t.pnl.realized < 0).reduce((sum, t) => sum + t.pnl.realized, 0) / losses) : 0;

    // Profit Factor
    const grossProfit = completedTrades.filter(t => t.pnl.realized > 0).reduce((sum, t) => sum + t.pnl.realized, 0);
    const grossLoss = Math.abs(completedTrades.filter(t => t.pnl.realized < 0).reduce((sum, t) => sum + t.pnl.realized, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Heatmap Data (last 12 weeks)
    const heatmapData: HeatmapDay[] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 84); // 12 weeks

    for (let i = 0; i <= 84; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayTrades = completedTrades.filter(t => {
        const tradeDate = new Date(t.entryOrder.filledAt || t.entryOrder.createdAt).toISOString().split('T')[0];
        return tradeDate === dateStr;
      });
      heatmapData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pnl: dayTrades.reduce((sum, t) => sum + t.pnl.realized, 0),
        trades: dayTrades.length,
        week: Math.floor(i / 7),
        dayOfWeek: date.getDay(),
      });
    }

    return {
      equityCurve,
      dailyPnL,
      weeklyPnL,
      monthlyPnL,
      symbolPerformance,
      winLossData,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      heatmapData,
    };
  }, [filteredByTimeRange]);

  const toggleTradeExpansion = (tradeId: string) => {
    setExpandedTrades(prev => {
      const next = new Set(prev);
      if (next.has(tradeId)) {
        next.delete(tradeId);
      } else {
        next.add(tradeId);
      }
      return next;
    });
  };

  const filteredTrades = filteredByTimeRange.filter(trade => {
    if (filter === 'active') return !trade.pnl.isComplete;
    if (filter === 'completed') return trade.pnl.isComplete;
    return true;
  });

  // Sort by most recent first
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    const dateA = new Date(a.entryOrder.createdAt).getTime();
    const dateB = new Date(b.entryOrder.createdAt).getTime();
    return dateB - dateA;
  });

  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trades from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'overview'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setViewMode('trades')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'trades'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Trades
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg">
            {(['all', '7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-muted text-card-foreground'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadTrades}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg">
          <p className="text-sm text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard
            label="Total Trades"
            value={summary.totalTrades}
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard
            label="Active"
            value={summary.activeTrades}
            icon={<Clock className="w-5 h-5" />}
            variant="info"
          />
          <StatCard
            label="Completed"
            value={summary.completedTrades}
            icon={<CheckCircle className="w-5 h-5" />}
          />
          <StatCard
            label="Win Rate"
            value={`${chartData.winRate.toFixed(1)}%`}
            icon={<Percent className="w-5 h-5" />}
            variant={chartData.winRate >= 50 ? 'success' : 'danger'}
          />
          <StatCard
            label="Realized PnL"
            value={formatPnL(summary.totalRealizedPnl)}
            icon={<DollarSign className="w-5 h-5" />}
            variant={summary.totalRealizedPnl >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="Unrealized PnL"
            value={formatPnL(summary.totalUnrealizedPnl)}
            icon={<TrendingUp className="w-5 h-5" />}
            variant={summary.totalUnrealizedPnl >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="Total PnL"
            value={formatPnL(summary.totalPnl)}
            icon={<Wallet className="w-5 h-5" />}
            variant={summary.totalPnl >= 0 ? 'success' : 'danger'}
            highlighted
          />
        </div>
      )}

      {viewMode === 'overview' ? (
        <AnalyticsView chartData={chartData} />
      ) : (
        <TradesView
          trades={sortedTrades}
          filter={filter}
          setFilter={setFilter}
          expandedTrades={expandedTrades}
          toggleTradeExpansion={toggleTradeExpansion}
          summary={summary}
        />
      )}

      {/* Live indicator */}
      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
        Live updates every 5 seconds
      </div>
    </div>
  );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'info';
  highlighted?: boolean;
}

function StatCard({ label, value, icon, variant = 'default', highlighted }: StatCardProps) {
  const variantStyles = {
    default: 'text-card-foreground',
    success: 'text-success',
    danger: 'text-danger',
    info: 'text-info',
  };

  return (
    <div className={`bg-card border border-border rounded-xl p-4 transition-all hover:border-border-light ${
      highlighted ? 'ring-2 ring-primary/20' : ''
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={`text-xl font-bold ${variantStyles[variant]}`}>{value}</p>
    </div>
  );
}

// ============================================
// ANALYTICS VIEW COMPONENT
// ============================================

interface AnalyticsViewProps {
  chartData: {
    equityCurve: EquityCurvePoint[];
    dailyPnL: DailyPnLData[];
    weeklyPnL: DailyPnLData[];
    monthlyPnL: DailyPnLData[];
    symbolPerformance: SymbolPerformance[];
    winLossData: { name: string; value: number; color: string }[];
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    heatmapData: HeatmapDay[];
  };
}

function AnalyticsView({ chartData }: AnalyticsViewProps) {
  const [pnlPeriod, setPnlPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const pnlData = pnlPeriod === 'daily' 
    ? chartData.dailyPnL 
    : pnlPeriod === 'weekly' 
    ? chartData.weeklyPnL 
    : chartData.monthlyPnL;

  return (
    <div className="space-y-6">
      {/* Row 1: Equity Curve & Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Equity Curve
          </h3>
          {chartData.equityCurve.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.equityCurve}>
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Area 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke={CHART_COLORS.green} 
                    fill="url(#equityGradient)"
                    name="Cumulative PnL"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke={CHART_COLORS.green} 
                    strokeWidth={2}
                    dot={false}
                    name="Cumulative PnL"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No completed trades yet" />
          )}
        </div>

        {/* Win/Loss & Stats */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-info" />
            Win/Loss Ratio
          </h3>
          {chartData.winLossData[0].value + chartData.winLossData[1].value > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className={`font-semibold ${chartData.winRate >= 50 ? 'text-success' : 'text-danger'}`}>
                    {chartData.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Win</span>
                  <span className="font-semibold text-success">${chartData.avgWin.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Loss</span>
                  <span className="font-semibold text-danger">${chartData.avgLoss.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profit Factor</span>
                  <span className={`font-semibold ${chartData.profitFactor >= 1 ? 'text-success' : 'text-danger'}`}>
                    {chartData.profitFactor === Infinity ? '∞' : chartData.profitFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <EmptyChart message="No trades to analyze" />
          )}
        </div>
      </div>

      {/* Row 2: PnL by Period & Symbol Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PnL by Period */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              PnL by Period
            </h3>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setPnlPeriod(period)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    pnlPeriod === period
                      ? 'bg-card text-card-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-card-foreground'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {pnlData.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar 
                    dataKey="pnl" 
                    name="PnL"
                    radius={[4, 4, 0, 0]}
                  >
                    {pnlData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.pnl >= 0 ? CHART_COLORS.green : CHART_COLORS.red} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No PnL data available" />
          )}
        </div>

        {/* Symbol Performance */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Top Symbols by PnL
          </h3>
          {chartData.symbolPerformance.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.symbolPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="symbol" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={0} stroke="var(--border)" />
                  <Bar dataKey="pnl" name="PnL" radius={[0, 4, 4, 0]}>
                    {chartData.symbolPerformance.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.pnl >= 0 ? CHART_COLORS.green : CHART_COLORS.red} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No symbol data available" />
          )}
        </div>
      </div>

      {/* Row 3: Heatmap */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-500" />
          Trading Activity Heatmap (Last 12 Weeks)
        </h3>
        <div className="overflow-x-auto">
          <PnLHeatmap data={chartData.heatmapData} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PNL HEATMAP COMPONENT
// ============================================

function PnLHeatmap({ data }: { data: HeatmapDay[] }) {
  const weeks = Array.from({ length: 12 }, (_, i) => i);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getColor = (pnl: number, trades: number) => {
    if (trades === 0) return 'bg-muted';
    if (pnl > 10) return 'bg-green-500';
    if (pnl > 0) return 'bg-green-400/70';
    if (pnl === 0) return 'bg-muted';
    if (pnl > -10) return 'bg-red-400/70';
    return 'bg-red-500';
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-5">
        {days.map(day => (
          <div key={day} className="h-5 flex items-center">{day}</div>
        ))}
      </div>
      <div className="flex gap-1">
        {weeks.map(week => (
          <div key={week} className="flex flex-col gap-1">
            {days.map((_, dayIndex) => {
              const dayData = data.find(d => d.week === week && d.dayOfWeek === dayIndex);
              return (
                <div
                  key={`${week}-${dayIndex}`}
                  className={`w-5 h-5 rounded-sm ${getColor(dayData?.pnl || 0, dayData?.trades || 0)} cursor-pointer transition-all hover:ring-2 hover:ring-primary/50`}
                  title={dayData ? `${dayData.date}: $${dayData.pnl.toFixed(2)} (${dayData.trades} trades)` : 'No data'}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-center gap-1 ml-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span>Loss &gt; $10</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-red-400/70" />
          <span>Small Loss</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <span>No trades</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-green-400/70" />
          <span>Small Profit</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Profit &gt; $10</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EMPTY CHART COMPONENT
// ============================================

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

// ============================================
// TRADES VIEW COMPONENT
// ============================================

interface TradesViewProps {
  trades: Trade[];
  filter: 'all' | 'active' | 'completed';
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  expandedTrades: Set<string>;
  toggleTradeExpansion: (tradeId: string) => void;
  summary: Summary | null;
}

function TradesView({ trades, filter, setFilter, expandedTrades, toggleTradeExpansion, summary }: TradesViewProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Filter Controls */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter:</span>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === f
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'active' && summary && ` (${summary.activeTrades})`}
                {f === 'completed' && summary && ` (${summary.completedTrades})`}
              </button>
            ))}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          Showing {trades.length} trades
        </span>
      </div>

      {/* Trades List */}
      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-card-foreground font-medium mb-2">No trades found</p>
          <p className="text-sm text-muted-foreground">
            {filter !== 'all' ? `No ${filter} trades available` : 'Your trades will appear here'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {trades.map((trade) => (
            <TradeCard
              key={trade.tradeId}
              trade={trade}
              isExpanded={expandedTrades.has(trade.tradeId)}
              onToggle={() => toggleTradeExpansion(trade.tradeId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// TRADE CARD COMPONENT
// ============================================

interface TradeCardProps {
  trade: Trade;
  isExpanded: boolean;
  onToggle: () => void;
}

function TradeCard({ trade, isExpanded, onToggle }: TradeCardProps) {
  const { entryOrder, exitOrders, pnl } = trade;
  
  // Count exit order statuses
  const filledExits = exitOrders.filter(o => o.status === 'FILLED').length;
  const pendingExits = exitOrders.filter(o => o.status === 'NEW' || o.status === 'PARTIALLY_FILLED').length;
  const canceledExits = exitOrders.filter(o => o.status === 'CANCELED' || o.status === 'EXPIRED').length;

  return (
    <div className="transition-all">
      {/* Trade Header - Always Visible */}
      <div 
        className="px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          {/* Left: Symbol & Info */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-card-foreground">{entryOrder.symbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  pnl.isComplete 
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-info/10 text-info'
                }`}>
                  {pnl.isComplete ? 'Closed' : 'Active'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Entry:</span>
                  <span className="text-card-foreground font-medium">${formatPrice(entryOrder.price)}</span>
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Qty:</span>
                  <span className="text-card-foreground">{formatAmount(entryOrder.quantity)}</span>
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="text-card-foreground">${formatAmount(pnl.entryCost, 2)}</span>
                </span>
                {!pnl.isComplete && pnl.currentMarketPrice && (
                  <>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">Market:</span>
                      <span className="text-info font-medium">${formatPrice(pnl.currentMarketPrice)}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: PnL Summary */}
          <div className="flex items-center gap-6">
            {/* Realized PnL */}
            {pnl.realizedQty > 0 && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Realized</p>
                <p className={`font-semibold ${pnl.realized >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPnL(pnl.realized)}
                </p>
                <p className={`text-xs ${pnl.realizedPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPercent(pnl.realizedPercent)}
                </p>
              </div>
            )}

            {/* Unrealized PnL */}
            {!pnl.isComplete && pnl.unrealizedQty > 0 && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Unrealized</p>
                <p className={`font-semibold ${pnl.unrealized >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPnL(pnl.unrealized)}
                </p>
                <p className={`text-xs ${pnl.unrealizedPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatPercent(pnl.unrealizedPercent)}
                </p>
              </div>
            )}

            {/* Total PnL */}
            <div className={`text-right px-4 py-2 rounded-lg ${
              pnl.total >= 0 
                ? 'bg-success/10' 
                : 'bg-danger/10'
            }`}>
              <p className="text-xs text-muted-foreground">Total PnL</p>
              <p className={`font-bold text-lg ${pnl.total >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatPnL(pnl.total)}
              </p>
              <p className={`text-xs font-medium ${pnl.totalPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatPercent(pnl.totalPercent)}
              </p>
            </div>

            {/* Expand Icon */}
            <div className={`p-2 rounded-lg bg-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Exit Orders Summary (collapsed view) */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="text-muted-foreground">Exit Orders:</span>
          {filledExits > 0 && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle className="w-3 h-3" />
              {filledExits} filled
            </span>
          )}
          {pendingExits > 0 && (
            <span className="flex items-center gap-1 text-info">
              <Clock className="w-3 h-3" />
              {pendingExits} pending
            </span>
          )}
          {canceledExits > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <XCircle className="w-3 h-3" />
              {canceledExits} canceled
            </span>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30">
          {/* Entry Order Details */}
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-success/20 text-success">
                ENTRY
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-md ${getStatusColor(entryOrder.status)}`}>
                {entryOrder.status}
              </span>
              <span className="text-xs text-muted-foreground ml-2">{entryOrder.exchange}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                <p className="font-mono text-card-foreground text-xs">{entryOrder.orderId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <p className="text-card-foreground">{entryOrder.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="text-card-foreground font-medium">${formatPrice(entryOrder.price)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                <p className="text-card-foreground">{formatAmount(entryOrder.quantity)} / {formatAmount(entryOrder.executedQty)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Filled At</p>
                <p className="text-card-foreground text-xs">
                  {entryOrder.filledAt ? new Date(entryOrder.filledAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Exit Orders Details */}
          <div className="px-6 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Exit Orders ({exitOrders.length})
            </p>
            <div className="space-y-2">
              {exitOrders.map((exit) => (
                <div 
                  key={exit.orderId}
                  className={`px-4 py-3 rounded-lg border ${
                    exit.status === 'FILLED' 
                      ? 'bg-success/5 border-success/20'
                      : exit.status === 'NEW' || exit.status === 'PARTIALLY_FILLED'
                      ? 'bg-info/5 border-info/20'
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${getRoleBadgeColor(exit.role)}`}>
                        {exit.role}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${getStatusColor(exit.status)}`}>
                        {exit.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{exit.type}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">Price: </span>
                        <span className="font-medium text-card-foreground">${formatPrice(exit.price)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">Qty: </span>
                        <span className="text-card-foreground">{formatAmount(exit.quantity)}</span>
                        {exit.executedQty > 0 && (
                          <span className="text-success ml-1 text-xs">
                            ({formatAmount(exit.executedQty)} filled)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {exit.filledAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Filled: {new Date(exit.filledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* PnL Breakdown */}
          <div className="px-6 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">PnL Breakdown</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Entry Cost</p>
                <p className="font-medium text-card-foreground">${formatAmount(pnl.entryCost, 2)}</p>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Realized Qty</p>
                <p className="text-card-foreground">{formatAmount(pnl.realizedQty)}</p>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Unrealized Qty</p>
                <p className="text-card-foreground">{formatAmount(pnl.unrealizedQty)}</p>
              </div>
              <div className="bg-card p-3 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Market Price</p>
                <p className="text-card-foreground">
                  {pnl.currentMarketPrice ? `$${formatPrice(pnl.currentMarketPrice)}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Trade ID */}
          <div className="px-6 py-3 bg-muted/50">
            <p className="text-xs text-muted-foreground">
              Trade ID: <span className="font-mono text-card-foreground">{trade.tradeId}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
