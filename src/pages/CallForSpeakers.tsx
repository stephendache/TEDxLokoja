import React, { useState } from 'react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Mic, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

export default function CallForSpeakers() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    topic: '',
    description: '',
    pastExperience: '',
    links: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'speakerApplications'), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        topic: formData.topic,
        description: formData.description,
        pastExperience: formData.pastExperience || null,
        links: formData.links || null,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('There was an error submitting your application. Please try again.');
      handleFirestoreError(error, OperationType.CREATE, 'speakerApplications');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Application Received!</h2>
          <p className="text-gray-600 mb-8">
            Thank you for your interest in speaking at TEDx Lokoja 2026. Our curation team will review your application and get back to you soon.
          </p>
          <button 
            onClick={() => {
              setIsSuccess(false);
              setFormData({ name: '', email: '', phone: '', topic: '', description: '', pastExperience: '', links: '' });
            }}
            className="text-red-600 font-medium hover:underline"
          >
            Submit another application
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <SEO 
        title="Call for Speakers" 
        description="Have an idea worth spreading? Apply to speak at TEDx Lokoja 2026 and share your vision with our community."
      />
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mic size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Call for Speakers</h1>
          <p className="text-xl text-gray-600">
            Have an idea worth spreading? Apply to speak at TEDx Lokoja 2026.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input 
                required
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                placeholder="+234 800 000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proposed Topic / Idea *</label>
              <input 
                required
                type="text"
                value={formData.topic}
                onChange={e => setFormData({...formData, topic: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                placeholder="What is the core idea of your talk?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Talk Description *</label>
              <textarea 
                required
                rows={5}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                placeholder="Provide a brief outline of your talk and why it matters..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Past Speaking Experience (Optional)</label>
              <textarea 
                rows={3}
                value={formData.pastExperience}
                onChange={e => setFormData({...formData, pastExperience: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                placeholder="Have you spoken at events before? Tell us about it."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Links to Previous Talks / Portfolio (Optional)</label>
              <input 
                type="text"
                value={formData.links}
                onChange={e => setFormData({...formData, links: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
                placeholder="YouTube, LinkedIn, Personal Website..."
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
