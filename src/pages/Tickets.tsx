import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { PaystackButton } from 'react-paystack';
import { Ticket, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  available: number;
  visibility?: 'public' | 'hidden';
}

export default function Tickets() {
  const { user, profile, loginWithGoogle } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [purchasedTicket, setPurchasedTicket] = useState<{name: string, reference: string, qrCodeUrl: string} | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'ticketTypes'), (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TicketType[];
      
      // Filter out hidden tickets
      const publicTickets = ticketData.filter(t => t.visibility !== 'hidden');
      setTickets(publicTickets);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ticketTypes');
    });

    return () => unsubscribe();
  }, []);

  const handleSuccess = async (reference: any) => {
    if (!user || !selectedTicket) return;

    try {
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          ticketTypeId: selectedTicket.id,
          amount: selectedTicket.price,
          reference: reference.reference,
          email: user.email,
          name: profile?.displayName || user.email,
          ticketName: selectedTicket.name
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to confirm payment');
      }

      setPurchasedTicket({
        name: selectedTicket.name,
        reference: reference.reference,
        qrCodeUrl: result.qrCodeUrl
      });
      setSelectedTicket(null);
    } catch (error) {
      console.error("Payment confirmation failed", error);
      alert("There was an issue confirming your payment. Please contact support.");
    }
  };

  const handleClose = () => {
    console.log('Payment closed');
  };

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const componentProps = {
    email: user?.email || '',
    amount: (selectedTicket?.price || 0) * 100, // Paystack expects kobo
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
              <div className="text-4xl font-bold mb-8">
                ₦{ticket.price.toLocaleString()}
              </div>
            </div>

            {user ? (
              selectedTicket?.id === ticket.id ? (
                <div className="space-y-4">
                  <PaystackButton 
                    {...componentProps} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition-colors"
                  />
                  <button 
                    onClick={() => setSelectedTicket(null)}
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
                <img src={purchasedTicket.qrCodeUrl} alt="Ticket QR Code" className="w-48 h-48 mx-auto" />
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
