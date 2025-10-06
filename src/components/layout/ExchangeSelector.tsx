'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/infrastructure/store/hooks';
import { 
  setExchangeCredentials, 
  toggleSetupModal, 
  setConnectionStatus 
} from '@/infrastructure/features/exchange/exchangeSlice';
import { useExchange } from '@/hooks/useExchange';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ExchangeSelector () {
  const dispatch = useAppDispatch();
  const { selectedExchange, exchanges, isSetupModalOpen } = useAppSelector(state => state.exchange);
  const { connectToExchange } = useExchange();
  
  const [formData, setFormData] = useState({
    apiKey: '',
    secretKey: '',
    passphrase: '',
  });
  
  const [showSecrets, setShowSecrets] = useState({
    apiKey: false,
    secretKey: false,
    passphrase: false,
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing credentials when modal opens or exchange changes
  useEffect(() => {
    if (isSetupModalOpen && selectedExchange) {
      const currentConfig = exchanges[selectedExchange];
      setFormData({
        apiKey: currentConfig?.apiKey || '',
        secretKey: currentConfig?.secretKey || '',
        passphrase: currentConfig?.passphrase || '',
      });
      setErrors({});
    }
  }, [isSetupModalOpen, selectedExchange, exchanges]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleShowSecret = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    }
    
    if (!formData.secretKey.trim()) {
      newErrors.secretKey = 'Secret Key is required';
    }
    
    // Passphrase is required for Bitget
    if (selectedExchange === 'bitget' && !formData.passphrase.trim()) {
      newErrors.passphrase = 'Passphrase is required for Bitget';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsConnecting(true);
    
    try {
      // Save credentials to store
      dispatch(setExchangeCredentials({
        exchange: selectedExchange,
        apiKey: formData.apiKey.trim(),
        secretKey: formData.secretKey.trim(),
        passphrase: selectedExchange === 'bitget' ? formData.passphrase.trim() : undefined,
      }));
      
      // Set connecting status
      dispatch(setConnectionStatus({
        exchange: selectedExchange,
        status: 'connecting'
      }));
      
      // Wait a bit for the store to update, then try to connect
      setTimeout(async () => {
        const connected = await connectToExchange();
        
        if (connected) {
          dispatch(toggleSetupModal());
        }
        
        setIsConnecting(false);
      }, 100);
      
    } catch (error) {
      console.error('Failed to save credentials:', error);
      dispatch(setConnectionStatus({
        exchange: selectedExchange,
        status: 'error'
      }));
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;
    
    setIsConnecting(true);
    
    // Temporarily save credentials for testing
    dispatch(setExchangeCredentials({
      exchange: selectedExchange,
      apiKey: formData.apiKey.trim(),
      secretKey: formData.secretKey.trim(),
      passphrase: selectedExchange === 'bitget' ? formData.passphrase.trim() : undefined,
    }));
    
    setTimeout(async () => {
      await connectToExchange();
      setIsConnecting(false);
    }, 100);
  };

  if (!isSetupModalOpen) return null;

  const exchangeNames = {
    binance: 'Binance',
    bitget: 'Bitget'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-default rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-default">
          <h2 className="text-lg font-semibold">
            Setup {exchangeNames[selectedExchange]} API
          </h2>
          <button
            onClick={() => dispatch(toggleSetupModal())}
            className="p-1 hover:bg-muted rounded"
            disabled={isConnecting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type={showSecrets.apiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="Enter your API key"
                className={`w-full px-3 py-2 pr-10 border rounded-lg bg-background ${
                  errors.apiKey ? 'border-danger' : 'border-default'
                } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                disabled={isConnecting}
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('apiKey')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isConnecting}
              >
                {showSecrets.apiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.apiKey && <p className="text-sm text-danger mt-1">{errors.apiKey}</p>}
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Secret Key <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type={showSecrets.secretKey ? 'text' : 'password'}
                value={formData.secretKey}
                onChange={(e) => handleInputChange('secretKey', e.target.value)}
                placeholder="Enter your secret key"
                className={`w-full px-3 py-2 pr-10 border rounded-lg bg-background ${
                  errors.secretKey ? 'border-danger' : 'border-default'
                } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                disabled={isConnecting}
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('secretKey')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isConnecting}
              >
                {showSecrets.secretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.secretKey && <p className="text-sm text-danger mt-1">{errors.secretKey}</p>}
          </div>

          {/* Passphrase (Bitget only) */}
          {selectedExchange === 'bitget' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Passphrase <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets.passphrase ? 'text' : 'password'}
                  value={formData.passphrase}
                  onChange={(e) => handleInputChange('passphrase', e.target.value)}
                  placeholder="Enter your passphrase"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg bg-background ${
                    errors.passphrase ? 'border-danger' : 'border-default'
                  } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                  disabled={isConnecting}
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('passphrase')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={isConnecting}
                >
                  {showSecrets.passphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.passphrase && <p className="text-sm text-danger mt-1">{errors.passphrase}</p>}
            </div>
          )}

          {/* Info text */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">Security Note:</p>
            <p>Your API keys are stored locally and never sent to our servers. Make sure to use API keys with limited permissions (trading only, no withdrawal).</p>
          </div>
        </div>

        <div className="flex justify-between p-4 border-t border-default">
          <button
            onClick={handleTestConnection}
            disabled={isConnecting}
            className="px-4 py-2 text-sm border border-default rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Test Connection</span>
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => dispatch(toggleSetupModal())}
              disabled={isConnecting}
              className="px-4 py-2 text-sm border border-default rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isConnecting}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Save & Connect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}