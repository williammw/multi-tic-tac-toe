// src/pages/StatsPage.tsx
import { useAuth } from '../lib/auth-context';
import UserStatsCard from '../components/UserStatsCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function StatsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="text-center p-6">
        <p>Please sign in to view your statistics.</p>
        <Link to="/">
          <Button className="mt-4">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Player Statistics</h1>
      <UserStatsCard />
    </div>
  );
}