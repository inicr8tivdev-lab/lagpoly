import React from 'react';
import { ChatMessage } from '../../types/game';
import { Bell, X, Megaphone, Check } from 'lucide-react';

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: ChatMessage[];
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({
  isOpen,
  onClose,
  announcements,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl p-5 md:p-6 text-neutral-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-white">
                Official Lagos Street Announcements
              </h3>
              <p className="text-xs text-neutral-400">
                Complete log of dice rolls, property acquisitions, rents, and penalties.
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

        {/* Announcements List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 my-4 pr-1">
          {announcements.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              No announcements recorded yet. Game events will be logged here.
            </div>
          ) : (
            [...announcements].reverse().map((msg) => {
              const isJail = msg.text.includes('Kirikiri') || msg.text.includes('LASTMA');
              const isMoney = msg.text.includes('₦') || msg.text.includes('rent') || msg.text.includes('bought');
              const isDice = msg.text.includes('rolled');

              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                    isJail
                      ? 'bg-rose-950/40 border-rose-800/60'
                      : isMoney
                      ? 'bg-emerald-950/40 border-emerald-800/60'
                      : isDice
                      ? 'bg-neutral-950 border-neutral-800'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm shrink-0 mt-0.5">
                    {isJail ? '🚨' : isMoney ? '💰' : isDice ? '🎲' : <Megaphone className="w-3.5 h-3.5 text-amber-400" />}
                  </div>

                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px] text-amber-300">
                        {msg.senderName || 'Lagos Announcer'}
                      </span>
                      <span className="text-[9px] text-neutral-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-neutral-200 leading-relaxed font-medium">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex justify-between items-center text-xs">
          <span className="text-neutral-400">
            Total Logged: <strong className="text-white">{announcements.length}</strong> events
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
