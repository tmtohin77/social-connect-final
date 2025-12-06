import React from 'react';
import { Plus } from 'lucide-react';

interface StoryCircleProps {
  user: {
    name: string;
    avatar: string;
  };
  isAddStory?: boolean;
  viewed?: boolean;
  onClick: () => void;
}

const StoryCircle: React.FC<StoryCircleProps> = ({ user, isAddStory, viewed, onClick }) => {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 min-w-[72px] group transition-transform active:scale-95">
      <div className={`relative p-[2px] rounded-full ${isAddStory ? 'bg-transparent' : viewed ? 'bg-gray-300' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'}`}>
        <div className="bg-white p-[2px] rounded-full">
          <div className="relative w-16 h-16 rounded-full overflow-hidden">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            {isAddStory && (
              <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-white translate-x-1 translate-y-1">
                <Plus size={14} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-700 truncate w-16 text-center">
        {isAddStory ? 'Your Story' : user.name.split(' ')[0]}
      </span>
    </button>
  );
};

export default StoryCircle;