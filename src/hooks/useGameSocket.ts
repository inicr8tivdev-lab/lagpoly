import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, ClientAction } from '../types/game';
import { sound } from '../utils/audio';

export function useGameSocket() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    return localStorage.getItem('eko_player_id') || null;
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<GameState | null>(null);
  const myPlayerIdRef = useRef<string | null>(myPlayerId);
  const gameStateRef = useRef<GameState | null>(null);
  const pendingActionsRef = useRef<ClientAction[]>([]);

  // Sync refs
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
  }, [myPlayerId]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setErrorMessage(null);

        // Auto-reconnect to existing active room if saved
        const savedRoom = localStorage.getItem('eko_room_code');
        const savedId = localStorage.getItem('eko_player_id');
        if (savedRoom && savedId) {
          ws.send(JSON.stringify({
            type: 'reconnect',
            roomCode: savedRoom,
            playerId: savedId,
          }));
        }

        // Flush pending actions
        while (pendingActionsRef.current.length > 0) {
          const act = pendingActionsRef.current.shift();
          if (act) {
            const payload = {
              ...act,
              playerId: act.playerId || myPlayerIdRef.current || undefined,
              roomCode: act.roomCode || gameStateRef.current?.roomCode || undefined,
            };
            ws.send(JSON.stringify(payload));
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'joined') {
            setMyPlayerId(data.playerId);
            myPlayerIdRef.current = data.playerId;
            localStorage.setItem('eko_player_id', data.playerId);
            if (data.roomCode) {
              localStorage.setItem('eko_room_code', data.roomCode);
            }
            setGameState(data.state);
            lastStateRef.current = data.state;
            gameStateRef.current = data.state;
          } else if (data.type === 'state_update') {
            const prevState = lastStateRef.current;
            const newState: GameState = data.state;

            // Audio cues based on state changes
            if (prevState) {
              // Dice roll audio
              if (
                !prevState.hasRolled &&
                newState.hasRolled &&
                (newState.dice[0] !== prevState.dice[0] || newState.dice[1] !== prevState.dice[1])
              ) {
                sound.playDiceRoll();
              }
              // Cash / jail sound
              const mePrev = prevState.players.find((p) => p.id === myPlayerIdRef.current);
              const meNew = newState.players.find((p) => p.id === myPlayerIdRef.current);
              if (mePrev && meNew) {
                if (meNew.cash > mePrev.cash) {
                  sound.playCash();
                }
                if (!mePrev.inJail && meNew.inJail) {
                  sound.playJail();
                }
              }
              // Winner fanfare
              if (prevState.status !== 'game_over' && newState.status === 'game_over') {
                sound.playFanfare();
              }
            }

            lastStateRef.current = newState;
            gameStateRef.current = newState;
            setGameState(newState);
          } else if (data.type === 'error') {
            setErrorMessage(data.message);
            setTimeout(() => setErrorMessage(null), 4000);
          }
        } catch (e) {
          console.error('Failed to parse websocket message', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Schedule auto reconnect
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 1500);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendAction = useCallback((action: ClientAction) => {
    const payload = {
      ...action,
      playerId: action.playerId || myPlayerIdRef.current || undefined,
      roomCode: action.roomCode || gameStateRef.current?.roomCode || undefined,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      // Buffer action and silently reconnect without annoying error toast
      pendingActionsRef.current.push(action);
      connect();
    }
  }, [connect]);

  return {
    gameState,
    myPlayerId,
    isConnected,
    errorMessage,
    sendAction,
    clearError: () => setErrorMessage(null),
  };
}
