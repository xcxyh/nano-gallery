'use client';

import React, { useState } from 'react';
import { X, ChevronRight, KeyRound, AlertCircle } from 'lucide-react';
import { loginAction } from '@/app/actions';
import { User } from '@/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [name, setName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setLoading(true);
      setError('');
      try {
        const result = await loginAction(name, accessCode);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
          onClose();
          setName('');
          setAccessCode('');
        }
      } catch (err) {
        setError('Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Welcome Creator</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
              Choose a Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CyberArtist_99"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-2">
             <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-neutral-500" />
                <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
                  Access Code (Optional)
                </label>
             </div>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter code for premium access"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
            />
            <p className="text-[10px] text-neutral-600">
                Leave blank for standard trial access (3 credits).
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : <><span className="font-bold">Start Creating</span> <ChevronRight size={18} /></>}
          </button>
        </form>
        
        <p className="text-center text-xs text-neutral-600 mt-4">
          By continuing, you agree to unleash your creativity responsibly.
        </p>
      </div>
    </div>
  );
};

export default LoginModal;