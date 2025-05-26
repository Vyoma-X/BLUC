import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X } from 'lucide-react';

const ProfileModal = ({ onClose, onSubmit, initialUserData }) => {
  const { updateProfile } = useAuth();
  // Initialize form data from initialUserData only once
  const [formData, setFormData] = useState({
    fullName: initialUserData?.fullName || '',
    dateOfBirth: initialUserData?.dateOfBirth
      ? new Date(initialUserData.dateOfBirth).toISOString().split('T')[0]
      : '',
    gender: initialUserData?.gender || 'male',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenderSelect = (gender) => {
    setFormData(prev => ({ ...prev, gender }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Age validation: user must be at least 18 years old
    if (formData.dateOfBirth) {
      const today = new Date();
      const dob = new Date(formData.dateOfBirth);
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        setError('You must be at least 18 years old to use this service.');
        setLoading(false);
        return;
      }
    }

    try {
      // Format date of birth before sending to API
      const profileData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : ''
      };

      await updateProfile(profileData);
      onSubmit();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => handleGenderSelect('male')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.gender === 'male'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                    }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-2">👨</span>
                    <span className="font-medium">Male</span>
                  </div>
                </div>
                <div
                  onClick={() => handleGenderSelect('female')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.gender === 'female'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300'
                    }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-2">👩</span>
                    <span className="font-medium">Female</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;