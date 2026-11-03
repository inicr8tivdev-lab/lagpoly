import React from 'react';
import { BoardTile, Player, PropertyState } from '../../types/game';
import { GROUP_COLORS } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import { X, Building2, Landmark, ShieldCheck } from 'lucide-react';

interface DeedCardModalProps {
  tile: BoardTile | null;
  propState?: PropertyState;
  owner?: Player;
  onClose: () => void;
  compactCurrency: boolean;
}

export const DeedCardModal: React.FC<DeedCardModalProps> = ({
  tile,
  propState,
  owner,
  onClose,
  compactCurrency,
}) => {
  if (!tile) return null;

  const groupStyle = tile.group ? GROUP_COLORS[tile.group] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-neutral-900 border-2 border-neutral-700 rounded-xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header with Color Group */}
        <div
          className="p-4 text-center border-b border-black/40 flex flex-col items-center justify-center"
          style={{ backgroundColor: groupStyle?.bg || '#1e293b' }}
        >
          <span className="text-[10px] font-black tracking-widest uppercase text-white/80">
            TITLE DEED • LAGOS PROPERTY
          </span>
          <h3 className="text-xl font-extrabold text-white tracking-tight mt-1">
            {tile.name}
          </h3>
          {tile.subtitle && (
            <p className="text-xs text-white/90 font-medium">{tile.subtitle}</p>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3 text-sm">
          {/* Owner Status */}
          <div className="flex items-center justify-between p-2.5 bg-neutral-800/80 rounded-lg border border-neutral-700/60">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-300">Owner</span>
            </div>
            {owner ? (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded text-white flex items-center gap-1.5"
                style={{ backgroundColor: owner.color }}
              >
                ● {owner.name}
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Unowned (For Sale)
              </span>
            )}
          </div>

          {/* Pricing Details */}
          {tile.type === 'property' && tile.rentTiers && (
            <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-800/60">
                <span className="text-neutral-400">Base Rent (Land only):</span>
                <span className="font-mono font-bold text-neutral-100">
                  {formatNaira(tile.rentTiers[0], compactCurrency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-neutral-300">
                <span>With 1 Duplex (🏡):</span>
                <span className="font-mono font-semibold">
                  {formatNaira(tile.rentTiers[1], compactCurrency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-neutral-300">
                <span>With 2 Duplexes (🏡🏡):</span>
                <span className="font-mono font-semibold">
                  {formatNaira(tile.rentTiers[2], compactCurrency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-neutral-300">
                <span>With 3 Duplexes (🏡🏡🏡):</span>
                <span className="font-mono font-semibold">
                  {formatNaira(tile.rentTiers[3], compactCurrency)}
                </span>
              </div>
              <div className="flex justify-between py-0.5 text-neutral-300">
                <span>With 4 Duplexes:</span>
                <span className="font-mono font-semibold">
                  {formatNaira(tile.rentTiers[4], compactCurrency)}
                </span>
              </div>
              <div className="flex justify-between py-1 font-bold text-amber-300 border-t border-neutral-800/80">
                <span>With Luxury Highrise (🏰):</span>
                <span className="font-mono">
                  {formatNaira(tile.rentTiers[5], compactCurrency)}
                </span>
              </div>
            </div>
          )}

          {tile.type === 'station' && (
            <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs space-y-1">
              <p className="font-bold text-neutral-300 mb-1">Transit Corridor Rent:</p>
              <div className="flex justify-between"><span>1 Bridge/Rail:</span><span className="font-mono">₦25,000</span></div>
              <div className="flex justify-between"><span>2 Bridges/Rails:</span><span className="font-mono">₦50,000</span></div>
              <div className="flex justify-between"><span>3 Bridges/Rails:</span><span className="font-mono">₦100,000</span></div>
              <div className="flex justify-between font-bold text-emerald-400"><span>All 4 Corridors:</span><span className="font-mono">₦200,000</span></div>
            </div>
          )}

          {tile.type === 'utility' && (
            <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs space-y-1.5">
              <p className="font-bold text-neutral-300">Utility Tariff Formula:</p>
              <p className="text-neutral-400 leading-relaxed">
                If 1 Utility is owned, rent is 4,000× amount shown on dice.
              </p>
              <p className="text-neutral-400 leading-relaxed">
                If BOTH Utilities are owned, rent is 10,000× amount shown on dice.
              </p>
            </div>
          )}

          {/* Development & Mortgage info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {tile.houseCost && (
              <div className="p-2 bg-neutral-800/50 rounded-lg border border-neutral-700/50 flex flex-col">
                <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-400" /> Duplex Cost
                </span>
                <span className="font-mono font-bold text-emerald-400 mt-1">
                  {formatNaira(tile.houseCost, compactCurrency)}
                </span>
              </div>
            )}
            {tile.mortgageValue && (
              <div className="p-2 bg-neutral-800/50 rounded-lg border border-neutral-700/50 flex flex-col">
                <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" /> Mortgage Value
                </span>
                <span className="font-mono font-bold text-amber-400 mt-1">
                  {formatNaira(tile.mortgageValue, compactCurrency)}
                </span>
              </div>
            )}
          </div>

          {/* Current building state */}
          {propState && (
            <div className="text-xs text-neutral-400 pt-1 border-t border-neutral-800 flex justify-between items-center">
              <span>Status:</span>
              <span className="font-medium text-neutral-200">
                {propState.isMortgaged
                  ? 'Currently Mortgaged'
                  : propState.houses === 5
                  ? 'Luxury Highrise Built'
                  : propState.houses > 0
                  ? `${propState.houses} Duplexes Built`
                  : 'Vacant Land'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center text-xs">
          <span className="text-neutral-400">Purchase Price:</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">
            {tile.price ? formatNaira(tile.price, compactCurrency) : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};
