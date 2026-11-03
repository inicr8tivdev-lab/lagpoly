import React, { useEffect } from 'react';
import { Player, GameState } from '../../types/game';
import { TOKENS, LAGOS_BOARD_TILES } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import confetti from 'canvas-confetti';
import { Trophy, Crown, RotateCcw } from 'lucide-react';

interface WinnerModalProps {
  winner: Player | null;
  gameState: GameState;
  onPlayAgain: () => void;
  compactCurrency: boolean;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  gameState,
  onPlayAgain,
  compactCurrency,
}) => {
  useEffect(() => {
    if (winner) {
      // Fire celebration confetti
      const end = Date.now() + 3000;
      const colors = ['#10b981', '#f59e0b', '#ffffff', '#3b82f6'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [winner]);

  if (!winner) return null;

  const tokenMeta = TOKENS.find((t) => t.id === winner.token) || TOKENS[0];

  // Calculate winner's property empire value
  let totalPropertyValue = 0;
  let ownedCount = 0;
  Object.entries(gameState.properties).forEach(([id, p]) => {
    if (p.ownerId === winner.id) {
      ownedCount++;
      const tile = LAGOS_BOARD_TILES[Number(id)];
      if (tile?.price) {
        totalPropertyValue += tile.price;
      }
      if (tile?.houseCost && p.houses > 0) {
        totalPropertyValue += p.houses * tile.houseCost;
      }
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-2 border-amber-500 rounded-3xl shadow-2xl p-6 md:p-8 text-neutral-100 flex flex-col items-center text-center">
        {/* Crown & Trophy */}
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-xl">
            {tokenMeta.emoji}
          </div>
          <Crown className="w-8 h-8 text-amber-400 absolute -top-3 -right-2 drop-shadow-md animate-bounce" />
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">
          VICTORY • LAGOS REAL ESTATE KING / QUEEN
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          {winner.name} Wins!
        </h2>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs">
          All other investors ran out of capital. {winner.name} controls the real estate empire of Lagos!
        </p>

        {/* Wealth Breakdown */}
        <div className="w-full my-5 p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-neutral-400">
            <span>Cash in Hand:</span>
            <span className="font-mono font-bold text-emerald-400">
              {formatNaira(winner.cash, compactCurrency)}
            </span>
          </div>
          <div className="flex justify-between items-center text-neutral-400">
            <span>Properties Owned:</span>
            <span className="font-bold text-white">{ownedCount} Locations</span>
          </div>
          <div className="flex justify-between items-center text-neutral-400">
            <span>Empire Asset Value:</span>
            <span className="font-mono font-bold text-amber-400">
              {formatNaira(totalPropertyValue, compactCurrency)}
            </span>
          </div>
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-sm font-extrabold text-white">
            <span>Total Net Worth:</span>
            <span className="font-mono text-emerald-400">
              {formatNaira(winner.cash + totalPropertyValue, compactCurrency)}
            </span>
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-xl cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Again / Return to Lobby</span>
        </button>
      </div>
    </div>
  );
};
