import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageCircle, UserPlus, UserCheck, UserMinus, Loader2, Lock, X } from 'lucide-react';
import PostCard from '../components/ui/PostCard';
import { formatDistanceToNow } from 'date-fns';

const UserProfile: React.FC<{ userId: string, onBack: () => void, onMessage: (u: any) => void }> = ({ userId, onBack, onMessage }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'sent'>('none');
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  
  // Modals
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [showFriendList, setShowFriendList] = useState(false);
  const [friendList, setFriendList] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    // 1. User Info
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userData) setProfile(userData);

    // 2. Friendship Status Check
    const { data: sent } = await supabase.from('friendships').select('*').eq('requester_id', user?.id).eq('receiver_id', userId).maybeSingle();
    const { data: received } = await supabase.from('friendships').select('*').eq('requester_id', userId).eq('receiver_id', user?.id).maybeSingle();

    if (sent) {
        setFriendStatus(sent.status === 'accepted' ? 'accepted' : 'sent');
    } else if (received) {
        setFriendStatus(received.status === 'accepted' ? 'accepted' : 'pending');
    } else {
        setFriendStatus('none');
    }

    // 3. Count Friends
    const { count } = await supabase.from('friendships').select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');
    setFriendCount(count || 0);

    // 4. Fetch Posts (ONLY IF FRIEND or PUBLIC LOGIC)
    if (sent?.status === 'accepted' || received?.status === 'accepted' || userId === user?.id) {
        const { data: postData } = await supabase.from('posts').select('*, users(*)').eq('user_id', userId).order('created_at', { ascending: false });
        if (postData) setPosts(postData);
    } else {
        setPosts([]); // Not friend, hide posts
    }
    
    setLoading(false);
  };

  const fetchFriendList = async () => {
    const { data } = await supabase.from('friendships')
        .select('requester_id, receiver_id')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');
    
    if (data) {
        const ids = data.map(f => f.requester_id === userId ? f.receiver_id : f.requester_id);
        const { data: users } = await supabase.from('users').select('*').in('id', ids);
        if (users) setFriendList(users);
    }
    setShowFriendList(true);
  };

  const sendRequest = async () => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: userId, status: 'pending' });
    setFriendStatus('sent');
  };

  const handleUnfriend = async () => {
    await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${user?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user?.id})`);
    
    // Also delete messages logic can be handled by Database Trigger (Next Step)
    setFriendStatus('none');
    setPosts([]); // Hide posts immediately
    setShowUnfriendModal(false);
  };

  const handleAccept = async () => {
    await supabase.from('friendships').update({ status: 'accepted' })
        .eq('requester_id', userId).eq('receiver_id', user?.id);
    setFriendStatus('accepted');
    fetchData(); // Reload to show posts
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 pb-4 shadow-sm relative mb-4">
            {/* Cover Photo */}
            <div className="h-48 bg-gray-300 relative group">
                {profile.cover_photo ? (
                    <img src={profile.cover_photo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                )}
                <button onClick={onBack} className="absolute top-4 left-4 bg-black/30 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/50 transition"><ArrowLeft size={20}/></button>
            </div>
            
            {/* Profile Info (Overlapping Cover) */}
            <div className="px-5 relative -mt-16 flex flex-col items-center sm:items-start sm:flex-row sm:justify-between">
                <div className="flex flex-col items-center sm:items-start">
                    <div className="relative p-1 bg-white dark:bg-gray-800 rounded-2xl">
                        <img src={profile.avatar} className="w-32 h-32 rounded-xl border object-cover" />
                        {/* Active Status Indicator (Fake for now, Realtime in context) */}
                        <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    
                    <div className="mt-2 text-center sm:text-left">
                        <h1 className="text-2xl font-bold dark:text-white">{profile.name}</h1>
                        <p className="text-gray-500 text-sm">@{profile.email.split('@')[0]}</p>
                        {profile.bio && <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm max-w-md">{profile.bio}</p>}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 sm:mt-16 flex gap-2">
                    {friendStatus === 'accepted' ? (
                        <>
                            <button onClick={() => onMessage(profile)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                                <MessageCircle size={18} /> Message
                            </button>
                            <button onClick={() => setShowUnfriendModal(true)} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white px-3 py-2 rounded-lg font-bold hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30">
                                <UserCheck size={18} />
                            </button>
                        </>
                    ) : friendStatus === 'sent' ? (
                        <button disabled className="bg-gray-200 dark:bg-gray-700 text-gray-500 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                            Request Sent
                        </button>
                    ) : friendStatus === 'pending' ? (
                        <button onClick={handleAccept} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700">
                            <UserCheck size={18} /> Confirm Request
                        </button>
                    ) : (
                        <button onClick={sendRequest} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                            <UserPlus size={18} /> Add Friend
                        </button>
                    )}
                </div>
            </div>

            {/* Friend Count Clickable */}
            <div className="px-5 mt-4">
                <button onClick={fetchFriendList} className="flex gap-1 items-center hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition">
                    <span className="font-bold text-gray-900 dark:text-white">{friendCount}</span>
                    <span className="text-gray-500 text-sm">Friends</span>
                </button>
            </div>
        </div>

        {/* Posts Area */}
        <div className="p-4 space-y-4 max-w-xl mx-auto">
            <h3 className="font-bold text-gray-500 text-sm uppercase">Posts</h3>
            
            {friendStatus !== 'accepted' && userId !== user?.id ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 text-center">
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-3">
                        <Lock size={32} className="text-gray-400" />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white">This account is private</h3>
                    <p className="text-gray-500 text-sm mt-1">Add friend to see their photos and stories.</p>
                </div>
            ) : posts.length === 0 ? (
                <p className="text-center text-gray-500 mt-10">No posts yet.</p>
            ) : (
                posts.map(post => <PostCard key={post.id} post={post} onCommentClick={()=>{}} />)
            )}
        </div>

        {/* Unfriend Confirmation Modal */}
        {showUnfriendModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-up">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Unfriend {profile.name}?</h3>
                    <p className="text-gray-500 text-sm mb-6">Are you sure? You won't be able to message or see their posts anymore.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowUnfriendModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold">Cancel</button>
                        <button onClick={handleUnfriend} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Unfriend</button>
                    </div>
                </div>
            </div>
        )}

        {/* Friend List Modal */}
        {showFriendList && (
            <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col animate-slide-up">
                <div className="p-4 border-b dark:border-gray-800 flex items-center gap-3">
                    <button onClick={() => setShowFriendList(false)}><ArrowLeft className="dark:text-white"/></button>
                    <h2 className="font-bold text-lg dark:text-white">Friends ({friendList.length})</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {friendList.map(f => (
                        <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
                            <img src={f.avatar} className="w-12 h-12 rounded-full border object-cover" />
                            <span className="font-bold dark:text-white">{f.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default UserProfile;