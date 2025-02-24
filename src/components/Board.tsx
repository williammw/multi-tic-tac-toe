import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardState, Cell, Player, defaultGameState } from '../types/game';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '../lib/auth-context';
import { updateUserStatsAfterGame } from '../lib/level-service';

interface BoardProps {
  socket: Socket | null;
  initialGameState?: BoardState;
  players?: [string, Player][];
  onGameEnd: () => void;
  onPlayersUpdate?: (players: [string, Player][]) => void;
}

export default function Board({ 
  socket, 
  initialGameState = defaultGameState,
  players = [],
  onGameEnd,
  onPlayersUpdate 
}: BoardProps) {
  const [boardState, setBoardState] = useState<BoardState>(initialGameState);
  const [showCongrats, setShowCongrats] = useState(false);
  const [rematchRequested, setRematchRequested] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(() => {
    const savedGame = localStorage.getItem('gameRoom');
    if (savedGame) {
      const { roomId } = JSON.parse(savedGame);
      return roomId;
    }
    return null;
  });
  
  const { user } = useAuth();
  const currentPlayerData = players && socket 
    ? players.find(([id]) => id === socket.id)?.[1] 
    : null;
  const playerSymbol = currentPlayerData?.symbol;

  const opponent = players && socket 
    ? players.find(([id]) => id !== socket.id)?.[1] 
    : null;

  useEffect(() => {
    if (!user || !boardState.gameOver) return;
    
    // Only update stats when the game is actually over
    if (boardState.gameOver) {
      let gameResult: 'win' | 'loss' | 'draw' = 'loss';
      
      // It's a draw if there's no winner
      if (!boardState.winner) {
        gameResult = 'draw';
      } 
      // It's a win if the current player's symbol matches the winner
      else if (playerSymbol === boardState.winner) {
        gameResult = 'win';
      }
      
      // Update the stats in Firestore
      updateUserStatsAfterGame(user.uid, gameResult)
        .then(result => {
          // Show toast notification for XP gain
          toast.custom(
            <Alert variant="default" className="bg-blue-500 text-white border-none">
              <AlertDescription>
                {gameResult === 'win' 
                  ? '🏆 Victory! +30 XP' 
                  : gameResult === 'draw' 
                    ? '🤝 Draw! +10 XP' 
                    : '💪 Good effort! +5 XP'}
              </AlertDescription>
            </Alert>
          );
          
          // If leveled up, show a more prominent notification
          if (result.leveledUp && result.newLevel) {
            setTimeout(() => {
              toast.custom(
                <Alert variant="default" className="bg-purple-600 text-white border-none animate-bounce">
                  <AlertDescription className="flex flex-col items-center">
                    <span className="text-xl">🎉 LEVEL UP! 🎉</span>
                    <span>You've reached level {result.newLevel}!</span>
                  </AlertDescription>
                </Alert>
              );
            }, 1000); // Show after the XP notification
          }
        })
        .catch(error => console.error("Error updating stats:", error));
    }
  }, [boardState.gameOver, boardState.winner, playerSymbol, user]);

  // Function to emit player leaving intentionally
  const handleIntentionalLeave = () => {
    if (!socket || !roomId) return;
    socket.emit('leave-game', { roomId, intentional: true });
    handleLeaveGame();
  };

  const handleLeaveGameClick = () => {
    const confirmed = window.confirm('Are you sure you want to leave the game? All progress will be lost!');
    if (confirmed) {
      handleIntentionalLeave();
    }
  };

  useEffect(() => {
    if (!socket) return;

    const savedGame = localStorage.getItem('gameRoom');
    if (savedGame) {
      const { roomId: savedRoomId } = JSON.parse(savedGame);
      setRoomId(savedRoomId);
    }

    socket.on('game-state', (newState: BoardState) => {
      setBoardState(newState);
      if (newState.winner) {
        setShowCongrats(true);
        setTimeout(() => setShowCongrats(false), 3000);
      }
    });

    socket.on('player-left', ({ gameState, remainingPlayers, gameStatus, reason, playerId, leftPlayer, remainingPlayer, intentional }) => {
      console.log('Player Left Event:', {
        gameState,
        remainingPlayers,
        gameStatus,
        reason,
        playerId,
        leftPlayer,
        remainingPlayer,
        intentional,
        'currentSocket.id': socket?.id,
        playerSymbol,
        currentGameState: boardState
      });
      
      // Update the list of players
      if (onPlayersUpdate && remainingPlayers) {
        onPlayersUpdate(remainingPlayers);
      }

      // Find if current player is the one who stayed
      const isCurrentPlayerRemaining = socket?.id && socket.id !== playerId;
      console.log('Is Current Player Remaining:', isCurrentPlayerRemaining);
      
      if (gameStatus === 'playing' && isCurrentPlayerRemaining) {
        console.log('Current player is winner, updating state');
        setBoardState(gameState); // Use the gameState from the server
        setShowCongrats(true);
        setTimeout(() => setShowCongrats(false), 3000);
        
        // Show notification based on how opponent left
        if (intentional) {
          toast.custom(
            <Alert variant="default" className="bg-yellow-500 text-white border-none">
              <AlertDescription>
                Your opponent has left the game. You win! 👋
              </AlertDescription>
            </Alert>
          );
        } else {
          toast.custom(
            <Alert variant="default" className="bg-red-500 text-white border-none">
              <AlertDescription>
                Your opponent disconnected. You win! 🔌
              </AlertDescription>
            </Alert>
          );
        }
      } else if (!isCurrentPlayerRemaining) {
        console.log('Current player left, handling game leave');
        handleLeaveGame();
      }
    });

    socket.on('rematch-requested', (requesterId: string) => {
      setRematchRequested(requesterId);
    });

    socket.on('game-start', ({ gameState }) => {
      setBoardState(gameState);
      setRematchRequested(null);
      setShowCongrats(false);
    });

    return () => {
      socket.off('game-state');
      socket.off('player-left');
      socket.off('rematch-requested');
      socket.off('game-start');
    };
  }, [socket]);

  const countPlayerMarks = (symbol: string): number => {
    return boardState.cells.flat().filter(cell => cell.value === symbol).length;
  };

  const getOldestMark = (symbol: string): { row: number; col: number } | null => {
    let oldest = { timestamp: Infinity, pos: null as { row: number; col: number } | null };
    
    boardState.cells.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (cell.value === symbol && cell.timestamp && cell.timestamp < oldest.timestamp) {
          oldest = { timestamp: cell.timestamp, pos: { row: i, col: j } };
        }
      });
    });
    
    return oldest.pos;
  };

  const checkWinner = (cells: Cell[][]): string | null => {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (cells[i][0].value && cells[i][0].value === cells[i][1].value && cells[i][1].value === cells[i][2].value) {
        return cells[i][0].value;
      }
    }

    // Check columns
    for (let j = 0; j < 3; j++) {
      if (cells[0][j].value && cells[0][j].value === cells[1][j].value && cells[1][j].value === cells[2][j].value) {
        return cells[0][j].value;
      }
    }

    // Check diagonals
    if (cells[0][0].value && cells[0][0].value === cells[1][1].value && cells[1][1].value === cells[2][2].value) {
      return cells[0][0].value;
    }
    if (cells[0][2].value && cells[0][2].value === cells[1][1].value && cells[1][1].value === cells[2][0].value) {
      return cells[0][2].value;
    }

    return null;
  };

  const handleClick = (row: number, col: number) => {
    if (!socket || !playerSymbol || !roomId) {
      console.log('Click blocked: No socket, symbol, or room', { socket: !!socket, playerSymbol, roomId });
      return;
    }

    if (playerSymbol !== boardState.currentPlayer) {
      console.log('Click blocked: Not your turn', { playerSymbol, currentPlayer: boardState.currentPlayer });
      return;
    }

    if (boardState.cells[row][col].value || boardState.gameOver) {
      console.log('Click blocked: Cell occupied or game over', { 
        cellValue: boardState.cells[row][col].value, 
        gameOver: boardState.gameOver 
      });
      return;
    }

    const newCells = [...boardState.cells.map(row => [...row])];
    const currentMarks = countPlayerMarks(playerSymbol);

    if (currentMarks >= 3) {
      const oldestMark = getOldestMark(playerSymbol);
      if (oldestMark) {
        newCells[oldestMark.row][oldestMark.col] = { value: '' };
      }
    }

    newCells[row][col] = { value: playerSymbol, timestamp: Date.now() };
    
    const winner = checkWinner(newCells);
    // Don't switch the current player yet - the server will do that
    const newState = {
      cells: newCells,
      currentPlayer: boardState.currentPlayer, // Keep the current player the same
      gameOver: !!winner,
      winner
    };

    socket.emit('make-move', { roomId, move: newState });
  };

  const handleRematchRequest = () => {
    if (!socket || !roomId) return;
    socket.emit('request-rematch', roomId);
  };

  const handleAcceptRematch = () => {
    if (!socket || !roomId) return;
    socket.emit('accept-rematch', roomId);
  };

  const handleLeaveGame = () => {
    localStorage.removeItem('gameRoom');
    onGameEnd();
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Turn Indicator */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {playerSymbol && playerSymbol !== boardState.currentPlayer && !boardState.gameOver && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-xl text-blue-600 animate-pulse"
            >
              Waiting for opponent's move...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Players Info */}
      <div className="grid grid-cols-2 gap-8 w-full max-w-xl">
        {players && players.length > 0 ? (
          players.map(([id, player]) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg ${
                boardState.currentPlayer === player.symbol
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : 'bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
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
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-2 text-center text-gray-500">
            Waiting for players...
          </div>
        )}
      </div>

      {/* Game Status */}
      <div className="text-2xl font-bold text-gray-800 min-h-[6rem] flex flex-col items-center">
        <AnimatePresence>
          {showCongrats && boardState.winner && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-3xl text-green-500 text-center"
            >
              🎉 {players?.find(([_, p]) => p.symbol === boardState.winner)?.[1]?.name || boardState.winner} wins! 🎉
            </motion.div>
          )}
        </AnimatePresence>
    </div>
 
      {/* Game Board */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-xl shadow-lg"
      >
        <div className="grid grid-rows-3 gap-4">
          {boardState.cells.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              {row.map((cell, j) => (
                <motion.button
                  key={`${i}-${j}`}
                  whileHover={!cell.value && playerSymbol === boardState.currentPlayer && !boardState.gameOver ? { scale: 1.05 } : {}}
                  whileTap={!cell.value && playerSymbol === boardState.currentPlayer && !boardState.gameOver ? { scale: 0.95 } : {}}
                  className={`w-20 h-20 md:w-24 md:h-24 border-2 border-gray-800 rounded-lg text-4xl font-bold 
                    flex items-center justify-center
                    ${cell.value ? 'bg-gray-100 text-gray-800' : 'bg-white hover:bg-gray-50'}
                    ${(!playerSymbol || playerSymbol !== boardState.currentPlayer || boardState.gameOver) 
                      ? 'opacity-80 cursor-not-allowed' 
                      : ''
                    }`}
                  onClick={() => handleClick(i, j)}
                  disabled={!playerSymbol || playerSymbol !== boardState.currentPlayer || boardState.gameOver}
                >
                  <AnimatePresence>
                    {cell.value && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                      >
                        {cell.value}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Game Controls */}
      <div className="flex gap-4">
        {boardState.gameOver && !rematchRequested && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg"
            onClick={handleRematchRequest}
          >
            Request Rematch
          </motion.button>
        )}

        {rematchRequested && rematchRequested !== socket?.id && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-green-500 text-white px-6 py-3 rounded-lg"
            onClick={handleAcceptRematch}
          >
            Accept Rematch
          </motion.button>
        )}

        {rematchRequested && rematchRequested === socket?.id && (
          <p className="text-gray-600">Waiting for opponent to accept rematch...</p>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gray-500 text-white px-6 py-3 rounded-lg"
          onClick={handleLeaveGameClick}
        >
          Leave Game
        </motion.button>
      </div>
    </div>
  );
}