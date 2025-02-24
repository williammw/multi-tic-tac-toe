// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import { SocketProvider } from './lib/socket-context';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import StatsPage from './pages/StatsPage';
import { Toaster } from 'react-hot-toast';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtextedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" />       
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="game" element={<GamePage />} />
              <Route path="profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="stats" element={
                <ProtectedRoute>
                  <StatsPage />
                </ProtectedRoute>
              } />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;