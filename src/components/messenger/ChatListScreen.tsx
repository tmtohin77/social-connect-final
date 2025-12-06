import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, MessageCircle, UserX, Loader2 } from 'lucide-react';

interface ChatListProps {
  onSelectUser: (user: any) => void;
}

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectUser }) => {
  const { user, onlineUsers } = useAuth(); // ✅ onlineUsers আনা হলো
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    if (!user) return;
    const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'accepted');
    const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id).eq('status', 'accepted');

    const friendIds = new Set<string>();
    sent?.forEach(f => friendIds.add(f.receiver_id));
    received?.forEach(f => friendIds.add(f.requester_id));

    if (friendIds.size > 0) {
      const { data: usersData } = await supabase.from('users').select('*').in('id', Array.from(friendIds));
      if (usersData) setFriends(usersData);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-4 border-b dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input type="text" placeholder="Search friends..." className="w-full bg-gray-100 dark:bg-gray-800 dark:text-white py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"/>
        </div>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600"/></div>
        ) : friends.length === 0 ? (
          <div className="text-center mt-20 text-gray-500 dark:text-gray-400 flex flex-col items-center">
            <UserX size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
            <p>No friends found.</p>
            <p className="text-sm mt-1">Add friends to start chatting!</p>
          </div>
        ) : (
          friends.map(u => {
            const isOnline = onlineUsers.has(u.id); // ✅ চেক করা হচ্ছে
            return (
              <div key={u.id} onClick={() => onSelectUser(u)} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors group">
                <div className="relative">
                   <img src={u.avatar} alt={u.name} className="w-14 h-14 rounded-full border border-gray-100 dark:border-gray-700 object-cover" />
                   {/* ✅ Green Dot Logic */}
                   {isOnline && (
                     <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse"></div>
                   )}
                </div>
                <div className="flex-1">
                   <h3 className="font-semibold text-gray-900 dark:text-white">{u.name}</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                     {isOnline ? <span className="text-green-600 font-medium">Active now</span> : 'Tap to chat'}
                   </p>
                </div>
                <MessageCircle size={20} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

export default ChatListScreen;