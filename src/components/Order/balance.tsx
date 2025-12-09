import { useEffect, useState } from "react";
import TokenStorage from "@/lib/tokenStorage";

interface Balance {
  asset: string;
  free: string;
  locked?: string;
}

interface BalanceViewerProps {
  selectedSymbol: string;
  apiService?: any; // If you want to pass your API service
  showLocked?: boolean; // Option to show locked balance
  compact?: boolean; // For compact display in trading panel
}

export default function BalanceViewer({ 
  selectedSymbol, 
  apiService,
  showLocked = true,
  compact = false 
}: BalanceViewerProps) {
  const [balances, setBalances] = useState<{ base: Balance | null; quote: Balance | null }>({
    base: null,
    quote: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract base and quote assets from symbol
  const getAssetsFromSymbol = (symbol: string) => {
    // Common quote currencies
    const quoteCurrencies = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];
    
    let baseAsset = '';
    let quoteAsset = '';
    
    for (const quote of quoteCurrencies) {
      if (symbol.endsWith(quote)) {
        quoteAsset = quote;
        baseAsset = symbol.replace(quote, '');
        break;
      }
    }
    
    return { baseAsset, quoteAsset };
  };

  useEffect(() => {
    const fetchBalances = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = TokenStorage.getAccessToken();
        const res = await fetch("http://146.59.93.94:3000/binance/account-info", {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch account info');
        }
        
        const data = await res.json();
        const { baseAsset, quoteAsset } = getAssetsFromSymbol(selectedSymbol);
        
        // Find balances for both base and quote assets
        const baseBalance = data.balances.find((b: Balance) => b.asset === baseAsset);
        const quoteBalance = data.balances.find((b: Balance) => b.asset === quoteAsset);
        
        setBalances({
          base: baseBalance || { asset: baseAsset, free: "0", locked: "0" },
          quote: quoteBalance || { asset: quoteAsset, free: "0", locked: "0" }
        });
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBalances({ base: null, quote: null });
      } finally {
        setLoading(false);
      }
    };

    if (selectedSymbol) {
      fetchBalances();
      const interval = setInterval(fetchBalances, 15000); // every 15s
      return () => clearInterval(interval);
    }
  }, [selectedSymbol]);

  if (loading && !balances.base && !balances.quote) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2"></div>
        <span className="text-sm text-gray-500">Loading balances...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
        Error: {error}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-card space-y-2">
        {balances.base && (
          <div className="bg-card flex justify-between items-center text-sm">
            <span className="text-gray-600">{balances.base.asset}:</span>
            <span className="font-medium text-gray-900">
              {parseFloat(balances.base.free).toFixed(6)}
            </span>
          </div>
        )}
        {balances.quote && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{balances.quote.asset}:</span>
            <span className="font-medium text-gray-900">
              {parseFloat(balances.quote.free).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
        Available Balances
      </h4>
      
      <div className="space-y-2">
        {balances.base && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{balances.base.asset}</span>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {parseFloat(balances.base.free).toFixed(6)}
              </div>
              {showLocked && balances.base.locked && parseFloat(balances.base.locked) > 0 && (
                <div className="text-xs text-gray-500">
                  Locked: {parseFloat(balances.base.locked).toFixed(6)}
                </div>
              )}
            </div>
          </div>
        )}
        
        {balances.quote && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{balances.quote.asset}</span>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {parseFloat(balances.quote.free).toFixed(2)}
              </div>
              {showLocked && balances.quote.locked && parseFloat(balances.quote.locked) > 0 && (
                <div className="text-xs text-gray-500">
                  Locked: {parseFloat(balances.quote.locked).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="text-xs text-gray-500 flex items-center">
          <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin mr-1"></div>
          Updating...
        </div>
      )}
    </div>
  );
}