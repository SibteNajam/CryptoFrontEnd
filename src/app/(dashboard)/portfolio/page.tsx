// app/(dashboard)/portfolio/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Wallet, Clock, History, XCircle, Activity, DollarSign } from 'lucide-react';
import { 
  getAccountInfo, 
  getOpenOrders, 
  getOrderHistory,
  getAccountSnapshot,  // This now returns AccountSnapshotResponse
  getUserAssets,
  AccountInfo, 
  Order,
  UserAsset,
  AccountSnapshotResponse  // Use this type
} from '../../../infrastructure/api/PortfolioApi';
import OverviewTab from '../../../components/portfolio/overview';
import BalancesTab from '../../../components/portfolio/balances';
import OpenOrdersTab from '../../../components/portfolio/openOrders';
import HistoryTab from '../../../components/portfolio/orderHistory';
import PerformanceTab from '../../../components/portfolio/performance';
import TransferHistoryTable from '@/components/portfolio/transferHistory';

type TabType = 'overview' | 'balances' | 'orders' | 'history' | 'performance' | 'transfers';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [accountData, setAccountData] = useState<AccountInfo | null>(null);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Array<{ symbol: string; orders: Order[] }>>([]);
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshotResponse | null>(null); // Fixed type
  const [userAssets, setUserAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchBasicData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [accountInfo, openOrders] = await Promise.all([
        getAccountInfo(),
        getOpenOrders(),
      ]);

      setAccountData(accountInfo);
      setOpenOrders(openOrders);
     
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch basic data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnhancedData = async () => {
    try {
      let snapshot, assets;
      
      try {
        snapshot = await getAccountSnapshot(); // Now returns AccountSnapshotResponse
        console.log('✅ Real snapshot data loaded:', snapshot);
      } catch (error) {
        console.warn('Failed to fetch real snapshot, using fallback');
        snapshot = null; // Don't use fake data for real API
      }

      try {
        assets = await getUserAssets();
      } catch (error) {
        console.warn('Failed to fetch assets, using fake data');
      }

      setAccountSnapshot(snapshot);
      setUserAssets(assets ?? []);
    } catch (err) {
      console.error('Enhanced data fetch failed:', err);
    }
  };

  // Remove the old fake snapshot generator since we're using real data
  // const generateFakeAccountSnapshot = (): AccountSnapshot => {
  //   // ... remove this entirely
  // };

  useEffect(() => {
    fetchBasicData();
    fetchEnhancedData();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'balances', label: 'Balances', icon: Wallet },
    { id: 'orders', label: 'Open Orders', icon: Clock },
    { id: 'history', label: 'History', icon: History },
    { id: 'transfers', label: 'Transfers', icon: History },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab accountData={accountData} />;
      case 'performance':
        return <PerformanceTab snapshotData={accountSnapshot} />; // Pass snapshotData
      case 'balances':
        return <BalancesTab userAssets={userAssets} btcPrice={117300} />;
      case 'orders':
        return <OpenOrdersTab openOrders={openOrders} />;
      case 'history':
        return <HistoryTab orderHistory={orderHistory} />;
      case 'transfers':
        return <TransferHistoryTable 
          current={1}
          size={50}
          onDataLoaded={(data) => {
            console.log('Transfer data loaded:', data);
          }}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-card-foreground">Portfolio</h1>
          <p className="text-sm text-muted mt-1">
            {lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'No data loaded'}
          </p>
        </div>
        
        <button 
          onClick={() => {
            fetchBasicData();
            fetchEnhancedData();
          }} 
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
            <XCircle className="h-5 w-5 text-danger" />
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
                {tab.id === 'orders' && openOrders.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground py-0.5 px-2 rounded-full text-xs">
                    {openOrders.length}
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