import React from 'react';
import { Player } from '../../types/game';
import { getTokenMeta } from '../../utils/tokenHelper';

interface PlayerAvatarProps {
  player: Player;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
  showTokenName?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  size = 'md',
  showName = true,
  className = '',
  showTokenName = false,
}) => {
  if (!player) return null;
  const tokenMeta = getTokenMeta(player.token);

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-16 h-16 text-2xl',
  };

  const badgeSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`relative rounded-xl flex items-center justify-center font-bold shadow-md shrink-0 border-2 transition-transform hover:scale-105 ${sizeClasses[size]}`}
        style={{
          backgroundColor: `${player.color}25`,
          borderColor: player.color,
          color: '#ffffff',
          boxShadow: `0 0 12px ${player.color}40`,
        }}
        title={`${player.name} — Lagos Token: ${tokenMeta.name} (${tokenMeta.description})`}
      >
        <span className="select-none filter drop-shadow">{tokenMeta.emoji}</span>
        {/* Color indicator dot */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-neutral-900"
          style={{ backgroundColor: player.color }}
        />
      </div>
      {(showName || showTokenName) && (
        <div className="flex flex-col min-w-0">
          {showName && (
            <span className="font-extrabold text-white text-sm truncate flex items-center gap-1.5">
              {player.name}
              {player.isAi && (
                <span className="text-[10px] px-1 rounded bg-neutral-800 text-neutral-300 font-medium border border-neutral-700">AI</span>
              )}
            </span>
          )}
          {showTokenName && (
            <span className={`text-neutral-400 font-medium truncate flex items-center gap-1 ${badgeSizes[size]}`}>
              <span>{tokenMeta.emoji}</span>
              <span>{tokenMeta.name}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const PlayerTokenBadge: React.FC<{ player: Player; className?: string }> = ({ player, className = '' }) => {
  if (!player) return null;
  const tokenMeta = getTokenMeta(player.token);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${className}`}
      style={{
        backgroundColor: `${player.color}15`,
        borderColor: `${player.color}60`,
        color: player.color,
      }}
      title={`${player.name} drives/wears ${tokenMeta.name} (${tokenMeta.description})`}
    >
      <span className="text-sm">{tokenMeta.emoji}</span>
      <span className="text-white truncate max-w-[120px]">{player.name}</span>
    </span>
  );
};
