import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc, setDoc, getDoc, increment } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Plus, Trash2, Shield, ShieldAlert, Search, Save } from 'lucide-react';

interface EventSettings {
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
  countdownTarget: string;
}

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  available: number;
  visibility?: 'public' | 'hidden';
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: any;
}

interface Speaker {
  id: string;
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
}

interface SpeakerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  status: string;
  createdAt: any;
}

interface SponsorApplication {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  sponsorshipLevel: string;
  status: string;
  createdAt: any;
}

interface MerchItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  available: number;
  category: string;
  imageUrl?: string;
  createdAt: any;
}

interface Purchase {
  id: string;
  userId: string;
  ticketTypeId: string;
  amount: number;
  status: string;
  reference: string;
  createdAt: any;
  userName?: string;
  userEmail?: string;
  ticketName?: string;
}

interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  maxUses: number;
  currentUses: number;
  active: boolean;
  createdAt: any;
}

interface MerchOrder {
  id: string;
  userId: string;
  merchId: string;
  amount: number;
  status: string;
  reference: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakerApps, setSpeakerApps] = useState<SpeakerApplication[]>([]);
  const [sponsorApps, setSponsorApps] = useState<SponsorApplication[]>([]);
  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);
  const [merchOrders, setMerchOrders] = useState<MerchOrder[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [eventSettings, setEventSettings] = useState<EventSettings>({
    date: '16th May, 2026',
    time: '9:00 AM - 5:00 PM',
    venue: 'College of Health Sciences (COHS) Auditorium',
    venueAddress: 'Federal University Lokoja, Adankolo Campus',
    countdownTarget: '2026-05-16T09:00:00'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'users' | 'speakers' | 'speakerApps' | 'sponsorApps' | 'merch' | 'merchOrders' | 'settings' | 'attendees' | 'coupons'>('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [isCreatingSpeaker, setIsCreatingSpeaker] = useState(false);
  const [isCreatingMerch, setIsCreatingMerch] = useState(false);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    visibility: 'public'
  });
  const [speakerFormData, setSpeakerFormData] = useState({
    name: '',
    role: '',
    bio: '',
    imageUrl: ''
  });
  const [merchFormData, setMerchFormData] = useState({
    name: '',
    price: '',
    quantity: '',
    category: '',
    imageUrl: ''
  });
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    discountPercentage: '',
    maxUses: ''
  });

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const unsubscribeTickets = onSnapshot(collection(db, 'ticketTypes'), (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TicketType[];
      setTickets(ticketData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ticketTypes');
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserProfile[];
      setUsers(userData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubscribeSpeakers = onSnapshot(collection(db, 'speakers'), (snapshot) => {
      const speakerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Speaker[];
      setSpeakers(speakerData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'speakers');
    });

    const unsubscribeSpeakerApps = onSnapshot(collection(db, 'speakerApplications'), (snapshot) => {
      const appData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SpeakerApplication[];
      setSpeakerApps(appData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'speakerApplications');
    });

    const unsubscribeSponsorApps = onSnapshot(collection(db, 'sponsorApplications'), (snapshot) => {
      const appData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SponsorApplication[];
      setSponsorApps(appData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sponsorApplications');
    });

    const unsubscribeMerch = onSnapshot(collection(db, 'merch'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MerchItem[];
      setMerchItems(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'merch');
    });

    const unsubscribeMerchOrders = onSnapshot(collection(db, 'merchOrders'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MerchOrder[];
      setMerchOrders(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'merchOrders');
    });

    const unsubscribePurchases = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Purchase[];
      setPurchases(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchases');
    });

    const unsubscribeCoupons = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Coupon[];
      setCoupons(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'coupons');
    });

    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'eventDetails'));
        if (settingsDoc.exists()) {
          setEventSettings(settingsDoc.data() as EventSettings);
        }
      } catch (error) {
        console.error("Error fetching event settings:", error);
      }
    };
    fetchSettings();

    return () => {
      unsubscribeTickets();
      unsubscribeUsers();
      unsubscribeSpeakers();
      unsubscribeSpeakerApps();
      unsubscribeSponsorApps();
      unsubscribeMerch();
      unsubscribeMerchOrders();
      unsubscribePurchases();
      unsubscribeCoupons();
    };
  }, [profile]);

  if (loading) return <div className="p-20 text-center">Loading...</div>;
  if (profile?.role !== 'admin') return <div className="p-20 text-center text-red-600">Access Denied. Admin only.</div>;

  const lowerQuery = searchQuery.toLowerCase();
  const filteredTickets = tickets.filter(t => t.name.toLowerCase().includes(lowerQuery) || t.description?.toLowerCase().includes(lowerQuery));
  const filteredUsers = users.filter(u => u.displayName?.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery) || u.role.toLowerCase().includes(lowerQuery));
  const filteredSpeakers = speakers.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.role.toLowerCase().includes(lowerQuery));
  const filteredSpeakerApps = speakerApps.filter(a => a.name.toLowerCase().includes(lowerQuery) || a.email.toLowerCase().includes(lowerQuery) || a.topic.toLowerCase().includes(lowerQuery));
  const filteredSponsorApps = sponsorApps.filter(a => a.companyName.toLowerCase().includes(lowerQuery) || a.contactName.toLowerCase().includes(lowerQuery) || a.email.toLowerCase().includes(lowerQuery));
  const filteredMerch = merchItems.filter(m => m.name.toLowerCase().includes(lowerQuery) || m.category.toLowerCase().includes(lowerQuery));
  const filteredMerchOrders = merchOrders.filter(o => o.userId.toLowerCase().includes(lowerQuery) || o.status.toLowerCase().includes(lowerQuery));
  const filteredPurchases = purchases.filter(p => p.status === 'success' && (p.userName?.toLowerCase().includes(lowerQuery) || p.userEmail?.toLowerCase().includes(lowerQuery) || p.reference.toLowerCase().includes(lowerQuery) || p.ticketName?.toLowerCase().includes(lowerQuery)));
  const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(lowerQuery));

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTicketId) {
        const ticket = tickets.find(t => t.id === editingTicketId);
        const quantityDiff = Number(formData.quantity) - (ticket?.quantity || 0);
        
        await updateDoc(doc(db, 'ticketTypes', editingTicketId), {
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          quantity: Number(formData.quantity),
          available: increment(quantityDiff),
          visibility: formData.visibility
        });
      } else {
        await addDoc(collection(db, 'ticketTypes'), {
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          quantity: Number(formData.quantity),
          available: Number(formData.quantity),
          visibility: formData.visibility,
          createdAt: serverTimestamp()
        });
      }
      setIsCreating(false);
      setEditingTicketId(null);
      setFormData({ name: '', description: '', price: '', quantity: '', visibility: 'public' });
    } catch (error) {
      handleFirestoreError(error, editingTicketId ? OperationType.UPDATE : OperationType.CREATE, 'ticketTypes');
    }
  };

  const handleEditTicket = (ticket: TicketType) => {
    setFormData({
      name: ticket.name,
      description: ticket.description,
      price: ticket.price.toString(),
      quantity: ticket.quantity.toString(),
      visibility: ticket.visibility || 'public'
    });
    setEditingTicketId(ticket.id);
    setIsCreating(true);
  };

  const handleToggleVisibility = async (ticket: TicketType) => {
    try {
      const newVisibility = ticket.visibility === 'hidden' ? 'public' : 'hidden';
      await updateDoc(doc(db, 'ticketTypes', ticket.id), {
        visibility: newVisibility
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ticketTypes/${ticket.id}`);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ticket type?')) {
      try {
        await deleteDoc(doc(db, 'ticketTypes', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `ticketTypes/${id}`);
      }
    }
  };

  const handleCreateSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'speakers'), {
        name: speakerFormData.name,
        role: speakerFormData.role,
        bio: speakerFormData.bio || null,
        imageUrl: speakerFormData.imageUrl || null,
        createdAt: serverTimestamp()
      });
      setIsCreatingSpeaker(false);
      setSpeakerFormData({ name: '', role: '', bio: '', imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'speakers');
    }
  };

  const handleDeleteSpeaker = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this speaker?')) {
      try {
        await deleteDoc(doc(db, 'speakers', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `speakers/${id}`);
      }
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    if (userId === profile?.uid) {
      alert("You cannot change your own role.");
      return;
    }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      }
    }
  };

  const handleUpdateSponsorStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'sponsorApplications', appId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sponsorApplications/${appId}`);
    }
  };

  const handleUpdateSpeakerAppStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'speakerApplications', appId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `speakerApplications/${appId}`);
    }
  };

  const handleCreateMerch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'merch'), {
        name: merchFormData.name,
        price: Number(merchFormData.price),
        quantity: Number(merchFormData.quantity),
        available: Number(merchFormData.quantity),
        category: merchFormData.category,
        imageUrl: merchFormData.imageUrl || null,
        createdAt: serverTimestamp()
      });
      setIsCreatingMerch(false);
      setMerchFormData({ name: '', price: '', quantity: '', category: '', imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'merch');
    }
  };

  const handleDeleteMerch = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this merch item?')) {
      try {
        await deleteDoc(doc(db, 'merch', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `merch/${id}`);
      }
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'coupons'), {
        code: couponFormData.code.toUpperCase().trim(),
        discountPercentage: Number(couponFormData.discountPercentage),
        maxUses: Number(couponFormData.maxUses),
        currentUses: 0,
        active: true,
        createdAt: serverTimestamp()
      });
      setIsCreatingCoupon(false);
      setCouponFormData({ code: '', discountPercentage: '', maxUses: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'coupons');
      alert("Failed to create coupon");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await deleteDoc(doc(db, 'coupons', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `coupons/${id}`);
      }
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', id), { active: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coupons/${id}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'eventDetails'), eventSettings);
      alert('Event settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/eventDetails');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>
      
      <div className="flex justify-end items-center mb-8">
        {activeTab === 'tickets' && (
          <button 
            onClick={() => {
              setIsCreating(!isCreating);
              setEditingTicketId(null);
              setFormData({ name: '', description: '', price: '', quantity: '', visibility: 'public' });
            }}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />
            Create Ticket
          </button>
        )}
        {activeTab === 'speakers' && (
          <button 
            onClick={() => setIsCreatingSpeaker(!isCreatingSpeaker)}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />
            Add Speaker
          </button>
        )}
        {activeTab === 'merch' && (
          <button 
            onClick={() => setIsCreatingMerch(!isCreatingMerch)}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />
            Add Merch
          </button>
        )}
        {activeTab === 'coupons' && (
          <button 
            onClick={() => setIsCreatingCoupon(!isCreatingCoupon)}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />
            Create Coupon
          </button>
        )}
      </div>

      <div className="flex gap-6 mb-8 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('attendees')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'attendees' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Attendees & Purchases
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'tickets' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Manage Tickets
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'users' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Manage Users
        </button>
        <button
          onClick={() => setActiveTab('speakers')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'speakers' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Manage Speakers
        </button>
        <button
          onClick={() => setActiveTab('speakerApps')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'speakerApps' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Speaker Apps
        </button>
        <button
          onClick={() => setActiveTab('sponsorApps')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'sponsorApps' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Sponsorships
        </button>
        <button
          onClick={() => setActiveTab('merch')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'merch' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Merch Inventory
        </button>
        <button
          onClick={() => setActiveTab('merchOrders')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'merchOrders' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Merch Orders
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'coupons' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Coupons
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-4 font-medium transition-colors ${activeTab === 'settings' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Event Settings
        </button>
      </div>

      {activeTab === 'tickets' ? (
        <>
          {isCreating && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
        >
          <h2 className="text-xl font-bold mb-4">{editingTicketId ? 'Edit Ticket Type' : 'New Ticket Type'}</h2>
          <form onSubmit={handleSaveTicket} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ticket Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g. Early Bird"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (NGN)</label>
              <input 
                required
                type="number" 
                min="0"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Quantity</label>
              <input 
                required
                type="number" 
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: e.target.value})}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <select 
                value={formData.visibility}
                onChange={e => setFormData({...formData, visibility: e.target.value})}
                className="w-full p-2 border rounded-lg bg-white"
              >
                <option value="public">Public</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border rounded-lg"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => {
                  setIsCreating(false);
                  setEditingTicketId(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {editingTicketId ? 'Update Ticket' : 'Save Ticket'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Price</th>
                  <th className="p-4 font-semibold">Available / Total</th>
                  <th className="p-4 font-semibold">Visibility</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${ticket.visibility === 'hidden' ? 'opacity-75' : ''}`}>
                    <td className="p-4 font-medium">{ticket.name}</td>
                    <td className="p-4">₦{ticket.price.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ticket.available > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {ticket.available} / {ticket.quantity}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleToggleVisibility(ticket)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${ticket.visibility === 'hidden' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'}`}
                      >
                        {ticket.visibility === 'hidden' ? 'Hidden' : 'Public'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleEditTicket(ticket)}
                        className="text-blue-500 hover:text-blue-700 p-2 mr-2"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No tickets found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'users' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.uid} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.displayName || 'N/A'}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleRoleChange(u.uid, u.role)}
                      disabled={u.uid === profile?.uid}
                      className={`text-sm font-medium flex items-center justify-end gap-1 w-full ${
                        u.role === 'admin' ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-800'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {u.role === 'admin' ? (
                        <><ShieldAlert size={16} /> Revoke Admin</>
                      ) : (
                        <><Shield size={16} /> Make Admin</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'speakers' ? (
        <>
          {isCreatingSpeaker && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
            >
              <h2 className="text-xl font-bold mb-4">New Speaker</h2>
              <form onSubmit={handleCreateSpeaker} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input 
                    required
                    type="text" 
                    value={speakerFormData.name}
                    onChange={e => setSpeakerFormData({...speakerFormData, name: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role / Title</label>
                  <input 
                    required
                    type="text" 
                    value={speakerFormData.role}
                    onChange={e => setSpeakerFormData({...speakerFormData, role: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. CEO, Tech Corp"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                  <input 
                    type="url" 
                    value={speakerFormData.imageUrl}
                    onChange={e => setSpeakerFormData({...speakerFormData, imageUrl: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Bio (Optional)</label>
                  <textarea 
                    value={speakerFormData.bio}
                    onChange={e => setSpeakerFormData({...speakerFormData, bio: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingSpeaker(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Save Speaker
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold">Image</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpeakers.map(speaker => (
                  <tr key={speaker.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      {speaker.imageUrl ? (
                        <img src={speaker.imageUrl} alt={speaker.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          {speaker.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">{speaker.name}</td>
                    <td className="p-4 text-gray-600">{speaker.role}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteSpeaker(speaker.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSpeakers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">No speakers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'speakerApps' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Topic</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpeakerApps.map(app => (
                <tr key={app.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">{app.name}</td>
                  <td className="p-4 text-sm text-gray-600">
                    <div>{app.email}</div>
                    <div>{app.phone}</div>
                  </td>
                  <td className="p-4 text-sm">{app.topic}</td>
                  <td className="p-4">
                    <select
                      value={app.status}
                      onChange={(e) => handleUpdateSpeakerAppStatus(app.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize outline-none cursor-pointer border-0 ${
                        app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        app.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredSpeakerApps.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">No speaker applications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'sponsorApps' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold">Company</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Level</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSponsorApps.map(app => (
                <tr key={app.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">{app.companyName}</td>
                  <td className="p-4 text-sm text-gray-600">
                    <div>{app.contactName}</div>
                    <div>{app.email}</div>
                  </td>
                  <td className="p-4 text-sm">{app.sponsorshipLevel}</td>
                  <td className="p-4">
                    <select
                      value={app.status}
                      onChange={(e) => handleUpdateSponsorStatus(app.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize outline-none cursor-pointer border-0 ${
                        app.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        app.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filteredSponsorApps.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">No sponsorship applications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'merch' ? (
        <>
          {isCreatingMerch && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
            >
              <h2 className="text-xl font-bold mb-4">Add New Merch</h2>
              <form onSubmit={handleCreateMerch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Item Name</label>
                  <input 
                    required
                    type="text" 
                    value={merchFormData.name}
                    onChange={e => setMerchFormData({...merchFormData, name: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input 
                    required
                    type="text" 
                    value={merchFormData.category}
                    onChange={e => setMerchFormData({...merchFormData, category: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. Apparel, Accessories"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price (NGN)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={merchFormData.price}
                    onChange={e => setMerchFormData({...merchFormData, price: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={merchFormData.quantity}
                    onChange={e => setMerchFormData({...merchFormData, quantity: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                  <input 
                    type="url" 
                    value={merchFormData.imageUrl}
                    onChange={e => setMerchFormData({...merchFormData, imageUrl: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingMerch(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Save Merch
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold">Image</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Price</th>
                  <th className="p-4 font-semibold">Inventory</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerch.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          {item.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-gray-600">{item.category}</td>
                    <td className="p-4">₦{item.price.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.available > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.available} / {item.quantity} available
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteMerch(item.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMerch.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">No merch items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'merchOrders' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold">Order Ref</th>
                <th className="p-4 font-semibold">User ID</th>
                <th className="p-4 font-semibold">Merch ID</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMerchOrders.map(order => (
                <tr key={order.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium font-mono text-sm">{order.reference}</td>
                  <td className="p-4 text-sm text-gray-600">{order.userId}</td>
                  <td className="p-4 text-sm text-gray-600">{order.merchId}</td>
                  <td className="p-4">₦{order.amount.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      order.status === 'success' ? 'bg-green-100 text-green-800' : 
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMerchOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No merch orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'attendees' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold">Attendee Name</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Ticket Type</th>
                <th className="p-4 font-semibold">Amount Paid</th>
                <th className="p-4 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map(purchase => (
                <tr key={purchase.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">{purchase.userName || 'N/A'}</td>
                  <td className="p-4 text-gray-600">{purchase.userEmail || purchase.userId}</td>
                  <td className="p-4 text-gray-600">{purchase.ticketName || purchase.ticketTypeId}</td>
                  <td className="p-4 font-medium text-green-600">₦{purchase.amount.toLocaleString()}</td>
                  <td className="p-4 font-mono text-xs text-gray-500">{purchase.reference}</td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No attendees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'coupons' ? (
        <>
          {isCreatingCoupon && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
            >
              <h2 className="text-xl font-bold mb-4">Create New Coupon</h2>
              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Coupon Code</label>
                  <input 
                    type="text" 
                    value={couponFormData.code} 
                    onChange={e => setCouponFormData({...couponFormData, code: e.target.value})}
                    className="w-full p-2 border rounded-lg uppercase" 
                    required placeholder="e.g., EARLYBIRD" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount (%)</label>
                  <input 
                    type="number" min="1" max="100" 
                    value={couponFormData.discountPercentage} 
                    onChange={e => setCouponFormData({...couponFormData, discountPercentage: e.target.value})}
                    className="w-full p-2 border rounded-lg" 
                    required placeholder="e.g., 20" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Uses</label>
                  <input 
                    type="number" min="1" 
                    value={couponFormData.maxUses} 
                    onChange={e => setCouponFormData({...couponFormData, maxUses: e.target.value})}
                    className="w-full p-2 border rounded-lg" 
                    required placeholder="e.g., 50" 
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsCreatingCoupon(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg">Create Coupon</button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold">Code</th>
                  <th className="p-4 font-semibold">Discount</th>
                  <th className="p-4 font-semibold">Uses</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map(coupon => (
                  <tr key={coupon.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-bold font-mono">{coupon.code}</td>
                    <td className="p-4 text-red-600 font-medium">{coupon.discountPercentage}% OFF</td>
                    <td className="p-4 text-gray-600">
                      {coupon.currentUses} / {coupon.maxUses}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleToggleCoupon(coupon.id, coupon.active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          coupon.active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {coupon.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-500 hover:text-red-700 p-2">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCoupons.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No coupons found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'settings' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-6">Event Settings</h2>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Event Date</label>
              <input 
                type="text" 
                value={eventSettings.date}
                onChange={e => setEventSettings({...eventSettings, date: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g., 16th May, 2026"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Event Time</label>
              <input 
                type="text" 
                value={eventSettings.time}
                onChange={e => setEventSettings({...eventSettings, time: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g., 9:00 AM - 5:00 PM"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Venue Name</label>
              <input 
                type="text" 
                value={eventSettings.venue}
                onChange={e => setEventSettings({...eventSettings, venue: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g., College of Health Sciences (COHS) Auditorium"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Venue Address</label>
              <input 
                type="text" 
                value={eventSettings.venueAddress}
                onChange={e => setEventSettings({...eventSettings, venueAddress: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g., Federal University Lokoja, Adankolo Campus"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Countdown Target Date/Time (ISO Format)</label>
              <input 
                type="text" 
                value={eventSettings.countdownTarget}
                onChange={e => setEventSettings({...eventSettings, countdownTarget: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                placeholder="e.g., 2026-05-16T09:00:00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Used for the countdown timer on the homepage. Must be in YYYY-MM-DDTHH:mm:ss format.</p>
            </div>
            <div className="pt-4">
              <button 
                type="submit"
                disabled={isSavingSettings}
                className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                <Save size={20} />
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
