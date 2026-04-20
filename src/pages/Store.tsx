import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { PaystackButton } from 'react-paystack';
import SEO from '../components/SEO';

interface MerchItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  available: number;
  category: string;
  imageUrl?: string;
}

export default function Store() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_your_paystack_public_key_here";

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'merch'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MerchItem[];
      setProducts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'merch');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSuccess = async (reference: any, product: MerchItem) => {
    if (!profile) return;

    setPurchasingId(product.id);
    try {
      // Create order record
      await addDoc(collection(db, 'merchOrders'), {
        userId: profile.uid,
        merchId: product.id,
        amount: product.price,
        status: 'success',
        reference: reference.reference,
        createdAt: serverTimestamp()
      });

      // Decrease available quantity
      await updateDoc(doc(db, 'merch', product.id), {
        available: increment(-1)
      });

      alert(`Successfully purchased ${product.name}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'merchOrders');
      alert("Purchase failed. Please try again.");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <SEO 
        title="Official Merch" 
        description="Wear your ideas. Support TEDx Lokoja by grabbing our exclusive 2026 'Start Where You Are' merchandise."
      />
      {/* Hero Section */}
      <section className="bg-black text-white py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={32} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
              Official <span className="text-red-600">Merch</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Wear your ideas. Support TEDx Lokoja by grabbing our exclusive 2026 "Start Where You Are" merchandise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading merchandise...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-gray-100">
            <ShoppingBag className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-2xl font-bold mb-2">Store is Empty</h3>
            <p className="text-gray-500">Check back later for official TEDx Lokoja merchandise.</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {products.map((product, index) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group flex flex-col"
              >
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingBag size={64} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-gray-800 shadow-sm">
                    {product.category}
                  </div>
                  {product.available <= 0 && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-red-600 text-white px-6 py-2 rounded-full font-bold tracking-wider uppercase transform -rotate-12">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold leading-tight pr-4">{product.name}</h3>
                    <span className="text-red-600 font-bold whitespace-nowrap">₦{product.price.toLocaleString()}</span>
                  </div>
                  <div className="mt-auto">
                    <div className="text-sm text-gray-500 mb-4">
                      {product.available > 0 ? `${product.available} left in stock` : 'Out of stock'}
                    </div>
                    {profile ? (
                      <PaystackButton 
                        email={profile.email}
                        amount={product.price * 100}
                        metadata={{
                          name: profile.displayName || '',
                          custom_fields: [{ display_name: "Merch Item", variable_name: "merch_item", value: product.name }]
                        }}
                        publicKey={paystackKey}
                        text={purchasingId === product.id ? 'Processing...' : 'Buy Now'}
                        onSuccess={(reference: any) => handleSuccess(reference, product)}
                        onClose={() => console.log('Payment closed')}
                        disabled={product.available <= 0 || purchasingId === product.id}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                          product.available <= 0 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : purchasingId === product.id
                              ? 'bg-gray-800 text-white cursor-wait'
                              : 'bg-gray-900 hover:bg-red-600 text-white'
                        }`}
                      />
                    ) : (
                      <button 
                        onClick={() => alert("Please log in to purchase merchandise.")}
                        disabled={product.available <= 0}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                          product.available <= 0 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-900 hover:bg-red-600 text-white'
                        }`}
                      >
                        <ShoppingCart size={18} />
                        Login to Purchase
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
