# Auto Trade Integration - Setup Guide

## Overview

The Auto Trade feature integrates your Next.js frontend with the FastAPI trading bot backend. It automatically syncs credentials from your selected exchange and allows you to:

- View real-time balance and P&L
- Configure take profit (TP) and stop loss (SL) levels
- Monitor processing status and trading statistics
- Auto-sync credentials when switching exchanges

---

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file in the frontend root:

```bash
NEXT_PUBLIC_TRADING_BOT_API=http://localhost:8000
```

### 2. Start Your FastAPI Backend

Make sure your FastAPI trading bot is running on port 8000:

```bash
cd /path/to/fastapi-bot
python main.py
```

### 3. Configure Credentials

1. Go to **Dashboard** in your Next.js app
2. Use the **Exchange Selector** to add credentials for Bitget/Binance
3. Navigate to **Auto Trade** page (⚡ icon in sidebar)

The app will automatically sync your credentials with the FastAPI backend!

---

## 📋 Features

### Balance Dashboard
- **Start Balance**: Initial balance when bot started
- **Current Balance**: Real-time balance from exchange
- **P&L**: Calculated profit/loss with percentage

### Trading Configuration
- **Amount Percentage**: How much of balance to use per trade (1-100%)
- **TP Levels**: Number of take profit levels (1-5)
- **TP1, TP2, TP3**: Individual take profit percentages
- **Stop Loss**: Stop loss percentage

### Real-Time Monitoring
- **Processing Status**: Current symbol being analyzed
- **Queue Size**: Number of symbols in processing queue
- **Trading Statistics**: 
  - Logic checks performed
  - Symbols queued/processed
  - Pipeline successes/failures
  - Buy signals found

---

## 🔄 Auto-Sync Logic

The app automatically syncs credentials in these scenarios:

1. **Initial Load**: When you first visit the Auto Trade page
2. **Exchange Switch**: When you change exchange in the app
3. **Credential Update**: When you modify credentials in Exchange Selector
4. **Manual Retry**: Click "Retry Connection" if sync fails

### How It Works

```typescript
// Credentials are automatically passed from Redux store
const currentCreds = credentialsArray.find(c => c.exchange === selectedExchange);

if (currentCreds && needsSync) {
  dispatch(initializeExchange({
    exchange: selectedExchange,  // 'bitget' or 'binance'
    credentials: currentCreds,   // apiKey, secretKey, passphrase
  }));
}
```

---

## 🔧 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/initialize-exchange` | POST | Initialize exchange with credentials |
| `/api/config` | GET/POST | Get/update trading configuration |
| `/api/stats` | GET | Get real-time trading statistics |
| `/api/processing-status` | GET | Get current processing status |
| `/api/reset-start-balance` | POST | Reset start balance to current |

---

## 📊 Data Flow

```
Next.js App → Redux Store → FastAPI Backend → Exchange API
     ↑                            ↓
     └──────── WebSocket ─────────┘
          (Stats polling every 5s)
```

1. **User selects exchange** → Stored in Redux (`exchange` slice)
2. **User enters credentials** → Stored in Redux (`credentialsArray`)
3. **Auto Trade page loads** → Reads Redux and syncs with FastAPI
4. **FastAPI initializes exchange** → Returns start balance
5. **Stats poll every 5s** → Updates UI with real-time data
6. **User updates TP/SL** → Sent to FastAPI via `/api/config`

---

## 🎨 UI Components

### Balance Cards (Top Row)
```tsx
┌─────────────┬─────────────┬─────────────┐
│ Start       │ Current     │ P&L         │
│ Balance     │ Balance     │ +$70.25     │
│ $1,250.50   │ $1,320.75   │ +5.62%      │
└─────────────┴─────────────┴─────────────┘
```

### Processing Status (When Active)
```tsx
┌──────────────────────────────────────────┐
│ 🔄 Processing: BTC/USDT                  │
│    Status: vlm_processing • Queue: 3     │
└──────────────────────────────────────────┘
```

