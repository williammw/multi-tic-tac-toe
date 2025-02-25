// src/pages/HomePage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameLobby from '../components/GameLobby';
import { useSocketContext } from '../lib/socket-context';
import { BoardState, Player } from '../types/game';

export default function HomePage() {
  const { socket, connected, error: socketError } = useSocketContext();
  const navigate = useNavigate();

  const handleGameStart = (gameState: BoardState, players: [string, Player][]) => {
    // Save game state and players to sessionStorage
    sessionStorage.setItem('gameState', JSON.stringify(gameState));
    sessionStorage.setItem('players', JSON.stringify(players));
    navigate('/game');
  };

  return (
    <div className="container mx-auto">
      <GameLobby 
        socket={socket} 
        connected={connected}
        socketError={socketError}
        onGameStart={handleGameStart} 
      />
    </div>
  );
}