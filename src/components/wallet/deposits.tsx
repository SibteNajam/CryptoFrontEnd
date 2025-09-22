// components/wallet/deposits.tsx
'use client';

import React from 'react';
import { Download, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { DepositHistoryResponse, Deposit } from '../../infrastructure/api/WalletApi';
import { format } from 'date-fns';

interface DepositsTabProps {
  depositHistory: DepositHistoryResponse | null;
}

const getStatusColor = (status: number): { bg: string; text: string; icon: React.ReactNode } => {
  switch (status) {
    case 1: // Success
      return { bg: 'bg-success-light', text: 'text-success-foreground', icon: <CheckCircle className="h-4 w-4" /> };
    case 0: // Pending
      return { bg: 'bg-warning-light', text: 'text-warning-foreground', icon: <Clock className="h-4 w-4" /> };
    case 6: // Credited but cannot withdraw
      return { bg: 'bg-info-light', text: 'text-info-foreground', icon: <AlertCircle className="h-4 w-4" /> };
    case 2: // Rejected
    case 7: // Wrong Deposit
      return { bg: 'bg-danger-light', text: 'text-danger-foreground', icon: <XCircle className="h-4 w-4" /> };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground', icon: <Clock className="h-4 w-4" /> };
  }
};

const getStatusText = (status: number): string => {
  switch (status) {
    case 0: return 'Pending';
    case 1: return 'Success';
    case 2: return 'Rejected';
    case 6: return 'Credited';
    case 7: return 'Wrong Deposit';
    case 8: return 'Waiting Confirmation';
    default: return 'Unknown';
  }
};

export default function DepositsTab({ depositHistory }: DepositsTabProps) {
  // Debug log - remove in production
  console.log('🔄 DepositsTab received data:', depositHistory);
  
  if (!depositHistory) {
    console.log('❌ DepositsTab: No deposit history data'); // Debug log
    return (
      <div className="bg-card border border-default rounded-lg p-8 text-center">
        <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-card-foreground mb-2">Loading Deposits...</h3>
        <p className="text-muted">Fetching your deposit history.</p>
      </div>
    );
  }

  console.log('✅ DepositsTab: Rendering with', depositHistory.deposits.length, 'deposits'); // Debug log

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Deposits</p>
              <p className="text-2xl font-semibold text-card-foreground">{depositHistory.summary.success}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Pending</p>
              <p className="text-2xl font-semibold text-card-foreground">{depositHistory.summary.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Amount</p>
              <p className="text-2xl font-semibold text-card-foreground">
                ${parseFloat(depositHistory.summary.totalAmount).toFixed(2)}
              </p>
            </div>
            <Download className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Failed</p>
              <p className="text-2xl font-semibold text-card-foreground text-danger">
                {depositHistory.summary.rejected + depositHistory.summary.wrongDeposit}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-danger" />
          </div>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-card border border-default rounded-lg">
        <div className="px-6 py-4 border-b border-default flex justify-between items-center">
          <h3 className="text-lg font-medium text-card-foreground">Deposit History ({depositHistory.total})</h3>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            Export CSV <Download className="h-4 w-4" />
          </button>
        </div>
        
        {depositHistory.deposits.length === 0 ? (
          <div className="p-8 text-center">
            <Download className="h-12 w-12 text-muted mx-auto mb-4" />
            <h4 className="text-lg font-medium text-card-foreground mb-2">No Deposits Found</h4>
            <p className="text-muted">Your deposits will appear here once you make them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Coin</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Network</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">TX ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {depositHistory.deposits.map((deposit: Deposit) => {
                  console.log('🔄 Rendering deposit:', deposit); // Debug log
                  const statusInfo = getStatusColor(deposit.status);
                  const formattedDate = format(new Date(deposit.insertTime), 'MMM dd, yyyy HH:mm');

                  return (
                    <tr key={deposit.id} className="hover:bg-muted">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-foreground">
                              {deposit.coin.slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-card-foreground">{deposit.coin}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-semibold text-card-foreground">
                          {parseFloat(deposit.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                          {deposit.network}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.icon}
                          {getStatusText(deposit.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-card-foreground">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-muted font-mono text-xs break-all hover:text-primary cursor-pointer" 
                                title={deposit.txId}
                                onClick={() => navigator.clipboard.writeText(deposit.txId)}>
                            {deposit.txId ? `${deposit.txId.slice(0, 8)}...${deposit.txId.slice(-6)}` : 'N/A'}
                          </span>
                          <span className="text-xs text-muted">Click to copy</span>
                        </div>
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