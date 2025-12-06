import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, MessageCircle } from 'lucide-react';

interface ChatListProps {
  onSelectUser: (user: any) => void;
}

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectUser }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // নিজের ছাড়া বাকি সব ইউজারকে নিয়ে আসো
    const { data } = await supabase.from('users').select('*').neq('id', user?.id);
    if (data) setUsers(data);
  };

  return (
    <div className="min-h-screen bg-white pb-20 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 p-4 border-b">
        <h1 className="text-2xl font-bold mb-4">Chats</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search friends..." 
            className="w-full bg-gray-100 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* User List */}
      <div className="p-2">
        {users.map(u => (
          <div key={u.id} onClick={() => onSelectUser(u)} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
            <div className="relative">
               <img src={u.avatar} alt={u.name} className="w-14 h-14 rounded-full border border-gray-100 object-cover" />
               <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1">
               <h3 className="font-semibold text-gray-900">{u.name}</h3>
               <p className="text-sm text-gray-500 truncate">Tap to start chatting</p>
            </div>
            <MessageCircle size={20} className="text-blue-500 opacity-0 group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatListScreen;