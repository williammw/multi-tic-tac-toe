import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '../types/user';

export async function getUser(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() as User : null;
}

export async function createUser(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    ...user,
    statistics: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    },
  });
}

export async function updateUserStats(uid: string, stats: Partial<User['statistics']>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    'statistics': stats,
  });
} 