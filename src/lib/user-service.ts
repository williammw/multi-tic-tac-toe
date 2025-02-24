// src/lib/user-service.ts
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "../types/user";
import { getXpForLevel, getXpToNextLevel } from "./level-service";

export async function getUser(uid: string): Promise<User | null> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? (userSnap.data() as User) : null;
}

export async function createUser(user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  // Initialize user with level 1, 0 XP, and XP needed for level 2
  await setDoc(userRef, {
    ...user,
    statistics: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: getXpForLevel(2), // XP needed for level 2
    },
    createdAt: new Date(),
    lastActive: new Date(),
  });
}

export async function updateUserStats(
  uid: string,
  stats: Partial<User["statistics"]>
): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    statistics: stats,
  });
}
