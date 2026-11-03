import React from 'react';
import { Card } from '../../types/game';
import { formatNaira } from '../../utils/currency';
import { Check } from 'lucide-react';

interface CardModalProps {
  card: Card | null;
  onDismiss: () => void;
  compactCurrency: boolean;
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  onDismiss,
  compactCurrency,
}) => {
  if (!card) return null;

  const isChance = card.type === 'chance';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150">
      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl p-6 text-neutral-100 flex flex-col items-center text-center border-2 ${
          isChance
            ? 'bg-gradient-to-b from-orange-950 via-neutral-900 to-neutral-950 border-orange-500/80'
            : 'bg-gradient-to-b from-emerald-950 via-neutral-900 to-neutral-950 border-emerald-500/80'
        }`}
      >
        {/* Card Header Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl mb-3 border ${
            isChance
              ? 'bg-orange-500/20 border-orange-400 text-orange-300'
              : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
          }`}
        >
          {isChance ? '❓' : '📦'}
        </div>

        <span
          className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2 ${
            isChance
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {isChance ? 'Opportunity & Fate (Chance)' : 'Lagos Hustle (Community Chest)'}
        </span>

        <h3 className="text-xl font-black text-white tracking-tight mb-2">
          {card.title}
        </h3>

        <p className="text-xs md:text-sm text-neutral-300 leading-relaxed mb-4">
          {card.description}
        </p>

        {/* Action Badge */}
        {card.amount && (
          <div
            className={`font-mono text-base font-extrabold px-3 py-1 rounded-lg mb-4 ${
              card.action === 'collect'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {card.action === 'collect' ? '+' : '-'} {formatNaira(card.amount, compactCurrency)}
          </div>
        )}

        <button
          onClick={onDismiss}
          className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg cursor-pointer ${
            isChance
              ? 'bg-orange-500 hover:bg-orange-400 text-black'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Acknowledge & Continue</span>
        </button>
      </div>
    </div>
  );
};
