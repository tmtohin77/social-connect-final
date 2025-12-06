import React, { useState, useEffect } from 'react';
import { X, Users, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface CreateGroupProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupProps> = ({ isOpen, onClose, onGroupCreated }) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchFriends();
  }, [isOpen]);

  const fetchFriends = async () => {
    // আগের ChatListScreen এর লজিক ব্যবহার করে ফ্রেন্ড লিস্ট আনো
    // সিম্পলিসিটির জন্য এখানে সরাসরি accepted ফ্রেন্ডদের আনছি
    const { data } = await supabase.from('friendships')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user?.id},receiver_id.eq.${user?.id}`);
    
    if (data) {
      const ids = new Set<string>();
      data.forEach(f => ids.add(f.requester_id === user?.id ? f.receiver_id : f.requester_id));
      
      const { data: users } = await supabase.from('users').select('*').in('id', Array.from(ids));
      if (users) setFriends(users);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedFriends);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedFriends(newSet);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedFriends.size === 0) return;
    setLoading(true);

    try {
      // ১. গ্রুপ তৈরি
      const { data: groupData, error } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          created_by: user?.id,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${groupName}`
        })
        .select()
        .single();

      if (error) throw error;

      // ২. মেম্বার অ্যাড করা (নিজেকে এবং বন্ধুদের)
      const members = Array.from(selectedFriends).map(fid => ({ group_id: groupData.id, user_id: fid }));
      members.push({ group_id: groupData.id, user_id: user?.id }); // Add myself

      await supabase.from('group_members').insert(members);

      onGroupCreated();
      onClose();
      setGroupName('');
      setSelectedFriends(new Set());
    } catch (err) {
      console.error(err);
      alert('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold dark:text-white">Create Group</h2>
          <button onClick={onClose}><X className="dark:text-white" /></button>
        </div>

        <div className="p-4 border-b dark:border-gray-700">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Group Name</label>
          <input 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Ex: Weekend Plan"
            className="w-full mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl focus:outline-blue-500 dark:text-white"
          />
        </div>

        <div className="p-2 flex-1 overflow-y-auto">
          <p className="px-2 text-xs text-gray-500 mb-2">Select Members ({selectedFriends.size})</p>
          {friends.map(f => (
            <div key={f.id} onClick={() => toggleSelect(f.id)} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <img src={f.avatar} className="w-10 h-10 rounded-full border object-cover" />
                <span className="font-bold dark:text-white">{f.name}</span>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedFriends.has(f.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                {selectedFriends.has(f.id) && <Check size={12} className="text-white" />}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t dark:border-gray-700">
          <button onClick={handleCreate} disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : <><Users size={20} /> Create Group</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;