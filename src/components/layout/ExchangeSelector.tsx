'use client';

import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/infrastructure/store/hooks';
import { 
  setCredentials,
  saveCredentials,
  ExchangeType,
  getCredentialsForExchange
} from '@/infrastructure/features/exchange/exchangeSlice';
import TokenStorage from '@/lib/tokenStorage';
import { X, Eye, EyeOff, Loader2, Check } from 'lucide-react';

interface ExchangeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeToSetup: ExchangeType;
}

export default function ExchangeSelector({ isOpen, onClose, exchangeToSetup }: ExchangeSelectorProps) {
  const dispatch = useAppDispatch();
  const selectedExchange = useAppSelector(state => state.exchange.selectedExchange);
  
  // Remove credentials checking - we don't store them locally anymore
  // Backend will handle credential validation and updates
  
  const [formData, setFormData] = useState({
    apiKey: '',
    secretKey: '',
    passphrase: '', // Added passphrase
    label: '',
  });
  
  const [showSecrets, setShowSecrets] = useState({
    apiKey: false,
    secretKey: false,
    passphrase: false, // Added passphrase toggle
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Always start with empty form since we don't store credentials locally
  const isUpdating = false; // We don't know if updating or creating new

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        apiKey: '',
        secretKey: '',
        passphrase: '',
        label: '',
      });
      setErrors({});
      setSuccessMessage('');
    }
  }, [isOpen, exchangeToSetup]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear success message when editing
    if (successMessage) {
      setSuccessMessage('');
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

    // Passphrase required for Bitget
    if (exchangeToSetup === 'bitget' && !formData.passphrase.trim()) {
      newErrors.passphrase = 'Passphrase is required for Bitget';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Label is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('🔄 Starting credential save process...');
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const token = TokenStorage.getAccessToken();
      console.log('🔑 Token from TokenStorage:', token ? 'Found' : 'NOT FOUND');

      if (!token) {
        throw new Error('Please login first');
      }

      const credentialData = {
        exchange: exchangeToSetup,
        apiKey: formData.apiKey.trim(),
        secretKey: formData.secretKey.trim(),
        passphrase: formData.passphrase.trim() || undefined,
        label: formData.label.trim(),
      };

      // Only save to database - no local Redux storage
      console.log('📡 Saving credentials to backend...');
      const result = await dispatch(saveCredentials(credentialData)).unwrap();
      console.log('✅ Credentials saved to database:', result);

      console.log(`✅ Credentials saved for ${exchangeToSetup}`);

      // Show success message
      setSuccessMessage(`Credentials saved successfully!`);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
        // Optionally refresh the page or trigger a re-fetch of user data
        // to update the configured exchanges list
        window.location.reload(); // Simple refresh to update configured exchanges
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save credentials:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save credentials';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const exchangeNames: Record<ExchangeType, string> = {
    binance: 'Binance',
    bitget: 'Bitget'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-black/30"
        onClick={() => !isSaving && onClose()}
      />
      
      {/* Modal card */}
      <div className="relative bg-card border border-default rounded-lg w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-default">
          <h2 className="text-lg font-semibold">
            Setup {exchangeNames[exchangeToSetup]} API
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            disabled={isSaving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-success/10 border border-success rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <p className="text-sm text-success">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-danger/10 border border-danger rounded-lg">
              <p className="text-sm text-danger">{errors.submit}</p>
            </div>
          )}

          {/* Label Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Label <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="e.g., My Trading Account"
              className={`w-full px-3 py-2 border rounded-lg bg-background ${
                errors.label ? 'border-danger' : 'border-default'
              } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
              disabled={isSaving}
            />
            {errors.label && <p className="text-sm text-danger mt-1">{errors.label}</p>}
            <p className="text-xs text-muted-foreground mt-1">A friendly name to identify this credential</p>
          </div>

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
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('apiKey')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isSaving}
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
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('secretKey')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isSaving}
              >
                {showSecrets.secretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.secretKey && <p className="text-sm text-danger mt-1">{errors.secretKey}</p>}
          </div>

          {/* Passphrase (Optional - mainly for Bitget) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Passphrase {exchangeToSetup === 'bitget' && <span className="text-danger">*</span>}
              <span className="text-muted-foreground text-xs ml-2">(Optional for Binance, Required for Bitget)</span>
            </label>
            <div className="relative">
              <input
                type={showSecrets.passphrase ? 'text' : 'password'}
                value={formData.passphrase}
                onChange={(e) => handleInputChange('passphrase', e.target.value)}
                placeholder="Enter your API passphrase"
                className={`w-full px-3 py-2 pr-10 border rounded-lg bg-background ${
                  errors.passphrase ? 'border-danger' : 'border-default'
                } focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('passphrase')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isSaving}
              >
                {showSecrets.passphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.passphrase && <p className="text-sm text-danger mt-1">{errors.passphrase}</p>}
          </div>

          {/* Info text */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">🔒 Security Note:</p>
            <p>Your API keys are encrypted and securely stored. They are only used for trading operations. Make sure to use API keys with limited permissions (trading only, no withdrawal).</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-default">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm border border-default rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !!successMessage}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {successMessage && <Check className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : successMessage ? 'Saved!' : 'Save Credentials'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}