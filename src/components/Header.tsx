import React, { useState, useEffect } from 'react';
import { GameState, Player, ChatMessage } from '../types/game';
import { TOKENS } from '../data/lagosBoard';
import { formatNaira } from '../utils/currency';
import { sound } from '../utils/audio';
import { lagosVibeAudio } from '../utils/cityBoysAudio';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Copy,
  Check,
  X,
  Bell,
  Music,
  Disc,
  WifiOff,
  RotateCcw,
} from 'lucide-react';
import { AnnouncementsModal } from './Modals/AnnouncementsModal';
import { PlayerAvatar } from './Common/PlayerAvatar';

interface HeaderProps {
  gameState: GameState;
  myPlayerId: string | null;
  compactCurrency: boolean;
  onToggleCurrency: () => void;
  announcements?: ChatMessage[];
  isAnnouncementsOpen?: boolean;
  onOpenAnnouncements?: () => void;
  onCloseAnnouncements?: () => void;
  isOffline?: boolean;
  onResetGame?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameState,
  myPlayerId,
  compactCurrency,
  onToggleCurrency,
  announcements = [],
  isAnnouncementsOpen,
  onOpenAnnouncements,
  onCloseAnnouncements,
  isOffline = true,
  onResetGame,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [isMusicPlaying, setIsMusicPlaying] = useState(() => lagosVibeAudio.getIsPlaying());
  const [showRules, setShowRules] = useState(false);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const unsubscribe = lagosVibeAudio.subscribe(setIsMusicPlaying);
    return () => unsubscribe();
  }, []);

  const handleOpenAnnouncements = () => {
    if (onOpenAnnouncements) onOpenAnnouncements();
    setShowAnnouncementsModal(true);
  };

  const handleCloseAnnouncements = () => {
    if (onCloseAnnouncements) onCloseAnnouncements();
    setShowAnnouncementsModal(false);
  };

  const modalOpen = isAnnouncementsOpen !== undefined ? isAnnouncementsOpen : showAnnouncementsModal;

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setSoundEnabled(sound.enabled);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleExitMatch = () => {
    if (window.confirm('Do you want to exit to the Main Menu? Your progress is saved locally.')) {
      if (onResetGame) onResetGame();
    }
  };

  return (
    <>
      <header className="bg-neutral-900/90 border-b border-neutral-800 px-3 md:px-6 py-2.5 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Brand & Room Info */}
          <div className="flex items-center justify-between md:justify-start gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇳🇬</span>
              <div>
                <h1 className="text-sm md:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>EKO MONOPOLY</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                    LAGOS
                  </span>
                </h1>
              </div>
            </div>

            {/* Offline badge or Room Code */}
            {isOffline ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs font-bold text-emerald-300"
                title="100% Offline Game - Playing locally without internet"
              >
                <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Offline</span>
              </div>
            ) : (
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs font-mono font-bold text-neutral-300 transition cursor-pointer"
                title="Click to copy Room Code"
              >
                <span className="text-neutral-500 text-[10px]">ROOM:</span>
                <span className="text-emerald-400">{gameState.roomCode}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
              </button>
            )}
          </div>

          {/* Active Players Strip */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {gameState.players.map((player: Player, index: number) => {
              const isTurn = gameState.currentTurnIndex === index;
              const isMe = player.id === myPlayerId;
              const propCount = Object.values(gameState.properties).filter(
                (p) => p.ownerId === player.id
              ).length;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs shrink-0 transition-all ${
                    player.isBankrupt
                      ? 'bg-neutral-950/40 border-neutral-900 opacity-40 line-through'
                      : isTurn
                      ? 'bg-neutral-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                      : 'bg-neutral-950/70 border-neutral-800'
                  }`}
                >
                  <PlayerAvatar player={player} size="xs" showName={false} />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-neutral-100 max-w-[70px] truncate text-xs">
                        {player.name}
                      </span>
                      {isMe && <span className="text-[9px] text-emerald-400 font-black">(You)</span>}
                      {player.isAi && (
                        <span
                          className={`text-[8px] font-black uppercase px-1 rounded border ${
                            player.aiDifficulty === 'hard'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : player.aiDifficulty === 'easy'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {player.aiDifficulty || 'MED'}
                        </span>
                      )}
                      {player.inJail && (
                        <span title="In Kirikiri Prison" className="text-[10px]">
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="font-mono font-bold text-emerald-400">
                        {formatNaira(player.cash, compactCurrency)}
                      </span>
                      <span className="text-neutral-500">• {propCount} props</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls: Lagos Vibe Music, Currency, Sound, Exit, Help */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Ambient Lagos Vibe (City Boys Instrumental) Toggle Button */}
            <button
              onClick={() => lagosVibeAudio.toggle()}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isMusicPlaying
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-900/50 ring-1 ring-emerald-500/50'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
              }`}
              title={
                isMusicPlaying
                  ? "Pause Lagos Vibe: 'City Boys' Instrumental"
                  : "Play Lagos Vibe: 'City Boys' Instrumental"
              }
            >
              {isMusicPlaying ? (
                <>
                  <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="hidden sm:inline text-neutral-300">Lagos Vibe:</span>
                  <span className="text-emerald-400 font-extrabold text-[11px] sm:text-xs">City Boys</span>
                  <span className="flex items-center gap-0.5 ml-0.5 h-3">
                    <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="w-0.5 h-3 bg-emerald-300 rounded-full animate-bounce" />
                    <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  </span>
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden sm:inline text-neutral-400">Lagos Vibe:</span>
                  <span className="text-neutral-300 font-semibold text-[11px] sm:text-xs">City Boys</span>
                </>
              )}
            </button>

            {/* Currency Mode Toggle */}
            <button
              onClick={onToggleCurrency}
              className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-300 transition cursor-pointer"
              title="Toggle full Naira or compact format"
            >
              <span>{compactCurrency ? '₦ Compact' : '₦ Full'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition cursor-pointer"
              title={soundEnabled ? 'Mute SFX' : 'Unmute SFX'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
            </button>

            {/* Announcements Bell Icon */}
            <button
              onClick={handleOpenAnnouncements}
              className="relative p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition cursor-pointer"
              title="View all Lagos Street Announcements"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {announcements.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center shadow">
                  {announcements.length > 99 ? '99+' : announcements.length}
                </span>
              )}
            </button>

            {/* New Game / Main Menu Button */}
            {onResetGame && (
              <button
                onClick={handleExitMatch}
                className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                title="Exit to Main Menu"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}

            {/* How to Play Help */}
            <button
              onClick={() => setShowRules(true)}
              className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition cursor-pointer"
              title="Lagos Monopoly Rules"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Announcements Modal */}
      <AnnouncementsModal
        isOpen={modalOpen}
        onClose={handleCloseAnnouncements}
        announcements={announcements}
      />

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl p-5 md:p-6 text-neutral-100 flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>🇳🇬</span>
                <span>Lagos Monopoly Rules & Guide</span>
              </h3>
              <button
                onClick={() => setShowRules(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-neutral-300 leading-relaxed">
              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30">
                <h4 className="font-bold text-emerald-300 mb-1">🎯 Objective</h4>
                <p>
                  Buy iconic Lagos properties, collect rent from rival landlords, build Duplexes and Luxury Mansions, and avoid Kirikiri Maximum Security Prison until you bankrupt all opponents! Fully playable offline.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">🎲 Moving & Passing START</h4>
                <p>
                  Roll two 6-sided dice. Passing START rewards ₦200,000 salary from the Lagos State Treasury. Rolling doubles grants an immediate extra roll, but rolling 3 doubles consecutively triggers an arrest by LASTMA/Police directly to Kirikiri!
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">🏢 Buying Properties & Auctions</h4>
                <p>
                  When you land on unowned land (such as Broad Street, Victoria Island, or Banana Island), you can buy it immediately. If passed or if you lack cash, it goes to a fast-paced Public Auction with live timer where all landlords bid in increments of ₦10,000.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">🏗️ Duplexes & Luxury Mansions</h4>
                <p>
                  Collect all properties of a color group to achieve a monopoly! Base rent doubles automatically, and you can construct up to 4 Duplexes, then upgrade to a 5-star Luxury Mansion with devastating rents!
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">🎰 Tafawa Balewa Square (Free Parking)</h4>
                <p>
                  All taxes (LIRS Income Tax, Luxury Tax) and Kirikiri bail fines are pooled into the TBS Jackpot. The next landlord to land on Tafawa Balewa Square sweeps the entire jackpot!
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">🤝 Trading & Negotiations</h4>
                <p>
                  Propose property swaps, cash buyouts, and Get Out of Jail cards with other players or smart AI bots. AI opponents evaluate fair market value and monopoly advantages!
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowRules(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition cursor-pointer"
              >
                Got It, Oya Play!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
