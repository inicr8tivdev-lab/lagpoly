import {
  GameState,
  Player,
  ClientAction,
  Card,
  TradeOffer,
  ChatMessage,
  PropertyState,
  AiDifficulty,
} from '../types/game';
import {
  LAGOS_BOARD_TILES,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  TOKENS,
  PLAYER_COLORS,
} from '../data/lagosBoard';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialProperties(): Record<number, PropertyState> {
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

export interface LocalGameOptions {
  players: {
    name: string;
    token: string;
    isAi: boolean;
    aiDifficulty?: AiDifficulty;
  }[];
  roomCode?: string;
}

export interface EngineInstance {
  state: GameState;
  chanceDeck: Card[];
  chestDeck: Card[];
}

export function createLocalGame(options: LocalGameOptions): EngineInstance {
  const players: Player[] = options.players.map((p, idx) => ({
    id: p.isAi ? `bot_${idx}_${Math.random().toString(36).substring(2, 7)}` : `player_${idx}`,
    name: p.name.trim() || (p.isAi ? `Bot ${idx}` : `Landlord ${idx + 1}`),
    token: p.token || TOKENS[idx % TOKENS.length].id,
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    cash: 1500000,
    position: 0,
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    isBankrupt: false,
    isAi: p.isAi,
    aiDifficulty: p.aiDifficulty || 'medium',
    isHost: idx === 0,
    connected: true,
  }));

  const initialMsg: ChatMessage = {
    id: 'sys_' + Date.now(),
    senderId: 'system',
    senderName: 'Lagos Announcer 🎙️',
    text: `🇳🇬 Welcome to Eko Monopoly! ${players.length} Landlords are competing for the Lagos property throne. Roll the dice to begin!`,
    timestamp: Date.now(),
    isSystem: true,
  };

  const state: GameState = {
    roomCode: options.roomCode || 'OFFLINE',
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
    chatMessages: [initialMsg],
    freeParkingPool: 100000,
    winner: null,
    lastActionMessage: `Game on! It is ${players[0]?.name || 'Player 1'}'s turn to roll.`,
    turnStartedAt: Date.now(),
  };

  return {
    state,
    chanceDeck: shuffle(CHANCE_CARDS),
    chestDeck: shuffle(COMMUNITY_CHEST_CARDS),
  };
}

export function addSystemMessage(state: GameState, text: string) {
  const msg: ChatMessage = {
    id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    senderId: 'system',
    senderName: 'Lagos Announcer 🎙️',
    text,
    timestamp: Date.now(),
    isSystem: true,
  };
  state.chatMessages.push(msg);
  if (state.chatMessages.length > 80) {
    state.chatMessages.shift();
  }
}

export function checkWinner(state: GameState) {
  const activePlayers = state.players.filter((p) => !p.isBankrupt);
  if (activePlayers.length === 1 && state.status === 'playing') {
    state.status = 'game_over';
    state.winner = activePlayers[0];
    addSystemMessage(
      state,
      `🎉 Otilo! ${activePlayers[0].name} has conquered the Lagos Real Estate Market and won the game! 👑`
    );
  }
}

export function calculateRent(
  state: GameState,
  tile: (typeof LAGOS_BOARD_TILES)[0],
  propState: PropertyState
): number {
  if (tile.type === 'station') {
    const stationCount = LAGOS_BOARD_TILES.filter(
      (t) => t.type === 'station' && state.properties[t.id]?.ownerId === propState.ownerId
    ).length;
    const tiers = [25000, 50000, 100000, 200000];
    return tiers[Math.min(stationCount - 1, 3)] || 25000;
  }

  if (tile.type === 'utility') {
    const utilityCount = LAGOS_BOARD_TILES.filter(
      (t) => t.type === 'utility' && state.properties[t.id]?.ownerId === propState.ownerId
    ).length;
    const diceTotal = (state.dice[0] || 3) + (state.dice[1] || 4);
    const multiplier = utilityCount === 2 ? 10000 : 4000;
    return diceTotal * multiplier;
  }

  if (tile.type === 'property' && tile.rentTiers) {
    if (propState.houses > 0) {
      return tile.rentTiers[propState.houses] || tile.rentTiers[0];
    }
    const groupTiles = LAGOS_BOARD_TILES.filter((t) => t.group === tile.group);
    const hasMonopoly = groupTiles.every(
      (t) => state.properties[t.id]?.ownerId === propState.ownerId
    );
    return hasMonopoly ? tile.rentTiers[0] * 2 : tile.rentTiers[0];
  }

  return 10000;
}

export function checkBankruptcy(state: GameState, player: Player, creditor?: Player) {
  if (player.cash >= 0) return;

  let liquidationValue = player.cash;
  Object.entries(state.properties).forEach(([id, p]) => {
    if (p.ownerId === player.id) {
      const tile = LAGOS_BOARD_TILES[Number(id)];
      if (tile?.mortgageValue && !p.isMortgaged) {
        liquidationValue += tile.mortgageValue;
      }
    }
  });

  if (liquidationValue < 0) {
    player.isBankrupt = true;
    addSystemMessage(state, `💥 Sapa strikes! ${player.name} is bankrupt and eliminated from the game!`);

    Object.entries(state.properties).forEach(([id, p]) => {
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

    checkWinner(state);
  }
}

export function applyCardEffect(
  engine: EngineInstance,
  player: Player,
  card: Card
) {
  const { state } = engine;
  addSystemMessage(
    state,
    `🎴 [${card.type === 'chance' ? 'Chance' : 'Lagos Hustle'}] ${player.name}: ${card.title} - ${card.description}`
  );

  switch (card.action) {
    case 'collect':
      if (card.amount) {
        player.cash += card.amount;
      }
      break;

    case 'pay':
      if (card.amount) {
        player.cash -= card.amount;
        state.freeParkingPool += card.amount;
        checkBankruptcy(state, player);
      }
      break;

    case 'jail':
      player.inJail = true;
      player.position = 10;
      state.doublesCount = 0;
      state.turnPhase = 'turn_end';
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
          addSystemMessage(state, `💰 ${player.name} passed START and collected ₦200,000!`);
        }
        handleTileLanding(engine, player, card.targetPosition);
      }
      break;

    case 'repairs': {
      let totalHouses = 0;
      let totalHotels = 0;
      Object.entries(state.properties).forEach(([_, p]) => {
        if (p.ownerId === player.id) {
          if (p.houses >= 5) totalHotels++;
          else totalHouses += p.houses;
        }
      });
      const cost =
        totalHouses * (card.houseCost || 25000) + totalHotels * (card.hotelCost || 100000);
      player.cash -= cost;
      state.freeParkingPool += cost;
      addSystemMessage(
        state,
        `🛠️ Generator & Flood Repairs cost ${player.name} ₦${cost.toLocaleString()} for ${totalHouses} duplexes and ${totalHotels} luxury mansions.`
      );
      checkBankruptcy(state, player);
      break;
    }
  }
}

export function handleTileLanding(engine: EngineInstance, player: Player, tileId: number) {
  const { state } = engine;
  const tile = LAGOS_BOARD_TILES[tileId];
  if (!tile) return;

  state.turnPhase = 'tile_action';

  switch (tile.type) {
    case 'go':
      state.lastActionMessage = `${player.name} landed on START!`;
      state.turnPhase = 'turn_end';
      break;

    case 'go_to_jail':
      player.inJail = true;
      player.position = 10;
      state.doublesCount = 0;
      state.turnPhase = 'turn_end';
      addSystemMessage(state, `🚨 ${player.name} ran into LASTMA and Alagbon Police! Sent directly to Kirikiri!`);
      break;

    case 'jail':
      state.lastActionMessage = `${player.name} is just visiting Kirikiri.`;
      state.turnPhase = 'turn_end';
      break;

    case 'parking': {
      const jackpot = state.freeParkingPool;
      if (jackpot > 0) {
        player.cash += jackpot;
        state.freeParkingPool = 0;
        addSystemMessage(
          state,
          `🎰 Jackpot! ${player.name} landed on Tafawa Balewa Square and won ₦${jackpot.toLocaleString()}!`
        );
      } else {
        state.lastActionMessage = `${player.name} is chilling at Tafawa Balewa Square (Free Parking).`;
      }
      state.turnPhase = 'turn_end';
      break;
    }

    case 'tax': {
      const amount = tile.taxAmount || 100000;
      player.cash -= amount;
      state.freeParkingPool += amount;
      addSystemMessage(state, `🏛️ ${player.name} paid ₦${amount.toLocaleString()} for ${tile.name}. Added to TBS jackpot!`);
      state.turnPhase = 'turn_end';
      checkBankruptcy(state, player);
      break;
    }

    case 'chance': {
      if (engine.chanceDeck.length === 0) {
        engine.chanceDeck = shuffle(CHANCE_CARDS);
      }
      const card = engine.chanceDeck.shift()!;
      state.activeCard = card;
      applyCardEffect(engine, player, card);
      break;
    }

    case 'community_chest': {
      if (engine.chestDeck.length === 0) {
        engine.chestDeck = shuffle(COMMUNITY_CHEST_CARDS);
      }
      const card = engine.chestDeck.shift()!;
      state.activeCard = card;
      applyCardEffect(engine, player, card);
      break;
    }

    case 'property':
    case 'station':
    case 'utility': {
      const propState = state.properties[tileId];
      if (!propState) {
        state.turnPhase = 'turn_end';
        return;
      }

      if (propState.ownerId === null) {
        const cost = tile.price || 0;
        if (player.cash < cost) {
          addSystemMessage(
            state,
            `⚠️ ${player.name} landed on ${tile.name} (₦${cost.toLocaleString()}) but has insufficient cash (₦${player.cash.toLocaleString()}). Starting automatic Public Auction!`
          );
          state.lastActionMessage = `Insufficient cash (₦${player.cash.toLocaleString()})! Automatic Auction for ${tile.name}!`;
          startLocalAuction(state, tileId);
        } else {
          state.lastActionMessage = `${player.name} landed on ${tile.name}. Buy for ₦${cost.toLocaleString()} or put it up for Auction!`;
          state.turnPhase = 'tile_action';
        }
      } else if (propState.ownerId === player.id) {
        state.lastActionMessage = `${player.name} landed on their own property (${tile.name}).`;
        state.turnPhase = 'turn_end';
      } else {
        const owner = state.players.find((p) => p.id === propState.ownerId);
        if (owner && !owner.isBankrupt && !propState.isMortgaged) {
          const rent = calculateRent(state, tile, propState);
          player.cash -= rent;
          owner.cash += rent;
          addSystemMessage(
            state,
            `💸 ${player.name} paid ₦${rent.toLocaleString()} rent to ${owner.name} for landing on ${tile.name}.`
          );
          checkBankruptcy(state, player, owner);
        } else if (propState.isMortgaged) {
          state.lastActionMessage = `${tile.name} is currently mortgaged. No rent owed.`;
        }
        state.turnPhase = 'turn_end';
      }
      break;
    }
  }
}

export function movePlayer(engine: EngineInstance, player: Player, steps: number) {
  const oldPos = player.position;
  const newPos = (oldPos + steps) % 40;

  if (newPos < oldPos && steps > 0) {
    player.cash += 200000;
    addSystemMessage(engine.state, `💰 ${player.name} passed START and collected ₦200,000 salary!`);
  }

  player.position = newPos;
  handleTileLanding(engine, player, newPos);
}

export function rollDiceForPlayer(engine: EngineInstance, playerId: string) {
  const { state } = engine;
  const player = state.players[state.currentTurnIndex];
  if (!player || player.id !== playerId) return;
  if (state.hasRolled) return;

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  state.dice = [d1, d2];
  const isDoubles = d1 === d2;

  addSystemMessage(state, `🎲 ${player.name} rolled [${d1}, ${d2}] (Total: ${d1 + d2})!`);

  if (player.inJail) {
    if (isDoubles) {
      player.inJail = false;
      player.jailTurns = 0;
      addSystemMessage(state, `🔓 ${player.name} rolled doubles [${d1}, ${d2}] and is released from Kirikiri!`);
      movePlayer(engine, player, d1 + d2);
      state.hasRolled = true;
    } else {
      player.jailTurns++;
      if (player.jailTurns >= 3) {
        const fine = 50000;
        player.cash -= fine;
        state.freeParkingPool += fine;
        player.inJail = false;
        player.jailTurns = 0;
        addSystemMessage(state, `🔒 ${player.name} spent 3 turns in Kirikiri. Paid ₦50,000 fine and was released!`);
        movePlayer(engine, player, d1 + d2);
      } else {
        addSystemMessage(state, `🔒 ${player.name} rolled [${d1}, ${d2}]. Still in Kirikiri (Turn ${player.jailTurns}/3).`);
      }
      state.hasRolled = true;
      state.turnPhase = 'turn_end';
    }
    return;
  }

  if (isDoubles) {
    state.doublesCount++;
    if (state.doublesCount >= 3) {
      player.inJail = true;
      player.position = 10;
      state.doublesCount = 0;
      state.hasRolled = true;
      state.turnPhase = 'turn_end';
      addSystemMessage(state, `🚨 3 consecutive doubles! LASTMA intercepted ${player.name} for reckless driving. Go to Kirikiri!`);
      return;
    }
  } else {
    state.doublesCount = 0;
  }

  state.hasRolled = true;
  movePlayer(engine, player, d1 + d2);
}

export function startLocalAuction(state: GameState, tileId: number) {
  const tile = LAGOS_BOARD_TILES[tileId];
  const prop = state.properties[tileId];
  if (!tile || !prop || prop.ownerId !== null) return;

  const activeBidders = state.players.filter((p) => !p.isBankrupt).map((p) => p.id);
  const minStartingBid = Math.max(10000, Math.floor((tile.price || 50000) * 0.1));

  state.auction = {
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
    state,
    `🏛️ Public Auction Started for ${tile.name}! Opening bid: ₦${minStartingBid.toLocaleString()}. Landlords, place your bids!`
  );
}

export function placeLocalBid(state: GameState, playerId: string, amount: number) {
  if (!state.auction) return;
  const auction = state.auction;
  const player = state.players.find((p) => p.id === playerId);
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

  state.lastActionMessage = `🔨 ${player.name} bid ₦${amount.toLocaleString()} for ${tile?.name}!`;
  addSystemMessage(state, `🔨 ${player.name} bid ₦${amount.toLocaleString()} for ${tile?.name || 'property'}!`);
}

export function passLocalBid(state: GameState, playerId: string) {
  if (!state.auction) return;
  const auction = state.auction;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;

  if (!auction.passedBidderIds.includes(playerId)) {
    auction.passedBidderIds.push(playerId);
  }
  auction.activeBidderIds = auction.activeBidderIds.filter((id) => id !== playerId);

  addSystemMessage(state, `✋ ${player.name} passed on the auction for ${LAGOS_BOARD_TILES[auction.tileId]?.name}.`);

  if (
    (auction.activeBidderIds.length === 1 && auction.highestBidderId === auction.activeBidderIds[0]) ||
    auction.activeBidderIds.length === 0
  ) {
    concludeLocalAuction(state);
  }
}

export function concludeLocalAuction(state: GameState) {
  if (!state.auction) return;
  const auction = state.auction;
  const tile = LAGOS_BOARD_TILES[auction.tileId];
  const prop = state.properties[auction.tileId];

  if (tile && prop && auction.highestBidderId && auction.highestBid > 0) {
    const winner = state.players.find((p) => p.id === auction.highestBidderId);
    if (winner && !winner.isBankrupt) {
      const finalPrice = Math.min(winner.cash, auction.highestBid);
      winner.cash -= finalPrice;
      prop.ownerId = winner.id;
      addSystemMessage(
        state,
        `🎉 SOLD! ${winner.name} won the auction for ${tile.name} for ₦${finalPrice.toLocaleString()}!`
      );
      state.lastActionMessage = `${winner.name} acquired ${tile.name} at auction for ₦${finalPrice.toLocaleString()}!`;
    }
  } else if (tile) {
    addSystemMessage(state, `❌ Unsold! No valid bids placed for ${tile.name}. It remains with the Lagos Land Registry.`);
    state.lastActionMessage = `${tile.name} was not sold at auction.`;
  }

  state.auction = null;
  state.turnPhase = 'turn_end';
}

export function endTurnForPlayer(state: GameState, playerId: string) {
  const player = state.players[state.currentTurnIndex];
  if (!player || player.id !== playerId) return;

  if (state.doublesCount > 0 && !player.inJail && !player.isBankrupt) {
    state.hasRolled = false;
    state.turnPhase = 'waiting_roll';
    state.activeCard = null;
    state.dice = [0, 0];
    state.lastActionMessage = `Doubles rolled! ${player.name} gets another turn!`;
    return;
  }

  state.hasRolled = false;
  state.doublesCount = 0;
  state.turnPhase = 'waiting_roll';
  state.activeCard = null;
  state.dice = [0, 0];

  let nextIdx = (state.currentTurnIndex + 1) % state.players.length;
  let attempts = 0;
  while (state.players[nextIdx].isBankrupt && attempts < state.players.length) {
    nextIdx = (nextIdx + 1) % state.players.length;
    attempts++;
  }

  state.currentTurnIndex = nextIdx;
  state.turnStartedAt = Date.now();
  const nextPlayer = state.players[nextIdx];
  state.lastActionMessage = `It is now ${nextPlayer.name}'s turn.`;

  checkWinner(state);
}

export function executeLocalBotTradeProposal(state: GameState, bot: Player) {
  const colorGroups = ['brown', 'light_blue', 'pink', 'orange', 'red', 'yellow', 'green', 'dark_blue'] as const;
  for (const grp of colorGroups) {
    const tilesInGrp = LAGOS_BOARD_TILES.filter((t) => t.group === grp);
    const ownedByBot = tilesInGrp.filter((t) => state.properties[t.id]?.ownerId === bot.id);

    if (ownedByBot.length === tilesInGrp.length - 1) {
      const missingTile = tilesInGrp.find((t) => state.properties[t.id]?.ownerId !== bot.id);
      if (!missingTile) continue;

      const currentOwnerId = state.properties[missingTile.id]?.ownerId;
      if (!currentOwnerId || currentOwnerId === bot.id) continue;

      const owner = state.players.find((p) => p.id === currentOwnerId && !p.isBankrupt && !p.isAi);
      if (!owner) continue;

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

      state.activeTrade = trade;
      addSystemMessage(
        state,
        `🤝 [HARD] ${bot.name} proposed an aggressive ₦${cashOffer.toLocaleString()} buyout for ${missingTile.name} to ${owner.name}!`
      );
      break;
    }
  }
}
