import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import VideoChat from '../components/chat/VideoChat';
import TextChat from '../components/chat/TextChat';
import MatchWaiting from '../components/chat/MatchWaiting';
import PremiumModal from '../components/premium/PremiumModal';
import TimerNotification from '../components/premium/TimerNotification';
import { useMyContext } from '../context/MyContext';

const Chat = () => {
  const { mode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    initializeSocket,
    disconnectSocket,
    isConnecting,
    isMatched,
    matchDetails
  } = useChat();

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const { interest } = useMyContext();
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes for free users
  const [countdownInterval, setCountdownInterval] = useState(null);

  useEffect(() => {
    // Initialize socket connection when component mounts
    initializeSocket(user.gender, interest, user.fullName, mode);

    // Clean up socket connection when component unmounts
    return () => {
      clearInterval(countdownInterval);
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    // Start timer for video chat for free users
    if (isMatched && mode === 'video' && !user.isPremium) {
      setShowTimer(true);

      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowPremiumModal(true);
            setShowTimer(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setCountdownInterval(interval);

      return () => clearInterval(interval);
    }
  }, [isMatched, mode, user.isPremium]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handlePremiumModalClose = () => {
    setShowPremiumModal(false);

  };

  return (
    <div className="h-[calc(100vh-64px)]">
      {isConnecting && !isMatched && (
        <MatchWaiting onCancel={handleGoHome} />
      )}

      {isMatched && (
        <>
          {mode === 'video' ? (
            <VideoChat partnerId={matchDetails.partnerId} mode={mode} />
          ) : (
            <TextChat partnerId={matchDetails.partnerId} mode={mode} />
          )}

          {showTimer && (
            <TimerNotification
              timeRemaining={timeRemaining}
            />
          )}
        </>
      )}
      {showPremiumModal && (
        <PremiumModal onClose={handlePremiumModalClose} />
      )}
    </div>
  );
};

export default Chat;