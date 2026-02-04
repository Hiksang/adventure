'use client';

import { useState } from 'react';
import {
  AgeRange,
  CountryCode,
  AGE_RANGES,
  SUPPORTED_COUNTRIES,
  verifyAgeCredential,
  verifyNationalityCredential,
  updateCredential,
} from '@/lib/worldid/credentials';

interface CredentialVerificationPromptProps {
  type: 'age' | 'nationality';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (type: 'age' | 'nationality', value: string) => void;
}

export default function CredentialVerificationPrompt({
  type,
  isOpen,
  onClose,
  onSuccess,
}: CredentialVerificationPromptProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!selectedValue) {
      setError('Please select an option');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      let result;
      if (type === 'age') {
        result = await verifyAgeCredential(selectedValue as AgeRange);
      } else {
        result = await verifyNationalityCredential(selectedValue as CountryCode);
      }

      if (result.verified) {
        updateCredential(type, selectedValue as AgeRange | CountryCode);
        onSuccess(type, selectedValue);
        onClose();
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      setError('An error occurred during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const options = type === 'age'
    ? Object.entries(AGE_RANGES).map(([key, value]) => ({
        value: key,
        label: value.label,
        description: `Ages ${value.min}${value.max === 999 ? '+' : `-${value.max}`}`,
      }))
    : Object.entries(SUPPORTED_COUNTRIES).map(([key, value]) => ({
        value: key,
        label: value,
        description: key,
      }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              type === 'age'
                ? 'bg-gradient-to-br from-purple-400 to-purple-600'
                : 'bg-gradient-to-br from-blue-400 to-blue-600'
            }`}>
              {type === 'age' ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Verify {type === 'age' ? 'Age Range' : 'Nationality'}
              </h2>
              <p className="text-sm text-white/60">
                Select your {type === 'age' ? 'age range' : 'nationality'} to verify
              </p>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedValue(option.value)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedValue === option.value
                    ? type === 'age'
                      ? 'bg-purple-500/20 border-purple-500 border-2'
                      : 'bg-blue-500/20 border-blue-500 border-2'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{option.label}</p>
                    <p className="text-sm text-white/50">{option.description}</p>
                  </div>
                  {selectedValue === option.value && (
                    <svg className={`w-5 h-5 ${type === 'age' ? 'text-purple-400' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-2">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Privacy notice */}
        <div className="px-4 py-3 bg-white/5">
          <p className="text-xs text-white/40 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>
              <strong className="text-white/60">Zero-Knowledge Proof:</strong> We verify you meet the criteria without storing your actual {type === 'age' ? 'birthdate' : 'passport details'}.
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            disabled={isVerifying}
            className="flex-1 py-3 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={!selectedValue || isVerifying}
            className={`flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
              type === 'age'
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify with World ID'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing credential verification state
 */
export function useCredentialVerification() {
  const [isOpen, setIsOpen] = useState(false);
  const [verificationType, setVerificationType] = useState<'age' | 'nationality'>('age');

  const openAgeVerification = () => {
    setVerificationType('age');
    setIsOpen(true);
  };

  const openNationalityVerification = () => {
    setVerificationType('nationality');
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    verificationType,
    openAgeVerification,
    openNationalityVerification,
    close,
  };
}
