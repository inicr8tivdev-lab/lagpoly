import React from 'react';
import { BoardTile, Player, PropertyState } from '../../types/game';
import { GROUP_COLORS, TOKENS } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';

interface TileProps {
  tile: BoardTile;
  propState?: PropertyState;
  playersHere: Player[];
  owner?: Player;
  isCurrentPlayerTile: boolean;
  onSelect: (tile: BoardTile) => void;
  compactCurrency: boolean;
  orientation: 'bottom' | 'top' | 'left' | 'right' | 'corner';
}

export const Tile: React.FC<TileProps> = ({
  tile,
  propState,
  playersHere,
  owner,
  isCurrentPlayerTile,
  onSelect,
  compactCurrency,
  orientation,
}) => {
  const groupStyle = tile.group ? GROUP_COLORS[tile.group] : null;

  return (
    <div
      onClick={() => onSelect(tile)}
      className={`relative flex flex-col justify-between cursor-pointer select-none transition-all duration-150 border border-neutral-800 hover:border-emerald-500/80 hover:z-20 bg-neutral-900/90 text-neutral-100 ${
        isCurrentPlayerTile ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-neutral-950 z-10' : ''
      } ${propState?.isMortgaged ? 'opacity-65' : ''}`}
      style={{
        width: '100%',
        height: '100%',
      }}
      title={`${tile.name} - Click for details`}
    >
      {/* Property Color Bar */}
      {tile.group && (
        <div
          className={`w-full font-bold flex items-center justify-center shrink-0 ${
            orientation === 'bottom'
              ? 'h-3.5 border-b border-black/40 order-first'
              : orientation === 'top'
              ? 'h-3.5 border-t border-black/40 order-last'
              : orientation === 'left'
              ? 'h-3.5 border-b border-black/40 order-first'
              : 'h-3.5 border-b border-black/40 order-first'
          }`}
          style={{ backgroundColor: groupStyle?.bg || '#333' }}
        >
          {/* Building indicators (duplexes/mansions) */}
          {propState && propState.houses > 0 && (
            <div className="flex items-center gap-0.5 px-1">
              {propState.houses === 5 ? (
                <span className="text-[10px]" title="Luxury Highrise Mansion">
                  🏰
                </span>
              ) : (
                Array.from({ length: propState.houses }).map((_, i) => (
                  <span key={i} className="text-[9px]" title={`Duplex ${i + 1}`}>
                    🏡
                  </span>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Tile Body */}
      <div className="flex-1 flex flex-col items-center justify-between p-1 text-center min-h-0 overflow-hidden">
        {/* Tile Icon or Type Badge */}
        {tile.icon && (
          <span className="text-sm md:text-base leading-none my-0.5">{tile.icon}</span>
        )}

        {/* Tile Name */}
        <p className="text-[10px] md:text-[11px] font-semibold leading-tight line-clamp-2 px-0.5 tracking-tight text-neutral-200">
          {tile.name}
        </p>

        {/* Price / Subtitle */}
        {tile.price ? (
          <span className="text-[9px] md:text-[10px] font-mono text-emerald-400 font-bold mt-auto">
            {formatNaira(tile.price, compactCurrency)}
          </span>
        ) : tile.taxAmount ? (
          <span className="text-[9px] md:text-[10px] font-mono text-rose-400 font-bold mt-auto">
            Pay {formatNaira(tile.taxAmount, compactCurrency)}
          </span>
        ) : (
          <span className="text-[8px] text-neutral-400 uppercase tracking-tighter truncate w-full px-0.5">
            {tile.subtitle || ''}
          </span>
        )}
      </div>

      {/* Owner Ribbon / Dot */}
      {owner && (
        <div
          className="absolute top-0 right-0 w-3 h-3 rounded-bl-sm flex items-center justify-center text-[7px] text-white font-black shadow-sm"
          style={{ backgroundColor: owner.color }}
          title={`Owned by ${owner.name}`}
        >
          ●
        </div>
      )}

      {/* Mortgaged indicator */}
      {propState?.isMortgaged && (
        <div className="absolute inset-0 bg-red-950/70 backdrop-blur-[1px] flex items-center justify-center">
          <span className="text-[9px] font-black text-rose-300 uppercase tracking-widest rotate-[-25deg] border border-rose-500/60 px-1 rounded bg-black/80">
            MORTGAGED
          </span>
        </div>
      )}

      {/* Players Tokens currently on this tile */}
      {playersHere.length > 0 && (
        <div className="absolute inset-x-0 bottom-0.5 flex flex-wrap items-center justify-center gap-0.5 z-20 pointer-events-none px-0.5">
          {playersHere.map((p) => {
            const tokenMeta = TOKENS.find((t) => t.id === p.token) || TOKENS[0];
            return (
              <div
                key={p.id}
                className="w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-xs md:text-sm shadow-md border-2 transform transition-transform animate-bounce"
                style={{
                  backgroundColor: p.color,
                  borderColor: '#ffffff',
                }}
                title={`${p.name} (${tokenMeta.name})`}
              >
                <span>{tokenMeta.emoji}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
