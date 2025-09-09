'use client';

import React from 'react';
import { Shield, CheckCircle, XCircle, Wallet } from 'lucide-react';
import { AccountInfo } from '../../api/PortfolioApi';

interface OverviewTabProps {
  accountData: AccountInfo | null;
}

export default function OverviewTab({ accountData }: OverviewTabProps) {
  if (!accountData) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading account overview...</p>
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

  return (
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
              <p className="text-lg font-semibold text-gray-900">
                {(accountData.makerCommission / 10000).toFixed(2)}%
              </p>
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

      {/* Permissions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Permissions</h3>
        <div className="flex flex-wrap gap-2">
          {accountData.permissions.map((permission) => (
            <span 
              key={permission} 
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
            >
              {permission}
            </span>
          ))}
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
                      <p className="text-sm text-gray-500">
                        Available: {formatAmount(balance.free, balance.asset)}
                      </p>
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
  );
}