import React from "react";
import { OpenOrder, BinanceApiService } from "../../api/BinanceOrder";

interface OpenedOrdersProps {
  openOrders: OpenOrder[];
  selectedSymbol: string;
  apiService: BinanceApiService;
  refresh: () => void;
}

const OpenedOrders: React.FC<OpenedOrdersProps> = ({
  openOrders,
  selectedSymbol,
  apiService,
  refresh,
}) => (
  <div>
    <div className="flex items-center justify-between text-xs font-semibold py-1 border-b">
      <div className="flex-1">Type</div>
      <div className="flex-1">Side</div>
      <div className="flex-1">Quantity</div>
      <div className="flex-1">Filled</div>
      <div className="flex-1">Price</div>
      <div className="flex-1">Stop Price</div>
      <div className="flex-1">Status</div>
      <div className="flex-1">TIF</div>
      <div className="flex-1">Time</div>
      <div className="flex-1">Action</div>
    </div>
    {openOrders.length === 0 ? (
      <div className="text-center py-3 text-xs text-gray-500">
        No open orders
      </div>
    ) : (
      <div className="space-y-1 overflow-y-auto max-h-48 scrollbar-hide">
        {openOrders.map((order) => (
          <div
            key={order.orderId}
            className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs"
          >
            <div className="flex-1">{order.type}</div>
            <div
              className={`flex-1 font-bold ${
                order.side === "BUY" ? "text-green-600" : "text-red-600"
              }`}
            >
              {order.side}
            </div>
            <div className="flex-1">
              {parseFloat(order.origQty).toFixed(4)}
            </div>
            <div className="flex-1">
              {parseFloat(order.executedQty).toFixed(4)}
            </div>
            <div className="flex-1">
              {parseFloat(order.price).toFixed(2)}
            </div>
            <div className="flex-1">
              {order.stopPrice && order.stopPrice !== "0"
                ? parseFloat(order.stopPrice).toFixed(2)
                : "-"}
            </div>
            <div className="flex-1">{order.status}</div>
            <div className="flex-1">{order.timeInForce}</div>
            <div className="flex-1">
              {/* {new Date(order.updateTime).toLocaleString()} */}
            </div>
            <button
              onClick={async () => {
                if (confirm("Cancel this order?")) {
                  try {
                    await apiService.cancelOrder(selectedSymbol, order.orderId);
                    refresh();
                    alert("Order cancelled successfully!");
                  } catch (err) {
                    const errorMsg =
                      err instanceof Error ? err.message : "Cancel failed";
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
    )}
  </div>
);

export default OpenedOrders;