'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Wallet, Clock, History, XCircle } from 'lucide-react';
import { getAccountInfo, getOpenOrders, getOrderHistory, AccountInfo, Order } from '../../../api/PortfolioApi';
import BalancesTab from '@/components/portfolio/balances';
import OverviewTab from '@/components/portfolio/overview';
import HistoryTab from '@/components/portfolio/orderHistory';
import OpenOrdersTab from '@/components/portfolio/openOrders';
type TabType = 'overview' | 'balances' | 'orders' | 'history';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [accountData, setAccountData] = useState<AccountInfo | null>(null);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Array<{ symbol: string; orders: Order[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [accountInfo, orders, history] = await Promise.all([
        getAccountInfo(),
        getOpenOrders(),
        getOrderHistory()
      ]);

      setAccountData(accountInfo);
      setOpenOrders(orders);
      setOrderHistory(history);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'balances', label: 'Balances', icon: Wallet },
    { id: 'orders', label: 'Open Orders', icon: Clock },
    { id: 'history', label: 'History', icon: History },
  ];

  const renderTabContent = () => {
    if (!accountData && activeTab !== 'orders' && activeTab !== 'history') {
      return <div className="text-center py-12 text-gray-500">Loading account data...</div>;
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab accountData={accountData} />;
      case 'balances':
        return <BalancesTab accountData={accountData} />;
      case 'orders':
        return <OpenOrdersTab openOrders={openOrders} />;
      case 'history':
        return <HistoryTab orderHistory={orderHistory} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'No data loaded'}
          </p>
        </div>
        
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
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
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
}