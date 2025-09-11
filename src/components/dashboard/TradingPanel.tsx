"use client";

import React, { useState, useEffect } from 'react';
import { BinanceApiService, AccountInfo, OpenOrder } from '../../api/BinanceOrder';
import BalanceViewer from '../Order/balance';

interface TradingPanelProps {
  selectedSymbol: string;
  apiService: BinanceApiService;
}

interface OrderForm {
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  quantity: string;
  price: string;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
}

const TradingPanel: React.FC<TradingPanelProps> = ({
  selectedSymbol,
  apiService
}) => {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const [orderForm, setOrderForm] = useState<OrderForm>({
    side: 'BUY',
    type: 'LIMIT',
    quantity: '',
    price: '',
    timeInForce: 'GTC'
  });

  // Helper function to update form and log changes
  const updateOrderForm = (updates: Partial<OrderForm>) => {
    const newForm = { ...orderForm, ...updates };
    setOrderForm(newForm);
  };

  // Load account data
  const loadAccountData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [account, orders] = await Promise.all([
        apiService.getAccountInfo(),
        apiService.getOpenOrders(selectedSymbol)
      ]);

      setAccountInfo(account);
      setOpenOrders(orders);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load account data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSymbol) {
      loadAccountData();
    }
  }, [selectedSymbol]);

  // Validate order form
  const validateOrder = (): string | null => {
    if (!selectedSymbol) return 'No symbol selected';
    if (!orderForm.quantity || parseFloat(orderForm.quantity) <= 0) return 'Please enter a valid quantity';
    if (orderForm.type === 'LIMIT' && (!orderForm.price || parseFloat(orderForm.price) <= 0)) return 'Please enter a valid price';
    return null;
  };

  // Place order
  const handlePlaceOrder = async () => {
    const validationError = validateOrder();
    if (validationError) {
      alert(validationError);
      return;
    }

    setOrderLoading(true);
    setError(null);

    try {
      const orderData = {
        symbol: selectedSymbol,
        side: orderForm.side,
        type: orderForm.type,
        quantity: orderForm.quantity,
        ...(orderForm.type === 'LIMIT' && {
          price: orderForm.price,
          timeInForce: orderForm.timeInForce
        })
      };

      const result = await apiService.placeOrder(orderData);
      alert(`✅ Order placed successfully! ID: ${result.orderId}`);
      
      setOrderForm({
        side: 'BUY',
        type: 'LIMIT',
        quantity: '',
        price: '',
        timeInForce: 'GTC'
      });
      
      await loadAccountData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Order failed: ${errorMessage}`);
      alert(`❌ Order failed: ${errorMessage}`);
    } finally {
      setOrderLoading(false);
    }
  };

  // Calculate percentage amounts
  const calculatePercentageAmount = (percent: number) => {
    if (!accountInfo) return;

    const requiredAsset = orderForm.side === 'BUY' ? 'USDT' : selectedSymbol.replace('USDT', '');
    const balance = accountInfo.balances.find(b => b.asset === requiredAsset);
    
    if (!balance) return;

    let maxAmount = 0;
    
    if (orderForm.side === 'BUY' && orderForm.type === 'LIMIT' && orderForm.price) {
      maxAmount = parseFloat(balance.free) / parseFloat(orderForm.price);
    } else if (orderForm.side === 'SELL') {
      maxAmount = parseFloat(balance.free);
    }

    const calculatedAmount = (maxAmount * percent / 100).toFixed(8);
    updateOrderForm({ quantity: calculatedAmount });
  };

  return (
    <div className="space-y-3">
      {/* Compact Balance Section */}
      <div className="bg-card rounded-lg border border-gray-200 p-2">
        <BalanceViewer
          selectedSymbol={selectedSymbol}
          apiService={apiService}
          showLocked={true}
          compact={true}
        />
      </div>

      {/* Compact Order Form */}
      <div className="bg-card rounded-lg border border-gray-200 p-3 space-y-3">
        {/* Order Type Tabs - More Compact */}
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => updateOrderForm({ type: 'LIMIT' })}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              orderForm.type === 'LIMIT'
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Limit
          </button>
          <button
            onClick={() => updateOrderForm({ type: 'MARKET' })}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              orderForm.type === 'MARKET'
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Market
          </button>
        </div>

        {/* Buy/Sell Toggle - More Compact */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded-md">
          <button
            onClick={() => updateOrderForm({ side: 'BUY' })}
            className={`py-2 text-xs font-medium rounded transition-colors ${
              orderForm.side === 'BUY'
                ? 'bg-green-500 text-card-foreground shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => updateOrderForm({ side: 'SELL' })}
            className={`py-2 text-xs font-medium rounded transition-colors ${
              orderForm.side === 'SELL'
                ? 'bg-red-500 text-card-foreground shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Compact Form Fields */}
        <div className="space-y-2">
          {/* Price and Amount in Grid for Limit Orders */}
          {orderForm.type === 'LIMIT' ? (
            <div className="grid grid-cols-2 gap-2">
              {/* Price Input */}
              <div>
                <label className="block text-xs text-card-foreground mb-1">Price</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={orderForm.price}
                    onChange={(e) => updateOrderForm({ price: e.target.value })}
                    className="w-full text-xs border rounded px-2 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input placeholder-gray-500"
                    style={{
                      backgroundColor: 'var(--input)',
                      color: 'var(--input-foreground)',
                      borderColor: 'var(--input-border)'
                    }}
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-gray-500">$</span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs text-card-foreground mb-1">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={orderForm.quantity}
                    onChange={(e) => updateOrderForm({ quantity: e.target.value })}
                    className="w-full text-xs border rounded px-2 py-1.5 pr-12 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input placeholder-gray-500"
                    style={{
                      backgroundColor: 'var(--input)',
                      color: 'var(--input-foreground)',
                      borderColor: 'var(--input-border)'
                    }}
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-gray-500">
                    {selectedSymbol.replace('USDT', '')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Market Order - Only Amount */
            <div>
              <label className="block text-xs text-card-foreground mb-1">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={orderForm.quantity}
                  onChange={(e) => updateOrderForm({ quantity: e.target.value })}
                  className="w-full text-xs border rounded px-2 py-1.5 pr-12 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input placeholder-gray-500"
                  style={{
                    backgroundColor: 'var(--input)',
                    color: 'var(--input-foreground)',
                    borderColor: 'var(--input-border)'
                  }}
                />
                <span className="absolute right-2 top-1.5 text-xs text-gray-500">
                  {selectedSymbol.replace('USDT', '')}
                </span>
              </div>
            </div>
          )}

          {/* Time in Force - Compact Select */}
          {orderForm.type === 'LIMIT' && (
            <div>
              <label className="block text-xs text-card-foreground mb-1">Time in Force</label>
              <select
                value={orderForm.timeInForce}
                onChange={(e) => updateOrderForm({ timeInForce: e.target.value as 'GTC' | 'IOC' | 'FOK' })}
                className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-input"
                style={{
                  backgroundColor: 'var(--input)',
                  color: 'var(--input-foreground)',
                  borderColor: 'var(--input-border)'
                }}
              >
                <option value="GTC">GTC</option>
                <option value="IOC">IOC</option>
                <option value="FOK">FOK</option>
              </select>
            </div>
          )}
        </div>

        {/* Compact Percentage Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {[25, 50, 75, 100].map(percent => (
            <button
              key={percent}
              className="py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
              onClick={() => calculatePercentageAmount(percent)}
              disabled={orderLoading}
            >
              {percent}%
            </button>
          ))}
        </div>

        {/* Compact Total Display */}
        <div className="bg-gray-50 rounded px-2 py-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total</span>
            <span className="font-medium text-gray-900">
              {orderForm.type === 'LIMIT' && orderForm.price && orderForm.quantity
                ? `${(parseFloat(orderForm.price) * parseFloat(orderForm.quantity)).toFixed(2)} USDT`
                : orderForm.type === 'MARKET' ? 'Market Price' : '0.00 USDT'
              }
            </span>
          </div>
        </div>

        {/* Compact Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={orderLoading || loading || !orderForm.quantity || (orderForm.type === 'LIMIT' && !orderForm.price)}
          className={`w-full py-2.5 rounded font-medium text-sm transition-colors ${
            orderForm.side === 'BUY'
              ? 'bg-green-500 hover:bg-green-600 text-card-foreground disabled:bg-green-300'
              : 'bg-red-500 hover:bg-red-600 text-card-foreground disabled:bg-red-300'
          } disabled:cursor-not-allowed`}
        >
          {orderLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Placing...
            </div>
          ) : (
            `${orderForm.side} ${selectedSymbol.replace('USDT', '')}`
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Compact Open Orders */}
      {openOrders.length > 0 && (
        <div className="bg-card rounded-lg border border-gray-200 p-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-gray-800">Open Orders</h3>
            <button
              onClick={loadAccountData}
              className="text-xs text-blue-600 hover:text-blue-800"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-1 max-h-24 overflow-y-auto">
            {openOrders.slice(0, 2).map((order) => (
              <div key={order.orderId} className="flex justify-between items-center p-1.5 bg-gray-50 rounded text-xs">
                <div>
                  <div className="font-medium text-gray-900">
                    {order.side} {parseFloat(order.origQty).toFixed(4)}
                  </div>
                  <div className="text-gray-600">
                    @ ${parseFloat(order.price).toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Cancel this order?')) {
                      try {
                        await apiService.cancelOrder(selectedSymbol, order.orderId);
                        await loadAccountData();
                        alert('Order cancelled successfully!');
                      } catch (err) {
                        const errorMsg = err instanceof Error ? err.message : 'Cancel failed';
                        alert(`Cancel failed: ${errorMsg}`);
                      }
                    }
                  }}
                  className="text-red-600 hover:text-red-800 px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;