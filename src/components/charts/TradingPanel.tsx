// "use client";

// import React, { useState, useEffect } from 'react';
// import { BinanceApiService, AccountInfo, OpenOrder } from '../../api/BinanceOrder';

// interface TradingPanelProps {
//     selectedSymbol: string;
//     apiService: BinanceApiService;
// }

// const TradingPanel: React.FC<TradingPanelProps> = ({ selectedSymbol, apiService }) => {
//     const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
//     const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     const [orderForm, setOrderForm] = useState({
//         side: 'BUY' as 'BUY' | 'SELL',
//         type: 'LIMIT' as 'LIMIT' | 'MARKET',
//         quantity: '',
//         price: ''
//     });

//     const loadAccountData = async () => {
//         setLoading(true);
//         try {
//             const [account, orders] = await Promise.all([
//                 apiService.getAccountInfo(),
//                 apiService.getOpenOrders(selectedSymbol)
//             ]);
            
//             setAccountInfo(account);
//             setOpenOrders(orders);
//             setError(null);
//         } catch (err) {
//             setError(err instanceof Error ? err.message : 'Failed to load account data');
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         loadAccountData();
//     }, [selectedSymbol]);

//     const handlePlaceOrder = async () => {
//         if (!orderForm.quantity || (orderForm.type === 'LIMIT' && !orderForm.price)) {
//             alert('Please fill in all required fields');
//             return;
//         }

//         setLoading(true);
//         try {
//             const order = {
//                 symbol: selectedSymbol,
//                 side: orderForm.side,
//                 type: orderForm.type,
//                 quantity: orderForm.quantity,
//                 ...(orderForm.type === 'LIMIT' && { price: orderForm.price }),
//                 timeInForce: 'GTC' as const
//             };

//             await apiService.placeOrder(order);
//             alert('Order placed successfully!');
            
//             setOrderForm({ side: 'BUY', type: 'LIMIT', quantity: '', price: '' });
//             loadAccountData();
//         } catch (err) {
//             alert(`Order failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleCancelOrder = async (orderId: number) => {
//         if (!confirm('Are you sure you want to cancel this order?')) return;

//         setLoading(true);
//         try {
//             await apiService.cancelOrder(selectedSymbol, orderId);
//             alert('Order cancelled successfully!');
//             loadAccountData();
//         } catch (err) {
//             alert(`Cancel failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const getRelevantBalances = () => {
//         if (!accountInfo) return [];
        
//         const baseAsset = selectedSymbol.replace('USDT', '').replace('BUSD', '').replace('BTC', '');
//         const quoteAssets = ['USDT', 'BUSD', 'BTC'];
        
//         return accountInfo.balances.filter(balance => 
//             balance.asset === baseAsset || 
//             quoteAssets.includes(balance.asset) ||
//             parseFloat(balance.free) > 0
//         ).slice(0, 5);
//     };

//     if (loading && !accountInfo) {
//         return (
//             <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
//                 <div className="animate-pulse">
//                     <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
//                     <div className="space-y-2">
//                         <div className="h-3 bg-gray-200 rounded"></div>
//                         <div className="h-3 bg-gray-200 rounded w-5/6"></div>
//                     </div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
//             <div className="space-y-6">
//                 {/* Account Info */}
//                 <div>
//                     <h3 className="text-lg font-semibold mb-3">Account Balance</h3>
//                     {error && (
//                         <div className="text-red-600 text-sm mb-3 p-2 bg-red-50 rounded">
//                             {error}
//                         </div>
//                     )}
//                     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
//                         {getRelevantBalances().map((balance) => (
//                             <div key={balance.asset} className="bg-gray-50 p-3 rounded">
//                                 <div className="font-medium text-sm">{balance.asset}</div>
//                                 <div className="text-xs text-gray-600">
//                                     Free: {parseFloat(balance.free).toFixed(4)}
//                                 </div>
//                                 <div className="text-xs text-gray-600">
//                                     Locked: {parseFloat(balance.locked).toFixed(4)}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Manual Order Form */}
//                 <div>
//                     <h3 className="text-lg font-semibold mb-3">Place Order</h3>
//                     <div className="grid grid-cols-2 gap-3 mb-3">
//                         <select
//                             value={orderForm.side}
//                             onChange={(e) => setOrderForm({...orderForm, side: e.target.value as 'BUY' | 'SELL'})}
//                             className="border border-gray-300 rounded px-3 py-2"
//                         >
//                             <option value="BUY">Buy</option>
//                             <option value="SELL">Sell</option>
//                         </select>
                        
