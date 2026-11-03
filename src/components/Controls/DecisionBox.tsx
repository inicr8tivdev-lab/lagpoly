import React from 'react';
import { GameState, Player } from '../../types/game';
import { LAGOS_BOARD_TILES } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import {
  Handshake,
  Home,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MapPin,
  ShieldAlert,
  Gavel,
} from 'lucide-react';

export interface DecisionBoxProps {
  gameState: GameState;
  myPlayer: Player | undefined;
  isMyTurn: boolean;
  canRoll: boolean;
  onRollDice: () => void;
  onBuyProperty: () => void;
  onDeclineProperty: () => void;
  onEndTurn: () => void;
  onPayJailFine: () => void;
  onUseJailCard: () => void;
  onOpenTrade: () => void;
  onOpenManage: () => void;
  onDeclareBankruptcy: () => void;
  compactCurrency: boolean;
}

export const DecisionBox: React.FC<DecisionBoxProps> = ({
  gameState,
  myPlayer,
  isMyTurn,
  canRoll: _canRoll,
  onRollDice: _onRollDice,
  onBuyProperty,
  onDeclineProperty,
  onEndTurn,
  onPayJailFine,
  onUseJailCard,
  onOpenTrade,
  onOpenManage,
  onDeclareBankruptcy,
  compactCurrency,
}) => {
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const currentTile = currentTurnPlayer ? LAGOS_BOARD_TILES[currentTurnPlayer.position] : null;
  const currentTileProp = currentTurnPlayer ? gameState.properties[currentTurnPlayer.position] : null;

  const canBuyProperty =
    isMyTurn &&
    gameState.hasRolled &&
    gameState.turnPhase === 'tile_action' &&
    currentTile &&
    (currentTile.type === 'property' || currentTile.type === 'station' || currentTile.type === 'utility') &&
    currentTileProp &&
    currentTileProp.ownerId === null &&
    myPlayer &&
    currentTile.price &&
    myPlayer.cash >= currentTile.price;

  const canEndTurn = isMyTurn && gameState.hasRolled && gameState.turnPhase === 'turn_end';

  return (
    <div className="z-20 w-full max-w-[280px] md:max-w-[340px] bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 rounded-xl p-2 md:p-2.5 shadow-xl flex flex-col gap-1.5 transition-all">
      {/* Top Bar: Location / Status + Manage / Trade buttons */}
      <div className="flex items-center justify-between gap-1 border-b border-neutral-800/80 pb-1.5">
        {/* Current Location Badge */}
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-neutral-300 truncate max-w-[140px] md:max-w-[180px]">
          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate font-semibold text-neutral-200">
            {currentTile ? currentTile.name : 'START'}
          </span>
          {currentTile?.price && currentTileProp?.ownerId === null && (
            <span className="text-emerald-400 font-mono text-[9px] shrink-0">
              ({formatNaira(currentTile.price, compactCurrency)})
            </span>
          )}
        </div>

        {/* Manage & Trade Quick Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenManage}
            className="px-1.5 md:px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] md:text-xs font-semibold flex items-center gap-1 transition border border-neutral-700 cursor-pointer"
            title="Manage your properties and build duplexes"
          >
            <Home className="w-3 h-3 text-emerald-400" />
            <span>Manage</span>
          </button>
          <button
            type="button"
            onClick={onOpenTrade}
            className="px-1.5 md:px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] md:text-xs font-semibold flex items-center gap-1 transition border border-neutral-700 cursor-pointer"
            title="Trade properties & cash with other players"
          >
            <Handshake className="w-3 h-3 text-amber-400" />
            <span>Trade</span>
          </button>
        </div>
      </div>

      {/* Decision Actions Area */}
      <div className="flex flex-col items-center justify-center gap-1.5 min-h-[38px]">
        {/* 1. Buy or Auction Property Decision */}
        {canBuyProperty && currentTile && (
          <div className="flex items-center justify-center gap-2 w-full animate-in fade-in duration-200">
            <button
              type="button"
              onClick={onBuyProperty}
              className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-extrabold text-[11px] md:text-xs shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Buy {formatNaira(currentTile.price || 0, compactCurrency)}</span>
            </button>
            <button
              type="button"
              onClick={onDeclineProperty}
              className="py-1.5 px-2.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 active:scale-95 text-white font-bold text-[11px] md:text-xs transition flex items-center justify-center gap-1 border border-amber-500/50 shadow-sm cursor-pointer"
              title="Put this property up for public auction"
            >
              <Gavel className="w-3.5 h-3.5 shrink-0 text-amber-200" />
              <span>Auction</span>
            </button>
          </div>
        )}

        {/* Auction Active Notice */}
        {gameState.auction && (
          <div className="flex items-center justify-center gap-1.5 w-full bg-amber-500/20 border border-amber-500/40 rounded-lg p-1.5 text-[11px] text-amber-300 font-bold animate-pulse">
            <Gavel className="w-3.5 h-3.5" />
            <span>Public Auction Live ({gameState.auction.timeLeftSeconds}s)</span>
          </div>
        )}

        {/* 2. Kirikiri Jail Actions */}
        {isMyTurn && myPlayer?.inJail && !gameState.hasRolled && (
          <div className="flex items-center justify-center gap-1.5 w-full bg-amber-950/40 border border-amber-900/60 rounded-lg p-1 text-[10px] md:text-xs">
            <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
            <button
              type="button"
              onClick={onPayJailFine}
              disabled={myPlayer.cash < 50000}
              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              Pay ₦50K Fine
            </button>
            {myPlayer.jailCards > 0 && (
              <button
                type="button"
                onClick={onUseJailCard}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
              >
                Use Card ({myPlayer.jailCards})
              </button>
            )}
          </div>
        )}

        {/* 3. End Turn / Doubles Continuation */}
        {canEndTurn && (
          <button
            type="button"
            onClick={onEndTurn}
            className={`w-full py-1.5 px-3 rounded-lg font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer animate-pulse ${
              gameState.doublesCount > 0 && !myPlayer?.inJail
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}
          >
            <span>
              {gameState.doublesCount > 0 && !myPlayer?.inJail
                ? 'Doubles! Roll Again (🎲)'
                : 'End Turn'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 4. Bankruptcy / Sapa Warning */}
        {isMyTurn && myPlayer && myPlayer.cash < 0 && (
          <button
            type="button"
            onClick={onDeclareBankruptcy}
            className="w-full py-1 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-[10px] md:text-xs transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Surrender / Sapa Exit</span>
          </button>
        )}

        {/* 5. Passive / Inactive Turn Status */}
        {!canBuyProperty && !canEndTurn && !(isMyTurn && myPlayer?.inJail && !gameState.hasRolled) && (
          <p className="text-[10px] md:text-[11px] text-neutral-400 text-center line-clamp-1 italic">
            {gameState.lastActionMessage || (isMyTurn ? 'Roll the dice above to move' : `Waiting for ${currentTurnPlayer?.name}...`)}
          </p>
        )}
      </div>
    </div>
  );
};
