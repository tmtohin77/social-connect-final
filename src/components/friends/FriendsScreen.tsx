import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, UserCheck, Search, Loader2, MoreVertical, X, Clock } from 'lucide-react';

interface FriendsProps {
  onViewProfile: (userId: string) => void;
}

const FriendsScreen: React.FC<FriendsProps> = ({ onViewProfile }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'main' | 'sent_requests'>('main');
  const [requests, setRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]); // আমি যাদের পাঠিয়েছি
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [viewMode]);

  const fetchAllData = async () => {
    setLoading(true);
    if (!user) return;

    if (viewMode === 'main') {
        // 1. Received Requests
        const { data: reqData } = await supabase.from('friendships').select('id, requester:requester_id(*)').eq('receiver_id', user.id).eq('status', 'pending');
        if (reqData) setRequests(reqData.map(d => ({ ...d.requester, friendship_id: d.id })));

        // 2. Suggestions Logic... (Previous Logic)
        const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id);
        const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id);
        const excludeIds = new Set<string>([user.id]);
        sent?.forEach(d => excludeIds.add(d.receiver_id));
        received?.forEach(d => excludeIds.add(d.requester_id));

        const { data: users } = await supabase.from('users').select('*').limit(20);
        if (users) setSuggestions(users.filter(u => !excludeIds.has(u.id)));

    } else {
        // Fetch Sent Requests
        const { data: sentData } = await supabase.from('friendships').select('id, receiver:receiver_id(*)').eq('requester_id', user.id).eq('status', 'pending');
        if (sentData) setSentRequests(sentData.map(d => ({ ...d.receiver, friendship_id: d.id })));
    }
    setLoading(false);
  };

  const handleAccept = async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    fetchAllData();
  };

  const handleDelete = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchAllData(); // Refresh list
  };

  const sendRequest = async (receiverId: string) => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: receiverId, status: 'pending' });
    setSuggestions(prev => prev.filter(u => u.id !== receiverId));
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-10 shadow-sm border-b dark:border-gray-700 flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">
            {viewMode === 'main' ? 'Friends' : 'Sent Requests'}
        </h1>
        
        {/* 3-Dot Menu */}
        <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white">
                <MoreVertical size={20} />
            </button>
            
            {showMenu && (
                <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 shadow-xl border dark:border-gray-700 rounded-xl w-48 z-20 py-2">
                    <button 
                        onClick={() => { setViewMode('sent_requests'); setShowMenu(false); }} 
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium dark:text-white"
                    >
                        View Sent Requests
                    </button>
                    <button 
                        onClick={() => { setViewMode('main'); setShowMenu(false); }} 
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium dark:text-white"
                    >
                        Find Friends
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* --- View Mode: Sent Requests --- */}
        {viewMode === 'sent_requests' && (
            <div className="space-y-3">
                {sentRequests.length === 0 ? <p className="text-center text-gray-500">No sent requests.</p> : sentRequests.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border dark:border-gray-700">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(u.id)}>
                            <img src={u.avatar} className="w-12 h-12 rounded-full border object-cover" />
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{u.name}</h3>
                                <p className="text-xs text-gray-500">Request pending</p>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(u.friendship_id)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1 items-center">
                            <X size={14}/> Cancel
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* --- View Mode: Main (Requests + Suggestions) --- */}
        {viewMode === 'main' && (
            <>
                {requests.length > 0 && (
                    <div>
                        <h3 className="font-bold text-gray-500 mb-3 uppercase text-xs">Friend Requests</h3>
                        <div className="space-y-3">
                            {requests.map(u => (
                                <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border dark:border-gray-700">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(u.id)}>
                                        <img src={u.avatar} className="w-12 h-12 rounded-full border object-cover" />
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white">{u.name}</h3>
                                            <p className="text-xs text-gray-500">wants to be friends</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAccept(u.friendship_id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Confirm</button>
                                        <button onClick={() => handleDelete(u.friendship_id)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="font-bold text-gray-500 mb-3 uppercase text-xs">People You May Know</h3>
                    {suggestions.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 mb-3 rounded-xl shadow-sm border dark:border-gray-700">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(u.id)}>
                                <img src={u.avatar} className="w-12 h-12 rounded-full border object-cover" />
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{u.name}</h3>
                                    <p className="text-xs text-gray-500">Suggested for you</p>
                                </div>
                            </div>
                            <button onClick={() => sendRequest(u.id)} className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                                <UserPlus size={16}/> Add
                            </button>
                        </div>
                    ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default FriendsScreen;