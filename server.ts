import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';
import {
  GameState,
  Player,
  ClientAction,
  Card,
  TradeOffer,
  ChatMessage,
  PropertyState,
  AuctionState,
  AuctionBid,
} from './src/types/game.ts';
import {
  LAGOS_BOARD_TILES,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  TOKENS,
  PLAYER_COLORS,
} from './src/data/lagosBoard.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());

// API health and room check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Storage for active game rooms
interface RoomData {
  state: GameState;
  clients: Map<string, WebSocket>; // playerId -> socket
  chanceDeck: Card[];
  chestDeck: Card[];
  botTimer: NodeJS.Timeout | null;
  auctionTimer?: NodeJS.Timeout | null;
  botAuctionTimers?: NodeJS.Timeout[];
}

const rooms = new Map<string, RoomData>();

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createInitialProperties(): Record<number, PropertyState> {
  const props: Record<number, PropertyState> = {};
  LAGOS_BOARD_TILES.forEach((tile) => {
    if (tile.type === 'property' || tile.type === 'station' || tile.type === 'utility') {
      props[tile.id] = {
        ownerId: null,
        houses: 0,
        isMortgaged: false,
      };
    }
  });
  return props;
}

function broadcastState(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const payload = JSON.stringify({
    type: 'state_update',
    state: room.state,
  });

  room.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function addSystemMessage(room: RoomData, text: string) {
  const msg: ChatMessage = {
    id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    senderId: 'system',
    senderName: 'Lagos Announcer 🎙️',
    text,
    timestamp: Date.now(),
    isSystem: true,
  };
  room.state.chatMessages.push(msg);
  if (room.state.chatMessages.length > 80) {
    room.state.chatMessages.shift();
  }
}

function checkWinner(room: RoomData) {
  const activePlayers = room.state.players.filter((p) => !p.isBankrupt);
  if (activePlayers.length === 1 && room.state.status === 'playing') {
    room.state.status = 'game_over';
    room.state.winner = activePlayers[0];
    addSystemMessage(room, `🎉 Otilo! ${activePlayers[0].name} has conquered the Lagos Real Estate Market and won the game! 👑`);
  }
}

// Bot AI Turn Automation
function triggerBotTurnIfNeeded(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.state.status !== 'playing') return;

  if (room.botTimer) {
    clearTimeout(room.botTimer);
    room.botTimer = null;
  }

  const currentPlayer = room.state.players[room.state.currentTurnIndex];
  if (!currentPlayer || !currentPlayer.isAi || currentPlayer.isBankrupt) return;

  room.botTimer = setTimeout(() => {
    executeBotTurn(roomCode);
  }, 1400);
}

function executeBotTurn(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.state.status !== 'playing') return;

  const bot = room.state.players[room.state.currentTurnIndex];
  if (!bot || !bot.isAi || bot.isBankrupt) return;

  const difficulty = bot.aiDifficulty || 'medium';

  // Count unowned properties left on the board
  const unownedCount = LAGOS_BOARD_TILES.filter((t) => {
    const isBuyable = t.type === 'property' || t.type === 'station' || t.type === 'utility';
    return isBuyable && room.state.properties[t.id]?.ownerId === null;
  }).length;

  // 1. Jail Strategy based on difficulty
  if (bot.inJail) {
    if (bot.jailCards > 0) {
      // Hard bot uses card if early game; Easy bot uses card anytime
      bot.jailCards--;
      bot.inJail = false;
      bot.jailTurns = 0;
      addSystemMessage(room, `🤖 [${difficulty.toUpperCase()}] ${bot.name} used a Get Out of Kirikiri card!`);
      broadcastState(roomCode);
    } else if (difficulty === 'hard') {
      // Early game: pay immediately to snap up land. Late game: stay in jail to avoid high rents!
      if (unownedCount > 4 && bot.cash >= 50000) {
        bot.cash -= 50000;
        room.state.freeParkingPool += 50000;
        bot.inJail = false;
        bot.jailTurns = 0;
        addSystemMessage(room, `🤖 [HARD] ${bot.name} paid ₦50,000 fine to rush back and conquer open properties.`);
        broadcastState(roomCode);
      } else {
        addSystemMessage(room, `🤖 [HARD] ${bot.name} strategically chills in Kirikiri to dodge dangerous opponent rents.`);
      }
    } else if (difficulty === 'medium') {
      if (unownedCount > 6 && bot.cash > 250000) {
        bot.cash -= 50000;
        room.state.freeParkingPool += 50000;
        bot.inJail = false;
        bot.jailTurns = 0;
        addSystemMessage(room, `🤖 [MED] ${bot.name} settled ₦50,000 fine and left Kirikiri.`);
        broadcastState(roomCode);
      }
    } else {
      // Easy: only pays if forced after 3 turns
    }
  }

  // 2. Proactive Trading for Hard AI before rolling
  if (difficulty === 'hard' && !room.state.activeTrade && Math.random() < 0.35) {
    proposeSmartBotTrade(room, bot);
  }

  // 3. Roll dice
  if (!room.state.hasRolled) {
    handleRollDice(room, bot.id);
    broadcastState(roomCode);

    room.botTimer = setTimeout(() => {
      executeBotPostRoll(roomCode);
    }, 1400);
    return;
  }

  executeBotPostRoll(roomCode);
}

function proposeSmartBotTrade(room: RoomData, bot: Player) {
  // Check if bot needs 1 property to complete any color group
  const colorGroups = ['brown', 'light_blue', 'pink', 'orange', 'red', 'yellow', 'green', 'dark_blue'] as const;
  for (const grp of colorGroups) {
    const tilesInGrp = LAGOS_BOARD_TILES.filter((t) => t.group === grp);
    const ownedByBot = tilesInGrp.filter((t) => room.state.properties[t.id]?.ownerId === bot.id);
    
    // Bot has all but 1 in group
    if (ownedByBot.length === tilesInGrp.length - 1) {
      const missingTile = tilesInGrp.find((t) => room.state.properties[t.id]?.ownerId !== bot.id);
      if (!missingTile) continue;

      const currentOwnerId = room.state.properties[missingTile.id]?.ownerId;
      if (!currentOwnerId || currentOwnerId === bot.id) continue;

      const owner = room.state.players.find((p) => p.id === currentOwnerId && !p.isBankrupt && !p.isAi);
      if (!owner) continue;

      // Offer missingTile.price * 1.35 cash + non-monopoly spare property
      const cashOffer = Math.min(bot.cash - 50000, Math.floor((missingTile.price || 100000) * 1.35));
      if (cashOffer < (missingTile.price || 50000)) continue;

      const trade: TradeOffer = {
        id: 'tr_' + Math.random().toString(36).substring(2, 8),
        fromPlayerId: bot.id,
        toPlayerId: owner.id,
        offering: { cash: cashOffer, properties: [], jailCards: 0 },
        requesting: { cash: 0, properties: [missingTile.id], jailCards: 0 },
        status: 'pending',
      };

      room.state.activeTrade = trade;
      addSystemMessage(room, `🤝 [HARD] ${bot.name} proposed an aggressive ₦${cashOffer.toLocaleString()} buyout for ${missingTile.name} to ${owner.name}!`);
      break;
    }
  }
}

