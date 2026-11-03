import React from 'react';
import { GameState, Player } from '../../types/game';
import { LAGOS_BOARD_TILES, TOKENS } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import { Handshake, Home, AlertTriangle, ArrowRight, CheckCircle2, XCircle, MapPin, Dice5 } from 'lucide-react';
import { PlayerAvatar } from '../Common/PlayerAvatar';

interface ActionPanelProps {
  gameState: GameState;
  myPlayer: Player | undefined;
  isMyTurn: boolean;
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

export const ActionPanel: React.FC<ActionPanelProps> = ({
  gameState,
  myPlayer,
  isMyTurn,
  onRollDice,
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
  const currentToken = TOKENS.find((t) => t.id === currentTurnPlayer?.token) || TOKENS[0];

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
  const canRoll = isMyTurn && !gameState.hasRolled && !currentTurnPlayer?.isAi;

  return (
    <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 md:p-4 shadow-xl flex flex-col gap-3">
      {/* Turn Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          {currentTurnPlayer && (
            <PlayerAvatar
              player={currentTurnPlayer}
              size="sm"
              showTokenName={false}
            />
          )}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isMyTurn && (
                <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Your Turn
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 line-clamp-1">{gameState.lastActionMessage}</p>
          </div>
        </div>

        {/* Quick Modal Triggers */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenManage}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition border border-neutral-700 cursor-pointer"
            title="Manage your properties and build duplexes"
          >
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Build / Manage</span>
          </button>
          <button
            onClick={onOpenTrade}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition border border-neutral-700 cursor-pointer"
            title="Trade properties & cash with other players"
          >
            <Handshake className="w-3.5 h-3.5 text-amber-400" />
            <span>Trade</span>
          </button>
        </div>
      </div>

      {/* Action Strip: Location info & Turn Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-1">
        {/* Location badge */}
        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {currentTile ? (
              <>
                <strong className="text-white">{currentTile.name}</strong>
                {currentTile.price && currentTileProp?.ownerId === null && (
                  <span className="text-emerald-400 ml-1">
                    (Price: {formatNaira(currentTile.price, compactCurrency)})
                  </span>
                )}
              </>
            ) : (
              'START'
            )}
          </span>
        </div>

        {/* Turn Specific Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Roll reminder button */}
          {canRoll && (
            <button
              onClick={onRollDice}
              className="px-4 py-2 rounded-lg font-bold text-xs bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-md transition flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <Dice5 className="w-4 h-4" />
              <span>Roll Dice (Center Board)</span>
            </button>
          )}

          {/* Kirikiri Jail Actions */}
          {isMyTurn && myPlayer?.inJail && !gameState.hasRolled && (
            <div className="flex flex-col sm:flex-row items-center gap-1.5 p-1.5 bg-amber-950/40 border border-amber-900/60 rounded-lg text-xs">
              <span className="font-bold text-amber-300">Kirikiri Detention:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onPayJailFine}
                  disabled={myPlayer.cash < 50000}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  Pay ₦50K Fine
                </button>
                {myPlayer.jailCards > 0 && (
                  <button
                    onClick={onUseJailCard}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
                  >
                    Use Card ({myPlayer.jailCards})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Buy Property Prompt */}
          {canBuyProperty && currentTile && (
            <div className="flex items-center gap-2 p-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
              <button
                onClick={onBuyProperty}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Buy for {formatNaira(currentTile.price || 0, compactCurrency)}</span>
              </button>
              <button
                onClick={onDeclineProperty}
                className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Decline</span>
              </button>
            </div>
          )}

          {/* End Turn / Doubles Continuation Button */}
          {canEndTurn && (
            <button
              onClick={onEndTurn}
              className={`px-5 py-2.5 rounded-lg font-extrabold text-sm shadow-md transition flex items-center gap-2 cursor-pointer animate-pulse ${
                gameState.doublesCount > 0 && !myPlayer?.inJail
                  ? 'bg-amber-500 hover:bg-amber-400 text-black'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <span>
                {gameState.doublesCount > 0 && !myPlayer?.inJail
                  ? 'Doubles! Roll Again (🎲)'
                  : 'End Turn'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Bankruptcy Fallback if heavily in debt */}
          {isMyTurn && myPlayer && myPlayer.cash < 0 && (
            <button
              onClick={onDeclareBankruptcy}
              className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Surrender / Sapa Exit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
