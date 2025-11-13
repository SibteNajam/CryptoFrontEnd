// components/wallet/withdrawals.tsx
'use client';

import React from 'react';
import { Download, CreditCard, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { 
  WithdrawHistoryResponse, 
  Withdrawal,
  NormalizedWithdrawal,
  NormalizedTransactionResponse 
} from '../../infrastructure/api/WalletApi';
import { format } from 'date-fns';

interface WithdrawalsTabProps {
  withdrawHistory: WithdrawHistoryResponse | NormalizedTransactionResponse | null;
  exchange?: 'binance' | 'bitget';
}

const getStatusColor = (status: number | string): { bg: string; text: string; icon: React.ReactNode } => {
  // Handle string status (from normalized data)
  if (typeof status === 'string') {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'success') {
      return { bg: 'bg-success-light', text: 'text-success-foreground', icon: <CheckCircle className="h-4 w-4" /> };
    } else if (normalizedStatus === 'pending') {
      return { bg: 'bg-warning-light', text: 'text-warning-foreground', icon: <Clock className="h-4 w-4" /> };
    } else if (normalizedStatus === 'failed') {
      return { bg: 'bg-danger-light', text: 'text-danger-foreground', icon: <XCircle className="h-4 w-4" /> };
    }
    return { bg: 'bg-muted', text: 'text-muted-foreground', icon: <AlertCircle className="h-4 w-4" /> };
  }

  // Handle numeric status (from Binance)
  switch (status) {
    case 6: // Completed
      return { bg: 'bg-success-light', text: 'text-success-foreground', icon: <CheckCircle className="h-4 w-4" /> };
    case 0: // Email Sent
    case 2: // Awaiting Approval
    case 4: // Processing
      return { bg: 'bg-warning-light', text: 'text-warning-foreground', icon: <Clock className="h-4 w-4" /> };
    case 3: // Rejected
      return { bg: 'bg-danger-light', text: 'text-danger-foreground', icon: <XCircle className="h-4 w-4" /> };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground', icon: <AlertCircle className="h-4 w-4" /> };
  }
};

