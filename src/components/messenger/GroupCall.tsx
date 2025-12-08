import React, { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface GroupCallProps {
  groupId: string;
  onLeave: () => void;
}

interface PeerStream {
  peerId: string;
  stream: MediaStream;
}

// STUN Servers for better connectivity
const peerConfig = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

const GroupCall: React.FC<GroupCallProps> = ({ groupId, onLeave }) => {
  const { user } = useAuth();
  const [peers, setPeers] = useState<PeerStream[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  
  // Refs for cleanup
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const myPeerRef = useRef<Peer | null>(null);
  const peersRef = useRef<PeerStream[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    startCall();

    // Cleanup function when component unmounts
    return () => {
      endCall();
    };
  }, []);

  const startCall = async () => {
    try {
      // 1. Get Media Stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      myStreamRef.current = stream;
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      // 2. Init Peer
      const peer = new Peer(user?.id + '-' + groupId, peerConfig);
      myPeerRef.current = peer;

      peer.on('open', (id) => {
        // 3. Join Presence Channel
        const channel = supabase.channel(`group_call:${groupId}`, {
            config: { presence: { key: id } }
        });
        channelRef.current = channel;

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = Object.values(state).flat() as any[];
            setParticipants(users);
            
            // Connect to existing users
            users.forEach((u: any) => {
                if (u.presence_ref !== id) {
                   connectToPeer(u.presence_ref, stream, peer);
                }
            });
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ 
                    user_id: user?.id, 
                    peer_id: id,
                    name: user?.name,
                    avatar: user?.avatar 
                });
            }
        });

        // 4. Handle Incoming Calls
        peer.on('call', (call) => {
            call.answer(stream);
            call.on('stream', (remoteStream) => {
                addPeerStream(call.peer, remoteStream);
            });
        });
      });

    } catch (err) {
      console.error("Camera Error:", err);
      alert("Camera access denied or device not found.");
      onLeave();
    }
  };

  const connectToPeer = (peerId: string, stream: MediaStream, peer: Peer) => {
    // Prevent duplicate calls
    if (peersRef.current.find(p => p.peerId === peerId)) return;

    const call = peer.call(peerId, stream);
    call.on('stream', (remoteStream) => {
        addPeerStream(peerId, remoteStream);
    });
    call.on('close', () => {
        removePeerStream(peerId);
    });
    call.on('error', () => {
        removePeerStream(peerId);
    });
  };

  const addPeerStream = (peerId: string, stream: MediaStream) => {
    setPeers((prev) => {
        if (prev.find(p => p.peerId === peerId)) return prev;
        const newPeers = [...prev, { peerId, stream }];
        peersRef.current = newPeers;
        return newPeers;
    });
  };

  const removePeerStream = (peerId: string) => {
    setPeers((prev) => {
        const newPeers = prev.filter(p => p.peerId !== peerId);
        peersRef.current = newPeers;
        return newPeers;
    });
  };

  // ✅ FORCE STOP CAMERA & MIC
  const endCall = () => {
    // Stop all tracks (Video & Audio)
    if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        myStreamRef.current = null;
    }

    // Destroy Peer Connection
    if (myPeerRef.current) {
        myPeerRef.current.destroy();
        myPeerRef.current = null;
    }

    // Leave Supabase Channel
    if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
    }
  };

  const handleLeaveButton = () => {
    endCall();
    onLeave();
  };

  const toggleMute = () => {
    if (myStreamRef.current) {
      myStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (myStreamRef.current) {
      myStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsCameraOff(!isCameraOff);
    }
  };

  const getUserInfo = (peerId: string) => {
    const p = participants.find((part: any) => part.presence_ref === peerId);
    return p || { name: 'User', avatar: '' };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-white">
            <Users size={20} />
            <span className="font-bold text-lg">Group Call ({peers.length + 1})</span>
        </div>
        <div className="bg-red-600 px-3 py-1 rounded-full text-white text-xs font-bold animate-pulse shadow-red-500/50 shadow-lg">
            LIVE
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid gap-4 overflow-y-auto content-center justify-center 
        grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr">
        
        {/* My Video */}
        <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-800 shadow-2xl group">
            <video 
                ref={myVideoRef} 
                muted 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'hidden' : ''}`} 
            />
            {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 bg-gray-800">
                    <Avatar className="w-20 h-20 border-4 border-gray-700">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>ME</AvatarFallback>
                    </Avatar>
                    <p className="text-white font-bold">You</p>
                </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded-lg text-white text-xs backdrop-blur-md font-bold">
                You {isMuted && ' (Muted)'}
            </div>
        </div>

        {/* Remote Participants */}
        {peers.map((peer) => {
            const info = getUserInfo(peer.peerId);
            return (
                <div key={peer.peerId} className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-800 shadow-xl">
                    <VideoPlayer stream={peer.stream} />
                    <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded-lg text-white text-xs backdrop-blur-md flex items-center gap-2">
                        <Avatar className="w-5 h-5 border border-white/50">
                            <AvatarImage src={info.avatar} />
                        </Avatar>
                        <span className="font-bold max-w-[100px] truncate">{info.name}</span>
                    </div>
                </div>
            );
        })}

        {peers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="text-white/50 text-center animate-pulse">
                    <Loader2 size={48} className="mx-auto mb-2 animate-spin"/>
                    <p>Waiting for others to join...</p>
                </div>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 flex justify-center gap-8 bg-black/60 backdrop-blur-xl border-t border-white/10 z-20">
        <button onClick={toggleMute} className={`p-4 rounded-full transition-all active:scale-90 shadow-lg ${isMuted ? 'bg-white text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button onClick={handleLeaveButton} className="p-5 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-xl shadow-red-600/40 scale-110 active:scale-95 transition-all">
          <PhoneOff size={32} />
        </button>

        <button onClick={toggleVideo} className={`p-4 rounded-full transition-all active:scale-90 shadow-lg ${isCameraOff ? 'bg-white text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
            {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
      </div>
    </div>
  );
};

const VideoPlayer: React.FC<{ stream: MediaStream }> = ({ stream }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);
    return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
};

export default GroupCall;