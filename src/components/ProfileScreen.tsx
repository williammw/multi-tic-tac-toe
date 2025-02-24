// src/components/ProfileScreen.tsx
import { useAuth } from '../lib/auth-context';
import UserStatsCard from './UserStatsCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProfileScreenProps {
  onBack: () => void;
}

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { user, userData } = useAuth();

  if (!user || !userData) {
    return (
      <div className="text-center p-6">
        <p>Please sign in to view your profile.</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Game
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Player Profile</h1>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Game
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
          {userData.photoURL ? (
            <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
              {userData.displayName?.[0] || 'U'}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{userData.displayName || 'Player'}</h2>
          <p className="text-gray-500">{userData.email}</p>
        </div>
      </div>

      <UserStatsCard />
    </div>
  );
}