function executeBotPostRoll(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.state.status !== 'playing') return;
  const bot = room.state.players[room.state.currentTurnIndex];
  if (!bot || !bot.isAi) return;

  const difficulty = bot.aiDifficulty || 'medium';

  // Dismiss card if active
  if (room.state.activeCard) {
    room.state.activeCard = null;
    broadcastState(roomCode);
  }

  const currentTile = LAGOS_BOARD_TILES[bot.position];
  const propState = room.state.properties[bot.position];

  // Property buying logic according to difficulty
  if (
    currentTile &&
    (currentTile.type === 'property' || currentTile.type === 'station' || currentTile.type === 'utility') &&
    propState &&
    propState.ownerId === null &&
    currentTile.price
  ) {
    let shouldBuy = false;

    if (difficulty === 'hard') {
      // Hard bot buys almost anything. If cash is short by up to ₦100,000, mortgages a spare unbuilt property!
      if (bot.cash >= currentTile.price) {
        shouldBuy = true;
      } else if (bot.cash + 100000 >= currentTile.price) {
        // Mortgage a non-monopoly tile
        const spareTile = LAGOS_BOARD_TILES.find(
          (t) =>
            room.state.properties[t.id]?.ownerId === bot.id &&
            !room.state.properties[t.id]?.isMortgaged &&
            room.state.properties[t.id]?.houses === 0 &&
            t.mortgageValue
        );
        if (spareTile && spareTile.mortgageValue) {
          bot.cash += spareTile.mortgageValue;
          room.state.properties[spareTile.id].isMortgaged = true;
          addSystemMessage(room, `⚡ [HARD] ${bot.name} mortgaged ${spareTile.name} to finance buying ${currentTile.name}!`);
          if (bot.cash >= currentTile.price) {
            shouldBuy = true;
          }
        }
      }
    } else if (difficulty === 'medium') {
      // Medium bot buys if cash after buy >= ₦80,000
      shouldBuy = bot.cash >= currentTile.price + 80000;
    } else {
      // Easy bot is timid, only buys if holding > ₦250,000 after purchase
      shouldBuy = bot.cash >= currentTile.price + 250000;
    }

    if (shouldBuy && bot.cash >= currentTile.price) {
      handleBuyProperty(room, bot.id);
    } else {
      addSystemMessage(room, `🤖 [${difficulty.toUpperCase()}] ${bot.name} passed on buying ${currentTile.name}. Property goes to Public Auction!`);
      startAuction(room, currentTile.id);
      broadcastState(roomCode);
      return; // Auction in progress
    }
    broadcastState(roomCode);
  }

  // Construction logic for Bots (Duplexes / Mansions)
  handleBotConstruction(room, bot, difficulty);

  // End turn after small delay
  room.botTimer = setTimeout(() => {
    handleEndTurn(room, bot.id);
    broadcastState(roomCode);
    triggerBotTurnIfNeeded(roomCode);
  }, 1000);
}

function handleBotConstruction(room: RoomData, bot: Player, difficulty: 'easy' | 'medium' | 'hard') {
  if (difficulty === 'easy' && bot.cash < 450000) return;

  const colorGroups = ['brown', 'light_blue', 'pink', 'orange', 'red', 'yellow', 'green', 'dark_blue'] as const;

  for (const grp of colorGroups) {
    const tilesInGrp = LAGOS_BOARD_TILES.filter((t) => t.group === grp);
    const hasMonopoly = tilesInGrp.every((t) => room.state.properties[t.id]?.ownerId === bot.id);

    if (hasMonopoly) {
      const minHouses = Math.min(...tilesInGrp.map((t) => room.state.properties[t.id]?.houses || 0));
      const targetMax = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 3 : 2;
      const reserveCash = difficulty === 'hard' ? 60000 : difficulty === 'medium' ? 120000 : 350000;

      if (minHouses < targetMax) {
        for (const tile of tilesInGrp) {
          const prop = room.state.properties[tile.id];
          if (
            prop &&
            prop.houses === minHouses &&
            prop.houses < targetMax &&
            tile.houseCost &&
            bot.cash >= tile.houseCost + reserveCash
          ) {
            bot.cash -= tile.houseCost;
            prop.houses++;
            const bldName = prop.houses === 5 ? 'Luxury Mansion 🏰' : `Duplex Level ${prop.houses} 🏡`;
            addSystemMessage(room, `🏗️ [${difficulty.toUpperCase()}] ${bot.name} built a ${bldName} on ${tile.name}!`);
            break;
          }
        }
      }
    }
  }
}

function handleRollDice(room: RoomData, playerId: string, ws?: WebSocket) {
  const player = room.state.players[room.state.currentTurnIndex];
  if (!player) return;

  if (player.id !== playerId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', message: `Wait your turn! It's currently ${player.name}'s turn.` }));
    }
    return;
  }

  if (room.state.hasRolled) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', message: 'You have already rolled this turn! Take an action or end turn.' }));
    }
    return;
  }

  const d1 = randomInt(1, 7);
  const d2 = randomInt(1, 7);
  room.state.dice = [d1, d2];
  const isDoubles = d1 === d2;

  addSystemMessage(room, `🎲 ${player.name} rolled [${d1}, ${d2}] (Total: ${d1 + d2})!`);

  if (player.inJail) {
    if (isDoubles) {
      player.inJail = false;
      player.jailTurns = 0;
      addSystemMessage(room, `🔓 ${player.name} rolled doubles [${d1}, ${d2}] and is released from Kirikiri!`);
      // Move forward
      movePlayer(room, player, d1 + d2);
      room.state.hasRolled = true;
    } else {
      player.jailTurns++;
      if (player.jailTurns >= 3) {
        // Must pay fine and get out
        const fine = 50000;
        player.cash -= fine;
        room.state.freeParkingPool += fine;
        player.inJail = false;
        player.jailTurns = 0;
        addSystemMessage(room, `🔒 ${player.name} spent 3 turns in Kirikiri. Paid ₦50,000 fine and is released!`);
        movePlayer(room, player, d1 + d2);
      } else {
        addSystemMessage(room, `🔒 ${player.name} rolled [${d1}, ${d2}]. Still in Kirikiri (Turn ${player.jailTurns}/3).`);
      }
      room.state.hasRolled = true;
      room.state.turnPhase = 'turn_end';
    }
    return;
  }

  // Not in jail
  if (isDoubles) {
    room.state.doublesCount++;
    if (room.state.doublesCount >= 3) {
      // 3 consecutive doubles = Jail
      player.inJail = true;
      player.position = 10;
      room.state.doublesCount = 0;
      room.state.hasRolled = true;
      room.state.turnPhase = 'turn_end';
      addSystemMessage(room, `🚨 3 consecutive doubles! LASTMA intercepted ${player.name} for reckless driving. Go to Kirikiri!`);
      return;
    }
  } else {
    room.state.doublesCount = 0;
  }

  room.state.hasRolled = true;
  movePlayer(room, player, d1 + d2);
}

