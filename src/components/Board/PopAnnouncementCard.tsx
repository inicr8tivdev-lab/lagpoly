import React, { useEffect, useState } from 'react';
import { X, Bell, Megaphone, Sparkles } from 'lucide-react';

export interface PopAnnouncement {
  id: string;
  text: string;
  timestamp: number;
  type?: 'roll' | 'money' | 'jail' | 'buy' | 'info';
}

interface PopAnnouncementCardProps {
  announcement: PopAnnouncement | null;
  onDismiss: () => void;
  onOpenFullLog: () => void;
}

export const PopAnnouncementCard: React.FC<PopAnnouncementCardProps> = ({
  announcement,
  onDismiss,
  onOpenFullLog,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!announcement) {
      setProgress(100);
      setSecondsRemaining(10);
      return;
    }

    setProgress(100);
    setSecondsRemaining(10);
    const startTime = Date.now();
    const duration = 10000; // 10 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      const remainingSecs = Math.max(0, Math.ceil((duration - elapsed) / 1000));

      setProgress(remainingPct);
      setSecondsRemaining(remainingSecs);

      if (elapsed >= duration) {
        clearInterval(interval);
        onDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [announcement?.id, onDismiss]);

  if (!announcement) return null;

  // Determine card theme
  const isJail =
    announcement.text.includes('Kirikiri') ||
    announcement.text.includes('LASTMA') ||
    announcement.text.includes('🚨') ||
    announcement.text.includes('interception');

  const isChance =
    announcement.text.includes('Chance') ||
    announcement.text.includes('Opportunity') ||
    announcement.text.includes('❓');

  const isChest =
    announcement.text.includes('Lagos Hustle') ||
    announcement.text.includes('Chest') ||
    announcement.text.includes('📦');

  const isMoney =
    announcement.text.includes('₦') ||
    announcement.text.includes('rent') ||
    announcement.text.includes('bought') ||
    announcement.text.includes('Jackpot') ||
    announcement.text.includes('salary');

  const isDice = announcement.text.includes('rolled');

  const borderColor = isJail
    ? 'border-rose-500 shadow-rose-950/70'
    : isChance
    ? 'border-orange-500 shadow-orange-950/70'
    : isChest || isMoney
    ? 'border-emerald-500 shadow-emerald-950/70'
    : 'border-amber-500 shadow-amber-950/70';

  const badgeColor = isJail
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : isChance
    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
    : isChest || isMoney
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <div className="absolute inset-x-2 md:inset-x-5 top-11 z-40 animate-in fade-in zoom-in-95 duration-200">
      <div
        className={`relative overflow-hidden bg-neutral-900/98 border-2 ${borderColor} rounded-2xl shadow-2xl backdrop-blur-md p-3 md:p-3.5 text-neutral-100 flex flex-col gap-2`}
      >
        {/* Playing Card Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-neutral-800 border border-neutral-700 text-sm">
              {isJail ? '🚨' : isChance ? '❓' : isChest ? '📦' : isDice ? '🎲' : isMoney ? '💰' : '📢'}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
              {isJail
                ? 'LASTMA & POLICE BULLETIN'
                : isChance
                ? 'OPPORTUNITY / CHANCE'
                : isChest
                ? 'LAGOS HUSTLE DEED'
                : isDice
                ? 'DICE ROLL EVENT'
                : 'LAGOS STREET DISPATCH'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 10s Countdown Badge */}
            <span
              className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-amber-400"
              title="Auto-vanishes in seconds"
            >
              {secondsRemaining}s
            </span>

            {/* Link to Full Log (Bell) */}
            <button
              type="button"
              onClick={onOpenFullLog}
              className="text-[10px] font-bold text-neutral-300 hover:text-white underline cursor-pointer px-1 py-0.5 flex items-center gap-0.5"
              title="View all announcements via top Bell icon"
            >
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Full Log</span>
            </button>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Dismiss announcement card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Announcement Body */}
        <p className="text-xs md:text-sm font-bold text-white leading-snug line-clamp-3 text-left">
          {announcement.text}
        </p>

        {/* 10-Second Countdown Progress Bar */}
        <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-0.5">
          <div
            className={`h-full transition-all duration-100 ease-linear rounded-full ${
              isJail
                ? 'bg-rose-500'
                : isChance
                ? 'bg-orange-500'
                : isChest || isMoney
                ? 'bg-emerald-400'
                : 'bg-amber-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
