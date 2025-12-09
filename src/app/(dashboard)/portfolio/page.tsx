// app/(dashboard)/portfolio/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, Wallet, Clock, History, XCircle, Activity, DollarSign } from 'lucide-react';
import {
  getAccountInfoByExchange,
  getUserAssetsByExchange,
  getOpenOrdersByExchange,
  getOrderHistory,
  getAccountSnapshotByExchange,
  NormalizedAccountInfo,
  NormalizedUserAsset,
  Order,
  BitgetOrder,
  AccountSnapshotResponse
} from '../../../infrastructure/api/PortfolioApi';
import OverviewTab from '../../../components/portfolio/overview';
import BalancesTab from '../../../components/portfolio/balances';
import OpenOrdersTab from '../../../components/portfolio/openOrders';
import FilledOrdersTab from '../../../components/portfolio/filledOrders';
import HistoryTab from '../../../components/portfolio/orderHistory';
import PerformanceTab from '../../../components/portfolio/performance';
import TransferHistoryTable from '@/components/portfolio/transferHistory';
// import TradeAnalysisTab from '../../../components/portfolio/tradeAnalysis';
import { useAppSelector } from '@/infrastructure/store/hooks';
import PerformanceAnalysis from '@/components/portfolio/performanceAnalysis';
import DbTradesTab from '@/components/portfolio/dbTrades';
// import TradeAnalysisTab from '@/components/portfolio/tradeAnalysis';

type TabType = 'overview' | 'balances' | 'orders' | 'filled' | 'db-trades' | 'history' | 'performance' | 'transfers' | 'trade-analysis';

