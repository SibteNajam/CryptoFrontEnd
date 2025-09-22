// components/wallet/security.tsx
'use client';

import React from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, Lock, Key, Activity, Download } from 'lucide-react';
import { SecurityInfoResponse } from '../../infrastructure/api/WalletApi';

interface SecurityTabProps {
  securityInfo: SecurityInfoResponse | null;
}

export default function SecurityTab({ securityInfo }: SecurityTabProps) {
  if (!securityInfo) {
    return (
      <div className="bg-card border border-default rounded-lg p-8 text-center">
        <Shield className="h-12 w-12 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-card-foreground mb-2">Loading Security Info</h3>
        <p className="text-muted">Security information will appear here.</p>
      </div>
    );
  }

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
            {getStatusIcon(securityInfo.isSecure)}
            <div>
              <h3 className="text-xl font-semibold text-card-foreground">
                Account Security Status
              </h3>
              <p className={`text-sm font-medium mt-1 ${
                securityInfo.isSecure ? 'text-success' : 'text-danger'
              }`}>
                {securityInfo.isSecure ? 'Your account is secure' : 'Security review required'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">API Key Created</p>
            <p className="text-sm font-medium text-card-foreground">
              {securityInfo.apiKeyCreated}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* IP Restriction */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">IP Restriction</p>
              <p className={`text-sm font-semibold ${
                securityInfo.ipRestricted ? 'text-success' : 'text-warning'
              }`}>
                {securityInfo.ipRestricted ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              securityInfo.ipRestricted ? 'bg-success-light' : 'bg-warning-light'
            }`}>
              {securityInfo.ipRestricted ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
            </div>
          </div>
        </div>

        {/* Trading Permissions */}
        <div className="bg-card border border-default rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Spot Trading</p>
              <p className={`text-sm font-semibold ${
                securityInfo.canTradeSpot ? 'text-success' : 'text-danger'
              }`}>
                {securityInfo.canTradeSpot ? 'Allowed' : 'Restricted'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              securityInfo.canTradeSpot ? 'bg-success-light' : 'bg-danger-light'
            }`}>
              {securityInfo.canTradeSpot ? (
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
                securityInfo.canTradeFutures ? 'text-success' : 'text-danger'
              }`}>
                {securityInfo.canTradeFutures ? 'Allowed' : 'Restricted'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              securityInfo.canTradeFutures ? 'bg-success-light' : 'bg-danger-light'
            }`}>
              {securityInfo.canTradeFutures ? (
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
                securityInfo.canWithdraw ? 'text-success' : 'text-danger'
              }`}>
                {securityInfo.canWithdraw ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              securityInfo.canWithdraw ? 'bg-success-light' : 'bg-danger-light'
            }`}>
              {securityInfo.canWithdraw ? (
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
                securityInfo.canInternalTransfer ? 'text-success' : 'text-warning'
              }`}>
                {securityInfo.canInternalTransfer ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              securityInfo.canInternalTransfer ? 'bg-success-light' : 'bg-warning-light'
            }`}>
              {securityInfo.canInternalTransfer ? (
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
                {Object.values(securityInfo.advancedFeatures).filter(Boolean).length} Active
              </p>
            </div>
            <div className="p-2 rounded-full bg-info-light">
              <Key className="h-5 w-5 text-info" />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {securityInfo.recommendations.length > 0 && (
        <div className="bg-card border border-default rounded-lg">
          <div className="px-6 py-4 border-b border-default">
            <h3 className="text-lg font-medium text-card-foreground">Security Recommendations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {securityInfo.recommendations.map((recommendation, index) => (
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
          Last updated: {new Date(securityInfo.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}