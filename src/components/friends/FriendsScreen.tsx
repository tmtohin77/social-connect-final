import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, UserCheck, Search, Loader2 } from 'lucide-react';

const FriendsScreen: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    if (!user) return;

    // 1. Requests
    const { data: reqData } = await supabase.from('friendships').select('id, requester:requester_id(*)').eq('receiver_id', user.id).eq('status', 'pending');
    if (reqData) setRequests(reqData.map(d => ({ ...d.requester, friendship_id: d.id })));

    // 2. Friends
    const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'accepted');
    const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id).eq('status', 'accepted');
    const friendIds = new Set<string>([...(sent?.map(d => d.receiver_id) || []), ...(received?.map(d => d.requester_id) || [])]);
    
    // 3. Suggestions (Not friends, not requests, not me)
    const excludeIds = new Set([...friendIds, user.id]);
    // Also exclude pending sent requests
    const { data: pendingSent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'pending');
    pendingSent?.forEach(d => excludeIds.add(d.receiver_id));
    
    const { data: users } = await supabase.from('users').select('*').limit(20);
    if (users) {
        setSuggestions(users.filter(u => !excludeIds.has(u.id)));
    }

    setLoading(false);
  };

  const handleAccept = async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    fetchAllData();
  };

  const handleReject = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchAllData();
  };

  const sendRequest = async (receiverId: string) => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: receiverId, status: 'pending' });
    setSuggestions(prev => prev.filter(u => u.id !== receiverId)); // Remove from UI
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-10 shadow-sm border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold dark:text-white">Friends</h1>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Friend Requests */}
        {requests.length > 0 && (
            <div>
                <h3 className="font-bold text-gray-500 mb-3 uppercase text-xs">Friend Requests ({requests.length})</h3>
                <div className="space-y-3">
                    {requests.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <img src={u.avatar} className="w-12 h-12 rounded-full border object-cover" />
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{u.name}</h3>
                                    <p className="text-xs text-gray-500">wants to be friends</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleAccept(u.friendship_id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Confirm</button>
                                <button onClick={() => handleReject(u.friendship_id)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Suggestions */}
        <div>
            <h3 className="font-bold text-gray-500 mb-3 uppercase text-xs">People You May Know</h3>
            {suggestions.length === 0 ? <p className="text-gray-400 text-sm">No suggestions available.</p> : (
                <div className="grid grid-cols-1 gap-3">
                    {suggestions.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border dark:border-gray-700">
                            <div className="flex items-center gap-3">
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
            )}
        </div>
      </div>
    </div>
  );
};

export default FriendsScreen;