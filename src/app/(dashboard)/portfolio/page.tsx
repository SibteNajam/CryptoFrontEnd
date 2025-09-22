'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Wallet, Clock, History, XCircle, Activity, DollarSign } from 'lucide-react';
import { 
  getAccountInfo, 
  getOpenOrders, 
  getOrderHistory,
  getAccountSnapshot,
  getUserAssets,
  AccountInfo, 
  Order,
  AccountSnapshot,
  UserAsset
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
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshot | null>(null);
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
        // getOrderHistory()
      ]);

      setAccountData(accountInfo);
      setOpenOrders(openOrders);
      // setOrderHistory(orderHistory);
     
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch basic data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnhancedData = async () => {
    try {
      // Try to fetch real data, fallback to fake data
      let snapshot, assets ;
      
    try {
  snapshot = await getAccountSnapshot(
    'SPOT', 
    Date.now() - 30 * 24 * 60 * 60 * 1000, // startTime: 30 days ago
    Date.now(),                             // endTime: now
    30                                      // limit: max 30 days
  );
} catch {
  snapshot = generateFakeAccountSnapshot();
}

      try {
        assets = await getUserAssets();
      } catch {
        assets = generateFakeUserAssets();
      }
      setAccountSnapshot(snapshot);
      setUserAssets(assets);
    } catch (err) {
      console.error('Enhanced data fetch failed:', err);
    }
  };

  // Fake data generators for testnet
  const generateFakeAccountSnapshot = (): AccountSnapshot => {
    const now = Date.now();
    const snapshots = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = now - (i * 24 * 60 * 60 * 1000);
      const baseValue = 5000 + Math.sin(i * 0.2) * 500 + Math.random() * 200;
      
      snapshots.push({
        type: 'spot',
        updateTime: date,
        data: {
          balances: [
            { asset: 'BTC', free: '0.15234567', locked: '0.00000000' },
            { asset: 'ETH', free: '2.45678900', locked: '0.10000000' },
            { asset: 'USDT', free: baseValue.toFixed(2), locked: '0.00' },
            { asset: 'BNB', free: '12.34567890', locked: '0.00000000' },
          ],
          totalAssetOfBtc: (baseValue / 45000).toFixed(8),
        },
      });
    }

    return {
      code: 200,
      msg: '',
      snapshotVos: snapshots,
    };
  };

  const generateFakeUserAssets = (): UserAsset[] => {
    return [
      {
        asset: 'BTC',
        free: '0.15234567',
        locked: '0.00000000',
        freeze: '0.00000000',
        withdrawing: '0.00000000',
        btcValuation: '0.15234567',
        ipoable: '6855.50',
      },
      {
        asset: 'ETH',
        free: '2.45678900',
        locked: '0.10000000',
        freeze: '0.00000000',
        withdrawing: '0.00000000',
        btcValuation: '0.13978000',
        ipoable: '6392.00',
      },
      {
        asset: 'USDT',
        free: '2500.00',
        locked: '0.00',
        freeze: '0.00',
        withdrawing: '0.00',
        btcValuation: '0.05555556',
        ipoable: '2500.00',
      },
      {
        asset: 'BNB',
        free: '12.34567890',
        locked: '0.00000000',
        freeze: '0.00000000',
        withdrawing: '0.00000000',
        btcValuation: '0.08765432',
        ipoable: '3951.00',
      },
    ];
  };

  const generateFakeTransactionHistory = () => {
    const now = Date.now();
    
    const deposits = [
      {
        id: 'fake_deposit_1',
        amount: '1000.00',
        coin: 'USDT',
        network: 'TRC20',
        status: 1,
        address: 'TFakeAddress123456789',
        addressTag: '',
        txId: 'fake_tx_deposit_001',
        insertTime: now - (45 * 24 * 60 * 60 * 1000),
        transferType: 0,
        confirmTimes: '1/1',
      },
      {
        id: 'fake_deposit_2',
        amount: '0.05000000',
        coin: 'BTC',
        network: 'Bitcoin',
        status: 1,
        address: '1FakeBTCAddress123',
        addressTag: '',
        txId: 'fake_tx_deposit_002',
        insertTime: now - (30 * 24 * 60 * 60 * 1000),
        transferType: 0,
        confirmTimes: '3/3',
      },
      {
        id: 'fake_deposit_3',
        amount: '2000.00',
        coin: 'USDT',
        network: 'TRC20',
        status: 1,
        address: 'TFakeAddress123456789',
        addressTag: '',
        txId: 'fake_tx_deposit_003',
        insertTime: now - (5 * 24 * 60 * 60 * 1000),
        transferType: 0,
        confirmTimes: '1/1',
      },
    ];

    const withdrawals = [
      {
        id: 'fake_withdraw_1',
        amount: '200.00',
        transactionFee: '1.00',
        coin: 'USDT',
        status: 6,
        address: 'TFakeWithdrawAddr123',
        txId: 'fake_tx_withdraw_001',
        applyTime: (now - (25 * 24 * 60 * 60 * 1000)).toString(),
        network: 'TRC20',
        transferType: 1,
      },
      {
        id: 'fake_withdraw_2',
        amount: '0.01000000',
        transactionFee: '0.0005',
        coin: 'BTC',
        status: 6,
        address: '1FakeWithdrawBTC456',
        txId: 'fake_tx_withdraw_002',
        applyTime: (now - (18 * 24 * 60 * 60 * 1000)).toString(),
        network: 'Bitcoin',
        transferType: 1,
      },
    ];

    return {
      deposits,
      withdrawals,
      summary: {
        totalDeposits: deposits.length,
        totalWithdrawals: withdrawals.length,
      },
    };
  };

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
        return <PerformanceTab accountSnapshot={accountSnapshot} />;
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
      />
      default:
        return null;
    }
  };

  return (
    <div className="bg-card max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'No data loaded'}
          </p>
        </div>
        
        <button 
          onClick={() => {
            fetchBasicData();
            fetchEnhancedData();
          }} 
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'orders' && openOrders.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
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