import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import Tickets from './pages/Tickets';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import CallForSpeakers from './pages/CallForSpeakers';
import Sponsor from './pages/Sponsor';
import About from './pages/About';
import Store from './pages/Store';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import { LogOut, User, Twitter, Facebook, Linkedin, Instagram, ArrowRight } from 'lucide-react';

function Navbar() {
  const { user, profile, loginWithGoogle, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md py-3 shadow-lg' : 'bg-black py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-white">
        <Link to="/" className="text-2xl font-bold tracking-tighter">
          <span className="text-red-600">TEDx</span> Lokoja
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="hover:text-red-500 transition-colors">Home</Link>
          <Link to="/about" className="hover:text-red-500 transition-colors">About</Link>
          <Link to="/tickets" className="hover:text-red-500 transition-colors">Tickets</Link>
          <Link to="/store" className="hover:text-red-500 transition-colors">Store</Link>
          {profile?.role === 'admin' && (
            <Link to="/admin" className="hover:text-red-500 transition-colors">Admin</Link>
          )}
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/profile" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                <User size={16} />
                <span>{profile?.displayName || user.email}</span>
              </Link>
              <button 
                onClick={logout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full text-sm font-medium transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-[#0a0a0a] text-white pt-24 pb-12 border-t border-white/10 relative overflow-hidden">
      {/* Subtle background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl pointer-events-none opacity-[0.02] flex items-center justify-center overflow-hidden z-0">
        <span className="text-[20rem] font-black tracking-tighter whitespace-nowrap select-none">TEDx Lokoja</span>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-12 mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-12 lg:col-span-5"
          >
            <Link to="/" className="inline-block mb-8 group">
              <h3 className="text-4xl font-bold tracking-tighter flex items-center gap-2">
                <span className="text-red-600 group-hover:text-red-500 transition-colors">TEDx</span> 
                <span className="text-white group-hover:text-gray-300 transition-colors">Lokoja</span>
              </h3>
            </Link>
            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-sm">
              In the spirit of ideas worth spreading, TEDx is a program of local, self-organized events that bring people together to share a TED-like experience.
            </p>
            <div className="flex items-center gap-4">
              {[Twitter, Facebook, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white hover:scale-110 hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-red-600/20">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </motion.div>

          <div className="md:col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                Explore
              </h4>
              <ul className="space-y-4 text-sm text-gray-400 font-medium">
                {['Home', 'About Us', 'Get Tickets', 'Merch Store'].map((item, i) => {
                  const paths = ['/', '/about', '/tickets', '/store'];
                  return (
                    <li key={item}>
                      <Link to={paths[i]} className="group flex items-center gap-2 hover:text-white transition-colors">
                        <ArrowRight size={14} className="text-red-600 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                        <span className="group-hover:translate-x-1 transition-transform duration-300">{item}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                Get Involved
              </h4>
              <ul className="space-y-4 text-sm text-gray-400 font-medium">
                {['Speak', 'Sponsor', 'Volunteer'].map((item, i) => {
                  const paths = ['/cfs', '/sponsor', '/contact'];
                  return (
                    <li key={item}>
                      <Link to={paths[i]} className="group flex items-center gap-2 hover:text-white transition-colors">
                        <ArrowRight size={14} className="text-red-600 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                        <span className="group-hover:translate-x-1 transition-transform duration-300">{item}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                Legal
              </h4>
              <ul className="space-y-4 text-sm text-gray-400 font-medium">
                {['Contact Us', 'Privacy Policy', 'Terms of Service'].map((item, i) => {
                  const paths = ['/contact', '/privacy', '/terms'];
                  return (
                    <li key={item}>
                      <Link to={paths[i]} className="group flex items-center gap-2 hover:text-white transition-colors">
                        <ArrowRight size={14} className="text-red-600 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                        <span className="group-hover:translate-x-1 transition-transform duration-300">{item}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500 font-medium"
        >
          <p>&copy; {new Date().getFullYear()} TEDx Lokoja. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Powered by{' '}
            <a 
              href="https://bineops.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-300 hover:text-red-500 transition-colors font-bold relative group"
            >
              BineOps Innovation Technology Limited
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-red-600 group-hover:w-full transition-all duration-300"></span>
            </a>
          </p>
        </motion.div>
      </div>
    </footer>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <Navbar />
      <main className="flex-grow pt-[72px]">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
            <Route path="/tickets" element={<PageWrapper><Tickets /></PageWrapper>} />
            <Route path="/store" element={<PageWrapper><Store /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
            <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
            <Route path="/privacy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
            <Route path="/terms" element={<PageWrapper><TermsOfService /></PageWrapper>} />
            <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
            <Route path="/cfs" element={<PageWrapper><CallForSpeakers /></PageWrapper>} />
            <Route path="/sponsor" element={<PageWrapper><Sponsor /></PageWrapper>} />
            <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }} />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
