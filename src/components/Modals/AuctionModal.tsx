import React from 'react';
import { GameState, Player, BoardTile } from '../../types/game';
import { LAGOS_BOARD_TILES, TOKENS } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import { Gavel, Clock, Flame, CheckCircle, Ban, TrendingUp } from 'lucide-react';

interface AuctionModalProps {
  gameState: GameState;
  myPlayer: Player | undefined;
  compactCurrency: boolean;
  onPlaceBid: (amount: number) => void;
  onPassBid: () => void;
  onSelectTile?: (tile: BoardTile) => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  gameState,
  myPlayer,
  compactCurrency,
  onPlaceBid,
  onPassBid,
  onSelectTile,
}) => {
  const auction = gameState.auction;
  if (!auction) return null;

  const tile = LAGOS_BOARD_TILES[auction.tileId];
  if (!tile) return null;

  const isLeadingBidder = Boolean(myPlayer && auction.highestBidderId === myPlayer.id);
  const hasPassed = Boolean(myPlayer && auction.passedBidderIds.includes(myPlayer.id));
  const isBankrupt = Boolean(myPlayer?.isBankrupt);

  const leadingBidderPlayer = gameState.players.find((p) => p.id === auction.highestBidderId);
  const leadingBidderToken = TOKENS.find((t) => t.id === leadingBidderPlayer?.token);

  // Group colors map
  const groupColors: Record<string, string> = {
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

  const headerColor = tile.group ? groupColors[tile.group] || '#10b981' : '#10b981';

  const minBid = auction.minNextBid;
  const bidOptions = [
    { label: `+₦10K (${formatNaira(minBid, compactCurrency)})`, amount: minBid },
    { label: `+₦25K (${formatNaira(minBid + 15000, compactCurrency)})`, amount: minBid + 15000 },
    { label: `+₦50K (${formatNaira(minBid + 40000, compactCurrency)})`, amount: minBid + 40000 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-950/50 flex flex-col overflow-hidden text-neutral-100 animate-in zoom-in-95 duration-200">
        {/* Top Gold Stripe */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        {/* Header */}
        <div className="px-4 py-3 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Gavel className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                <span>Public Land Auction</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  LIVE
                </span>
              </h3>
              <p className="text-[10px] text-neutral-400">Lagos Land Registry • Going to highest bidder</p>
            </div>
          </div>

          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-inner border transition-all ${
              auction.timeLeftSeconds <= 4
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-ping'
                : 'bg-neutral-800 text-amber-300 border-neutral-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{auction.timeLeftSeconds}s</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto">
          {/* Property Card Mini Preview */}
          <div
            onClick={() => onSelectTile && onSelectTile(tile)}
            className="cursor-pointer group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950/60 transition hover:border-neutral-700 shadow-md"
          >
            <div
              className="py-1 px-3 text-center text-xs font-black tracking-wider uppercase text-white shadow-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: headerColor }}
            >
              <span>{tile.name}</span>
            </div>
            <div className="p-2.5 flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Standard Valuation</span>
                <span className="font-mono font-bold text-neutral-200">
                  {formatNaira(tile.price || 0, compactCurrency)}
                </span>
              </div>
              {tile.rentTiers && (
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Base Rent</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatNaira(tile.rentTiers[0], compactCurrency)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Current Highest Bid Card */}
          <div className="rounded-xl p-3 bg-gradient-to-b from-neutral-950/90 to-neutral-900 border border-amber-500/30 flex flex-col items-center justify-center text-center gap-1 relative overflow-hidden shadow-inner">
            <div className="absolute top-1 left-2 flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-tight">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Current Leading Bid</span>
            </div>

            <div className="mt-2 text-2xl md:text-3xl font-black font-mono tracking-tight text-amber-400 drop-shadow">
              {auction.highestBid > 0 ? formatNaira(auction.highestBid, compactCurrency) : 'No Bids Yet'}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 text-xs">
              {leadingBidderPlayer ? (
                <>
                  <span className="text-sm">{leadingBidderToken?.emoji || '👤'}</span>
                  <span className="font-bold text-neutral-200">{leadingBidderPlayer.name}</span>
                  {isLeadingBidder && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                      You are Winning!
                    </span>
                  )}
                </>
              ) : (
                <span className="text-neutral-400 text-xs italic">
                  Opening Bid starts at {formatNaira(minBid, compactCurrency)}
                </span>
              )}
            </div>
          </div>

          {/* User's Bidding Controls */}
          {myPlayer && !isBankrupt ? (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-neutral-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Your Available Cash:
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatNaira(myPlayer.cash, compactCurrency)}
                </span>
              </div>

              {hasPassed ? (
                <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-center flex items-center justify-center gap-2 text-neutral-400 text-xs">
                  <Ban className="w-4 h-4 text-neutral-500" />
                  <span>You have withdrawn from this auction.</span>
                </div>
              ) : isLeadingBidder ? (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-center flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold animate-pulse">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>You are currently the highest bidder! Waiting for timer or counter-bids...</span>
                </div>
              ) : (
                <>
                  {/* Quick Bid Options */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {bidOptions.map((opt, idx) => {
                      const canAfford = myPlayer.cash >= opt.amount;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onPlaceBid(opt.amount)}
                          disabled={!canAfford}
                          className={`py-2 px-1 rounded-xl font-extrabold text-[11px] md:text-xs flex flex-col items-center justify-center gap-0.5 transition border cursor-pointer ${
                            canAfford
                              ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black border-emerald-400 shadow-md active:scale-95'
                              : 'bg-neutral-800/60 text-neutral-500 border-neutral-700/60 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span>Bid</span>
                          <span className="font-mono text-[10px]">{formatNaira(opt.amount, compactCurrency)}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pass / Withdraw Button */}
                  <button
                    type="button"
                    onClick={onPassBid}
                    className="w-full py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white font-semibold text-xs border border-neutral-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Pass / Withdraw from Auction</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="p-2 text-center text-xs text-neutral-500">
              Spectating live land auction...
            </div>
          )}

          {/* Recent Bids Feed */}
          {auction.recentBids.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-neutral-800/80 pt-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Recent Bids Log
              </span>
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                {auction.recentBids.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-neutral-950/50 border border-neutral-800/60"
                  >
                    <span className="font-medium text-neutral-300 truncate max-w-[150px]">
                      {b.playerName}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatNaira(b.amount, compactCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
