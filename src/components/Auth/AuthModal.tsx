import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';
import { sound } from '../../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, signIn, signUp, signInWithGoogle, logout, error, clearError } = useFirebaseAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setSubmitting(true);
    clearError();
    try {
      if (isRegister) {
        await signUp(email, password, displayName || email.split('@')[0]);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch (err) {
      // error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    sound.playClick();
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      // error handled in hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-emerald-700 p-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/20 flex items-center justify-center text-xl shadow-inner">
              👑
            </div>
            <div>
              <h2 className="font-bold text-lg">Ekoopoly Firebase Account</h2>
              <p className="text-xs text-amber-100 opacity-90">
                {user ? 'Manage your Lagos Landlord Profile' : 'Sign in to sync your profile & matches'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { sound.playClick(); onClose(); }}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {user ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  '👑'
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
                  {user.displayName || user.email?.split('@')[0] || 'Lagos Landlord'}
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </h3>
                <p className="text-xs text-neutral-400">{user.email}</p>
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/50 text-emerald-300 text-xs font-medium">
                  Firebase Authentication Active
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-sm transition-all"
                >
                  Continue to Game
                </button>
                <button
                  onClick={async () => {
                    sound.playClick();
                    await logout();
                  }}
                  className="py-3 px-5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/50 text-rose-200 font-medium text-sm transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                  {error}
                </div>
              )}

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-md transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-neutral-800"></div>
                <span className="px-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Or with email</span>
                <div className="flex-grow border-t border-neutral-800"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Landlord / Player Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Chief Adebayo"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="landlord@ekoopoly.ng"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  {submitting ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setIsRegister(!isRegister); clearError(); }}
                  className="text-xs text-amber-400 hover:underline font-medium"
                >
                  {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