function movePlayer(room: RoomData, player: Player, steps: number) {
  const oldPos = player.position;
  let newPos = (oldPos + steps) % 40;

  // Passed GO check
  if (newPos < oldPos && steps > 0) {
    player.cash += 200000;
    addSystemMessage(room, `💰 ${player.name} passed START and collected ₦200,000 salary!`);
  }

  player.position = newPos;
  handleTileLanding(room, player, newPos);
}

function handleTileLanding(room: RoomData, player: Player, tileId: number) {
  const tile = LAGOS_BOARD_TILES[tileId];
  if (!tile) return;

  room.state.turnPhase = 'tile_action';

  switch (tile.type) {
    case 'go':
      room.state.lastActionMessage = `${player.name} landed on START!`;
      room.state.turnPhase = 'turn_end';
      break;

    case 'go_to_jail':
      player.inJail = true;
      player.position = 10;
      room.state.doublesCount = 0;
      room.state.turnPhase = 'turn_end';
      addSystemMessage(room, `🚨 ${player.name} ran into LASTMA and Alagbon Police! Sent directly to Kirikiri!`);
      break;

    case 'jail':
      room.state.lastActionMessage = `${player.name} is just visiting Kirikiri.`;
      room.state.turnPhase = 'turn_end';
      break;

    case 'parking': {
      const jackpot = room.state.freeParkingPool;
      if (jackpot > 0) {
        player.cash += jackpot;
        room.state.freeParkingPool = 0;
        addSystemMessage(room, `🎰 Jackpot! ${player.name} landed on Tafawa Balewa Square and won ₦${jackpot.toLocaleString()}!`);
      } else {
        room.state.lastActionMessage = `${player.name} is chilling at Tafawa Balewa Square (Free Parking).`;
      }
      room.state.turnPhase = 'turn_end';
      break;
    }

    case 'tax': {
      const amount = tile.taxAmount || 100000;
      player.cash -= amount;
      room.state.freeParkingPool += amount;
      addSystemMessage(room, `🏛️ ${player.name} paid ₦${amount.toLocaleString()} for ${tile.name}. Added to TBS jackpot!`);
      room.state.turnPhase = 'turn_end';
      checkBankruptcy(room, player);
      break;
    }

    case 'chance': {
      if (room.chanceDeck.length === 0) {
        room.chanceDeck = shuffle(CHANCE_CARDS);
      }
      const card = room.chanceDeck.shift()!;
      room.state.activeCard = card;
      applyCardEffect(room, player, card);
      break;
    }

    case 'community_chest': {
      if (room.chestDeck.length === 0) {
        room.chestDeck = shuffle(COMMUNITY_CHEST_CARDS);
      }
      const card = room.chestDeck.shift()!;
      room.state.activeCard = card;
      applyCardEffect(room, player, card);
      break;
    }

    case 'property':
    case 'station':
    case 'utility': {
      const propState = room.state.properties[tileId];
      if (!propState) {
        room.state.turnPhase = 'turn_end';
        return;
      }

      if (propState.ownerId === null) {
        const cost = tile.price || 0;
        if (player.cash < cost) {
          // Automatic auction when player does not have enough money to buy!
          addSystemMessage(
            room,
            `⚠️ ${player.name} landed on ${tile.name} (₦${cost.toLocaleString()}) but has insufficient cash (₦${player.cash.toLocaleString()}). Starting automatic Public Auction!`
          );
          room.state.lastActionMessage = `Insufficient cash (₦${player.cash.toLocaleString()})! Automatic Auction for ${tile.name}!`;
          startAuction(room, tileId);
        } else {
          // Unowned: player can buy or auction
          room.state.lastActionMessage = `${player.name} landed on ${tile.name}. Buy for ₦${cost.toLocaleString()} or put it up for Auction!`;
          room.state.turnPhase = 'tile_action';
        }
      } else if (propState.ownerId === player.id) {
        // Owns property
        room.state.lastActionMessage = `${player.name} landed on their own property (${tile.name}).`;
        room.state.turnPhase = 'turn_end';
      } else {
        // Rent due
        const owner = room.state.players.find((p) => p.id === propState.ownerId);
        if (owner && !owner.isBankrupt && !propState.isMortgaged) {
          const rent = calculateRent(room, tile, propState);
          player.cash -= rent;
          owner.cash += rent;
          addSystemMessage(room, `💸 ${player.name} paid ₦${rent.toLocaleString()} rent to ${owner.name} for landing on ${tile.name}.`);
          checkBankruptcy(room, player, owner);
        } else if (propState.isMortgaged) {
          room.state.lastActionMessage = `${tile.name} is currently mortgaged. No rent owed.`;
        }
        room.state.turnPhase = 'turn_end';
      }
      break;
    }
  }
}

function calculateRent(room: RoomData, tile: (typeof LAGOS_BOARD_TILES)[0], propState: PropertyState): number {
  if (tile.type === 'station') {
    // Count stations owned by owner
    const stationCount = LAGOS_BOARD_TILES.filter(
      (t) => t.type === 'station' && room.state.properties[t.id]?.ownerId === propState.ownerId
    ).length;
    const tiers = [25000, 50000, 100000, 200000];
    return tiers[Math.min(stationCount - 1, 3)] || 25000;
  }

  if (tile.type === 'utility') {
    const utilityCount = LAGOS_BOARD_TILES.filter(
      (t) => t.type === 'utility' && room.state.properties[t.id]?.ownerId === propState.ownerId
    ).length;
    const diceTotal = room.state.dice[0] + room.state.dice[1];
    const multiplier = utilityCount === 2 ? 10000 : 4000;
    return diceTotal * multiplier;
  }

  if (tile.type === 'property' && tile.rentTiers) {
    if (propState.houses > 0) {
      return tile.rentTiers[propState.houses] || tile.rentTiers[0];
    }
    // Check if player has complete color group monopoly -> double base rent
    const groupTiles = LAGOS_BOARD_TILES.filter((t) => t.group === tile.group);
    const hasMonopoly = groupTiles.every((t) => room.state.properties[t.id]?.ownerId === propState.ownerId);
    return hasMonopoly ? tile.rentTiers[0] * 2 : tile.rentTiers[0];
  }

  return 10000;
}

function applyCardEffect(room: RoomData, player: Player, card: Card) {
  addSystemMessage(room, `🎴 [${card.type === 'chance' ? 'Chance' : 'Lagos Hustle'}] ${player.name}: ${card.title} - ${card.description}`);

  switch (card.action) {
    case 'collect':
      if (card.amount) {
        player.cash += card.amount;
      }
      break;

    case 'pay':
      if (card.amount) {
        player.cash -= card.amount;
        room.state.freeParkingPool += card.amount;
        checkBankruptcy(room, player);
      }
      break;

    case 'jail':
      player.inJail = true;
      player.position = 10;
      room.state.doublesCount = 0;
      room.state.turnPhase = 'turn_end';
      break;

    case 'out_of_jail':
      player.jailCards++;
      break;

    case 'move_to':
      if (card.targetPosition !== undefined) {
        const oldPos = player.position;
        player.position = card.targetPosition;
        if (card.targetPosition < oldPos && card.targetPosition !== 10) {
          player.cash += 200000;
          addSystemMessage(room, `💰 ${player.name} passed START and collected ₦200,000!`);
        }
        handleTileLanding(room, player, card.targetPosition);
      }
      break;

    case 'repairs': {
      let totalHouses = 0;
      let totalHotels = 0;
      Object.entries(room.state.properties).forEach(([id, p]) => {
        if (p.ownerId === player.id) {
          if (p.houses >= 5) totalHotels++;
          else totalHouses += p.houses;
        }
      });
      const cost = totalHouses * (card.houseCost || 25000) + totalHotels * (card.hotelCost || 100000);
      player.cash -= cost;
      room.state.freeParkingPool += cost;
      addSystemMessage(room, `🛠️ Generator & Flood Repairs cost ${player.name} ₦${cost.toLocaleString()} for ${totalHouses} duplexes and ${totalHotels} high-rises.`);
      checkBankruptcy(room, player);
      break;
    }
  }
}

