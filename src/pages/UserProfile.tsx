import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, UserPlus, UserCheck, MessageCircle, Clock, Loader2 } from 'lucide-react';
import PostCard from '../components/ui/PostCard';

// Props ইন্টারফেস আপডেট
interface UserProfileProps {
  userId: string;
  onBack: () => void;
  onMessage: (user: any) => void; // ✅ নতুন ফাংশন
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onBack, onMessage }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    // ১. প্রোফাইল ডেটা
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    setProfile(userData);

    // ২. পোস্ট
    const { data: postData } = await supabase.from('posts').select('*, users(name, avatar)').eq('user_id', userId).order('created_at', { ascending: false });
    if (postData) setPosts(postData);

    // ৩. ফ্রেন্ডশিপ স্ট্যাটাস
    const { data: friendship } = await supabase.from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user?.id})`)
      .single();
    
    if (friendship) {
        if (friendship.status === 'accepted') setFriendStatus('accepted');
        else if (friendship.requester_id === user?.id) setFriendStatus('sent');
        else setFriendStatus('received');
    }
    setLoading(false);
  };

  const handleRequest = async () => {
    if (friendStatus) return;
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: userId, status: 'pending' });
    setFriendStatus('sent');
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      <div className="bg-white dark:bg-gray-800 pb-4 shadow-sm">
        {/* Cover Photo */}
        <div className="h-40 bg-gray-300 relative overflow-hidden">
          {profile?.cover_photo ? (
            <img src={profile.cover_photo} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          )}
          <button onClick={onBack} className="absolute top-4 left-4 bg-black/30 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/50 transition-colors z-20">
            <ArrowLeft size={20} />
          </button>
        </div>
        
        {/* Profile Info (Fixed Overlap Issue with relative z-10) */}
        <div className="px-5 -mt-14 relative z-10">
          <img src={profile?.avatar} className="w-28 h-28 rounded-2xl border-4 border-white dark:border-gray-800 bg-white object-cover shadow-lg" />
          
          <h1 className="text-2xl font-bold mt-3 dark:text-white">{profile?.name}</h1>
          <p className="text-gray-500 text-sm">@{profile?.email?.split('@')[0]}</p>
          {profile?.bio && <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{profile.bio}</p>}
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-5">
            {friendStatus === 'accepted' ? (
                <button className="flex-1 bg-green-100 text-green-700 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2">
                    <UserCheck size={20} /> Friends
                </button>
            ) : friendStatus === 'sent' ? (
                <button className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2">
                    <Clock size={20} /> Sent
                </button>
            ) : (
                <button onClick={handleRequest} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                    <UserPlus size={20} /> Add Friend
                </button>
            )}

            {/* Message Button (Only works if friends, optional check removed for UX) */}
            <button 
                onClick={() => onMessage(profile)} 
                className="flex-1 bg-gray-100 dark:bg-gray-700 dark:text-white py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors active:scale-95"
            >
                <MessageCircle size={20} /> Message
            </button>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="p-4 space-y-4">
        <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wide">Recent Posts</h3>
        {posts.map(post => <PostCard key={post.id} post={post} onCommentClick={()=>{}} onProfileClick={()=>{}} />)}
      </div>
    </div>
  );
};

export default UserProfile;