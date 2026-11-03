import React from 'react';
import { GameState, Player, PropertyGroup } from '../../types/game';
import { LAGOS_BOARD_TILES, GROUP_COLORS } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import { X, Building2, ShieldAlert, KeyRound } from 'lucide-react';

interface ManagePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  myPlayer: Player | undefined;
  onBuildHouse: (tileId: number) => void;
  onSellHouse: (tileId: number) => void;
  onMortgage: (tileId: number) => void;
  onUnmortgage: (tileId: number) => void;
  compactCurrency: boolean;
}

export const ManagePropertiesModal: React.FC<ManagePropertiesModalProps> = ({
  isOpen,
  onClose,
  gameState,
  myPlayer,
  onBuildHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
  compactCurrency,
}) => {
  if (!isOpen || !myPlayer) return null;

  // Get all properties owned by myPlayer
  const myTiles = LAGOS_BOARD_TILES.filter(
    (tile) => gameState.properties[tile.id]?.ownerId === myPlayer.id
  );

  // Group properties by group
  const grouped: Record<string, typeof myTiles> = {};
  myTiles.forEach((tile) => {
    const grp = tile.group || 'other';
    if (!grouped[grp]) grouped[grp] = [];
    grouped[grp].push(tile);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl p-4 md:p-6 text-neutral-100 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-base md:text-lg font-black text-white">
                Real Estate Portfolio & Construction
              </h3>
              <p className="text-xs text-neutral-400">
                Build duplexes, erect luxury high-rises, or manage bank mortgages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Bar */}
        <div className="my-3 flex items-center justify-between bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-xs">
          <span className="text-neutral-400 font-medium">Available Cash:</span>
          <span className="font-mono text-sm font-extrabold text-emerald-400">
            {formatNaira(myPlayer.cash, compactCurrency)}
          </span>
        </div>

        {/* Properties List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {myTiles.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              You do not own any Lagos properties yet. Land on vacant locations to purchase them!
            </div>
          ) : (
            Object.entries(grouped).map(([grpKey, tiles]) => {
              const grpStyle = GROUP_COLORS[grpKey as PropertyGroup];
              const totalInGroup = LAGOS_BOARD_TILES.filter((t) => t.group === grpKey).length;
              const hasMonopoly = tiles.length === totalInGroup;

              return (
                <div
                  key={grpKey}
                  className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl overflow-hidden"
                >
                  {/* Group header */}
                  <div
                    className="p-2.5 flex items-center justify-between text-xs font-bold"
                    style={{ backgroundColor: grpStyle?.bg ? `${grpStyle.bg}40` : '#1e293b' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: grpStyle?.bg || '#666' }}
                      />
                      <span className="text-white">{grpStyle?.label || grpKey.toUpperCase()}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                        hasMonopoly
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {hasMonopoly ? 'Monopoly Complete' : `${tiles.length}/${totalInGroup} Owned`}
                    </span>
                  </div>

                  {/* Group tiles */}
                  <div className="p-2 space-y-2">
                    {tiles.map((tile) => {
                      const prop = gameState.properties[tile.id];
                      const canBuild =
                        hasMonopoly &&
                        tile.type === 'property' &&
                        tile.houseCost &&
                        prop &&
                        prop.houses < 5 &&
                        !prop.isMortgaged &&
                        myPlayer.cash >= tile.houseCost;

                      const canSell =
                        tile.type === 'property' && prop && prop.houses > 0;

                      const canMortgage =
                        tile.mortgageValue &&
                        prop &&
                        !prop.isMortgaged &&
                        prop.houses === 0;

                      const canUnmortgage =
                        tile.mortgageValue &&
                        prop &&
                        prop.isMortgaged &&
                        myPlayer.cash >= Math.floor(tile.mortgageValue * 1.1);

                      return (
                        <div
                          key={tile.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{tile.name}</span>
                              {prop?.isMortgaged && (
                                <span className="text-[10px] font-black text-rose-400 bg-rose-950 px-1.5 rounded">
                                  MORTGAGED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                              <span>
                                {prop?.houses === 5
                                  ? '🏰 Highrise'
                                  : prop?.houses
                                  ? `🏡 ${prop.houses} Duplexes`
                                  : 'Vacant Land'}
                              </span>
                              {tile.houseCost && (
                                <span>• Build: {formatNaira(tile.houseCost, true)}</span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {tile.type === 'property' && (
                              <>
                                <button
                                  onClick={() => onBuildHouse(tile.id)}
                                  disabled={!canBuild}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] disabled:opacity-30 transition cursor-pointer"
                                  title={
                                    !hasMonopoly
                                      ? 'You must own all properties in this color group first'
                                      : 'Build another duplex/highrise'
                                  }
                                >
                                  + Build ({formatNaira(tile.houseCost || 0, true)})
                                </button>
                                {prop && prop.houses > 0 && (
                                  <button
                                    onClick={() => onSellHouse(tile.id)}
                                    disabled={!canSell}
                                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold text-[11px] transition cursor-pointer"
                                  >
                                    - Sell
                                  </button>
                                )}
                              </>
                            )}

                            {/* Mortgage buttons */}
                            {prop && !prop.isMortgaged ? (
                              <button
                                onClick={() => onMortgage(tile.id)}
                                disabled={!canMortgage}
                                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-[11px] disabled:opacity-30 transition cursor-pointer flex items-center gap-1"
                                title="Mortgage to bank for instant cash"
                              >
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span>Mortgage (+{formatNaira(tile.mortgageValue || 0, true)})</span>
                              </button>
                            ) : prop && prop.isMortgaged ? (
                              <button
                                onClick={() => onUnmortgage(tile.id)}
                                disabled={!canUnmortgage}
                                className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] disabled:opacity-30 transition cursor-pointer flex items-center gap-1"
                                title="Pay back mortgage with 10% bank interest"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>
                                  Redeem (-{formatNaira(Math.floor((tile.mortgageValue || 0) * 1.1), true)})
                                </span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
