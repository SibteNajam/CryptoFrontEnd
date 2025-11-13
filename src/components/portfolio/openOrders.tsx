'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Order } from '../../infrastructure/api/PortfolioApi';
import { BitgetOrder } from '../../infrastructure/api/PortfolioApi';

// Union type for orders from different exchanges
type AnyOrder = Order | BitgetOrder;

// Type guard to check if order is Bitget order
function isBitgetOrder(order: AnyOrder): order is BitgetOrder {
  return 'userId' in order && 'cTime' in order;
}

interface OpenOrdersTabProps {
  openOrders: AnyOrder[];
}

export default function OpenOrdersTab({ openOrders }: OpenOrdersTabProps) {
  const formatCurrency = (value: string | number, decimals = 2) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) {
      return '0.00';
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Open Orders ({openOrders.length})
        </h3>
      </div>
      
      {openOrders.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No open orders</p>
          <p className="text-sm text-gray-400">Your active orders will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Side
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {openOrders.map((order) => {
                const isBitget = isBitgetOrder(order);
                
                // Extract common fields based on exchange type
                const symbol = order.symbol;
                const side = isBitget ? order.side.toUpperCase() : order.side;
                const type = isBitget ? order.orderType : order.type;
                const amount = isBitget ? order.size : order.origQty;
                const price = isBitget ? order.priceAvg : order.price;
                const status = isBitget ? order.status : order.status;
                const time = isBitget ? parseInt(order.cTime) : order.time;
                const orderId = isBitget ? order.orderId : order.orderId.toString();
                
                return (
                  <tr key={orderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        side === 'BUY' || side === 'buy'
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {side}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(amount, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${formatCurrency(price, 2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(time).toLocaleString()}
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