import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MapPin, Calendar, MessageCircle, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import PostCard from '../components/ui/PostCard';
import { useAuth } from '../context/AuthContext';

interface UserProfileProps {
  userId: string;
  onBack: () => void;
  onMessage: (user: any) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onBack, onMessage }) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    // ১. প্রোফাইল ডেটা
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userData) setProfile(userData);

    // ২. ফ্রেন্ডশিপ স্ট্যাটাস
    const { data: friendship } = await supabase
      .from('friendships')
      .select('status, requester_id')
      .or(`and(requester_id.eq.${currentUser?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${currentUser?.id})`)
      .maybeSingle(); // single() দিলে ডাটা না থাকলে এরর দেয়, তাই maybeSingle()

    if (friendship) {
        setFriendStatus(friendship.status);
    }

    // ৩. পোস্ট
    const { data: postData } = await supabase
      .from('posts')
      .select(`
        *,
        users (name, avatar),
        original_post:original_post_id (id, content, image_url, created_at, users (name, avatar))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (postData) setPosts(postData);
    setLoading(false);
  };

  const handleFriendRequest = async () => {
    if (friendStatus === 'none') {
        await supabase.from('friendships').insert({ requester_id: currentUser?.id, receiver_id: userId, status: 'pending' });
        setFriendStatus('pending');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      {/* Cover & Header */}
      <div className="bg-white dark:bg-gray-800 pb-4 rounded-b-3xl shadow-sm relative">
        <div className="h-40 bg-gray-300 dark:bg-gray-700 relative overflow-hidden">
          {profile?.cover_photo ? <img src={profile.cover_photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500"></div>}
          <button onClick={onBack} className="absolute top-4 left-4 bg-black/20 p-2 rounded-full text-white hover:bg-black/40"><ArrowLeft size={20} /></button>
        </div>
        
        <div className="px-5 -mt-14 mb-4">
          <div className="flex justify-between items-end">
            <img src={profile?.avatar} className="w-28 h-28 rounded-2xl border-4 border-white dark:border-gray-800 shadow-md bg-white object-cover" />
            <div className="flex gap-2 mb-2">
                <button onClick={() => onMessage(profile)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:text-white"><MessageCircle size={20}/></button>
                <button onClick={handleFriendRequest} disabled={friendStatus !== 'none'} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${friendStatus === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'}`}>
                    {friendStatus === 'accepted' ? <UserCheck size={16}/> : friendStatus === 'pending' ? 'Pending' : <><UserPlus size={16}/> Add Friend</>}
                </button>
            </div>
          </div>
          
          <div className="mt-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">@{profile?.email?.split('@')[0]}</p>
            {profile?.bio && <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm">{profile.bio}</p>}
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