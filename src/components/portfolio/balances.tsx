'use client';

import React, { useState, useMemo } from 'react';
import { Search, Eye, EyeOff, Filter, Download, TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { AccountInfo } from '../../api/PortfolioApi';

interface BalancesTabProps {
  accountData: AccountInfo | null;
}

export default function BalancesTab({ accountData }: BalancesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [sortBy, setSortBy] = useState<'asset' | 'total' | 'value'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
      <div className="bg-card rounded-lg border border-default p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading your balances...</p>
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

  const handleSort = (column: 'asset' | 'total' | 'value') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="h-full space-y-4">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Portfolio</p>
              <p className="text-2xl font-semibold text-primary">
                {showValues ? `$${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••••'}
              </p>
            </div>
            <div className="text-success text-sm flex items-center gap-1">
              <TrendingUp size={16} />
              +12.5%
            </div>
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Active Assets</p>
              <p className="text-2xl font-semibold text-primary">{filteredAndSortedBalances.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Largest Holding</p>
              <p className="text-2xl font-semibold text-primary">
                {filteredAndSortedBalances[0]?.asset || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border border-default rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-input border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowValues(!showValues)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showValues 
                  ? 'bg-primary text-white' 
                  : 'bg-muted text-muted-foreground hover-bg-blue-50'
              }`}
            >
              {showValues ? <Eye size={16} /> : <EyeOff size={16} />}
              {showValues ? 'Hide' : 'Show'}
            </button>
            
            <button
              onClick={() => setHideSmallBalances(!hideSmallBalances)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                hideSmallBalances 
                  ? 'bg-primary text-white' 
                  : 'bg-muted text-muted-foreground hover-bg-blue-50'
              }`}
            >
              <Filter size={16} />
              Filter
            </button>
            
            <button className="flex items-center gap-2 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover-bg-green-600 transition-colors">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Balances Table */}
      <div className="bg-card border border-default rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-default">
          <h3 className="text-lg font-medium text-primary">
            Asset Portfolio ({filteredAndSortedBalances.length})
          </h3>
        </div>
        
        {filteredAndSortedBalances.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? 'No assets found matching your search' : 'No active balances'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted text-left">
                  <th 
                    className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover-bg-gray-200"
                    onClick={() => handleSort('asset')}
                  >
                    <div className="flex items-center gap-1">
                      Asset
                      {sortBy === 'asset' && (
                        <div className={`transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                          <TrendingUp size={12} />
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Price
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Available
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Locked
                  </th>
                  <th 
                    className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right cursor-pointer hover-bg-gray-200"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total
                      {sortBy === 'total' && (
                        <div className={`transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                          <TrendingUp size={12} />
                        </div>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right cursor-pointer hover-bg-gray-200"
                    onClick={() => handleSort('value')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Value
                      {sortBy === 'value' && (
                        <div className={`transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
                          <TrendingUp size={12} />
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    24h Change
                  </th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {filteredAndSortedBalances.map((balance) => {
                  const totalAmount = parseFloat(balance.free) + parseFloat(balance.locked);
                  const price = getMockPrice(balance.asset);
                  const value = totalAmount * price;
                  const change = (Math.random() - 0.5) * 20; // Mock 24h change
                  const portfolioPercent = ((value / totalPortfolioValue) * 100);
                  
                  return (
                    <tr key={balance.asset} className="hover-bg-blue-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {balance.asset.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-primary">{balance.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {portfolioPercent.toFixed(1)}% of portfolio
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-secondary">
                          ${price.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-secondary">
                        {formatAmount(balance.free, balance.asset)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {parseFloat(balance.locked) > 0 ? (
                          <span className="text-warning font-medium">
                            {formatAmount(balance.locked, balance.asset)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-primary">
                          {formatAmount(totalAmount.toString(), balance.asset)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-primary">
                          {showValues ? formatValue(totalAmount, price) : '••••••'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`flex items-center justify-end gap-1 text-sm font-medium ${
                          change >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-muted-foreground hover-text-gray-700 p-1">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}