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
  onlineUsers: Set<string>; // ✅ নতুন স্টেট (অনলাইন ইউজারদের আইডি)
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (data: any) => Promise<{ error: any }>;
  verifyEmail: (email: string, token: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // সেশন চেক করা
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
        setupPresence(session.user.id); // ✅ অনলাইন স্ট্যাটাস চালু
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email!);
        setupPresence(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ রিয়েল-টাইম অনলাইন স্ট্যাটাস সেটআপ
  const setupPresence = (userId: string) => {
    const room = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });

    room
      .on('presence', { event: 'sync' }, () => {
        const newState = room.presenceState();
        const onlineIds = new Set(Object.keys(newState));
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await room.track({ online_at: new Date().toISOString() });
        }
      });
  };

  const fetchProfile = async (id: string, email: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', id).single();
    if (data) {
      setUser(data);
    } else {
      setUser({ id, email, name: email.split('@')[0], avatar: avatars.men[0] });
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const register = async (formData: any) => {
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
    let { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
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
    supabase.removeAllChannels(); // সব চ্যানেল বন্ধ করো
  };

  return (
    <AuthContext.Provider value={{ user, loading, onlineUsers, login, register, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};