import React from 'react';
import { GameState, BoardTile, Player } from '../../types/game';
import { LAGOS_BOARD_TILES, TOKENS } from '../../data/lagosBoard';
import { Tile } from './Tile';
import { formatNaira } from '../../utils/currency';
import { DiceRoll } from '../Controls/DiceRoll';
import { DecisionBox } from '../Controls/DecisionBox';
import { PopAnnouncementCard, PopAnnouncement } from './PopAnnouncementCard';
import { Landmark } from 'lucide-react';

interface BoardProps {
  gameState: GameState;
  myPlayer: Player | undefined;
  isMyTurn: boolean;
  canRoll: boolean;
  onRollDice: () => void;
  onSelectTile: (tile: BoardTile) => void;
  compactCurrency: boolean;
  popAnnouncement: PopAnnouncement | null;
  onDismissAnnouncement: () => void;
  onOpenFullAnnouncements: () => void;
  onBuyProperty: () => void;
  onDeclineProperty: () => void;
  onEndTurn: () => void;
  onPayJailFine: () => void;
  onUseJailCard: () => void;
  onOpenTrade: () => void;
  onOpenManage: () => void;
  onDeclareBankruptcy: () => void;
}

export const Board: React.FC<BoardProps> = ({
  gameState,
  myPlayer,
  isMyTurn,
  canRoll,
  onRollDice,
  onSelectTile,
  compactCurrency,
  popAnnouncement,
  onDismissAnnouncement,
  onOpenFullAnnouncements,
  onBuyProperty,
  onDeclineProperty,
  onEndTurn,
  onPayJailFine,
  onUseJailCard,
  onOpenTrade,
  onOpenManage,
  onDeclareBankruptcy,
}) => {
  const currentTurnPlayer = gameState.players[gameState.currentTurnIndex];
  const currentToken = TOKENS.find((t) => t.id === currentTurnPlayer?.token) || TOKENS[0];

  // Map of tile ID to players currently located there
  const playersByTile: Record<number, Player[]> = {};
  gameState.players.forEach((p) => {
    if (!p.isBankrupt) {
      if (!playersByTile[p.position]) {
        playersByTile[p.position] = [];
      }
      playersByTile[p.position].push(p);
    }
  });

  // Helper to render a tile by its index
  const renderTileAt = (
    tileId: number,
    orientation: 'bottom' | 'top' | 'left' | 'right' | 'corner',
    gridClass: string
  ) => {
    const tile = LAGOS_BOARD_TILES[tileId];
    if (!tile) return null;

    const propState = gameState.properties[tileId];
    const owner = propState?.ownerId
      ? gameState.players.find((p) => p.id === propState.ownerId)
      : undefined;

    return (
      <div key={tileId} className={`${gridClass} w-full h-full`}>
        <Tile
          tile={tile}
          propState={propState}
          playersHere={playersByTile[tileId] || []}
          owner={owner}
          isCurrentPlayerTile={currentTurnPlayer?.position === tileId}
          onSelect={onSelectTile}
          compactCurrency={compactCurrency}
          orientation={orientation}
        />
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-square max-w-[760px] mx-auto bg-neutral-950 p-1.5 md:p-2.5 rounded-2xl shadow-2xl border-2 border-neutral-800">
      {/* 11x11 Grid Layout */}
      <div className="w-full h-full grid grid-cols-11 grid-rows-11 gap-0.5 border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden relative">
        {/* ROW 1 (TOP): 20 (Corner) -> 21 to 29 -> 30 (Corner) */}
        {renderTileAt(20, 'corner', 'col-start-1 row-start-1')}
        {renderTileAt(21, 'top', 'col-start-2 row-start-1')}
        {renderTileAt(22, 'top', 'col-start-3 row-start-1')}
        {renderTileAt(23, 'top', 'col-start-4 row-start-1')}
        {renderTileAt(24, 'top', 'col-start-5 row-start-1')}
        {renderTileAt(25, 'top', 'col-start-6 row-start-1')}
        {renderTileAt(26, 'top', 'col-start-7 row-start-1')}
        {renderTileAt(27, 'top', 'col-start-8 row-start-1')}
        {renderTileAt(28, 'top', 'col-start-9 row-start-1')}
        {renderTileAt(29, 'top', 'col-start-10 row-start-1')}
        {renderTileAt(30, 'corner', 'col-start-11 row-start-1')}

        {/* LEFT COLUMN: 19 to 11 (from row 2 down to row 10) */}
        {renderTileAt(19, 'left', 'col-start-1 row-start-2')}
        {renderTileAt(18, 'left', 'col-start-1 row-start-3')}
        {renderTileAt(17, 'left', 'col-start-1 row-start-4')}
        {renderTileAt(16, 'left', 'col-start-1 row-start-5')}
        {renderTileAt(15, 'left', 'col-start-1 row-start-6')}
        {renderTileAt(14, 'left', 'col-start-1 row-start-7')}
        {renderTileAt(13, 'left', 'col-start-1 row-start-8')}
        {renderTileAt(12, 'left', 'col-start-1 row-start-9')}
        {renderTileAt(11, 'left', 'col-start-1 row-start-10')}

        {/* RIGHT COLUMN: 31 to 39 (from row 2 down to row 10) */}
        {renderTileAt(31, 'right', 'col-start-11 row-start-2')}
        {renderTileAt(32, 'right', 'col-start-11 row-start-3')}
        {renderTileAt(33, 'right', 'col-start-11 row-start-4')}
        {renderTileAt(34, 'right', 'col-start-11 row-start-5')}
        {renderTileAt(35, 'right', 'col-start-11 row-start-6')}
        {renderTileAt(36, 'right', 'col-start-11 row-start-7')}
        {renderTileAt(37, 'right', 'col-start-11 row-start-8')}
        {renderTileAt(38, 'right', 'col-start-11 row-start-9')}
        {renderTileAt(39, 'right', 'col-start-11 row-start-10')}

        {/* ROW 11 (BOTTOM): 10 (Corner) -> 9 down to 1 -> 0 (Corner) */}
        {renderTileAt(10, 'corner', 'col-start-1 row-start-11')}
        {renderTileAt(9, 'bottom', 'col-start-2 row-start-11')}
        {renderTileAt(8, 'bottom', 'col-start-3 row-start-11')}
        {renderTileAt(7, 'bottom', 'col-start-4 row-start-11')}
        {renderTileAt(6, 'bottom', 'col-start-5 row-start-11')}
        {renderTileAt(5, 'bottom', 'col-start-6 row-start-11')}
        {renderTileAt(4, 'bottom', 'col-start-7 row-start-11')}
        {renderTileAt(3, 'bottom', 'col-start-8 row-start-11')}
        {renderTileAt(2, 'bottom', 'col-start-9 row-start-11')}
        {renderTileAt(1, 'bottom', 'col-start-10 row-start-11')}
        {renderTileAt(0, 'corner', 'col-start-11 row-start-11')}

        {/* CENTER BOARD AREA (col 2 to 10, row 2 to 10) */}
        <div className="col-start-2 col-end-11 row-start-2 row-end-11 bg-neutral-950/95 flex flex-col items-center justify-between p-2 md:p-4 text-center select-none relative overflow-hidden">
          {/* Subtle Nigerian pattern background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* 10-Second Pop Announcement Card positioned over center */}
          <PopAnnouncementCard
            announcement={popAnnouncement}
            onDismiss={onDismissAnnouncement}
            onOpenFullLog={onOpenFullAnnouncements}
          />

          {/* Top of Center: Tafawa Balewa Square (Free Parking) Jackpot Pool */}
          <div className="z-10 flex flex-col items-center gap-0.5 bg-neutral-900/80 border border-neutral-800 px-3 py-1 rounded-full shadow-lg">
            <span className="text-[9px] md:text-xs font-semibold text-neutral-400 flex items-center gap-1">
              <Landmark className="w-3 h-3 text-amber-400" /> TBS Free Parking Jackpot:
            </span>
            <span className="text-xs md:text-sm font-extrabold font-mono text-amber-400">
              {formatNaira(gameState.freeParkingPool, compactCurrency)}
            </span>
          </div>

          {/* CENTER CORE: Interactive Dice Rolling & Decision Box inside the board center */}
          <div className="z-20 flex flex-col items-center justify-center my-auto gap-1.5 md:gap-2 w-full max-w-[300px] md:max-w-[340px]">
            {/* The Dice Box */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-neutral-900/70 border border-neutral-800/80 shadow-inner w-full">
              {/* Active Turn Header */}
              <div className="flex items-center gap-1.5 mb-1 text-xs">
                <span className="text-sm">{currentToken.emoji}</span>
                <span className="font-extrabold text-neutral-200 truncate max-w-[140px]">
                  {currentTurnPlayer?.name}
                </span>
                {currentTurnPlayer?.isAi ? (
                  <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 py-0.2 rounded border border-neutral-700">
                    AI Turn
                  </span>
                ) : isMyTurn ? (
                  <span className="text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    Your Turn
                  </span>
                ) : null}
              </div>

              {/* The Animated Dice */}
              <DiceRoll
                dice={gameState.dice}
                canRoll={canRoll}
                onRoll={onRollDice}
                doublesCount={gameState.doublesCount}
              />
            </div>

            {/* The Reduced Decision Box right under the Dice Box */}
            <DecisionBox
              gameState={gameState}
              myPlayer={myPlayer}
              isMyTurn={isMyTurn}
              canRoll={canRoll}
              onRollDice={onRollDice}
              onBuyProperty={onBuyProperty}
              onDeclineProperty={onDeclineProperty}
              onEndTurn={onEndTurn}
              onPayJailFine={onPayJailFine}
              onUseJailCard={onUseJailCard}
              onOpenTrade={onOpenTrade}
              onOpenManage={onOpenManage}
              onDeclareBankruptcy={onDeclareBankruptcy}
              compactCurrency={compactCurrency}
            />
          </div>

          {/* Bottom of Center: Brand & Card Decks */}
          <div className="z-10 flex items-center justify-between w-full max-w-[360px] px-2 pt-1 border-t border-neutral-800/60">
            {/* Chance Deck */}
            <div className="flex flex-col items-center p-1 rounded-lg bg-orange-950/20 border border-orange-800/30 w-24 shadow-sm">
              <span className="text-sm">❓</span>
              <span className="text-[9px] font-bold text-orange-300 uppercase">Opportunity</span>
              <span className="text-[7px] text-neutral-500">CHANCE</span>
            </div>

            {/* Brand Title */}
            <div className="flex flex-col items-center">
              <h2 className="text-xs md:text-sm font-black text-white tracking-wider">
                EKO MONOPOLY
              </h2>
              <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-tight">
                Lagos Edition
              </span>
            </div>

            {/* Community Chest Deck */}
            <div className="flex flex-col items-center p-1 rounded-lg bg-emerald-950/20 border border-emerald-800/30 w-24 shadow-sm">
              <span className="text-sm">📦</span>
              <span className="text-[9px] font-bold text-emerald-300 uppercase">Lagos Hustle</span>
              <span className="text-[7px] text-neutral-500">CHEST</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
