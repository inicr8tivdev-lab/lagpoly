import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, Sparkles, Music, Disc } from 'lucide-react';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';
import { sound } from '../../utils/audio';
import { lagosVibeAudio } from '../../utils/cityBoysAudio';

interface LoginPageProps {
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onContinueAsGuest }) => {
  const { signIn, signUp, signInWithGoogle, error, clearError } = useFirebaseAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(() => lagosVibeAudio.getIsPlaying());

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
    } catch (err) {
      // error handled in hook
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Music Bar */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={() => lagosVibeAudio.toggle()}
          className={`px-3.5 py-1.5 rounded-full border text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg ${
            isMusicPlaying
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-300'
          }`}
          title="Toggle Lagos Vibe: 'City Boys' instrumental background track"
        >
          {isMusicPlaying ? (
            <>
              <Disc className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-emerald-400 font-extrabold">City Boys: ON</span>
            </>
          ) : (
            <>
              <Music className="w-4 h-4 text-neutral-400" />
              <span>Lagos Vibe</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-neutral-900/95 border-2 border-amber-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-3xl shadow-xl shadow-amber-500/20 mb-1">
            👑
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              <span>🇳🇬 Firebase Authentication</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              EKO MONOPOLY
            </h1>
            <p className="text-xs text-neutral-400">
              {isRegister ? 'Create your Firebase Landlord Account' : 'Sign in to access your Lagos real estate empire'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center my-2">
          <div className="flex-grow border-t border-neutral-800"></div>
          <span className="px-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Or email & password</span>
          <div className="flex-grow border-t border-neutral-800"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Landlord Name / Title</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Chief Adebayo"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-3 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="landlord@ekoopoly.ng"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-3 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-3 pl-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {submitting ? 'Authenticating...' : isRegister ? 'Create Firebase Account' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs pt-1">
          <button
            type="button"
            onClick={() => { sound.playClick(); setIsRegister(!isRegister); clearError(); }}
            className="text-amber-400 hover:underline font-bold"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create User"}
          </button>

          <button
            type="button"
            onClick={() => { sound.playClick(); onContinueAsGuest(); }}
            className="text-neutral-400 hover:text-white font-medium underline"
          >
            Play as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
