'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle,
  AlertCircle, Target, Shield, Activity, BarChart3, PieChart as PieChartIcon,
  Calendar, ChevronDown, ChevronUp, Wallet, DollarSign, Percent
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line as LineChart, Bar as BarChart, Pie as PieChart, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
);
import TokenStorage from '../../infrastructure/login/tokenStorage';

// MUI X Charts Imports
import { PieChart as MuiPieChart, pieArcClasses, pieArcLabelClasses } from '@mui/x-charts/PieChart';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
import { useDrawingArea } from '@mui/x-charts/hooks';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { styled, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

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

// ChartDatum type for pie/bar chart data
interface ChartDatum {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

// TradeDatum type for pie chart transformation
type TradeDatum = {
  Symbol: string;
  Outcome: 'Win' | 'Loss';
  Count: number;
};

// ============================================
// API FUNCTION
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
async function fetchTrades(exchange?: string, symbol?: string): Promise<TradesResponse> {
  const params = new URLSearchParams();
  if (exchange) params.append('exchange', exchange.toUpperCase());
  if (symbol) params.append('symbol', symbol);

  const url = `${API_BASE_URL}/exchanges/trades${params.toString() ? '?' + params.toString() : ''}`;

  // Build headers with JWT token
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add JWT token for authentication
  const token = TokenStorage.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('🔑 DB Trades - JWT token added to headers');
  } else {
    console.warn('⚠️ DB Trades - No JWT token found in storage');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============================================
// CHART COLORS - Professional Soft Palette
// ============================================

const CHART_COLORS = {
  // Primary colors - softer, more professional
  green: 'rgb(34, 197, 94)',      // Emerald green
  red: 'rgb(239, 68, 68)',        // Soft red
  blue: 'rgb(59, 130, 246)',      // Sky blue
  purple: 'rgb(139, 92, 246)',    // Violet
  orange: 'rgb(251, 146, 60)',    // Soft orange
  cyan: 'rgb(6, 182, 212)',       // Cyan
  pink: 'rgb(236, 72, 153)',      // Pink
  yellow: 'rgb(250, 204, 21)',    // Yellow
  slate: 'rgb(148, 163, 184)',    // Slate gray

  // Gradient versions (for fills)
  greenGradientStart: 'rgba(34, 197, 94, 0.25)',
  greenGradientEnd: 'rgba(34, 197, 94, 0)',
  redGradientStart: 'rgba(239, 68, 68, 0.25)',
  redGradientEnd: 'rgba(239, 68, 68, 0)',
  blueGradientStart: 'rgba(59, 130, 246, 0.25)',
  blueGradientEnd: 'rgba(59, 130, 246, 0)',
};

const PIE_COLORS = [
  'rgb(34, 197, 94)',   // Green
  'rgb(239, 68, 68)',   // Red
  'rgb(59, 130, 246)',  // Blue
  'rgb(251, 146, 60)',  // Orange
  'rgb(139, 92, 246)',  // Purple
  'rgb(6, 182, 212)',   // Cyan
];

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
// PROFESSIONAL CHART.JS CONFIGURATION
// ============================================

// Professional tooltip configuration
const tooltipConfig = {
  enabled: true,
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  titleColor: '#f1f5f9',
  bodyColor: '#cbd5e1',
  borderColor: 'rgba(148, 163, 184, 0.2)',
  borderWidth: 1,
  padding: 14,
  cornerRadius: 10,
  displayColors: true,
  boxPadding: 6,
  usePointStyle: true,
  titleFont: {
    size: 13,
    weight: 600,
    family: "'Inter', 'system-ui', sans-serif",
  },
  bodyFont: {
    size: 12,
    family: "'Inter', 'system-ui', sans-serif",
  },
  footerFont: {
    size: 11,
    family: "'Inter', 'system-ui', sans-serif",
  },
};

// Professional legend configuration
const legendConfig = {
  display: true,
  position: 'top' as const,
  align: 'end' as const,
  labels: {
    color: '#cbd5e1',
    font: {
      size: 12,
      weight: 500,
      family: "'Inter', 'system-ui', sans-serif",
    },
    padding: 16,
    usePointStyle: true,
    pointStyle: 'circle',
    boxWidth: 8,
    boxHeight: 8,
  },
};

// Professional scale configuration
const getScaleConfig = (showDollar = true) => ({
  x: {
    grid: {
      display: true,
      color: 'rgba(71, 85, 105, 0.12)',
      drawBorder: false,
      lineWidth: 1,
    },
    ticks: {
      color: '#94a3b8',
      font: {
        size: 11,
        family: "'Inter', 'system-ui', sans-serif",
      },
      padding: 8,
      maxRotation: 45,
    },
    border: {
      display: false,
    },
  },
  y: {
    grid: {
      display: true,
      color: 'rgba(71, 85, 105, 0.12)',
      drawBorder: false,
      lineWidth: 1,
    },
    ticks: {
      color: '#94a3b8',
      font: {
        size: 11,
        family: "'Inter', 'system-ui', sans-serif",
      },
      padding: 10,
      callback: function (value: any) {
        return showDollar ? '$' + value.toFixed(2) : value;
      }
    },
    border: {
      display: false,
    },
  },
});

// Common chart options for professional dark theme
const getCommonChartOptions = (title?: string): any => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 800,
    easing: 'easeOutQuart' as const,
  },
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: {
      ...tooltipConfig,
      callbacks: {
        label: function (context: any) {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          if (value !== null) {
            return `${label}: $${value.toFixed(2)}`;
          }
          return label;
        }
      }
    },
  },
  scales: getScaleConfig(true),
});


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
      .filter(t => t.pnl.isComplete && t.pnl.total !== 0) // Exclude break-even/zero PnL trades from calculations
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
        wins: existing.wins + (trade.pnl.realized > 0 ? 1 : 0),
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
    const wins = completedTrades.filter(t => t.pnl.realized > 0).length;
    const losses = completedTrades.filter(t => t.pnl.realized < 0).length;
    const neutral = completedTrades.filter(t => t.pnl.realized === 0).length;
    const winLossData = [
      { name: 'Wins', value: wins, color: CHART_COLORS.green },
      { name: 'Losses', value: losses, color: CHART_COLORS.red },
    ];

    // Win Rate (excluding zero PnL trades from calculation as requested)
    const validTradesCount = wins + losses;
    const winRate = validTradesCount > 0 ? (wins / validTradesCount) * 100 : 0;

    // Average Win/Loss
    const avgWin = wins > 0 ? completedTrades.filter(t => t.pnl.realized > 0).reduce((sum, t) => sum + t.pnl.realized, 0) / wins : 0;
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
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'overview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-card-foreground'
                }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setViewMode('trades')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'trades'
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === range
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
// thsi logic is not correct that it place two tp order and moitioring for sl order
// we can split one order intwo two order so that asssume order comes of 40 usdt then we split in two portiosn 20 usdt and 20 usdt
// first order 20 usdt seco
function StatCard({ label, value, icon, variant = 'default', highlighted }: StatCardProps) {
  const variantStyles = {
    default: 'text-card-foreground',
    success: 'text-success',
    danger: 'text-danger',
    info: 'text-info',
  };

  return (
    <div className={`bg-card border border-border rounded-xl p-4 transition-all hover:border-border-light ${highlighted ? 'ring-2 ring-primary/20' : ''
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
// TRADE PERFORMANCE PIE CHART (MUI X) - IMPROVED
// ============================================

// PieCenterLabel helper for MUI PieChart (centers children in the chart)
function PieCenterLabel({ children }: { children: React.ReactNode }) {
  const { width, height, left, top } = useDrawingArea();
  return (
    <g transform={`translate(${left + width / 2}, ${top + height / 2})`}>
      <foreignObject x={-40} y={-16} width={80} height={32} style={{ pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          {children}
        </div>
      </foreignObject>
    </g>
  );
}

function TradePerformancePie({ symbolPerformance }: { symbolPerformance: SymbolPerformance[] }) {
  const [view, setView] = React.useState<'symbol' | 'outcome'>('symbol');
  const theme = useTheme();

  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'symbol' | 'outcome' | null,
  ) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  // Prepare Data
  const topSymbols = symbolPerformance.slice(0, 5);
  const rawData: TradeDatum[] = topSymbols.flatMap(s => {
    const wins = Math.round(s.trades * (s.winRate / 100));
    const losses = s.trades - wins;
    return [
      { Symbol: s.symbol, Outcome: 'Win' as const, Count: wins },
      { Symbol: s.symbol, Outcome: 'Loss' as const, Count: losses }
    ];
  }).filter(d => d.Count > 0);

  const totalCount = rawData.reduce((acc, item) => acc + item.Count, 0);

  // Improved outcome colors with better contrast on black background
  const outcomeColors = {
    'Win': '#10B981', // Brighter, more vibrant green
    'Loss': '#EF4444', // Brighter, more vibrant red
  };

  // Enhanced symbol palette for black background
  const symbolPalette = [
    '#3B82F6', // Bright blue
    '#8B5CF6', // Vibrant purple
    '#10B981', // Emerald green
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#6366F1', // Indigo
  ];

  const symbolColors: Record<string, string> = {};
  topSymbols.forEach((s, i) => {
    symbolColors[s.symbol] = symbolPalette[i % symbolPalette.length];
  });

  // --- Data Transformation Logic ---
  const symbolData: ChartDatum[] = topSymbols.map(s => {
    const symbolTotal = rawData
      .filter(d => d.Symbol === s.symbol)
      .reduce((acc, d) => acc + d.Count, 0);
    return {
      id: s.symbol,
      label: s.symbol,
      value: symbolTotal,
      percentage: (symbolTotal / totalCount) * 100,
      color: symbolColors[s.symbol],
    };
  }).filter(d => d.value > 0);

  // Helper to convert hex/rgb to rgba
  function hexToRgba(hex: string, alpha: number): string {
    // If already rgba, just replace alpha
    if (hex.startsWith('rgba')) {
      return hex.replace(/[\d\.]+\)$/g, `${alpha})`);
    }
    // If rgb, convert to rgba
    if (hex.startsWith('rgb(')) {
      return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    // Remove hash if present
    hex = hex.replace('#', '');
    // Expand shorthand
    if (hex.length === 3) {
      hex = hex.split('').map(x => x + x).join('');
    }
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const symbolOutcomeData: ChartDatum[] = topSymbols.flatMap(s => {
    const symbolTotal = symbolData.find(d => d.id === s.symbol)?.value || 0;
    const baseColor = symbolColors[s.symbol];
    return rawData
      .filter(d => d.Symbol === s.symbol)
      .sort((a, b) => (a.Outcome === 'Win' ? -1 : 1))
      .map(d => ({
        id: `${d.Symbol}-${d.Outcome}`,
        label: d.Outcome,
        value: d.Count,
        percentage: (d.Count / symbolTotal) * 100,
        color: d.Outcome === 'Win' ? baseColor : hexToRgba(baseColor, 0.4),
      }));
  });

  const outcomeData: ChartDatum[] = [
    {
      id: 'Win',
      label: 'Win',
      value: rawData.filter(d => d.Outcome === 'Win').reduce((sum, d) => sum + d.Count, 0),
      percentage: 0,
      color: outcomeColors['Win'],
    },
    {
      id: 'Loss',
      label: 'Loss',
      value: rawData.filter(d => d.Outcome === 'Loss').reduce((sum, d) => sum + d.Count, 0),
      percentage: 0,
      color: outcomeColors['Loss'],
    }
  ].map(d => ({ ...d, percentage: (d.value / totalCount) * 100 }));

  const outcomeSymbolData: ChartDatum[] = ['Win', 'Loss'].flatMap((outcome) => {
    const outcomeTotal = outcomeData.find(d => d.id === outcome)?.value || 0;
    const tints = symbolPalette;
    return rawData
      .filter(d => d.Outcome === outcome)
      .map((d, i) => ({
        id: `${d.Symbol}-${d.Outcome}`,
        label: d.Symbol,
        value: d.Count,
        percentage: (d.Count / outcomeTotal) * 100,
        color: tints[i % tints.length],
      }));
  });

  const innerRadius = 32;
  const middleRadius = 55;

  if (totalCount === 0) return <EmptyChart message="No completed trades" />;

  return (
    <Box sx={{
      width: '100%',
      textAlign: 'center',
      backgroundColor: 'transparent',
      p: 1,
      borderRadius: 2,
    }}>
      <div className="flex justify-center mb-3">
        <ToggleButtonGroup
          color="primary"
          value={view}
          exclusive
          onChange={handleViewChange}
          size="small"
          aria-label="Chart View"
          sx={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            '& .MuiToggleButton-root': {
              color: '#9ca3af',
              fontSize: '0.7rem',
              py: 0.5,
              px: 1.5,
              border: 'none',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
              }
            },
            '& .Mui-selected': {
              color: '#ffffff !important',
              backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
              fontWeight: 600,
            }
          }}
        >
          <ToggleButton value="symbol">By Symbol</ToggleButton>
          <ToggleButton value="outcome">By Outcome</ToggleButton>
        </ToggleButtonGroup>
      </div>

      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        height: 130,
        position: 'relative',
      }}>
        {view === 'symbol' ? (
          <MuiPieChart
            series={[
              {
                innerRadius,
                outerRadius: middleRadius,
                data: symbolData,
                arcLabel: (item) => (item as any).percentage > 15 ? `${item.id}` : '',
                arcLabelMinAngle: 20,
                highlightScope: { fade: 'global', highlight: 'item' },
                highlighted: {
                  additionalRadius: 4,
                  innerRadius: innerRadius - 2,
                  outerRadius: middleRadius + 2,
                },
                cornerRadius: 6,
                cx: '50%',
                paddingAngle: 1,
              },
              {
                innerRadius: middleRadius + 3,
                outerRadius: middleRadius + 18,
                data: symbolOutcomeData,
                arcLabel: (item) => (item as any).percentage > 10 ? `${(item as any).percentage.toFixed(0)}%` : '',
                arcLabelMinAngle: 15,
                highlightScope: { fade: 'global', highlight: 'item' },
                highlighted: {
                  additionalRadius: 3,
                  innerRadius: middleRadius + 1,
                  outerRadius: middleRadius + 20,
                },
                cornerRadius: 4,
                cx: '50%',
                paddingAngle: 0.5,
              },
            ]}
            slotProps={{
              legend: ({ hidden: true } as any)
            }}
            sx={{
              width: '100%',
              height: '100%',
              // FIXED: Remove black overlay
              '& .MuiResponsiveChart-container': {
                backgroundColor: 'transparent !important',
              },
              '& .MuiChartsLegend-root': {
                display: 'none',
              },
              [`& .${pieArcLabelClasses.root}`]: {
                fill: '#ffffff',
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              },
              [`& .${pieArcLabelClasses.root}[data-highlighted='true']`]: {
                fill: '#ffffff',
                fontSize: 11,
              },
              [`& .${pieArcClasses.root}`]: {
                stroke: '#000000',
                strokeWidth: 1,
                transition: 'all 0.2s ease',
              },
              [`& .${pieArcClasses.root}[data-highlighted='true']`]: {
                filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))',
                strokeWidth: 2,
              },
            }}
          >
            <PieCenterLabel>
              <Typography sx={{
                fill: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
              }}>
                Symbol
              </Typography>
            </PieCenterLabel>
          </MuiPieChart>
        ) : (
          <MuiPieChart
            series={[
              {
                innerRadius,
                outerRadius: middleRadius,
                data: outcomeData,
                arcLabel: (item) => `${item.id}`,
                highlightScope: { fade: 'global', highlight: 'item' },
                highlighted: {
                  additionalRadius: 4,
                  innerRadius: innerRadius - 2,
                  outerRadius: middleRadius + 2,
                },
                cornerRadius: 6,
                cx: '50%',
                paddingAngle: 1,
              },
              {
                innerRadius: middleRadius + 3,
                outerRadius: middleRadius + 18,
                data: outcomeSymbolData,
                arcLabel: (item) => (item as any).percentage > 10 ? `${(item as any).label}` : '',
                arcLabelMinAngle: 15,
                highlightScope: { fade: 'global', highlight: 'item' },
                highlighted: {
                  additionalRadius: 3,
                  innerRadius: middleRadius + 1,
                  outerRadius: middleRadius + 20,
                },
                cornerRadius: 4,
                cx: '50%',
                paddingAngle: 0.5,
              },
            ]}
            sx={{
              width: '100%',
              height: '100%',
              // FIXED: Remove black overlay
              '& .MuiResponsiveChart-container': {
                backgroundColor: 'transparent !important',
              },
              '& .MuiChartsLegend-root': {
                display: 'none',
              },
              [`& .${pieArcLabelClasses.root}`]: {
                fill: '#ffffff',
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              },
              [`& .${pieArcLabelClasses.root}[data-highlighted='true']`]: {
                fill: '#ffffff',
                fontSize: 11,
              },
              [`& .${pieArcClasses.root}`]: {
                stroke: '#000000',
                strokeWidth: 1,
                transition: 'all 0.2s ease',
              },
              [`& .${pieArcClasses.root}[data-highlighted='true']`]: {
                filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))',
                strokeWidth: 2,
              },
            }}
            slotProps={{
              legend: ({ hidden: true } as any)
            }}
          >
            <PieCenterLabel>
              <Typography sx={{
                fill: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
              }}>
                Result
              </Typography>
            </PieCenterLabel>
          </MuiPieChart>
        )}
      </Box>
    </Box>
  );
}


// ============================================
// IMPROVED PROFITABILITY SCORE COMPONENT
// ============================================

function ProfitabilityScore({ winRate, profitFactor }: { winRate: number, profitFactor: number }) {
  const pfScore = Math.min((profitFactor / 3) * 50, 50);
  const wrScore = Math.min((winRate / 100) * 50, 50);
  const totalScore = Math.round(pfScore + wrScore);

  // Dynamic color based on score
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10B981'; // Green for good
    if (score >= 50) return '#F59E0B'; // Amber for average
    if (score >= 30) return '#F97316'; // Orange for below average
    return '#EF4444'; // Red for poor
  };

  const scoreColor = getScoreColor(totalScore);

  return (
    <Box sx={{
      width: '100%',
      textAlign: 'center',
      background: 'linear-gradient(145deg, rgba(30, 30, 35, 0.8), rgba(20, 20, 25, 0.9))',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      p: 2,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    }}>
      <Box sx={{ height: 130, mt: 0.5 }}>
        <Gauge
          value={totalScore}
          startAngle={-110}
          endAngle={110}
          innerRadius="80%"
          outerRadius="100%"
          sx={{
            // FIXED: Remove black background overlay
            '& .MuiResponsiveChart-container': {
              backgroundColor: 'transparent !important',
            },
            [`& .${gaugeClasses.valueText}`]: {
              fontSize: 24,
              fontWeight: 800,
              fill: '#ffffff',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            },
            [`& .${gaugeClasses.valueArc}`]: {
              fill: scoreColor,
              stroke: scoreColor,
              strokeWidth: 2,
              filter: `drop-shadow(0 0 8px ${scoreColor}40)`,
            },
            [`& .${gaugeClasses.referenceArc}`]: {
              fill: 'rgba(255, 255, 255, 0.08)',
              stroke: 'rgba(255, 255, 255, 0.05)',
              strokeWidth: 1,
            },
          }}
          text={({ value }) => `${value}`}
        />
      </Box>

      <Typography sx={{
        fontSize: '11px',
        color: '#9CA3AF',
        mt: 0.5,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 600,
      }}>
        Trading Edge Score
      </Typography>

      <Box sx={{
        mt: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        p: 1.5,
      }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#D1D5DB',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            }} />
            <span>Efficiency (Profit Factor)</span>
          </Box>
          <span style={{
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
          }}>
            {(pfScore * 2).toFixed(0)}%
          </span>
        </Box>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#D1D5DB',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #059669)',
            }} />
            <span>Consistency (Win Rate)</span>
          </Box>
          <span style={{
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
          }}>
            {(wrScore * 2).toFixed(0)}%
          </span>
        </Box>
      </Box>
    </Box>
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

  // ==========================================
  // CLEAN EQUITY CURVE CHART (Like Chart.js website)
  // ==========================================
  const equityCurveData = {
    labels: chartData.equityCurve.map(d => d.date),
    datasets: [
      {
        label: 'Cumulative PnL',
        data: chartData.equityCurve.map(d => d.cumulative),
        borderColor: 'rgb(75, 192, 192)',  // Soft teal - Chart.js default style
        backgroundColor: 'rgba(75, 192, 192, 0.1)',  // Very subtle fill
        fill: true,
        tension: 0.4,
        borderWidth: 2,  // Thin line like Chart.js examples
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: 'rgb(75, 192, 192)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const equityCurveOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeOutQuart' as const,
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 4,
        titleFont: { size: 13, weight: 600 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            const prefix = value >= 0 ? '+' : '';
            return `PnL: ${prefix}$${value.toFixed(2)}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,  // No vertical grid lines - cleaner
        },
        ticks: {
          color: 'rgb(148, 226, 213)',  // Teal for dates
          font: { size: 10 },
          padding: 8,
          maxTicksLimit: 6,
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',  // Very subtle grid
          lineWidth: 1,
        },
        ticks: {
          color: 'rgba(148, 226, 213, 0.9)',  // Teal for values
          font: { size: 11 },
          padding: 10,
          maxTicksLimit: 5,  // Fewer ticks = cleaner
          callback: (value: any) => {
            // Smart formatting - avoid cluttered decimals
            if (Math.abs(value) >= 1) return `$${value.toFixed(0)}`;
            if (value === 0) return '$0';
            return `$${value.toFixed(2)}`;
          }
        },
        border: { display: false },
      },
    },
  };

  // ==========================================
  // CLEAN DOUGHNUT CHART (Chart.js style)
  // ==========================================
  const winLossChartData = {
    labels: chartData.winLossData.map(d => d.name),
    datasets: [
      {
        data: chartData.winLossData.map(d => d.value),
        // Chart.js default pastel colors
        backgroundColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)'],
        hoverBackgroundColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)'],
        borderColor: 'rgba(30, 41, 59, 1)',  // Dark background color
        borderWidth: 2,
        hoverOffset: 4,
        spacing: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',  // Chart.js default style
    animation: {
      animateRotate: true,
      animateScale: false,
      duration: 750,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: 'rgba(203, 213, 225, 0.9)',
          font: { size: 12 },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };

  // ==========================================
  // CLEAN BAR CHART - PnL by Period (Chart.js style)
  // ==========================================
  const pnlChartData = {
    labels: pnlData.map(d => d.date),
    datasets: [
      {
        label: 'PnL',
        data: pnlData.map(d => d.pnl),
        // Softer colors like Chart.js examples
        backgroundColor: pnlData.map(d =>
          d.pnl >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
        ),
        hoverBackgroundColor: pnlData.map(d =>
          d.pnl >= 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'
        ),
        borderColor: pnlData.map(d =>
          d.pnl >= 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'
        ),
        borderWidth: 1,
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  };

  const pnlBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            const prefix = value >= 0 ? '+' : '';
            return `PnL: ${prefix}$${value.toFixed(2)}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgb(148, 226, 213)',  // Teal for dates
          font: { size: 9 },
          padding: 6,
          maxRotation: 45,
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          lineWidth: 1,
        },
        ticks: {
          color: 'rgba(148, 226, 213, 0.9)',  // Teal for values
          font: { size: 10 },
          padding: 8,
          maxTicksLimit: 5,
          callback: (value: any) => {
            if (Math.abs(value) >= 1) return `$${value.toFixed(0)}`;
            if (value === 0) return '$0';
            return `$${value.toFixed(2)}`;
          }
        },
        border: { display: false },
      },
    },
  };

  // ==========================================
  // CLEAN HORIZONTAL BAR CHART - Symbols (Chart.js style)
  // ==========================================
  const symbolChartData = {
    labels: chartData.symbolPerformance.map(d => d.symbol),
    datasets: [
      {
        label: 'PnL',
        data: chartData.symbolPerformance.map(d => d.pnl),
        backgroundColor: chartData.symbolPerformance.map(d =>
          d.pnl >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
        ),
        hoverBackgroundColor: chartData.symbolPerformance.map(d =>
          d.pnl >= 0 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'
        ),
        borderColor: chartData.symbolPerformance.map(d =>
          d.pnl >= 0 ? 'rgb(75, 192, 192)' : 'rgb(255, 99, 132)'
        ),
        borderWidth: 1,
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  };

  const symbolBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    animation: {
      duration: 750,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.x;
            const prefix = value >= 0 ? '+' : '';
            return `PnL: ${prefix}$${value.toFixed(2)}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          lineWidth: 1,
        },
        ticks: {
          color: 'rgba(148, 226, 213, 0.9)',  // Teal/cyan for better visibility
          font: { size: 11 },
          padding: 8,
          maxTicksLimit: 5,
          callback: (value: any) => {
            if (Math.abs(value) >= 1) return `$${value.toFixed(0)}`;
            if (value === 0) return '$0';
            return `$${value.toFixed(2)}`;
          }
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: 'rgb(148, 226, 213)',  // Bright teal for symbol labels
          font: { size: 10, weight: 600 },
          padding: 8,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="space-y-3">
      {/* Main Charts Grid - 3 distinct areas across on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Equity Curve - Primary Visualization */}
        <div className="lg:col-span-2 bg-[#0c0e11] border border-border/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Equity Curve</h3>
            {chartData.equityCurve.length > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${chartData.equityCurve[chartData.equityCurve.length - 1]?.cumulative >= 0
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-red-500/10 text-red-500'
                }`}>
                {chartData.equityCurve[chartData.equityCurve.length - 1]?.cumulative >= 0 ? '+' : ''}
                ${chartData.equityCurve[chartData.equityCurve.length - 1]?.cumulative?.toFixed(2) || '0.00'}
              </span>
            )}
          </div>
          {chartData.equityCurve.length > 0 ? (
            <div className="h-[150px]">
              <LineChart data={equityCurveData} options={equityCurveOptions} />
            </div>
          ) : (
            <EmptyChart message="No completed trades yet" />
          )}
        </div>

        {/* Portfolio Distribution - 1 slot */}
        <div className="lg:col-span-1 bg-[#0c0e11] border border-border/20 rounded-lg p-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Portfolio</h3>
          {chartData.winLossData[0].value + chartData.winLossData[1].value > 0 ? (
            <div className="flex flex-col">
              <TradePerformancePie symbolPerformance={chartData.symbolPerformance} />
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                <div className="text-[9px]">
                  <div className="text-muted-foreground">Win Rate</div>
                  <div className={`font-semibold tabular-nums ${chartData.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {chartData.winRate.toFixed(1)}%
                  </div>
                </div>
                <div className="text-[9px]">
                  <div className="text-muted-foreground">Profit Factor</div>
                  <div className={`font-semibold tabular-nums ${chartData.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {chartData.profitFactor.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyChart message="No data" />
          )}
        </div>

        {/* Risk Edge Gauge - 1 slot */}
        <div className="lg:col-span-1 bg-[#0c0e11] border border-border/20 rounded-lg p-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Risk Edge</h3>
          <ProfitabilityScore winRate={chartData.winRate} profitFactor={chartData.profitFactor} />
        </div>
      </div>

      {/* Row 2: Analysis Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-[#0c0e11] border border-border/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PnL by Period</h3>
            <div className="flex gap-0.5 text-[9px]">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setPnlPeriod(period)}
                  className={`px-1.5 py-0.5 rounded transition-all ${pnlPeriod === period
                    ? 'bg-teal-500/20 text-teal-400'
                    : 'text-muted-foreground hover:text-card-foreground'
                    }`}
                >
                  {period.slice(0, 1).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {pnlData.length > 0 ? (
            <div className="h-[180px]">
              <BarChart data={pnlChartData} options={pnlBarOptions} />
            </div>
          ) : (
            <EmptyChart message="No PnL data available" />
          )}
        </div>

        {/* Symbol Performance */}
        <div className="bg-[#0c0e11] border border-border/20 rounded-lg p-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Top Symbols</h3>
          {chartData.symbolPerformance.length > 0 ? (
            <div className="h-[180px]">
              <BarChart data={symbolChartData} options={symbolBarOptions} />
            </div>
          ) : (
            <EmptyChart message="No symbol data available" />
          )}
        </div>
      </div>

      {/* Heatmap - Full width */}
      <div className="bg-[#0c0e11] border border-border/20 rounded-lg p-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Activity Heatmap</h3>
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
    <div className="flex gap-3 items-start">
      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground pt-3">
        {days.map(day => (
          <div key={day} className="h-4 flex items-center">{day.slice(0, 2)}</div>
        ))}
      </div>
      <div className="flex gap-0.5">
        {weeks.map(week => (
          <div key={week} className="flex flex-col gap-0.5">
            {days.map((_, dayIndex) => {
              const dayData = data.find(d => d.week === week && d.dayOfWeek === dayIndex);
              return (
                <div
                  key={`${week}-${dayIndex}`}
                  className={`w-4 h-4 rounded-sm ${getColor(dayData?.pnl || 0, dayData?.trades || 0)} cursor-pointer transition-all hover:ring-1 hover:ring-primary/50`}
                  title={dayData ? `${dayData.date}: $${dayData.pnl.toFixed(2)} (${dayData.trades} trades)` : 'No data'}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 ml-3 text-[10px] text-muted-foreground items-center">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-500" /><span>Loss</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-muted" /><span>None</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-green-500" /><span>Profit</span></div>
      </div>
    </div>
  );
}

// ============================================
// EMPTY CHART COMPONENT
// ============================================

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[120px] flex items-center justify-center">
      <p className="text-muted-foreground text-xs">{message}</p>
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
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${filter === f
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
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exitOrders.length === 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : pnl.isComplete
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-info/10 text-info'
                  }`}>
                  {exitOrders.length === 0 ? 'Open Order' : pnl.isComplete ? 'Closed' : 'Active'}
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
            <div className={`text-right px-4 py-2 rounded-lg ${pnl.total >= 0
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
                  className={`px-4 py-3 rounded-lg border ${exit.status === 'FILLED'
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
