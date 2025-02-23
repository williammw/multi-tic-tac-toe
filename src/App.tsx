import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Board from './components/Board';
import GameLobby from './components/GameLobby';
import { BoardState, Player, defaultGameState } from './types/game';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<BoardState>(defaultGameState);
  const [players, setPlayers] = useState<[string, Player][]>([]);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
    
    // Try to reconnect to existing game
    const savedGame = localStorage.getItem('gameRoom');
    if (savedGame) {
      const { roomId, playerSymbol } = JSON.parse(savedGame);
      newSocket.emit('reconnect-game', { roomId, playerSymbol });
    }

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleGameStart = (initialGameState: BoardState, gamePlayers: [string, Player][]) => {
    setGameState(initialGameState);
    setPlayers(gamePlayers);
    setGameStarted(true);
  };

  const handleGameEnd = () => {
    setGameStarted(false);
    setPlayers([]);
    setGameState(defaultGameState);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl text-gray-800 mb-4 text-center">Multiplayer Tic-Tac-Toe</h1>
      <p className="text-lg text-gray-600 mb-8 text-center">
        Each player can place up to 3 marks. When placing a 4th mark, the oldest one is removed.
      </p>
      
      {!gameStarted ? (
        <GameLobby socket={socket} onGameStart={handleGameStart} />
      ) : (
        <Board
          socket={socket}
          initialGameState={gameState}
          players={players}
          onGameEnd={handleGameEnd}
        />
      )}
    </div>
  );
}