const getStatusText = (status: number | string): string => {
  if (typeof status === 'string') {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  switch (status) {
    case 0: return 'Email Sent';
    case 2: return 'Awaiting Approval';
    case 3: return 'Rejected';
    case 4: return 'Processing';
    case 6: return 'Completed';
    default: return 'Unknown';
  }
};

// Check if data is normalized (multi-exchange) or raw Binance
function isNormalizedResponse(data: any): data is NormalizedTransactionResponse {
  return 'transactions' in data && Array.isArray(data.transactions);
}

// Extract withdrawals from either format
function getWithdrawalsArray(data: WithdrawHistoryResponse | NormalizedTransactionResponse | null): Array<Withdrawal | NormalizedWithdrawal> {
  if (!data) return [];
  if (isNormalizedResponse(data)) {
    return data.transactions as NormalizedWithdrawal[];
  }
  return (data as WithdrawHistoryResponse).withdrawals || [];
}

// Get total count
function getTotal(data: WithdrawHistoryResponse | NormalizedTransactionResponse | null): number {
  if (!data) return 0;
  return data.total || 0;
}

// Get completed count
function getCompletedCount(data: WithdrawHistoryResponse | NormalizedTransactionResponse | null): number {
  if (!data) return 0;
  if (isNormalizedResponse(data)) {
    return (data.transactions as NormalizedWithdrawal[]).filter(t => t.status === 'success').length;
  }
  return (data as WithdrawHistoryResponse).summary?.completed || 0;
}

// Get pending count
function getPendingCount(data: WithdrawHistoryResponse | NormalizedTransactionResponse | null): number {
  if (!data) return 0;
  if (isNormalizedResponse(data)) {
    return (data.transactions as NormalizedWithdrawal[]).filter(t => t.status === 'pending').length;
  }
  const binanceData = data as WithdrawHistoryResponse;
  return (binanceData.summary?.awaitingApproval || 0) + (binanceData.summary?.processing || 0);
}

// Get total amount
function getTotalAmount(data: WithdrawHistoryResponse | NormalizedTransactionResponse | null): string {
  if (!data) return '0';
  if (isNormalizedResponse(data)) {
    const total = (data.transactions as NormalizedWithdrawal[]).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    return total.toFixed(2);
  }
  return (data as WithdrawHistoryResponse).summary?.totalAmount || '0';
}

// Get total fees
function getTotalFees(data: WithdrawHistoryResponse | NormalizedTransactionResponse | null): string {
  if (!data) return '0';
  if (isNormalizedResponse(data)) {
    const total = (data.transactions as NormalizedWithdrawal[]).reduce((sum, t) => sum + parseFloat(t.fee || '0'), 0);
    return total.toFixed(6);
  }
  return (data as WithdrawHistoryResponse).summary?.totalFees || '0';
}

export default function WithdrawalsTab({ withdrawHistory, exchange = 'binance' }: WithdrawalsTabProps) {
  const withdrawals = getWithdrawalsArray(withdrawHistory);
  const total = getTotal(withdrawHistory);
  const completedCount = getCompletedCount(withdrawHistory);
  const pendingCount = getPendingCount(withdrawHistory);
  const totalAmount = getTotalAmount(withdrawHistory);
  const totalFees = getTotalFees(withdrawHistory);

  if (!withdrawHistory) {
    return (
      <div className="bg-card border border-default rounded-lg p-8 text-center">
        <CreditCard className="h-12 w-12 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-card-foreground mb-2">No Withdrawals Yet</h3>
        <p className="text-muted mb-4">Your withdrawal history will appear here once you make withdrawals on {exchange.toUpperCase()}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Withdrawals</p>
              <p className="text-2xl font-semibold text-card-foreground">{completedCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Pending</p>
              <p className="text-2xl font-semibold text-card-foreground">
                {pendingCount}
              </p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Amount</p>
              <p className="text-2xl font-semibold text-card-foreground">
                {parseFloat(totalAmount).toFixed(2)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Fees</p>
              <p className="text-2xl font-semibold text-card-foreground text-danger">
                {parseFloat(totalFees).toFixed(6)}
              </p>
            </div>
            <Download className="h-8 w-8 text-danger" />
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-card border border-default rounded-lg">
        <div className="px-6 py-4 border-b border-default flex justify-between items-center">
          <h3 className="text-lg font-medium text-card-foreground">
            Withdrawal History ({total}) - {exchange.toUpperCase()}
          </h3>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            Export CSV <Download className="h-4 w-4" />
          </button>
        </div>
        
        {withdrawals.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted mx-auto mb-4" />
            <h4 className="text-lg font-medium text-card-foreground mb-2">No Withdrawals Found</h4>
            <p className="text-muted">Your withdrawals will appear here once you make them on {exchange.toUpperCase()}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Coin</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Fee</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">TX ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {withdrawals.map((withdrawal: Withdrawal | NormalizedWithdrawal) => {
                  // Get status based on withdrawal type
                  const status = 'status' in withdrawal && typeof withdrawal.status === 'string'
                    ? withdrawal.status
                    : (withdrawal as Withdrawal).status;
                  
                  const statusInfo = getStatusColor(status);
                  
                  // Get timestamp
                  const timestamp = 'timestamp' in withdrawal
                    ? (withdrawal as NormalizedWithdrawal).timestamp
                    : parseInt((withdrawal as Withdrawal).applyTime);
                  const formattedDate = format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
                  
                  // Get fee
                  const fee = 'fee' in withdrawal
                    ? (withdrawal as NormalizedWithdrawal).fee || '0'
                    : (withdrawal as Withdrawal).transactionFee;

                  return (
                    <tr key={withdrawal.id} className="hover:bg-muted">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-foreground">
                              {withdrawal.coin.slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-card-foreground">{withdrawal.coin}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-semibold text-card-foreground">
                          {parseFloat(withdrawal.amount).toFixed(6)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-danger-foreground">
                          -{parseFloat(fee).toFixed(6)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.icon}
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-card-foreground">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted font-mono text-xs break-all">
                          {withdrawal.txId ? `${withdrawal.txId.slice(0, 8)}...` : 'N/A'}
                        </span>
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