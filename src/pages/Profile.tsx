import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Mail, Calendar, Edit2, Save, X } from 'lucide-react';

export default function Profile() {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-xl text-gray-600">Please log in to view your profile.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!displayName.trim()) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const joinDate = profile.createdAt?.toDate 
    ? profile.createdAt.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden"
      >
        <div className="bg-red-600 h-32 relative">
          <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-full p-2 shadow-lg">
            <div className="w-full h-full bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <User size={40} />
            </div>
          </div>
        </div>

        <div className="pt-16 px-8 pb-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              {isEditing ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-2xl font-bold text-gray-900 border-b-2 border-red-600 focus:outline-none bg-transparent px-1 py-1"
                    placeholder="Enter display name"
                    autoFocus
                  />
                  <button 
                    onClick={handleSave}
                    disabled={isSaving || !displayName.trim()}
                    className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <Save size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(profile.displayName || '');
                    }}
                    disabled={isSaving}
                    className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">{profile.displayName || 'No Name Set'}</h1>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Edit Name"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
              <div className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium uppercase tracking-wider">
                {profile.role}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-500 shadow-sm">
                <Mail size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Email Address</p>
                <p className="text-gray-900 font-medium">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-gray-500 shadow-sm">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Member Since</p>
                <p className="text-gray-900 font-medium">{joinDate}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