function checkBankruptcy(room: RoomData, player: Player, creditor?: Player) {
  if (player.cash >= 0) return;

  // Check total net worth (cash + unmortgaged properties value)
  let liquidationValue = player.cash;
  Object.entries(room.state.properties).forEach(([id, p]) => {
    if (p.ownerId === player.id) {
      const tile = LAGOS_BOARD_TILES[Number(id)];
      if (tile?.mortgageValue && !p.isMortgaged) {
        liquidationValue += tile.mortgageValue;
      }
    }
  });

  if (liquidationValue < 0) {
    // Player is bankrupt!
    player.isBankrupt = true;
    addSystemMessage(room, `💥 Sapa strikes! ${player.name} is bankrupt and eliminated from the game!`);

    // Transfer properties to creditor or bank
    Object.entries(room.state.properties).forEach(([id, p]) => {
      if (p.ownerId === player.id) {
        if (creditor && !creditor.isBankrupt) {
          p.ownerId = creditor.id;
        } else {
          p.ownerId = null;
          p.houses = 0;
          p.isMortgaged = false;
        }
      }
    });

    checkWinner(room);
  }
}

function handleBuyProperty(room: RoomData, playerId: string) {
  const player = room.state.players.find((p) => p.id === playerId);
  if (!player || player.isBankrupt) return;

  const tile = LAGOS_BOARD_TILES[player.position];
  const prop = room.state.properties[player.position];

  if (!tile || !prop || prop.ownerId !== null || !tile.price) return;

  if (player.cash >= tile.price) {
    player.cash -= tile.price;
    prop.ownerId = player.id;
    addSystemMessage(room, `🏢 Congratulations! ${player.name} bought ${tile.name} for ₦${tile.price.toLocaleString()}!`);
    room.state.turnPhase = 'turn_end';
  }
}

function startAuction(room: RoomData, tileId: number) {
  const tile = LAGOS_BOARD_TILES[tileId];
  const prop = room.state.properties[tileId];
  if (!tile || !prop || prop.ownerId !== null) return;

  if (room.auctionTimer) {
    clearInterval(room.auctionTimer);
    room.auctionTimer = null;
  }
  if (room.botAuctionTimers) {
    room.botAuctionTimers.forEach((t) => clearTimeout(t));
    room.botAuctionTimers = [];
  } else {
    room.botAuctionTimers = [];
  }

  const activeBidders = room.state.players.filter((p) => !p.isBankrupt).map((p) => p.id);
  const minStartingBid = Math.max(10000, Math.floor((tile.price || 50000) * 0.1));

  room.state.auction = {
    tileId,
    highestBid: 0,
    highestBidderId: null,
    highestBidderName: null,
    highestBidderColor: null,
    minNextBid: minStartingBid,
    activeBidderIds: activeBidders,
    passedBidderIds: [],
    timeLeftSeconds: 15,
    recentBids: [],
  };

  addSystemMessage(
    room,
    `🏛️ Public Auction Started for ${tile.name}! Opening bid: ₦${minStartingBid.toLocaleString()}. Landlords, place your bids!`
  );

  room.auctionTimer = setInterval(() => {
    if (!room.state.auction) {
      if (room.auctionTimer) clearInterval(room.auctionTimer);
      room.auctionTimer = null;
      return;
    }

    room.state.auction.timeLeftSeconds--;

    if (room.state.auction.timeLeftSeconds <= 0) {
      concludeAuction(room);
      return;
    }

    broadcastState(room.state.roomCode);
  }, 1000);

  scheduleBotAuctionBids(room);
}

function scheduleBotAuctionBids(room: RoomData) {
  if (!room.state.auction) return;
  const auction = room.state.auction;
  const tile = LAGOS_BOARD_TILES[auction.tileId];
  if (!tile) return;

  if (room.botAuctionTimers) {
    room.botAuctionTimers.forEach((t) => clearTimeout(t));
    room.botAuctionTimers = [];
  } else {
    room.botAuctionTimers = [];
  }

  const activeBotPlayers = room.state.players.filter(
    (p) => p.isAi && !p.isBankrupt && auction.activeBidderIds.includes(p.id) && p.id !== auction.highestBidderId
  );

  activeBotPlayers.forEach((bot, index) => {
    const difficulty = bot.aiDifficulty || 'medium';
    const basePrice = tile.price || 100000;

    let valuationMultiplier = difficulty === 'hard' ? 1.25 : difficulty === 'medium' ? 1.0 : 0.75;

    if (tile.group) {
      const groupTiles = LAGOS_BOARD_TILES.filter((t) => t.group === tile.group);
      const ownedByBot = groupTiles.filter((t) => room.state.properties[t.id]?.ownerId === bot.id).length;
      if (ownedByBot === groupTiles.length - 1) {
        valuationMultiplier += 0.5;
      } else if (ownedByBot > 0) {
        valuationMultiplier += 0.2;
      }
    }

    const maxValuation = Math.min(bot.cash - 15000, Math.floor(basePrice * valuationMultiplier));
    const delay = 1200 + index * 1000 + Math.floor(Math.random() * 1000);

    const timer = setTimeout(() => {
      if (!room.state.auction || room.state.auction.tileId !== tile.id) return;
      const currentAuction = room.state.auction;
      if (currentAuction.highestBidderId === bot.id) return;
      if (!currentAuction.activeBidderIds.includes(bot.id)) return;

      if (maxValuation >= currentAuction.minNextBid && bot.cash >= currentAuction.minNextBid) {
        handlePlaceBid(room, bot.id, currentAuction.minNextBid);
      } else {
        handlePassBid(room, bot.id);
      }
    }, delay);

    room.botAuctionTimers?.push(timer);
  });
}

