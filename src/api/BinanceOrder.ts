// Create this file: services/BinanceApiService.ts
export interface OrderRequest {
    symbol: string;
    side: string;
    type: string;
    quantity: string;
    price?: string;
    stopPrice?: string;
    timeInForce?: string;
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
export interface OrderResult {
    symbol: string;
    orderId: number;
    orderListId: number;
    clientOrderId: string;
    transactTime: number;
    price: string;
    origQty: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    status: string;
    timeInForce: string;
    type: string;
    side: string;
    workingTime: number;
    fills: any[],
    selfTradePreventionMode: string
}

export interface OTOCOOrderResult {
    orderListId: number;
    contingencyType: string;
    listStatusType: string;
    listOrderStatus: string;
    listClientOrderId: string;
    transactionTime: number;
    symbol: string;
    orders: Array<{
        symbol: string;
        orderId: number;
        clientOrderId: string;
    }>;
    orderReports: Array<{
        symbol: string;
        orderId: number;
        orderListId: number;
        clientOrderId: string;
        transactTime: number;
        price: string;
        origQty: string;
        executedQty: string;
        origQuoteOrderQty: string;
        cummulativeQuoteQty: string;
        status: string;
        timeInForce: string;
        type: string;
        side: string;
        stopPrice?: string;
        workingTime: number;
        selfTradePreventionMode: string;
    }>;
}
export interface OTOCOOrderRequest {
    symbol: string;
    workingType: 'LIMIT';
    workingSide: 'BUY' | 'SELL';
    workingPrice: string;
    workingQuantity: string;
    workingTimeInForce: 'GTC' | 'IOC' | 'FOK';
    pendingSide: 'BUY' | 'SELL';
    pendingQuantity: string;
    pendingAboveType: 'TAKE_PROFIT_LIMIT' | 'STOP_LOSS_LIMIT';
    pendingAbovePrice: string;
    pendingAboveStopPrice: string;
    pendingAboveTimeInForce: 'GTC';
    pendingBelowType: 'TAKE_PROFIT_LIMIT' | 'STOP_LOSS_LIMIT';
    pendingBelowPrice: string;
    pendingBelowStopPrice: string;
    pendingBelowTimeInForce: 'GTC';
    timestamp: number;
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
    constructor(apiUrl: string = 'http://localhost:3000') {
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

async placeOrder(order: OrderRequest): Promise<OrderResult> {
    try {
        console.log('🚀 Frontend API Service - Placing order:', order);
        console.log('🌐 Calling URL:', `${this.apiUrl}/binance/place-order`);
        
        // Log the exact same format that worked in console
        const orderPayload = {
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            quantity: order.quantity,
            price: order.price,
            timeInForce: order.timeInForce
        };
        
        console.log('📦 Exact payload being sent:', JSON.stringify(orderPayload, null, 2));
        
        const response = await fetch(`${this.apiUrl}/binance/place-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload)
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response text:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Order placed successfully:', result);
        return result;

    } catch (error) {
        console.error('❌ Frontend API Service - Error details:', {
            error: error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}
    async getOpenOrders(symbol?: string): Promise<OpenOrder[]> {
        try {
            const url = symbol 
                ? `${this.apiUrl}/binance/open-orders?symbol=${symbol}`
                : `${this.apiUrl}/binance/open-orders`;

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
    const response = await fetch(
      `${this.apiUrl}/binance/cancel-order?symbol=${encodeURIComponent(symbol)}&orderId=${orderId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

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
 async placeOrderListOTOCO(order: any): Promise<OTOCOOrderResult> {
        try {
            console.log('🚀 Frontend API Service - Placing OTOCO order:', order);
            console.log('🌐 Calling URL:', `${this.apiUrl}/binance/place-order-list-otoco`);

            const orderPayload = {
                symbol: order.symbol,
                workingType: order.workingType,
                workingSide: order.workingSide,
                workingPrice: order.workingPrice,
                workingQuantity: order.workingQuantity,
                workingTimeInForce: order.workingTimeInForce,
                pendingSide: order.pendingSide,
                pendingQuantity: order.pendingQuantity,
                pendingAboveType: order.pendingAboveType,
                pendingAbovePrice: order.pendingAbovePrice,
                pendingAboveStopPrice: order.pendingAboveStopPrice,
                pendingAboveTimeInForce: order.pendingAboveTimeInForce,
                pendingBelowType: order.pendingBelowType,
                pendingBelowPrice: order.pendingBelowPrice,
                pendingBelowStopPrice: order.pendingBelowStopPrice,
                pendingBelowTimeInForce: order.pendingBelowTimeInForce,
                timestamp: order.timestamp,
            };

            console.log('📦 Exact payload being sent:', JSON.stringify(orderPayload, null, 2));

            const response = await fetch(`${this.apiUrl}/binance/place-otoc-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderPayload),
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ OTOCO Order List placed successfully:', result);
            return result;
        } catch (error) {
            console.error('❌ Frontend API Service - Error details:', {
                error: error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
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