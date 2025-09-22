// components/wallet/security.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, Lock, Key, Activity, Download } from 'lucide-react';

interface SecurityTabProps {
  securityInfo: any; // Changed to any to handle both structures
}

// Component to format dates consistently on client-side only
const DateFormatter = ({ timestamp }: { timestamp: string | number }) => {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useMemo(() => {
    if (typeof window !== 'undefined' && timestamp) {
      const date = new Date(timestamp);
      setFormattedDate(date.toLocaleDateString());
    }
  }, [timestamp]);

  return <>{formattedDate || 'Loading...'}</>;
};

export default function SecurityTab({ securityInfo }: SecurityTabProps) {
  // Handle both old and new response structures
  const processedSecurityInfo = useMemo(() => {
    if (!securityInfo) return null;
    
    // If it's the old structure (has apiRestrictions)
    if (securityInfo.apiRestrictions) {
      const data = securityInfo.apiRestrictions;
      return {
        isSecure: data.ipRestrict && data.enableWithdrawals,
        ipRestricted: data.ipRestrict,
        apiKeyCreated: typeof window !== 'undefined' 
          ? new Date(data.createTime).toLocaleDateString()
          : 'Loading...',
        canTradeSpot: data.enableSpotAndMarginTrading,
        canTradeFutures: data.enableFutures,
        canWithdraw: data.enableWithdrawals,
        canInternalTransfer: data.enableInternalTransfer,
        advancedFeatures: {
          marginTrading: data.enableMargin || false,
          optionsTrading: data.enableVanillaOptions || false,
          portfolioMargin: data.enablePortfolioMarginTrading || false
        },
        recommendations: [
          'Enable 2FA on your Binance account (do this in Binance web interface)',
          'Regularly review and rotate your API keys',
          'Set up withdrawal whitelist addresses for added security'
        ].filter(rec => {
          // Filter recommendations based on current settings
          if (rec.includes('2FA') && securityInfo.twoFactorEnabled) return false;
          if (rec.includes('IP restriction') && data.ipRestrict) return false;
          return true;
        }),
        lastUpdated: typeof window !== 'undefined' 
          ? new Date().toISOString()
          : 'Loading...'
      };
    }
    
    // If it's the new structure
    if (securityInfo.isSecure !== undefined) {
      return {
        ...securityInfo,
        apiKeyCreated: typeof window !== 'undefined' 
          ? new Date(securityInfo.apiKeyCreated).toLocaleDateString()
          : 'Loading...',
        lastUpdated: typeof window !== 'undefined' 
          ? new Date(securityInfo.lastUpdated).toLocaleString()
          : 'Loading...'
      };
    }
    
    return null;
  }, [securityInfo]);

  if (!processedSecurityInfo) {
    return (
      <div className="bg-card border border-default rounded-lg p-8 text-center">
        <Shield className="h-12 w-12 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-card-foreground mb-2">Loading Security Info</h3>
        <p className="text-muted">Security information will appear here.</p>
      </div>
    );
  }

  const { isSecure, ipRestricted, apiKeyCreated, canTradeSpot, canTradeFutures, canWithdraw, canInternalTransfer, advancedFeatures, recommendations, lastUpdated } = processedSecurityInfo;
  
  const advancedFeaturesCount = Object.values(advancedFeatures || {}).filter(Boolean).length;

  const getStatusIcon = (isSecure: boolean) => {
    return isSecure ? (
      <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
    ) : (
      <XCircle className="h-12 w-12 text-danger mx-auto mb-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Security Status Header */}
      <div className="bg-card border border-default rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon(isSecure)}
            <div>
              <h3 className="text-xl font-semibold text-card-foreground">
                Account Security Status
              </h3>
              <p className={`text-sm font-medium mt-1 ${
                isSecure ? 'text-success' : 'text-danger'
              }`}>
                {isSecure ? 'Your account is secure' : 'Security review required'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">API Key Created</p>
            <p className="text-sm font-medium text-card-foreground">
              {apiKeyCreated}
            </p>
          </div>
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* IP Restriction */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">IP Restriction</p>
              <p className={`text-sm font-semibold ${
                ipRestricted ? 'text-success' : 'text-warning'
              }`}>
                {ipRestricted ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              ipRestricted ? 'bg-success-light' : 'bg-warning-light'
            }`}>
              {ipRestricted ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
            </div>
          </div>
        </div>

        {/* Spot Trading */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Spot Trading</p>
              <p className={`text-sm font-semibold ${
                canTradeSpot ? 'text-success' : 'text-danger'
              }`}>
                {canTradeSpot ? 'Allowed' : 'Restricted'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              canTradeSpot ? 'bg-success-light' : 'bg-danger-light'
            }`}>
              {canTradeSpot ? (
                <Activity className="h-5 w-5 text-success" />
              ) : (
                <Lock className="h-5 w-5 text-danger" />
              )}
            </div>
          </div>
        </div>

        {/* Futures Trading */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Futures Trading</p>
              <p className={`text-sm font-semibold ${
                canTradeFutures ? 'text-success' : 'text-danger'
              }`}>
                {canTradeFutures ? 'Allowed' : 'Restricted'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              canTradeFutures ? 'bg-success-light' : 'bg-danger-light'
            }`}>
              {canTradeFutures ? (
                <Activity className="h-5 w-5 text-success" />
              ) : (
                <Lock className="h-5 w-5 text-danger" />
              )}
            </div>
          </div>
        </div>

        {/* Withdrawals */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Withdrawals</p>
              <p className={`text-sm font-semibold ${
                canWithdraw ? 'text-success' : 'text-danger'
              }`}>
                {canWithdraw ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              canWithdraw ? 'bg-success-light' : 'bg-danger-light'
            }`}>
              {canWithdraw ? (
                <Download className="h-5 w-5 text-success" />
              ) : (
                <Lock className="h-5 w-5 text-danger" />
              )}
            </div>
          </div>
        </div>

        {/* Internal Transfers */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Internal Transfers</p>
              <p className={`text-sm font-semibold ${
                canInternalTransfer ? 'text-success' : 'text-warning'
              }`}>
                {canInternalTransfer ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              canInternalTransfer ? 'bg-success-light' : 'bg-warning-light'
            }`}>
              {canInternalTransfer ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
            </div>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Advanced Features</p>
              <p className="text-sm font-semibold text-muted">
                {advancedFeaturesCount} Active
              </p>
            </div>
            <div className="p-2 rounded-full bg-info-light">
              <Key className="h-5 w-5 text-info" />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-card border border-default rounded-lg">
          <div className="px-6 py-4 border-b border-default">
            <h3 className="text-lg font-medium text-card-foreground">Security Recommendations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recommendations.map((recommendation: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, index: React.Key | null | undefined) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-card-foreground">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center pt-4 border-t border-default">
        <p className="text-sm text-muted">
          Last updated: {lastUpdated}
        </p>
      </div>
    </div>
  );
}