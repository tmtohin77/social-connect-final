import React from 'react';

interface ChatBubbleProps {
  message: {
    id: number;
    text: string;
    time: string;
    isSent: boolean;
  };
  showAvatar?: boolean;
  avatar?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, showAvatar, avatar }) => {
  const { text, time, isSent } = message;

  return (
    <div className={`flex items-end gap-2 mb-2 ${isSent ? 'flex-row-reverse' : ''}`}>
      {!isSent && showAvatar && avatar && (
        <img src={avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
      )}
      {!isSent && !showAvatar && <div className="w-7" />}
      
      <div className={`max-w-[70%] ${isSent ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isSent
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-200 text-gray-800 rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
        <p className={`text-[10px] text-gray-400 mt-1 ${isSent ? 'text-right' : 'text-left'}`}>
          {time}
        </p>
      </div>
    </div>
  );
};

export default ChatBubble;
