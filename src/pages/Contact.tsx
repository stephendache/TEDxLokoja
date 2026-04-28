import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

export default function Contact() {
  const [eventSettings, setEventSettings] = useState({
    venue: 'College of Health Sciences (COHS) Auditorium',
    venueAddress: 'Federal University Lokoja, Adankolo Campus'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'eventDetails'));
        if (settingsDoc.exists()) {
          setEventSettings(settingsDoc.data() as any);
        }
      } catch (error) {
        console.error("Error fetching event settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'contactMessages'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      toast.success('Message sent successfully!');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
      handleFirestoreError(error, OperationType.CREATE, 'contactMessages');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <SEO 
        title="Contact Us" 
        description="Get in touch with the TEDx Lokoja team. We'd love to hear from you regarding tickets, sponsorships, or general inquiries."
      />
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
        <p className="text-xl text-gray-600">Have questions? We'd love to hear from you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-50 p-8 rounded-3xl border border-gray-100"
        >
          <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={5} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all" placeholder="How can we help you?"></textarea>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-70">
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Event Location</h3>
              <p className="text-gray-600">
                {eventSettings.venue}<br />
                {eventSettings.venueAddress}<br />
                Lokoja, Kogi State, Nigeria
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Email Us</h3>
              <p className="text-gray-600">
                <a href="mailto:tedxlokoja.cmtty@gmail.com" className="hover:text-red-600 transition-colors">tedxlokoja.cmtty@gmail.com</a><br />
                {/* <a href="mailto:sponsorship@tedxlokoja.com" className="hover:text-red-600 transition-colors">sponsorship@tedxlokoja.com</a> */}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Call Us</h3>
              <p className="text-gray-600">
                +234 (0) 800 000 0000<br />
                Mon-Fri from 9am to 5pm
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
