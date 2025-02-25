import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, BoardState } from '../types/game';
import { useAuth } from '../lib/auth-context';
import { Alert, AlertDescription } from './ui/alert';

interface GameLobbyProps {
  socket: Socket | null;
  socketError: string | null;
  connected: boolean;
  onGameStart: (gameState: BoardState, players: [string, Player][]) => void;
}

export default function GameLobby({ socket, socketError, connected, onGameStart }: GameLobbyProps) {
  const { user, loading: authLoading } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState<[string, Player][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  // Initialize player name from user profile if available
  useEffect(() => {
    if (user?.displayName) {
      setPlayerName(user.displayName);
    }
  }, [user]);

  // Check for saved game session to handle reconnection
  useEffect(() => {
    if (!socket || !connected) return;
    
    const savedGame = localStorage.getItem('gameRoom');
    if (savedGame) {
      try {
        const { roomId, playerSymbol } = JSON.parse(savedGame);
        if (roomId && playerSymbol) {
          setReconnecting(true);
          
          // Get auth token if available
          const reconnectWithAuth = async () => {
            let token = null;
            if (user) {
              try {
                token = await user.getIdToken();
              } catch (err) {
                console.error('Error getting token for reconnection:', err);
              }
            }
            
            // Attempt to reconnect to the game
            socket.emit('reconnect-game', { roomId, playerSymbol, token });
            
            // Reset reconnecting state after a short delay
            setTimeout(() => {
              setReconnecting(false);
            }, 3000);
          };
          
          reconnectWithAuth();
        }
      } catch (e) {
        console.error('Error parsing saved game data:', e);
        localStorage.removeItem('gameRoom');
      }
    }
  }, [socket, connected, user]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-joined', ({ roomId, players, playerSymbol }) => {
      setRoomPlayers(players);
      localStorage.setItem('gameRoom', JSON.stringify({ roomId, playerSymbol }));
      setReconnecting(false);
    });

    socket.on('waiting-for-opponent', () => {
      setIsWaiting(true);
      setReconnecting(false);
    });

    socket.on('game-start', ({ gameState, players }) => {
      setIsWaiting(false);
      setReconnecting(false);
      onGameStart(gameState, players);
    });
    
    socket.on('error', (errorMsg: string) => {
      setError(errorMsg);
      setIsWaiting(false);
      setReconnecting(false);
    });

    socket.on('player-left', ({ playerId, reason, gameStatus, remainingPlayers, leftPlayer, remainingPlayer }) => {
      console.log('GameLobby - Player Left Event:', {
        playerId,
        reason,
        gameStatus,
        remainingPlayers,
        leftPlayer,
        remainingPlayer,
        'currentSocket.id': socket?.id,
        currentRoomPlayers: roomPlayers
      });

      setRoomPlayers(prev => {
        const newPlayers = prev.filter(([id]) => id !== playerId);
        console.log('Updated room players:', newPlayers);
        return newPlayers;
      });
      
      if (reason === 'disconnect') {
        if (gameStatus === 'playing') {
          console.log('Player left during game');
          setError('Opponent disconnected. You win!');
        } else {
          console.log('Player left from lobby');
          setError('Opponent has left the game');
        }
        setIsWaiting(false);
      }
    });

    return () => {
      socket.off('room-joined');
      socket.off('waiting-for-opponent');
      socket.off('game-start');
      socket.off('player-left');
      socket.off('error');
    };
  }, [socket, onGameStart]);

  const handleJoinGame = async () => {
    if (!socket || !connected) {
      setError('Socket not connected. Please refresh the page.');
      return;
    }
    
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }

    // Clear any previous errors
    setError(null);

    // Send player data with the join event
    socket.emit('join-matchmaking', {
      name: playerName.trim(),
      avatar: user?.photoURL || undefined,
    });
  };

  // Show loading state while authentication is initializing
  if (authLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg text-center"
      >
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="mt-4">Loading...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center mb-6">Game Lobby</h2>

      {/* Connection status alert */}
      {(!connected || socketError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {socketError || "Server connection lost. Please refresh the page."}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Reconnecting message */}
      {reconnecting && (
        <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
          <AlertDescription className="flex items-center">
            <div className="mr-2 flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            Reconnecting to your game...
          </AlertDescription>
        </Alert>
      )}

      {!isWaiting && roomPlayers.length === 0 && !reconnecting && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              maxLength={20}
              disabled={!!user || !connected}
            />
            {user && (
              <p className="text-xs text-gray-500 mt-1">Playing as {user.displayName || "authenticated user"}</p>
            )}
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-2 rounded-lg ${
              connected 
                ? "bg-blue-500 text-white hover:bg-blue-600" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            onClick={handleJoinGame}
            disabled={!connected}
          >
            {user ? "Join Game" : "Play as Guest"}
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isWaiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-lg">Waiting for opponent...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {roomPlayers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Players in Room:</h3>
          <div className="space-y-3">
            {roomPlayers.map(([id, player]) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {player.avatar ? (
                    <img 
                      src={player.avatar} 
                      alt={`${player.name}'s avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{player.name[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-sm text-gray-500">Playing as {player.symbol}</p>
                  {player.authenticated && (
                    <p className="text-xs text-green-500">✓ Verified player</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}