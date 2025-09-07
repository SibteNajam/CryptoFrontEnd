import { useEffect, useState } from "react";

type Balance = {
  asset: string;
  free: string;
  locked?: string;
};
interface BalanceViewerProps {
  selectedSymbol: string;
}

export default function BalanceViewer({selectedSymbol}: BalanceViewerProps) {
  const [balances, setBalances] = useState<Balance[]>([]);
  useEffect(() => {
    const fetchBalances = async () => {
      const res = await fetch("http://localhost:3000/binance/account-info"); 
      const data = await res.json();
      setBalances(data.balances);
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000); // every 15s
    return () => clearInterval(interval);
  }, []);

  // Get asset from symbol (BTCUSDT → BTC)
  const asset = selectedSymbol.replace("USDT", ""); 
  const balance = balances.find(b => b.asset === asset);

  return (
    <div>
      <h2>Selected: {selectedSymbol}</h2>
      <p>
        Balance: {balance ? balance.free : "0"} {asset}
      </p>
    </div>
  );
}
