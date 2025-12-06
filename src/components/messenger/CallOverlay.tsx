import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

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
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative overflow-hidden">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-white flex-col gap-4">
            <div className="w-24 h-24 bg-gray-700 rounded-full animate-pulse"></div>
            <p>Connecting with {callerName}...</p>
          </div>
        )}

        {/* My Video (Small Overlay) */}
        {isVideo && (
          <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <video ref={myVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`} />
            {isCameraOff && <div className="w-full h-full flex items-center justify-center text-white text-xs">Camera Off</div>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-6 flex justify-center gap-8 backdrop-blur-md">
        <button onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button onClick={onEndCall} className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg scale-110">
          <PhoneOff size={28} />
        </button>

        {isVideo && (
          <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOff ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}>
            {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;