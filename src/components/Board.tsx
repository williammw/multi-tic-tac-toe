import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardState, Cell, Player, defaultGameState } from '../types/game';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription } from '../components/ui/alert';
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
  const [coinTossing, setCoinTossing] = useState(false);
  const [coinResult, setCoinResult] = useState<string | null>(null);
  const [startingPlayerName, setStartingPlayerName] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(10);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastAutoMove, setLastAutoMove] = useState<{
    player: Player;
    row: number;
    col: number;
  } | null>(null);
  const [roomId, setRoomId] = useState<string | null>(() => {
    const savedGame = localStorage.getItem('gameRoom');
    if (savedGame) {
      const { roomId } = JSON.parse(savedGame);
      return roomId;
    }
    return null;
  });
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const currentPlayerData = players && socket 
    ? players.find(([id]) => id === socket.id)?.[1] 
    : null;
  const playerSymbol = currentPlayerData?.symbol;

  // Handle reconnection with authentication when socket or user changes
  useEffect(() => {
    // Skip if we don't have both socket and roomId
    if (!socket || !roomId) return;
    
    const reconnectWithAuth = async () => {
      try {
        // Get auth token if user is signed in
        let token = null;
        if (user) {
          token = await user.getIdToken();
        }
        
        // Reconnect to the game with token
        const savedGame = localStorage.getItem('gameRoom');
        if (savedGame) {
          const { playerSymbol } = JSON.parse(savedGame);
          socket.emit('reconnect-game', { roomId, playerSymbol, token });
          console.log('Attempting to reconnect to game with authentication');
        }
      } catch (error) {
        console.error('Failed to reconnect with authentication:', error);
        setConnectionError('Failed to authenticate. Please try rejoining the game.');
      }
    };
    
    reconnectWithAuth();
  }, [socket, user, roomId]);

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

  // Function to emit player leaving intentionally with authentication
  const handleIntentionalLeave = async () => {
    if (!socket || !roomId) return;
    
    // If user is authenticated, get a fresh token
    let token = null;
    if (user) {
      try {
        token = await user.getIdToken();
      } catch (err) {
        console.error('Error refreshing token for leave game:', err);
      }
    }
    
    socket.emit('leave-game', { roomId, intentional: true, token });
    handleLeaveGame();
  };

  const handleLeaveGameClick = () => {
    const confirmed = window.confirm('Are you sure you want to leave the game? All progress will be lost!');
    if (confirmed) {
      handleIntentionalLeave();
    }
  };

  const handleLeaveGame = () => {
    localStorage.removeItem('gameRoom');
    onGameEnd();
  };

  useEffect(() => {
    if (!socket) return;

    const savedGame = localStorage.getItem('gameRoom');
    if (savedGame) {
      const { roomId: savedRoomId } = JSON.parse(savedGame);
      setRoomId(savedRoomId);
    }

    socket.on('coin-toss', ({ result, startingPlayer }) => {
      setCoinTossing(true);
      
      // Simulate coin toss animation
      setTimeout(() => {
        setCoinResult(result);
        setStartingPlayerName(startingPlayer?.name || result);
        
        // Hide coin toss after a delay
        setTimeout(() => {
          setCoinTossing(false);
          setCoinResult(null);
          setStartingPlayerName(null);
        }, 3000);
      }, 2000);
    });

    socket.on('turn-timer-start', ({ startTime, duration }) => {
      // Calculate when the turn will end
      const endTime = startTime + duration;
      
      // Initialize the time remaining
      const currentTime = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - currentTime) / 1000));
      setTimeRemaining(remaining);
      
      // Start the countdown
      setIsTimerActive(true);
      
      // Clear any existing interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      // Set up a new interval for the countdown
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        
        setTimeRemaining(secondsLeft);
        
        // Stop the timer if time has run out
        if (secondsLeft <= 0) {
          setIsTimerActive(false);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        }
      }, 1000);
    });

    socket.on('auto-move', ({ player, row, col, reason }) => {
      setLastAutoMove({ player, row, col });
      
      if (reason === 'timeout') {
        toast.custom(
          <Alert variant="default" className="bg-orange-500 text-white border-none">
            <AlertDescription>
              {player.name} ran out of time! A random move was made.
            </AlertDescription>
          </Alert>
        );
      }
      
      // Clear the notification after a delay
      setTimeout(() => {
        setLastAutoMove(null);
      }, 3000);
    });

    socket.on('game-state', (newState: BoardState) => {
      setBoardState(newState);
      if (newState.winner) {
        setShowCongrats(true);
        setIsTimerActive(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setTimeout(() => setShowCongrats(false), 3000);
      }
    });
    
    socket.on('error', (errorMessage: string) => {
      setConnectionError(errorMessage);
      toast.error(errorMessage);
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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      socket.off('game-state');
      socket.off('player-left');
      socket.off('rematch-requested');
      socket.off('game-start');
      socket.off('coin-toss');
      socket.off('turn-timer-start');
      socket.off('auto-move');
      socket.off('error');
    };
  }, [socket, onPlayersUpdate]);

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

