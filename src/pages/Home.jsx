import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Video, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMyContext } from '../context/MyContext';
import ProfileModal from '../components/profile/ProfileModal';

const Home = () => {
  const navigate = useNavigate();
  const { user, setShowAuthModal, showProfileModal, setShowProfileModal } = useAuth();
  const { interest, setMyInterest } = useMyContext();
  const [selectedMode, setSelectedMode] = useState(null);

  const handleChatStart = (mode) => {
    setSelectedMode(mode);

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Only show profile modal if user exists but profile is not complete
    if (!user.fullName || !user.dateOfBirth || !user.gender) {
      setShowProfileModal(true);
    } else {
      navigate(`/chat/${mode}`);
    }
  };

  const handleProfileSubmit = () => {
    setShowProfileModal(false);
    if (selectedMode) {
      navigate(`/chat/${selectedMode}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-blue-600">Talk to Strangers!</h1>
        <p className="text-xl text-gray-600 mb-8">
          Connect with random people worldwide through video or text chat
        </p>

        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-3xl mx-auto">
          <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center text-left">
            <AlertTriangle className="text-yellow-500 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-600 mb-1">WARNING!</h3>
              <p className="text-gray-700 text-sm">
                Video is monitored. Keep your conversations clean and appropriate.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">What do you wanna talk about?</h2>
            <input
              type="text"
              value={interest}
              onChange={(e) => setMyInterest(e.target.value)}
              placeholder="Add your interests"
              className="bluc-input mb-8"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => handleChatStart("text")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl p-6 flex flex-col items-center transition-all hover:shadow-md"
              >
                <MessageSquare size={40} className="mb-3 text-blue-600" />
                <span className="text-xl font-medium">Text</span>
              </button>

              <button
                onClick={() => handleChatStart('video')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 flex flex-col items-center transition-all hover:shadow-md"
              >
                <Video size={40} className="mb-3" />
                <span className="text-xl font-medium">Video</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          onSubmit={handleProfileSubmit}
          initialUserData={user}
        />
      )}
    </div>
  );
};

export default Home;
