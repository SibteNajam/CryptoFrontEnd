'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Search, Filter, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

interface TransactionsTabProps {
  transactionHistory: {
    deposits: Array<{
      id: string;
      amount: string;
      coin: string;
      network: string;
      status: number;
      address: string;
      txId: string;
      insertTime: number;
      confirmTimes: string;
    }>;
    withdrawals: Array<{
      id: string;
      amount: string;
      transactionFee: string;
      coin: string;
      status: number;
      address: string;
      txId: string;
      applyTime: string;
      network: string;
    }>;
    summary: {
      totalDeposits: number;
      totalWithdrawals: number;
    };
  } | null;
}

export default function TransactionsTab({ transactionHistory }: TransactionsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

  if (!transactionHistory) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">Loading transaction history...</p>
      </div>
    );
  }

  const getStatusInfo = (status: number, type: 'deposit' | 'withdrawal') => {
    if (type === 'deposit') {
      switch (status) {
        case 0:
          return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
        case 1:
          return { label: 'Success', color: 'bg-green-100 text-green-800', icon: CheckCircle };
        case 6:
          return { label: 'Credited', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
        default:
          return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: XCircle };
      }
    } else {
      switch (status) {
        case 0:
          return { label: 'Processing', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
        case 1:
          return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
        case 6:
          return { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle };
        default:
          return { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle };
      }
    }
  };

  const formatCurrency = (amount: string, coin: string) => {
    const num = parseFloat(amount);
    if (coin === 'USDT' || coin === 'BUSD') {
      return `${num.toFixed(2)} ${coin}`;
    }
    return `${num.toFixed(8)} ${coin}`;
  };

  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  // Combine and sort transactions
  const allTransactions = [
    ...transactionHistory.deposits.map(tx => ({
      ...tx,
      type: 'deposit' as const,
      timestamp: tx.insertTime,
      fee: '0'
    })),
    ...transactionHistory.withdrawals.map(tx => ({
      ...tx,
      type: 'withdrawal' as const,
      timestamp: parseInt(tx.applyTime),
      fee: tx.transactionFee
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  // Apply filters
  const filteredTransactions = allTransactions.filter(tx => {
    const matchesSearch = tx.coin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.txId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || tx.type === filterType.slice(0, -1);
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'completed' && (tx.status === 1 || tx.status === 6)) ||
                         (filterStatus === 'pending' && (tx.status === 0));
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Deposits</p>
              <p className="text-2xl font-bold text-green-600">{transactionHistory.summary.totalDeposits}</p>
            </div>
            <ArrowDownLeft className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Withdrawals</p>
              <p className="text-2xl font-bold text-orange-600">{transactionHistory.summary.totalWithdrawals}</p>
            </div>
            <ArrowUpRight className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Transactions</p>
              <p className="text-2xl font-bold text-blue-600">
                {transactionHistory.summary.totalDeposits + transactionHistory.summary.totalWithdrawals}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="deposits">Deposits</option>
              <option value="withdrawals">Withdrawals</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No transactions found</p>
            <p className="text-sm text-gray-400">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Your transaction history will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TX ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((tx) => {
                  const statusInfo = getStatusInfo(tx.status, tx.type);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {tx.type === 'deposit' ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-orange-500" />
                          )}
                          <span className={`capitalize font-medium ${
                            tx.type === 'deposit' ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {tx.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatCurrency(tx.amount, tx.coin)}
                          </div>
                          {tx.fee && parseFloat(tx.fee) > 0 && (
                            <div className="text-xs text-gray-500">
                              Fee: {formatCurrency(tx.fee, tx.coin)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.network}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {formatAddress(tx.address)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-mono">
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.txId)}
                          className="hover:underline"
                          title="Click to copy"
                        >
                          {formatAddress(tx.txId)}
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