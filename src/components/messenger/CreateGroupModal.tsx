import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { X, Check, Loader2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onGroupCreated }) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen) fetchFriends();
  }, [isOpen]);

  const fetchFriends = async () => {
    setFetching(true);
    if (!user) return;

    // Fetch friends logic
    const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'accepted');
    const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id).eq('status', 'accepted');
    
    const friendIds = new Set<string>();
    sent?.forEach(f => friendIds.add(f.receiver_id));
    received?.forEach(f => friendIds.add(f.requester_id));

    if (friendIds.size > 0) {
      const { data } = await supabase.from('users').select('*').in('id', Array.from(friendIds));
      if (data) setFriends(data);
    }
    setFetching(false);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedFriends(newSelected);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedFriends.size === 0) return;
    setLoading(true);

    try {
      // 1. Create Group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          created_by: user?.id,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${groupName}`
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Add Members (Creator + Selected Friends)
      const members = Array.from(selectedFriends).map(friendId => ({
        group_id: groupData.id,
        user_id: friendId
      }));

      // Add myself to the group
      members.push({
        group_id: groupData.id,
        user_id: user!.id
      });

      const { error: memberError } = await supabase.from('group_members').insert(members);

      if (memberError) throw memberError;

      // Success
      setGroupName('');
      setSelectedFriends(new Set());
      onGroupCreated();
      onClose();

    } catch (error: any) {
      console.error('Error creating group:', error);
      alert(`Failed to create group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input 
              placeholder="e.g. Chill Zone" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Members ({selectedFriends.size})</label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
                {fetching ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin"/></div>
                ) : friends.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm p-4">No friends found.</p>
                ) : (
                    friends.map(friend => (
                        <div 
                            key={friend.id} 
                            onClick={() => toggleSelect(friend.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selectedFriends.has(friend.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={friend.avatar} />
                                    <AvatarFallback>{friend.name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{friend.name}</span>
                            </div>
                            {selectedFriends.has(friend.id) && <Check size={16} className="text-blue-600" />}
                        </div>
                    ))
                )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !groupName || selectedFriends.size === 0}>
            {loading ? <Loader2 className="animate-spin mr-2"/> : <Users className="mr-2 h-4 w-4"/>}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;