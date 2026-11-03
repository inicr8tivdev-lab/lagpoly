export type PropertyGroup = 
  | 'brown' 
  | 'light_blue' 
  | 'pink' 
  | 'orange' 
  | 'red' 
  | 'yellow' 
  | 'green' 
  | 'dark_blue' 
  | 'station' 
  | 'utility';

export type TileType = 
  | 'property' 
  | 'station' 
  | 'utility' 
  | 'go' 
  | 'jail' 
  | 'go_to_jail' 
  | 'parking' 
  | 'chance' 
  | 'community_chest' 
  | 'tax';

export interface BoardTile {
  id: number; // 0 to 39
  name: string;
  subtitle?: string;
  type: TileType;
  group?: PropertyGroup;
  price?: number;
  rentTiers?: [number, number, number, number, number, number]; // [Base, 1 House, 2 Houses, 3 Houses, 4 Houses, Hotel/Mansion]
  houseCost?: number;
  mortgageValue?: number;
  taxAmount?: number;
  icon?: string;
}

export type AiDifficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: string;
  name: string;
  token: string; // e.g. 'danfo', 'gwagon', 'keke', 'ferry', 'eagle', 'crown'
  color: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  jailCards: number;
  isBankrupt: boolean;
  isAi: boolean;
  aiDifficulty?: AiDifficulty;
  isHost: boolean;
  connected: boolean;
}

export interface PropertyState {
  ownerId: string | null;
  houses: number; // 0-4 = duplexes, 5 = Luxury Highrise/Mansion
  isMortgaged: boolean;
}

export interface Card {
  id: string;
  type: 'chance' | 'community_chest';
  title: string;
  description: string;
  action: 'collect' | 'pay' | 'move_to' | 'jail' | 'out_of_jail' | 'repairs';
  amount?: number;
  targetPosition?: number;
  houseCost?: number;
  hotelCost?: number;
}

export interface TradeItem {
  cash: number;
  properties: number[]; // tile IDs
  jailCards: number;
}

export interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offering: TradeItem;
  requesting: TradeItem;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface AuctionBid {
  playerId: string;
  playerName: string;
  playerColor?: string;
  amount: number;
  timestamp: number;
}

export interface AuctionState {
  tileId: number;
  highestBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  highestBidderColor: string | null;
  minNextBid: number;
  activeBidderIds: string[];
  passedBidderIds: string[];
  timeLeftSeconds: number;
  recentBids: AuctionBid[];
}

export interface GameState {
  roomCode: string;
  status: 'lobby' | 'playing' | 'game_over';
  players: Player[];
  currentTurnIndex: number;
  properties: Record<number, PropertyState>;
  dice: [number, number];
  hasRolled: boolean;
  doublesCount: number;
  turnPhase: 'waiting_roll' | 'tile_action' | 'turn_end';
  activeCard: Card | null;
  activeTrade: TradeOffer | null;
  auction: AuctionState | null;
  chatMessages: ChatMessage[];
  freeParkingPool: number;
  winner: Player | null;
  lastActionMessage: string;
  turnStartedAt: number;
}

export type ClientAction =
  | { type: 'reconnect'; roomCode: string; playerId: string }
  | { type: 'join_room'; roomCode: string; playerName: string; token: string; playerId?: string }
  | { type: 'create_room'; playerName: string; token: string; playerId?: string; roomCode?: string }
  | { type: 'add_bot'; name?: string; token?: string; difficulty?: AiDifficulty; playerId?: string; roomCode?: string }
  | { type: 'set_bot_difficulty'; playerId: string; difficulty: AiDifficulty; roomCode?: string }
  | { type: 'quick_play_ai'; playerName: string; token: string; difficulty: AiDifficulty; botCount: number; playerId?: string; roomCode?: string }
  | { type: 'remove_player'; playerId: string; roomCode?: string }
  | { type: 'start_game'; playerId?: string; roomCode?: string }
  | { type: 'roll_dice'; playerId?: string; roomCode?: string }
  | { type: 'buy_property'; playerId?: string; roomCode?: string }
  | { type: 'decline_property'; playerId?: string; roomCode?: string }
  | { type: 'auction_property'; playerId?: string; roomCode?: string }
  | { type: 'place_bid'; amount: number; playerId?: string; roomCode?: string }
  | { type: 'pass_bid'; playerId?: string; roomCode?: string }
  | { type: 'build_house'; tileId: number; playerId?: string; roomCode?: string }
  | { type: 'sell_house'; tileId: number; playerId?: string; roomCode?: string }
  | { type: 'mortgage_property'; tileId: number; playerId?: string; roomCode?: string }
  | { type: 'unmortgage_property'; tileId: number; playerId?: string; roomCode?: string }
  | { type: 'pay_jail_fine'; playerId?: string; roomCode?: string }
  | { type: 'use_jail_card'; playerId?: string; roomCode?: string }
  | { type: 'dismiss_card'; playerId?: string; roomCode?: string }
  | { type: 'end_turn'; playerId?: string; roomCode?: string }
  | { type: 'propose_trade'; toPlayerId: string; offering: TradeItem; requesting: TradeItem; playerId?: string; roomCode?: string }
  | { type: 'respond_trade'; tradeId: string; accept: boolean; playerId?: string; roomCode?: string }
  | { type: 'cancel_trade'; playerId?: string; roomCode?: string }
  | { type: 'declare_bankruptcy'; playerId?: string; roomCode?: string }
  | { type: 'send_chat'; text: string; playerId?: string; roomCode?: string };
