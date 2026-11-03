import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Player } from '../../types/game';
import { NIGERIAN_SLANG_PRESETS } from '../../data/lagosBoard';
import { Send, MessageSquareQuote } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  myPlayer: Player | undefined;
  onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  myPlayer: _myPlayer,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handlePresetClick = (preset: string) => {
    onSendMessage(preset);
    setShowPresets(false);
  };

  return (
    <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
        <div className="flex items-center gap-2">
          <span className="text-base">💬</span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-200">
              Lagos Street Banter
            </h4>
            <p className="text-[10px] text-neutral-400">Live Player Chat & Trade Wire</p>
          </div>
        </div>

        {/* Slangs Preset Toggle */}
        <button
          onClick={() => setShowPresets(!showPresets)}
          className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
            showPresets
              ? 'bg-emerald-500 text-black'
              : 'bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700'
          }`}
        >
          <MessageSquareQuote className="w-3.5 h-3.5" />
          <span>Slangs</span>
        </button>
      </div>

      {/* Preset Banter Tray */}
      {showPresets && (
        <div className="p-2 bg-neutral-950 border-b border-neutral-800 flex flex-wrap gap-1 max-h-28 overflow-y-auto animate-in slide-in-from-top-2">
          {NIGERIAN_SLANG_PRESETS.map((slang, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(slang)}
              className="text-[11px] px-2 py-1 rounded-full bg-neutral-900 hover:bg-emerald-950 hover:text-emerald-300 border border-neutral-800 hover:border-emerald-600/50 text-neutral-300 font-medium transition cursor-pointer"
            >
              {slang}
            </button>
          ))}
        </div>
      )}

      {/* Message Feed */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs min-h-[160px] max-h-[300px] md:max-h-[380px]"
      >
        {messages.length === 0 ? (
          <div className="text-center text-neutral-500 py-6 text-xs">
            No messages yet. Greet the other landlords!
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="p-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800/80 text-[11px] text-neutral-300 leading-snug"
                >
                  <span className="font-bold text-amber-400 mr-1.5">{msg.senderName}:</span>
                  <span>{msg.text}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: msg.senderColor || '#10b981' }}
                  />
                  <span className="font-bold text-[11px] text-neutral-200">
                    {msg.senderName}
                  </span>
                  <span className="text-[9px] text-neutral-500 ml-auto">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-neutral-800/80 px-2.5 py-1.5 rounded-lg text-neutral-200 leading-relaxed break-words border border-neutral-700/50">
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-2 border-t border-neutral-800 bg-neutral-950/80 flex items-center gap-1.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message or click Slangs..."
          maxLength={180}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black transition cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
