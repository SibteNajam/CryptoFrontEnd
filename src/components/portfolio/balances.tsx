'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Eye, EyeOff, Filter, Download, MoreVertical, TrendingUp, RefreshCw } from 'lucide-react';
import { NormalizedUserAsset } from '../../infrastructure/api/PortfolioApi';

interface BalancesTabProps {
  userAssets: NormalizedUserAsset[];
  btcPrice: number;
}

interface BGBConvertCoin {
  coin: string;
  available: string;
  bgbEstAmount: string;
  precision: string;
  feeDetail: Array<{
    feeRate: string;
    fee: string;
  }>;
  cTime: string;
}

export default function BalancesTab({ userAssets, btcPrice = 117200 }: BalancesTabProps) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💼 BALANCES TAB - Rendering');
  console.log('   User Assets Count:', userAssets?.length || 0);
  console.log('   First Asset:', userAssets?.[0]);
  console.log('   Exchange Tag:', userAssets?.[0]?.exchange);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const [searchTerm, setSearchTerm] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [sortBy, setSortBy] = useState<'asset' | 'total' | 'value'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showValues, setShowValues] = useState(true);

  // BGB Conversion state
  const [convertibleCurrencies, setConvertibleCurrencies] = useState<BGBConvertCoin[]>([]);
  const [selectedCoinsForConvert, setSelectedCoinsForConvert] = useState<Set<string>>(new Set());
  const [convertLoading, setConvertLoading] = useState(false);

  if (!userAssets) {
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

  const getValueInUsd = (asset: NormalizedUserAsset) => {
    // If usdValue is already calculated (from Bitget with prices), use it
    if (asset.usdValue !== undefined && asset.usdValue !== null) {
      return asset.usdValue;
    }

    // Legacy calculation for Binance or when usdValue not available
    const total = parseFloat(asset.free) + parseFloat(asset.locked) + parseFloat(asset.freeze) +
      parseFloat(asset.withdrawing) + parseFloat(asset.ipoable);

    // Use btcValuation if available (Binance provides this)
    if (asset.btcValuation && parseFloat(asset.btcValuation) > 0) {
      return parseFloat(asset.btcValuation) * btcPrice;
    }

    // Fallback: assume stablecoins are $1
    if (['USDT', 'BUSD', 'USDC', 'DAI', 'TUSD', 'USDP'].includes(asset.asset)) {
      return total;
    }

    return 0;
  };

  const getTotalAmount = (asset: NormalizedUserAsset) => {
    return parseFloat(asset.free) + parseFloat(asset.locked) + parseFloat(asset.freeze) +
      parseFloat(asset.withdrawing) + parseFloat(asset.ipoable);
  };

  // Fetch convertible currencies from Bitget API
  const fetchConvertibleCurrencies = async () => {
    try {
      const response = await fetch('/api/bitget/account/bgb-convert-coin-list');
      const data = await response.json();

      if (data.success && data.data && data.data.coinList) {
        setConvertibleCurrencies(data.data.coinList);
      } else {
        console.warn('Failed to fetch convertible currencies:', data.error);
        setConvertibleCurrencies([]);
      }
    } catch (err) {
      console.warn('Error fetching convertible currencies:', err);
      setConvertibleCurrencies([]);
    }
  };

  // Handle BGB conversion
  const handleConvertToBGB = async () => {
    if (selectedCoinsForConvert.size === 0) {
      alert('Please select at least one coin to convert');
      return;
    }

    const coinNames = Array.from(selectedCoinsForConvert);
    const totalCoins = coinNames.length;

    if (!confirm(`Convert ${totalCoins} coin${totalCoins !== 1 ? 's' : ''} to BGB?\n\n${coinNames.join(', ')}`)) {
      return;
    }

    setConvertLoading(true);

    try {
      const response = await fetch('/api/bitget/account/bgb-convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinList: coinNames }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Successfully converted ${totalCoins} coin${totalCoins !== 1 ? 's' : ''} to BGB`);
        // Clear selections and refresh data
        setSelectedCoinsForConvert(new Set());
        // Trigger parent refresh if needed
        window.location.reload();
      } else {
        alert(`❌ Convert Failed\n\n${data.error || 'Failed to convert to BGB'}`);
      }
    } catch (err: any) {
      const errorMsg = 'Network error. Please try again.';
      console.error('❌ Network error converting to BGB:', err);
      alert(`❌ Network Error\n\n${errorMsg}`);
    } finally {
      setConvertLoading(false);
    }
  };

  // Helper to check if a coin is convertible to BGB
  const isConvertible = (coin: string): boolean => {
    return convertibleCurrencies.some(currency => currency.coin === coin);
  };

  // Helper to toggle coin selection for conversion
  const toggleCoinSelection = (coin: string) => {
    const newSelection = new Set(selectedCoinsForConvert);
    if (newSelection.has(coin)) {
      newSelection.delete(coin);
    } else {
      newSelection.add(coin);
    }
    setSelectedCoinsForConvert(newSelection);
  };

  // Fetch convertible currencies on mount
  useEffect(() => {
    fetchConvertibleCurrencies();
  }, []);

  const activeBalances = useMemo(() => {
    let balances = userAssets.filter(
      (balance) =>
        parseFloat(balance.free) > 0 ||
        parseFloat(balance.locked) > 0 ||
        parseFloat(balance.freeze) > 0 ||
        parseFloat(balance.withdrawing) > 0 ||
        parseFloat(balance.ipoable) > 0
    );

    if (hideSmallBalances) {
      balances = balances.filter((balance) => getValueInUsd(balance) >= 1);
    }

    return balances;
  }, [userAssets, hideSmallBalances]);

  const filteredAndSortedBalances = useMemo(() => {
    let filtered = activeBalances.filter((balance) =>
      balance.asset.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortBy) {
        case 'asset':
          aValue = a.asset;
          bValue = b.asset;
          break;
        case 'total':
          aValue = getTotalAmount(a);
          bValue = getTotalAmount(b);
          break;
        case 'value':
          aValue = getValueInUsd(a);
          bValue = getValueInUsd(b);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [activeBalances, searchTerm, sortBy, sortOrder]);

  const totalPortfolioValue = useMemo(() => {
    return activeBalances.reduce((total, balance) => total + getValueInUsd(balance), 0);
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
      {/* Portfolio Summary - Previous Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Portfolio</p>
              <p className="text-2xl font-semibold text-primary">
                {showValues
                  ? `$${totalPortfolioValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : '••••••••'}
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

      {/* Separator Line */}
      <div className="border-b border-default"></div>

      {/* Controls - Previous Layout */}
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showValues
                ? 'bg-primary text-white'
                : 'bg-muted text-card-foreground hover:bg-muted/80 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {showValues ? <Eye size={16} /> : <EyeOff size={16} />}
              {showValues ? 'Hide' : 'Show'}
            </button>

            <button
              onClick={() => setHideSmallBalances(!hideSmallBalances)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hideSmallBalances
                ? 'bg-primary text-white'
                : 'bg-muted text-card-foreground hover:bg-muted/80 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
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

      {/* Balances Table - API Columns Only (7 Total) */}
      <div className="bg-card border border-default rounded-lg overflow-hidden">
        <div className="px-4 py-3">
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
                    Free
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Locked
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Frozen
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
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                    Convert to BGB
                  </th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedBalances.map((balance) => {
                  const totalAmount = getTotalAmount(balance);
                  const usdValue = getValueInUsd(balance);
                  const portfolioPercent = totalPortfolioValue > 0 ? (usdValue / totalPortfolioValue) * 100 : 0;

                  return (
                    <tr key={balance.asset} className="hover:bg-blue-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {balance.asset.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-primary">{balance.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {portfolioPercent.toFixed(1)}% of portfolio
                              {balance.pricePerUnit !== undefined && balance.pricePerUnit > 0 && (
                                <span className="ml-2">• ${balance.pricePerUnit.toFixed(balance.pricePerUnit < 1 ? 4 : 2)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Free */}
                      <td className="px-4 py-3 text-right text-secondary">
                        {formatAmount(balance.free, balance.asset)}
                      </td>
                      {/* Locked */}
                      <td className="px-4 py-3 text-right">
                        {parseFloat(balance.locked) > 0 ? (
                          <span className="text-warning font-medium">
                            {formatAmount(balance.locked, balance.asset)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00</span>
                        )}
                      </td>
                      {/* Frozen */}
                      <td className="px-4 py-3 text-right">
                        {parseFloat(balance.freeze) > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {formatAmount(balance.freeze, balance.asset)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.00</span>
                        )}
                      </td>
                      {/* Total */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-primary">
                          {formatAmount(totalAmount.toString(), balance.asset)}
                        </div>
                      </td>
                      {/* Value */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-primary">
                          {showValues
                            ? `$${usdValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                            : '••••••'}
                        </div>
                      </td>
                      {/* Convert to BGB Checkbox */}
                      <td className="px-4 py-3 text-center">
                        {balance.asset !== 'USDT' && balance.asset !== 'BGB' && isConvertible(balance.asset) && parseFloat(balance.free) > 0 ? (
                          <input
                            type="checkbox"
                            checked={selectedCoinsForConvert.has(balance.asset)}
                            onChange={() => toggleCoinSelection(balance.asset)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button className="text-muted-foreground hover:text-gray-700 p-1">
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

      {/* Convert to BGB Floating Button */}
      {selectedCoinsForConvert.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          {/* Preview Tooltip */}
          <div className="mb-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-purple-200 dark:border-purple-800 p-3 max-w-sm">
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <div className="font-semibold text-purple-600 dark:text-purple-400">
                {selectedCoinsForConvert.size} coin{selectedCoinsForConvert.size !== 1 ? 's' : ''} selected
              </div>
              <div className="text-gray-500 dark:text-gray-400 truncate">
                {Array.from(selectedCoinsForConvert).join(', ')}
              </div>
              {selectedCoinsForConvert.size <= 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {Array.from(selectedCoinsForConvert).map(coin => {
                    const coinData = convertibleCurrencies.find(c => c.coin === coin);
                    if (!coinData) return null;
                    return (
                      <div key={coin} className="flex justify-between gap-2">
                        <span className="font-medium">{coin}:</span>
                        <span className="text-right">{formatAmount(coinData.bgbEstAmount, 'BGB')} BGB</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Convert Button */}
          <button
            onClick={handleConvertToBGB}
            disabled={convertLoading}
            className="w-full px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {convertLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                Convert to BGB
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}