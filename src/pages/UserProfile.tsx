import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import PostCard from '../components/ui/PostCard';

const UserProfile: React.FC<{ userId: string, onBack: () => void, onMessage: (u: any) => void }> = ({ userId, onBack, onMessage }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFriend, setIsFriend] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    // 1. User Info
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userData) setProfile(userData);

    // 2. Friendship Status
    const { data: friendData } = await supabase.from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user?.id})`)
      .eq('status', 'accepted');
    
    if (friendData && friendData.length > 0) setIsFriend(true);

    // 3. Posts
    const { data: postData } = await supabase.from('posts').select('*, users(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (postData) setPosts(postData);
  };

  const sendRequest = async () => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: userId, status: 'pending' });
    alert('Request Sent!');
  };

  if (!profile) return <div className="text-center p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 animate-fade-in">
        {/* Cover & Info similar to ProfileScreen but with Actions */}
        <div className="bg-white dark:bg-gray-800 pb-4 shadow-sm">
            <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                <button onClick={onBack} className="absolute top-4 left-4 bg-white/20 p-2 rounded-full text-white"><ArrowLeft /></button>
            </div>
            <div className="px-5 -mt-14">
                <img src={profile.avatar} className="w-28 h-28 rounded-2xl border-4 border-white dark:border-gray-800 bg-white" />
                <h1 className="text-2xl font-bold mt-2 dark:text-white">{profile.name}</h1>
                <p className="text-gray-500">@{profile.email.split('@')[0]}</p>
                {profile.bio && <p className="mt-2 text-gray-700 dark:text-gray-300">{profile.bio}</p>}
                
                <div className="flex gap-3 mt-4">
                    {isFriend ? (
                        <>
                            <button className="flex-1 bg-gray-100 dark:bg-gray-700 text-green-600 font-bold py-2 rounded-xl flex justify-center items-center gap-2">
                                <UserCheck size={20} /> Friends
                            </button>
                            <button onClick={() => onMessage(profile)} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl flex justify-center items-center gap-2">
                                <MessageCircle size={20} /> Message
                            </button>
                        </>
                    ) : (
                        <button onClick={sendRequest} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl flex justify-center items-center gap-2">
                            <UserPlus size={20} /> Add Friend
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="p-4 space-y-4">
            {posts.map(post => <PostCard key={post.id} post={post} onCommentClick={()=>{}} />)}
        </div>
    </div>
  );
};

export default UserProfile;