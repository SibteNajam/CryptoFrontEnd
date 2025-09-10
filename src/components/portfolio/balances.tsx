'use client';

import React, { useState, useMemo } from 'react';
import { Search, Wallet, TrendingUp, TrendingDown, Eye, EyeOff, Filter, Download, Star, Zap, DollarSign, PieChart, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AccountInfo } from '../../api/PortfolioApi';

interface BalancesTabProps {
  accountData: AccountInfo | null;
}

export default function BalancesTab({ accountData }: BalancesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [sortBy, setSortBy] = useState<'asset' | 'total' | 'value'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showValues, setShowValues] = useState(true);

  // Mock price data - In real app, you'd fetch this from API
  const mockPrices: Record<string, number> = {
    'BTC': 45000,
    'ETH': 3200,
    'BNB': 320,
    'ADA': 0.45,
    'SOL': 98,
    'USDT': 1,
    'USDC': 1,
    'BUSD': 1,
    'DOT': 6.5,
    'MATIC': 0.85,
  };

  const getMockPrice = (asset: string) => mockPrices[asset] || Math.random() * 100;

  if (!accountData) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border border-blue-200 shadow-xl">
        <div className="text-center py-16">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin mx-auto opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Loading your portfolio...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching real-time data</p>
        </div>
      </div>
    );
  }

  const formatAmount = (value: string, asset: string) => {
    const num = parseFloat(value);
    if (asset === 'USDT' || asset === 'BUSD' || asset === 'USDC') {
      return num.toFixed(2);
    }
    if (num < 0.01) {
      return num.toFixed(8);
    }
    return num.toFixed(6);
  };

  const formatValue = (amount: number, price: number) => {
    const value = amount * price;
    if (value < 0.01) return '$0.00';
    if (value < 1) return `$${value.toFixed(4)}`;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getAssetIcon = (asset: string) => {
    const colors = {
      'BTC': 'bg-gradient-to-br from-orange-400 to-orange-600',
      'ETH': 'bg-gradient-to-br from-blue-400 to-blue-600',
      'BNB': 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'USDT': 'bg-gradient-to-br from-green-400 to-green-600',
      'USDC': 'bg-gradient-to-br from-blue-400 to-blue-600',
      'BUSD': 'bg-gradient-to-br from-yellow-400 to-orange-500',
      'ADA': 'bg-gradient-to-br from-blue-500 to-indigo-600',
      'SOL': 'bg-gradient-to-br from-purple-400 to-purple-600',
      'DOT': 'bg-gradient-to-br from-pink-400 to-pink-600',
      'MATIC': 'bg-gradient-to-br from-purple-500 to-indigo-600',
    };
    
    return colors[asset as keyof typeof colors] || 'bg-gradient-to-br from-gray-400 to-gray-600';
  };

  const activeBalances = useMemo(() => {
    let balances = accountData.balances.filter(
      balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
    );

    if (hideSmallBalances) {
      balances = balances.filter(balance => {
        const total = parseFloat(balance.free) + parseFloat(balance.locked);
        const price = getMockPrice(balance.asset);
        return total * price >= 1;
      });
    }

    return balances;
  }, [accountData.balances, hideSmallBalances]);

  const filteredAndSortedBalances = useMemo(() => {
    let filtered = activeBalances.filter(balance =>
      balance.asset.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'asset':
          aValue = a.asset;
          bValue = b.asset;
          break;
        case 'total':
          aValue = parseFloat(a.free) + parseFloat(a.locked);
          bValue = parseFloat(b.free) + parseFloat(b.locked);
          break;
        case 'value':
          aValue = (parseFloat(a.free) + parseFloat(a.locked)) * getMockPrice(a.asset);
          bValue = (parseFloat(b.free) + parseFloat(b.locked)) * getMockPrice(b.asset);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      }
      
      return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [activeBalances, searchTerm, sortBy, sortOrder]);

  const totalPortfolioValue = useMemo(() => {
    return activeBalances.reduce((total, balance) => {
      const amount = parseFloat(balance.free) + parseFloat(balance.locked);
      const price = getMockPrice(balance.asset);
      return total + (amount * price);
    }, 0);
  }, [activeBalances]);

  const topAssets = useMemo(() => {
    return filteredAndSortedBalances.slice(0, 3).map(balance => {
      const total = parseFloat(balance.free) + parseFloat(balance.locked);
      const price = getMockPrice(balance.asset);
      const value = total * price;
      return {
        asset: balance.asset,
        value,
        percentage: (value / totalPortfolioValue) * 100
      };
    });
  }, [filteredAndSortedBalances, totalPortfolioValue]);

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {filteredAndSortedBalances.map((balance) => {
        const totalAmount = parseFloat(balance.free) + parseFloat(balance.locked);
        const price = getMockPrice(balance.asset);
        const value = totalAmount * price;
        const change = (Math.random() - 0.5) * 20; // Mock 24h change
        
        return (
          <div key={balance.asset} className="bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden group">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getAssetIcon(balance.asset)} shadow-lg`}>
                    <span className="text-sm font-bold text-white">
                      {balance.asset.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{balance.asset}</h3>
                    <p className="text-sm text-gray-500">Cryptocurrency</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(change).toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAmount(totalAmount.toString(), balance.asset)}</p>
                  {showValues && <p className="text-sm text-gray-600">{formatValue(totalAmount, price)}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Available</p>
                    <p className="text-sm font-medium text-gray-900">{formatAmount(balance.free, balance.asset)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Locked</p>
                    <p className={`text-sm font-medium ${parseFloat(balance.locked) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {parseFloat(balance.locked) > 0 ? formatAmount(balance.locked, balance.asset) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
          </div>
        );
      })}
    </div>
  );

  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
            <th className="px-6 py-4 text-left">
              <button
                onClick={() => {
                  setSortBy('asset');
                  setSortOrder(sortBy === 'asset' && sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
              >
                Asset
                {sortBy === 'asset' && (
                  <div className={`transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                    <ArrowUpRight size={14} />
                  </div>
                )}
              </button>
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Available
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Locked
            </th>
            <th className="px-6 py-4 text-right">
              <button
                onClick={() => {
                  setSortBy('total');
                  setSortOrder(sortBy === 'total' && sortOrder === 'desc' ? 'asc' : 'desc');
                }}
                className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors ml-auto"
              >
                Total Balance
                {sortBy === 'total' && (
                  <div className={`transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                    <ArrowUpRight size={14} />
                  </div>
                )}
              </button>
            </th>
            <th className="px-6 py-4 text-right">
              <button
                onClick={() => {
                  setSortBy('value');
                  setSortOrder(sortBy === 'value' && sortOrder === 'desc' ? 'asc' : 'desc');
                }}
                className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors ml-auto"
              >
                Value
                {sortBy === 'value' && (
                  <div className={`transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                    <ArrowUpRight size={14} />
                  </div>
                )}
              </button>
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              24h Change
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredAndSortedBalances.map((balance, index) => {
            const totalAmount = parseFloat(balance.free) + parseFloat(balance.locked);
            const price = getMockPrice(balance.asset);
            const value = totalAmount * price;
            const change = (Math.random() - 0.5) * 20; // Mock 24h change
            
            return (
              <tr key={balance.asset} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${getAssetIcon(balance.asset)} shadow-md group-hover:shadow-lg transition-shadow`}>
                        <span className="text-sm font-bold text-white">
                          {balance.asset.slice(0, 2)}
                        </span>
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                          <Star size={10} className="text-white fill-current" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 text-lg">{balance.asset}</span>
                      <div className="text-sm text-gray-500">Rank #{index + 1}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatValue(1, price).replace('$', '$')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                  {formatAmount(balance.free, balance.asset)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {parseFloat(balance.locked) > 0 ? (
                    <span className="text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-lg">
                      {formatAmount(balance.locked, balance.asset)}
                    </span>
                  ) : (
                    <span className="text-gray-400">0.00</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {formatAmount(totalAmount.toString(), balance.asset)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {showValues ? formatValue(totalAmount, price) : '••••••'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {((value / totalPortfolioValue) * 100).toFixed(1)}% of portfolio
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className={`flex items-center justify-end gap-1 text-sm font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>
                  <div className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {change >= 0 ? '+' : ''}{formatValue(totalAmount * price * (change / 100), 1)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-blue-200" />
            <div className="text-right">
              <p className="text-blue-200 text-sm font-medium">Total Portfolio</p>
              <p className="text-3xl font-bold">
                {showValues ? `$${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••••'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-200 text-sm">
            <TrendingUp size={16} />
            <span>+12.5% (24h)</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <PieChart className="h-8 w-8 text-green-200" />
            <div className="text-right">
              <p className="text-green-200 text-sm font-medium">Active Assets</p>
              <p className="text-3xl font-bold">{filteredAndSortedBalances.length}</p>
            </div>
          </div>
          <div className="text-green-200 text-sm">
            {activeBalances.length} total holdings
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="h-8 w-8 text-purple-200" />
            <div className="text-right">
              <p className="text-purple-200 text-sm font-medium">Top Asset</p>
              <p className="text-2xl font-bold">{topAssets[0]?.asset || 'N/A'}</p>
            </div>
          </div>
          <div className="text-purple-200 text-sm">
            {topAssets[0]?.percentage.toFixed(1)}% of portfolio
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <Zap className="h-8 w-8 text-orange-200" />
            <div className="text-right">
              <p className="text-orange-200 text-sm font-medium">Diversification</p>
              <p className="text-2xl font-bold">
                {filteredAndSortedBalances.length > 5 ? 'High' : filteredAndSortedBalances.length > 2 ? 'Medium' : 'Low'}
              </p>
            </div>
          </div>
          <div className="text-orange-200 text-sm">
            Risk level: Balanced
          </div>
        </div>
      </div>

      {/* Main Balances Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Asset Portfolio ({filteredAndSortedBalances.length})
              </h3>
              <p className="text-gray-600">Manage and monitor your cryptocurrency holdings</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm min-w-[200px]"
                />
              </div>
              
              <button
                onClick={() => setShowValues(!showValues)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  showValues 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showValues ? <Eye size={18} /> : <EyeOff size={18} />}
                {showValues ? 'Hide' : 'Show'} Values
              </button>
              
              <button
                onClick={() => setHideSmallBalances(!hideSmallBalances)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  hideSmallBalances 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Filter size={18} />
                Hide Small
              </button>
              
              <div className="flex bg-gray-200 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    viewMode === 'table' 
                      ? 'bg-white text-gray-900 shadow-md' 
                      : 'text-gray-600'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-md' 
                      : 'text-gray-600'
                  }`}
                >
                  Grid
                </button>
              </div>
              
              <button className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition-all shadow-lg">
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>
        
        {filteredAndSortedBalances.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="relative mb-6">
              <Wallet className="h-20 w-20 text-gray-300 mx-auto" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20 animate-ping"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No assets found' : 'No active balances'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms or check the spelling' 
                : 'Start trading to see your portfolio here'
              }
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'table' ? <TableView /> : <GridView />}
          </>
        )}
      </div>
    </div>
  );
}