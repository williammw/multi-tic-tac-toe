import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types/game';
import { useAuth } from '../lib/auth-context';

interface GameLobbyProps {
  socket: Socket | null;
  onGameStart: (gameState: any, players: [string, Player][]) => void;
}

export default function GameLobby({ socket, onGameStart }: GameLobbyProps) {
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState<[string, Player][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) {
      setPlayerName(user.displayName);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room-joined', ({ roomId, players, playerSymbol }) => {
      setRoomPlayers(players);
      localStorage.setItem('gameRoom', JSON.stringify({ roomId, playerSymbol }));
    });

    socket.on('waiting-for-opponent', () => {
      setIsWaiting(true);
    });

    socket.on('game-start', ({ gameState, players }) => {
      setIsWaiting(false);
      onGameStart(gameState, players);
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
    };
  }, [socket, onGameStart]);

  const handleJoinGame = () => {
    if (!socket) return;
    
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }

    socket.emit('join-matchmaking', {
      name: playerName.trim(),
      avatar: user?.photoURL || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-bold text-center mb-6">Game Lobby</h2>

      {!isWaiting && roomPlayers.length === 0 && (
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
              disabled={!!user}
            />
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
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            onClick={handleJoinGame}
          >
            Join Game
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
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}