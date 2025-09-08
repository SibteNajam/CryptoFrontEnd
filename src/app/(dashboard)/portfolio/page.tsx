'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Wallet, 
  Clock, 
  History, 
  TrendingUp,
  Shield,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { getAccountInfo, getOpenOrders, getOrderHistory, AccountInfo, Order, Balance } from '../../../api/PortfolioApi';

type TabType = 'overview' | 'balances' | 'orders' | 'history';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [accountData, setAccountData] = useState<AccountInfo | null>(null);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Array<{ symbol: string; orders: Order[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const formatCurrency = (value: string | number, decimals = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatAmount = (value: string, asset: string) => {
    const num = parseFloat(value);
    if (asset === 'USDT' || asset === 'BUSD') {
      return num.toFixed(2);
    }
    if (num < 0.01) {
      return num.toFixed(8);
    }
    return num.toFixed(6);
  };

  const activeBalances = accountData?.balances.filter(
    balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
  ) || [];

  const filteredBalances = activeBalances.filter(balance =>
    balance.asset.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'balances', label: 'Balances', icon: Wallet },
    { id: 'orders', label: 'Open Orders', icon: Clock },
    { id: 'history', label: 'History', icon: History },
  ];

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
        {/* Overview Tab */}
        {activeTab === 'overview' && accountData && (
          <div className="space-y-6">
            {/* Account Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Account Type</p>
                    <p className="text-lg font-semibold text-gray-900">{accountData.accountType}</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Trading</p>
                    <div className="flex items-center gap-1">
                      {accountData.canTrade ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <p className="text-lg font-semibold text-gray-900">
                        {accountData.canTrade ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Maker Fee</p>
                    <p className="text-lg font-semibold text-gray-900">{(accountData.makerCommission / 10000).toFixed(2)}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Assets</p>
                    <p className="text-lg font-semibold text-gray-900">{activeBalances.length}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>

            {/* Top Assets */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Top Assets</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {activeBalances.slice(0, 5).map((balance) => {
                    const totalAmount = parseFloat(balance.free) + parseFloat(balance.locked);
                    
                    return (
                      <div key={balance.asset} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {balance.asset.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{balance.asset}</p>
                            <p className="text-sm text-gray-500">Available: {formatAmount(balance.free, balance.asset)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatAmount(totalAmount.toString(), balance.asset)}
                          </p>
                          {parseFloat(balance.locked) > 0 && (
                            <p className="text-sm text-orange-600">
                              Locked: {formatAmount(balance.locked, balance.asset)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Asset Balances</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Free</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Locked</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBalances.map((balance) => {
                    const totalAmount = parseFloat(balance.free) + parseFloat(balance.locked);
                    
                    return (
                      <tr key={balance.asset} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {balance.asset.slice(0, 2)}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{balance.asset}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatAmount(balance.free, balance.asset)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {parseFloat(balance.locked) > 0 ? (
                            <span className="text-orange-600">{formatAmount(balance.locked, balance.asset)}</span>
                          ) : (
                            <span className="text-gray-400">0.00</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatAmount(totalAmount.toString(), balance.asset)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Open Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Open Orders ({openOrders.length})</h3>
            </div>
            
            {openOrders.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No open orders</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Side</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {openOrders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            order.side === 'BUY' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {order.side}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {formatCurrency(order.origQty, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          ${formatCurrency(order.price, 2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.time).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Order History</h3>
            </div>
            
            {orderHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No order history</p>
              </div>
            ) : (
              <div className="space-y-6 p-6">
                {orderHistory.map((group) => (
                  <div key={group.symbol} className="border border-gray-200 rounded-lg">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">{group.symbol}</h4>
                      <p className="text-sm text-gray-500">{group.orders.length} orders</p>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {group.orders.slice(0, 5).map((order) => (
                        <div key={order.orderId} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                order.side === 'BUY' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {order.side}
                              </span>
                              <span className="text-sm text-gray-900">{order.type}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(order.executedQty, 8)} @ ${formatCurrency(order.price, 2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.time).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}