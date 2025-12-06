import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/ui/PostCard';
import CreatePost from '../components/home/CreatePost';
import StoryCircle from '../components/home/StoryCircle';
import CommentModal from '../components/home/CommentModal';
import NotificationsModal from '../components/notifications/NotificationsModal';
import { Loader2, Bell, MessageCircle, X } from 'lucide-react';
import { appLogo } from '../data/mockData';

// ✅ ইন্টারফেস আপডেট করা হলো
interface HomeScreenProps {
  onOpenChat: () => void;
  onViewProfile?: (userId: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenChat, onViewProfile }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingStory, setUploadingStory] = useState(false);
  
  const [showComments, setShowComments] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [viewStory, setViewStory] = useState<string | null>(null);

  const storyInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPosts();
    fetchStories();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (name, avatar),
        original_post:original_post_id (
          id,
          content,
          image_url,
          created_at,
          users (name, avatar)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) setPosts(data);
    setLoading(false);
  };

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select('*, users(name, avatar)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (data) {
        const uniqueStories = Array.from(new Map(data.map(item => [item.user_id, item])).values());
        setStories(uniqueStories);
    }
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setUploadingStory(true);
    
    try {
      const file = e.target.files[0];
      const fileName = `story_${user?.id}_${Date.now()}`;
      await supabase.storage.from('stories').upload(fileName, file);
      const { data } = supabase.storage.from('stories').getPublicUrl(fileName);
      
      await supabase.from('stories').insert({
        user_id: user?.id,
        image_url: data.publicUrl
      });

      fetchStories();
    } catch (error) {
      console.error(error);
      alert('Failed to upload story');
    } finally {
      setUploadingStory(false);
    }
  };

  const openCommentModal = (postId: string) => {
    setSelectedPostId(postId);
    setShowComments(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-24 transition-colors duration-300">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-40 shadow-sm flex justify-between items-center border-b dark:border-gray-700 transition-colors">
        <div className="flex items-center gap-2">
            <img src={appLogo} alt="Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">SocialConnect</h1>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
               <Bell size={20} className="text-gray-700 dark:text-gray-200"/>
               <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </button>
            <button onClick={onOpenChat} className="relative p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
               <MessageCircle size={20} className="text-gray-700 dark:text-gray-200"/>
            </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Stories Section */}
        <div className="bg-white dark:bg-gray-800 py-4 border-b border-gray-100 dark:border-gray-700 mb-4 overflow-x-auto no-scrollbar flex gap-4 px-4 transition-colors">
            <div className="relative">
                <StoryCircle 
                    user={{ name: "You", avatar: user?.avatar || "" }} 
                    isAddStory 
                    onClick={() => storyInputRef.current?.click()} 
                />
                <input type="file" ref={storyInputRef} hidden accept="image/*" onChange={handleStoryUpload} />
                {uploadingStory && (
                    <div className="absolute inset-0 bg-white/50 rounded-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={20} />
                    </div>
                )}
            </div>
            
            {stories.map((story) => (
                <StoryCircle key={story.id} user={story.users} onClick={() => setViewStory(story.image_url)} />
            ))}
        </div>

        <div className="px-4">
            <CreatePost onPostCreated={fetchPosts} />
        </div>

        <div className="px-4 mt-2">
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <p className="text-lg font-medium">No posts yet 😢</p>
                    <p className="text-sm">Be the first to share something!</p>
                </div>
            ) : (
                posts.map(post => (
                    <PostCard 
                        key={post.id} 
                        post={post} 
                        onCommentClick={openCommentModal} 
                        onDelete={fetchPosts}
                        onProfileClick={onViewProfile} // ✅ প্রপস পাস করা হলো
                    />
                ))
            )}
        </div>
      </div>

      <CommentModal isOpen={showComments} onClose={() => setShowComments(false)} postId={selectedPostId} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {viewStory && (
        <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center" onClick={() => setViewStory(null)}>
            <img src={viewStory} className="max-h-full max-w-full object-contain" />
            <button className="absolute top-4 right-4 text-white p-2 bg-white/20 rounded-full"><X size={24} /></button>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;