//                         <select
//                             value={orderForm.type}
//                             onChange={(e) => setOrderForm({...orderForm, type: e.target.value as 'LIMIT' | 'MARKET'})}
//                             className="border border-gray-300 rounded px-3 py-2"
//                         >
//                             <option value="LIMIT">Limit</option>
//                             <option value="MARKET">Market</option>
//                         </select>
//                     </div>
                    
//                     <div className="grid grid-cols-2 gap-3 mb-3">
//                         <input
//                             type="number"
//                             placeholder="Quantity"
//                             value={orderForm.quantity}
//                             onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
//                             className="border border-gray-300 rounded px-3 py-2"
//                         />
                        
//                         {orderForm.type === 'LIMIT' && (
//                             <input
//                                 type="number"
//                                 placeholder="Price"
//                                 value={orderForm.price}
//                                 onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
//                                 className="border border-gray-300 rounded px-3 py-2"
//                             />
//                         )}
//                     </div>
                    
//                     <button
//                         onClick={handlePlaceOrder}
//                         disabled={loading}
//                         className={`w-full py-2 px-4 rounded font-medium ${
//                             orderForm.side === 'BUY' 
//                                 ? 'bg-green-500 hover:bg-green-600 text-white' 
//                                 : 'bg-red-500 hover:bg-red-600 text-white'
//                         } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
//                     >
//                         {loading ? 'Placing...' : `${orderForm.side} ${selectedSymbol}`}
//                     </button>
//                 </div>

//                 {/* Open Orders */}
//                 <div>
//                     <div className="flex justify-between items-center mb-3">
//                         <h3 className="text-lg font-semibold">Open Orders</h3>
//                         <button
//                             onClick={loadAccountData}
//                             disabled={loading}
//                             className="text-sm text-blue-600 hover:text-blue-800"
//                         >
//                             Refresh
//                         </button>
//                     </div>
                    
//                     {openOrders.length === 0 ? (
//                         <div className="text-gray-500 text-sm">No open orders</div>
//                     ) : (
//                         <div className="space-y-2">
//                             {openOrders.map((order) => (
//                                 <div key={order.orderId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
//                                     <div>
//                                         <div className="font-medium text-sm">
//                                             {order.side} {order.origQty} {order.symbol}
//                                         </div>
//                                         <div className="text-xs text-gray-600">
//                                             {order.type} @ {order.price} | Status: {order.status}
//                                         </div>
//                                     </div>
//                                     <button
//                                         onClick={() => handleCancelOrder(order.orderId)}
//                                         className="text-red-600 hover:text-red-800 text-sm"
//                                     >
//                                         Cancel
//                                     </button>
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default TradingPanel;


"use client";

import React, { useState, useEffect } from 'react';
import {  AccountInfo, OpenOrder } from '../../api/BinanceOrder';

// ✅ Updated props to match your dashboard usage
interface TradingPanelProps {
    selectedSymbol: string;
    apiService: any;
}

