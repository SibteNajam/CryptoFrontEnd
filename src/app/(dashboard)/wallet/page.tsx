// pages/wallet.tsx - Make sure the import path is correct
'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, CreditCard, Shield } from 'lucide-react';
import { 
  getDepositHistory, 
  getWithdrawHistory, 
  getSecurityInfo,
  DepositHistoryResponse,
  WithdrawHistoryResponse,
  SecurityInfoResponse
} from '../../../infrastructure/api/WalletApi'; // Make sure this path is correct
import DepositsTab from '../../../components/wallet/deposits';
import WithdrawalsTab from '../../../components/wallet/withdraws';
import SecurityTab from '../../../components/wallet/security';

type TabType = 'deposits' | 'withdrawals' | 'security';

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<TabType>('deposits');
  const [depositHistory, setDepositHistory] = useState<DepositHistoryResponse | null>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawHistoryResponse | null>(null);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWalletData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Starting to fetch wallet data...'); // Debug log
      
      const [deposits, withdrawals, security] = await Promise.all([
        getDepositHistory(),
        getWithdrawHistory(),
        getSecurityInfo(),
      ]);

      console.log('✅ Deposit data received:', deposits); // Debug log
      console.log('✅ Withdrawal data received:', withdrawals); // Debug log
      console.log('✅ Security data received:', security); // Debug log

      setDepositHistory(deposits);
      setWithdrawHistory(withdrawals);
      setSecurityInfo(security);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('❌ Error fetching wallet data:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const tabs = [
    { 
      id: 'deposits', 
      label: 'Deposits', 
      icon: TrendingUp,
      badge: depositHistory?.summary?.success || 0
    },
    { 
      id: 'withdrawals', 
      label: 'Withdrawals', 
      icon: CreditCard,
      badge: withdrawHistory?.summary?.completed || 0
    },
    { 
      id: 'security', 
      label: 'Security', 
      icon: Shield,
      badge: securityInfo?.isSecure ? 1 : 0
    },
  ];

  const renderTabContent = () => {
    console.log('🔄 Rendering tab:', activeTab, 'with deposit data:', depositHistory); // Debug log
    
    switch (activeTab) {
      case 'deposits':
        return <DepositsTab depositHistory={depositHistory} />;
      case 'withdrawals':
        return <WithdrawalsTab withdrawHistory={withdrawHistory} />;
      case 'security':
        return <SecurityTab securityInfo={securityInfo} />;
      default:
        return (
          <div className="bg-card border border-default rounded-lg p-8 text-center">
            <div className="text-muted">Select a tab to view content</div>
          </div>
        );
    }
  };

  return (
    <div className="bg-card max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-card-foreground">Wallet</h1>
          <p className="text-sm text-muted mt-1">
            {lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'No data loaded'}
          </p>
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

      {/* Debug Info - Remove this in production */}
      <div className="bg-muted p-4 rounded-lg text-sm">
        <details className="cursor-pointer">
          <summary className="text-muted-foreground font-medium mb-2">Debug Info (Click to expand)</summary>
          <div className="text-card-foreground space-y-1">
            <p>Active Tab: {activeTab}</p>
            <p>Deposits Data: {depositHistory ? `${depositHistory.total} deposits` : 'null'}</p>
            <p>Withdrawals Data: {withdrawHistory ? `${withdrawHistory.total} withdrawals` : 'null'}</p>
            <p>Security Data: {securityInfo ? 'Loaded' : 'null'}</p>
          </div>
        </details>
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
        {renderTabContent()}
      </div>
    </div>
  );
}