### Trading Configuration
```tsx
┌──────────────────────────────────────────┐
│ Amount %    [━━━━━━━━━━] 20%            │
│ TP Levels   [3]                          │
│ Stop Loss   [━━━━━━━━━━] 5%             │
│ TP1         [━━━━━━━━━━] 4%             │
│ TP2         [━━━━━━━━━━] 7%             │
│ TP3         [━━━━━━━━━━] 10%            │
│                                          │
│                     [Save Config] 💾     │
└──────────────────────────────────────────┘
```

---

## 🔐 Security Notes

### ✅ Best Practices
- Credentials are stored in Redux and automatically synced
- Never hardcode API keys in code
- Use environment variables for FastAPI URL
- Implement HTTPS in production

### 🚨 Important
```python
# Add to your FastAPI app
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://146.59.93.94:3000"],  # Your Next.js app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🐛 Troubleshooting

### "Trading Bot Not Configured"
**Cause**: No credentials set or FastAPI not running

**Solution**:
1. Check FastAPI is running: `curl http://localhost:8000/api/active-exchange`
2. Add credentials in Exchange Selector
3. Verify `.env.local` has correct API URL

### "Connection Failed"
**Cause**: FastAPI unreachable or credentials invalid

**Solution**:
1. Check FastAPI logs for errors
2. Verify API URL in `.env.local`
3. Click "Retry Connection" button
4. Check CORS configuration

### Stats Not Updating
**Cause**: Polling interval issue or API error

**Solution**:
1. Open browser console for errors
2. Check network tab for failed requests
3. Verify FastAPI `/api/stats` endpoint works

---

## 📱 Mobile Responsive

The Auto Trade page is fully responsive:
- Balance cards stack on mobile
- Config inputs are touch-friendly
- Stats grid adjusts to screen size

---

## 🎯 Next Steps

### Enhancements You Can Add

1. **Historical P&L Chart**: Use `/api/balance-history` endpoint
2. **Push Notifications**: Alert when orders are placed
3. **Advanced Filters**: Filter statistics by date range
4. **Export Data**: Download stats as CSV
5. **WebSocket Updates**: Real-time instead of polling

### Example: Add Balance History Chart

```typescript
// In auto-trade/page.tsx
const [balanceHistory, setBalanceHistory] = useState([]);

useEffect(() => {
  const fetchHistory = async () => {
    const history = await TradingBotApi.getBalanceHistory();
    setBalanceHistory(history.history);
  };
  fetchHistory();
}, []);

// Add Recharts line chart component
```

---

## 📚 Related Documentation

- [FastAPI Trading Bot API Docs](../FASTAPI_INTEGRATION_DOCS.md)
- [Exchange Credentials Setup](../CREDENTIALS_QUICK_START.md)
- [Redux State Management](../src/infrastructure/features/README.md)

---

## ✅ Checklist

Before deploying:

- [ ] FastAPI backend is running
- [ ] CORS is configured properly
- [ ] `.env.local` has correct API URL
- [ ] Credentials are set in Exchange Selector
- [ ] Test TP/SL config updates
- [ ] Verify stats polling works
- [ ] Test exchange switching
- [ ] Mobile responsiveness checked

---

## 💡 Tips

1. **Keep FastAPI Running**: Auto Trade won't work without backend
2. **Monitor Console**: Check browser console for sync logs
3. **Adjust Polling**: Reduce intervals if backend is slow
4. **Balance Reset**: Use "Reset to current" to recalculate P&L
5. **Credentials Sync**: Happens automatically when exchange changes

---

## 🤝 Support

If you encounter issues:
1. Check browser console for errors
2. Review FastAPI logs
3. Verify network requests in DevTools
4. Check Redux state with Redux DevTools

---

**Happy Trading! 🚀📈**
