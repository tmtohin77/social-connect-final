import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Mic, MicOff, Volume2 } from 'lucide-react';

interface IncomingCallOverlayProps {
  caller: { name: string; avatar: string };
  callType: 'audio' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
  caller,
  callType,
  onAccept,
  onDecline,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    setIsConnected(true);
  };

  const handleEnd = () => {
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-between py-12 animate-fade-in">
      {/* Caller Info */}
      <div className="text-center mt-8">
        <div className="relative mx-auto mb-6">
          <img
            src={caller.avatar}
            alt={caller.name}
            className={`w-32 h-32 rounded-full object-cover border-4 border-white/20 
              ${!isConnected ? 'animate-pulse' : ''}`}
          />
          {callType === 'video' && isConnected && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{caller.name}</h2>
        <p className="text-gray-400">
          {isConnected
            ? formatDuration(callDuration)
            : callType === 'video'
            ? 'Incoming video call...'
            : 'Incoming audio call...'}
        </p>
      </div>

      {/* Call Controls */}
      {isConnected ? (
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full ${
              isMuted ? 'bg-red-500' : 'bg-white/20'
            } hover:opacity-80 transition-opacity`}
          >
            {isMuted ? (
              <MicOff size={28} className="text-white" />
            ) : (
              <Mic size={28} className="text-white" />
            )}
          </button>
          <button
            onClick={handleEnd}
            className="p-5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={32} className="text-white" />
          </button>
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`p-4 rounded-full ${
              isSpeaker ? 'bg-blue-500' : 'bg-white/20'
            } hover:opacity-80 transition-opacity`}
          >
            <Volume2 size={28} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-12">
          <button
            onClick={handleEnd}
            className="p-5 bg-red-500 rounded-full hover:bg-red-600 transition-colors 
              shadow-lg shadow-red-500/30"
          >
            <PhoneOff size={32} className="text-white" />
          </button>
          <button
            onClick={handleAccept}
            className="p-5 bg-green-500 rounded-full hover:bg-green-600 transition-colors 
              shadow-lg shadow-green-500/30 animate-pulse"
          >
            {callType === 'video' ? (
              <Video size={32} className="text-white" />
            ) : (
              <Phone size={32} className="text-white" />
            )}
          </button>
        </div>
      )}

      {/* Swipe hint */}
      {!isConnected && (
        <p className="text-gray-500 text-sm">
          Swipe up to answer with video
        </p>
      )}
    </div>
  );
};

export default IncomingCallOverlay;
