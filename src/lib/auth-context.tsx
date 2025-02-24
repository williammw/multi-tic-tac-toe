// src/lib/auth-context.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import { getUser, createUser } from './user-service';
import type { User } from '../types/user';

const AuthContext = createContext<{
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
}>({ user: null, userData: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Get or create user data
        let userDoc = await getUser(firebaseUser.uid);
        
        if (!userDoc) {
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL,
            statistics: {
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              draws: 0,
            },
          };
          await createUser(newUser);
          userDoc = newUser;
        }
        
        setUserData(userDoc);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);