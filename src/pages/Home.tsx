import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/ui/PostCard'; // এই ইমপোর্টটা জরুরি
import CreatePost from '../components/home/CreatePost';
import StoryCircle from '../components/home/StoryCircle';
import CommentModal from '../components/home/CommentModal';
import NotificationsModal from '../components/notifications/NotificationsModal';
import { Loader2, Bell, MessageCircle } from 'lucide-react';
import { appLogo } from '../data/mockData';

interface HomeScreenProps {
  onOpenChat: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenChat }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showComments, setShowComments] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, users(name, avatar)')
      .order('created_at', { ascending: false });

    if (!error && data) setPosts(data);
    setLoading(false);
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
            <StoryCircle user={{ name: "You", avatar: user?.avatar || "" }} isAddStory onClick={() => {}} />
            {[1,2,3,4,5].map((i) => (
                <StoryCircle key={i} user={{ name: `User ${i}`, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}` }} onClick={() => {}} />
            ))}
        </div>

        {/* Create Post */}
        <div className="px-4">
            <CreatePost onPostCreated={fetchPosts} />
        </div>

        {/* Feed Section */}
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
                    <PostCard key={post.id} post={post} onCommentClick={openCommentModal} />
                ))
            )}
        </div>
      </div>

      {/* Modals */}
      <CommentModal isOpen={showComments} onClose={() => setShowComments(false)} postId={selectedPostId} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
};

export default HomeScreen;