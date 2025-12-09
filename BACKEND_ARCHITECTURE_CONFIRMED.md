# Backend Architecture - CONFIRMED ✅

## Backend Server Status
- **URL**: http://146.59.93.94:3000
- **Status**: ✅ Running
- **Uptime**: 1.83 hours
- **Database**: ✅ Connected
- **Node Version**: v20.19.6
- **API Documentation**: http://146.59.93.94:3000/api (Swagger UI)

## Architecture: Backend-Managed Credentials ✅

### How It Works:

1. **User Authentication**
   - User logs in with email/password
   - Backend returns JWT token
   - Frontend stores JWT in localStorage (`access_token` key)

2. **Exchange Credentials Storage**
   - User adds exchange credentials (API Key, Secret Key) via frontend
   - Frontend sends credentials to backend endpoint: `/api-credentials/save-credentials`
   - Backend encrypts and stores in database linked to user ID

3. **API Requests Flow**
   ```
   Frontend → [JWT Token Only] → Backend → [Fetch User's Exchange Creds from DB] → Exchange API
   ```

4. **Example: Get Account Info**
   ```typescript
   // Frontend sends:
   GET http://146.59.93.94:3000/binance/account-info
   Headers: { Authorization: Bearer <jwt_token> }
   
   // Backend does:
   1. Validates JWT token
   2. Extracts user ID from token
   3. Fetches user's Binance credentials from database
   4. Makes authenticated call to Binance API
   5. Returns data to frontend
   ```

## What Frontend Should Send

### ✅ CORRECT - Send Only JWT Token
```typescript
const response = await fetch(`${API_BASE_URL}/binance/account-info`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${TokenStorage.getAccessToken()}`,
        'Content-Type': 'application/json',
    }
});
```

### ❌ WRONG - Don't Send Exchange Credentials in Headers
```typescript
// DON'T DO THIS:
headers: {
    'Authorization': `Bearer ${token}`,
    'x-api-key': credentials.apiKey,  // ❌ Backend gets this from DB
    'x-secret-key': credentials.secretKey  // ❌ Backend gets this from DB
}
```

## Fixed Issues

### ✅ Fix 1: Login Redirect
**File**: `src/app/login/page.tsx`
- Added `router.push('/dashboard')` after successful login
- Prevents components from mounting on login page

### ✅ Fix 2: Balance Component Authentication
**File**: `src/components/Order/balance.tsx`
- Added JWT token to fetch request
- Added TokenStorage import

## Remaining Issues to Fix

### 🔴 Issue 1: Login Endpoint - 400 Bad Request

**Current Error**: 
```
146.59.93.94:3000/auth/login - 400 Bad Request
```

**Possible Causes**:
1. Wrong credentials (email/password)
2. Endpoint might be different (check Swagger at `/api`)
3. Request body format mismatch

**Action Required**:
1. Check Swagger documentation at http://146.59.93.94:3000/api
2. Verify correct login endpoint and body format
3. Test with known good credentials

### 🟡 Issue 2: Components Making API Calls Too Early

**Current Behavior**:
- Components mount and make API calls before authentication completes
- Results in 401 errors

**Solutions Already Implemented**:
- Login redirect to dashboard (prevents login page component calls)
- AuthGuard checks authentication before allowing access

**Additional Fix Needed**:
- Components should check for valid JWT token before making API calls
- Add loading states while authentication is being verified

## Updated API Call Pattern

### Template for All API Calls:
```typescript
import TokenStorage from '@/lib/tokenStorage';

export async function callExchangeAPI(endpoint: string) {
    const token = TokenStorage.getAccessToken();
    
    if (!token) {
        throw new Error('Not authenticated. Please login.');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });
    
    if (!response.ok) {
        if (response.status === 401) {
            // Token expired or invalid
            TokenStorage.clearTokens();
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}
```

## Exchange Credentials Flow

### Step 1: User Logs In
```typescript
POST /auth/login
Body: { email: "user@example.com", password: "password" }
Response: { token: "jwt_token", user: { id, email, ... } }
```

### Step 2: User Adds Exchange Credentials
```typescript
POST /api-credentials/save-credentials
Headers: { Authorization: "Bearer jwt_token" }
Body: {
    exchange: "binance",
    apiKey: "...",
    secretKey: "...",
    label: "My Trading Account"
}
```

### Step 3: User Makes Trading Requests
```typescript
GET /binance/account-info
Headers: { Authorization: "Bearer jwt_token" }

// Backend automatically:
// 1. Gets user ID from JWT
// 2. Fetches Binance credentials from DB
// 3. Makes authenticated Binance API call
// 4. Returns data
```

## Security Model

### ✅ Secure (Current Implementation)
- Exchange credentials stored encrypted in backend database
- Only JWT token sent from frontend
- Backend validates token and fetches credentials server-side
- Credentials never exposed to frontend

### ❌ Insecure (What We're NOT Doing)
- Storing raw exchange credentials in frontend Redux
- Sending exchange credentials with every request
- Exposing credentials in browser localStorage/sessionStorage

## Testing Checklist

- [ ] Test login with valid credentials
- [ ] Verify JWT token is stored in localStorage as `access_token`
- [ ] Test protected routes redirect to login without token
- [ ] Test API calls fail gracefully without token
- [ ] Test exchange credential saving
- [ ] Test exchange API calls with valid JWT
- [ ] Verify 401 errors clear token and redirect to login

## Next Steps

1. **Check Swagger Documentation** at http://146.59.93.94:3000/api
2. **Verify Login Endpoint** - confirm correct route and body format
3. **Test with Valid Credentials** - ensure backend authentication works
4. **Add Error Boundaries** - better handling of 401/403 errors across app
5. **Add Token Refresh Logic** - implement refresh token flow if needed
