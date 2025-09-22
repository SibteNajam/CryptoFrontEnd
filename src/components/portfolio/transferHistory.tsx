// components/TransferHistoryTable.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getTransferHistory, TransferHistoryResponse, TransferRow } from '../../infrastructure/api/PortfolioApi';

interface TransferHistoryTableProps {
  current?: number; // Page number
  size?: number;    // Page size
  onDataLoaded?: (data: TransferHistoryResponse) => void; // Optional callback
}

export default function TransferHistoryTable({ 
  current = 1, 
  size = 100,
  onDataLoaded 
}: TransferHistoryTableProps) {
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [pagination, setPagination] = useState<Partial<TransferHistoryResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTransferHistory(current, size);

      setTransfers(data.rows);
      setPagination({
        total: data.total,
        current: data.current,
        size: data.size,
        pages: data.pages
      });

      if (onDataLoaded) {
        onDataLoaded(data);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transfer history';
      setError(errorMessage);
      console.error('Transfer history fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [current, size]);

  const handlePageChange = (newCurrent: number) => {
    if (
      newCurrent !== current &&
      newCurrent >= 1 &&
      newCurrent <= (pagination.pages ?? 1)
    ) {
      // You can implement pagination by updating current state or calling a callback
      console.log('Page change requested:', newCurrent);
      // Example: if you have a parent component managing pagination
      // onPageChange?.(newCurrent);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading transfer history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchTransfers}
          className="mt-2 text-blue-600 hover:underline text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!transfers.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No transfer history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Transfer History
          <span className="ml-2 text-sm text-gray-500">
            ({pagination.total || 0} total transactions)
          </span>
        </h3>
        
        {/* Pagination Info */}
        {pagination.total && pagination.pages && (
          <div className="text-sm text-gray-500">
            Page {pagination.current} of {pagination.pages}
          </div>
        )}
      </div>

      {/* Transfer Table */}
      <div className="overflow-x-auto bg-card border border-default rounded-lg">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-2 font-medium">Asset</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Date & Time</th>
              <th className="px-4 py-2 font-medium">Transaction ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {transfers.map((transfer: TransferRow) => (
              <tr key={transfer.tranId} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">
                  <span className="inline-flex items-center px-2 py-1 rounded-xs text-xs font-medium bg-blue-100 text-blue-800">
                    {transfer.asset}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-lg font-semibold text-green-600">
                    {parseFloat(transfer.amount).toFixed(6)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-medium bg-gray-100 text-gray-800">
                    {transfer.type.replace('_', ' → ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-medium ${
                    transfer.status === 'CONFIRMED' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transfer.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-900">
                  {format(new Date(transfer.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-500 font-mono text-xs">
                    {transfer.tranId.toString().replace(/(\d{3})(?=\d)/g, '$1 ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination.total && pagination.pages && pagination.pages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>
            Showing {(current - 1) * size + 1} to {Math.min(current * size, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => handlePageChange(current - 1)}
              disabled={current === 1}
              className="px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>
            <button 
              onClick={() => handlePageChange(current + 1)}
              disabled={current === pagination.pages}
              className="px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}