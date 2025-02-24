// src/pages/ProfilePage.tsx
// This is a conversion of your ProfileScreen component
import { useAuth } from '../lib/auth-context';
import UserStatsCard from '../components/UserStatsCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user, userData } = useAuth();

  if (!user || !userData) {
    return (
      <div className="text-center p-6">
        <p>Please sign in to view your profile.</p>
        <Link to="/">
          <Button className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Game
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
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