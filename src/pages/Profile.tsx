import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MapPin, Calendar, Edit3, Grid, Loader2 } from 'lucide-react';
import PostCard from '../components/ui/PostCard';
import EditProfileModal from '../components/profile/EditProfileModal';
import CommentModal from '../components/home/CommentModal';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const ProfileScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(user);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const { data: userData } = await supabase.from('users').select('*').eq('id', user?.id).single();
    if (userData) setProfile(userData);

    const { data: postData } = await supabase
      .from('posts')
      .select(`*, users (name, avatar), original_post:original_post_id (*, users(name, avatar))`)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (postData) setPosts(postData);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 animate-fade-in">
      {/* Cover & Header */}
      <div className="bg-white dark:bg-gray-800 pb-2 shadow-sm relative">
        <div className="h-48 md:h-64 bg-gray-300 dark:bg-gray-700 relative overflow-hidden group">
          {profile?.cover_photo ? (
            <img src={profile.cover_photo} alt="Cover" className="w-full h-full object-cover animate-fade-in" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>
          )}
          <Button variant="ghost" size="icon" onClick={onBack} className="absolute top-4 left-4 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </div>
        
        <div className="px-5 -mt-16 mb-4 flex flex-col md:flex-row items-center md:items-end md:justify-between gap-4">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-xl ring-2 ring-gray-100 dark:ring-gray-700">
                <AvatarImage src={profile?.avatar} className="object-cover" />
                <AvatarFallback className="text-2xl">{profile?.name?.substring(0, 2)}</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 text-center md:text-left mt-2 md:mt-0 md:mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.name}</h1>
                <p className="text-muted-foreground text-sm">@{profile?.email?.split('@')[0]}</p>
            </div>

            <Button onClick={() => setIsEditing(true)} className="mb-4 shadow-sm" variant="outline">
              <Edit3 size={16} className="mr-2" /> Edit Profile
            </Button>
        </div>

        <div className="px-5 pb-4">
             {profile?.bio && <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-w-2xl mx-auto md:mx-0 text-center md:text-left">{profile.bio}</p>}
             
             <div className="flex justify-center md:justify-start gap-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><MapPin size={16}/> Dhaka, BD</div>
                <div className="flex items-center gap-1"><Calendar size={16}/> Joined 2025</div>
             </div>

             <div className="flex justify-center md:justify-start gap-12 mt-6 border-t border-border/50 pt-4">
                <div className="text-center">
                    <span className="block font-bold text-xl text-foreground">{posts.length}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Posts</span>
                </div>
                <div className="text-center">
                    <span className="block font-bold text-xl text-foreground">120</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Followers</span>
                </div>
                <div className="text-center">
                    <span className="block font-bold text-xl text-foreground">85</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Following</span>
                </div>
            </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                <Grid size={20} />
            </div>
            <h3 className="font-bold text-lg text-foreground">My Posts</h3>
        </div>
        
        {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>
        ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-muted-foreground">No posts yet</p>
            </div>
        ) : (
            posts.map(post => (
                <PostCard 
                    key={post.id} 
                    post={post} 
                    onCommentClick={(id) => { setSelectedPostId(id); setShowComments(true); }} 
                    onDelete={fetchProfileData} 
                />
            ))
        )}
      </div>

      <EditProfileModal isOpen={isEditing} onClose={() => setIsEditing(false)} onUpdate={fetchProfileData} />
      <CommentModal isOpen={showComments} onClose={() => setShowComments(false)} postId={selectedPostId} />
    </div>
  );
};

export default ProfileScreen;