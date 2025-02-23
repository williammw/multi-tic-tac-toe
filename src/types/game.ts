export interface Cell {
  value: string;
  timestamp?: number;
}

export interface BoardState {
  cells: Cell[][];
  currentPlayer: 'X' | 'O';
  gameOver: boolean;
  winner: string | null;
}

export interface Player {
  name: string;
  avatar?: string;
  symbol: 'X' | 'O';
  joinedAt: number;
}

export const defaultGameState: BoardState = {
  cells: Array(3).fill(null).map(() => Array(3).fill({ value: '' })),
  currentPlayer: 'X',
  gameOver: false,
  winner: null
};