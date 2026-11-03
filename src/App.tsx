import { useState, useEffect, useRef } from 'react';
import { useGame } from './hooks/useGame';
import { BoardTile } from './types/game';
import { Header } from './components/Header';
import { Board } from './components/Board/Board';
import { MyPropertiesPanel } from './components/Properties/MyPropertiesPanel';
import { AuctionModal } from './components/Modals/AuctionModal';
import { Lobby } from './components/Lobby/Lobby';
import { DeedCardModal } from './components/Board/DeedCardModal';
import { TradeModal } from './components/Modals/TradeModal';
import { ManagePropertiesModal } from './components/Modals/ManagePropertiesModal';
import { WinnerModal } from './components/Modals/WinnerModal';
import { PopAnnouncement } from './components/Board/PopAnnouncementCard';
import { AlertCircle, X, Gamepad2 } from 'lucide-react';

export default function App() {
  const {
    gameState,
    myPlayerId,
    isOffline,
    isConnected,
    hasSavedGame,
    errorMessage,
    sendAction,
    startOfflineGame,
    quickPlayOffline,
    resetGame,
    clearError,
  } = useGame();

  const [compactCurrency, setCompactCurrency] = useState<boolean>(() => {
    return localStorage.getItem('eko_compact_currency') === 'true';
  });

  const [selectedTile, setSelectedTile] = useState<BoardTile | null>(null);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [popAnnouncement, setPopAnnouncement] = useState<PopAnnouncement | null>(null);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const lastSeenMsgIdRef = useRef<string | null>(null);

  const toggleCurrency = () => {
    setCompactCurrency((prev) => {
      const next = !prev;
      localStorage.setItem('eko_compact_currency', String(next));
      return next;
    });
  };

  const currentTurnPlayer = gameState ? gameState.players[gameState.currentTurnIndex] : undefined;
  const myPlayer = gameState?.players.find((p) => p.id === myPlayerId);
  const isMyTurn = Boolean(gameState && myPlayer && currentTurnPlayer?.id === myPlayer.id);
  const canRoll = Boolean(isMyTurn && !gameState?.hasRolled && !currentTurnPlayer?.isAi);

  const systemAnnouncements = (gameState?.chatMessages || []).filter(
    (m) => m.isSystem || m.senderId === 'system'
  );

  // Catch new system announcements and pop them as playing card information for 10s
  useEffect(() => {
    if (!gameState) return;
    const sysMsgs = gameState.chatMessages.filter((m) => m.isSystem || m.senderId === 'system');
    if (sysMsgs.length === 0) return;
    const latest = sysMsgs[sysMsgs.length - 1];
    if (latest && latest.id !== lastSeenMsgIdRef.current) {
      lastSeenMsgIdRef.current = latest.id;
      setPopAnnouncement({
        id: latest.id,
        text: latest.text,
        timestamp: latest.timestamp,
      });
    }
  }, [gameState?.chatMessages]);

  // If in lobby or not joined room yet (no login or signup needed!)
  if (!gameState || gameState.status === 'lobby') {
    return (
      <>
        {errorMessage && (
          <div className="fixed top-4 right-4 z-50 p-3 rounded-xl bg-rose-950 border border-rose-700 text-rose-200 text-xs flex items-center gap-2 shadow-xl animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
            <button onClick={clearError} className="p-1 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <Lobby
          gameState={gameState}
          myPlayerId={myPlayerId}
          hasSavedGame={hasSavedGame}
          onResumeSavedGame={() => {
            // State is already in localStorage and loaded, or resumes directly
          }}
          onResetGame={resetGame}
          onQuickPlayAi={(name, token, difficulty, botCount) =>
            quickPlayOffline(name, token, difficulty, botCount)
          }
          onStartPassAndPlay={(players) => {
            startOfflineGame(players, 'PASS_AND_PLAY');
          }}
          onCreateRoom={(name, token) =>
            quickPlayOffline(name, token, 'medium', 2)
          }
          onJoinRoom={(_code, name, token) =>
            quickPlayOffline(name, token, 'medium', 2)
          }
          onAddBot={(diff) => sendAction({ type: 'add_bot', difficulty: diff })}
          onSetBotDifficulty={(playerId, difficulty) =>
            sendAction({ type: 'set_bot_difficulty', playerId, difficulty })
          }
          onRemovePlayer={(playerId) => sendAction({ type: 'remove_player', playerId })}
          onStartGame={() => sendAction({ type: 'start_game' })}
        />
      </>
    );
  }

  // Active Game Play View
  const selectedPropState = selectedTile ? gameState.properties[selectedTile.id] : undefined;
  const selectedTileOwner = selectedPropState?.ownerId
    ? gameState.players.find((p) => p.id === selectedPropState.ownerId)
    : undefined;

  // Check if multiple humans are in match (Pass & Play)
  const humanCount = gameState.players.filter((p) => !p.isAi).length;
  const isPassAndPlay = humanCount > 1;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Toast Error Banner */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 p-3 rounded-xl bg-rose-950 border border-rose-700 text-rose-200 text-xs flex items-center gap-2 shadow-xl animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
          <button onClick={clearError} className="p-1 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header with Bell icon and Announcements history */}
      <Header
        gameState={gameState}
        myPlayerId={myPlayerId}
        compactCurrency={compactCurrency}
        onToggleCurrency={toggleCurrency}
        announcements={systemAnnouncements}
        isAnnouncementsOpen={isAnnouncementsOpen}
        onOpenAnnouncements={() => setIsAnnouncementsOpen(true)}
        onCloseAnnouncements={() => setIsAnnouncementsOpen(false)}
        isOffline={isOffline}
        onResetGame={resetGame}
      />

      {/* Pass & Play device handover indicator banner */}
      {isPassAndPlay && currentTurnPlayer && !currentTurnPlayer.isAi && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 py-1.5 px-4 text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
          <Gamepad2 className="w-4 h-4 text-emerald-400" />
          <span>
            Pass & Play: It is <strong className="text-white underline">{currentTurnPlayer.name}</strong>'s turn! Pass the device.
          </span>
        </div>
      )}

      {/* Main Game Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left / Center Area: Board + Action Panel */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <Board
            gameState={gameState}
            myPlayer={myPlayer}
            isMyTurn={isMyTurn}
            canRoll={canRoll}
            onRollDice={() => sendAction({ type: 'roll_dice' })}
            onBuyProperty={() => sendAction({ type: 'buy_property' })}
            onDeclineProperty={() => sendAction({ type: 'decline_property' })}
            onEndTurn={() => sendAction({ type: 'end_turn' })}
            onPayJailFine={() => sendAction({ type: 'pay_jail_fine' })}
            onUseJailCard={() => sendAction({ type: 'use_jail_card' })}
            onOpenTrade={() => setIsTradeOpen(true)}
            onOpenManage={() => setIsManageOpen(true)}
            onDeclareBankruptcy={() => {
              if (window.confirm('Are you sure you want to declare bankruptcy? Your properties will be surrendered!')) {
                sendAction({ type: 'declare_bankruptcy' });
              }
            }}
            onSelectTile={(tile) => setSelectedTile(tile)}
            compactCurrency={compactCurrency}
            popAnnouncement={popAnnouncement}
            onDismissAnnouncement={() => {
              setPopAnnouncement(null);
              if (gameState.activeCard) {
                sendAction({ type: 'dismiss_card' });
              }
            }}
            onOpenFullAnnouncements={() => setIsAnnouncementsOpen(true)}
          />
        </div>

        {/* Right Area: Only My Property */}
        <div className="lg:col-span-4 h-full flex flex-col sticky top-20">
          <MyPropertiesPanel
            gameState={gameState}
            myPlayer={myPlayer}
            compactCurrency={compactCurrency}
            onSelectTile={(tile) => setSelectedTile(tile)}
            onBuildHouse={(tileId) => sendAction({ type: 'build_house', tileId })}
            onSellHouse={(tileId) => sendAction({ type: 'sell_house', tileId })}
            onMortgage={(tileId) => sendAction({ type: 'mortgage_property', tileId })}
            onUnmortgage={(tileId) => sendAction({ type: 'unmortgage_property', tileId })}
          />
        </div>
      </main>

      {/* Deed Card Inspection Modal */}
      <DeedCardModal
        tile={selectedTile}
        propState={selectedPropState}
        owner={selectedTileOwner}
        onClose={() => setSelectedTile(null)}
        compactCurrency={compactCurrency}
      />

      {/* Digital Property Trading Modal */}
      <TradeModal
        isOpen={isTradeOpen || Boolean(gameState.activeTrade)}
        onClose={() => setIsTradeOpen(false)}
        gameState={gameState}
        myPlayer={myPlayer}
        onProposeTrade={(toPlayerId, offering, requesting) => {
          sendAction({ type: 'propose_trade', toPlayerId, offering, requesting });
          setIsTradeOpen(false);
        }}
        onRespondTrade={(tradeId, accept) =>
          sendAction({ type: 'respond_trade', tradeId, accept })
        }
        onCancelTrade={() => sendAction({ type: 'cancel_trade' })}
        compactCurrency={compactCurrency}
      />

      {/* Manage Properties & Construction Modal */}
      <ManagePropertiesModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        gameState={gameState}
        myPlayer={myPlayer}
        onBuildHouse={(tileId) => sendAction({ type: 'build_house', tileId })}
        onSellHouse={(tileId) => sendAction({ type: 'sell_house', tileId })}
        onMortgage={(tileId) => sendAction({ type: 'mortgage_property', tileId })}
        onUnmortgage={(tileId) => sendAction({ type: 'unmortgage_property', tileId })}
        compactCurrency={compactCurrency}
      />

      {/* Live Lagos Public Land Auction Modal */}
      <AuctionModal
        gameState={gameState}
        myPlayer={myPlayer}
        compactCurrency={compactCurrency}
        onPlaceBid={(amount) => sendAction({ type: 'place_bid', amount })}
        onPassBid={() => sendAction({ type: 'pass_bid' })}
        onSelectTile={(tile) => setSelectedTile(tile)}
      />

      {/* Winner / Victory Modal */}
      <WinnerModal
        winner={gameState.winner}
        gameState={gameState}
        onPlayAgain={resetGame}
        compactCurrency={compactCurrency}
      />
    </div>
  );
}