export default function PortfolioPage() {
  // Get selected exchange from Redux - credentials are stored in backend database
  const { selectedExchange } = useAppSelector((state: any) => state.exchange);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔷 PORTFOLIO PAGE - Using JWT Token');
  console.log('   Selected Exchange:', selectedExchange);
  console.log('   Backend will fetch credentials from database using JWT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Backend fetches credentials from database using JWT token - no need to pass credentials
  
  // Cache utilities
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = (key: string) => `portfolio_${key}`;

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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [accountData, setAccountData] = useState<NormalizedAccountInfo | null>(null);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Array<{ symbol: string; orders: Order[] }>>([]);
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshotResponse | null>(null);
  const [userAssets, setUserAssets] = useState<NormalizedUserAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchBasicData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FETCH BASIC DATA - Starting fetch...');
    console.log('   Exchange:', selectedExchange);
    console.log('   Force Refresh:', forceRefresh);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedAccount = getCachedData(`account_${selectedExchange}`);
        const cachedOrders = getCachedData(`orders_${selectedExchange}`);

        if (cachedAccount && cachedOrders) {
          console.log('✅ Using cached data for', selectedExchange);
          setAccountData(cachedAccount);
          setOpenOrders(cachedOrders);
          setLastUpdate(new Date());

          // Load enhanced data in background
          fetchEnhancedData();
          setLoading(false);
          return;
        } else {
          console.log('❌ No cached data found for', selectedExchange, ', fetching fresh data...');
        }
      } else {
        console.log('🔄 Force refresh - bypassing cache');
      }

      console.log(`🌐 Calling API for exchange: ${selectedExchange}`);
      console.log(`🔐 Using JWT token - backend will fetch credentials from database`);

      // Load critical data first (account info and open orders)
      const [accountInfo, openOrdersData] = await Promise.all([
        getAccountInfoByExchange(selectedExchange as 'binance' | 'bitget'),
        getOpenOrdersByExchange(selectedExchange as 'binance' | 'bitget'),
      ]);

      console.log('✅ API Response received:');
      console.log('   Account Info:', {
        exchange: accountInfo.exchange,
        accountType: accountInfo.accountType,
        balancesCount: accountInfo.balances.length,
        balances: accountInfo.balances.slice(0, 3) // First 3 balances
      });
      console.log('   Open Orders:', openOrdersData.length);

      setAccountData(accountInfo);
      setOpenOrders(openOrdersData as Order[]);

      // Cache the data with exchange-specific keys
      setCachedData(`account_${selectedExchange}`, accountInfo);
      setCachedData(`orders_${selectedExchange}`, openOrdersData);

      setLastUpdate(new Date());

      // Load enhanced data in background (non-blocking)
      fetchEnhancedData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch basic data');
    } finally {
      setLoading(false);
    }
  }, [selectedExchange]); // Backend handles credentials from database

  const fetchEnhancedData = useCallback(async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 FETCH ENHANCED DATA - Starting...');
    console.log('   Exchange:', selectedExchange);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Load snapshot data (for performance tab)
      try {
        setSnapshotLoading(true);
        console.log(`🌐 Fetching account snapshot from ${selectedExchange}...`);
        console.log(`🔐 Using JWT - backend will fetch credentials from database`);
        const snapshot = await getAccountSnapshotByExchange(
          selectedExchange as 'binance' | 'bitget'
        );
        console.log('✅ Snapshot loaded:', {
          exchange: selectedExchange,
          totalSnapshots: snapshot.totalSnapshots,
          currentValue: snapshot.currentValue
        });
        setAccountSnapshot(snapshot);
      } catch (error) {
        console.warn('⚠️ Failed to fetch account snapshot:', error);
      } finally {
        setSnapshotLoading(false);
      }

      // Load user assets (for balances tab)
      try {
        setAssetsLoading(true);
        console.log(`🌐 Fetching user assets from ${selectedExchange}...`);
        console.log(`🔐 Using JWT - backend will fetch credentials from database`);
        const assets = await getUserAssetsByExchange(
          selectedExchange as 'binance' | 'bitget'
        );
        console.log('✅ User Assets Response:', {
          exchange: selectedExchange,
          count: assets.length,
          firstAsset: assets[0],
          assets: assets.slice(0, 3) // First 3 assets
        });
        setUserAssets(assets);
      } catch (error) {
        console.error('❌ Failed to fetch user assets:', error);
      } finally {
        setAssetsLoading(false);
      }
    } catch (err) {
      console.error('❌ Enhanced data fetch failed:', err);
    }
  }, [selectedExchange]); // Backend handles credentials from database

  // Remove the old fake snapshot generator since we're using real data
  // const generateFakeAccountSnapshot = (): AccountSnapshot => {
  //   // ... remove this entirely
  // };

  useEffect(() => {
    // Start fetching immediately but don't block rendering
    fetchBasicData();
  }, [fetchBasicData]);

  // Refetch when exchange changes
  useEffect(() => {
    console.log('� EXCHANGE CHANGE DETECTED!');
    console.log('   New Exchange:', selectedExchange);
    console.log('   Triggering force refresh...');
    fetchBasicData(true); // Force refresh on exchange change
  }, [selectedExchange, fetchBasicData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    // { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'balances', label: 'Balances', icon: Wallet },
    { id: 'orders', label: 'Open Orders', icon: Clock },
    { id: 'filled', label: 'Filled Orders', icon: DollarSign },
    { id: 'db-trades', label: 'DB Trades', icon: Activity },
    { id: 'trade-analysis', label: 'Trade Analysis', icon: TrendingUp },
    { id: 'history', label: 'History', icon: History },
    // { id: 'transfers', label: 'Transfers', icon: History },
  ];

  const renderTabContent = () => {
    // Show loading for overview and orders if no data yet
    if (loading && !accountData && !openOrders.length) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading portfolio data...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab accountData={accountData} />;
      // case 'performance':
      //   if (snapshotLoading && !accountSnapshot) {
      //     return (
      //       <div className="flex items-center justify-center py-8">
      //         <div className="text-center">
      //           <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      //           <p className="text-muted-foreground">Loading performance data...</p>
      //         </div>
      //       </div>
      //     );
      //   }
      //   return <PerformanceTab snapshotData={accountSnapshot} />;
      case 'balances':
        if (assetsLoading && !userAssets.length) {
          return (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading balances...</p>
              </div>
            </div>
          );
        }
        return <BalancesTab userAssets={userAssets} btcPrice={117300} />;
      case 'orders':
        return <OpenOrdersTab openOrders={openOrders} />;
      case 'filled':
        return <FilledOrdersTab />;
      case 'db-trades':
        return <DbTradesTab selectedExchange={selectedExchange} />;
      case 'trade-analysis':
        return <PerformanceAnalysis />;
      case 'history':
        return <HistoryTab orderHistory={orderHistory} />;
      // case 'transfers':
      //   return <TransferHistoryTable 
      //     current={1}
      //     size={50}
      //     onDataLoaded={(data) => {
      //       console.log('Transfer data loaded:', data);
      //     }}
      //   />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card max-w-7xl mx-auto p-6 space-y-6">
      {/* Header - Always visible */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-card-foreground flex items-center gap-2">
            Portfolio
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium uppercase">
              {selectedExchange}
            </span>
          </h1>
          <p className="text-sm text-muted mt-1">
            {loading && !lastUpdate ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                Loading data...
              </span>
            ) : (
              lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'No data loaded'
            )}
          </p>
        </div>

        <button
          onClick={() => {
            fetchBasicData(true);
            fetchEnhancedData();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-default rounded-lg hover:bg-muted disabled:opacity-50 transition-colors text-sm font-medium text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Separator Line */}
      {/* <div className="border-b border-default"></div> */}

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
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isActive
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

      {/* Separator Line */}
      <div className="border-b border-default"></div>

      {/* Tab Content */}
      <div className="h-full">
        {renderTabContent()}
      </div>
    </div>
  );
}