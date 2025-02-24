// src/pages/GamePage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Board from '../components/Board';
import { useSocketContext } from '../lib/socket-context';
import { BoardState, Player, defaultGameState } from '../types/game';

export default function GamePage() {
  const { socket } = useSocketContext();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<BoardState>(() => {
    const saved = sessionStorage.getItem('gameState');
    return saved ? JSON.parse(saved) : defaultGameState;
  });
  
  const [players, setPlayers] = useState<[string, Player][]>(() => {
    const saved = sessionStorage.getItem('players');
    return saved ? JSON.parse(saved) : [];
  });

  // If no game state or players, redirect to home
  useEffect(() => {
    if (!socket || players.length === 0) {
      navigate('/');
    }
  }, [socket, players, navigate]);

  const handleGameEnd = () => {
    // Clear game data
    sessionStorage.removeItem('gameState');
    sessionStorage.removeItem('players');
    navigate('/');
  };

  const handlePlayersUpdate = (updatedPlayers: [string, Player][]) => {
    setPlayers(updatedPlayers);
    sessionStorage.setItem('players', JSON.stringify(updatedPlayers));
  };  

  return (
    <div className="container mx-auto">
      <Board
        socket={socket}
        initialGameState={gameState}
        players={players}
        onGameEnd={handleGameEnd}
        onPlayersUpdate={handlePlayersUpdate}
      />
    </div>
  );
}