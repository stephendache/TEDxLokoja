import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QrScanner = ({ onScan }: { onScan: (text: string) => void }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
      },
      (error) => {
        // ignore errors
      }
    );
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return <div id="reader" className="w-full max-w-sm mx-auto bg-white" ></div>;
};
import { collection, addDoc, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc, setDoc, getDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Shield, ShieldAlert, Search, Save, ArrowUp, ArrowDown, Eye, EyeOff, Edit2, Settings, Download, CheckCircle, Circle, Filter, Mail, Scan, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AVAILABLE_PERMISSIONS = [
  { id: 'attendees', label: 'Attendees & Purchases' },
  { id: 'tickets', label: 'Manage Tickets' },
  { id: 'users', label: 'Manage Users' },
  { id: 'speakers', label: 'Manage Speakers' },
  { id: 'speakerApps', label: 'Speaker Apps' },
  { id: 'sponsorApps', label: 'Sponsor Apps' },
  { id: 'merch', label: 'Manage Merch' },
  { id: 'merchOrders', label: 'Merch Orders' },
  { id: 'coupons', label: 'Discount Codes' },
  { id: 'teamMembers', label: 'Manage Team' },
  { id: 'settings', label: 'Event Settings' }
];

interface EventSettings {
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
  countdownTarget: string;
  isCallForSpeakersOpen?: boolean;
}

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

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  permissions?: string[];
  createdAt: any;
}

interface Speaker {
  id: string;
  name: string;
  role: string;
  talkTitle?: string;
  bio?: string;
  imageUrl?: string;
  order?: number;
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
  checkedIn?: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  maxUses: number;
  currentUses: number;
  active: boolean;
  applicableTicketType?: string; // 'all' or ticket id
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

interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
  order?: number;
  visibility?: 'public' | 'hidden';
  createdAt: any;
}

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  tier: string;
  websiteUrl: string;
  order?: number;
  visibility?: 'public' | 'hidden';
}

