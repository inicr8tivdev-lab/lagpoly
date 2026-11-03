import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../../utils/audio';

interface DiceRollProps {
  dice: [number, number];
  canRoll: boolean;
  onRoll: () => void;
  doublesCount: number;
}

const DOT_POSITIONS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
};

export const DiceRoll: React.FC<DiceRollProps> = ({
  dice,
  canRoll,
  onRoll,
  doublesCount,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayDice, setDisplayDice] = useState<[number, number]>(() => {
    return dice[0] > 0 && dice[1] > 0 ? dice : [3, 5];
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetDiceRef = useRef<[number, number]>(dice);
  const prevDiceRef = useRef<[number, number]>(dice);

  // Keep targetDiceRef synced with incoming dice prop
  useEffect(() => {
    targetDiceRef.current = dice;
  }, [dice]);

  // Clean up any timers on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // When server sends a new non-zero roll (e.g. from an AI bot or remote player)
  useEffect(() => {
    const prev = prevDiceRef.current;
    prevDiceRef.current = dice;

    // Detect new roll when dice changes to non-zero values
    const isNewServerRoll =
      dice[0] > 0 &&
      dice[1] > 0 &&
      (prev[0] !== dice[0] || prev[1] !== dice[1] || prev[0] === 0);

    if (isNewServerRoll && !isRolling) {
      // Trigger a 450ms visual tumble so the player sees the roll animate in the center
      triggerVisualTumble(dice);
    }
  }, [dice]);

  const triggerVisualTumble = (finalDice: [number, number]) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsRolling(true);
    sound.playDiceRoll();

    intervalRef.current = setInterval(() => {
      setDisplayDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 60);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setDisplayDice(finalDice[0] > 0 ? finalDice : [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
      setIsRolling(false);
    }, 500);
  };

  const handleRollClick = () => {
    if (!canRoll || isRolling) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsRolling(true);
    sound.playDiceRoll();

    // Trigger server action right away
    onRoll();

    // Rapid shuffle for 500ms
    intervalRef.current = setInterval(() => {
      setDisplayDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 55);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;

      // Lock on server dice or realistic random fallback
      const finalDice = targetDiceRef.current;
      if (finalDice[0] > 0 && finalDice[1] > 0) {
        setDisplayDice(finalDice);
      } else {
        // If server hasn't returned yet, pick random faces temporarily until state arrives
        setDisplayDice([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }
      setIsRolling(false);
    }, 520);
  };

  const renderDie = (value: number, index: number) => {
    const safeVal = Math.min(Math.max(value || 1, 1), 6);
    const dots = DOT_POSITIONS[safeVal] || DOT_POSITIONS[1];

    return (
      <button
        type="button"
        onClick={canRoll && !isRolling ? handleRollClick : undefined}
        disabled={!canRoll && !isRolling}
        aria-label={`Die ${index + 1}: ${safeVal}`}
        className={`relative w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-white via-neutral-100 to-neutral-200 rounded-xl shadow-xl border-2 transition-all duration-150 select-none flex items-center justify-center ${
          canRoll && !isRolling
            ? 'cursor-pointer hover:scale-105 active:scale-95 border-emerald-400 ring-2 ring-emerald-400/40 shadow-emerald-500/20'
            : 'border-neutral-300'
        } ${
          isRolling
            ? 'animate-bounce rotate-12 scale-105 shadow-emerald-500/40 border-emerald-400'
            : ''
        }`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full p-2 pointer-events-none">
          {dots.map(([cx, cy], idx) => (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r="9"
              fill={safeVal === 1 ? '#dc2626' : '#171717'}
            />
          ))}
        </svg>
      </button>
    );
  };

  const hasRolledAtLeastOnce = !isRolling && (dice[0] > 0 && dice[1] > 0);
  const total = displayDice[0] + displayDice[1];
  const isDoubles = hasRolledAtLeastOnce && displayDice[0] === displayDice[1];

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Clickable Animated 3D Dice Pair */}
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={canRoll && !isRolling ? handleRollClick : undefined}
        title={canRoll ? 'Click to Roll Dice (Oya!)' : undefined}
      >
        {renderDie(displayDice[0], 0)}
        {renderDie(displayDice[1], 1)}
      </div>

      {/* Result Indicator */}
      <div className="flex items-center gap-2 min-h-5">
        {isRolling ? (
          <span className="text-xs font-black text-amber-400 animate-pulse flex items-center gap-1">
            <span>🎲</span>
            <span>Rolling the dice...</span>
          </span>
        ) : hasRolledAtLeastOnce ? (
          <>
            <span className="text-xs font-mono font-bold text-neutral-300">
              Rolled: <span className="text-white font-extrabold">{displayDice[0]} + {displayDice[1]} = </span>
              <span className="text-emerald-400 text-sm font-extrabold">{total}</span>
            </span>
            {isDoubles && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                Doubles! {doublesCount > 1 ? `(${doublesCount}/3)` : ''}
              </span>
            )}
          </>
        ) : canRoll ? (
          <span className="text-xs font-bold text-emerald-400 animate-pulse">
            🎲 Your Turn — Tap to Roll!
          </span>
        ) : (
          <span className="text-[11px] font-medium text-neutral-400">
            Awaiting Turn...
          </span>
        )}
      </div>

      {/* Prominent Center Roll Button */}
      {canRoll && (
        <button
          type="button"
          onClick={handleRollClick}
          disabled={isRolling}
          className="px-5 py-2 rounded-xl font-extrabold text-xs md:text-sm bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-lg shadow-emerald-950/60 active:scale-95 transition-all flex items-center gap-2 border border-emerald-200 cursor-pointer animate-pulse"
        >
          <span className="text-base">🎲</span>
          <span>{isRolling ? 'Rolling...' : 'Roll Dice (Oya!)'}</span>
        </button>
      )}
    </div>
  );
};