const handleClick = async (row: number, col: number) => {
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

  // Create a deep copy of the cells array
  const newCells = boardState.cells.map(r => r.map(c => ({ ...c })));
  
  // Get current timestamp for this move
  const currentTime = Date.now();
  
  // Find player's marks with their positions and timestamps
  const playerMarks = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (newCells[i][j].value === playerSymbol) {
        playerMarks.push({
          row: i,
          col: j,
          timestamp: newCells[i][j].timestamp || currentTime - 999999 // Default old timestamp if missing
        });
      }
    }
  }
  
  console.log("Player marks before new move:", playerMarks);
  
  // If player already has 3 marks, find and remove the oldest
  if (playerMarks.length >= 3) {
    console.log("Player has 3+ marks, removing oldest");
    
    // Sort by timestamp (ascending order - oldest first)
    playerMarks.sort((a, b) => {
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return aTime - bTime;
    });
    
    // Get the oldest mark
    const oldestMark = playerMarks[0];
    console.log("Oldest mark:", oldestMark);
    
    // Remove the oldest mark
    if (oldestMark && oldestMark.row !== undefined && oldestMark.col !== undefined) {
      newCells[oldestMark.row][oldestMark.col] = { value: '' };
      console.log(`Removed mark at position [${oldestMark.row}, ${oldestMark.col}]`);
    }
  }

  // Add the new mark with current timestamp
  newCells[row][col] = { value: playerSymbol, timestamp: currentTime };
  console.log(`Added new mark at [${row}, ${col}] with timestamp ${currentTime}`);
  
  // Log the updated cell grid for debugging
  console.log("Updated cells:", 
    newCells.map(row => 
      row.map(cell => 
        cell.value ? `${cell.value}${cell.timestamp ? `(${cell.timestamp})` : ''}` : ''
      )
    )
  );
  
  // Check for winner
  const winner = checkWinner(newCells);
  
  // Create new state (server will handle switching current player)
  const newState = {
    cells: newCells,
    currentPlayer: boardState.currentPlayer, // Keep the same, server will change
    gameOver: !!winner,
    winner
  };

  // Send move to server with authentication if available
  let authToken = null;
  if (user) {
    try {
      authToken = await user.getIdToken(true);
      socket.emit('make-move', { roomId, move: newState, token: authToken });
    } catch (err) {
      console.error('Error getting auth token for move:', err);
      socket.emit('make-move', { roomId, move: newState });
    }
  } else {
    socket.emit('make-move', { roomId, move: newState });
  }
};
  

  // Request a rematch with authentication
  const handleRematchRequest = async () => {
    if (!socket || !roomId) return;
    
    // Include auth token if available
    let authToken = null;
    if (user) {
      try {
        authToken = await user.getIdToken(true);
        socket.emit('request-rematch', roomId, authToken);
      } catch (err) {
        console.error('Error getting auth token for rematch request:', err);
        socket.emit('request-rematch', roomId);
      }
    } else {
      socket.emit('request-rematch', roomId);
    }
  };

  // Accept a rematch with authentication
  const handleAcceptRematch = async () => {
    if (!socket || !roomId) return;
    
    // Include auth token if available
    let authToken = null;
    if (user) {
      try {
        authToken = await user.getIdToken(true);
        socket.emit('accept-rematch', roomId, authToken);
      } catch (err) {
        console.error('Error getting auth token for rematch acceptance:', err);
        socket.emit('accept-rematch', roomId);
      }
    } else {
      socket.emit('accept-rematch', roomId);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Connection error alert */}
      {connectionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      )}
      
      {/* Coin Toss Animation */}
      <AnimatePresence>
        {coinTossing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-60 z-50"
          >
            <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
              {!coinResult ? (
                <>
                  <motion.div
                    animate={{ rotateY: [0, 1080], rotateX: [0, 720] }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="w-20 h-20 bg-yellow-400 rounded-full mb-4 flex items-center justify-center text-2xl"
                  >
                    🪙
                  </motion.div>
                  <p className="text-xl font-bold">Tossing coin...</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-yellow-400 rounded-full mb-4 flex items-center justify-center text-2xl">
                    {coinResult === 'X' ? 'X' : 'O'}
                  </div>
                  <p className="text-xl font-bold">{startingPlayerName} goes first!</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn Timer */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isTimerActive && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`text-xl font-bold ${
                timeRemaining <= 2 
                  ? 'text-red-600 animate-pulse' 
                  : timeRemaining <= 4 
                    ? 'text-orange-500' 
                    : 'text-blue-600'
              }`}
            >
              Time remaining: {timeRemaining}s
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Auto Move Notification */}
      <AnimatePresence>
        {lastAutoMove && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-orange-100 border-orange-400 border p-2 rounded-md text-center"
          >
            <p>
              {lastAutoMove.player.name} ran out of time! 
              <br />
              A random move was made at position ({lastAutoMove.row + 1}, {lastAutoMove.col + 1}).
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
      
      {/* Players Info with Authentication Status */}
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
                  {player.authenticated && (
                    <p className="text-xs text-green-500">✓ Verified</p>
                  )}
                  
                  {/* Timer indicator for current player */}
                  {boardState.currentPlayer === player.symbol && isTimerActive && (
                    <div className="mt-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '100%' }}
                        animate={{ 
                          width: `${(timeRemaining / 10) * 100}%`,
                          backgroundColor: timeRemaining <= 2 
                            ? '#ef4444' // red-500
                            : timeRemaining <= 4 
                              ? '#f97316' // orange-500 
                              : '#3b82f6' // blue-500
                        }}
                        transition={{ duration: 1 }}
                        className="h-full"
                      />
                    </div>
                  )}
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
              🎉 {players?.find(([, p]) => p.symbol === boardState.winner)?.[1]?.name || boardState.winner} wins! 🎉
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