export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakerApps, setSpeakerApps] = useState<SpeakerApplication[]>([]);
  const [sponsorApps, setSponsorApps] = useState<SponsorApplication[]>([]);
  const [merchItems, setMerchItems] = useState<MerchItem[]>([]);
  const [merchOrders, setMerchOrders] = useState<MerchOrder[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [ticketFilter, setTicketFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<'all' | 'with_ticket' | 'without_ticket'>('all');
  const [resendingTicketId, setResendingTicketId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [eventSettings, setEventSettings] = useState<EventSettings>({
    date: '16th May, 2026',
    time: '9:00 AM - 5:00 PM',
    venue: 'College of Health Sciences (COHS) Auditorium',
    venueAddress: 'Federal University Lokoja, Adankolo Campus',
    countdownTarget: '2026-05-16T09:00:00',
    isCallForSpeakersOpen: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'users' | 'speakers' | 'speakerApps' | 'sponsorApps' | 'merch' | 'merchOrders' | 'settings' | 'attendees' | 'coupons' | 'teamMembers' | 'partners'>('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editingTeamMemberId, setEditingTeamMemberId] = useState<string | null>(null);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [permissionsModalUser, setPermissionsModalUser] = useState<UserProfile | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isCreatingSpeaker, setIsCreatingSpeaker] = useState(false);
  const [isCreatingTeamMember, setIsCreatingTeamMember] = useState(false);
  const [isCreatingPartner, setIsCreatingPartner] = useState(false);
  const [isCreatingMerch, setIsCreatingMerch] = useState(false);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [isCreatingAttendee, setIsCreatingAttendee] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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
    talkTitle: '',
    bio: '',
    imageUrl: ''
  });
  const [teamMemberFormData, setTeamMemberFormData] = useState({
    name: '',
    role: '',
    imageUrl: '',
    visibility: 'public' as 'public' | 'hidden'
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
    maxUses: '',
    applicableTicketType: 'all'
  });
  const [attendeeFormData, setAttendeeFormData] = useState({
    userName: '',
    userEmail: '',
    ticketTypeId: '',
    amount: '',
    reference: ''
  });
  const [partnerFormData, setPartnerFormData] = useState({
    name: '',
    logoUrl: '',
    tier: '',
    websiteUrl: '',
    visibility: 'public' as 'public' | 'hidden'
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

    const unsubscribeTeamMembers = onSnapshot(collection(db, 'teamMembers'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamMember[];
      setTeamMembers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teamMembers');
    });

    const unsubscribePartners = onSnapshot(collection(db, 'partners'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Partner[];
      setPartners(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'partners');
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
      unsubscribeTeamMembers();
      unsubscribePartners();
    };
  }, [profile]);

  if (loading) return <div className="p-20 text-center">Loading...</div>;
  if (profile?.role !== 'admin') return <div className="p-20 text-center text-red-600">Access Denied. Admin only.</div>;

  const lowerQuery = searchQuery.toLowerCase();
  const filteredTickets = tickets.filter(t => t.name.toLowerCase().includes(lowerQuery) || t.description?.toLowerCase().includes(lowerQuery));
  const displayTickets = searchQuery ? filteredTickets : [...tickets].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const filteredUsers = users.filter(u => {
    const searchMatch = u.displayName?.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery) || u.role.toLowerCase().includes(lowerQuery);
    
    // Check ticket status for userFilter
    const hasTicket = purchases.some(p => p.userId === u.uid && p.status === 'success');
    let filterMatch = true;
    if (userFilter === 'with_ticket') filterMatch = hasTicket;
    if (userFilter === 'without_ticket') filterMatch = !hasTicket;
    
    return searchMatch && filterMatch;
  });
  const filteredSpeakers = speakers.filter(s => s.name.toLowerCase().includes(lowerQuery) || s.role.toLowerCase().includes(lowerQuery));
  const displaySpeakers = searchQuery 
    ? filteredSpeakers 
    : [...speakers].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const filteredSpeakerApps = speakerApps.filter(a => a.name.toLowerCase().includes(lowerQuery) || a.email.toLowerCase().includes(lowerQuery) || a.topic.toLowerCase().includes(lowerQuery));
  const filteredSponsorApps = sponsorApps.filter(a => a.companyName.toLowerCase().includes(lowerQuery) || a.contactName.toLowerCase().includes(lowerQuery) || a.email.toLowerCase().includes(lowerQuery));
  const filteredMerch = merchItems.filter(m => m.name.toLowerCase().includes(lowerQuery) || m.category.toLowerCase().includes(lowerQuery));
  const filteredMerchOrders = merchOrders.filter(o => o.userId.toLowerCase().includes(lowerQuery) || o.status.toLowerCase().includes(lowerQuery));
  const filteredPurchases = purchases.filter(p => {
    const searchMatch = p.status === 'success' && (p.userName?.toLowerCase().includes(lowerQuery) || p.userEmail?.toLowerCase().includes(lowerQuery) || p.reference?.toLowerCase().includes(lowerQuery) || p.ticketName?.toLowerCase().includes(lowerQuery));
    const ticketMatch = ticketFilter === 'all' || p.ticketName === ticketFilter;
    return searchMatch && ticketMatch;
  });

  const uniqueTicketTypes = Array.from(new Set(purchases.map(p => p.ticketName).filter(Boolean)));
  const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(lowerQuery));
  const filteredTeamMembers = teamMembers.filter(t => t.name.toLowerCase().includes(lowerQuery) || t.role.toLowerCase().includes(lowerQuery));
  const displayTeamMembers = searchQuery 
    ? filteredTeamMembers 
    : [...teamMembers].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const hasPermission = (tabId: string) => {
    if (profile?.role !== 'admin') return false;
    if (!profile.permissions) return true;
    return profile.permissions.includes(tabId);
  };

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
        toast.success("Ticket updated successfully!");
      } else {
        await addDoc(collection(db, 'ticketTypes'), {
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          quantity: Number(formData.quantity),
          available: Number(formData.quantity),
          visibility: formData.visibility,
          order: tickets.length,
          createdAt: serverTimestamp()
        });
        toast.success("Ticket created successfully!");
      }
      setIsCreating(false);
      setEditingTicketId(null);
      setFormData({ name: '', description: '', price: '', quantity: '', visibility: 'public' });
    } catch (error) {
      toast.error("An error occurred");
      handleFirestoreError(error, editingTicketId ? OperationType.UPDATE : OperationType.CREATE, 'ticketTypes');
    }
  };

  const handleMoveTicket = async (index: number, direction: 'up' | 'down') => {
    const sorted = [...tickets].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    if (direction === 'up' && index > 0) {
      const temp = sorted[index];
      sorted[index] = sorted[index - 1];
      sorted[index - 1] = temp;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const temp = sorted[index];
      sorted[index] = sorted[index + 1];
      sorted[index + 1] = temp;
    } else {
      return;
    }

    try {
      await Promise.all(sorted.map((ticket, idx) => {
        if (ticket.order !== idx) {
          return updateDoc(doc(db, 'ticketTypes', ticket.id), { order: idx });
        }
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ticketTypes');
      toast.error("Failed to reorder tickets");
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
      toast.success(`Ticket visibility set to ${newVisibility}`);
    } catch (error) {
      toast.error("Failed to update visibility");
      handleFirestoreError(error, OperationType.UPDATE, `ticketTypes/${ticket.id}`);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ticket type?')) {
      try {
        await deleteDoc(doc(db, 'ticketTypes', id));
        toast.success("Ticket deleted");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `ticketTypes/${id}`);
      }
    }
  };

  const handleSaveSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSpeakerId) {
        await updateDoc(doc(db, 'speakers', editingSpeakerId), {
          name: speakerFormData.name,
          role: speakerFormData.role,
          talkTitle: speakerFormData.talkTitle || null,
          bio: speakerFormData.bio || null,
          imageUrl: speakerFormData.imageUrl || null,
        });
      } else {
        const highestOrder = Math.max(...speakers.map(s => s.order ?? 0), -1);
        await addDoc(collection(db, 'speakers'), {
          name: speakerFormData.name,
          role: speakerFormData.role,
          talkTitle: speakerFormData.talkTitle || null,
          bio: speakerFormData.bio || null,
          imageUrl: speakerFormData.imageUrl || null,
          order: highestOrder + 1,
          createdAt: serverTimestamp()
        });
      }
      setIsCreatingSpeaker(false);
      setEditingSpeakerId(null);
      setSpeakerFormData({ name: '', role: '', talkTitle: '', bio: '', imageUrl: '' });
      toast.success(`Speaker ${editingSpeakerId ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      toast.error(`An error occurred ${editingSpeakerId ? 'updating' : 'adding'} speaker`);
      handleFirestoreError(error, editingSpeakerId ? OperationType.UPDATE : OperationType.CREATE, editingSpeakerId ? `speakers/${editingSpeakerId}` : 'speakers');
    }
  };

  const handleEditSpeaker = (speaker: Speaker) => {
    setSpeakerFormData({
      name: speaker.name,
      role: speaker.role,
      talkTitle: speaker.talkTitle || '',
      bio: speaker.bio || '',
      imageUrl: speaker.imageUrl || ''
    });
    setEditingSpeakerId(speaker.id);
    setIsCreatingSpeaker(true);
  };

  const handleReorderSpeakers = async (speakerId: string, direction: 'up' | 'down') => {
    const sortedSpeakers = [...speakers].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const currentIndex = sortedSpeakers.findIndex(s => s.id === speakerId);
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex > 0) {
      const temp = sortedSpeakers[currentIndex];
      sortedSpeakers[currentIndex] = sortedSpeakers[currentIndex - 1];
      sortedSpeakers[currentIndex - 1] = temp;
      
      try {
        await Promise.all(sortedSpeakers.map((s, idx) => {
          if (s.order !== idx) {
             return updateDoc(doc(db, 'speakers', s.id), { order: idx });
          }
        }));
      } catch (error) {
         handleFirestoreError(error, OperationType.UPDATE, 'speakers');
      }
    } else if (direction === 'down' && currentIndex < sortedSpeakers.length - 1) {
      const temp = sortedSpeakers[currentIndex];
      sortedSpeakers[currentIndex] = sortedSpeakers[currentIndex + 1];
      sortedSpeakers[currentIndex + 1] = temp;
      
      try {
        await Promise.all(sortedSpeakers.map((s, idx) => {
          if (s.order !== idx) {
             return updateDoc(doc(db, 'speakers', s.id), { order: idx });
          }
        }));
      } catch (error) {
         handleFirestoreError(error, OperationType.UPDATE, 'speakers');
      }
    }
  };

  const handleDeleteSpeaker = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this speaker?')) {
      try {
        await deleteDoc(doc(db, 'speakers', id));
        toast.success("Speaker deleted");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `speakers/${id}`);
      }
    }
  };

  const handleSaveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeamMemberId) {
        await updateDoc(doc(db, 'teamMembers', editingTeamMemberId), {
          name: teamMemberFormData.name,
          role: teamMemberFormData.role,
          imageUrl: teamMemberFormData.imageUrl || null,
          visibility: teamMemberFormData.visibility,
        });
        toast.success("Team member updated successfully!");
      } else {
        await addDoc(collection(db, 'teamMembers'), {
          name: teamMemberFormData.name,
          role: teamMemberFormData.role,
          imageUrl: teamMemberFormData.imageUrl || null,
          visibility: teamMemberFormData.visibility,
          order: teamMembers.length,
          createdAt: serverTimestamp()
        });
        toast.success("Team member added successfully!");
      }
      setIsCreatingTeamMember(false);
      setEditingTeamMemberId(null);
      setTeamMemberFormData({ name: '', role: '', imageUrl: '', visibility: 'public' });
    } catch (error) {
      toast.error(`Failed to ${editingTeamMemberId ? 'update' : 'add'} team member`);
      handleFirestoreError(error, editingTeamMemberId ? OperationType.UPDATE : OperationType.CREATE, editingTeamMemberId ? `teamMembers/${editingTeamMemberId}` : 'teamMembers');
    }
  };

  const handleEditTeamMember = (member: TeamMember) => {
    setTeamMemberFormData({
      name: member.name,
      role: member.role,
      imageUrl: member.imageUrl || '',
      visibility: member.visibility || 'public'
    });
    setEditingTeamMemberId(member.id);
    setIsCreatingTeamMember(true);
  };

  const handleToggleTeamMemberVisibility = async (member: TeamMember) => {
    try {
      const newVisibility = member.visibility === 'hidden' ? 'public' : 'hidden';
      await updateDoc(doc(db, 'teamMembers', member.id), {
        visibility: newVisibility
      });
      toast.success(`Team member visibility set to ${newVisibility}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teamMembers/${member.id}`);
      toast.error("Failed to update visibility");
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      try {
        await deleteDoc(doc(db, 'teamMembers', id));
        toast.success("Team member removed");
      } catch (error) {
        toast.error("Failed to remove team member");
        handleFirestoreError(error, OperationType.DELETE, `teamMembers/${id}`);
      }
    }
  };

  const handleMoveTeamMember = async (index: number, direction: 'up' | 'down') => {
    const sorted = [...teamMembers].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    if (direction === 'up' && index > 0) {
      const temp = sorted[index];
      sorted[index] = sorted[index - 1];
      sorted[index - 1] = temp;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const temp = sorted[index];
      sorted[index] = sorted[index + 1];
      sorted[index + 1] = temp;
    } else {
      return;
    }

    try {
      await Promise.all(sorted.map((member, idx) => {
        if (member.order !== idx) {
          return updateDoc(doc(db, 'teamMembers', member.id), { order: idx });
        }
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'teamMembers');
      toast.error("Failed to reorder team members");
    }
  };

  const handleAddAttendeeManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeFormData.userName || !attendeeFormData.userEmail || !attendeeFormData.ticketTypeId) {
      toast.error("Please fill all required fields");
      return;
    }

    const selectedTicket = tickets.find(t => t.id === attendeeFormData.ticketTypeId);
    if (!selectedTicket) return;

    const reference = attendeeFormData.reference.trim() || 'MAN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    try {
      await addDoc(collection(db, 'purchases'), {
        userId: 'manual_entry',
        userName: attendeeFormData.userName,
        userEmail: attendeeFormData.userEmail,
        ticketTypeId: selectedTicket.id,
        ticketName: selectedTicket.name,
        amount: attendeeFormData.amount ? Number(attendeeFormData.amount) : 0,
        status: 'success',
        reference: reference,
        createdAt: serverTimestamp(),
        checkedIn: false
      });

      toast.success("Attendee added successfully!");
      setIsCreatingAttendee(false);
      setAttendeeFormData({ userName: '', userEmail: '', ticketTypeId: '', amount: '', reference: '' });
      
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchases');
      toast.error("Failed to add attendee");
    }
  };

  const handleToggleCheckIn = async (purchaseId: string, currentStatus: boolean | undefined) => {
    try {
      await updateDoc(doc(db, 'purchases', purchaseId), { checkedIn: !currentStatus });
      toast.success(currentStatus ? "Check-in removed" : "Checked in successfully");
      
      if (!currentStatus) {
        const purchase = purchases.find(p => p.id === purchaseId);
        if (purchase && purchase.userEmail) {
          fetch('/api/send-checkin-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: purchase.userEmail,
              name: purchase.userName || 'Attendee'
            })
          }).catch(err => console.error("Failed to send check-in email:", err));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'purchases');
      toast.error("Failed to update check-in status");
    }
  };

  const handleScanResult = async (scannedText: string) => {
    const purchase = purchases.find(p => p.reference === scannedText);
    if (!purchase) {
      toast.error(`Invalid ticket reference: ${scannedText}`);
      setIsScannerOpen(false);
      return;
    }
    if (purchase.checkedIn) {
      toast.error(`Already checked in: ${purchase.userName || 'Attendee'}`);
      setIsScannerOpen(false);
      return;
    }
    
    await handleToggleCheckIn(purchase.id, false);
    setIsScannerOpen(false);
  };

  const handleResendTicket = async (purchase: Purchase) => {
    if (!purchase.userEmail) {
      toast.error("No email associated with this purchase.");
      return;
    }
    setResendingTicketId(purchase.id);
    try {
      const res = await fetch('/api/send-ticket-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: purchase.userEmail,
          name: purchase.userName || 'Attendee',
          ticketName: purchase.ticketName || purchase.ticketTypeId,
          reference: purchase.reference
        })
      });
      
      if (res.ok) {
        toast.success("Ticket resent successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to resend ticket.");
      }
    } catch (error) {
      console.error("Error resending ticket:", error);
      toast.error("An error occurred while resending the ticket.");
    } finally {
      setResendingTicketId(null);
    }
  };

  const exportAttendeesExcel = () => {
    const exportData = filteredPurchases.map(p => ({
      Name: p.userName || 'N/A',
      Email: p.userEmail || p.userId,
      'Ticket Type': p.ticketName || p.ticketTypeId,
      Amount: p.amount || 0,
      Reference: p.reference || 'N/A',
      'Checked In': p.checkedIn ? 'Yes' : 'No',
      Date: p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendees");
    XLSX.writeFile(wb, "attendees-export.xlsx");
  };

  const exportAttendeesPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendees Report", 14, 15);
    
    const tableColumn = ["Name", "Email", "Ticket", "Amount", "Ref", "Checked-in"];
    const tableRows = filteredPurchases.map(p => [
      p.userName || 'N/A',
      p.userEmail || p.userId,
      p.ticketName || p.ticketTypeId,
      `₦${p.amount.toLocaleString()}`,
      p.reference,
      p.checkedIn ? 'Yes' : 'No'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20
    });

    doc.save("attendees-export.pdf");
  };

  const exportUsersExcel = () => {
    const exportData = filteredUsers.map(u => ({
      Name: u.displayName || 'N/A',
      Email: u.email,
      Role: u.role,
      'Bought Ticket': purchases.some(p => p.userId === u.uid && p.status === 'success') ? 'Yes' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "users-export.xlsx");
  };

  const exportUsersPDF = () => {
    const doc = new jsPDF();
    doc.text("Users Report", 14, 15);
    
    const tableColumn = ["Name", "Email", "Role", "Bought Ticket"];
    const tableRows = filteredUsers.map(u => [
      u.displayName || 'N/A',
      u.email,
      u.role,
      purchases.some(p => p.userId === u.uid && p.status === 'success') ? 'Yes' : 'No'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20
    });

    doc.save("users-export.pdf");
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    if (userId === profile?.uid) {
      toast.error("You cannot change your own role.");
      return;
    }
    
    if (currentRole === 'user') {
      const u = users.find(user => user.uid === userId);
      if (u) {
        setPermissionsModalUser(u);
        setSelectedPermissions(u.permissions || AVAILABLE_PERMISSIONS.map(p => p.id));
      }
    } else {
      if (window.confirm("Are you sure you want to revoke admin privileges?")) {
        try {
          await updateDoc(doc(db, 'users', userId), { role: 'user', permissions: [] });
          toast.success("Admin privileges revoked");
        } catch (error) {
          toast.error("Failed to update user role");
          handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
        }
      }
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionsModalUser) return;
    try {
      await updateDoc(doc(db, 'users', permissionsModalUser.uid), {
        role: 'admin',
        permissions: selectedPermissions
      });
      toast.success("Admin role and permissions saved");
      setPermissionsModalUser(null);
    } catch (error) {
      toast.error("Failed to save permissions");
      handleFirestoreError(error, OperationType.UPDATE, `users/${permissionsModalUser.uid}`);
    }
  };

  const handleUpdateSponsorStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'sponsorApplications', appId), { status: newStatus });
      toast.success("Sponsorship status updated");
    } catch (error) {
      toast.error("Failed to update status");
      handleFirestoreError(error, OperationType.UPDATE, `sponsorApplications/${appId}`);
    }
  };

  const handleUpdateSpeakerAppStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'speakerApplications', appId), { status: newStatus });
      toast.success("Speaker application status updated");
    } catch (error) {
      toast.error("Failed to update status");
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
      toast.success("Merch item created!");
    } catch (error) {
      toast.error("Failed to add merch item");
      handleFirestoreError(error, OperationType.CREATE, 'merch');
    }
  };

  const handleDeleteMerch = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this merch item?')) {
      try {
        await deleteDoc(doc(db, 'merch', id));
        toast.success("Merch item deleted");
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
        applicableTicketType: couponFormData.applicableTicketType,
        currentUses: 0,
        active: true,
        createdAt: serverTimestamp()
      });
      setIsCreatingCoupon(false);
      setCouponFormData({ code: '', discountPercentage: '', maxUses: '', applicableTicketType: 'all' });
      toast.success("Coupon created successfully!");
    } catch (error) {
      toast.error("Failed to create coupon");
      handleFirestoreError(error, OperationType.CREATE, 'coupons');
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const highestOrder = Math.max(...partners.map(p => p.order || 0), -1);
      await addDoc(collection(db, 'partners'), {
        ...partnerFormData,
        order: highestOrder + 1,
        createdAt: serverTimestamp()
      });
      setIsCreatingPartner(false);
      setPartnerFormData({ name: '', logoUrl: '', tier: '', websiteUrl: '', visibility: 'public' });
      toast.success("Partner created successfully!");
    } catch (error) {
      toast.error("Failed to create partner");
      handleFirestoreError(error, OperationType.CREATE, 'partners');
    }
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartnerId) return;
    try {
      await updateDoc(doc(db, 'partners', editingPartnerId), {
        ...partnerFormData
      });
      setEditingPartnerId(null);
      setPartnerFormData({ name: '', logoUrl: '', tier: '', websiteUrl: '', visibility: 'public' });
      toast.success("Partner updated successfully!");
    } catch (error) {
      toast.error("Failed to update partner");
      handleFirestoreError(error, OperationType.UPDATE, `partners/${editingPartnerId}`);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this partner?')) {
      try {
        await deleteDoc(doc(db, 'partners', id));
        toast.success("Partner deleted");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `partners/${id}`);
      }
    }
  };

  const handleTogglePartnerVisibility = async (partner: Partner) => {
    try {
      const newVisibility = partner.visibility === 'hidden' ? 'public' : 'hidden';
      await updateDoc(doc(db, 'partners', partner.id), { visibility: newVisibility });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `partners/${partner.id}`);
      toast.error("Failed to update partner visibility");
    }
  };

  const handleReorderPartners = async (partnerId: string, direction: 'up' | 'down') => {
    const currentIndex = partners.findIndex(p => p.id === partnerId);
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex > 0) {
      const newPartners = [...partners];
      const temp = newPartners[currentIndex];
      newPartners[currentIndex] = newPartners[currentIndex - 1];
      newPartners[currentIndex - 1] = temp;
      
      try {
        await Promise.all(newPartners.map((p, idx) => {
          if (p.order !== idx) {
            return updateDoc(doc(db, 'partners', p.id), { order: idx });
          }
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'partners');
      }
    } else if (direction === 'down' && currentIndex < partners.length - 1) {
      const newPartners = [...partners];
      const temp = newPartners[currentIndex];
      newPartners[currentIndex] = newPartners[currentIndex + 1];
      newPartners[currentIndex + 1] = temp;
      
      try {
        await Promise.all(newPartners.map((p, idx) => {
          if (p.order !== idx) {
            return updateDoc(doc(db, 'partners', p.id), { order: idx });
          }
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'partners');
      }
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await deleteDoc(doc(db, 'coupons', id));
        toast.success("Coupon deleted");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `coupons/${id}`);
      }
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', id), { active: !currentStatus });
      toast.success(`Coupon ${currentStatus ? 'deactivated' : 'activated'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coupons/${id}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'eventDetails'), eventSettings);
      toast.success('Event settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
      handleFirestoreError(error, OperationType.UPDATE, 'settings/eventDetails');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {permissionsModalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold mb-4">Manage Permissions for {permissionsModalUser.displayName || 'User'}</h2>
            <p className="text-sm text-gray-500 mb-4">Select which modules this admin can access.</p>
            <div className="space-y-3 mb-6">
              {AVAILABLE_PERMISSIONS.map(permission => (
                <label key={permission.id} className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPermissions([...selectedPermissions, permission.id]);
                      } else {
                        setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                  />
                  <span>{permission.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPermissionsModalUser(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Save Permissions
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
        {activeTab === 'attendees' && (
          <button 
            onClick={() => setIsCreatingAttendee(!isCreatingAttendee)}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />
            Add Attendee Manually
          </button>
        )}
        {activeTab === 'teamMembers' && (
          <button 
            onClick={() => setIsCreatingTeamMember(!isCreatingTeamMember)}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />
            Add Team Member
          </button>
        )}
        {activeTab === 'partners' && (
          <button 
            onClick={() => setIsCreatingPartner(!isCreatingPartner)}
            className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
          >
            <Plus size={20} />
            Add Partner/Sponsor
          </button>
        )}
      </div>

      <div className="flex gap-6 mb-8 border-b border-gray-200 overflow-x-auto whitespace-nowrap">
        {hasPermission('attendees') && (
          <button
            onClick={() => setActiveTab('attendees')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'attendees' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Attendees & Purchases
          </button>
        )}
        {hasPermission('tickets') && (
          <button
            onClick={() => setActiveTab('tickets')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'tickets' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Manage Tickets
          </button>
        )}
        {hasPermission('users') && (
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'users' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Manage Users
          </button>
        )}
        {hasPermission('speakers') && (
          <button
            onClick={() => setActiveTab('speakers')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'speakers' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Manage Speakers
          </button>
        )}
        {hasPermission('speakerApps') && (
          <button
            onClick={() => setActiveTab('speakerApps')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'speakerApps' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Speaker Apps
          </button>
        )}
        {hasPermission('sponsorApps') && (
          <button
            onClick={() => setActiveTab('sponsorApps')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'sponsorApps' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Sponsorships
          </button>
        )}
        {hasPermission('merch') && (
          <button
            onClick={() => setActiveTab('merch')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'merch' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Merch Inventory
          </button>
        )}
        {hasPermission('merchOrders') && (
          <button
            onClick={() => setActiveTab('merchOrders')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'merchOrders' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Merch Orders
          </button>
        )}
        {hasPermission('coupons') && (
          <button
            onClick={() => setActiveTab('coupons')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'coupons' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Coupons
          </button>
        )}
        {hasPermission('settings') && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'settings' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Event Settings
          </button>
        )}
        {hasPermission('teamMembers') && (
          <button
            onClick={() => setActiveTab('teamMembers')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'teamMembers' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Manage Team
          </button>
        )}
        {hasPermission('partners') && (
          <button
            onClick={() => setActiveTab('partners')}
            className={`pb-4 font-medium transition-colors ${activeTab === 'partners' ? 'text-red-600 border-b-2 border-red-600 -mb-[1px]' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Partners
          </button>
        )}
      </div>

      {!hasPermission(activeTab) ? (
        <div className="py-20 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view this module.</p>
        </div>
      ) : activeTab === 'tickets' ? (
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
                {displayTickets.map((ticket, index) => (
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
                      {!searchQuery && (
                        <>
                          <button 
                            onClick={() => handleMoveTicket(index, 'up')}
                            disabled={index === 0}
                            className={`p-2 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Move Up"
                          >
                            <ArrowUp size={18} />
                          </button>
                          <button 
                            onClick={() => handleMoveTicket(index, 'down')}
                            disabled={index === displayTickets.length - 1}
                            className={`p-2 mr-2 ${index === displayTickets.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Move Down"
                          >
                            <ArrowDown size={18} />
                          </button>
                        </>
                      )}
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
                {displayTickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No tickets found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'users' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={18} className="text-gray-500" />
              <select 
                value={userFilter}
                onChange={e => setUserFilter(e.target.value as 'all' | 'with_ticket' | 'without_ticket')}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
              >
                <option value="all">All Users</option>
                <option value="with_ticket">Bought Tickets</option>
                <option value="without_ticket">No Tickets</option>
              </select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-gray-500 mr-2">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </span>
              <button 
                onClick={exportUsersExcel}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                <Download size={14} />
                Excel
              </button>
              <button 
                onClick={exportUsersPDF}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
              >
                <Download size={14} />
                PDF
              </button>
            </div>
          </div>
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
                  <td className="p-4 text-right flex items-center justify-end gap-4">
                    {u.role === 'admin' && (
                      <button
                        onClick={() => {
                          setPermissionsModalUser(u);
                          setSelectedPermissions(u.permissions || AVAILABLE_PERMISSIONS.map(p => p.id));
                        }}
                        className="text-sm font-medium flex items-center gap-1 text-gray-600 hover:text-gray-900"
                        title="Manage Permissions"
                      >
                        <Settings size={16} /> Permissions
                      </button>
                    )}
                    <button
                      onClick={() => handleRoleChange(u.uid, u.role)}
                      disabled={u.uid === profile?.uid}
                      className={`text-sm font-medium flex items-center gap-1 ${
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
      </div>
      ) : activeTab === 'speakers' ? (
        <>
          {isCreatingSpeaker && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
            >
              <h2 className="text-xl font-bold mb-4">{editingSpeakerId ? 'Edit Speaker' : 'New Speaker'}</h2>
              <form onSubmit={handleSaveSpeaker} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium mb-1">Talk Title (Optional)</label>
                  <input 
                    type="text" 
                    value={speakerFormData.talkTitle}
                    onChange={e => setSpeakerFormData({...speakerFormData, talkTitle: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. The Future of AI"
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
                    onClick={() => {
                      setIsCreatingSpeaker(false);
                      setEditingSpeakerId(null);
                      setSpeakerFormData({ name: '', role: '', talkTitle: '', bio: '', imageUrl: '' });
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {editingSpeakerId ? 'Update Speaker' : 'Save Speaker'}
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
                {displaySpeakers.map((speaker, index) => (
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
                        onClick={() => handleReorderSpeakers(speaker.id, 'up')}
                        disabled={index === 0}
                        className={`p-2 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Move Up"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button 
                        onClick={() => handleReorderSpeakers(speaker.id, 'down')}
                        disabled={index === displaySpeakers.length - 1}
                        className={`p-2 mr-2 ${index === displaySpeakers.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Move Down"
                      >
                        <ArrowDown size={18} />
                      </button>
                      <button 
                        onClick={() => handleEditSpeaker(speaker)}
                        className="text-blue-500 hover:text-blue-700 p-2 border-l border-gray-200 ml-2 pl-4"
                        title="Edit Speaker"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSpeaker(speaker.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Delete Speaker"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {displaySpeakers.length === 0 && (
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
        <div className="space-y-4">
          {isCreatingAttendee && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
            >
              <h3 className="text-xl font-bold mb-4">Add Attendee Manually</h3>
              <form onSubmit={handleAddAttendeeManually} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input 
                    type="text" 
                    value={attendeeFormData.userName} 
                    onChange={e => setAttendeeFormData({...attendeeFormData, userName: e.target.value})}
                    className="w-full p-2 border rounded-lg" 
                    required placeholder="e.g., John Doe" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input 
                    type="email" 
                    value={attendeeFormData.userEmail} 
                    onChange={e => {
                      const email = e.target.value;
                      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
                      setAttendeeFormData({
                        ...attendeeFormData, 
                        userEmail: email,
                        ...(existingUser && existingUser.displayName ? { userName: existingUser.displayName } : {})
                      });
                    }}
                    list="users-emails"
                    className="w-full p-2 border rounded-lg" 
                    required placeholder="e.g., john@example.com" 
                  />
                  <datalist id="users-emails">
                    {users.map(u => (
                      <option key={u.uid} value={u.email}>{u.displayName}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ticket Type</label>
                  <select 
                    value={attendeeFormData.ticketTypeId} 
                    onChange={e => setAttendeeFormData({...attendeeFormData, ticketTypeId: e.target.value})}
                    className="w-full p-2 border rounded-lg" 
                    required 
                  >
                    <option value="">Select a ticket</option>
                    {tickets.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Paid (Optional)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={attendeeFormData.amount} 
                    onChange={e => setAttendeeFormData({...attendeeFormData, amount: e.target.value})}
                    className="w-full p-2 border rounded-lg" 
                    placeholder="e.g., 0 for free" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Reference (Optional)</label>
                  <input 
                    type="text" 
                    value={attendeeFormData.reference} 
                    onChange={e => setAttendeeFormData({...attendeeFormData, reference: e.target.value})}
                    className="w-full p-2 border rounded-lg uppercase" 
                    placeholder="e.g., PAY-123456" 
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsCreatingAttendee(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
                  >
                    Add Attendee
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={18} className="text-gray-500" />
              <select 
                value={ticketFilter}
                onChange={e => setTicketFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2.5"
              >
                <option value="all">All Ticket Types</option>
                {uniqueTicketTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={exportAttendeesExcel}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition w-full sm:w-auto text-sm font-medium"
              >
                <Download size={16} />
                Excel
              </button>
              <button 
                onClick={exportAttendeesPDF}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition w-full sm:w-auto text-sm font-medium"
              >
                <Download size={16} />
                PDF
              </button>
              <button 
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition w-full sm:w-auto text-sm font-medium"
              >
                <Scan size={16} />
                Scan Barcode
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold">Attendee Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Ticket Type</th>
                  <th className="p-4 font-semibold">Amount Paid</th>
                  <th className="p-4 font-semibold">Reference</th>
                  <th className="p-4 font-semibold text-center">Check-in</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map(purchase => (
                  <tr key={purchase.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-medium">{purchase.userName || 'N/A'}</td>
                    <td className="p-4 text-gray-600">{purchase.userEmail || purchase.userId}</td>
                    <td className="p-4 text-gray-600">{purchase.ticketName || purchase.ticketTypeId}</td>
                    <td className="p-4 font-medium text-green-600">₦{purchase.amount?.toLocaleString() || purchase.amount || 0}</td>
                    <td className="p-4 font-mono text-xs text-gray-500">{purchase.reference || 'N/A'}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleToggleCheckIn(purchase.id, purchase.checkedIn)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          purchase.checkedIn 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {purchase.checkedIn ? <CheckCircle size={14} /> : <Circle size={14} />}
                        {purchase.checkedIn ? 'Checked in' : 'Check in'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleResendTicket(purchase)}
                        disabled={resendingTicketId === purchase.id || !purchase.userEmail}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Resend Ticket Email"
                      >
                        {resendingTicketId === purchase.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
                        ) : (
                          <Mail size={16} />
                        )}
                        <span className="hidden sm:inline">Resend</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">No attendees found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <AnimatePresence>
            {isScannerOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsScannerOpen(false)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6"
                >
                  <button 
                    onClick={() => setIsScannerOpen(false)}
                    className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full text-gray-900 hover:bg-gray-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold">Scan Ticket</h3>
                    <p className="text-gray-500">Scan an attendee's QR code or barcode to check them in.</p>
                  </div>
                  
                  <QrScanner onScan={handleScanResult} />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
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
              <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div>
                  <label className="block text-sm font-medium mb-1">Applies To</label>
                  <select 
                    value={couponFormData.applicableTicketType} 
                    onChange={e => setCouponFormData({...couponFormData, applicableTicketType: e.target.value})}
                    className="w-full p-2 border rounded-lg" 
                    required
                  >
                    <option value="all">All Ticket Types</option>
                    {tickets.map(ticket => (
                      <option key={ticket.id} value={ticket.id}>{ticket.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4 flex justify-end gap-2 mt-2">
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
                  <th className="p-4 font-semibold">Applies To</th>
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
                    <td className="p-4 text-gray-600 text-sm">
                      {coupon.applicableTicketType === 'all' || !coupon.applicableTicketType 
                        ? 'All Tickets' 
                        : tickets.find(t => t.id === coupon.applicableTicketType)?.name || 'Unknown'}
                    </td>
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
                    <td colSpan={6} className="p-8 text-center text-gray-500">No coupons found.</td>
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
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <h4 className="font-medium text-gray-900">Call for Speakers</h4>
                <p className="text-sm text-gray-500">Enable or disable the call for speakers form.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={eventSettings.isCallForSpeakersOpen !== false}
                  onChange={(e) => setEventSettings({...eventSettings, isCallForSpeakersOpen: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
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
      ) : activeTab === 'teamMembers' ? (
        <>
          {isCreatingTeamMember && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
            >
              <h2 className="text-xl font-bold mb-4">{editingTeamMemberId ? 'Edit Team Member' : 'Add Team Member'}</h2>
              <form onSubmit={handleSaveTeamMember} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input 
                    required
                    type="text" 
                    value={teamMemberFormData.name}
                    onChange={e => setTeamMemberFormData({...teamMemberFormData, name: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role / Title</label>
                  <input 
                    required
                    type="text" 
                    value={teamMemberFormData.role}
                    onChange={e => setTeamMemberFormData({...teamMemberFormData, role: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. Organizer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Visibility</label>
                  <select 
                    value={teamMemberFormData.visibility}
                    onChange={e => setTeamMemberFormData({...teamMemberFormData, visibility: e.target.value as 'public' | 'hidden'})}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="public">Public</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                  <input 
                    type="url" 
                    value={teamMemberFormData.imageUrl}
                    onChange={e => setTeamMemberFormData({...teamMemberFormData, imageUrl: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                        setIsCreatingTeamMember(false);
                        setEditingTeamMemberId(null);
                        setTeamMemberFormData({ name: '', role: '', imageUrl: '', visibility: 'public' });
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {editingTeamMemberId ? 'Update Team Member' : 'Save Team Member'}
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
                {displayTeamMembers.map((member, index) => (
                  <tr key={member.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      {member.imageUrl ? (
                        <img src={member.imageUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">
                      {member.name}
                      {member.visibility === 'hidden' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Hidden
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">{member.role}</td>
                    <td className="p-4 text-right">
                      {!searchQuery && (
                        <>
                          <button 
                            onClick={() => handleMoveTeamMember(index, 'up')}
                            disabled={index === 0}
                            className={`p-2 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Move Up"
                          >
                            <ArrowUp size={18} />
                          </button>
                          <button 
                            onClick={() => handleMoveTeamMember(index, 'down')}
                            disabled={index === displayTeamMembers.length - 1}
                            className={`p-2 mr-2 ${index === displayTeamMembers.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Move Down"
                          >
                            <ArrowDown size={18} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleToggleTeamMemberVisibility(member)}
                        className="text-gray-500 hover:text-gray-700 p-2"
                        title={member.visibility === 'hidden' ? 'Make Public' : 'Make Hidden'}
                      >
                        {member.visibility === 'hidden' ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button 
                        onClick={() => handleEditTeamMember(member)}
                        className="text-blue-500 hover:text-blue-700 p-2 border-l border-gray-200 ml-2 pl-4"
                        title="Edit Team Member"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTeamMember(member.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Delete Team Member"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayTeamMembers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">No team members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'partners' ? (
        <>
          {isCreatingPartner && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200"
            >
              <h2 className="text-xl font-bold mb-4">{editingPartnerId ? 'Edit Partner' : 'Add Partner'}</h2>
              <form onSubmit={editingPartnerId ? handleUpdatePartner : handleCreatePartner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input 
                    required
                    type="text" 
                    value={partnerFormData.name}
                    onChange={e => setPartnerFormData({...partnerFormData, name: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tier / Category</label>
                  <input 
                    required
                    type="text" 
                    value={partnerFormData.tier}
                    onChange={e => setPartnerFormData({...partnerFormData, tier: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. Platinum Partner"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Visibility</label>
                  <select 
                    value={partnerFormData.visibility}
                    onChange={e => setPartnerFormData({...partnerFormData, visibility: e.target.value as 'public' | 'hidden'})}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="public">Public</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo URL</label>
                  <input 
                    required
                    type="url" 
                    value={partnerFormData.logoUrl}
                    onChange={e => setPartnerFormData({...partnerFormData, logoUrl: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website URL (Optional)</label>
                  <input 
                    type="url" 
                    value={partnerFormData.websiteUrl}
                    onChange={e => setPartnerFormData({...partnerFormData, websiteUrl: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                        setIsCreatingPartner(false);
                        setEditingPartnerId(null);
                        setPartnerFormData({ name: '', logoUrl: '', tier: '', websiteUrl: '', visibility: 'public' });
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {editingPartnerId ? 'Update Partner' : 'Save Partner'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold">Logo</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Tier</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...partners].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).map((partner, index) => (
                  <tr key={partner.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      {partner.logoUrl ? (
                        <img src={partner.logoUrl} alt={partner.name} className="h-10 object-contain" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                          {partner.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">
                      {partner.name}
                      {partner.visibility === 'hidden' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Hidden
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">{partner.tier}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleReorderPartners(partner.id, 'up')}
                        disabled={index === 0}
                        className={`p-2 ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Move Up"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button 
                        onClick={() => handleReorderPartners(partner.id, 'down')}
                        disabled={index === partners.length - 1}
                        className={`p-2 mr-2 ${index === partners.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Move Down"
                      >
                        <ArrowDown size={18} />
                      </button>
                      <button 
                        onClick={() => handleTogglePartnerVisibility(partner)}
                        className="text-gray-500 hover:text-gray-700 p-2"
                        title={partner.visibility === 'hidden' ? 'Make Public' : 'Make Hidden'}
                      >
                        {partner.visibility === 'hidden' ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingPartnerId(partner.id);
                          setPartnerFormData({
                            name: partner.name,
                            logoUrl: partner.logoUrl,
                            tier: partner.tier || '',
                            websiteUrl: partner.websiteUrl || '',
                            visibility: partner.visibility || 'public'
                          });
                          setIsCreatingPartner(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 p-2 border-l border-gray-200 ml-2 pl-4"
                        title="Edit Partner"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeletePartner(partner.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Delete Partner"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">No partners found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
