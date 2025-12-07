import React from 'react';
import { Phone, Video, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface IncomingCallProps {
  callerName: string;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallOverlay: React.FC<IncomingCallProps> = ({ callerName, isVideo, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white animate-fade-in">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
        <Avatar className="w-32 h-32 border-4 border-white/10 ring-4 ring-blue-500/50 relative z-10">
            <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">{callerName[0]}</AvatarFallback>
        </Avatar>
      </div>
      
      <h2 className="text-3xl font-bold mb-2">{callerName}</h2>
      <p className="text-gray-300 mb-16 flex items-center gap-2">
        {isVideo ? <Video size={18} /> : <Phone size={18} />} 
        Incoming {isVideo ? 'Video' : 'Audio'} Call...
      </p>

      <div className="flex gap-16 items-center">
        <div className="flex flex-col items-center gap-3 group">
            <button onClick={onReject} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 group-hover:scale-110 transition-transform active:scale-95">
                <X size={36} />
            </button>
            <span className="text-sm font-medium opacity-80">Decline</span>
        </div>

        <div className="flex flex-col items-center gap-3 group">
            <button onClick={onAccept} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40 group-hover:scale-110 transition-transform animate-bounce">
                {isVideo ? <Video size={32} /> : <Phone size={32} />}
            </button>
            <span className="text-sm font-medium opacity-80">Accept</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallOverlay;