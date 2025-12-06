import React, { useEffect, useState } from 'react';
import { X, Heart, MessageCircle, UserPlus, Loader2 } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full sm:w-[400px] h-full shadow-2xl flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold">Notifications</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600"/></div>
          ) : notifications.length === 0 ? (
            <div className="text-center mt-20 text-gray-500">No notifications yet.</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer">
                <div className="relative">
                  <img src={n.sender?.avatar} className="w-12 h-12 rounded-full border object-cover" />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white text-white
                    ${n.type === 'like' ? 'bg-red-500' : n.type === 'comment' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                    {n.type === 'like' ? <Heart size={10} fill="white"/> : n.type === 'comment' ? <MessageCircle size={10} fill="white"/> : <UserPlus size={10}/>}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="font-bold">{n.sender?.name}</span>{' '}
                    {n.type === 'like' ? 'liked your post.' : n.type === 'comment' ? 'commented on your post.' : 'started following you.'}
                  </p>
                  <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                </div>
                {n.type === 'like' || n.type === 'comment' ? (
                   <div className="w-10 h-10 bg-gray-200 rounded-lg"></div> // Post Preview Placeholder
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;