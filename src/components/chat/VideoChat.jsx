import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Video, VideoOff, Mic, MicOff, Phone, SkipForward } from 'lucide-react';
import TextChat from './TextChat';
import { useNavigate } from "react-router-dom";

const VideoChat = ({ partnerId, mode }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { socket, startVideoCall, endVideoCall, disconnectFromMatch, next } = useChat();
  const { user } = useAuth();
  const { isConnecting, setIsConnecting } = useChat();
  const navigate = useNavigate();
  const [localStream, setLocalStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  useEffect(() => {
    initLocalStream();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      endVideoCall();
    };
  }, []);

  useEffect(() => {
    if (localStream && partnerId) {
      startVideoCall(partnerId, localStream, remoteVideoRef.current);
      setIsCallActive(true);
    }
  }, [localStream, partnerId]);

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setLocalStream(stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      setLocalStream(null);
    }
    endVideoCall();
    disconnectFromMatch(mode);
    navigate('/');
  };

  const handleSkipMatch = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    next(mode);
  };

  return (
    <div className="h-full flex">
      <div className="w-[70%] relative bg-gray-900">
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />

        <video
          ref={localVideoRef}
          className="absolute bottom-20 right-4 w-48 h-36 object-cover rounded-lg border-2 border-white"
          autoPlay
          playsInline
          muted
        />

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
          <button
            className="video-control-btn bg-gray-800 hover:bg-gray-700 p-3 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
          <button
            className="video-control-btn bg-gray-800 hover:bg-gray-700 p-3 rounded-full"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button
            className="video-control-btn bg-red-500 hover:bg-red-600 p-3 rounded-full"
            onClick={handleEndCall}
          >
            <Phone size={24} />
          </button>
          <button
            className="video-control-btn bg-gray-800 hover:bg-gray-700 p-3 rounded-full"
            onClick={handleSkipMatch}
          >
            <SkipForward size={24} />
          </button>
        </div>
      </div>

      <div className="w-[30%] border-l border-gray-200">
        <TextChat
          partnerId={partnerId}
          embedded={true}
        />
      </div>
    </div>
  );
};

export default VideoChat;