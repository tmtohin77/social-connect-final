import React, { useState, useEffect } from 'react';
import { X, Send, Link, Copy, Check, Users, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, post }) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) fetchFriends();
  }, [isOpen]);

  const fetchFriends = async () => {
    // সিম্পল ফ্রেন্ড লিস্ট ফেচিং (চ্যাটে পাঠানোর জন্য)
    const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user?.id).eq('status', 'accepted');
    const { data: recv } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user?.id).eq('status', 'accepted');
    
    const ids = new Set([...(sent?.map(d => d.receiver_id) || []), ...(recv?.map(d => d.requester_id) || [])]);
    if (ids.size > 0) {
        const { data } = await supabase.from('users').select('*').in('id', Array.from(ids)).limit(5);
        if (data) setFriends(data);
    }
  };

  const handleShareToFeed = async () => {
    setLoading(true);
    try {
      await supabase.from('posts').insert({
        user_id: user?.id,
        content: caption,
        original_post_id: post.id // এটাই শেয়ার লজিক
      });
      alert('Shared to your feed!');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInMessenger = async (receiverId: string) => {
    const postLink = `${window.location.origin}/post/${post.id}`; // বা পোস্টের প্রিভিউ
    await supabase.from('messages').insert({
        sender_id: user?.id,
        receiver_id: receiverId,
        content: `Shared a post: ${post.content?.substring(0, 30)}...`,
        type: 'text'
    });
    alert('Sent!');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold dark:text-white">Share Post</h3>
          <button onClick={onClose}><X className="dark:text-white"/></button>
        </div>

        {/* Share Input */}
        <div className="p-4">
            <div className="flex gap-3 mb-4">
                <img src={user?.avatar} className="w-10 h-10 rounded-full border" />
                <div className="flex-1">
                    <h4 className="font-bold text-sm dark:text-white">{user?.name}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded w-fit mt-1">
                        <Globe size={12}/> Public
                    </div>
                </div>
            </div>
            <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something about this..." 
                className="w-full bg-transparent text-gray-800 dark:text-white outline-none resize-none h-20 placeholder-gray-400"
            />
            
            {/* Post Preview (Original Post) */}
            <div className="border rounded-xl p-3 mt-2 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                    <img src={post.users?.avatar} className="w-6 h-6 rounded-full" />
                    <span className="font-bold text-sm dark:text-white">{post.users?.name}</span>
                </div>
                {post.image_url && <img src={post.image_url} className="w-full h-32 object-cover rounded-lg" />}
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.content}</p>
            </div>

            <button onClick={handleShareToFeed} disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold mt-4 hover:bg-blue-700 transition">
                {loading ? 'Sharing...' : 'Share Now'}
            </button>
        </div>

        {/* Send in Messenger */}
        <div className="p-4 border-t dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-500 mb-3">Send in Messenger</h4>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {friends.map(f => (
                    <div key={f.id} className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer" onClick={() => handleSendInMessenger(f.id)}>
                        <img src={f.avatar} className="w-12 h-12 rounded-full border dark:border-gray-600" />
                        <span className="text-xs truncate w-full text-center dark:text-gray-300">{f.name.split(' ')[0]}</span>
                        <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-[-10px] z-10 border-2 border-white dark:border-gray-800"><Send size={10}/></div>
                    </div>
                ))}
            </div>
        </div>

        {/* Copy Link */}
        <div className="p-4 border-t dark:border-gray-700 flex gap-4">
            <button onClick={copyLink} className="flex-1 flex flex-col items-center gap-1 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition">
                <div className="bg-gray-200 dark:bg-gray-600 p-2 rounded-full">
                    {copied ? <Check size={20} className="text-green-600"/> : <Link size={20} className="dark:text-white"/>}
                </div>
                <span className="text-xs dark:text-gray-300">{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button className="flex-1 flex flex-col items-center gap-1 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition">
                <div className="bg-gray-200 dark:bg-gray-600 p-2 rounded-full"><Users size={20} className="dark:text-white"/></div>
                <span className="text-xs dark:text-gray-300">Group</span>
            </button>
        </div>

      </div>
    </div>
  );
};

export default ShareModal;