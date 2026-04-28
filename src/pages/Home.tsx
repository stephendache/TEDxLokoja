import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, MapPin, Users, Mic, Lightbulb, Globe, ArrowRight, Twitter, Facebook, Linkedin, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

const faqs = [
  { q: "What is the refund policy?", a: "All ticket sales are final. We do not offer refunds or exchanges, except in the event that the conference is entirely canceled." },
  { q: "Can I buy tickets at the venue?", a: "We strongly recommend purchasing tickets online in advance as they often sell out quickly. On-site tickets are subject to availability." },
  { q: "Is there parking available?", a: "Yes, there is ample parking available at the Federal University Lokoja, Adankolo Campus for all attendees." },
  { q: "Will food be provided?", a: "Yes, lunch and light refreshments during breaks are included with your ticket purchase." }
];

interface Speaker {
  id: string;
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
}

const FAQItem: React.FC<{ question: string, answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-6">
      <button onClick={() => setIsOpen(!isOpen)} className="flex justify-between items-center w-full text-left font-bold text-xl focus:outline-none group">
        <span className="group-hover:text-red-600 transition-colors">{question}</span>
        {isOpen ? <ChevronUp size={24} className="text-red-600 shrink-0 ml-4" /> : <ChevronDown size={24} className="text-gray-400 shrink-0 ml-4 group-hover:text-red-600 transition-colors" />}
      </button>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 text-gray-600 leading-relaxed text-lg"
        >
          {answer}
        </motion.div>
      )}
    </div>
  );
}

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'today' | 'past'>('upcoming');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [eventSettings, setEventSettings] = useState({
    date: '16th May, 2026',
    time: '9:00 AM - 5:00 PM',
    venue: 'College of Health Sciences (COHS) Auditorium',
    venueAddress: 'Federal University Lokoja, Adankolo Campus',
    countdownTarget: '2026-05-16T09:00:00'
  });

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

  useEffect(() => {
    const targetDateObj = new Date(eventSettings.countdownTarget || '2026-05-16T09:00:00');
    const targetDate = targetDateObj.getTime();

    const checkStatusAndUpdateTime = () => {
      const nowObj = new Date();
      const now = nowObj.getTime();
      const distance = targetDate - now;

      const isSameDay = nowObj.getFullYear() === targetDateObj.getFullYear() && 
                        nowObj.getMonth() === targetDateObj.getMonth() && 
                        nowObj.getDate() === targetDateObj.getDate();

      if (isSameDay) {
        setEventStatus('today');
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else if (now > targetDate) {
        setEventStatus('past');
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setEventStatus('upcoming');
        if (!isNaN(distance)) {
          setTimeLeft({
            days: Math.floor(distance / (1000 * 60 * 60 * 24)),
            hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((distance % (1000 * 60)) / 1000)
          });
        }
      }
    };

    checkStatusAndUpdateTime();
    const interval = setInterval(checkStatusAndUpdateTime, 1000);

    return () => clearInterval(interval);
  }, [eventSettings.countdownTarget]);

  useEffect(() => {
    const unsubscribeSpeakers = onSnapshot(collection(db, 'speakers'), (snapshot) => {
      const speakerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Speaker[];
      setSpeakers(speakerData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'speakers');
    });

    return () => {
      unsubscribeSpeakers();
    };
  }, []);

  return (
    <div>
      <SEO 
        title="Home" 
        description="TEDx Lokoja is an independently organized TED event bringing together innovative thinkers and doers to share ideas worth spreading in Lokoja, Kogi State."
      />
      {/* Hero Section */}
      <section className="relative bg-black text-white py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/tedx/1920/1080')] bg-cover bg-center" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h2 className="text-red-600 font-bold tracking-widest uppercase mb-4 text-sm md:text-base">TEDx Lokoja 2026 Theme</h2>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6">
              Start Where<br />You Are.
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 font-light">
              Join the brightest minds in Lokoja for a day of inspiration, innovation, and connection.
            </p>

            {/* Countdown Timer / Event Status */}
            <div className="mb-10">
              {eventStatus === 'today' ? (
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 inline-block">
                  <h3 className="text-3xl md:text-4xl font-bold text-white tracking-widest uppercase mb-2 animate-pulse text-center">Happening Today</h3>
                </div>
              ) : eventStatus === 'past' ? (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 inline-block">
                  <h3 className="text-2xl md:text-3xl font-bold text-white tracking-widest uppercase text-center">Thank you for joining us</h3>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: 'Days', value: timeLeft.days },
                    { label: 'Hours', value: timeLeft.hours },
                    { label: 'Minutes', value: timeLeft.minutes },
                    { label: 'Seconds', value: timeLeft.seconds }
                  ].map((item) => (
                    <div key={item.label} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[90px] border border-white/20">
                      <div className="text-3xl md:text-4xl font-bold text-white mb-1">{item.value.toString().padStart(2, '0')}</div>
                      <div className="text-xs text-gray-300 uppercase tracking-widest font-medium">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link 
              to="/tickets"
              className="inline-block bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full text-lg font-bold transition-transform hover:scale-105"
            >
              Get Your Ticket
            </Link>

            {/* Social Share */}
            <div className="flex items-center gap-4 mt-12">
              <span className="text-gray-400 text-sm uppercase tracking-widest font-medium">Share Event:</span>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Join me at TEDx Lokoja 2026! Start Where You Are.")}&url=${encodeURIComponent(window.location.origin)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-600 transition-colors text-white">
                <Twitter size={18} />
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-600 transition-colors text-white">
                <Facebook size={18} />
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-600 transition-colors text-white">
                <Linkedin size={18} />
              </a>
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin); toast.success('Link copied to clipboard!'); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-600 transition-colors text-white">
                <LinkIcon size={18} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-24 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, staggerChildren: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 -mt-40"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 flex flex-col items-start text-left hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                <Calendar size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight text-gray-900">Date & Time</h3>
              <p className="text-gray-500 leading-relaxed font-medium">{eventSettings.date}<br />{eventSettings.time}</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 flex flex-col items-start text-left hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                <MapPin size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight text-gray-900">Location</h3>
              <p className="text-gray-500 leading-relaxed font-medium">{eventSettings.venue}<br />{eventSettings.venueAddress}</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 flex flex-col items-start text-left hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                <Users size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight text-gray-900">Networking</h3>
              <p className="text-gray-500 leading-relaxed font-medium">Connect with 500+<br />innovators and leaders</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
              What is <span className="text-red-600">TEDx</span> Lokoja?
            </h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              In the spirit of ideas worth spreading, TEDx is a program of local, self-organized events that bring people together to share a TED-like experience. At a TEDx event, TED Talks video and live speakers combine to spark deep discussion and connection.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Our theme for 2026, <strong>"Start Where You Are"</strong>, explores the power of beginning with what you have. It's a call to action for innovators, thinkers, and doers in Kogi State and beyond to ignite change from their current vantage point.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
              <img src="https://picsum.photos/seed/tedx-audience/800/800" alt="TEDx Audience" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-red-600 text-white p-8 rounded-3xl shadow-xl hidden md:block">
              <p className="text-4xl font-bold mb-1">10+</p>
              <p className="text-sm font-medium uppercase tracking-wider">Inspiring Speakers</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">What to Expect</h2>
            <p className="text-gray-400 text-lg">A full day curated to challenge your perspectives and ignite your curiosity.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-gray-900 border border-gray-800 hover:border-red-600 transition-colors"
            >
              <Mic className="text-red-600 mb-6" size={40} />
              <h3 className="text-2xl font-bold mb-4">Powerful Talks</h3>
              <p className="text-gray-400 leading-relaxed">Listen to thought leaders, innovators, and everyday heroes share their unique ideas and stories in 18 minutes or less.</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-3xl bg-gray-900 border border-gray-800 hover:border-red-600 transition-colors"
            >
              <Lightbulb className="text-red-600 mb-6" size={40} />
              <h3 className="text-2xl font-bold mb-4">New Perspectives</h3>
              <p className="text-gray-400 leading-relaxed">Engage with ideas spanning technology, entertainment, design, science, humanities, and business.</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="p-8 rounded-3xl bg-gray-900 border border-gray-800 hover:border-red-600 transition-colors"
            >
              <Globe className="text-red-600 mb-6" size={40} />
              <h3 className="text-2xl font-bold mb-4">Deep Connections</h3>
              <p className="text-gray-400 leading-relaxed">Meet like-minded individuals during our curated networking sessions and interactive breaks.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Speakers Preview */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-between items-end mb-12"
          >
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Featured Speakers</h2>
              <p className="text-gray-600 text-lg">Meet some of the voices shaping our future.</p>
            </div>
          </motion.div>

          {speakers.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {speakers.map((speaker, index) => (
                <motion.div 
                  key={speaker.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-4 relative bg-gray-200">
                    {speaker.imageUrl ? (
                      <img 
                        src={speaker.imageUrl} 
                        alt={speaker.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Mic size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                      {speaker.bio && (
                        <p className="text-white text-sm line-clamp-3">{speaker.bio}</p>
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">{speaker.name}</h3>
                  <p className="text-red-600 font-medium text-sm">{speaker.role}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="text-gray-400" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Speakers Announcing Soon</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                We are curating an incredible lineup of thinkers, innovators, and visionaries. Stay tuned for our speaker announcements!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 text-lg">Everything you need to know about TEDx Lokoja 2026.</p>
          </div>
          <div className="border-t border-gray-200">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-red-600 text-white text-center px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">Ready to be inspired?</h2>
          <p className="text-xl md:text-2xl mb-12 text-red-100 font-light">
            Secure your spot at TEDx Lokoja 2026. Tickets are limited and selling fast.
          </p>
          <Link 
            to="/tickets"
            className="inline-flex items-center gap-2 bg-white text-red-600 hover:bg-gray-100 px-10 py-5 rounded-full text-xl font-bold transition-transform hover:scale-105"
          >
            Get Tickets Now <ArrowRight size={24} />
          </Link>
        </div>
      </section>
    </div>
  );
}
