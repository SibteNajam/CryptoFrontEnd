# Auto Trade Feature - Quick Reference

## 🎯 What You Can Do

### 1. View Real-Time Balance & P&L
- **Start Balance**: Initial balance from FastAPI bot
- **Current Balance**: Live balance from exchange API
- **Profit/Loss**: Automatically calculated (Current - Start)
- **P&L %**: Percentage gain/loss

### 2. Configure Trading Parameters
- **Amount %**: How much of your balance to use per trade (1-100%)
- **TP Levels**: Number of take profit targets (1-5)
- **TP1/TP2/TP3**: Individual take profit percentages (0.5-50%)
- **Stop Loss**: Stop loss percentage (0.5-20%)

All changes are saved to FastAPI backend in real-time!

### 3. Monitor Trading Activity
- **Processing Symbol**: Currently analyzing symbol (e.g., BTC/USDT)
- **Processing Status**: idle, vlm_processing, order_placing, completed, vlm_failed
- **Queue Size**: Number of symbols waiting to be processed
- **Trading Stats**: 
  - Logic checks
  - Symbols queued/processed
  - Successes/failures
  - Buy signals found

---

## 🔄 How Credential Sync Works

**Automatic Sync in 3 Steps:**

1. **You select exchange** (Bitget/Binance) in app → Stored in Redux
2. **You add/update credentials** in Exchange Selector → Stored in Redux
3. **Auto Trade page detects change** → Automatically sends to FastAPI

```
Redux Store Change → Auto Trade Page → FastAPI /api/initialize-exchange
                                    ↓
                              Exchange Connected ✅
```

**When Sync Happens:**
- ✅ First time you open Auto Trade page
- ✅ When you switch exchange in the app
- ✅ When you update credentials
- ✅ When you click "Retry Connection"

---

## 📱 UI Layout

```
┌──────────────────────────────────────────────────────────┐
│ Auto Trade Placer                                        │
│ Connected to BITGET • FastAPI Trading Bot               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ 💵 Start   │  │ 📈 Current │  │ 💰 P&L     │       │
│  │ $1,250.50  │  │ $1,320.75  │  │ +$70.25    │       │
│  │            │  │            │  │ +5.62%     │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🔄 Processing: BTC/USDT                         │   │
│  │    Status: vlm_processing • Queue: 3            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Trading Configuration                           │   │
│  │                                   [Save Config] │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Amount %    [━━━━━━━━━] 20  %                 │   │
│  │  TP Levels   [3]                                │   │
│  │  Stop Loss   [━━━━━━━━━] 5   %                 │   │
│  │  TP1         [━━━━━━━━━] 4   %                 │   │
│  │  TP2         [━━━━━━━━━] 7   %                 │   │
│  │  TP3         [━━━━━━━━━] 10  %                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Trading Statistics                              │   │
│  ├──────┬──────┬──────┬──────┬──────┬──────────────┤   │
│  │Logic │Queued│Proc. │Succ. │Fail. │Buy Signals  │   │
│  │ 150  │  45  │  38  │  35  │  3   │     50      │   │
│  └──────┴──────┴──────┴──────┴──────┴──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 🎮 User Actions

### Change TP/SL Values
1. Adjust sliders or type in number inputs
2. Click **"Save Config"** button
3. See loading state → Success ✅
4. FastAPI now uses new values for trading

### Reset Start Balance
1. Click **"Reset to current"** under Start Balance
2. Confirm dialog
3. Start balance = Current balance
4. P&L resets to $0.00

### Retry Connection
If you see "Connection Failed":
1. Verify FastAPI is running (`http://localhost:8000`)
2. Click **"Retry Connection"** button
3. Credentials are re-synced

---

## 📊 Statistics Explained

| Stat | Meaning |
|------|---------|
| **Logic Checks** | Total technical analysis runs |
| **Symbols Queued** | Total symbols added to processing queue |
| **Symbols Processed** | Successfully analyzed symbols |
| **Pipeline Successes** | Successful order placements |
| **Pipeline Failures** | Failed processing attempts |
| **Buy Signals Found** | Total buy opportunities detected |
| **Sell Signals Discarded** | Sell signals that didn't meet criteria |
| **VLM Bypass Count** | Times VLM analysis was skipped |
| **Duplicates Skipped** | Duplicate symbols filtered out |

---

## ⚙️ Configuration Tips

### Conservative Settings
```
Amount %: 10-20%
TP1: 3-5%
TP2: 5-8%
TP3: 8-12%
Stop Loss: 3-5%
```

### Moderate Settings
```
Amount %: 20-30%
TP1: 4-7%
TP2: 7-10%
TP3: 10-15%
Stop Loss: 5-7%
```

### Aggressive Settings
```
Amount %: 30-50%
TP1: 5-10%
TP2: 10-15%
TP3: 15-20%
Stop Loss: 7-10%
```

---

## 🚨 Status Indicators

| Status | Icon | Meaning |
|--------|------|---------|
| **idle** | ⏸️ | No processing active |
| **vlm_processing** | 🔄 | Analyzing with VLM AI |
| **order_placing** | 📤 | Placing orders on exchange |
| **completed** | ✅ | Successfully placed order |
| **vlm_failed** | ❌ | VLM analysis failed |

---

## 🔔 What Happens in the Background

### Every 5 Seconds
- Fetches latest stats from FastAPI
- Updates balance, P&L
- Refreshes trading statistics

### Every 2 Seconds
- Checks processing status
- Updates current symbol being analyzed
- Updates queue size

### On Exchange Switch
- Detects Redux state change
- Finds credentials for new exchange
- Calls `/api/initialize-exchange`
- Updates FastAPI to use new exchange

---

## 💡 Pro Tips

1. **Monitor P&L**: Green = profit, Red = loss
2. **Watch Queue Size**: High queue = bot is busy
3. **Adjust Conservatively**: Start with smaller % values
4. **Check Processing**: See which symbols are being analyzed
5. **Save Often**: Click Save Config after changes
6. **Reset Balance**: Use when withdrawing funds or starting fresh

---

## 🎓 Example Workflow

### Day 1: Setup
1. Add Bitget credentials in Exchange Selector
2. Navigate to Auto Trade page
3. See "Connected to BITGET" ✅
4. Note start balance: $1,000

### Day 2: Configure
1. Set Amount %: 20%
2. Set TP levels: TP1=4%, TP2=7%, TP3=10%
3. Set Stop Loss: 5%
4. Click "Save Config"

### Day 3: Monitor
1. Check balance: $1,050 (+$50)
2. See P&L: +5.00%
3. Watch processing: BTC/USDT being analyzed
4. Review stats: 10 buy signals found

### Day 7: Switch Exchange
1. Select Binance in Exchange Selector
2. Auto Trade page auto-syncs
3. See "Connected to BINANCE" ✅
4. New start balance loaded

---

## 📞 Need Help?

**Check These First:**
1. Browser Console (F12) for error logs
2. FastAPI logs for backend errors
3. Network tab for failed API calls
4. Redux DevTools for state inspection

**Common Issues:**
- "Not Configured" → Add credentials
- "Connection Failed" → Check FastAPI is running
- Stats not updating → Check network/CORS
- Wrong exchange → Switch in Exchange Selector

---

**You're all set! Start trading! 🚀📈💰**
