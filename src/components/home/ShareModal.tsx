import React, { useState, useEffect } from 'react';
import { X, Send, Share, Copy, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, post }) => {
  const { user } = useAuth();
  const [view, setView] = useState<'main' | 'friends'>('main');
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentList, setSentList] = useState<Set<string>>(new Set());

  // ফ্রেন্ড লিস্ট লোড করা (মেসেজ পাঠানোর জন্য)
  useEffect(() => {
    if (view === 'friends') {
      fetchFriends();
    }
  }, [view]);

  const fetchFriends = async () => {
    // যারা ফ্রেন্ড রিকোয়েস্ট এক্সেপ্ট করেছে তাদের আইডি আনো
    const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user?.id).eq('status', 'accepted');
    const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user?.id).eq('status', 'accepted');

    const ids = new Set<string>();
    sent?.forEach(f => ids.add(f.receiver_id));
    received?.forEach(f => ids.add(f.requester_id));

    if (ids.size > 0) {
      const { data } = await supabase.from('users').select('*').in('id', Array.from(ids));
      if (data) setFriends(data);
    }
  };

  // ১. নিউজ ফিডে শেয়ার করা (Facebook Style)
  const handleShareToFeed = async () => {
    setLoading(true);
    try {
      // যদি এটা অলরেডি শেয়ারড পোস্ট হয়, তাহলে আসল পোস্টের আইডি নাও, না হলে বর্তমান পোস্টের আইডি
      const originalId = post.original_post_id ? post.original_post_id : post.id;

      await supabase.from('posts').insert({
        user_id: user?.id,
        content: `Shared a post`, // ডিফল্ট ক্যাপশন
        original_post_id: originalId // 🔥 এইটাই মেইন ম্যাজিক (আসল পোস্টের রেফারেন্স)
      });
      
      alert("Shared to your timeline!");
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ২. মেসেজে পাঠানো
  const handleSendMsg = async (receiverId: string) => {
    const postLink = `${window.location.origin}/post/${post.id}`;
    
    await supabase.from('messages').insert({
      sender_id: user?.id,
      receiver_id: receiverId,
      content: `Check this post: ${postLink}`
    });

    setSentList(prev => new Set(prev).add(receiverId));
  };

  // ৩. কপি লিংক
  const handleCopyLink = () => {
    const link = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(link);
    alert("Link copied!");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full sm:w-[450px] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl transition-colors">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-3">
          <h3 className="font-bold text-lg dark:text-white">
            {view === 'main' ? 'Share to' : 'Send to'}
          </h3>
          <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-600 dark:text-white">
            <X size={20} />
          </button>
        </div>

        {/* VIEW 1: Main Options */}
        {view === 'main' ? (
          <div className="space-y-4">
            <div className="flex gap-4 justify-around">
              {/* Share to Feed */}
              <button onClick={handleShareToFeed} disabled={loading} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                  {loading ? <Loader2 className="animate-spin"/> : <Share size={24} />}
                </div>
                <span className="text-xs font-medium dark:text-gray-300">News Feed</span>
              </button>

              {/* Send Message */}
              <button onClick={() => setView('friends')} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg group-active:scale-95 transition-transform">
                  <Send size={24} />
                </div>
                <span className="text-xs font-medium dark:text-gray-300">Send Msg</span>
              </button>
            </div>

            <div onClick={handleCopyLink} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mt-4">
              <div className="bg-white dark:bg-gray-600 p-2 rounded-lg"><Copy size={20} className="dark:text-white"/></div>
              <span className="font-semibold text-sm dark:text-white">Copy Link</span>
            </div>
          </div>
        ) : (
          /* VIEW 2: Friend List for Messaging */
          <div className="h-64 overflow-y-auto space-y-2">
            {friends.length === 0 ? (
                <p className="text-center text-gray-500 py-10">No friends found.</p>
            ) : (
                friends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl">
                    <div className="flex items-center gap-3">
                        <img src={friend.avatar} className="w-10 h-10 rounded-full border dark:border-gray-600" />
                        <span className="font-bold text-sm dark:text-white">{friend.name}</span>
                    </div>
                    <button 
                        onClick={() => handleSendMsg(friend.id)} 
                        disabled={sentList.has(friend.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${sentList.has(friend.id) ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'}`}
                    >
                        {sentList.has(friend.id) ? 'Sent' : 'Send'}
                    </button>
                </div>
                ))
            )}
            <button onClick={() => setView('main')} className="w-full mt-4 text-center text-sm text-gray-500 hover:underline">Back</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;