function handlePlaceBid(room: RoomData, playerId: string, amount: number) {
  if (!room.state.auction) return;
  const auction = room.state.auction;
  const player = room.state.players.find((p) => p.id === playerId);
  if (!player || player.isBankrupt) return;
  if (!auction.activeBidderIds.includes(playerId)) return;
  if (player.cash < amount) return;
  if (amount < auction.minNextBid) return;

  const tile = LAGOS_BOARD_TILES[auction.tileId];

  auction.highestBid = amount;
  auction.highestBidderId = player.id;
  auction.highestBidderName = player.name;
  auction.highestBidderColor = player.color;
  auction.minNextBid = amount + 10000;
  auction.timeLeftSeconds = Math.max(auction.timeLeftSeconds, 8);

  auction.recentBids.unshift({
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    amount,
    timestamp: Date.now(),
  });
  if (auction.recentBids.length > 8) auction.recentBids.pop();

  room.state.lastActionMessage = `🔨 ${player.name} bid ₦${amount.toLocaleString()} for ${tile?.name}!`;
  addSystemMessage(room, `🔨 ${player.name} bid ₦${amount.toLocaleString()} for ${tile?.name || 'property'}!`);

  broadcastState(room.state.roomCode);
  scheduleBotAuctionBids(room);
}

function handlePassBid(room: RoomData, playerId: string) {
  if (!room.state.auction) return;
  const auction = room.state.auction;
  const player = room.state.players.find((p) => p.id === playerId);
  if (!player) return;

  if (!auction.passedBidderIds.includes(playerId)) {
    auction.passedBidderIds.push(playerId);
  }
  auction.activeBidderIds = auction.activeBidderIds.filter((id) => id !== playerId);

  addSystemMessage(room, `✋ ${player.name} passed on the auction for ${LAGOS_BOARD_TILES[auction.tileId]?.name}.`);

  if (auction.activeBidderIds.length === 1 && auction.highestBidderId === auction.activeBidderIds[0]) {
    concludeAuction(room);
    return;
  }

  if (auction.activeBidderIds.length === 0) {
    concludeAuction(room);
    return;
  }

  broadcastState(room.state.roomCode);
}

function concludeAuction(room: RoomData) {
  if (room.auctionTimer) {
    clearInterval(room.auctionTimer);
    room.auctionTimer = null;
  }
  if (room.botAuctionTimers) {
    room.botAuctionTimers.forEach((t) => clearTimeout(t));
    room.botAuctionTimers = [];
  }

  if (!room.state.auction) return;
  const auction = room.state.auction;
  const tile = LAGOS_BOARD_TILES[auction.tileId];
  const prop = room.state.properties[auction.tileId];

  if (tile && prop && auction.highestBidderId && auction.highestBid > 0) {
    const winner = room.state.players.find((p) => p.id === auction.highestBidderId);
    if (winner && !winner.isBankrupt) {
      const finalPrice = Math.min(winner.cash, auction.highestBid);
      winner.cash -= finalPrice;
      prop.ownerId = winner.id;
      addSystemMessage(
        room,
        `🎉 SOLD! ${winner.name} won the auction for ${tile.name} for ₦${finalPrice.toLocaleString()}!`
      );
      room.state.lastActionMessage = `${winner.name} acquired ${tile.name} at auction for ₦${finalPrice.toLocaleString()}!`;
    }
  } else if (tile) {
    addSystemMessage(room, `❌ Unsold! No valid bids placed for ${tile.name}. It remains with the Lagos Land Registry.`);
    room.state.lastActionMessage = `${tile.name} was not sold at auction.`;
  }

  room.state.auction = null;
  room.state.turnPhase = 'turn_end';

  broadcastState(room.state.roomCode);

  const currentTurnPlayer = room.state.players[room.state.currentTurnIndex];
  if (currentTurnPlayer?.isAi && !currentTurnPlayer.isBankrupt) {
    room.botTimer = setTimeout(() => {
      handleEndTurn(room, currentTurnPlayer.id);
      broadcastState(room.state.roomCode);
      triggerBotTurnIfNeeded(room.state.roomCode);
    }, 1200);
  }
}

function handleEndTurn(room: RoomData, playerId: string) {
  const player = room.state.players[room.state.currentTurnIndex];
  if (!player || player.id !== playerId) return;

  // If doubles rolled and not in jail, player gets another roll!
  if (room.state.doublesCount > 0 && !player.inJail && !player.isBankrupt) {
    room.state.hasRolled = false;
    room.state.turnPhase = 'waiting_roll';
    room.state.activeCard = null;
    room.state.dice = [0, 0];
    room.state.lastActionMessage = `Doubles rolled! ${player.name} gets another turn!`;
    return;
  }

  // Advance turn to next non-bankrupt player
  room.state.hasRolled = false;
  room.state.doublesCount = 0;
  room.state.turnPhase = 'waiting_roll';
  room.state.activeCard = null;
  room.state.dice = [0, 0];

  let nextIdx = (room.state.currentTurnIndex + 1) % room.state.players.length;
  let attempts = 0;
  while (room.state.players[nextIdx].isBankrupt && attempts < room.state.players.length) {
    nextIdx = (nextIdx + 1) % room.state.players.length;
    attempts++;
  }

  room.state.currentTurnIndex = nextIdx;
  room.state.turnStartedAt = Date.now();
  const nextPlayer = room.state.players[nextIdx];
  room.state.lastActionMessage = `It is now ${nextPlayer.name}'s turn.`;

  checkWinner(room);
}

