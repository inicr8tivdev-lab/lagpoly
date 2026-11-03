import React, { useMemo } from 'react';
import { GameState, Player, BoardTile, PropertyGroup } from '../../types/game';
import { LAGOS_BOARD_TILES } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import {
  Building2,
  Home,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Info,
  Banknote,
  Layers,
} from 'lucide-react';

interface MyPropertiesPanelProps {
  gameState: GameState;
  myPlayer: Player | undefined;
  compactCurrency: boolean;
  onSelectTile: (tile: BoardTile) => void;
  onBuildHouse: (tileId: number) => void;
  onSellHouse: (tileId: number) => void;
  onMortgage: (tileId: number) => void;
  onUnmortgage: (tileId: number) => void;
}

const GROUP_LABELS: Record<PropertyGroup, string> = {
  brown: 'Marina & Broad St',
  light_blue: 'Surulere & Yaba',
  pink: 'Maryland & Ikeja',
  orange: 'Gbagada & Magodo',
  red: 'Lekki Phase 1',
  yellow: 'Ikoyi & Banana Island',
  green: 'Eko Atlantic City',
  dark_blue: 'Victoria Island',
  station: 'Lagos Transit & Terminals',
  utility: 'Public Utilities (NEPA & Water)',
};

const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown: '#8B4513',
  light_blue: '#38bdf8',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  dark_blue: '#3b82f6',
  station: '#64748b',
  utility: '#a855f7',
};

