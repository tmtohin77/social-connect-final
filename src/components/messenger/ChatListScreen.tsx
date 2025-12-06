import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, MessageCircle, UserX, Loader2 } from 'lucide-react';

interface ChatListProps {
  onSelectUser: (user: any) => void;
}

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectUser }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    // ১. আমি যাদের ফলো করছি তাদের আইডি বের করো
    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user?.id);

    // ২. যারা আমাকে ফলো করছে তাদের আইডি বের করো (Optional: যদি মিউচুয়াল ফ্রেন্ড চাও)
    // আপাতত আমরা সহজ রাখি: যাদের আমি ফলো করেছি তাদের সাথেই চ্যাট করা যাবে।
    
    if (followingData && followingData.length > 0) {
      const friendIds = followingData.map(f => f.following_id);
      
      // ৩. সেই আইডিগুলোর ইউজার ডিটেইলস আনো
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', friendIds);
      
      if (usersData) setFriends(usersData);
    } else {
      setFriends([]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white pb-20 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 p-4 border-b">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search friends..." 
            className="w-full bg-gray-100 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Friends List */}
      <div className="p-2">
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600"/></div>
        ) : friends.length === 0 ? (
          <div className="text-center mt-20 text-gray-500 flex flex-col items-center">
            <UserX size={48} className="text-gray-300 mb-2" />
            <p>No friends found.</p>
            <p className="text-sm mt-1">Follow people to start chatting!</p>
          </div>
        ) : (
          friends.map(u => (
            <div key={u.id} onClick={() => onSelectUser(u)} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
              <div className="relative">
                 <img src={u.avatar} alt={u.name} className="w-14 h-14 rounded-full border border-gray-100 object-cover" />
                 <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1">
                 <h3 className="font-semibold text-gray-900">{u.name}</h3>
                 <p className="text-sm text-gray-500 truncate">Tap to message</p>
              </div>
              <MessageCircle size={20} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatListScreen;