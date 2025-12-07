import React from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface StoryCircleProps {
  user: {
    name?: string;
    avatar?: string;
  };
  isAddStory?: boolean;
  viewed?: boolean;
  onClick: () => void;
}

const StoryCircle: React.FC<StoryCircleProps> = ({ user, isAddStory, viewed, onClick }) => {
  const userName = user?.name || "User";
  const userAvatar = user?.avatar || "";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-w-[80px] group transition-transform active:scale-95"
    >
      <div className={`relative p-[3px] rounded-full transition-all duration-300 ${
        isAddStory 
          ? 'bg-transparent border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500' 
          : viewed 
            ? 'bg-gray-300 dark:bg-gray-700' 
            : 'bg-gradient-to-tr from-yellow-400 via-orange-500 to-purple-600 shadow-md group-hover:shadow-lg hover:rotate-3'
      }`}>
        <div className="bg-white dark:bg-gray-900 p-[3px] rounded-full">
          <Avatar className="w-16 h-16 ring-2 ring-transparent">
            <AvatarImage src={userAvatar} className="object-cover group-hover:scale-110 transition-transform duration-500" />
            <AvatarFallback>{userName.substring(0, 2)}</AvatarFallback>
          </Avatar>
        </div>

        {isAddStory && (
          <div className="absolute bottom-0 right-0 translate-x-1 translate-y-1">
            <div className="bg-blue-600 rounded-full p-1.5 border-4 border-white dark:border-gray-900 shadow-sm">
              <Plus size={14} className="text-white" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-20 text-center group-hover:text-blue-600 transition-colors">
        {isAddStory ? 'Add Story' : userName.split(' ')[0]}
      </span>
    </button>
  );
};

export default StoryCircle;