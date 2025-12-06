import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallProps {
  callerName: string; // আমরা স্ট্রিং নাম পাঠাবো
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallOverlay: React.FC<IncomingCallProps> = ({ callerName, isVideo, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-white">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-lg border-4 border-gray-600 animate-pulse">
          {callerName[0]?.toUpperCase()}
        </div>
        <h2 className="text-3xl font-bold mb-2">{callerName}</h2>
        <p className="text-gray-400 flex items-center gap-2">
          {isVideo ? <Video size={18} /> : <Phone size={18} />}
          Incoming {isVideo ? 'Video' : 'Audio'} Call...
        </p>
      </div>

      <div className="flex gap-16 items-center">
        {/* Reject Button */}
        <div className="flex flex-col items-center gap-2">
          <button onClick={onReject} className="p-5 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-xl transition-transform active:scale-95 animate-bounce">
            <PhoneOff size={32} />
          </button>
          <span className="text-sm font-medium text-gray-300">Decline</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-2">
          <button onClick={onAccept} className="p-5 bg-green-500 rounded-full text-white hover:bg-green-600 shadow-xl transition-transform active:scale-95 animate-bounce delay-100">
            <Phone size={32} />
          </button>
          <span className="text-sm font-medium text-gray-300">Accept</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallOverlay;