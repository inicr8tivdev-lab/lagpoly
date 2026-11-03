import React, { useState } from 'react';
import { GameState, Player, TradeItem } from '../../types/game';
import { LAGOS_BOARD_TILES, GROUP_COLORS } from '../../data/lagosBoard';
import { formatNaira } from '../../utils/currency';
import { X, Handshake, ArrowRightLeft, Check, Ban } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  myPlayer: Player | undefined;
  onProposeTrade: (toPlayerId: string, offering: TradeItem, requesting: TradeItem) => void;
  onRespondTrade: (tradeId: string, accept: boolean) => void;
  onCancelTrade: () => void;
  compactCurrency: boolean;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  gameState,
  myPlayer,
  onProposeTrade,
  onRespondTrade,
  onCancelTrade,
  compactCurrency,
}) => {
  const activeTrade = gameState.activeTrade;

  // Other active players to trade with
  const tradePartners = gameState.players.filter(
    (p) => p.id !== myPlayer?.id && !p.isBankrupt
  );

  const [targetPlayerId, setTargetPlayerId] = useState<string>(() => {
    return tradePartners[0]?.id || '';
  });

  // What I offer
  const [offerCash, setOfferCash] = useState<number>(0);
  const [offerProps, setOfferProps] = useState<number[]>([]);
  const [offerJailCards, setOfferJailCards] = useState<number>(0);

  // What I request
  const [requestCash, setRequestCash] = useState<number>(0);
  const [requestProps, setRequestProps] = useState<number[]>([]);
  const [requestJailCards, setRequestJailCards] = useState<number>(0);

  if (!isOpen && !activeTrade) return null;

  const targetPlayer = gameState.players.find((p) => p.id === targetPlayerId);

  // My owned properties
  const myProperties = Object.entries(gameState.properties)
    .filter(([_, prop]) => prop.ownerId === myPlayer?.id)
    .map(([id]) => LAGOS_BOARD_TILES[Number(id)]);

  // Target player's owned properties
  const targetProperties = targetPlayer
    ? Object.entries(gameState.properties)
        .filter(([_, prop]) => prop.ownerId === targetPlayer.id)
        .map(([id]) => LAGOS_BOARD_TILES[Number(id)])
    : [];

  const handleToggleOfferProp = (tileId: number) => {
    setOfferProps((prev) =>
      prev.includes(tileId) ? prev.filter((id) => id !== tileId) : [...prev, tileId]
    );
  };

  const handleToggleRequestProp = (tileId: number) => {
    setRequestProps((prev) =>
      prev.includes(tileId) ? prev.filter((id) => id !== tileId) : [...prev, tileId]
    );
  };

  const handleSendProposal = () => {
    if (!targetPlayerId || !myPlayer) return;
    onProposeTrade(
      targetPlayerId,
      { cash: offerCash, properties: offerProps, jailCards: offerJailCards },
      { cash: requestCash, properties: requestProps, jailCards: requestJailCards }
    );
  };

  // If there is an active trade proposal involving me as recipient
  if (activeTrade && activeTrade.toPlayerId === myPlayer?.id) {
    const fromPlayer = gameState.players.find((p) => p.id === activeTrade.fromPlayerId);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="relative w-full max-w-lg bg-neutral-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl p-5 text-neutral-100 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Handshake className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-lg font-black text-amber-300">Incoming Property Deal!</h3>
                <p className="text-xs text-neutral-400">
                  {fromPlayer?.name} wants to negotiate a trade with you.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* What you receive */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl space-y-2">
              <span className="font-bold text-emerald-400 uppercase text-[11px] block">
                You Will Receive:
              </span>
              <div className="font-mono text-sm font-bold text-emerald-300">
                +{formatNaira(activeTrade.offering.cash, compactCurrency)}
              </div>
              {activeTrade.offering.jailCards > 0 && (
                <div className="text-neutral-300 font-semibold">
                  📜 {activeTrade.offering.jailCards}x Kirikiri Bail Card
                </div>
              )}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px]">Properties:</span>
                {activeTrade.offering.properties.length === 0 ? (
                  <p className="text-neutral-500 italic">None</p>
                ) : (
                  activeTrade.offering.properties.map((id) => (
                    <div key={id} className="p-1.5 rounded bg-neutral-900 border border-neutral-800 font-medium">
                      {LAGOS_BOARD_TILES[id]?.name}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* What you give */}
            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl space-y-2">
              <span className="font-bold text-rose-400 uppercase text-[11px] block">
                You Will Give:
              </span>
              <div className="font-mono text-sm font-bold text-rose-300">
                -{formatNaira(activeTrade.requesting.cash, compactCurrency)}
              </div>
              {activeTrade.requesting.jailCards > 0 && (
                <div className="text-neutral-300 font-semibold">
                  📜 {activeTrade.requesting.jailCards}x Kirikiri Bail Card
                </div>
              )}
              <div className="space-y-1">
                <span className="text-neutral-400 text-[10px]">Properties:</span>
                {activeTrade.requesting.properties.length === 0 ? (
                  <p className="text-neutral-500 italic">None</p>
                ) : (
                  activeTrade.requesting.properties.map((id) => (
                    <div key={id} className="p-1.5 rounded bg-neutral-900 border border-neutral-800 font-medium">
                      {LAGOS_BOARD_TILES[id]?.name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
            <button
              onClick={() => onRespondTrade(activeTrade.id, false)}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Ban className="w-4 h-4" />
              <span>Decline Deal</span>
            </button>
            <button
              onClick={() => onRespondTrade(activeTrade.id, true)}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg"
            >
              <Check className="w-4 h-4" />
              <span>Accept Deal (Senior Man!)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If there is an active trade proposal sent by me
  if (activeTrade && activeTrade.fromPlayerId === myPlayer?.id) {
    const toPlayer = gameState.players.find((p) => p.id === activeTrade.toPlayerId);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-5 text-neutral-100 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse">
            <Handshake className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Deal Sent to {toPlayer?.name}!</h3>
          <p className="text-xs text-neutral-400">
            Waiting for {toPlayer?.name} to review your terms and accept or decline...
          </p>
          <button
            onClick={onCancelTrade}
            className="mt-2 px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel Offer
          </button>
        </div>
      </div>
    );
  }

  // Create new trade proposal modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl p-4 md:p-6 text-neutral-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Handshake className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-base md:text-lg font-black text-white">
                Digital Property Trading Floor
              </h3>
              <p className="text-xs text-neutral-400">
                Swap Lagos real estate, cash, or Kirikiri cards with fellow investors.
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

        {/* Trade Partner Selector */}
        <div className="my-3 flex items-center gap-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-xs">
          <span className="font-bold text-neutral-300 shrink-0">Trading Partner:</span>
          {tradePartners.length === 0 ? (
            <span className="text-neutral-500">No other active players</span>
          ) : (
            <select
              value={targetPlayerId}
              onChange={(e) => {
                setTargetPlayerId(e.target.value);
                setRequestProps([]);
                setRequestCash(0);
              }}
              className="bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100 font-semibold focus:outline-none focus:border-emerald-500"
            >
              {tradePartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatNaira(p.cash, compactCurrency)} cash)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2 Columns: What You Offer vs What You Request */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {/* Column 1: What You Offer */}
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                1. You Offer
              </span>
              <span className="text-[11px] text-neutral-400">
                Your Cash: {formatNaira(myPlayer?.cash || 0, compactCurrency)}
              </span>
            </div>

            {/* Cash input */}
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">
                Naira Amount: <span className="font-mono font-bold text-white">{formatNaira(offerCash, compactCurrency)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={Math.max(0, myPlayer?.cash || 0)}
                step={10000}
                value={offerCash}
                onChange={(e) => setOfferCash(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Kirikiri Free Card */}
            {(myPlayer?.jailCards || 0) > 0 && (
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offerJailCards > 0}
                  onChange={(e) => setOfferJailCards(e.target.checked ? 1 : 0)}
                  className="rounded text-emerald-500"
                />
                <span>Include Get Out of Kirikiri Card</span>
              </label>
            )}

            {/* Property list */}
            <div className="flex-1 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-neutral-400">Your Properties:</span>
              {myProperties.length === 0 ? (
                <p className="text-xs text-neutral-600 italic">You don't own any properties yet</p>
              ) : (
                myProperties.map((tile) => {
                  const grp = tile.group ? GROUP_COLORS[tile.group] : null;
                  const isSelected = offerProps.includes(tile.id);
                  return (
                    <div
                      key={tile.id}
                      onClick={() => handleToggleOfferProp(tile.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {grp && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: grp.bg }}
                          />
                        )}
                        <span className="font-semibold line-clamp-1">{tile.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {formatNaira(tile.price || 0, true)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: What You Request */}
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                2. You Request
              </span>
              <span className="text-[11px] text-neutral-400">
                Their Cash: {formatNaira(targetPlayer?.cash || 0, compactCurrency)}
              </span>
            </div>

            {/* Cash input */}
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">
                Naira Amount: <span className="font-mono font-bold text-white">{formatNaira(requestCash, compactCurrency)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={Math.max(0, targetPlayer?.cash || 0)}
                step={10000}
                value={requestCash}
                onChange={(e) => setRequestCash(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Kirikiri Free Card */}
            {(targetPlayer?.jailCards || 0) > 0 && (
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestJailCards > 0}
                  onChange={(e) => setRequestJailCards(e.target.checked ? 1 : 0)}
                  className="rounded text-amber-500"
                />
                <span>Request Get Out of Kirikiri Card</span>
              </label>
            )}

            {/* Property list */}
            <div className="flex-1 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-neutral-400">Their Properties:</span>
              {targetProperties.length === 0 ? (
                <p className="text-xs text-neutral-600 italic">They don't own any properties yet</p>
              ) : (
                targetProperties.map((tile) => {
                  const grp = tile.group ? GROUP_COLORS[tile.group] : null;
                  const isSelected = requestProps.includes(tile.id);
                  return (
                    <div
                      key={tile.id}
                      onClick={() => handleToggleRequestProp(tile.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-500 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {grp && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: grp.bg }}
                          />
                        )}
                        <span className="font-semibold line-clamp-1">{tile.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {formatNaira(tile.price || 0, true)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer / Submit */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleSendProposal}
            disabled={!targetPlayer || (offerCash === 0 && offerProps.length === 0 && requestCash === 0 && requestProps.length === 0)}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-extrabold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Send Trade Proposal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
