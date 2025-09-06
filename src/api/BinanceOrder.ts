// Create this file: services/BinanceApiService.ts
export interface OrderRequest {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET';
    quantity: string;
    price?: string;
    timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface AccountInfo {
    accountType: string;
    balances: Array<{
        asset: string;
        free: string;
        locked: string;
    }>;
    buyerCommission: number;
    canDeposit: boolean;
    canTrade: boolean;
    canWithdraw: boolean;
    makerCommission: number;
    sellerCommission: number;
    takerCommission: number;
    updateTime: number;
}

export interface OpenOrder {
    symbol: string;
    orderId: number;
    orderListId: number;
    clientOrderId: string;
    price: string;
    origQty: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    status: string;
    timeInForce: string;
    type: string;
    side: string;
    stopPrice: string;
    icebergQty: string;
    time: number;
    updateTime: number;
    isWorking: boolean;
    origQuoteOrderQty: string;
}

export class BinanceApiService {
    private apiUrl: string;

    constructor(apiUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000') {
        this.apiUrl = apiUrl;
    }

    async getAccountInfo(): Promise<AccountInfo> {
        try {
            const response = await fetch(`${this.apiUrl}/binance/account-info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching account info:', error);
            throw error;
        }
    }

    async placeOrder(order: OrderRequest): Promise<any> {
        try {
            console.log('🚀 Placing order via NestJS API:', order);
            
            const response = await fetch(`${this.apiUrl}/binance/place-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(order)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
            }

            const result = await response.json();
            console.log('✅ Order placed successfully:', result);
            return result;

        } catch (error) {
            console.error('❌ Error placing order:', error);
            throw error;
        }
    }

    async getOpenOrders(symbol?: string): Promise<OpenOrder[]> {
        try {
            const url = symbol 
                ? `${this.apiUrl}/binance-signed/open-orders?symbol=${symbol}`
                : `${this.apiUrl}/binance-signed/open-orders`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching open orders:', error);
            throw error;
        }
    }

    async cancelOrder(symbol: string, orderId: number): Promise<any> {
        try {
            const response = await fetch(`${this.apiUrl}/binance-signed/cancel-order`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbol, orderId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Order cancelled:', result);
            return result;

        } catch (error) {
            console.error('❌ Error cancelling order:', error);
            throw error;
        }
    }

    async getMyTrades(symbol: string, limit: number = 10): Promise<any[]> {
        try {
            const response = await fetch(
                `${this.apiUrl}/binance-signed/my-trades?symbol=${symbol}&limit=${limit}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching trades:', error);
            throw error;
        }
    }

    formatTradingViewOrder(chartOrder: any, symbol: string): OrderRequest {
        return {
            symbol: symbol.replace('BINANCE:', ''),
            side: chartOrder.side?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
            type: chartOrder.type?.toUpperCase() === 'LIMIT' ? 'LIMIT' : 'MARKET',
            quantity: chartOrder.quantity?.toString() || chartOrder.qty?.toString(),
            price: chartOrder.price?.toString(),
            timeInForce: 'GTC'
        };
    }
}