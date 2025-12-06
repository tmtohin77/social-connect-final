import React from 'react';
import { Phone, Video, X } from 'lucide-react';

interface IncomingCallProps {
  callerName: string;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallOverlay: React.FC<IncomingCallProps> = ({ callerName, isVideo, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center text-white animate-fade-in">
      <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-6 animate-pulse">
        {isVideo ? <Video size={40} /> : <Phone size={40} />}
      </div>
      <h2 className="text-2xl font-bold mb-2">{callerName}</h2>
      <p className="text-gray-300 mb-12">Incoming {isVideo ? 'Video' : 'Audio'} Call...</p>

      <div className="flex gap-12">
        <button onClick={onReject} className="flex flex-col items-center gap-2 group">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <X size={32} />
          </div>
          <span className="text-sm">Decline</span>
        </button>

        <button onClick={onAccept} className="flex flex-col items-center gap-2 group">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform animate-bounce">
            {isVideo ? <Video size={32} /> : <Phone size={32} />}
          </div>
          <span className="text-sm">Accept</span>
        </button>
      </div>
    </div>
  );
};

export default IncomingCallOverlay;