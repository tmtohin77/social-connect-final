import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface CallOverlayProps {
  stream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  isVideo: boolean;
  callerName: string;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ stream, remoteStream, onEndCall, isVideo, callerName }) => {
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    if (myVideoRef.current && stream) myVideoRef.current.srcObject = stream;
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [stream, remoteStream]);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsCameraOff(!isCameraOff);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col animate-fade-in">
      {/* Remote Video (Full Screen) - Not Mirrored */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-6 bg-gradient-to-b from-gray-800 to-gray-900">
            <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white/10 ring-4 ring-blue-500/30 animate-pulse">
                    <AvatarFallback className="text-4xl bg-blue-600 text-white">{callerName[0]}</AvatarFallback>
                </Avatar>
            </div>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
                <p className="text-blue-300 animate-pulse">Connecting...</p>
            </div>
          </div>
        )}

        {/* My Video (Small Overlay) - ✅ Mirrored */}
        {isVideo && (
          <div className="absolute top-4 right-4 w-32 h-48 bg-black/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-white/20 transition-all hover:scale-105">
            <video 
                ref={myVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'hidden' : ''}`} 
            />
            {isCameraOff && <div className="w-full h-full flex items-center justify-center text-white text-xs bg-gray-800">Camera Off</div>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 z-50">
        <div className="bg-black/40 backdrop-blur-xl px-8 py-4 rounded-3xl flex gap-6 border border-white/10 shadow-2xl">
            <button onClick={toggleMute} className={`p-4 rounded-full transition-all active:scale-95 ${isMuted ? 'bg-white text-black' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}>
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            
            <button onClick={onEndCall} className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg shadow-red-600/30 scale-110 active:scale-95 transition-all">
            <PhoneOff size={28} />
            </button>

            {isVideo && (
            <button onClick={toggleCamera} className={`p-4 rounded-full transition-all active:scale-95 ${isCameraOff ? 'bg-white text-black' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}>
                {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;