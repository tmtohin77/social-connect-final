import React, { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, UserPlus, Loader2, Check, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*, sender:sender_id(name, avatar)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data);
    setLoading(false);
  };

  const handleAcceptRequest = async (senderId: string, notifId: string) => {
    // ১. ফ্রেন্ডশিপ স্ট্যাটাস আপডেট করো
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', senderId)
      .eq('receiver_id', user?.id);

    // ২. নোটিফিকেশন রিমুভ করো বা আপডেট করো
    await supabase.from('notifications').delete().eq('id', notifId);
    
    // UI Update
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    alert("Friend request accepted! You can now chat.");
  };

  const handleDeleteRequest = async (senderId: string, notifId: string) => {
    // রিকোয়েস্ট ডিলিট করা
    await supabase
      .from('friendships')
      .delete()
      .eq('requester_id', senderId)
      .eq('receiver_id', user?.id);

    await supabase.from('notifications').delete().eq('id', notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full sm:w-[400px] h-full shadow-2xl flex flex-col transition-colors">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10">
          <h2 className="text-xl font-bold dark:text-white">Notifications</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600"/></div>
          ) : notifications.length === 0 ? (
            <div className="text-center mt-20 text-gray-500 dark:text-gray-400">No notifications yet.</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex flex-col gap-2 p-3 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl transition-colors mb-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={n.sender?.avatar} className="w-12 h-12 rounded-full border object-cover" />
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white text-white
                      ${n.type === 'like' ? 'bg-red-500' : n.type === 'comment' ? 'bg-blue-500' : 'bg-green-500'}`}>
                      {n.type === 'like' ? <Heart size={10} fill="white"/> : n.type === 'comment' ? <MessageCircle size={10} fill="white"/> : <UserPlus size={10}/>}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-bold">{n.sender?.name}</span>{' '}
                      {n.type === 'like' && 'liked your post.'}
                      {n.type === 'comment' && 'commented on your post.'}
                      {n.type === 'friend_request' && 'sent you a friend request.'}
                      {n.type === 'friend_accept' && 'accepted your friend request.'}
                    </p>
                    <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Friend Request Actions */}
                {n.type === 'friend_request' && (
                  <div className="flex gap-2 ml-14">
                    <button onClick={() => handleAcceptRequest(n.sender_id, n.id)} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700">Confirm</button>
                    <button onClick={() => handleDeleteRequest(n.sender_id, n.id)} className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-300">Delete</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;