export const MyPropertiesPanel: React.FC<MyPropertiesPanelProps> = ({
  gameState,
  myPlayer,
  compactCurrency,
  onSelectTile,
  onBuildHouse,
  onSellHouse,
  onMortgage,
  onUnmortgage,
}) => {
  // Filter tiles owned by myPlayer
  const ownedTiles = useMemo(() => {
    if (!myPlayer) return [];
    return LAGOS_BOARD_TILES.filter(
      (t) =>
        (t.type === 'property' || t.type === 'station' || t.type === 'utility') &&
        gameState.properties[t.id]?.ownerId === myPlayer.id
    );
  }, [gameState.properties, myPlayer]);

  // Group owned tiles by PropertyGroup
  const groupedOwnedTiles = useMemo(() => {
    const groups: Partial<Record<PropertyGroup, BoardTile[]>> = {};
    ownedTiles.forEach((tile) => {
      const grp = tile.group || (tile.type === 'station' ? 'station' : 'utility');
      if (!groups[grp]) groups[grp] = [];
      groups[grp]!.push(tile);
    });
    return groups;
  }, [ownedTiles]);

  // Check which groups are full monopolies
  const monopolies = useMemo(() => {
    if (!myPlayer) return new Set<PropertyGroup>();
    const completed = new Set<PropertyGroup>();
    const allGroups: PropertyGroup[] = [
      'brown',
      'light_blue',
      'pink',
      'orange',
      'red',
      'yellow',
      'green',
      'dark_blue',
      'station',
      'utility',
    ];

    allGroups.forEach((grp) => {
      const allTilesInGrp = LAGOS_BOARD_TILES.filter((t) => t.group === grp);
      if (
        allTilesInGrp.length > 0 &&
        allTilesInGrp.every((t) => gameState.properties[t.id]?.ownerId === myPlayer.id)
      ) {
        completed.add(grp);
      }
    });

    return completed;
  }, [gameState.properties, myPlayer]);

  // Calculate total portfolio value and potential rent
  const { totalValuation, totalMaxRent } = useMemo(() => {
    let val = 0;
    let rent = 0;
    ownedTiles.forEach((tile) => {
      val += tile.price || 0;
      const propState = gameState.properties[tile.id];
      if (propState) {
        if (tile.houseCost && propState.houses > 0) {
          val += propState.houses * tile.houseCost;
        }
        if (!propState.isMortgaged) {
          if (tile.rentTiers) {
            rent += tile.rentTiers[propState.houses] || tile.rentTiers[0];
          } else if (tile.type === 'station') {
            const stationCount = ownedTiles.filter((t) => t.type === 'station').length;
            const tiers = [25000, 50000, 100000, 200000];
            rent += tiers[Math.min(stationCount - 1, 3)] || 25000;
          } else {
            rent += 40000;
          }
        }
      }
    });
    return { totalValuation: val, totalMaxRent: rent };
  }, [ownedTiles, gameState.properties]);

  const groupKeys = Object.keys(groupedOwnedTiles) as PropertyGroup[];

  return (
    <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl flex flex-col h-full overflow-hidden shadow-xl select-none">
      {/* Top Header */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-100 flex items-center gap-1.5">
              <span>My Properties</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30">
                {ownedTiles.length}
              </span>
            </h4>
            <p className="text-[10px] text-neutral-400">Exclusive Real Estate Portfolio</p>
          </div>
        </div>

        {/* Quick Monopolies Badge */}
        {monopolies.size > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{monopolies.size} Complete {monopolies.size === 1 ? 'Set' : 'Sets'}</span>
          </div>
        )}
      </div>

      {/* Portfolio Financial Summary Bar */}
      <div className="grid grid-cols-2 gap-2 p-2.5 bg-neutral-950/40 border-b border-neutral-800/80 text-xs">
        <div className="flex flex-col p-2 rounded-lg bg-neutral-900/80 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-1">
            <Banknote className="w-3 h-3 text-emerald-400" /> Asset Value
          </span>
          <span className="font-mono font-extrabold text-white text-xs mt-0.5">
            {formatNaira(totalValuation, compactCurrency)}
          </span>
        </div>
        <div className="flex flex-col p-2 rounded-lg bg-neutral-900/80 border border-neutral-800">
          <span className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" /> Est. Rent Yield
          </span>
          <span className="font-mono font-extrabold text-amber-400 text-xs mt-0.5">
            {formatNaira(totalMaxRent, compactCurrency)}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-2.5 overflow-y-auto flex flex-col gap-3 min-h-[350px] max-h-[600px]">
        {ownedTiles.length === 0 ? (
          /* Empty State */
          <div className="my-auto flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-2.5">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-center text-2xl shadow-inner">
              🏙️
            </div>
            <div className="flex flex-col gap-1">
              <h5 className="font-extrabold text-neutral-200 text-sm">
                No Properties Owned Yet
              </h5>
              <p className="text-xs text-neutral-400 max-w-[240px] leading-relaxed">
                Roll the dice, buy prime Lagos properties when you land, or win public auctions to establish your real estate empire!
              </p>
            </div>
          </div>
        ) : (
          /* Grouped Properties List */
          groupKeys.map((grpKey) => {
            const tilesInGroup = groupedOwnedTiles[grpKey] || [];
            const hasMonopoly = monopolies.has(grpKey);
            const grpColor = GROUP_COLORS[grpKey] || '#10b981';
            const grpLabel = GROUP_LABELS[grpKey] || grpKey;
            const totalInLagos = LAGOS_BOARD_TILES.filter((t) => t.group === grpKey).length;

            return (
              <div
                key={grpKey}
                className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden shadow-sm"
              >
                {/* District Group Header */}
                <div className="px-2.5 py-1.5 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: grpColor }}
                    />
                    <span className="font-black text-xs text-neutral-200 truncate">
                      {grpLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-neutral-400">
                      {tilesInGroup.length}/{totalInLagos || tilesInGroup.length}
                    </span>
                    {hasMonopoly && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Monopoly (2x)
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual Property Cards */}
                <div className="divide-y divide-neutral-800/60">
                  {tilesInGroup.map((tile) => {
                    const propState = gameState.properties[tile.id];
                    if (!propState) return null;

                    const isMortgaged = propState.isMortgaged;
                    const houses = propState.houses;

                    // Calculate current rent for display
                    let currentRent = 0;
                    if (tile.rentTiers) {
                      currentRent = tile.rentTiers[houses] || tile.rentTiers[0];
                      if (hasMonopoly && houses === 0) currentRent *= 2;
                    } else if (tile.type === 'station') {
                      const stationCount = ownedTiles.filter((t) => t.type === 'station').length;
                      const tiers = [25000, 50000, 100000, 200000];
                      currentRent = tiers[Math.min(stationCount - 1, 3)] || 25000;
                    }

                    const canBuild =
                      hasMonopoly &&
                      !isMortgaged &&
                      houses < 5 &&
                      tile.houseCost &&
                      myPlayer &&
                      myPlayer.cash >= tile.houseCost;

                    const canSellHouse = houses > 0 && !isMortgaged;
                    const canMortgage = !isMortgaged && houses === 0;
                    const unmortgageCost = tile.mortgageValue
                      ? Math.floor(tile.mortgageValue * 1.1)
                      : 0;
                    const canUnmortgage = isMortgaged && myPlayer && myPlayer.cash >= unmortgageCost;

                    return (
                      <div
                        key={tile.id}
                        className="p-2.5 flex flex-col gap-2 hover:bg-neutral-900/40 transition group"
                      >
                        {/* Title & Rent Header */}
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectTile(tile)}
                            className="flex items-center gap-1.5 text-left truncate cursor-pointer hover:text-emerald-300 transition"
                            title="Click to view full Deed Card"
                          >
                            <span className="font-bold text-xs text-neutral-100 truncate">
                              {tile.name}
                            </span>
                            <ArrowUpRight className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition" />
                          </button>

                          {/* Rent or Mortgaged State */}
                          <div className="flex items-center gap-1 shrink-0 text-right">
                            {isMortgaged ? (
                              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-0.5">
                                <ShieldAlert className="w-3 h-3" /> Mortgaged
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-extrabold text-emerald-400">
                                {formatNaira(currentRent, compactCurrency)} <span className="text-[9px] text-neutral-400 font-normal">rent</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Development Level & Badges */}
                        <div className="flex items-center justify-between gap-1 text-[11px] text-neutral-400">
                          <div className="flex items-center gap-1">
                            {tile.type === 'property' && (
                              <div className="flex items-center gap-0.5">
                                {houses === 0 ? (
                                  <span className="text-[10px] text-neutral-500">Undeveloped Land</span>
                                ) : houses === 5 ? (
                                  <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                    <span>🏰</span> Luxury Highrise
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-0.5">
                                    {Array.from({ length: houses }).map((_, i) => (
                                      <span key={i}>🏡</span>
                                    ))}
                                    <span className="ml-1">Level {houses}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {tile.type === 'station' && (
                              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-blue-400" /> Transit Terminal
                              </span>
                            )}

                            {tile.type === 'utility' && (
                              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                ⚡ Essential Utility
                              </span>
                            )}
                          </div>

                          {/* Base Price */}
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Cost: {formatNaira(tile.price || 0, compactCurrency)}
                          </span>
                        </div>

                        {/* Interactive Management Actions Bar */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800/40">
                          {/* Build Duplex Button */}
                          {hasMonopoly && tile.type === 'property' && houses < 5 && (
                            <button
                              type="button"
                              onClick={() => onBuildHouse(tile.id)}
                              disabled={!canBuild}
                              className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer border ${
                                canBuild
                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/40 active:scale-95'
                                  : 'bg-neutral-800/40 text-neutral-600 border-neutral-800 cursor-not-allowed opacity-50'
                              }`}
                              title={
                                tile.houseCost
                                  ? `Build Duplex for ${formatNaira(tile.houseCost, compactCurrency)}`
                                  : undefined
                              }
                            >
                              <Home className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">
                                +Build ({formatNaira(tile.houseCost || 0, compactCurrency)})
                              </span>
                            </button>
                          )}

                          {/* Sell Duplex Button */}
                          {houses > 0 && (
                            <button
                              type="button"
                              onClick={() => onSellHouse(tile.id)}
                              className="py-1 px-2 rounded-lg text-[10px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition active:scale-95 cursor-pointer"
                              title={`Sell duplex for ${formatNaira((tile.houseCost || 0) / 2, compactCurrency)}`}
                            >
                              -Sell
                            </button>
                          )}

                          {/* Mortgage / Unmortgage Button */}
                          {isMortgaged ? (
                            <button
                              type="button"
                              onClick={() => onUnmortgage(tile.id)}
                              disabled={!canUnmortgage}
                              className={`py-1 px-2 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                                canUnmortgage
                                  ? 'bg-amber-600/30 text-amber-300 hover:bg-amber-600/40 border-amber-500/40 active:scale-95'
                                  : 'bg-neutral-800/40 text-neutral-600 border-neutral-800 opacity-50 cursor-not-allowed'
                              }`}
                              title={`Unmortgage for ${formatNaira(unmortgageCost, compactCurrency)}`}
                            >
                              Unmortgage ({formatNaira(unmortgageCost, compactCurrency)})
                            </button>
                          ) : (
                            canMortgage && (
                              <button
                                type="button"
                                onClick={() => onMortgage(tile.id)}
                                className="py-1 px-2 rounded-lg text-[10px] font-semibold bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition active:scale-95 cursor-pointer"
                                title={`Mortgage for immediate +${formatNaira(tile.mortgageValue || 0, compactCurrency)} cash`}
                              >
                                Mortgage (+{formatNaira(tile.mortgageValue || 0, compactCurrency)})
                              </button>
                            )
                          )}

                          {/* Inspect Info Button */}
                          <button
                            type="button"
                            onClick={() => onSelectTile(tile)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer shrink-0"
                            title="Inspect Deed Card"
                          >
                            <Info className="w-3 h-3" />
                          </button>
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
    </div>
  );
};
