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
    <div className="bg-card border border-default rounded-lg">
      <div className="px-6 py-4 border-b border-default">
        <h3 className="text-lg font-medium text-card-foreground">
          Open Orders ({openOrders.length})
        </h3>
      </div>

      {openOrders.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No open orders</p>
          <p className="text-sm text-muted">Your active orders will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Side
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
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
                  <tr key={orderId} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                      {symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${side === 'BUY' || side === 'buy'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {side}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                      {type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-card-foreground">
                      {formatCurrency(amount, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-card-foreground">
                      ${formatCurrency(price, 2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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