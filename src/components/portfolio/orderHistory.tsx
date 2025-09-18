'use client';

import React from 'react';
import { History } from 'lucide-react';
import { Order } from '../../infrastructure/api/PortfolioApi';

interface HistoryTabProps {
  orderHistory: Array<{ symbol: string; orders: any[] }>;
}

export default function HistoryTab({ orderHistory }: HistoryTabProps) {
  const formatCurrency = (value: string | number, decimals = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
        <span className="text-sm text-gray-500">{orderHistory.length} Symbols</span>
      </div>

      {orderHistory.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2 font-medium">No order history</p>
          <p className="text-sm text-gray-400">Your completed orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-8 p-6">
          {orderHistory.map((group) => (
            <div key={group.symbol} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Symbol Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h4 className="text-base font-semibold text-blue-600">{group.symbol}</h4>
                <span className="text-sm text-gray-500">{group.orders.length} orders</span>
              </div>

              {/* Orders */}
              <div className="divide-y divide-gray-100">
                {group.orders.slice(0, 5).map((order) => (
                  <div
                    key={order.orderId}
                    className="px-4 py-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {/* Left Side: Type & Status */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.side === 'BUY'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {order.side}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{order.type}</span>
                        <span
                          className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'FILLED'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'CANCELED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* Right Side: Qty @ Price */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.executedQty, 6)} @ ${formatCurrency(order.price, 2)}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(order.updateTime)}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* More orders notice */}
                {group.orders.length > 5 && (
                  <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
                    +{group.orders.length - 5} more orders
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
