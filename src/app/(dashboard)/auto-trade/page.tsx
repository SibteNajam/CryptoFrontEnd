'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/infrastructure/store/hooks';
import {
  initializeExchange,
  fetchTradingConfig,
  updateTradingConfig,
  fetchStats,
  fetchProcessingStatus,
  resetStartBalance,
  setNeedsSync,
} from '@/infrastructure/features/trading/tradingBotSlice';
import { TradingConfig } from '@/infrastructure/api/TradingBotApi';
import { Activity, TrendingUp, DollarSign, RefreshCw, AlertCircle, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function AutoTradePage() {
  const dispatch = useAppDispatch();
  const { selectedExchange, credentialsArray } = useAppSelector(state => state.exchange);
  const tradingBot = useAppSelector(state => state.tradingBot);

  const [configValues, setConfigValues] = useState<TradingConfig>({
    amount_percentage: 20,
    tp_level_count: 3,
    tp1_percentage: 4,
    tp2_percentage: 7,
    tp3_percentage: 10,
    stop_loss_percentage: 5,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [signalHistory, setSignalHistory] = useState<{ time: string; count: number }[]>([]);

  // Always initialize exchange when selectedExchange changes
  useEffect(() => {
    const currentCreds = credentialsArray.find(c => c.exchange === selectedExchange);
    if (currentCreds) {
      dispatch(initializeExchange({ exchange: selectedExchange, credentials: currentCreds }));
    }
  }, [selectedExchange, credentialsArray, dispatch]);

  // Fetch initial config
  useEffect(() => {
    if (tradingBot.isConfigured) {
      dispatch(fetchTradingConfig());
    }
  }, [tradingBot.isConfigured, dispatch]);

  // Update local config
  useEffect(() => {
    if (tradingBot.config) {
      setConfigValues(tradingBot.config);
    }
  }, [tradingBot.config]);

  // Poll stats
  useEffect(() => {
    if (!tradingBot.isConfigured) return;
    const statsInterval = setInterval(() => {
      dispatch(fetchStats());
    }, 10000); // 10 seconds
    dispatch(fetchStats());
    return () => clearInterval(statsInterval);
  }, [tradingBot.isConfigured, dispatch]);

  // Poll processing status
  useEffect(() => {
    if (!tradingBot.isConfigured) return;
    const statusInterval = setInterval(() => {
      dispatch(fetchProcessingStatus());
    }, 10000); // 10 seconds
    return () => clearInterval(statusInterval);
  }, [tradingBot.isConfigured, dispatch]);

  // Update signal history for chart
  useEffect(() => {
    if (tradingBot.stats) {
      setSignalHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          count: tradingBot.stats?.stats.buy_signals_found || 0,
        };
        return [...prev.slice(-9), newEntry];
      });
    }
  }, [tradingBot.stats?.stats.buy_signals_found]);

  const handleConfigChange = (field: keyof TradingConfig, value: number) => {
    setConfigValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await dispatch(updateTradingConfig(configValues)).unwrap();
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetrySync = () => {
    dispatch(setNeedsSync(true));
    const currentCreds = credentialsArray.find(c => c.exchange === selectedExchange);
    if (currentCreds) {
      dispatch(initializeExchange({ exchange: selectedExchange, credentials: currentCreds }));
    }
  };

  // Calculate P&L
  const pnl = tradingBot.stats ? tradingBot.stats.current_balance - tradingBot.stats.start_balance : 0;
  const pnlPercent = tradingBot.stats && tradingBot.stats.start_balance > 0
    ? (pnl / tradingBot.stats.start_balance) * 100
    : 0;

  // Pie chart data
  const pieData = tradingBot.stats ? [
    { name: 'Success', value: tradingBot.stats.stats.pipeline_successes || 1 },
    { name: 'Failed', value: tradingBot.stats.stats.pipeline_failures || 0 },
  ] : [];

  if (!tradingBot.isConfigured) {
    return (
      <div className="p-4">
        <div className="bg-card border border-default rounded-lg p-6 text-center max-w-md mx-auto">
          {tradingBot.loading ? (
            <>
              <RefreshCw className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
              <h2 className="text-lg font-semibold text-card-foreground mb-1">Connecting...</h2>
              <p className="text-xs text-muted">{selectedExchange.toUpperCase()}</p>
            </>
          ) : tradingBot.error ? (
            <>
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-danger" />
              <h2 className="text-lg font-semibold text-card-foreground mb-2">Connection Failed</h2>
              <p className="text-xs text-muted mb-3">{tradingBot.error}</p>
              <button
                onClick={handleRetrySync}
                className="px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted" />
              <h2 className="text-lg font-semibold text-card-foreground mb-1">Not Configured</h2>
              <p className="text-xs text-muted">Add credentials in Exchange Selector</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-card-foreground">Auto Trade</h1>
          <p className="text-xs text-muted">{tradingBot.activeExchange?.toUpperCase()}</p>
        </div>
        <button
          onClick={handleRetrySync}
          disabled={tradingBot.loading}
          className="px-3 py-2 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-lg hover:bg-primary/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          title="Re-initialize credentials with backend"
        >
          {tradingBot.loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Initialize
            </>
          )}
        </button>
      </div>

      {/* Main Grid - Balance Cards + Config on Left, Charts on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Balance Cards - Compact */}
          <div className="grid grid-cols-3 gap-1">
            <div className="rounded border border-default bg-white dark:bg-card px-2 py-1 flex flex-col items-center justify-center min-h-[36px]">
              <span className="text-[10px] font-medium text-muted">Start</span>
              <span className="text-base font-bold text-card-foreground">${tradingBot.stats?.start_balance.toFixed(0) || '0'}</span>
            </div>
            <div className="rounded border border-default bg-white dark:bg-card px-2 py-1 flex flex-col items-center justify-center min-h-[36px]">
              <span className="text-[10px] font-medium text-muted">Current</span>
              <span className="text-base font-bold text-card-foreground">${tradingBot.stats?.current_balance.toFixed(0) || '0'}</span>
            </div>
            <div className={`rounded border border-default bg-white dark:bg-card px-2 py-1 flex flex-col items-center justify-center min-h-[36px] ${pnl >= 0 ? '' : ''}`}> 
              <span className={`text-[10px] font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>P&L</span>
              <span className={`text-base font-bold ${pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>{pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}</span>
              <span className={`text-[9px] ${pnl >= 0 ? 'text-green-600/80' : 'text-red-600/80'}`}>{pnlPercent >= 0 ? '+' : '-'}{Math.abs(pnlPercent).toFixed(1)}%</span>
            </div>
          </div>

          {/* Processing Status - Compact */}
          {tradingBot.processingSymbol && (
            <div className="bg-card border border-default rounded-lg p-2.5 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-card-foreground">{tradingBot.processingSymbol}</p>
                <p className="text-muted">{tradingBot.processingStatus} • Q: {tradingBot.queueSize}</p>
              </div>
            </div>
          )}

          {/* Config Form - Compact Grid */}
          <div className="bg-card border border-default rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                <span className="text-base">⚙️</span> Configuration
              </h2>
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-3 py-1 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium flex items-center gap-1"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    ✓ Save
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Amount % */}
              <div>
                <label className="text-xs font-semibold text-card-foreground block mb-2">Amount %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={configValues.amount_percentage}
                    onChange={(e) => handleConfigChange('amount_percentage', Number(e.target.value))}
                    className="flex-1 h-1.5 rounded"
                  />
                  <input
                    type="number"
                    value={configValues.amount_percentage}
                    onChange={(e) => handleConfigChange('amount_percentage', Number(e.target.value))}
                    className="w-14 px-2 py-1.5 bg-background border border-default rounded text-xs font-semibold text-center"
                  />
                </div>
              </div>

              {/* TP Levels */}
              <div>
                <label className="text-xs font-semibold text-card-foreground block mb-2">TP Levels</label>
                <input
                  type="number"
                  value={configValues.tp_level_count}
                  onChange={(e) => handleConfigChange('tp_level_count', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-background border border-default rounded text-xs font-semibold"
                  min="1"
                  max="5"
                />
              </div>

              {/* Stop Loss */}
              <div>
                <label className="text-xs font-semibold text-card-foreground block mb-2">Stop Loss %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={configValues.stop_loss_percentage}
                    onChange={(e) => handleConfigChange('stop_loss_percentage', Number(e.target.value))}
                    className="flex-1 h-1.5 rounded"
                  />
                  <input
                    type="number"
                    value={configValues.stop_loss_percentage}
                    onChange={(e) => handleConfigChange('stop_loss_percentage', Number(e.target.value))}
                    className="w-14 px-2 py-1.5 bg-background border border-default rounded text-xs font-semibold text-center"
                    step="0.5"
                  />
                </div>
              </div>

              {/* TP1 */}
              <div>
                <label className="text-xs font-semibold text-green-600 dark:text-green-400 block mb-2">TP1 %</label>
                <input
                  type="number"
                  value={configValues.tp1_percentage}
                  onChange={(e) => handleConfigChange('tp1_percentage', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-background border border-default rounded text-xs font-semibold"
                  step="0.5"
                />
              </div>

              {/* TP2 */}
              <div>
                <label className="text-xs font-semibold text-green-600 dark:text-green-400 block mb-2">TP2 %</label>
                <input
                  type="number"
                  value={configValues.tp2_percentage}
                  onChange={(e) => handleConfigChange('tp2_percentage', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-background border border-default rounded text-xs font-semibold"
                  step="0.5"
                />
              </div>

              {/* TP3 */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-green-600 dark:text-green-400 block mb-2">TP3 %</label>
                <input
                  type="number"
                  value={configValues.tp3_percentage}
                  onChange={(e) => handleConfigChange('tp3_percentage', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-background border border-default rounded text-xs font-semibold"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Quick Stats - Compact */}
          {tradingBot.stats && (
            <div className="bg-card border border-default rounded-lg p-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-muted font-semibold">Queued</p>
                  <p className="text-lg font-bold text-card-foreground mt-1">{tradingBot.stats.stats.symbols_queued}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted font-semibold">Processed</p>
                  <p className="text-lg font-bold text-card-foreground mt-1">{tradingBot.stats.stats.symbols_processed}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted font-semibold">Success</p>
                  <p className="text-lg font-bold text-success mt-1">{tradingBot.stats.stats.pipeline_successes}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted font-semibold">Failed</p>
                  <p className="text-lg font-bold text-danger mt-1">{tradingBot.stats.stats.pipeline_failures}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Charts */}
        <div className="space-y-4">
          {/* Buy Signals History Chart */}
          {signalHistory.length > 0 && (
            <div className="bg-card border border-default rounded-lg p-3">
              <h3 className="text-xs font-semibold text-card-foreground mb-2 flex items-center gap-1.5">
                <span className="text-sm">�</span> Buy Signals (Last 10)
              </h3>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signalHistory} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={10} tick={{ fill: '#888' }} />
                    <YAxis fontSize={10} tick={{ fill: '#888' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Buy Signals Trend */}
          {signalHistory.length > 1 && (
            <div className="bg-card border border-default rounded-lg p-3">
              <h3 className="text-xs font-semibold text-card-foreground mb-2 flex items-center gap-1.5">
                <span className="text-sm">📈</span> Buy Signals
              </h3>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signalHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 7 }} 
                      stroke="var(--text-muted)"
                      interval={Math.max(0, Math.floor(signalHistory.length / 3))}
                    />
                    <YAxis 
                      tick={{ fontSize: 7 }} 
                      stroke="var(--text-muted)"
                      width={25}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        padding: '6px 8px',
                      }}
                      labelStyle={{ color: 'var(--text-card-foreground)' }}
                      formatter={(value: number) => [
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{value} signals</span>,
                        'Signals'
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ fill: '#3b82f6', r: 3, strokeWidth: 1.5, stroke: '#fff' }}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                      isAnimationActive={false}
                      fill="url(#signalGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-between px-2 py-1.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] text-muted flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  Total Signals
                </span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {tradingBot.stats?.stats.buy_signals_found || 0}
                </span>
              </div>
            </div>
          )}

          {/* Statistics Summary */}
          <div className="bg-card border border-default rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
              <span className="text-sm">📋</span> Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Logic Checks</span>
                <span className="font-semibold text-card-foreground">{tradingBot.stats?.stats.logic_checks || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Sell Signals</span>
                <span className="font-semibold text-card-foreground">{tradingBot.stats?.stats.sell_signals_discarded || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Duplicates</span>
                <span className="font-semibold text-card-foreground">{tradingBot.stats?.stats.symbols_skipped_duplicates || 0}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-default">
                <span className="text-muted">VLM Bypasses</span>
                <span className="font-semibold text-card-foreground">{tradingBot.stats?.stats.vlm_bypass_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
