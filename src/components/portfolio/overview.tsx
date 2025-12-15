'use client';

import React from 'react';
import { Shield, CheckCircle, XCircle, Wallet } from 'lucide-react';
import { NormalizedAccountInfo } from '../../infrastructure/api/PortfolioApi';

interface OverviewTabProps {
  accountData: NormalizedAccountInfo | null;
}

export default function OverviewTab({ accountData }: OverviewTabProps) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 OVERVIEW TAB - Rendering');
  console.log('   Account Data:', accountData ? {
    exchange: accountData.exchange,
    accountType: accountData.accountType,
    balancesCount: accountData.balances.length,
    firstBalance: accountData.balances[0]
  } : 'null');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
    balance => balance.free > 0 || balance.locked > 0
  );

  return (
    <div className="space-y-6 bg-card">
      {/* Account Stats */}
      <div className="bg-card grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account Type</p>
              <p className="text-lg font-semibold text-card-foreground">{accountData.accountType}</p>
            </div>
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Trading</p>
              <div className="flex items-center gap-1">
                {accountData.canTrade ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <p className="text-lg font-semibold text-card-foreground">
                  {accountData.canTrade ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Maker Fee</p>
              <p className="text-lg font-semibold text-card-foreground">
                {(accountData.makerCommission / 10000).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Assets</p>
              <p className="text-lg font-semibold text-card-foreground">{activeBalances.length}</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-card border border-default rounded-lg p-6">
        <h3 className="text-lg font-medium text-card-foreground mb-4">Account Permissions</h3>
        <div className="flex flex-wrap gap-2">
          {accountData.permissions.map((permission) => (
            <span
              key={permission}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30"
            >
              {permission}
            </span>
          ))}
        </div>
      </div>

      {/* Top Assets - Fixed Asset Icons for Dark Mode */}
      <div className="bg-card border border-default rounded-lg">
        <div className="px-6 py-4 border-b border-default">
          <h3 className="text-lg font-medium text-card-foreground">Top Assets</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {activeBalances.slice(0, 5).map((balance) => {
              const totalAmount = balance.free + balance.locked;

              return (
                <div key={balance.asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Fixed Asset Icon - Dark blue background with white text */}
                    <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-white">
                        {balance.asset.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{balance.asset}</p>
                      <p className="text-sm text-muted-foreground">
                        Available: {formatAmount(balance.free.toString(), balance.asset)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-card-foreground">
                      {formatAmount(totalAmount.toString(), balance.asset)}
                    </p>
                    {balance.locked > 0 && (
                      <p className="text-sm text-orange-500">
                        Locked: {formatAmount(balance.locked.toString(), balance.asset)}
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