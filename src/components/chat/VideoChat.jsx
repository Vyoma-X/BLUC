import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Video, Mic, SkipForward } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import TextChat from './TextChat';

const VideoChat = ({ mode }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamInitializedRef = useRef(false);

  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [genderSelectionFrozen, setGenderSelectionFrozen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(33642);
  const { socket, startVideoCall, endVideoCall, disconnectFromMatch, next, selectedGender, setSelectedGender, trialTimer, trialUsed } = useChat();
  const { user, isPremium } = useAuth();
  const { isConnecting, setIsConnecting, isMatched, matchDetails } = useChat();
  const navigate = useNavigate();
  const [isCallActive, setIsCallActive] = useState(false);

  // Initialize local stream only once
  useEffect(() => {
    if (!streamInitializedRef.current) {
      initLocalStream();
      streamInitializedRef.current = true;
    }

    const handleUnload = () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      console.log("handling reload");
      if (isMatched) {
        endVideoCall();
       
      }
     
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      ;
    };
  }, [isMatched]);




  // Handle video call when matched
  useEffect(() => {
    if (localStream && matchDetails?.partnerId && !isCallActive) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      console.log("starting video call");
      startVideoCall(matchDetails.partnerId, localStream, remoteVideoRef.current);
      setIsCallActive(true);
    }
  }, [localStream, matchDetails, startVideoCall]);

  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setLocalStream(stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  useEffect(() => {
    handleSkipMatch();
  }, [selectedGender])

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

  const handleSkipMatch = () => {

    setIsCallActive(false);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    next(mode);
  };

  const selectGender = (gender) => {
    if (isPremium || (!trialUsed && trialTimer > 0)) {
      setSelectedGender(gender);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
  

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left side - Video area */}
        <div className="w-2/5 relative flex flex-col gap-[2%] p-2 overflow-hidden">
          {/* Remote Video */}
          <div className="flex-1 bg-black flex items-center justify-center relative rounded-md overflow-hidden">
            {(!isMatched || !isCallActive) && (
              <div className="absolute z-10 text-white text-lg">
                {isConnecting ? "Finding someone to chat with..." : "Waiting for match..."}
              </div>
            )}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Local Video */}
          <div className="flex-1 bg-gray-800 flex items-center justify-center relative rounded-md overflow-hidden">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
          </div>
        </div>

        {/* Right side - Chat area */}
        <div className="w-3/5 flex flex-col border-l border-gray-200 overflow-hidden">
          {/* Chat header */}
          <div className="p-4 border-b border-gray-200 text-center text-gray-700">
            {isMatched ? "You're now chatting with a random stranger. Say hi!" : "Waiting for a match..."}
          </div>

          {/* Chat area - embedding the TextChat component */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isMatched && matchDetails?.partnerId && (
              <TextChat partnerId={matchDetails.partnerId} embedded={true} />
            )}
            {!isMatched && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Waiting for a match to start chatting...
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 py-4 border-t border-gray-200">
            <button
              className={`${isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} p-3 rounded-full text-white`}
              onClick={toggleVideo}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              <Video size={24} />
            </button>
            <button
              className={`${isAudioEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} p-3 rounded-full text-white`}
              onClick={toggleAudio}
              title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              <Mic size={24} />
            </button>
            <button
              className="bg-blue-600 hover:bg-blue-700 p-3 rounded-full text-white"
              onClick={handleSkipMatch}
              title="Skip to next person"
            >
              <SkipForward size={24} />
            </button>
          </div>

          {/* Gender Selection */}
          <div className="p-2 flex justify-between items-center border-t border-gray-200">
            {!isPremium && !trialUsed && trialTimer > 0 && (
              <div className="text-sm text-gray-500">
                Free trial: {trialTimer}s remaining
              </div>
            )}
            {!isPremium && trialUsed && (
              <div className="text-sm text-gray-500">
                Upgrade to Premium for gender selection
              </div>
            )}
            {isPremium && (
              <div className="text-sm text-gray-500">
                Premium gender selection active
              </div>
            )}

            <div className="flex items-center">
              <button
                onClick={() => selectGender('female')}
                disabled={!isPremium && (trialUsed || trialTimer === 0)}
                className={`px-4 py-1 rounded-md ${!isPremium && (trialUsed || trialTimer === 0)
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : selectedGender === 'female'
                      ? "bg-blue-100 text-blue-700"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  } border border-gray-300 mr-2`}
              >
                Female
              </button>

              <button
                onClick={() => selectGender('male')}
                disabled={!isPremium && (trialUsed || trialTimer === 0)}
                className={`px-4 py-1 rounded-md ${!isPremium && (trialUsed || trialTimer === 0)
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : selectedGender === 'male'
                      ? "bg-blue-100 text-blue-700"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  } border border-gray-300`}
              >
                Male
              </button>

              {isPremium && (
                <span className="ml-2 text-xs text-blue-500 font-medium flex items-center">
                  Premium
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;