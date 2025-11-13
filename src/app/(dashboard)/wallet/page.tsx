// pages/wallet.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, TrendingUp, CreditCard, Shield } from 'lucide-react';
import { 
  getDepositHistoryByExchange, 
  getWithdrawalHistoryByExchange, 
  getSecurityInfo,
  DepositHistoryResponse,
  WithdrawHistoryResponse,
  SecurityInfoResponse,
  NormalizedTransactionResponse
} from '../../../infrastructure/api/WalletApi';
import DepositsTab from '../../../components/wallet/deposits';
import SecurityTab from '../../../components/wallet/security';
import WithdrawalsTab from '@/components/wallet/withdraws';
import { useAppSelector } from '@/infrastructure/store/hooks';
import { getSelectedExchange, getCredentials } from '@/infrastructure/features/exchange/exchangeSlice';

type TabType = 'deposits' | 'withdrawals' | 'security';

export default function WalletPage() {
  // Get Redux state
  const selectedExchange = useAppSelector(getSelectedExchange);
  const credentials = useAppSelector(getCredentials);

  // Cache utilities
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  const getCacheKey = (key: string) => `wallet_${selectedExchange}_${key}`;
  
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(getCacheKey(key));
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(getCacheKey(key));
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  };
  
  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(getCacheKey(key), JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore storage errors
    }
  };
  const [activeTab, setActiveTab] = useState<TabType>('deposits');
  const [depositHistory, setDepositHistory] = useState<DepositHistoryResponse | NormalizedTransactionResponse | null>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistoryResponse | NormalizedTransactionResponse | null>(null);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [formattedLastUpdate, setFormattedLastUpdate] = useState('No data loaded'); // ✅ client-safe state

  // ✅ Memoize tab badges safely
  const tabBadges = useMemo(() => {
    let depositBadge = 0;
    let withdrawalBadge = 0;

    if (depositHistory) {
      if ('summary' in depositHistory) {
        depositBadge = depositHistory.summary?.success ?? 0;
      } else {
        depositBadge = depositHistory.transactions?.filter(t => t.status === 'success').length ?? 0;
      }
    }

    if (withdrawHistory) {
      if ('summary' in withdrawHistory) {
        withdrawalBadge = withdrawHistory.summary?.completed ?? 0;
      } else {
        withdrawalBadge = withdrawHistory.transactions?.filter(t => t.status === 'success').length ?? 0;
      }
    }

    return {
      deposits: depositBadge,
      withdrawals: withdrawalBadge,
      security: securityInfo?.isSecure ? 1 : 0,
    };
  }, [depositHistory, withdrawHistory, securityInfo]);

  const fetchWalletData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedDeposits = getCachedData('deposits');
        const cachedWithdrawals = getCachedData('withdrawals');
        
        if (cachedDeposits && cachedWithdrawals) {
          setDepositHistory(cachedDeposits);
          setWithdrawHistory(cachedWithdrawals);
          setLastUpdate(new Date().toISOString());
          
          // Load security info in background
          fetchSecurityInfo();
          setLoading(false);
          return;
        }
      }

      console.log('📋 Fetching wallet data for exchange:', selectedExchange);
      
      // Get credentials object if available
      const credsObj = credentials ? {
        apiKey: credentials.apiKey,
        secretKey: credentials.secretKey,
        passphrase: credentials.passphrase
      } : undefined;

      // Load critical data first (deposits and withdrawals)
      const [deposits, withdrawals] = await Promise.all([
        getDepositHistoryByExchange(selectedExchange, credsObj),
        getWithdrawalHistoryByExchange(selectedExchange, credsObj),
      ]);

      setDepositHistory(deposits);
      setWithdrawHistory(withdrawals);
      
      // Cache the data
      setCachedData('deposits', deposits);
      setCachedData('withdrawals', withdrawals);
      
      setLastUpdate(new Date().toISOString());
      
      // Load security info in background (non-blocking)
      fetchSecurityInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
      console.error('❌ Wallet data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedExchange, credentials]);

  const fetchSecurityInfo = async () => {
    try {
      setSecurityLoading(true);
      const security = await getSecurityInfo();
      setSecurityInfo(security);
    } catch (error) {
      console.warn('Failed to fetch security info:', error);
    } finally {
      setSecurityLoading(false);
    }
  };

  // ✅ Only format on client
  useEffect(() => {
    if (lastUpdate) {
      setFormattedLastUpdate(`Last updated: ${new Date(lastUpdate).toLocaleTimeString()}`);
    }
  }, [lastUpdate]);

  useEffect(() => {
    // Refetch data when exchange changes
    setDepositHistory(null);
    setWithdrawHistory(null);
    fetchWalletData(true); // Force refresh on exchange change
  }, [selectedExchange, fetchWalletData]);

  const tabs = useMemo(() => [
    { id: 'deposits', label: 'Deposits', icon: TrendingUp, badge: tabBadges.deposits },
    { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard, badge: tabBadges.withdrawals },
    { id: 'security', label: 'Security', icon: Shield, badge: tabBadges.security },
  ], [tabBadges]);

  return (
    <div className="bg-card max-w-7xl mx-auto p-6 space-y-6">
      {/* Header - Always visible */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-card-foreground">Wallet</h1>
          <p className="text-sm text-muted mt-1">
            {loading && !lastUpdate ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                Loading data...
              </span>
            ) : (
              formattedLastUpdate
            )}
          </p>
        </div>
        
        <button 
          onClick={() => fetchWalletData(true)} 
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-default rounded-lg hover:bg-muted disabled:opacity-50 transition-colors text-sm font-medium text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-danger-light border border-danger rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-danger" />
            <p className="text-sm text-danger-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-default">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-primary text-primary hover:text-primary-foreground'
                    : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className={`ml-1 py-0.5 px-2 rounded-full text-xs font-medium ${
                    tab.id === 'security' && securityInfo && !securityInfo.isSecure
                      ? 'bg-danger text-danger-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="h-full">
        {loading && !depositHistory && !withdrawHistory ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading wallet data from {selectedExchange.toUpperCase()}...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'deposits' && (
              <DepositsTab 
                depositHistory={depositHistory} 
                exchange={selectedExchange}
              />
            )}
            {activeTab === 'withdrawals' && (
              <WithdrawalsTab 
                withdrawHistory={withdrawHistory}
                exchange={selectedExchange}
              />
            )}
            {activeTab === 'security' && (
              securityLoading && !securityInfo ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading security information...</p>
                  </div>
                </div>
              ) : (
                <SecurityTab securityInfo={securityInfo} />
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
