import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, UserCheck, Search, Loader2, UserMinus } from 'lucide-react';

const FriendsScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'suggestions' | 'all'>('requests');
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (!user) return;

    if (activeTab === 'requests') {
      // যারা আমাকে রিকোয়েস্ট দিয়েছে
      const { data } = await supabase
        .from('friendships')
        .select('id, requester:requester_id(*)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      
      if (data) setDataList(data.map(d => ({ ...d.requester, friendship_id: d.id })));
    
    } else if (activeTab === 'suggestions') {
      // যারা ফ্রেন্ড না এবং রিকোয়েস্টও দেয়নি (Simple Logic)
      const { data: users } = await supabase.from('users').select('*').neq('id', user.id).limit(20);
      
      // Filter out existing friends/requests logic would be here (Simplified for now)
      if (users) setDataList(users);

    } else if (activeTab === 'all') {
        // আমার সব ফ্রেন্ডস
        const { data: sent } = await supabase.from('friendships').select('receiver:receiver_id(*)').eq('requester_id', user.id).eq('status', 'accepted');
        const { data: received } = await supabase.from('friendships').select('requester:requester_id(*)').eq('receiver_id', user.id).eq('status', 'accepted');
        
        const list = [
            ...(sent?.map(d => d.receiver) || []),
            ...(received?.map(d => d.requester) || [])
        ];
        setDataList(list);
    }
    setLoading(false);
  };

  const handleAccept = async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    fetchData(); // Refresh
  };

  const handleDelete = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchData();
  };

  const sendRequest = async (receiverId: string) => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: receiverId, status: 'pending' });
    alert("Request Sent!");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Friends</h1>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            {['requests', 'suggestions', 'all'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600"/></div>
        ) : dataList.length === 0 ? (
            <div className="text-center mt-20 text-gray-500 dark:text-gray-400">No users found.</div>
        ) : (
            <div className="space-y-3">
                {dataList.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <img src={u.avatar} className="w-12 h-12 rounded-full border object-cover" />
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{u.name}</h3>
                                <p className="text-xs text-gray-500">@{u.email?.split('@')[0]}</p>
                            </div>
                        </div>

                        {/* Actions based on Tab */}
                        {activeTab === 'requests' && (
                            <div className="flex gap-2">
                                <button onClick={() => handleAccept(u.friendship_id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Confirm</button>
                                <button onClick={() => handleDelete(u.friendship_id)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold">Delete</button>
                            </div>
                        )}

                        {activeTab === 'suggestions' && (
                            <button onClick={() => sendRequest(u.id)} className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                                <UserPlus size={16}/> Add
                            </button>
                        )}

                        {activeTab === 'all' && (
                            <button className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                                <UserCheck size={16}/> Friends
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default FriendsScreen;