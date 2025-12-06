import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { avatars } from '../data/mockData';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (data: any) => Promise<{ error: any }>;
  verifyEmail: (email: string, token: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id, session.user.email!);
      else setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id, session.user.email!);
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (id: string, email: string) => {
    // Fetch user profile from 'users' table
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    if (data) {
      setUser(data);
    } else {
      // Temporary fallback (if trigger hasn't run yet)
      setUser({ id, email, name: email.split('@')[0], avatar: avatars.men[0] });
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const register = async (formData: any) => {
    // Send metadata so Trigger can create profile automatically
    return await supabase.auth.signUp({
      email: formData.contact,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
        }
      }
    });
  };

  const verifyEmail = async (email: string, token: string) => {
    // Try verifying with 'email' type first (Standard)
    let { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    
    // If fails, try 'signup' type
    if (error) {
       const retry = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
       data = retry.data; 
       error = retry.error;
    }
    
    if (data.session?.user) await fetchProfile(data.session.user.id, email);
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};