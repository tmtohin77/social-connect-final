import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface PostCardProps {
  post: any;
  onCommentClick: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onCommentClick }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);

  useEffect(() => {
    if (user) checkLikeStatus();
  }, [user]);

  const checkLikeStatus = async () => {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user?.id)
      .single();
    if (data) setLiked(true);
  };

  const handleLike = async () => {
    if (!user) return;
    const previousLiked = liked;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);

    if (previousLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sm:rounded-xl sm:border sm:shadow-sm mb-4 transition-colors duration-300">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px] rounded-full">
            <img src={post.users?.avatar} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{post.users?.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><MoreHorizontal size={20} /></button>
      </div>

      {/* Content */}
      {post.content && <p className="px-4 pb-3 text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{post.content}</p>}

      {/* Image */}
      {post.image_url && (
        <div className="relative bg-gray-100 dark:bg-gray-900">
          <img src={post.image_url} className="w-full h-auto max-h-[500px] object-cover" loading="lazy" />
        </div>
      )}

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-5">
            <button onClick={handleLike} className="group transition-transform active:scale-90">
              <Heart size={26} className={`${liked ? 'fill-red-500 text-red-500' : 'text-gray-800 dark:text-gray-300 hover:text-gray-500'}`} />
            </button>
            <button onClick={() => onCommentClick(post.id)} className="group transition-transform active:scale-90">
              <MessageCircle size={26} className="text-gray-800 dark:text-gray-300 hover:text-blue-500 -rotate-90" />
            </button>
            <button className="group transition-transform active:scale-90">
              <Share2 size={24} className="text-gray-800 dark:text-gray-300 hover:text-green-500" />
            </button>
          </div>
          <Bookmark size={26} className="text-gray-800 dark:text-gray-300 hover:text-gray-500" />
        </div>

        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{likeCount} likes</p>
        <button onClick={() => onCommentClick(post.id)} className="text-gray-500 dark:text-gray-400 text-sm hover:underline">
          View all comments
        </button>
      </div>
    </div>
  );
};

export default PostCard;