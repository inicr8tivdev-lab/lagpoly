import React, { useState, useEffect } from 'react';
import { GameState, Player, AiDifficulty } from '../../types/game';
import { TOKENS } from '../../data/lagosBoard';
import { lagosVibeAudio } from '../../utils/cityBoysAudio';
import {
  Sparkles,
  Users,
  Bot,
  Play,
  Copy,
  Check,
  ShieldCheck,
  Share2,
  Swords,
  X,
  Music,
  Disc,
  WifiOff,
  RotateCcw,
  Plus,
  Trash2,
  Gamepad2,
} from 'lucide-react';
import { PlayerAvatar } from '../Common/PlayerAvatar';

interface PassAndPlayPlayer {
  name: string;
  token: string;
  isAi: boolean;
  aiDifficulty?: AiDifficulty;
}

interface LobbyProps {
  gameState: GameState | null;
  myPlayerId: string | null;
  hasSavedGame?: boolean;
  onResumeSavedGame?: () => void;
  onResetGame?: () => void;
  onCreateRoom?: (name: string, token: string) => void;
  onJoinRoom?: (code: string, name: string, token: string) => void;
  onAddBot: (difficulty?: AiDifficulty) => void;
  onSetBotDifficulty: (playerId: string, difficulty: AiDifficulty) => void;
  onRemovePlayer: (playerId: string) => void;
  onQuickPlayAi: (name: string, token: string, difficulty: AiDifficulty, botCount: number) => void;
  onStartPassAndPlay?: (players: PassAndPlayPlayer[]) => void;
  onStartGame: () => void;
}

const LAGOS_HONORIFICS = [
  'Otunba Lagos',
  'Chief Landlord',
  'Madam Banana Island',
  'Alhaji Money',
  'Odogwu of Eko',
  'Ikeja Mogul',
];

