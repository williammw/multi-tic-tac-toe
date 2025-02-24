// src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <h2 className="text-2xl font-bold mt-4">Page Not Found</h2>
      <p className="mt-2 text-gray-500">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/">
        <Button className="mt-6">Go Back Home</Button>
      </Link>
    </div>
  );
}