const TradingPanel: React.FC<TradingPanelProps> = ({ 
    selectedSymbol, 
    apiService 
}) => {
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
    const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [orderForm, setOrderForm] = useState({
        side: 'BUY' as 'BUY' | 'SELL',
        type: 'LIMIT' as 'LIMIT' | 'MARKET',
        quantity: '',
        price: ''
    });

    const loadAccountData = async () => {
        setLoading(true);
        try {
            const [account, orders] = await Promise.all([
                apiService.getAccountInfo(),
                apiService.getOpenOrders(selectedSymbol)
            ]);
            
            setAccountInfo(account);
            setOpenOrders(orders);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load account data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccountData();
    }, [selectedSymbol]);

    const handlePlaceOrder = async () => {
        if (!orderForm.quantity || (orderForm.type === 'LIMIT' && !orderForm.price)) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const order = {
                symbol: selectedSymbol,
                side: orderForm.side,
                type: orderForm.type,
                quantity: orderForm.quantity,
                ...(orderForm.type === 'LIMIT' && { price: orderForm.price }),
                timeInForce: 'GTC' as const
            };

            await apiService.placeOrder(order);
            alert('Order placed successfully!');
            
            setOrderForm({ side: 'BUY', type: 'LIMIT', quantity: '', price: '' });
            loadAccountData();
        } catch (err) {
            alert(`Order failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId: number) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        setLoading(true);
        try {
            await apiService.cancelOrder(selectedSymbol, orderId);
            alert('Order cancelled successfully!');
            loadAccountData();
        } catch (err) {
            alert(`Cancel failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const getRelevantBalances = () => {
        if (!accountInfo) return [];
        
        const baseAsset = selectedSymbol.replace('USDT', '').replace('BUSD', '').replace('BTC', '');
        const quoteAssets = ['USDT', 'BUSD', 'BTC'];
        
        return accountInfo.balances.filter(balance => 
            balance.asset === baseAsset || 
            quoteAssets.includes(balance.asset) ||
            parseFloat(balance.free) > 0
        ).slice(0, 5);
    };

    if (loading && !accountInfo) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="space-y-6">
                {/* Account Info */}
                <div>
                    <h3 className="text-lg font-semibold mb-3">Account Balance</h3>
                    {error && (
                        <div className="text-red-600 text-sm mb-3 p-2 bg-red-50 rounded">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        {getRelevantBalances().map((balance) => (
                            <div key={balance.asset} className="bg-gray-50 p-3 rounded">
                                <div className="font-medium text-sm">{balance.asset}</div>
                                <div className="text-xs text-gray-600">
                                    Free: {parseFloat(balance.free).toFixed(4)}
                                </div>
                                <div className="text-xs text-gray-600">
                                    Locked: {parseFloat(balance.locked).toFixed(4)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Manual Order Form */}
                <div>
                    <h3 className="text-lg font-semibold mb-3">Place Order</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <select
                            value={orderForm.side}
                            onChange={(e) => setOrderForm({...orderForm, side: e.target.value as 'BUY' | 'SELL'})}
                            className="border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="BUY">Buy</option>
                            <option value="SELL">Sell</option>
                        </select>
                        
                        <select
                            value={orderForm.type}
                            onChange={(e) => setOrderForm({...orderForm, type: e.target.value as 'LIMIT' | 'MARKET'})}
                            className="border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="LIMIT">Limit</option>
                            <option value="MARKET">Market</option>
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <input
                            type="number"
                            placeholder="Quantity"
                            value={orderForm.quantity}
                            onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
                            className="border border-gray-300 rounded px-3 py-2"
                        />
                        
                        {orderForm.type === 'LIMIT' && (
                            <input
                                type="number"
                                placeholder="Price"
                                value={orderForm.price}
                                onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                                className="border border-gray-300 rounded px-3 py-2"
                            />
                        )}
                    </div>
                    
                    <button
                        onClick={handlePlaceOrder}
                        disabled={loading}
                        className={`w-full py-2 px-4 rounded font-medium ${
                            orderForm.side === 'BUY' 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : 'bg-red-500 hover:bg-red-600 text-white'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Placing...' : `${orderForm.side} ${selectedSymbol}`}
                    </button>
                </div>

                {/* Open Orders */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold">Open Orders</h3>
                        <button
                            onClick={loadAccountData}
                            disabled={loading}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Refresh
                        </button>
                    </div>
                    
                    {openOrders.length === 0 ? (
                        <div className="text-gray-500 text-sm">No open orders</div>
                    ) : (
                        <div className="space-y-2">
                            {openOrders.map((order) => (
                                <div key={order.orderId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                    <div>
                                        <div className="font-medium text-sm">
                                            {order.side} {order.origQty} {order.symbol}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {order.type} @ {order.price} | Status: {order.status}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCancelOrder(order.orderId)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TradingPanel;