// WebSocket Connection Management
wss.on('connection', (ws: WebSocket) => {
  let boundPlayerId: string | null = null;
  let boundRoomCode: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const action = JSON.parse(data.toString()) as ClientAction;

      // Auto-recover boundRoomCode and boundPlayerId from action if connection re-established
      if ((!boundRoomCode || !boundPlayerId) && action.roomCode && action.playerId) {
        const rCode = action.roomCode.trim().toUpperCase();
        const room = rooms.get(rCode);
        if (room) {
          boundRoomCode = rCode;
          boundPlayerId = action.playerId;
          room.clients.set(action.playerId, ws);
          const p = room.state.players.find((pl) => pl.id === action.playerId);
          if (p) p.connected = true;
        }
      }

      switch (action.type) {
        case 'reconnect': {
          if (!action.roomCode || !action.playerId) break;
          const roomCode = action.roomCode.trim().toUpperCase();
          const room = rooms.get(roomCode);
          if (room) {
            boundRoomCode = roomCode;
            boundPlayerId = action.playerId;
            room.clients.set(action.playerId, ws);
            const p = room.state.players.find((pl) => pl.id === action.playerId);
            if (p) p.connected = true;

            ws.send(
              JSON.stringify({
                type: 'joined',
                roomCode,
                playerId: action.playerId,
                state: room.state,
              })
            );
            broadcastState(roomCode);
          }
          break;
        }

        case 'create_room': {
          const roomCode = generateRoomCode();
          const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
          boundPlayerId = playerId;
          boundRoomCode = roomCode;

          const player: Player = {
            id: playerId,
            name: action.playerName.trim() || 'Lagosian 1',
            token: action.token || 'danfo',
            color: PLAYER_COLORS[0],
            cash: 1500000,
            position: 0,
            inJail: false,
            jailTurns: 0,
            jailCards: 0,
            isBankrupt: false,
            isAi: false,
            isHost: true,
            connected: true,
          };

          const room: RoomData = {
            state: {
              roomCode,
              status: 'lobby',
              players: [player],
              currentTurnIndex: 0,
              properties: createInitialProperties(),
              dice: [0, 0],
              hasRolled: false,
              doublesCount: 0,
              turnPhase: 'waiting_roll',
              activeCard: null,
              activeTrade: null,
              auction: null,
              chatMessages: [],
              freeParkingPool: 100000, // starting jackpot
              winner: null,
              lastActionMessage: `Room created! Welcome to Lagos Monopoly!`,
              turnStartedAt: Date.now(),
            },
            clients: new Map([[playerId, ws]]),
            chanceDeck: shuffle(CHANCE_CARDS),
            chestDeck: shuffle(COMMUNITY_CHEST_CARDS),
            botTimer: null,
          };

          rooms.set(roomCode, room);
          addSystemMessage(room, `Ek’aabo! ${player.name} created the room.`);

          ws.send(
            JSON.stringify({
              type: 'joined',
              roomCode,
              playerId,
              state: room.state,
            })
          );
          broadcastState(roomCode);
          break;
        }

        case 'join_room': {
          const roomCode = action.roomCode.trim().toUpperCase();
          const room = rooms.get(roomCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found. Check the code and try again!' }));
            return;
          }

          if (room.state.status !== 'lobby') {
            ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress in this room!' }));
            return;
          }

          if (room.state.players.length >= 6) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room is already full (max 6 players)!' }));
            return;
          }

          const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
          boundPlayerId = playerId;
          boundRoomCode = roomCode;

          const colorIdx = room.state.players.length % PLAYER_COLORS.length;
          const player: Player = {
            id: playerId,
            name: action.playerName.trim() || `Player ${room.state.players.length + 1}`,
            token: action.token || TOKENS[room.state.players.length % TOKENS.length].id,
            color: PLAYER_COLORS[colorIdx],
            cash: 1500000,
            position: 0,
            inJail: false,
            jailTurns: 0,
            jailCards: 0,
            isBankrupt: false,
            isAi: false,
            isHost: false,
            connected: true,
          };

          room.state.players.push(player);
          room.clients.set(playerId, ws);
          addSystemMessage(room, `${player.name} joined the room!`);

          ws.send(
            JSON.stringify({
              type: 'joined',
              roomCode,
              playerId,
              state: room.state,
            })
          );
          broadcastState(roomCode);
          break;
        }

        case 'add_bot': {
          if (!boundRoomCode) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'lobby' || room.state.players.length >= 6) return;

          const botNames = ['Folake (VI Tycoon)', 'Tunde (Alaba Trader)', 'Chidi (Tech Sis)', 'Amaka (Ikoyi Heiress)', 'Babatunde (Danfo Boss)'];
          const availableNames = botNames.filter((n) => !room.state.players.some((p) => p.name.includes(n.split(' ')[0])));
          const chosenName = action.name || availableNames[0] || `AI Trader ${room.state.players.length + 1}`;
          const colorIdx = room.state.players.length % PLAYER_COLORS.length;
          const botDiff = action.difficulty || 'medium';

          const botPlayer: Player = {
            id: 'bot_' + Math.random().toString(36).substring(2, 8),
            name: chosenName,
            token: action.token || TOKENS[room.state.players.length % TOKENS.length].id,
            color: PLAYER_COLORS[colorIdx],
            cash: 1500000,
            position: 0,
            inJail: false,
            jailTurns: 0,
            jailCards: 0,
            isBankrupt: false,
            isAi: true,
            aiDifficulty: botDiff,
            isHost: false,
            connected: true,
          };

          room.state.players.push(botPlayer);
          addSystemMessage(room, `🤖 Bot ${botPlayer.name} [${botDiff.toUpperCase()}] entered the lobby.`);
          broadcastState(boundRoomCode);
          break;
        }

        case 'set_bot_difficulty': {
          if (!boundRoomCode) return;
          const room = rooms.get(boundRoomCode);
          if (!room) return;

          const bot = room.state.players.find((p) => p.id === action.playerId && p.isAi);
          if (bot) {
            bot.aiDifficulty = action.difficulty;
            addSystemMessage(room, `⚙️ ${bot.name} difficulty changed to ${action.difficulty.toUpperCase()}.`);
            broadcastState(boundRoomCode);
          }
          break;
        }

        case 'quick_play_ai': {
          const roomCode = generateRoomCode();
          const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
          boundPlayerId = playerId;
          boundRoomCode = roomCode;

          const humanPlayer: Player = {
            id: playerId,
            name: action.playerName.trim() || 'Lagos Landlord',
            token: action.token || 'danfo',
            color: PLAYER_COLORS[0],
            cash: 1500000,
            position: 0,
            inJail: false,
            jailTurns: 0,
            jailCards: 0,
            isBankrupt: false,
            isAi: false,
            isHost: true,
            connected: true,
          };

          const botCount = Math.min(Math.max(action.botCount || 1, 1), 3);
          const botProfiles = [
            { name: 'Folake (VI Tycoon)', token: 'gwagon' },
            { name: 'Tunde (Alaba Trader)', token: 'keke' },
            { name: 'Chidi (Tech Sis)', token: 'ferry' },
          ];

          const players: Player[] = [humanPlayer];
          for (let i = 0; i < botCount; i++) {
            const profile = botProfiles[i] || { name: `Bot ${i + 1}`, token: 'eagle' };
            players.push({
              id: 'bot_' + Math.random().toString(36).substring(2, 8),
              name: profile.name,
              token: profile.token,
              color: PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length],
              cash: 1500000,
              position: 0,
              inJail: false,
              jailTurns: 0,
              jailCards: 0,
              isBankrupt: false,
              isAi: true,
              aiDifficulty: action.difficulty,
              isHost: false,
              connected: true,
            });
          }

          const room: RoomData = {
            state: {
              roomCode,
              status: 'playing',
              players,
              currentTurnIndex: 0,
              properties: createInitialProperties(),
              dice: [0, 0],
              hasRolled: false,
              doublesCount: 0,
              turnPhase: 'waiting_roll',
              activeCard: null,
              activeTrade: null,
              auction: null,
              chatMessages: [],
              freeParkingPool: 100000,
              winner: null,
              lastActionMessage: `Singleplayer match started against ${action.difficulty.toUpperCase()} AI! Good luck, Landlord!`,
              turnStartedAt: Date.now(),
            },
            clients: new Map([[playerId, ws]]),
            chanceDeck: shuffle(CHANCE_CARDS),
            chestDeck: shuffle(COMMUNITY_CHEST_CARDS),
            botTimer: null,
          };

          rooms.set(roomCode, room);
          addSystemMessage(room, `🎮 Singleplayer match started: ${humanPlayer.name} vs ${botCount} AI [${action.difficulty.toUpperCase()}] Landlords!`);

          ws.send(
            JSON.stringify({
              type: 'joined',
              roomCode,
              playerId,
              state: room.state,
            })
          );
          broadcastState(roomCode);
          break;
        }

        case 'remove_player': {
          if (!boundRoomCode) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'lobby') return;

          room.state.players = room.state.players.filter((p) => p.id !== action.playerId);
          room.clients.delete(action.playerId);
          broadcastState(boundRoomCode);
          break;
        }

        case 'start_game': {
          if (!boundRoomCode) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'lobby') return;

          if (room.state.players.length < 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'You need at least 2 players (add a bot or invite a friend)!' }));
            return;
          }

          room.state.status = 'playing';
          room.state.turnStartedAt = Date.now();
          addSystemMessage(room, `🚀 Game has started! Turn order set. May the best Lagos landlord win!`);
          broadcastState(boundRoomCode);
          triggerBotTurnIfNeeded(boundRoomCode);
          break;
        }

        case 'roll_dice': {
          const rCode = boundRoomCode || (action.roomCode ? action.roomCode.toUpperCase() : null);
          const pId = boundPlayerId || action.playerId;
          if (!rCode || !pId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not connected to an active room. Try refreshing.' }));
            return;
          }
          const room = rooms.get(rCode);
          if (!room || room.state.status !== 'playing') {
            ws.send(JSON.stringify({ type: 'error', message: 'Game is not currently active.' }));
            return;
          }

          boundRoomCode = rCode;
          boundPlayerId = pId;
          room.clients.set(pId, ws);

          handleRollDice(room, pId, ws);
          broadcastState(rCode);
          break;
        }

        case 'buy_property': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          handleBuyProperty(room, boundPlayerId);
          broadcastState(boundRoomCode);
          break;
        }

        case 'auction_property':
        case 'decline_property': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          if (!player) return;

          const tileId = player.position;
          const tile = LAGOS_BOARD_TILES[tileId];
          const prop = room.state.properties[tileId];
          if (tile && prop && prop.ownerId === null) {
            addSystemMessage(room, `🔨 ${player.name} put ${tile.name} up for Public Auction!`);
            startAuction(room, tileId);
            broadcastState(boundRoomCode);
          } else {
            room.state.lastActionMessage = `Property purchase passed.`;
            room.state.turnPhase = 'turn_end';
            broadcastState(boundRoomCode);
          }
          break;
        }

        case 'place_bid': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;
          handlePlaceBid(room, boundPlayerId, action.amount);
          break;
        }

        case 'pass_bid': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;
          handlePassBid(room, boundPlayerId);
          break;
        }

        case 'build_house': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          const tile = LAGOS_BOARD_TILES[action.tileId];
          const prop = room.state.properties[action.tileId];

          if (!player || !tile || !prop || prop.ownerId !== player.id || !tile.houseCost) return;
          if (prop.houses >= 5 || player.cash < tile.houseCost) return;

          // Check if player owns all properties in group
          const groupTiles = LAGOS_BOARD_TILES.filter((t) => t.group === tile.group);
          const hasMonopoly = groupTiles.every((t) => room.state.properties[t.id]?.ownerId === player.id);
          if (!hasMonopoly) {
            ws.send(JSON.stringify({ type: 'error', message: 'You must own all properties in this group before building duplexes!' }));
            return;
          }

          player.cash -= tile.houseCost;
          prop.houses++;
          const buildingType = prop.houses === 5 ? 'Luxury Mansion 🏰' : `Duplex Level ${prop.houses} 🏡`;
          addSystemMessage(room, `🏗️ ${player.name} constructed a ${buildingType} on ${tile.name}!`);
          broadcastState(boundRoomCode);
          break;
        }

        case 'sell_house': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          const tile = LAGOS_BOARD_TILES[action.tileId];
          const prop = room.state.properties[action.tileId];

          if (!player || !tile || !prop || prop.ownerId !== player.id || prop.houses <= 0 || !tile.houseCost) return;

          const refund = Math.floor(tile.houseCost / 2);
          player.cash += refund;
          prop.houses--;
          addSystemMessage(room, `🔨 ${player.name} sold a building on ${tile.name} for ₦${refund.toLocaleString()}.`);
          broadcastState(boundRoomCode);
          break;
        }

        case 'mortgage_property': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          const tile = LAGOS_BOARD_TILES[action.tileId];
          const prop = room.state.properties[action.tileId];

          if (!player || !tile || !prop || prop.ownerId !== player.id || prop.isMortgaged || prop.houses > 0 || !tile.mortgageValue) return;

          player.cash += tile.mortgageValue;
          prop.isMortgaged = true;
          addSystemMessage(room, `🏦 ${player.name} mortgaged ${tile.name} to the bank for ₦${tile.mortgageValue.toLocaleString()}.`);
          broadcastState(boundRoomCode);
          break;
        }

        case 'unmortgage_property': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          const tile = LAGOS_BOARD_TILES[action.tileId];
          const prop = room.state.properties[action.tileId];

          if (!player || !tile || !prop || prop.ownerId !== player.id || !prop.isMortgaged || !tile.mortgageValue) return;

          const cost = Math.floor(tile.mortgageValue * 1.1); // 10% interest
          if (player.cash < cost) {
            ws.send(JSON.stringify({ type: 'error', message: `Not enough cash to unmortgage (Needs ₦${cost.toLocaleString()})!` }));
            return;
          }

          player.cash -= cost;
          prop.isMortgaged = false;
          addSystemMessage(room, `🔑 ${player.name} redeemed and unmortgaged ${tile.name} for ₦${cost.toLocaleString()}.`);
          broadcastState(boundRoomCode);
          break;
        }

        case 'pay_jail_fine': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          if (!player || !player.inJail) return;

          if (player.cash < 50000) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not enough cash to pay ₦50,000 fine!' }));
            return;
          }

          player.cash -= 50000;
          room.state.freeParkingPool += 50000;
          player.inJail = false;
          player.jailTurns = 0;
          addSystemMessage(room, `🔓 ${player.name} paid ₦50,000 fine and was discharged from Kirikiri!`);
          broadcastState(boundRoomCode);
          break;
        }

        case 'use_jail_card': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          if (!player || !player.inJail || player.jailCards <= 0) return;

          player.jailCards--;
          player.inJail = false;
          player.jailTurns = 0;
          addSystemMessage(room, `📜 ${player.name} used a Get Out of Kirikiri card!`);
          broadcastState(boundRoomCode);
          break;
        }

        case 'dismiss_card': {
          if (!boundRoomCode) return;
          const room = rooms.get(boundRoomCode);
          if (!room) return;

          room.state.activeCard = null;
          room.state.turnPhase = 'turn_end';
          broadcastState(boundRoomCode);
          break;
        }

        case 'end_turn': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          handleEndTurn(room, boundPlayerId);
          broadcastState(boundRoomCode);
          triggerBotTurnIfNeeded(boundRoomCode);
          break;
        }

        // DIGITAL PROPERTY TRADING
        case 'propose_trade': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const sender = room.state.players.find((p) => p.id === boundPlayerId);
          const receiver = room.state.players.find((p) => p.id === action.toPlayerId);
          if (!sender || !receiver || receiver.isBankrupt) return;

          const trade: TradeOffer = {
            id: 'tr_' + Math.random().toString(36).substring(2, 8),
            fromPlayerId: sender.id,
            toPlayerId: receiver.id,
            offering: action.offering,
            requesting: action.requesting,
            status: 'pending',
          };

          room.state.activeTrade = trade;
          addSystemMessage(room, `🤝 Trade Proposal: ${sender.name} sent a property deal offer to ${receiver.name}!`);
          broadcastState(boundRoomCode);

          // If receiver is bot, automate smart response
          if (receiver.isAi) {
            setTimeout(() => {
              handleBotTradeDecision(boundRoomCode!, trade);
            }, 1800);
          }
          break;
        }

        case 'respond_trade': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || !room.state.activeTrade || room.state.activeTrade.id !== action.tradeId) return;

          const trade = room.state.activeTrade;
          const pFrom = room.state.players.find((p) => p.id === trade.fromPlayerId);
          const pTo = room.state.players.find((p) => p.id === trade.toPlayerId);

          if (!pFrom || !pTo) {
            room.state.activeTrade = null;
            broadcastState(boundRoomCode);
            return;
          }

          if (action.accept) {
            // Validate sender has offered assets
            if (pFrom.cash < trade.offering.cash || pTo.cash < trade.requesting.cash) {
              ws.send(JSON.stringify({ type: 'error', message: 'Insufficient funds to execute trade!' }));
              return;
            }

            // Execute Cash swap
            pFrom.cash -= trade.offering.cash;
            pTo.cash += trade.offering.cash;
            pTo.cash -= trade.requesting.cash;
            pFrom.cash += trade.requesting.cash;

            // Execute Cards swap
            pFrom.jailCards -= trade.offering.jailCards;
            pTo.jailCards += trade.offering.jailCards;
            pTo.jailCards -= trade.requesting.jailCards;
            pFrom.jailCards += trade.requesting.jailCards;

            // Execute Properties swap
            trade.offering.properties.forEach((tileId) => {
              if (room.state.properties[tileId]?.ownerId === pFrom.id) {
                room.state.properties[tileId].ownerId = pTo.id;
              }
            });
            trade.requesting.properties.forEach((tileId) => {
              if (room.state.properties[tileId]?.ownerId === pTo.id) {
                room.state.properties[tileId].ownerId = pFrom.id;
              }
            });

            trade.status = 'accepted';
            addSystemMessage(room, `🤝 Deal Sealed! ${pTo.name} accepted the trade with ${pFrom.name}!`);
          } else {
            trade.status = 'declined';
            addSystemMessage(room, `❌ Trade rejected: ${pTo.name} turned down ${pFrom.name}'s offer.`);
          }

          room.state.activeTrade = null;
          broadcastState(boundRoomCode);
          break;
        }

        case 'cancel_trade': {
          if (!boundRoomCode) return;
          const room = rooms.get(boundRoomCode);
          if (!room) return;
          room.state.activeTrade = null;
          broadcastState(boundRoomCode);
          break;
        }

        case 'declare_bankruptcy': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room || room.state.status !== 'playing') return;

          const player = room.state.players.find((p) => p.id === boundPlayerId);
          if (player) {
            player.cash = -1;
            checkBankruptcy(room, player);
            handleEndTurn(room, boundPlayerId);
            broadcastState(boundRoomCode);
            triggerBotTurnIfNeeded(boundRoomCode);
          }
          break;
        }

        case 'send_chat': {
          if (!boundRoomCode || !boundPlayerId) return;
          const room = rooms.get(boundRoomCode);
          if (!room) return;

          const sender = room.state.players.find((p) => p.id === boundPlayerId);
          if (!sender) return;

          const chat: ChatMessage = {
            id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            senderId: sender.id,
            senderName: sender.name,
            senderColor: sender.color,
            text: action.text.trim().substring(0, 200),
            timestamp: Date.now(),
          };

          room.state.chatMessages.push(chat);
          if (room.state.chatMessages.length > 80) {
            room.state.chatMessages.shift();
          }
          broadcastState(boundRoomCode);
          break;
        }
      }
    } catch (err) {
      console.error('Socket message processing error:', err);
    }
  });

  ws.on('close', () => {
    if (boundRoomCode && boundPlayerId) {
      const room = rooms.get(boundRoomCode);
      if (room) {
        room.clients.delete(boundPlayerId);
        const player = room.state.players.find((p) => p.id === boundPlayerId);
        if (player) {
          player.connected = false;
        }
        broadcastState(boundRoomCode);
      }
    }
  });
});

