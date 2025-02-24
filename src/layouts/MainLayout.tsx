// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import AuthButton from '../components/AuthButton';
import { Link } from 'react-router-dom';

export default function MainLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">Multi Tic-Tac-Toe</Link>
          <div className="flex items-center gap-4">
            {user && (
              <Link to="/stats" className="text-blue-500 hover:text-blue-700">
                Stats
              </Link>
            )}
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 flex-1 w-full">
        <Outlet />
      </main>

      <footer className="bg-white p-4 text-center text-gray-500 text-sm">
        <div className="max-w-6xl mx-auto">
          &copy; {new Date().getFullYear()} Multi Tic-Tac-Toe
        </div>
      </footer>
    </div>
  );
}