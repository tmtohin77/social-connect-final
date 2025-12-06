import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageCircle, UserPlus, UserCheck, UserMinus, Loader2 } from 'lucide-react';
import PostCard from '../components/ui/PostCard';

const UserProfile: React.FC<{ userId: string, onBack: () => void, onMessage: (u: any) => void }> = ({ userId, onBack, onMessage }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    // 1. User Info
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userData) setProfile(userData);

    // 2. Friendship Status
    const { data: friendship } = await supabase.from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user?.id})`)
      .maybeSingle(); // single or null
    
    if (friendship) {
        setFriendStatus(friendship.status); // 'pending' or 'accepted'
    } else {
        setFriendStatus('none');
    }

    // 3. Posts (Privacy Logic: Friend হলে দেখাবে, না হলে দেখাবে না)
    // Note: এখানে আমরা সব পোস্ট দেখাচ্ছি পাবলিক প্রোফাইল হিসেবে, চাইলে হাইড করা যায়
    const { data: postData } = await supabase.from('posts').select('*, users(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (postData) setPosts(postData);
    
    setLoading(false);
  };

  const sendRequest = async () => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: userId, status: 'pending' });
    setFriendStatus('pending');
  };

  const handleUnfriend = async () => {
    if (window.confirm("Are you sure you want to unfriend?")) {
        await supabase.from('friendships').delete()
          .or(`and(requester_id.eq.${user?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user?.id})`);
        setFriendStatus('none');
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 animate-fade-in">
        {/* Cover & Header */}
        <div className="bg-white dark:bg-gray-800 pb-4 shadow-sm relative">
            {/* Cover Photo */}
            <div className="h-40 bg-gray-300 relative">
                {profile.cover_photo ? (
                    <img src={profile.cover_photo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                )}
                <button onClick={onBack} className="absolute top-4 left-4 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40"><ArrowLeft size={20}/></button>
            </div>
            
            {/* Profile Info */}
            <div className="px-5 -mt-14 relative">
                <div className="flex justify-between items-end">
                    <img src={profile.avatar} className="w-28 h-28 rounded-2xl border-4 border-white dark:border-gray-800 bg-white object-cover" />
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-2">
                        {friendStatus === 'accepted' ? (
                            <>
                                <button onClick={() => onMessage(profile)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                    <MessageCircle size={18} /> Message
                                </button>
                                <button onClick={handleUnfriend} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2">
                                    <UserCheck size={18} />
                                </button>
                            </>
                        ) : friendStatus === 'pending' ? (
                            <button className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                                Request Sent
                            </button>
                        ) : (
                            <button onClick={sendRequest} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                <UserPlus size={18} /> Add Friend
                            </button>
                        )}
                    </div>
                </div>

                <h1 className="text-2xl font-bold mt-3 dark:text-white">{profile.name}</h1>
                <p className="text-gray-500">@{profile.email.split('@')[0]}</p>
                {profile.bio && <p className="mt-2 text-gray-700 dark:text-gray-300 max-w-md">{profile.bio}</p>}
            </div>
        </div>

        {/* Posts */}
        <div className="p-4 space-y-4">
            <h3 className="font-bold text-gray-500 text-sm uppercase">Posts</h3>
            {friendStatus !== 'accepted' && posts.length > 0 ? (
                <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <p className="text-gray-500">Add friend to see full posts and stories.</p>
                </div>
            ) : posts.length === 0 ? (
                <p className="text-center text-gray-500">No posts yet.</p>
            ) : (
                posts.map(post => <PostCard key={post.id} post={post} onCommentClick={()=>{}} />)
            )}
        </div>
    </div>
  );
};

export default UserProfile;