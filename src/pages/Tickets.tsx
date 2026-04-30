import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp, query, where, getDocs, increment } from 'firebase/firestore';
import { PaystackButton } from 'react-paystack';
import { Ticket, CheckCircle, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import { QRCodeSVG } from 'qrcode.react';

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  available: number;
  visibility?: 'public' | 'hidden';
  order?: number;
}

export default function Tickets() {
  const { user, profile, loginWithGoogle } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [purchasedTicket, setPurchasedTicket] = useState<{name: string, reference: string} | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{id: string, code: string, discount: number} | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'ticketTypes'), (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TicketType[];
      
      // Filter out hidden tickets and sort
      const publicTickets = ticketData.filter(t => t.visibility !== 'hidden');
      setTickets(publicTickets.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ticketTypes');
    });

    return () => unsubscribe();
  }, []);

  const handleValidateCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setValidatingCoupon(true);
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCodeInput.toUpperCase().trim()));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast.error("Invalid coupon code.");
        setAppliedCoupon(null);
        return;
      }
      
      const couponDoc = querySnapshot.docs[0];
      const couponData = couponDoc.data();
      
      if (!couponData.active) {
        toast.error("This coupon is no longer active.");
        return;
      }
      if (couponData.currentUses >= couponData.maxUses) {
        toast.error("This coupon has reached its maximum usage limit.");
        return;
      }
      
      setAppliedCoupon({
        id: couponDoc.id,
        code: couponData.code,
        discount: couponData.discountPercentage
      });
      toast.success(`Coupon applied successfully: ${couponData.discountPercentage}% OFF!`);
    } catch (error) {
      console.error("Error validating coupon:", error);
      toast.error("Error validating coupon. Please try again.");
      handleFirestoreError(error, OperationType.GET, 'coupons');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const currentPrice = selectedTicket 
    ? (appliedCoupon ? selectedTicket.price * (1 - (appliedCoupon.discount / 100)) : selectedTicket.price) 
    : 0;

  const handleSuccess = async (reference: any) => {
    if (!user || !selectedTicket) return;

    try {
      // 1. Write purchase to Firestore locally (works even on static AWS host!)
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        userName: profile?.displayName || user.email,
        userEmail: user.email,
        ticketTypeId: selectedTicket.id,
        ticketName: selectedTicket.name,
        amount: currentPrice,
        status: 'success',
        reference: reference.reference,
        createdAt: serverTimestamp()
      });

      // 2. Decrement ticket available locally
      await updateDoc(doc(db, 'ticketTypes', selectedTicket.id), {
        available: increment(-1)
      });

      // 3. Mark coupon as used locally
      if (appliedCoupon) {
        await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
          currentUses: increment(1)
        });
      }

      // 4. Optionally tell Backend/Netlify Function to send email
      try {
        fetch('/api/send-ticket-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            ticketTypeId: selectedTicket.id,
            amount: currentPrice,
            reference: reference.reference,
            email: user.email,
            name: profile?.displayName || user.email,
            ticketName: selectedTicket.name
          })
        });
      } catch (e) {
        // Silently ignore backend fetch errors so static hosting still allows users to checkout
        console.warn("Backend email failed, but purchase was recorded locally.");
      }

      setPurchasedTicket({
        name: selectedTicket.name,
        reference: reference.reference
      });
      setSelectedTicket(null);
      setAppliedCoupon(null);
      setCouponCodeInput('');
      toast.success("Payment recorded successfully!");
    } catch (error) {
      console.error("Payment confirmation failed", error);
      toast.error("Payment was successful but we couldn't properly record it. Please contact support with reference: " + reference.reference);
      handleFirestoreError(error, OperationType.WRITE, 'purchases');
    }
  };

  const handleClose = () => {
    toast.error('Payment cancelled');
  };

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_your_paystack_public_key_here";

  const componentProps = {
    email: user?.email || '',
    amount: Math.round(currentPrice * 100), // Paystack expects kobo, prevent decimals
    metadata: {
      name: profile?.displayName || '',
      phone: '',
      custom_fields: [
        {
          display_name: "Ticket Type",
          variable_name: "ticket_type",
          value: selectedTicket?.name || ''
        }
      ]
    },
    publicKey: paystackKey,
    text: "Pay Now",
    onSuccess: handleSuccess,
    onClose: handleClose,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <SEO 
        title="Tickets" 
        description="Secure your spot at TEDx Lokoja 2026. Purchase your tickets online and join us for a day of inspiration and innovation."
      />
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Get Your Tickets</h1>
        <p className="text-xl text-gray-600">Secure your spot at TEDx Lokoja 2026.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tickets.map((ticket, index) => (
          <motion.div 
            key={ticket.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 flex flex-col relative overflow-hidden"
          >
            {ticket.available === 0 && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <span className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-lg transform -rotate-12">
                  SOLD OUT
                </span>
              </div>
            )}
            
            <div className="flex-grow">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                <Ticket size={24} />
              </div>
              <h2 className="text-2xl font-bold mb-2">{ticket.name}</h2>
              <p className="text-gray-500 mb-6 min-h-[3rem]">{ticket.description}</p>
              
              {selectedTicket?.id === ticket.id && appliedCoupon ? (
                <div className="mb-8">
                  <div className="text-xl text-gray-400 line-through">₦{ticket.price.toLocaleString()}</div>
                  <div className="text-4xl font-bold text-red-600">
                    ₦{Math.round(ticket.price * (1 - (appliedCoupon.discount / 100))).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-4xl font-bold mb-8">
                  ₦{ticket.price.toLocaleString()}
                </div>
              )}
            </div>

            {user ? (
              selectedTicket?.id === ticket.id ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 border rounded-xl mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Have a coupon code?</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                        placeholder="ENTER CODE" 
                        className="flex-grow p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 uppercase"
                      />
                      <button 
                        onClick={handleValidateCoupon}
                        disabled={validatingCoupon}
                        className="bg-black text-white px-4 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  
                  {currentPrice > 0 ? (
                    <PaystackButton 
                      {...componentProps} 
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition-colors"
                    />
                  ) : (
                    <button 
                      onClick={() => handleSuccess({ reference: 'TKT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase() })}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition-colors text-center block"
                    >
                      Claim Free Ticket
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedTicket(null);
                      setAppliedCoupon(null);
                      setCouponCodeInput('');
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setSelectedTicket(ticket)}
                  disabled={ticket.available === 0}
                  className="w-full bg-black hover:bg-gray-800 text-white py-4 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Select Ticket
                </button>
              )
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold transition-colors"
              >
                Login to Purchase
              </button>
            )}
            
            <div className="mt-4 text-center text-sm text-gray-500">
              {ticket.available} tickets remaining
            </div>
          </motion.div>
        ))}
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {purchasedTicket && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center relative shadow-2xl"
            >
              <button
                onClick={() => setPurchasedTicket(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">Your ticket for <strong>{purchasedTicket.name}</strong> has been secured.</p>
              
              <div className="bg-gray-50 p-4 rounded-2xl inline-block mb-6 border border-gray-100">
                <QRCodeSVG value={purchasedTicket.reference} size={200} className="mx-auto" />
                <p className="text-sm text-gray-500 mt-2 font-mono tracking-wider">{purchasedTicket.reference}</p>
              </div>
              
              <p className="text-sm text-gray-500">
                Please save this QR code or check your email. You'll need to present it at the event entrance.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
