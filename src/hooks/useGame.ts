import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  ClientAction,
  Player,
  AiDifficulty,
  TradeOffer,
} from '../types/game';
import {
  createLocalGame,
  rollDiceForPlayer,
  startLocalAuction,
  placeLocalBid,
  passLocalBid,
  concludeLocalAuction,
  endTurnForPlayer,
  addSystemMessage,
  checkWinner,
  checkBankruptcy,
  executeLocalBotTradeProposal,
  EngineInstance,
} from '../engine/localGameEngine';
import { LAGOS_BOARD_TILES, TOKENS } from '../data/lagosBoard';
import { sound } from '../utils/audio';

const STORAGE_OFFLINE_KEY = 'eko_offline_game_v1';
const STORAGE_OFFLINE_DECKS_KEY = 'eko_offline_decks_v1';

export interface PlayerConfig {
  name: string;
  token: string;
  isAi: boolean;
  aiDifficulty?: AiDifficulty;
}

export function useGame() {
  const [engineInstance, setEngineInstance] = useState<EngineInstance | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_OFFLINE_KEY);
      const savedDecks = localStorage.getItem(STORAGE_OFFLINE_DECKS_KEY);
      if (saved) {
        const state: GameState = JSON.parse(saved);
        const decks = savedDecks ? JSON.parse(savedDecks) : { chanceDeck: [], chestDeck: [] };
        return {
          state,
          chanceDeck: decks.chanceDeck || [],
          chestDeck: decks.chestDeck || [],
        };
      }
    } catch (e) {
      console.warn('Failed to recover offline game:', e);
    }
    return null;
  });

  const [hasSavedGame, setHasSavedGame] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(STORAGE_OFFLINE_KEY));
  });

  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);
  const [onlineConnected, setOnlineConnected] = useState<boolean>(false);

  // Online websocket refs if online mode is chosen
  const wsRef = useRef<WebSocket | null>(null);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const auctionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const botAuctionTimersRef = useRef<NodeJS.Timeout[]>([]);

  const gameState = engineInstance?.state || null;

  // Persist offline game state
  useEffect(() => {
    if (!isOnlineMode && engineInstance) {
      try {
        localStorage.setItem(STORAGE_OFFLINE_KEY, JSON.stringify(engineInstance.state));
        localStorage.setItem(
          STORAGE_OFFLINE_DECKS_KEY,
          JSON.stringify({
            chanceDeck: engineInstance.chanceDeck,
            chestDeck: engineInstance.chestDeck,
          })
        );
        setHasSavedGame(true);
      } catch (e) {
        console.warn('Could not save game state to localStorage:', e);
      }
    }
  }, [engineInstance, isOnlineMode]);

  // Determine current active human player or primary player
  const currentTurnPlayer = gameState?.players[gameState.currentTurnIndex];
  
  // In Pass & Play (multiple local humans), myPlayerId dynamically reflects the current human player
  // If it's an AI's turn, it keeps the last human or player 0
  const firstHuman = gameState?.players.find((p) => !p.isAi);
  const currentHuman = currentTurnPlayer && !currentTurnPlayer.isAi ? currentTurnPlayer : firstHuman;
  const myPlayerId = currentHuman?.id || gameState?.players[0]?.id || 'player_0';

  // Force re-render with state clone
  const commitState = useCallback((mutator: (inst: EngineInstance) => void) => {
    setEngineInstance((prev) => {
      if (!prev) return null;
      const cloneState: GameState = JSON.parse(JSON.stringify(prev.state));
      const nextInst: EngineInstance = {
        state: cloneState,
        chanceDeck: [...prev.chanceDeck],
        chestDeck: [...prev.chestDeck],
      };
      mutator(nextInst);
      return nextInst;
    });
  }, []);

  // START OFFLINE GAME
  const startOfflineGame = useCallback(
    (playersConfig: PlayerConfig[], roomCode: string = 'OFFLINE') => {
      // Clear any pending timers
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
      botAuctionTimersRef.current.forEach((t) => clearTimeout(t));
      botAuctionTimersRef.current = [];

      const newInst = createLocalGame({
        players: playersConfig,
        roomCode,
      });

      setEngineInstance(newInst);
      setIsOnlineMode(false);
      setErrorMessage(null);
      sound.playCash();
    },
    []
  );

  // QUICK PLAY OFFLINE (1 Click Play)
  const quickPlayOffline = useCallback(
    (
      playerName: string = 'Lagos Landlord',
      token: string = 'danfo',
      difficulty: AiDifficulty = 'medium',
      botCount: number = 2
    ) => {
      const bots: PlayerConfig[] = [
        { name: 'Folake (VI Tycoon)', token: 'gwagon', isAi: true, aiDifficulty: difficulty },
        { name: 'Tunde (Alaba Trader)', token: 'keke', isAi: true, aiDifficulty: difficulty },
        { name: 'Chidi (Tech Sis)', token: 'ferry', isAi: true, aiDifficulty: difficulty },
        { name: 'Amaka (Ikoyi Heiress)', token: 'crown', isAi: true, aiDifficulty: difficulty },
        { name: 'Babatunde (Danfo Boss)', token: 'eagle', isAi: true, aiDifficulty: difficulty },
      ];

      const chosenBots = bots.slice(0, Math.min(Math.max(botCount, 1), 5));
      const players: PlayerConfig[] = [
        { name: playerName, token, isAi: false },
        ...chosenBots,
      ];

      startOfflineGame(players, 'OFFLINE');
    },
    [startOfflineGame]
  );

  // RESET GAME (Clear saved game and go to lobby)
  const resetGame = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
    botAuctionTimersRef.current.forEach((t) => clearTimeout(t));
    botAuctionTimersRef.current = [];

    localStorage.removeItem(STORAGE_OFFLINE_KEY);
    localStorage.removeItem(STORAGE_OFFLINE_DECKS_KEY);
    setEngineInstance(null);
    setHasSavedGame(false);
    setIsOnlineMode(false);
  }, []);

  // LOCAL AUCTION TIMER TICK & BOT PARTICIPATION
  useEffect(() => {
    if (isOnlineMode || !gameState || !gameState.auction) {
      if (auctionTimerRef.current) {
        clearInterval(auctionTimerRef.current);
        auctionTimerRef.current = null;
      }
      return;
    }

    const auction = gameState.auction;
    const tile = LAGOS_BOARD_TILES[auction.tileId];

    // Trigger AI bids in auction
    const activeBots = gameState.players.filter(
      (p) => p.isAi && !p.isBankrupt && auction.activeBidderIds.includes(p.id) && p.id !== auction.highestBidderId
    );

    botAuctionTimersRef.current.forEach((t) => clearTimeout(t));
    botAuctionTimersRef.current = [];

    activeBots.forEach((bot, idx) => {
      const diff = bot.aiDifficulty || 'medium';
      const basePrice = tile?.price || 100000;
      let multiplier = diff === 'hard' ? 1.25 : diff === 'medium' ? 1.0 : 0.75;
      const maxVal = Math.min(bot.cash - 15000, Math.floor(basePrice * multiplier));

      const delay = 1000 + idx * 900 + Math.floor(Math.random() * 800);
      const timer = setTimeout(() => {
        commitState((inst) => {
          if (!inst.state.auction) return;
          const curAuc = inst.state.auction;
          if (curAuc.highestBidderId === bot.id) return;
          if (!curAuc.activeBidderIds.includes(bot.id)) return;

          if (maxVal >= curAuc.minNextBid && bot.cash >= curAuc.minNextBid) {
            placeLocalBid(inst.state, bot.id, curAuc.minNextBid);
            sound.playDiceRoll();
          } else {
            passLocalBid(inst.state, bot.id);
          }
        });
      }, delay);
      botAuctionTimersRef.current.push(timer);
    });

    // 1-second countdown
    auctionTimerRef.current = setInterval(() => {
      commitState((inst) => {
        if (!inst.state.auction) {
          if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
          return;
        }
        inst.state.auction.timeLeftSeconds--;
        if (inst.state.auction.timeLeftSeconds <= 0) {
          concludeLocalAuction(inst.state);
          sound.playCash();
          if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
        }
      });
    }, 1000);

    return () => {
      if (auctionTimerRef.current) clearInterval(auctionTimerRef.current);
      botAuctionTimersRef.current.forEach((t) => clearTimeout(t));
      botAuctionTimersRef.current = [];
    };
  }, [isOnlineMode, gameState?.auction?.tileId, commitState]);

  // LOCAL AI BOT TURNS
  useEffect(() => {
    if (isOnlineMode || !gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    if (!currentPlayer || !currentPlayer.isAi || currentPlayer.isBankrupt) return;
    if (gameState.auction) return; // Wait for auction to finish

    if (botTimerRef.current) clearTimeout(botTimerRef.current);

    // AI bot takes its turn in 2 steps: Roll -> Post-roll actions & End
    if (!gameState.hasRolled) {
      botTimerRef.current = setTimeout(() => {
        commitState((inst) => {
          const bot = inst.state.players[inst.state.currentTurnIndex];
          if (!bot || !bot.isAi || bot.isBankrupt) return;
          const diff = bot.aiDifficulty || 'medium';

          // Kirikiri jail strategy
          if (bot.inJail) {
            if (bot.jailCards > 0) {
              bot.jailCards--;
              bot.inJail = false;
              bot.jailTurns = 0;
              addSystemMessage(inst.state, `🤖 [${diff.toUpperCase()}] ${bot.name} used a Get Out of Kirikiri card!`);
            } else if (diff === 'hard' && bot.cash >= 150000) {
              bot.cash -= 50000;
              inst.state.freeParkingPool += 50000;
              bot.inJail = false;
              bot.jailTurns = 0;
              addSystemMessage(inst.state, `🤖 [HARD] ${bot.name} settled ₦50,000 fine to return to the Lagos streets.`);
            }
          }

          // Smart trading for Hard AI
          if (diff === 'hard' && !inst.state.activeTrade && Math.random() < 0.3) {
            executeLocalBotTradeProposal(inst.state, bot);
          }

          // Roll dice
          rollDiceForPlayer(inst, bot.id);
          sound.playDiceRoll();
        });
      }, 1400);
      return;
    }

    // Bot has rolled: handle post-roll tile decisions
    botTimerRef.current = setTimeout(() => {
      commitState((inst) => {
        const bot = inst.state.players[inst.state.currentTurnIndex];
        if (!bot || !bot.isAi || bot.isBankrupt) return;
        const diff = bot.aiDifficulty || 'medium';

        // Dismiss active card if any
        if (inst.state.activeCard) {
          inst.state.activeCard = null;
        }

        const tile = LAGOS_BOARD_TILES[bot.position];
        const prop = inst.state.properties[bot.position];

        // Buy or Auction decision
        if (
          tile &&
          (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') &&
          prop &&
          prop.ownerId === null &&
          tile.price
        ) {
          let shouldBuy = false;
          if (diff === 'hard') {
            shouldBuy = bot.cash >= tile.price;
          } else if (diff === 'medium') {
            shouldBuy = bot.cash >= tile.price + 80000;
          } else {
            shouldBuy = bot.cash >= tile.price + 250000;
          }

          if (shouldBuy && bot.cash >= tile.price) {
            bot.cash -= tile.price;
            prop.ownerId = bot.id;
            addSystemMessage(
              inst.state,
              `🏢 [${diff.toUpperCase()}] ${bot.name} bought ${tile.name} for ₦${tile.price.toLocaleString()}!`
            );
            sound.playCash();
          } else {
            addSystemMessage(
              inst.state,
              `🤖 [${diff.toUpperCase()}] ${bot.name} passed on ${tile.name}. Starting Public Auction!`
            );
            startLocalAuction(inst.state, tile.id);
            return; // Auction will handle turn end
          }
        }

        // Bot house building
        const colorGroups = ['brown', 'light_blue', 'pink', 'orange', 'red', 'yellow', 'green', 'dark_blue'] as const;
        for (const grp of colorGroups) {
          const tilesInGrp = LAGOS_BOARD_TILES.filter((t) => t.group === grp);
          const hasMonopoly = tilesInGrp.every((t) => inst.state.properties[t.id]?.ownerId === bot.id);

          if (hasMonopoly) {
            const minHouses = Math.min(...tilesInGrp.map((t) => inst.state.properties[t.id]?.houses || 0));
            const targetMax = diff === 'hard' ? 5 : diff === 'medium' ? 3 : 2;
            const reserve = diff === 'hard' ? 60000 : 150000;

            if (minHouses < targetMax) {
              for (const t of tilesInGrp) {
                const p = inst.state.properties[t.id];
                if (p && p.houses === minHouses && p.houses < targetMax && t.houseCost && bot.cash >= t.houseCost + reserve) {
                  bot.cash -= t.houseCost;
                  p.houses++;
                  const bld = p.houses === 5 ? 'Luxury Mansion 🏰' : `Duplex Level ${p.houses} 🏡`;
                  addSystemMessage(inst.state, `🏗️ [${diff.toUpperCase()}] ${bot.name} constructed a ${bld} on ${t.name}!`);
                  break;
                }
              }
            }
          }
        }

        // Advance turn to next player
        endTurnForPlayer(inst.state, bot.id);
      });
    }, 1200);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [isOnlineMode, gameState?.currentTurnIndex, gameState?.hasRolled, gameState?.auction, commitState]);

  // MAIN SEND ACTION HANDLER
  const sendAction = useCallback(
    (action: ClientAction) => {
      // If action is online-specific or we are in online room
      if (isOnlineMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(action));
        return;
      }

      // Handle offline actions
      commitState((inst) => {
        const state = inst.state;

        switch (action.type) {
          case 'quick_play_ai': {
            quickPlayOffline(action.playerName, action.token, action.difficulty, action.botCount);
            break;
          }

          case 'start_game': {
            state.status = 'playing';
            state.turnStartedAt = Date.now();
            addSystemMessage(state, '🚀 Game has started! May the best Lagos landlord win!');
            break;
          }

          case 'roll_dice': {
            const curP = state.players[state.currentTurnIndex];
            if (!curP || state.hasRolled) return;
            rollDiceForPlayer(inst, curP.id);
            sound.playDiceRoll();
            break;
          }

          case 'buy_property': {
            const curP = state.players[state.currentTurnIndex];
            if (!curP) return;
            const tile = LAGOS_BOARD_TILES[curP.position];
            const prop = state.properties[curP.position];

            if (tile && prop && prop.ownerId === null && tile.price && curP.cash >= tile.price) {
              curP.cash -= tile.price;
              prop.ownerId = curP.id;
              addSystemMessage(
                state,
                `🏢 Congratulations! ${curP.name} bought ${tile.name} for ₦${tile.price.toLocaleString()}!`
              );
              sound.playCash();
              state.turnPhase = 'turn_end';
            }
            break;
          }

          case 'decline_property':
          case 'auction_property': {
            const curP = state.players[state.currentTurnIndex];
            if (!curP) return;
            const tileId = curP.position;
            const tile = LAGOS_BOARD_TILES[tileId];
            const prop = state.properties[tileId];
            if (tile && prop && prop.ownerId === null) {
              addSystemMessage(state, `🔨 ${curP.name} put ${tile.name} up for Public Auction!`);
              startLocalAuction(state, tileId);
            } else {
              state.turnPhase = 'turn_end';
            }
            break;
          }

          case 'place_bid': {
            const bidderId = action.playerId || myPlayerId;
            placeLocalBid(state, bidderId, action.amount);
            sound.playDiceRoll();
            break;
          }

          case 'pass_bid': {
            const bidderId = action.playerId || myPlayerId;
            passLocalBid(state, bidderId);
            break;
          }

          case 'build_house': {
            const player = state.players.find((p) => p.id === (action.playerId || myPlayerId));
            const tile = LAGOS_BOARD_TILES[action.tileId];
            const prop = state.properties[action.tileId];

            if (!player || !tile || !prop || prop.ownerId !== player.id || !tile.houseCost) return;
            if (prop.houses >= 5 || player.cash < tile.houseCost) return;

            const grpTiles = LAGOS_BOARD_TILES.filter((t) => t.group === tile.group);
            const hasMonopoly = grpTiles.every((t) => state.properties[t.id]?.ownerId === player.id);
            if (!hasMonopoly) {
              setErrorMessage('You must own all properties in this group before constructing duplexes!');
              return;
            }

            player.cash -= tile.houseCost;
            prop.houses++;
            const bld = prop.houses === 5 ? 'Luxury Mansion 🏰' : `Duplex Level ${prop.houses} 🏡`;
            addSystemMessage(state, `🏗️ ${player.name} built a ${bld} on ${tile.name}!`);
            sound.playCash();
            break;
          }

          case 'sell_house': {
            const player = state.players.find((p) => p.id === (action.playerId || myPlayerId));
            const tile = LAGOS_BOARD_TILES[action.tileId];
            const prop = state.properties[action.tileId];

            if (!player || !tile || !prop || prop.ownerId !== player.id || prop.houses <= 0 || !tile.houseCost) return;

            const refund = Math.floor(tile.houseCost / 2);
            player.cash += refund;
            prop.houses--;
            addSystemMessage(state, `🔨 ${player.name} sold a building on ${tile.name} for ₦${refund.toLocaleString()}.`);
            sound.playCash();
            break;
          }

          case 'mortgage_property': {
            const player = state.players.find((p) => p.id === (action.playerId || myPlayerId));
            const tile = LAGOS_BOARD_TILES[action.tileId];
            const prop = state.properties[action.tileId];

            if (!player || !tile || !prop || prop.ownerId !== player.id || prop.isMortgaged || prop.houses > 0 || !tile.mortgageValue) return;

            player.cash += tile.mortgageValue;
            prop.isMortgaged = true;
            addSystemMessage(state, `🏦 ${player.name} mortgaged ${tile.name} to the bank for ₦${tile.mortgageValue.toLocaleString()}.`);
            sound.playCash();
            break;
          }

          case 'unmortgage_property': {
            const player = state.players.find((p) => p.id === (action.playerId || myPlayerId));
            const tile = LAGOS_BOARD_TILES[action.tileId];
            const prop = state.properties[action.tileId];

            if (!player || !tile || !prop || prop.ownerId !== player.id || !prop.isMortgaged || !tile.mortgageValue) return;

            const cost = Math.floor(tile.mortgageValue * 1.1);
            if (player.cash < cost) {
              setErrorMessage(`Insufficient cash to unmortgage (Needs ₦${cost.toLocaleString()})!`);
              return;
            }

            player.cash -= cost;
            prop.isMortgaged = false;
            addSystemMessage(state, `🔑 ${player.name} redeemed and unmortgaged ${tile.name} for ₦${cost.toLocaleString()}.`);
            sound.playCash();
            break;
          }

          case 'pay_jail_fine': {
            const curP = state.players[state.currentTurnIndex];
            if (!curP || !curP.inJail) return;

            if (curP.cash < 50000) {
              setErrorMessage('Insufficient cash to pay ₦50,000 Kirikiri fine!');
              return;
            }

            curP.cash -= 50000;
            state.freeParkingPool += 50000;
            curP.inJail = false;
            curP.jailTurns = 0;
            addSystemMessage(state, `🔓 ${curP.name} paid ₦50,000 fine and was released from Kirikiri!`);
            sound.playCash();
            break;
          }

          case 'use_jail_card': {
            const curP = state.players[state.currentTurnIndex];
            if (!curP || !curP.inJail || curP.jailCards <= 0) return;

            curP.jailCards--;
            curP.inJail = false;
            curP.jailTurns = 0;
            addSystemMessage(state, `📜 ${curP.name} used a Get Out of Kirikiri card!`);
            break;
          }

          case 'dismiss_card': {
            state.activeCard = null;
            state.turnPhase = 'turn_end';
            break;
          }

          case 'end_turn': {
            const curP = state.players[state.currentTurnIndex];
            if (!curP) return;
            endTurnForPlayer(state, curP.id);
            break;
          }

          case 'propose_trade': {
            const sender = state.players.find((p) => p.id === (action.playerId || myPlayerId));
            const receiver = state.players.find((p) => p.id === action.toPlayerId);
            if (!sender || !receiver || receiver.isBankrupt) return;

            const trade: TradeOffer = {
              id: 'tr_' + Math.random().toString(36).substring(2, 8),
              fromPlayerId: sender.id,
              toPlayerId: receiver.id,
              offering: action.offering,
              requesting: action.requesting,
              status: 'pending',
            };

            state.activeTrade = trade;
            addSystemMessage(state, `🤝 Deal Proposed: ${sender.name} sent an offer to ${receiver.name}!`);

            // If receiver is bot, evaluate
            if (receiver.isAi) {
              setTimeout(() => {
                commitState((subInst) => {
                  if (!subInst.state.activeTrade || subInst.state.activeTrade.id !== trade.id) return;
                  const bot = subInst.state.players.find((p) => p.id === trade.toPlayerId);
                  const human = subInst.state.players.find((p) => p.id === trade.fromPlayerId);
                  if (!bot || !human) return;

                  const diff = bot.aiDifficulty || 'medium';
                  let valReceived = trade.offering.cash;
                  trade.offering.properties.forEach((id) => {
                    valReceived += LAGOS_BOARD_TILES[id]?.price || 50000;
                  });

                  let valGiven = trade.requesting.cash;
                  trade.requesting.properties.forEach((id) => {
                    valGiven += LAGOS_BOARD_TILES[id]?.price || 50000;
                  });

                  const mult = diff === 'hard' ? 1.25 : diff === 'medium' ? 1.0 : 0.8;
                  const accepts = valReceived >= valGiven * mult && bot.cash >= trade.requesting.cash;

                  if (accepts) {
                    bot.cash += trade.offering.cash - trade.requesting.cash;
                    human.cash += trade.requesting.cash - trade.offering.cash;

                    trade.offering.properties.forEach((tileId) => {
                      if (subInst.state.properties[tileId]?.ownerId === human.id) {
                        subInst.state.properties[tileId].ownerId = bot.id;
                      }
                    });
                    trade.requesting.properties.forEach((tileId) => {
                      if (subInst.state.properties[tileId]?.ownerId === bot.id) {
                        subInst.state.properties[tileId].ownerId = human.id;
                      }
                    });

                    addSystemMessage(subInst.state, `🤝 Deal Sealed! [${diff.toUpperCase()}] ${bot.name} accepted ${human.name}'s deal.`);
                    sound.playCash();
                  } else {
                    addSystemMessage(subInst.state, `✋ [${diff.toUpperCase()}] ${bot.name} declined trade. "Oga, this deal no balance at all!"`);
                  }
                  subInst.state.activeTrade = null;
                });
              }, 1400);
            }
            break;
          }

          case 'respond_trade': {
            if (!state.activeTrade || state.activeTrade.id !== action.tradeId) return;
            const trade = state.activeTrade;
            const pFrom = state.players.find((p) => p.id === trade.fromPlayerId);
            const pTo = state.players.find((p) => p.id === trade.toPlayerId);

            if (!pFrom || !pTo) {
              state.activeTrade = null;
              return;
            }

            if (action.accept) {
              if (pFrom.cash < trade.offering.cash || pTo.cash < trade.requesting.cash) {
                setErrorMessage('Insufficient funds to complete deal!');
                return;
              }

              pFrom.cash = pFrom.cash - trade.offering.cash + trade.requesting.cash;
              pTo.cash = pTo.cash + trade.offering.cash - trade.requesting.cash;

              trade.offering.properties.forEach((tileId) => {
                if (state.properties[tileId]?.ownerId === pFrom.id) {
                  state.properties[tileId].ownerId = pTo.id;
                }
              });
              trade.requesting.properties.forEach((tileId) => {
                if (state.properties[tileId]?.ownerId === pTo.id) {
                  state.properties[tileId].ownerId = pFrom.id;
                }
              });

              addSystemMessage(state, `🤝 Deal Sealed! ${pTo.name} accepted the trade with ${pFrom.name}!`);
              sound.playCash();
            } else {
              addSystemMessage(state, `❌ Trade rejected: ${pTo.name} turned down ${pFrom.name}'s offer.`);
            }
            state.activeTrade = null;
            break;
          }

          case 'cancel_trade': {
            state.activeTrade = null;
            break;
          }

          case 'declare_bankruptcy': {
            const curP = state.players[state.currentTurnIndex];
            if (curP) {
              curP.cash = -1;
              checkBankruptcy(state, curP);
              endTurnForPlayer(state, curP.id);
            }
            break;
          }

          case 'send_chat': {
            const sender = state.players.find((p) => p.id === (action.playerId || myPlayerId)) || state.players[0];
            if (sender && action.text.trim()) {
              state.chatMessages.push({
                id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                senderId: sender.id,
                senderName: sender.name,
                senderColor: sender.color,
                text: action.text.trim().substring(0, 200),
                timestamp: Date.now(),
              });
              if (state.chatMessages.length > 80) state.chatMessages.shift();
            }
            break;
          }
        }
      });
    },
    [isOnlineMode, myPlayerId, commitState, quickPlayOffline]
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  return {
    gameState,
    myPlayerId,
    isOffline: !isOnlineMode,
    isConnected: true, // Always connected in offline mode!
    hasSavedGame,
    errorMessage,
    sendAction,
    startOfflineGame,
    quickPlayOffline,
    resetGame,
    clearError,
  };
}
