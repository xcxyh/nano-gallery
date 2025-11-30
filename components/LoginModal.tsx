'use client';

import React, { useState } from 'react';
import { X, ChevronRight, KeyRound, AlertCircle, UserPlus, LogIn, Lock } from 'lucide-react';
import { loginAction, registerAction } from '@/app/actions';
import { User } from '@/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && password.trim()) {
      setLoading(true);
      setError('');
      try {
        let result;
        if (isRegistering) {
            result = await registerAction(name, password, accessCode);
        } else {
            result = await loginAction(name, password);
        }

        if (result.success && result.user) {
          onLoginSuccess(result.user);
          onClose();
          setName('');
          setPassword('');
          setAccessCode('');
        } else {
            setError(result.error || 'Authentication failed');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{isRegistering ? 'Join the Studio' : 'Welcome Back'}</h2>
            <p className="text-sm text-neutral-500 mt-1">{isRegistering ? 'Create your profile to start generating.' : 'Login to access your library.'}</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CyberArtist_99"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-yellow-400/50 transition-colors pl-10"
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2">
                    <KeyRound size={12} className="text-neutral-500" />
                    <label 
                    className="text-xs font-medium text-neutral-400 uppercase tracking-wider cursor-help"
                    title="Dev Hint: Use 'BANANA_MASTER' to create an admin"
                    >
                    Access Code (Optional)
                    </label>
                </div>
                <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="For admin privileges"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-yellow-400/50 transition-colors placeholder:text-neutral-700"
                />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-900/10 p-3 rounded-lg border border-red-900/20">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !password.trim() || loading}
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Processing...' : (
                isRegistering ? <><UserPlus size={18} /> Create Account</> : <><LogIn size={18} /> Login</>
            )}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-neutral-800 text-center">
             <p className="text-neutral-400 text-sm">
                {isRegistering ? "Already have an account?" : "Don't have an account?"}
             </p>
             <button 
                onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    setAccessCode('');
                }}
                className="text-yellow-400 hover:text-yellow-300 font-medium text-sm mt-1 transition-colors"
             >
                {isRegistering ? "Log in instead" : "Create an account"}
             </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;