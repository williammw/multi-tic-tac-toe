// src/types/user.ts
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  statistics: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
  };
}
