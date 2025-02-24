// src/components/UserStatsCard.tsx
import { useAuth } from '../lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getLevelProgress } from '../lib/level-service';
import { Trophy, X, FileX, Clock } from 'lucide-react';

export default function UserStatsCard() {
  const { userData } = useAuth();

  if (!userData) {
    return null;
  }

  const { statistics } = userData;
  const levelProgress = getLevelProgress(statistics.xp);
  const winRate = statistics.gamesPlayed > 0 
    ? Math.round((statistics.wins / statistics.gamesPlayed) * 100) 
    : 0;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Player Statistics</span>
          <span className="text-sm font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Level {statistics.level}
          </span>
        </CardTitle>
        <CardDescription>Your game performance and ranking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Level Progress</span>
            <span className="font-medium">{Math.round(levelProgress)}%</span>
          </div>
          <Progress value={levelProgress} className="h-2" />
          <div className="text-xs text-gray-500 text-right">
            {statistics.xp} XP / {statistics.xp + statistics.xpToNextLevel} XP for Level {statistics.level + 1}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Wins</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statistics.wins}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Losses</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statistics.losses}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <FileX className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Draws</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statistics.draws}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Win Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{winRate}%</p>
          </div>
        </div>

        <div className="text-sm text-center text-gray-500 pt-2">
          Total Games Played: {statistics.gamesPlayed}
        </div>
      </CardContent>
    </Card>
  );
}