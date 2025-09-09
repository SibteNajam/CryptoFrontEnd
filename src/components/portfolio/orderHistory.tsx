'use client';

import React from 'react';
import { History } from 'lucide-react';
import { Order } from '../../api/PortfolioApi';

interface HistoryTabProps {
  orderHistory: Array<{ symbol: string; orders: Order[] }>;
}

export default function HistoryTab({ orderHistory }: HistoryTabProps) {
  const formatCurrency = (value: string | number, decimals = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Order History</h3>
      </div>
      
      {orderHistory.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No order history</p>
          <p className="text-sm text-gray-400">Your completed orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-6 p-6">
          {orderHistory.map((group) => (
            <div key={group.symbol} className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{group.symbol}</h4>
                  <span className="text-sm text-gray-500">{group.orders.length} orders</span>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {group.orders.slice(0, 5).map((order) => (
                  <div key={order.orderId} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          order.side === 'BUY' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {order.side}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{order.type}</span>
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === 'FILLED' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.executedQty, 8)} @ ${formatCurrency(order.price, 2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {group.orders.length > 5 && (
                  <div className="px-4 py-2 bg-gray-50 text-center">
                    <span className="text-sm text-gray-500">
                      +{group.orders.length - 5} more orders
                    </span>
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