import { useState, useEffect } from 'react';
import { authService } from '@/services/auth';

interface User {
  id: string;
  email: string;
  created_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    const currentUser = authService.getUser();
    setUser(currentUser);
    setLoading(false);

    // Set up auth state listener
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    return await authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string) => {
    return await authService.signUp(email, password);
  };

  const signOut = async () => {
    return await authService.signOut();
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
};