function handleBotTradeDecision(roomCode: string, trade: TradeOffer) {
  const room = rooms.get(roomCode);
  if (!room || !room.state.activeTrade || room.state.activeTrade.id !== trade.id) return;

  const bot = room.state.players.find((p) => p.id === trade.toPlayerId);
  const human = room.state.players.find((p) => p.id === trade.fromPlayerId);
  if (!bot || !human) return;

  const difficulty = bot.aiDifficulty || 'medium';

  // Bot evaluates value received vs value given
  let valReceived = trade.offering.cash;
  trade.offering.properties.forEach((id) => {
    valReceived += LAGOS_BOARD_TILES[id]?.price || 50000;
  });

  let valGiven = trade.requesting.cash;
  trade.requesting.properties.forEach((id) => {
    valGiven += LAGOS_BOARD_TILES[id]?.price || 50000;
  });

  // Check if requested properties would give human a monopoly
  let givesHumanMonopoly = false;
  if (difficulty === 'hard') {
    trade.requesting.properties.forEach((propId) => {
      const tile = LAGOS_BOARD_TILES[propId];
      if (tile?.group) {
        const groupTiles = LAGOS_BOARD_TILES.filter((t) => t.group === tile.group);
        const humanOwned = groupTiles.filter(
          (t) => room.state.properties[t.id]?.ownerId === human.id || trade.requesting.properties.includes(t.id)
        );
        if (humanOwned.length === groupTiles.length) {
          givesHumanMonopoly = true;
        }
      }
    });
  }

  let accept = false;
  if (difficulty === 'easy') {
    // Easy: lenient (accepts if 75% or better)
    accept = valReceived >= valGiven * 0.75 && bot.cash >= trade.requesting.cash;
  } else if (difficulty === 'medium') {
    // Medium: fair market value
    accept = valReceived >= valGiven && bot.cash >= trade.requesting.cash;
  } else {
    // Hard: strict; rejects handing monopolies unless paid massive 1.7x premium
    const multiplier = givesHumanMonopoly ? 1.7 : 1.15;
    accept = valReceived >= valGiven * multiplier && bot.cash >= trade.requesting.cash;
  }

  if (accept) {
    bot.cash += trade.offering.cash - trade.requesting.cash;
    human.cash += trade.requesting.cash - trade.offering.cash;

    trade.offering.properties.forEach((tileId) => {
      if (room.state.properties[tileId]?.ownerId === human.id) {
        room.state.properties[tileId].ownerId = bot.id;
      }
    });
    trade.requesting.properties.forEach((tileId) => {
      if (room.state.properties[tileId]?.ownerId === bot.id) {
        room.state.properties[tileId].ownerId = human.id;
      }
    });

    addSystemMessage(room, `🤝 Deal! [${difficulty.toUpperCase()}] ${bot.name} accepted ${human.name}'s proposal.`);
  } else {
    const refusalReason = givesHumanMonopoly
      ? `Otilo! You wan get monopoly for cheap? Never!`
      : `Oga, this deal no balance at all!`;
    addSystemMessage(room, `✋ [${difficulty.toUpperCase()}] ${bot.name} declined trade. "${refusalReason}"`);
  }

  room.state.activeTrade = null;
  broadcastState(roomCode);
}

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Lagos Monopoly server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
