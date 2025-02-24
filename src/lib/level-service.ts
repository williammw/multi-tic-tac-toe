// src/lib/level-service.ts
import { updateDoc, doc, increment, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "../types/user";

// XP awards
const XP_AWARDS = {
  WIN: 30,
  DRAW: 10,
  LOSS: 5,
};

// Calculate XP needed for a specific level (level N requires N^2 * 50 XP)
export function getXpForLevel(level: number): number {
  return level * level * 50;
}

// Calculate the current level based on total XP
export function getLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

// Calculate XP needed for next level
export function getXpToNextLevel(currentXp: number): number {
  const currentLevel = getLevelFromXp(currentXp);
  const nextLevelXp = getXpForLevel(currentLevel);
  return nextLevelXp - currentXp;
}

// Calculate percentage progress to next level (for progress bar)
export function getLevelProgress(currentXp: number): number {
  const currentLevel = getLevelFromXp(currentXp);
  const prevLevelXp = getXpForLevel(currentLevel - 1);
  const nextLevelXp = getXpForLevel(currentLevel);
  const xpInCurrentLevel = currentXp - prevLevelXp;
  const xpRequiredForLevel = nextLevelXp - prevLevelXp;
  return (xpInCurrentLevel / xpRequiredForLevel) * 100;
}

// Update user stats after a game
export async function updateUserStatsAfterGame(
  userId: string,
  gameResult: "win" | "loss" | "draw"
): Promise<{ leveledUp: boolean; newLevel?: number }> {
  const userRef = doc(db, "users", userId);

  // Calculate XP award based on game result
  let xpAward = 0;
  if (gameResult === "win") {
    xpAward = XP_AWARDS.WIN;
  } else if (gameResult === "draw") {
    xpAward = XP_AWARDS.DRAW;
  } else {
    xpAward = XP_AWARDS.LOSS;
  }

  // Update the stats in Firestore
  await updateDoc(userRef, {
    "statistics.gamesPlayed": increment(1),
    [`statistics.${gameResult}s`]: increment(1),
    "statistics.xp": increment(xpAward),
    lastActive: new Date(),
  });

  // Fetch the updated user data to check if level increased
  const userData = await getDoc(userRef);
  const user = userData.data() as User;

  const newLevel = getLevelFromXp(user.statistics.xp);
  if (newLevel !== user.statistics.level) {
    // Level up! Update the level and XP to next level
    await updateDoc(userRef, {
      "statistics.level": newLevel,
      "statistics.xpToNextLevel": getXpToNextLevel(user.statistics.xp),
    });

    // Return information about the level up
    return { leveledUp: true, newLevel };
  }

  return { leveledUp: false };
}
