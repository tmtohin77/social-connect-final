import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

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
  
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // স্ট্রিম ভিডিওতে সেট করা
  useEffect(() => {
    if (myVideoRef.current && stream) myVideoRef.current.srcObject = stream;
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [stream, remoteStream]);

  // মাইক এবং ক্যামেরা টগল
  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !micOn;
      setMicOn(!micOn);
    }
  };

  const toggleCam = () => {
    if (stream && isVideo) {
      stream.getVideoTracks()[0].enabled = !camOn;
      setCamOn(!camOn);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center">
      {/* Remote Video (Full Screen) */}
      <div className="absolute inset-0 w-full h-full">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
              {callerName[0]}
            </div>
            <h2 className="text-2xl font-bold">{callerName}</h2>
            <p className="text-gray-400 animate-pulse">Connecting...</p>
          </div>
        )}
      </div>

      {/* My Video (Small Window) */}
      {isVideo && (
        <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden shadow-lg border border-gray-700">
          <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 flex items-center gap-6 bg-gray-800/80 backdrop-blur-md px-8 py-4 rounded-full">
        <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${micOn ? 'bg-gray-600 text-white' : 'bg-white text-black'}`}>
          {micOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button onClick={onEndCall} className="p-5 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg scale-110 active:scale-95 transition-transform">
          <PhoneOff size={32} />
        </button>

        {isVideo && (
          <button onClick={toggleCam} className={`p-4 rounded-full transition-all ${camOn ? 'bg-gray-600 text-white' : 'bg-white text-black'}`}>
            {camOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;