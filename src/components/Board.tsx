import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface Cell {
  value: string;
  timestamp?: number;
}

interface BoardState {
  cells: Cell[][];
  currentPlayer: 'X' | 'O';
  gameOver: boolean;
  winner: string | null;
}

export default function Board() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<'X' | 'O' | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [boardState, setBoardState] = useState<BoardState>({
    cells: Array(3).fill(null).map(() => Array(3).fill({ value: '' })),
    currentPlayer: 'X',
    gameOver: false,
    winner: null
  });

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('player-symbol', (symbol: 'X' | 'O') => {
      setPlayerSymbol(symbol);
    });

    newSocket.on('game-state', (newState: BoardState) => {
      setBoardState(newState);
      if (newState.winner) {
        setShowCongrats(true);
        setTimeout(() => setShowCongrats(false), 3000);
      }
      if (!newState.winner && !newState.gameOver) {
        setShowCongrats(false);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const countPlayerMarks = (symbol: string): number => {
    return boardState.cells.flat().filter(cell => cell.value === symbol).length;
  };

  const getOldestMark = (symbol: string): { row: number; col: number } | null => {
    let oldest = { timestamp: Infinity, pos: null as any };
    
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
    if (!socket || !playerSymbol || playerSymbol !== boardState.currentPlayer || 
        boardState.cells[row][col].value || boardState.gameOver) {
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
    const newState = {
      cells: newCells,
      currentPlayer: playerSymbol === 'X' ? 'O' : 'X',
      gameOver: !!winner,
      winner
    };

    socket.emit('make-move', newState);
  };

  const handleReset = () => {
    if (socket) {
      console.log('Requesting game reset...');
      socket.emit('reset-game');
    }
  };

  return (
    <div className="game-board">
      <div className="status">
        {playerSymbol && (
          <div>You are playing as: {playerSymbol}</div>
        )}
        {boardState.gameOver 
          ? (
            <div className="game-over">
              <div className={`winner-announcement ${showCongrats ? 'show' : ''}`}>
                🎉 Congratulations! {boardState.winner} wins! 🎉
              </div>
              <button className="reset-button" onClick={handleReset}>
                Play Again
              </button>
            </div>
          ) 
          : `Current player: ${boardState.currentPlayer}`}
      </div>
      <div className="board">
        {boardState.cells.map((row, i) => (
          <div key={i} className="board-row">
            {row.map((cell, j) => (
              <button
                key={`${i}-${j}`}
                className={`cell ${cell.value ? 'filled' : ''}`}
                onClick={() => handleClick(i, j)}
                disabled={!playerSymbol || playerSymbol !== boardState.currentPlayer || boardState.gameOver}
              >
                {cell.value}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 