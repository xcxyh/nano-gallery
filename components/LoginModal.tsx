'use client';

import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { X, KeyRound, AlertCircle, UserPlus, LogIn, Lock } from 'lucide-react';
import { loginAction, registerAction } from '@/app/actions';
import { User } from '@/types';
import { createClient } from '@/utils/supabase/client';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialError?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, initialError = '' }) => {
  const t = useTranslations('login');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(initialError);
    }
  }, [initialError, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      setLoading(true);
      setError('');
      try {
        let result;
        if (isRegistering) {
          result = await registerAction(email, password, accessCode);
        } else {
          result = await loginAction(email, password);
        }

        if (result.success && result.user) {
          onLoginSuccess(result.user);
          onClose();
          setEmail('');
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

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const redirectUrl = new URL(`/${locale}/auth/callback`, window.location.origin);
      redirectUrl.searchParams.set('next', pathname || `/${locale}`);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl.toString()
        }
      });

      if (error) {
        setError(t('googleFailed'));
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || t('googleFailed'));
      setLoading(false);
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
            <h2 className="text-2xl font-bold text-white">{isRegistering ? t('joinStudio') : t('welcomeBack')}</h2>
            <p className="text-sm text-neutral-500 mt-1">{isRegistering ? t('joinDesc') : t('loginDesc')}</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-3.5 bg-white hover:bg-neutral-100 text-neutral-950 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#EA4335" d="M9 7.364v3.49h4.85c-.213 1.122-.852 2.072-1.81 2.71l2.925 2.27c1.705-1.57 2.689-3.879 2.689-6.625 0-.639-.057-1.252-.164-1.845H9Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.468-.803 5.958-2.165l-2.925-2.27c-.803.541-1.83.86-3.033.86-2.338 0-4.32-1.578-5.03-3.697H.95v2.343A8.998 8.998 0 0 0 9 18Z"/>
              <path fill="#4A90E2" d="M3.97 10.728A5.41 5.41 0 0 1 3.69 9c0-.598.098-1.18.28-1.728V4.93H.95A9.004 9.004 0 0 0 0 9c0 1.45.344 2.818.95 4.07l3.02-2.343Z"/>
              <path fill="#FBBC05" d="M9 3.575c1.32 0 2.502.454 3.435 1.337l2.582-2.582C13.46.88 11.421 0 9 0A8.998 8.998 0 0 0 .95 4.93l3.02 2.343C4.68 5.153 6.662 3.575 9 3.575Z"/>
            </svg>
            {loading ? t('processing') : t('continueWithGoogle')}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-600">{t('or')}</span>
            <div className="h-px flex-1 bg-neutral-800" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
              autoFocus
              required
            />
            <p className="text-xs text-neutral-600">
              {t('emailHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              {t('password')}
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
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  {t('accessCode')}
                </label>
              </div>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={t('accessCodePlaceholder')}
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
            disabled={!email.trim() || !password.trim() || loading}
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? t('processing') : (
              isRegistering ? <><UserPlus size={18} /> {t('createAccount')}</> : <><LogIn size={18} /> {tCommon('login')}</>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-800 text-center">
          <p className="text-neutral-400 text-sm">
            {isRegistering ? t('haveAccount') : t('noAccount')}
          </p>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setAccessCode('');
            }}
            className="text-yellow-400 hover:text-yellow-300 font-medium text-sm mt-1 transition-colors"
          >
            {isRegistering ? t('loginInstead') : t('createOne')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
