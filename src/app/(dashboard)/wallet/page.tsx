// pages/wallet.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp, CreditCard, Shield } from 'lucide-react';
import { 
  getDepositHistory, 
  getWithdrawHistory, 
  getSecurityInfo,
  DepositHistoryResponse,
  WithdrawHistoryResponse,
  SecurityInfoResponse
} from '../../../infrastructure/api/WalletApi';
import DepositsTab from '../../../components/wallet/deposits';
import SecurityTab from '../../../components/wallet/security';
import WithdrawalsTab from '@/components/wallet/withdraws';

type TabType = 'deposits' | 'withdrawals' | 'security';

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<TabType>('deposits');
  const [depositHistory, setDepositHistory] = useState<DepositHistoryResponse | null>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistoryResponse | null>(null);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [formattedLastUpdate, setFormattedLastUpdate] = useState('No data loaded'); // ✅ client-safe state

  // ✅ Memoize tab badges safely
  const tabBadges = useMemo(() => ({
    deposits: depositHistory?.summary?.success ?? 0,
    withdrawals: withdrawHistory?.summary?.completed ?? 0,
    security: securityInfo?.isSecure ? 1 : 0,
  }), [depositHistory, withdrawHistory, securityInfo]);

  const fetchWalletData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [deposits, withdrawals, security] = await Promise.all([
        getDepositHistory(),
        getWithdrawHistory(),
        getSecurityInfo(),
      ]);

      setDepositHistory(deposits);
      setWithdrawHistory(withdrawals);
      setSecurityInfo(security);
      setLastUpdate(new Date().toISOString()); // ✅ always consistent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Only format on client
  useEffect(() => {
    if (lastUpdate) {
      setFormattedLastUpdate(`Last updated: ${new Date(lastUpdate).toLocaleTimeString()}`);
    }
  }, [lastUpdate]);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const tabs = useMemo(() => [
    { id: 'deposits', label: 'Deposits', icon: TrendingUp, badge: tabBadges.deposits },
    { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard, badge: tabBadges.withdrawals },
    { id: 'security', label: 'Security', icon: Shield, badge: tabBadges.security },
  ], [tabBadges]);

  return (
    <div className="bg-card max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-card-foreground">Wallet</h1>
          <p className="text-sm text-muted mt-1">{formattedLastUpdate}</p>
        </div>
        
        <button 
          onClick={fetchWalletData} 
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
        {activeTab === 'deposits' && <DepositsTab depositHistory={depositHistory} />}
        {activeTab === 'withdrawals' && <WithdrawalsTab withdrawHistory={withdrawHistory} />}
        {activeTab === 'security' && <SecurityTab securityInfo={securityInfo} />}
      </div>
    </div>
  );
}