export const Lobby: React.FC<LobbyProps> = ({
  gameState,
  myPlayerId,
  hasSavedGame,
  onResumeSavedGame,
  onResetGame,
  onCreateRoom,
  onJoinRoom,
  onAddBot,
  onSetBotDifficulty,
  onRemovePlayer,
  onQuickPlayAi,
  onStartPassAndPlay,
  onStartGame,
}) => {
  const [activeTab, setActiveTab] = useState<'solo_ai' | 'pass_and_play' | 'online'>('solo_ai');

  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('eko_player_name') || 'Lagos Landlord';
  });
  const [selectedToken, setSelectedToken] = useState<string>(() => {
    return localStorage.getItem('eko_player_token') || 'danfo';
  });

  const [joinCode, setJoinCode] = useState<string>('');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');
  const [botCount, setBotCount] = useState<number>(2);
  const [addBotDiff, setAddBotDiff] = useState<AiDifficulty>('medium');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(() => lagosVibeAudio.getIsPlaying());

  // Pass and Play setup state (2 to 6 local players)
  const [localPlayers, setLocalPlayers] = useState<PassAndPlayPlayer[]>([
    { name: playerName || 'Player 1', token: 'danfo', isAi: false },
    { name: 'Player 2', token: 'gwagon', isAi: false },
  ]);

  useEffect(() => {
    const unsub = lagosVibeAudio.subscribe(setIsMusicPlaying);
    return () => unsub();
  }, []);

  const handleNameChange = (val: string) => {
    setPlayerName(val);
    localStorage.setItem('eko_player_name', val);
    // keep player 1 name in sync
    setLocalPlayers((prev) => {
      const copy = [...prev];
      if (copy[0] && !copy[0].isAi) {
        copy[0].name = val.trim() || 'Player 1';
      }
      return copy;
    });
  };

  const handleTokenSelect = (tokenId: string) => {
    setSelectedToken(tokenId);
    localStorage.setItem('eko_player_token', tokenId);
    setLocalPlayers((prev) => {
      const copy = [...prev];
      if (copy[0] && !copy[0].isAi) {
        copy[0].token = tokenId;
      }
      return copy;
    });
  };

  // If in an active lobby room (waiting for host to start)
  if (gameState && gameState.status === 'lobby') {
    const isHost = gameState.players.find((p) => p.id === myPlayerId)?.isHost ?? false;

    const handleCopyCode = () => {
      navigator.clipboard.writeText(gameState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyLink = () => {
      const link = `${window.location.origin}?room=${gameState.roomCode}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6">
          {/* Header */}
          <div className="relative text-center space-y-1">
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multiplayer Game Lobby</span>
              </div>
              <button
                type="button"
                onClick={() => lagosVibeAudio.toggle()}
                className={`px-3 py-1 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isMusicPlaying
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                }`}
                title="Toggle Lagos Vibe: 'City Boys' instrumental background track"
              >
                {isMusicPlaying ? (
                  <>
                    <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span className="text-emerald-400 font-extrabold">City Boys: ON</span>
                  </>
                ) : (
                  <>
                    <Music className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Lagos Vibe</span>
                  </>
                )}
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              EKO MONOPOLY
            </h1>
            <p className="text-xs text-neutral-400">
              Gather your friends or add AI landlords with customized difficulty to conquer Lagos!
            </p>
          </div>

          {/* Room Code Card */}
          <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col items-center gap-3">
            <span className="text-xs text-neutral-400 uppercase font-bold tracking-widest">
              Room Code
            </span>
            <span className="text-3xl md:text-4xl font-mono font-black text-emerald-400 tracking-wider">
              {gameState.roomCode}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Game Link'}</span>
              </button>
            </div>
          </div>

          {/* Player Roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-400 px-1">
              <span>PLAYERS ({gameState.players.length}/6)</span>
              <span>ROLE & DIFFICULTY</span>
            </div>

            <div className="space-y-1.5">
              {gameState.players.map((player: Player) => {
                const botDiff = player.aiDifficulty || 'medium';

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <PlayerAvatar player={player} size="md" showTokenName={true} />
                      <div className="flex items-center gap-1.5 flex-wrap ml-2">
                        {player.isHost && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-black">
                            HOST
                          </span>
                        )}
                        {player.id === myPlayerId && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                            YOU
                          </span>
                        )}
                        {player.isAi && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              botDiff === 'hard'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : botDiff === 'easy'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            AI • {botDiff}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHost && player.isAi && (
                        <select
                          value={botDiff}
                          onChange={(e) =>
                            onSetBotDifficulty(player.id, e.target.value as AiDifficulty)
                          }
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-[11px] text-neutral-200 font-semibold focus:outline-none"
                        >
                          <option value="easy">🟢 Easy (Novice)</option>
                          <option value="medium">🟡 Medium (Pro)</option>
                          <option value="hard">🔴 Hard (Shark)</option>
                        </select>
                      )}

                      {isHost && player.id !== myPlayerId && (
                        <button
                          onClick={() => onRemovePlayer(player.id)}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition"
                          title="Remove from lobby"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {!player.isAi && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lobby Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {gameState.players.length < 6 && (
              <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                <select
                  value={addBotDiff}
                  onChange={(e) => setAddBotDiff(e.target.value as AiDifficulty)}
                  className="bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-3 text-xs text-neutral-200 font-bold focus:outline-none"
                >
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                </select>
                <button
                  onClick={() => onAddBot(addBotDiff)}
                  className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-neutral-700"
                >
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>+ Add AI Landlord</span>
                </button>
              </div>
            )}

            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={gameState.players.length < 2}
                className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-xl shadow-emerald-950 disabled:opacity-40 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Start Game (Oya!)</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto flex-1 py-3 text-center text-xs text-neutral-400 bg-neutral-950 rounded-xl border border-neutral-800">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pre-game Setup Screen
  const handleQuickPlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    localStorage.setItem('eko_player_name', playerName.trim());
    onQuickPlayAi(playerName.trim(), selectedToken, aiDifficulty, botCount);
  };

  const handleStartPassAndPlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (onStartPassAndPlay) {
      onStartPassAndPlay(localPlayers);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !onCreateRoom) return;
    localStorage.setItem('eko_player_name', playerName.trim());
    onCreateRoom(playerName.trim(), selectedToken);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !joinCode.trim() || !onJoinRoom) return;
    localStorage.setItem('eko_player_name', playerName.trim());
    onJoinRoom(joinCode.trim().toUpperCase(), playerName.trim(), selectedToken);
  };

  const addLocalPlayer = () => {
    if (localPlayers.length >= 6) return;
    const nextIdx = localPlayers.length + 1;
    const unusedToken = TOKENS.find(
      (t) => !localPlayers.some((p) => p.token === t.id)
    ) || TOKENS[localPlayers.length % TOKENS.length];

    setLocalPlayers([
      ...localPlayers,
      {
        name: `Player ${nextIdx}`,
        token: unusedToken.id,
        isAi: false,
      },
    ]);
  };

  const removeLocalPlayer = (index: number) => {
    if (localPlayers.length <= 2) return;
    setLocalPlayers(localPlayers.filter((_, i) => i !== index));
  };

  const updateLocalPlayer = (
    index: number,
    field: keyof PassAndPlayPlayer,
    value: any
  ) => {
    setLocalPlayers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-3 md:p-6">
      <div className="w-full max-w-2xl bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-5 md:p-8 shadow-2xl flex flex-col gap-5">
        {/* Banner */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              <WifiOff className="w-3.5 h-3.5" />
              <span>100% Offline Game • No Login Needed</span>
            </div>

            {/* Lagos Vibe Music */}
            <button
              type="button"
              onClick={() => lagosVibeAudio.toggle()}
              className={`px-3 py-1 rounded-full border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isMusicPlaying
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300'
              }`}
              title="Toggle Lagos Vibe: 'City Boys' instrumental background track"
            >
              {isMusicPlaying ? (
                <>
                  <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span className="text-emerald-400 font-extrabold">City Boys: ON</span>
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Lagos Vibe</span>
                </>
              )}
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            EKO MONOPOLY
          </h1>
          <p className="text-xs md:text-sm text-neutral-400 max-w-md mx-auto">
            Build duplexes and mansions across Lagos Island, Ikoyi, Victoria Island, and Ikeja GRA in Nigerian Naira (₦). Fully playable offline!
          </p>
        </div>

        {/* RESUME GAME BANNER (If a saved offline match exists) */}
        {hasSavedGame && onResumeSavedGame && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-neutral-900 border-2 border-emerald-500/70 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-black text-white">Ongoing Game Saved</h4>
                <p className="text-xs text-neutral-300">
                  Pick up right where you left off on the Lagos board.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onResetGame && (
                <button
                  type="button"
                  onClick={onResetGame}
                  className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs font-bold transition cursor-pointer"
                  title="Discard saved game and start new"
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={onResumeSavedGame}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Resume Game</span>
              </button>
            </div>
          </div>
        )}

        {/* Player Profile Setup */}
        <div className="space-y-3 bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-300">
                Your Landlord Name / Title:
              </label>
              <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] scrollbar-none">
                {LAGOS_HONORIFICS.map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => handleNameChange(title)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition shrink-0 cursor-pointer"
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Chief Adeleke, Folake, Senior Man"
              maxLength={22}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1.5">
              Choose Your Lagos Token:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TOKENS.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => handleTokenSelect(token.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    selectedToken === token.id
                      ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/50'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-2xl">{token.emoji}</span>
                  <span className="text-[10px] font-bold text-neutral-200 line-clamp-1">
                    {token.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MODE TABS */}
        <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('solo_ai')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'solo_ai'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>vs Lagos AI (Solo)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pass_and_play')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'pass_and_play'
                ? 'bg-emerald-500 text-black shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Pass & Play (Local)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'online'
                ? 'bg-blue-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Online Room</span>
          </button>
        </div>

        {/* TAB 1: SOLO VS AI (DEFAULT & OFFLINE) */}
        {activeTab === 'solo_ai' && (
          <form
            onSubmit={handleQuickPlay}
            className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-950 to-neutral-950 border-2 border-emerald-500/50 shadow-xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-emerald-400" />
                  <span>Single Player vs AI Bots</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Play against smart AI bots with full offline auction, trading, and construction support.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                Offline
              </span>
            </div>

            {/* 3 Difficulty Selector Buttons */}
            <div>
              <span className="text-xs font-bold text-neutral-300 block mb-2">
                Choose AI Difficulty:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Easy */}
                <button
                  type="button"
                  onClick={() => setAiDifficulty('easy')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    aiDifficulty === 'easy'
                      ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/40 text-white'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-300">🟢 Easy</span>
                      <span className="text-[9px] uppercase font-bold text-emerald-400">Novice</span>
                    </div>
                    <p className="text-[10px] text-neutral-300 mt-1 leading-snug">
                      Conservative bidding, generous trades, slow builder.
                    </p>
                  </div>
                </button>

                {/* Medium */}
                <button
                  type="button"
                  onClick={() => setAiDifficulty('medium')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    aiDifficulty === 'medium'
                      ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/40 text-white'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300">🟡 Medium</span>
                      <span className="text-[9px] uppercase font-bold text-amber-400">Alaba Pro</span>
                    </div>
                    <p className="text-[10px] text-neutral-300 mt-1 leading-snug">
                      Street-smart, builds 3 duplexes, fair 1:1 trades.
                    </p>
                  </div>
                </button>

                {/* Hard */}
                <button
                  type="button"
                  onClick={() => setAiDifficulty('hard')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    aiDifficulty === 'hard'
                      ? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-400/40 text-white'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-300">🔴 Hard</span>
                      <span className="text-[9px] uppercase font-bold text-rose-400">Shark</span>
                    </div>
                    <p className="text-[10px] text-neutral-300 mt-1 leading-snug">
                      Aggressive auctions, builds Mansions, blocks monopolies.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Bot Count Selector */}
            <div className="flex items-center justify-between bg-neutral-900 p-2.5 rounded-xl border border-neutral-800 text-xs">
              <span className="font-semibold text-neutral-300">Number of AI Opponents:</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBotCount(num)}
                    className={`w-7 h-7 rounded-lg font-bold text-xs transition cursor-pointer ${
                      botCount === num
                        ? 'bg-emerald-500 text-black font-extrabold'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-950/60 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Start Game Now (100% Offline)</span>
            </button>
          </form>
        )}

        {/* TAB 2: LOCAL PASS & PLAY (2 TO 6 PLAYERS ON SAME DEVICE) */}
        {activeTab === 'pass_and_play' && (
          <form
            onSubmit={handleStartPassAndPlay}
            className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  <span>Pass & Play (Same Device)</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Play with friends or family on this screen. Take turns rolling, buying, and trading!
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                {localPlayers.length} Players
              </span>
            </div>

            {/* Players List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {localPlayers.map((lp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800"
                >
                  <span className="text-xs font-black text-emerald-400 w-5">#{idx + 1}</span>

                  <input
                    type="text"
                    value={lp.name}
                    onChange={(e) => updateLocalPlayer(idx, 'name', e.target.value)}
                    placeholder={`Player ${idx + 1}`}
                    maxLength={18}
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />

                  {/* Token selector dropdown */}
                  <select
                    value={lp.token}
                    onChange={(e) => updateLocalPlayer(idx, 'token', e.target.value)}
                    className="bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
                  >
                    {TOKENS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.emoji} {t.name}
                      </option>
                    ))}
                  </select>

                  {/* Toggle human or bot */}
                  <button
                    type="button"
                    onClick={() => updateLocalPlayer(idx, 'isAi', !lp.isAi)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer border ${
                      lp.isAi
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {lp.isAi ? '🤖 Bot' : '👤 Human'}
                  </button>

                  {/* Remove button */}
                  {localPlayers.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLocalPlayer(idx)}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 transition"
                      title="Remove player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add player button */}
            {localPlayers.length < 6 && (
              <button
                type="button"
                onClick={addLocalPlayer}
                className="py-2 px-3 rounded-xl border border-dashed border-neutral-700 hover:border-emerald-500/70 text-xs font-bold text-neutral-300 hover:text-emerald-400 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Local Player (Up to 6)</span>
              </button>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-950/60 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Start Pass & Play Match</span>
            </button>
          </form>
        )}

        {/* TAB 3: ONLINE MULTIPLAYER (OPTIONAL) */}
        {activeTab === 'online' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Create Room */}
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between gap-3"
            >
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Host Custom Room</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Generate a room code to invite remote friends over the internet.
                </p>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs transition cursor-pointer"
              >
                Create Room
              </button>
            </form>

            {/* Join Room */}
            <form
              onSubmit={handleJoin}
              className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between gap-3"
            >
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Join by Code</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Enter 5-character room code from friend.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={6}
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs disabled:opacity-40 transition cursor-pointer"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Highlights */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-around text-center text-[11px] text-neutral-400">
          <div>
            <span className="font-bold text-white block">Offline Ready</span>
            <span>Zero login or wifi needed</span>
          </div>
          <div>
            <span className="font-bold text-white block">₦1,500,000</span>
            <span>Starting Capital</span>
          </div>
          <div>
            <span className="font-bold text-white block">40 Authentic Tiles</span>
            <span>Bridges & Landmarks</span>
          </div>
        </div>
      </div>
    </div>
  );
};
