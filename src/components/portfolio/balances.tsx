'use client';

import React, { useState } from 'react';
import { Search, Wallet } from 'lucide-react';
import { AccountInfo } from '../../api/PortfolioApi';

interface BalancesTabProps {
  accountData: AccountInfo | null;
}

export default function BalancesTab({ accountData }: BalancesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!accountData) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading balances...</p>
      </div>
    );
  }

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

  const activeBalances = accountData.balances.filter(
    balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0
  );

  const filteredBalances = activeBalances.filter(balance =>
    balance.asset.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Asset Balances ({filteredBalances.length})
          </h3>
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
      
      {filteredBalances.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'No assets found matching your search' : 'No active balances'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Free
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locked
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBalances.map((balance) => {
                const totalAmount = parseFloat(balance.free) + parseFloat(balance.locked);
                
                return (
                  <tr key={balance.asset} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {/* Blue Asset Icon */}
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
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
                        <span className="text-orange-600">
                          {formatAmount(balance.locked, balance.asset)}
                        </span>
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
      )}
    </div>
  );
}