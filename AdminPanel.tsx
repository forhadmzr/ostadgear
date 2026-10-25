import React, { useState, useRef } from 'react';
import { 
  X, 
  Lock, 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Check, 
  AlertCircle, 
  LogOut, 
  Image as ImageIcon,
  Sparkles,
  Phone,
  Clock,
  Layers,
  FileText,
  Database,
  Download,
  Upload,
  Camera,
  RefreshCw,
  Search,
  User,
  Store,
  Receipt,
  Banknote,
  Printer,
  Tag,
  Percent,
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { Product, ProductCategory, ProductSize, Order, OrderStatus } from '../types';
import { COPYRIGHT_FREE_IMAGE_PRESETS } from '../data/initialProducts';
import { STORE_CONTACT } from '../data/bangladeshDistricts';

// Helper to compress and read image from phone/computer file upload
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('দয়া করে একটি সঠিক ইমেজ (JPG/PNG/WEBP) ফাইল নির্বাচন করুন।'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // compress to JPEG with 0.84 quality for crisp look & fast storage
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.84);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('ইমেজ লোড করতে সমস্যা হয়েছে।'));
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onLogin: (id: string, pass: string) => boolean;
  onLogout: () => void;
  products: Product[];
  orders: Order[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddOrder?: (order: Order) => Promise<void> | void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void> | void;
  onDeleteOrder?: (orderId: string) => Promise<void> | void;
  onResetData: () => void;
  onOpenMasterPrompt?: () => void;
  dbConnected?: boolean;
  onDownloadBackup?: () => void;
  onRefreshOrders?: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  isLoggedIn,
  onLogin,
  onLogout,
  products,
  orders,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onResetData,
  onOpenMasterPrompt,
  dbConnected = true,
  onDownloadBackup,
  onRefreshOrders,
}) => {
  if (!isOpen) return null;

  // Login form state
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active admin tab: 'products' | 'orders' | 'offline_sales' | 'analytics'
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'offline_sales' | 'analytics'>('products');

  // In-Store / Offline POS Sales States
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offCustomerName, setOffCustomerName] = useState('শোরুম ওয়াক-ইন কাস্টমার');
  const [offPhone, setOffPhone] = useState('');
  const [offProductId, setOffProductId] = useState('');
  const [offSize, setOffSize] = useState<ProductSize>('L');
  const [offQty, setOffQty] = useState(1);
  const [offUnitPrice, setOffUnitPrice] = useState<number>(650);
  const [offDiscount, setOffDiscount] = useState<number>(0);
  const [offDiscountType, setOffDiscountType] = useState<'flat' | 'percent'>('flat');
  const [offDiscountValue, setOffDiscountValue] = useState<number>(0);
  const [offDiscountReason, setOffDiscountReason] = useState<string>('');
  const [offPaymentMethod, setOffPaymentMethod] = useState<'cash' | 'bkash' | 'nagad'>('cash');
  const [offTrxId, setOffTrxId] = useState('');
  const [offNotes, setOffNotes] = useState('');
  const [offError, setOffError] = useState('');
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const [offlineSearchQuery, setOfflineSearchQuery] = useState('');
  const [selectedMemoToPrint, setSelectedMemoToPrint] = useState<Order | null>(null);
  const [orderChannelFilter, setOrderChannelFilter] = useState<'all' | 'online' | 'offline'>('all');

  // Live order refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncToast, setSyncToast] = useState('');

  const handleManualRefresh = async () => {
    if (!onRefreshOrders) return;
    setIsRefreshing(true);
    try {
      await onRefreshOrders();
      setSyncToast('অর্ডার তালিকা সফলভাবে আপডেট হয়েছে!');
      setTimeout(() => setSyncToast(''), 3000);
    } catch (err) {
      console.error('Manual refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product form fields
  const [formTitle, setFormTitle] = useState('');
  const [formTitleBn, setFormTitleBn] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('dropshoulder');
  const [formPrice, setFormPrice] = useState(650);
  const [formOriginalPrice, setFormOriginalPrice] = useState(850);
  const [formStock, setFormStock] = useState(50);
  const [formSizes, setFormSizes] = useState<ProductSize[]>(['M', 'L', 'XL']);
  const [formImage, setFormImage] = useState(COPYRIGHT_FREE_IMAGE_PRESETS[0].url);
  const [formDescription, setFormDescription] = useState('');
  const [formGsm, setFormGsm] = useState(220);
  const [formComposition, setFormComposition] = useState('100% Combed Compact Cotton');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Manual Order Creation Modal State
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [moCustomerName, setMoCustomerName] = useState('');
  const [moPhone, setMoPhone] = useState('');
  const [moAddress, setMoAddress] = useState('');
  const [moThana, setMoThana] = useState('');
  const [moDistrict, setMoDistrict] = useState('Dhaka');
  const [moZone, setMoZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [moProductId, setMoProductId] = useState('');
  const [moSize, setMoSize] = useState<ProductSize>('L');
  const [moQty, setMoQty] = useState(1);
  const [moPaymentMethod, setMoPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [moTrxId, setMoTrxId] = useState('');
  const [moStatus, setMoStatus] = useState<OrderStatus>('confirmed');
  const [moNotes, setMoNotes] = useState('');
  const [moCourier, setMoCourier] = useState('Steadfast Courier');
  const [moTrackingCode, setMoTrackingCode] = useState('');
  const [moError, setMoError] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const handleOpenAddOrderModal = () => {
    setMoCustomerName('');
    setMoPhone('');
    setMoAddress('');
    setMoThana('');
    setMoDistrict('Dhaka');
    setMoZone('inside_dhaka');
    setMoProductId(products[0]?.id || '');
    setMoSize('L');
    setMoQty(1);
    setMoPaymentMethod('cod');
    setMoTrxId('');
    setMoStatus('confirmed');
    setMoNotes('');
    setMoCourier('Steadfast Courier');
    setMoTrackingCode('');
    setMoError('');
    setIsAddOrderModalOpen(true);
  };

  const handleSaveManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setMoError('');
    if (!moCustomerName.trim()) {
      setMoError('গ্রাহকের নাম আবশ্যক');
      return;
    }
    if (!moPhone.trim() || moPhone.trim().length < 11) {
      setMoError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }
    if (!moAddress.trim()) {
      setMoError('ডেলিভারি ঠিকানা আবশ্যক');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const selectedProd = products.find(p => p.id === moProductId) || products[0];
      const unitPrice = selectedProd ? selectedProd.price : 650;
      const subtotal = unitPrice * moQty;
      const deliveryFee = moZone === 'inside_dhaka' ? 70 : 130;
      const total = subtotal + deliveryFee;

      const newOrder: Order = {
        id: `ord-manual-${Date.now()}`,
        orderNumber: `OG-BD-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: moCustomerName.trim(),
        phone: moPhone.trim(),
        address: moAddress.trim(),
        thanaCity: moThana.trim() || moDistrict,
        district: moDistrict,
        deliveryZone: moZone,
        deliveryFee,
        paymentMethod: moPaymentMethod,
        trxId: moTrxId.trim() || undefined,
        items: [
          {
            productId: selectedProd?.id || 'manual-item',
            title: selectedProd?.title || 'Custom Apparel',
            category: selectedProd?.category || 'dropshoulder',
            image: selectedProd?.image || COPYRIGHT_FREE_IMAGE_PRESETS[0].url,
            size: moSize,
            price: unitPrice,
            quantity: moQty,
          }
        ],
        subtotal,
        discount: 0,
        total,
        status: moStatus,
        orderDate: new Date().toISOString(),
        notes: moNotes.trim() || undefined,
        deliveryCourier: moCourier.trim() || undefined,
        trackingCode: moTrackingCode.trim() || undefined,
      };

      if (onAddOrder) {
        await Promise.resolve(onAddOrder(newOrder));
      }
      setSyncToast(`অর্ডার #${newOrder.orderNumber} সফলভাবে তৈরি হয়েছে!`);
      setTimeout(() => setSyncToast(''), 4000);
      setIsAddOrderModalOpen(false);
    } catch (err: any) {
      console.error('Error saving manual order:', err);
      setMoError('অর্ডার সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleOpenOfflineModal = () => {
    const firstProd = products[0];
    setOffCustomerName('শোরুম ওয়াক-ইন কাস্টমার');
    setOffPhone('');
    setOffProductId(firstProd?.id || '');
    setOffSize('L');
    setOffQty(1);
    setOffUnitPrice(firstProd ? firstProd.price : 650);
    setOffDiscount(0);
    setOffDiscountType('flat');
    setOffDiscountValue(0);
    setOffDiscountReason('');
    setOffPaymentMethod('cash');
    setOffTrxId('');
    setOffNotes('');
    setOffError('');
    setIsOfflineModalOpen(true);
  };

  const handleSaveOfflineSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setOffError('');
    setIsSubmittingOffline(true);
    try {
      const selectedProd = products.find(p => p.id === offProductId) || products[0];
      const unitPrice = Number(offUnitPrice) || (selectedProd ? selectedProd.price : 650);
      const subtotal = unitPrice * offQty;
      
      // Calculate discount amount based on flat taka or percentage
      const discountAmount = offDiscountType === 'percent'
        ? Math.round((subtotal * Math.min(100, Math.max(0, Number(offDiscountValue) || 0))) / 100)
        : Math.min(subtotal, Math.max(0, Number(offDiscountValue) || 0));

      const total = Math.max(0, subtotal - discountAmount);

      const discountLabel = discountAmount > 0
        ? `[ছাড়: ৳${discountAmount}${offDiscountType === 'percent' ? ` (${offDiscountValue}%)` : ''}${offDiscountReason.trim() ? ` - ${offDiscountReason.trim()}` : ''}]`
        : '';
      const orderNotes = [
        '[শোরুম বিক্রয়]',
        discountLabel,
        offNotes.trim()
      ].filter(Boolean).join(' ');

      const newOfflineOrder: Order = {
        id: `ord-pos-${Date.now()}`,
        orderNumber: `OG-POS-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: offCustomerName.trim() || 'শোরুম ওয়াক-ইন কাস্টমার',
        phone: offPhone.trim() || 'ইন-স্টোর ক্যাশ',
        address: 'শোরুম কাউন্টার বিক্রয় (রামপুরা শোরুম, ঢাকা)',
        thanaCity: 'রামপুরা',
        district: 'Dhaka',
        deliveryZone: 'in_store',
        deliveryFee: 0,
        paymentMethod: offPaymentMethod,
        trxId: offTrxId.trim() || undefined,
        items: [
          {
            productId: selectedProd ? selectedProd.id : 'pos-item',
            title: selectedProd ? selectedProd.title : 'OSTAD GEAR Apparel',
            category: selectedProd ? selectedProd.category : 'dropshoulder',
            image: selectedProd ? selectedProd.image : COPYRIGHT_FREE_IMAGE_PRESETS[0].url,
            size: offSize,
            price: unitPrice,
            quantity: offQty,
          }
        ],
        subtotal,
        discount: discountAmount,
        total,
        status: 'delivered',
        orderDate: new Date().toISOString(),
        notes: orderNotes,
        isOfflinePurchase: true,
        saleChannel: 'offline_shop',
      };

      if (onAddOrder) {
        await Promise.resolve(onAddOrder(newOfflineOrder));
      }
      setSyncToast(`শোরুম বিক্রয় স্লিপ #${newOfflineOrder.orderNumber} সফলভাবে সেভ হয়েছে!`);
      setTimeout(() => setSyncToast(''), 4000);
      setIsOfflineModalOpen(false);
      setSelectedMemoToPrint(newOfflineOrder);
    } catch (err: any) {
      console.error('Error saving offline sale:', err);
      setOffError('অফলাইন বিক্রয় সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  const handleStatusChange = async (orderId: string, orderNumber: string, newStatus: OrderStatus) => {
    try {
      await Promise.resolve(onUpdateOrderStatus(orderId, newStatus));
      setSyncToast(`অর্ডার #${orderNumber} স্ট্যাটাস '${newStatus}' আপডেট হয়েছে!`);
      setTimeout(() => setSyncToast(''), 3000);
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleDeleteOrderClick = async (orderId: string, orderNumber: string) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে অর্ডার #${orderNumber} মুছে ফেলতে চান?`)) {
      if (onDeleteOrder) {
        try {
          await Promise.resolve(onDeleteOrder(orderId));
          setSyncToast(`অর্ডার #${orderNumber} সফলভাবে ডিলিট করা হয়েছে!`);
          setTimeout(() => setSyncToast(''), 3000);
        } catch (err) {
          console.error('Order delete error:', err);
        }
      }
    }
  };
  
  // Image Upload from Gallery / Device state
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    setImageUploadError('');

    try {
      const dataUrl = await compressImageFile(file);
      setFormImage(dataUrl);
    } catch (err: any) {
      setImageUploadError(err.message || 'ছবি আপলোড করতে ব্যর্থ হয়েছে');
    } finally {
      setImageUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(adminId, password);
    if (!success) {
      setLoginError('ভুল এডমিন আইডি বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করুন।');
    } else {
      setLoginError('');
      setAdminId('');
      setPassword('');
    }
  };

  // Open Add Product
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormTitleBn('');
    setFormCategory('dropshoulder');
    setFormPrice(650);
    setFormOriginalPrice(850);
    setFormStock(40);
    setFormSizes(['M', 'L', 'XL']);
    setFormImage(COPYRIGHT_FREE_IMAGE_PRESETS[0].url);
    setFormDescription('High-density heavyweight street apparel crafted with bio-wash cotton.');
    setFormGsm(220);
    setFormComposition('100% Combed Cotton');
    setIsProductModalOpen(true);
  };

  // Open Edit Product
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormTitle(p.title);
    setFormTitleBn(p.titleBn || '');
    setFormCategory(p.category);
    setFormPrice(p.price);
    setFormOriginalPrice(p.originalPrice);
    setFormStock(p.stock);
    setFormSizes(p.sizes);
    setFormImage(p.image);
    setFormDescription(p.description);
    setFormGsm(p.fabricDetails.gsm);
    setFormComposition(p.fabricDetails.composition);
    setIsProductModalOpen(true);
  };

  // Handle Save Product (Add or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        title: formTitle.trim(),
        titleBn: formTitleBn.trim() || undefined,
        category: formCategory,
        price: Number(formPrice),
        originalPrice: Number(formOriginalPrice),
        stock: Number(formStock),
        sizes: formSizes,
        image: formImage.trim() || COPYRIGHT_FREE_IMAGE_PRESETS[0].url,
        description: formDescription.trim(),
        fabricDetails: {
          ...editingProduct.fabricDetails,
          gsm: Number(formGsm),
          composition: formComposition,
        },
      });
    } else {
      onAddProduct({
        title: formTitle.trim(),
        titleBn: formTitleBn.trim() || undefined,
        category: formCategory,
        price: Number(formPrice),
        originalPrice: Number(formOriginalPrice),
        stock: Number(formStock),
        sizes: formSizes,
        colors: [{ name: 'Default', hex: '#111111' }],
        image: formImage.trim() || COPYRIGHT_FREE_IMAGE_PRESETS[0].url,
        description: formDescription.trim(),
        fabricDetails: {
          gsm: Number(formGsm),
          composition: formComposition,
          fit: formCategory === 'dropshoulder' ? 'Relaxed Drop Shoulder' : 'Regular Fit',
          care: 'Machine wash cold, gentle cycle.',
        },
        rating: 5.0,
        reviewsCount: 1,
        isFeatured: true,
        isBestSeller: false,
      });
    }

    setIsProductModalOpen(false);
  };

  const toggleSize = (size: ProductSize) => {
    if (formSizes.includes(size)) {
      if (formSizes.length > 1) {
        setFormSizes(formSizes.filter(s => s !== size));
      }
    } else {
      setFormSizes([...formSizes, size]);
    }
  };

  // Calculations for analytics and channels
  const offlineOrders = orders.filter(o => o.isOfflinePurchase || o.deliveryZone === 'in_store' || o.saleChannel === 'offline_shop');
  const onlineOrders = orders.filter(o => !o.isOfflinePurchase && o.deliveryZone !== 'in_store' && o.saleChannel !== 'offline_shop');

  const totalRevenue = orders.reduce((sum, o) => (o.status !== 'cancelled' ? sum + o.total : sum), 0);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending' && !o.isOfflinePurchase && o.deliveryZone !== 'in_store').length;

  const offlineRevenueTotal = offlineOrders.reduce((sum, o) => sum + o.total, 0);
  const offlineCashTotal = offlineOrders.filter(o => o.paymentMethod === 'cash' || o.paymentMethod === 'cod').reduce((sum, o) => sum + o.total, 0);
  const offlineDigitalTotal = offlineOrders.filter(o => o.paymentMethod === 'bkash' || o.paymentMethod === 'nagad' || o.paymentMethod === 'rocket').reduce((sum, o) => sum + o.total, 0);
  const offlineItemsSoldTotal = offlineOrders.reduce((sum, o) => sum + o.items.reduce((acc, it) => acc + it.quantity, 0), 0);

  const filteredOrders = orders.filter((o) => {
    if (orderChannelFilter === 'online' && (o.isOfflinePurchase || o.deliveryZone === 'in_store')) return false;
    if (orderChannelFilter === 'offline' && (!o.isOfflinePurchase && o.deliveryZone !== 'in_store')) return false;

    const matchesFilter = orderFilter === 'all' || o.status === orderFilter;
    if (!matchesFilter) return false;
    if (!orderSearchQuery.trim()) return true;
    const q = orderSearchQuery.toLowerCase().trim();
    return (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q)) ||
      (o.address && o.address.toLowerCase().includes(q)) ||
      (o.trxId && o.trxId.toLowerCase().includes(q))
    );
  });

  const filteredOfflineOrders = offlineOrders.filter((o) => {
    if (!offlineSearchQuery.trim()) return true;
    const q = offlineSearchQuery.toLowerCase().trim();
    return (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q)) ||
      (o.trxId && o.trxId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-6xl bg-[#12141a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* If NOT logged in, show Auth Gate */}
        {!isLoggedIn ? (
          <div className="p-6 sm:p-10 max-w-md mx-auto w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black mx-auto flex items-center justify-center shadow-lg border border-white/10">
              <img src="/assets/aistudio/image_6b0fd8cc.png" alt="Ostad Gear Logo" className="w-full h-full object-cover" />
            </div>

            <div className="space-y-1.5 flex flex-col items-center">
              <img src="/assets/aistudio/ostad_gear_text.png" alt="OSTAD GEAR" className="h-7 w-auto" />
              <h2 className="text-xs sm:text-sm font-bold text-zinc-300 font-display">
                এডমিন প্যানেল লগইন
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                পণ্য যোগ, এডিট, ডিলিট এবং কাস্টমার অর্ডার ম্যানেজ করার জন্য লগইন করুন
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  এডমিন আইডি (Admin ID)
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="এডমিন আইডি লিখুন"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  পাসওয়ার্ড (Password)
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="পাসওয়ার্ড লিখুন"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition shadow-lg shadow-amber-500/20"
              >
                এডমিন হিসেবে প্রবেশ করুন
              </button>
            </form>

            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline"
            >
              ফিরে যান (Close)
            </button>
          </div>
        ) : (
          /* LOGGED IN ADMIN DASHBOARD */
          <>
            {/* Admin Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0c0d10] flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-white/10 shrink-0 shadow-md">
                  <img src="/assets/aistudio/image_6b0fd8cc.png" alt="Ostad Gear Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <img src="/assets/aistudio/ostad_gear_text.png" alt="OSTAD GEAR" className="h-5 sm:h-6 w-auto" />
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      FORHAD1
                    </span>
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold px-2 py-0.5 rounded hidden sm:flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>DATABASE LIVE</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    টি-শার্ট, জার্সি, ড্রপ শোল্ডার ও হুডি পণ্য ও অর্ডার পরিচালনা করুন
                  </p>
                </div>
              </div>

              {/* Top Action Tabs & Logout */}
              <div className="flex items-center gap-2">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      activeTab === 'products'
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    পণ্যসমূহ ({products.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                      activeTab === 'orders'
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span>অর্ডারসমূহ ({orders.length})</span>
                    {pendingOrdersCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('offline_sales')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                      activeTab === 'offline_sales'
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>দোকানের অফলাইন বিক্রয় ({offlineOrders.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      activeTab === 'analytics'
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    অ্যানালিটিক্স
                  </button>
                </div>

                {onRefreshOrders && (
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs ${
                      isRefreshing ? 'animate-pulse' : ''
                    }`}
                    title="সার্ভার ডাটাবেস থেকে নতুন অর্ডার রিফ্রেশ করুন"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isRefreshing ? 'সিঙ্ক হচ্ছে...' : 'লাইভ সিঙ্ক'}</span>
                  </button>
                )}

                {onDownloadBackup && (
                  <button
                    onClick={onDownloadBackup}
                    className="px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 text-xs"
                    title="Export complete database backup JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">DB ব্যাকআপ</span>
                  </button>
                )}

                {onOpenMasterPrompt && (
                  <button
                    onClick={onOpenMasterPrompt}
                    className="px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs"
                    title="View secret master AI prompt"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">মাস্টার AI প্রম্পট</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
                  title="Close Admin"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Admin Content Area (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-400">মোট বিক্রয় (Revenue)</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-white">৳{totalRevenue}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-400">সর্বমোট অর্ডার</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-white">{totalOrdersCount} টি</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-400">সক্রিয় প্রোডাক্ট</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-white">{products.length} টি</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-400">পেন্ডিং অর্ডার</div>
                    <div className="text-base sm:text-lg font-bold font-mono text-rose-400">{pendingOrdersCount} টি</div>
                  </div>
                </div>
              </div>

              {/* TAB 1: PRODUCT MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        প্রোডাক্ট তালিকা ও স্টক ম্যানেজমেন্ট
                      </h3>
                      <p className="text-xs text-zinc-400">
                        নতুন পোশাক যুক্ত করুন, মূল্য পরিবর্তন করুন অথবা মুছে ফেলুন
                      </p>
                    </div>

                    <button
                      onClick={handleOpenAddModal}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-md transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>নতুন প্রোডাক্ট যোগ করুন</span>
                    </button>
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0c0d10]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-zinc-400 uppercase font-mono border-b border-white/10 text-[10px]">
                        <tr>
                          <th className="p-3">ছবি ও নাম</th>
                          <th className="p-3">ক্যাটাগরি</th>
                          <th className="p-3">মূল্য</th>
                          <th className="p-3">স্টক</th>
                          <th className="p-3">সাইজসমূহ</th>
                          <th className="p-3 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-zinc-300">
                        {products.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.image}
                                  alt={p.title}
                                  className="w-12 h-14 object-cover rounded-lg bg-zinc-800 shrink-0"
                                />
                                <div>
                                  <div className="font-semibold text-white line-clamp-1">{p.title}</div>
                                  {p.titleBn && (
                                    <div className="text-[11px] text-zinc-400 line-clamp-1">{p.titleBn}</div>
                                  )}
                                  <div className="text-[10px] text-zinc-500">{p.fabricDetails.composition} ({p.fabricDetails.gsm} GSM)</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="capitalize px-2 py-0.5 rounded bg-white/5 text-amber-400 font-mono text-[11px]">
                                {p.category}
                              </span>
                            </td>
                            <td className="p-3 font-mono">
                              <div className="font-bold text-white">৳{p.price}</div>
                              {p.originalPrice > p.price && (
                                <div className="text-zinc-500 line-through text-[11px]">৳{p.originalPrice}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`font-mono font-bold ${p.stock < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {p.stock} pcs
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap">
                                {p.sizes.map((s) => (
                                  <span key={s} className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 text-[10px] font-mono">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition"
                                  title="Edit Product"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`আপনি কি "${p.title}" প্রোডাক্টটি মুছে ফেলতে চান?`)) {
                                      onDeleteProduct(p.id);
                                    }
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: ORDER MANAGEMENT */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {/* Toast Alert */}
                  {syncToast && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{syncToast}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">মোট: {orders.length} টি অর্ডার</span>
                    </div>
                  )}

                  {/* Pending Orders Notice Banner */}
                  {pendingOrdersCount > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></div>
                        <span className="font-bold">
                          🔔 আপনার দোকানে {pendingOrdersCount} টি নতুন অর্ডার অপেক্ষমান (Pending)!
                        </span>
                      </div>
                      <button
                        onClick={() => setOrderFilter('pending')}
                        className="px-3 py-1 rounded-lg bg-amber-500 text-black font-extrabold text-[11px] hover:bg-amber-400 transition"
                      >
                        শুধুমাত্র নতুনগুলো দেখুন
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          গ্রাহকদের অর্ডার তালিকা ({orders.length})
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                          🟢 লাইভ কানেক্টেড
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        বিকাশ, নগদ বা ক্যাশ অন ডেলিভারি অর্ডার ভেরিফাই করে স্ট্যাটাস আপডেট করুন
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenAddOrderModal}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-md shadow-amber-500/10"
                      >
                        <Plus className="w-4 h-4" />
                        <span>নতুন অর্ডার তৈরি করুন</span>
                      </button>

                      {onRefreshOrders && (
                        <button
                          type="button"
                          onClick={handleManualRefresh}
                          disabled={isRefreshing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition shadow-sm"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                          <span>{isRefreshing ? 'সিঙ্ক হচ্ছে...' : 'লাইভ রিফ্রেশ'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search and Filters toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-black/30 p-2 rounded-2xl border border-white/5">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="অর্ডার নং (OG-BD-...), নাম, ফোন বা ঠিকানা খুঁজুন..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                      {orderSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setOrderSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Channel Selector: All / Online / Offline */}
                    <div className="flex bg-black/50 p-1 rounded-xl border border-white/10 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setOrderChannelFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          orderChannelFilter === 'all'
                            ? 'bg-white/20 text-white font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        সব ({orders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderChannelFilter('online')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          orderChannelFilter === 'online'
                            ? 'bg-blue-500/30 text-blue-300 font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🌐 অনলাইন ({onlineOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderChannelFilter('offline')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          orderChannelFilter === 'offline'
                            ? 'bg-amber-500 text-black font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        🏬 শোরুম অফলাইন ({offlineOrders.length})
                      </button>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex gap-1 overflow-x-auto p-0.5 text-xs shrink-0">
                      {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setOrderFilter(st)}
                          className={`px-2.5 py-1 rounded-lg capitalize transition whitespace-nowrap ${
                            orderFilter === st
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {st === 'all' ? 'সব স্ট্যাটাস' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl bg-[#0c0d10] border border-white/10 text-zinc-500 text-xs">
                      {orderSearchQuery ? 'এই সার্চের সাথে মিলে এমন কোনো অর্ডার পাওয়া যায়নি।' : 'কোনো অর্ডার পাওয়া যায়নি। কাস্টমার চেকআউট করলে বা আপনি নতুন অর্ডার তৈরি করলে এখানে দেখা যাবে।'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-2xl bg-[#0c0d10] border border-white/10 space-y-3 text-xs"
                        >
                          {/* Order Top Line */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-extrabold text-amber-400">
                                {ord.orderNumber}
                              </span>
                              <span className="text-zinc-500 font-mono text-[11px]">
                                {new Date(ord.orderDate).toLocaleString('bn-BD', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                })}
                              </span>
                            </div>

                            {/* Status Changer Dropdown & Delete Action */}
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 text-[11px]">স্ট্যাটাস:</span>
                              <select
                                value={ord.status}
                                onChange={(e) => handleStatusChange(ord.id, ord.orderNumber, e.target.value as OrderStatus)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer transition ${
                                  ord.status === 'delivered'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                    : ord.status === 'cancelled'
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                    : ord.status === 'shipped'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                }`}
                              >
                                <option value="pending" className="bg-[#181a22] text-white">Pending (অপেক্ষমান)</option>
                                <option value="confirmed" className="bg-[#181a22] text-white">Confirmed (ভেরিফাইড)</option>
                                <option value="processing" className="bg-[#181a22] text-white">Processing (প্যাকিং)</option>
                                <option value="shipped" className="bg-[#181a22] text-white">Shipped (কুরিয়ারে)</option>
                                <option value="delivered" className="bg-[#181a22] text-white">Delivered (সম্পন্ন)</option>
                                <option value="cancelled" className="bg-[#181a22] text-white">Cancelled (বাতিল)</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => setSelectedMemoToPrint(ord)}
                                className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-white/5 rounded-lg transition"
                                title="ক্যাশ মেমো / স্লিপ প্রিন্ট করুন"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {onDeleteOrder && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrderClick(ord.id, ord.orderNumber)}
                                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                  title="অর্ডারটি স্থায়ীভাবে মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Customer & Payment details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-zinc-300">
                            <div>
                              <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                                <span>গ্রাহকের বিবরণ</span>
                                {ord.isOfflinePurchase && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                    IN-STORE
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-white text-xs">{ord.customerName}</div>
                              <div className="font-mono text-zinc-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-amber-400" />
                                <span>{ord.phone}</span>
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] text-zinc-500">ডেলিভারি / বিক্রয় এলাকা</div>
                              <div className="text-zinc-300 text-[11px] line-clamp-2">
                                {ord.address}, {ord.thanaCity}, {ord.district}
                              </div>
                              <div className="text-[10px] text-amber-400 mt-0.5 font-medium">
                                {ord.deliveryZone === 'in_store'
                                  ? '🏬 শোরুম কাউন্টার সরাসরি বিক্রয় (চার্জ ৳০)'
                                  : ord.deliveryZone === 'inside_dhaka'
                                  ? 'ঢাকার ভিতরে (ডেলিভারি চার্জ ৳৭০)'
                                  : 'ঢাকার বাইরে (ডেলিভারি চার্জ ৳১৩০)'}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] text-zinc-500">পেমেন্ট মেথড ও TrxID</div>
                              <div className="font-mono text-xs text-white uppercase font-bold">
                                {ord.paymentMethod}
                              </div>
                              {ord.trxId ? (
                                <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                                  TrxID: <span className="font-bold">{ord.trxId}</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-400 mt-0.5">
                                  {ord.isOfflinePurchase ? '💵 ক্যাশ কাউন্টার পেমেন্ট' : 'ক্যাশ অন ডেলিভারি (COD)'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ordered items preview */}
                          <div className="border-t border-white/5 pt-2 flex flex-wrap items-center justify-between gap-2 text-zinc-400 text-[11px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              {ord.items.map((it, idx) => (
                                <span key={idx} className="bg-white/5 px-2 py-0.5 rounded text-zinc-300">
                                  {it.title} ({it.size}) × {it.quantity}
                                </span>
                              ))}
                            </div>
                            <div className="text-right">
                              <span className="text-zinc-500 mr-2">সর্বমোট:</span>
                              <span className="font-mono font-extrabold text-sm text-amber-400">৳{ord.total}</span>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: OFFLINE SHOP & POS SALES (দোকানের অফলাইন বিক্রয়) */}
              {activeTab === 'offline_sales' && (
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                          <Store className="w-4 h-4 text-amber-400" />
                          <span>শোরুম অফলাইন বিক্রয় ও হিসাব (In-Store POS)</span>
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold">
                          {offlineOrders.length} টি বিক্রয়
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        দোকানে সরাসরি এসে ক্যাশ বা বিকাশে কেনাকাটা করা কাস্টমারদের ইনভয়েস ও বিক্রয় হিসাব
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenOfflineModal}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-lg shadow-amber-500/10 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ নতুন অফলাইন বিক্রয় যুক্ত করুন</span>
                    </button>
                  </div>

                  {/* Offline Sales Summary KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ক্যাশ আদায়</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-1">
                        ৳{offlineCashTotal}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        <span>বিকাশ/নগদ আদায়</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-amber-400 mt-1">
                        ৳{offlineDigitalTotal}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                        <span>মোট অফলাইন বিক্রয়</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                        ৳{offlineRevenueTotal}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                        <span>মোট কাপড় বিক্রি</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold font-mono text-purple-400 mt-1">
                        {offlineItemsSoldTotal} টি
                      </div>
                    </div>
                  </div>

                  {/* Search Toolbar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="অফলাইন মেমো নম্বর, কাস্টমার নাম বা মোবাইল খুঁজুন..."
                      value={offlineSearchQuery}
                      onChange={(e) => setOfflineSearchQuery(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  {/* Table/Cards of Offline Purchases */}
                  {filteredOfflineOrders.length === 0 ? (
                    <div className="p-10 text-center bg-[#0c0d10] rounded-2xl border border-white/10 text-xs text-zinc-400 space-y-3">
                      <Store className="w-10 h-10 text-zinc-600 mx-auto" />
                      <div className="font-semibold text-white">এখনো কোনো অফলাইন বিক্রয়ের হিসাব এন্ট্রি করা হয়নি</div>
                      <p className="max-w-md mx-auto text-zinc-500">
                        দোকানে এসে কেউ কেনাকাটা করলে উপরের <strong>"+ নতুন অফলাইন বিক্রয় যুক্ত করুন"</strong> বাটনে ক্লিক করে সাথে সাথে স্লিপ তৈরি ও ক্যাশ হিসাব সংরক্ষণ করতে পারবেন।
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenOfflineModal}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition"
                      >
                        প্রথম অফলাইন বিক্রয় যোগ করুন
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredOfflineOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-2xl bg-[#0c0d10] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-amber-400 text-sm">{ord.orderNumber}</span>
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold text-[10px] uppercase font-mono">
                                🏬 শোরুম ক্যাশ মেমো
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">
                                {ord.paymentMethod === 'cash' ? '💵 নগদ ক্যাশ' : ord.paymentMethod === 'bkash' ? '📱 বিকাশ' : '📱 নগদ'}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {new Date(ord.orderDate).toLocaleString('bn-BD', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' })}
                              </span>
                            </div>

                            <div className="text-zinc-300 flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-zinc-500" />
                              <span className="font-bold text-white">{ord.customerName}</span>
                              {ord.phone && ord.phone !== 'ইন-স্টোর ক্যাশ' && (
                                <span className="font-mono text-zinc-400 text-[11px]">({ord.phone})</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-zinc-400 text-[11px]">
                              {ord.items.map((it, idx) => (
                                <span key={idx} className="bg-white/5 px-2 py-0.5 rounded text-zinc-300">
                                  {it.title} ({it.size}) × {it.quantity}
                                </span>
                              ))}
                              {ord.discount > 0 && (
                                <span className="text-emerald-400 text-[10px] font-semibold">
                                  (ছাড়: ৳{ord.discount})
                                </span>
                              )}
                              {ord.trxId && (
                                <span className="text-zinc-500 text-[10px] font-mono">
                                  TrxID: {ord.trxId}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                            <div className="text-right">
                              <span className="text-[10px] text-zinc-500 block">মোট আদায়</span>
                              <span className="text-base sm:text-lg font-extrabold font-mono text-amber-400">
                                ৳{ord.total}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedMemoToPrint(ord)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                                title="ক্যাশ মেমো প্রিন্ট করুন"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-400" />
                                <span className="hidden sm:inline">রসিদ</span>
                              </button>
                              {onDeleteOrder && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrderClick(ord.id, ord.orderNumber)}
                                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition"
                                  title="স্লিপ মুছুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ANALYTICS & QUICK ACTIONS */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Revenue Breakdown */}
                    <div className="p-5 rounded-2xl bg-[#0c0d10] border border-white/10 space-y-3 text-xs">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <span>বিক্রয় রিপোর্ট সামারি</span>
                      </h4>
                      <div className="space-y-2 text-zinc-400">
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                          <span>মোট সেলস পরিমাণ:</span>
                          <span className="font-mono font-bold text-white">৳{totalRevenue}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                          <span>মোট অর্ডার গৃহীত:</span>
                          <span className="font-mono text-white">{orders.length} টি</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                          <span>সফল ডেলিভার্ড অর্ডার:</span>
                          <span className="font-mono text-emerald-400">{orders.filter(o => o.status === 'delivered').length} টি</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                          <span>ক্যাশ অন ডেলিভারি অর্ডার:</span>
                          <span className="font-mono text-white">{orders.filter(o => o.paymentMethod === 'cod').length} টি</span>
                        </div>
                        <div className="flex justify-between">
                          <span>বিকাশ/নগদ ডিজিটাল পেমেন্ট:</span>
                          <span className="font-mono text-white">{orders.filter(o => o.paymentMethod !== 'cod').length} টি</span>
                        </div>
                      </div>
                    </div>

                    {/* Store Backup & Reset Data */}
                    <div className="p-5 rounded-2xl bg-[#0c0d10] border border-white/10 space-y-3 text-xs flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <span>ডাটাবেজ ও স্যাম্পল ডাটা রিস্টোর</span>
                        </h4>
                        <p className="text-zinc-400 mt-1 leading-relaxed">
                          আপনি যদি কোনো পণ্য টেস্ট করে ডিলিট করে থাকেন অথবা নতুন করে ডিফল্ট টি-শার্ট, জার্সি, ড্রপ শোল্ডার ও হুডি ফিরিয়ে আনতে চান, তবে নিচের বাটনটি ব্যবহার করুন।
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm('আপনি কি ডিফল্ট প্রোডাক্ট ডাটা রিস্টোর করতে চান?')) {
                            onResetData();
                          }
                        }}
                        className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition border border-white/10"
                      >
                        ডিফল্ট প্রোডাক্ট রিস্টোর করুন
                      </button>
                    </div>

                    {/* Master AI Prompt Card (Admin Only) */}
                    <div className="p-5 rounded-2xl bg-[#0c0d10] border border-emerald-500/30 space-y-3 text-xs flex flex-col justify-between md:col-span-2">
                      <div>
                        <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span>গোপন মাস্টার AI ইঞ্জিনিয়ারিং প্রম্পট (Secret Master Prompt - Admin Only)</span>
                        </h4>
                        <p className="text-zinc-400 mt-1 leading-relaxed">
                          সম্পূর্ণ স্ট্রিটওয়্যার ই-কমার্স স্টোরের আর্কিটেকচার, পেমেন্ট মেথড, এডমিন কন্ট্রোল ও ডেটাবেজ লজিক সম্বলিত ফুল ইঞ্জিনিয়ারিং প্রম্পটটি সাধারণ গ্রাহকদের থেকে গোপন রাখা হয়েছে এবং শুধুমাত্র এডমিন এখানে দেখতে পারবেন।
                        </p>
                      </div>

                      {onOpenMasterPrompt && (
                        <div className="pt-2">
                          <button
                            onClick={onOpenMasterPrompt}
                            className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            <span>মাস্টার AI প্রম্পট ওপেন ও কপি করুন</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          </>
        )}

      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div 
            className="relative w-full max-w-2xl bg-[#14161e] rounded-3xl border border-white/10 shadow-2xl p-5 sm:p-7 space-y-5 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                {editingProduct ? 'প্রোডাক্ট এডিট করুন (Edit Product)' : 'নতুন প্রোডাক্ট যুক্ত করুন (Add Product)'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              {/* Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    প্রোডাক্টের নাম (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acid Wash Heavyweight Drop Shoulder Tee"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    বাংলা নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: এসিড ওয়াশ ড্রপ শোল্ডার টি-শার্ট"
                    value={formTitleBn}
                    onChange={(e) => setFormTitleBn(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Category & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    ক্যাটাগরি (Category) *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full bg-[#1c1f2a] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="dropshoulder">Drop Shoulder (ড্রপ শোল্ডার)</option>
                    <option value="jersey">Jersey (স্পোর্টস জার্সি)</option>
                    <option value="hoodie">Hoodie (উইন্টার হুডি)</option>
                    <option value="tshirt">T-Shirt (রেগুলার টি-শার্ট)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    স্টক পরিমাণ (Stock Quantity) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    বিক্রয় মূল্য (Price in ৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    আগের মূল্য / ডিসকাউন্ট প্রাইস (Original Price) *
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Sizes Checkboxes */}
              <div>
                <label className="text-zinc-300 font-semibold mb-1.5 block">
                  উপলব্ধ সাইজ নির্বাচন করুন (Sizes) *
                </label>
                <div className="flex gap-2">
                  {(['S', 'M', 'L', 'XL', 'XXL'] as ProductSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-1.5 rounded-lg font-mono font-bold transition ${
                        formSizes.includes(size)
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Input: Gallery/Device Upload + URL + Presets */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-200 font-semibold text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>প্রোডাক্টের ছবি (Product Image) *</span>
                  </label>
                  
                  {/* Mode Selector */}
                  <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                        imageInputMode === 'upload'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>গ্যালারি থেকে</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        imageInputMode === 'url'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>ইমেজ URL</span>
                    </button>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />

                {imageInputMode === 'upload' ? (
                  <div className="space-y-2">
                    {/* Big Upload Area */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-700 hover:border-amber-500/70 bg-black/30 hover:bg-amber-500/5 rounded-2xl p-4 text-center cursor-pointer transition group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                        {imageUploadLoading ? (
                          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Camera className="w-6 h-6" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-zinc-200">
                        {imageUploadLoading ? 'ছবি প্রসেস হচ্ছে...' : 'মোবাইল বা কম্পিউটারের গ্যালারি থেকে ছবি আপলোড করুন'}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        JPG, PNG, WEBP (ক্লিক করে গ্যালারি থেকে বা ক্যামেরা দিয়ে ছবি তুলুন)
                      </p>
                    </div>

                    {imageUploadError && (
                      <p className="text-xs text-rose-400 font-semibold">{imageUploadError}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono text-[11px]"
                    />
                  </div>
                )}

                {/* Selected Image Preview with Quick Actions */}
                {formImage && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <img
                      src={formImage}
                      alt="Product preview"
                      className="w-16 h-16 object-cover rounded-lg bg-zinc-800 border border-white/20 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>ছবি সিলেক্ট করা হয়েছে</span>
                      </span>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                        {formImage.startsWith('data:') ? 'লোকাল ফাইল (সংকুচিত ও সুরক্ষিত)' : formImage}
                      </p>
                      <div className="flex gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-amber-400 hover:underline font-semibold"
                        >
                          ছবি পরিবর্তন করুন
                        </button>
                        <span className="text-zinc-600">•</span>
                        <button
                          type="button"
                          onClick={() => setFormImage('')}
                          className="text-[10px] text-rose-400 hover:underline font-semibold"
                        >
                          ছবি মুছুন
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1-Click Copyright-Free Presets */}
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">
                    বা ডেমো কপিরাইট-ফ্রি প্রিসেট ছবি বেছে নিন:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {COPYRIGHT_FREE_IMAGE_PRESETS.map((pst, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormImage(pst.url)}
                        className={`p-1.5 rounded-lg border text-left transition flex items-center gap-1.5 ${
                          formImage === pst.url
                            ? 'border-amber-400 bg-amber-400/10 text-white'
                            : 'border-white/5 bg-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <img src={pst.url} alt="" className="w-5 h-5 rounded object-cover" />
                        <span className="text-[10px] truncate">{pst.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fabric Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    ফ্যাব্রিক GSM
                  </label>
                  <input
                    type="number"
                    value={formGsm}
                    onChange={(e) => setFormGsm(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    উপাদান (Composition)
                  </label>
                  <input
                    type="text"
                    value={formComposition}
                    onChange={(e) => setFormComposition(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-zinc-300 font-semibold mb-1 block">
                  বিবরণ (Description)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-md"
                >
                  {editingProduct ? 'পরিবর্তন সংরক্ষণ করুন' : 'প্রোডাক্ট যুক্ত করুন'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MANUAL ORDER CREATION MODAL */}
      {isAddOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-2xl bg-[#12141a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0c0d10]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    নতুন ম্যানুয়াল অর্ডার তৈরি করুন
                  </h3>
                  <p className="text-xs text-zinc-400">
                    ফোন কল বা WhatsApp এর মাধ্যমে প্রাপ্ত কাস্টমার অর্ডার যুক্ত করুন
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddOrderModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveManualOrder} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {moError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{moError}</span>
                </div>
              )}

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    গ্রাহকের নাম (Customer Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: তানভীর আহমেদ"
                    value={moCustomerName}
                    onChange={(e) => setMoCustomerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    মোবাইল নম্বর (Phone Number) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={moPhone}
                    onChange={(e) => setMoPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Delivery Address & Zone */}
              <div className="space-y-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    ডেলিভারি ঠিকানা (Full Address) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="বাড়ি নং, রোড নং, এলাকা/গ্রাম..."
                    value={moAddress}
                    onChange={(e) => setMoAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-zinc-300 font-semibold mb-1 block">
                      জেলা (District)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: Dhaka"
                      value={moDistrict}
                      onChange={(e) => setMoDistrict(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold mb-1 block">
                      থানা / শহর (Thana/City)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: Mirpur"
                      value={moThana}
                      onChange={(e) => setMoThana(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold mb-1 block">
                      ডেলিভারি জোন
                    </label>
                    <select
                      value={moZone}
                      onChange={(e) => setMoZone(e.target.value as 'inside_dhaka' | 'outside_dhaka')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="inside_dhaka" className="bg-[#181a22] text-white">ঢাকার ভেতরে (৳৭০)</option>
                      <option value="outside_dhaka" className="bg-[#181a22] text-white">ঢাকার বাইরে (৳১৩০)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  <span>পণ্য ও সাইজ নির্বাচন</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-zinc-300 font-semibold mb-1 block">পণ্য (Product)</label>
                    <select
                      value={moProductId}
                      onChange={(e) => setMoProductId(e.target.value)}
                      className="w-full bg-[#12141a] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#181a22] text-white">
                          {p.title} (৳{p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold mb-1 block">সাইজ (Size)</label>
                    <select
                      value={moSize}
                      onChange={(e) => setMoSize(e.target.value as ProductSize)}
                      className="w-full bg-[#12141a] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                        <option key={sz} value={sz} className="bg-[#181a22] text-white">{sz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-zinc-300 font-semibold mb-1 block">পরিমাণ (Quantity)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={moQty}
                      onChange={(e) => setMoQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-[#12141a] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-300 font-semibold mb-1 block">অর্ডার স্ট্যাটাস</label>
                    <select
                      value={moStatus}
                      onChange={(e) => setMoStatus(e.target.value as OrderStatus)}
                      className="w-full bg-[#12141a] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="pending" className="bg-[#181a22] text-white">Pending (অপেক্ষমান)</option>
                      <option value="confirmed" className="bg-[#181a22] text-white">Confirmed (ভেরিফাইড)</option>
                      <option value="processing" className="bg-[#181a22] text-white">Processing (প্যাকিং)</option>
                      <option value="shipped" className="bg-[#181a22] text-white">Shipped (কুরিয়ারে)</option>
                      <option value="delivered" className="bg-[#181a22] text-white">Delivered (সম্পন্ন)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    পেমেন্ট মেথড
                  </label>
                  <select
                    value={moPaymentMethod}
                    onChange={(e) => setMoPaymentMethod(e.target.value as 'cod' | 'bkash' | 'nagad')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cod" className="bg-[#181a22] text-white">Cash on Delivery (ক্যাশ অন ডেলিভারি)</option>
                    <option value="bkash" className="bg-[#181a22] text-white">bKash (বিকাশ)</option>
                    <option value="nagad" className="bg-[#181a22] text-white">Nagad (নগদ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    TrxID / ট্রানজেকশন আইডি (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: BK9X82LA0P"
                    value={moTrxId}
                    onChange={(e) => setMoTrxId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Courier & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    কুরিয়ার সার্ভিস (Courier)
                  </label>
                  <select
                    value={moCourier}
                    onChange={(e) => setMoCourier(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Steadfast Courier" className="bg-[#181a22] text-white">Steadfast Courier</option>
                    <option value="Pathao Courier" className="bg-[#181a22] text-white">Pathao Courier</option>
                    <option value="RedX Courier" className="bg-[#181a22] text-white">RedX Courier</option>
                    <option value="Sundarban Courier" className="bg-[#181a22] text-white">Sundarban Courier</option>
                    <option value="SA Paribahan" className="bg-[#181a22] text-white">SA Paribahan</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold mb-1 block">
                    কুরিয়ার ট্র্যাকিং কোড (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: STF-8492"
                    value={moTrackingCode}
                    onChange={(e) => setMoTrackingCode(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold mb-1 block">
                  অর্ডার সংক্রান্ত বিশেষ নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: দ্রুত ডেলিভারি চাওয়া হয়েছে"
                  value={moNotes}
                  onChange={(e) => setMoNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="font-mono text-xs text-zinc-300">
                  মোট প্রদেয়: <span className="text-amber-400 font-bold text-sm">৳{((products.find(p => p.id === moProductId)?.price || 650) * moQty) + (moZone === 'inside_dhaka' ? 70 : 130)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOrderModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isSubmittingOrder ? 'সংরক্ষণ হচ্ছে...' : 'অর্ডার তৈরি করুন'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offline / In-Store POS Sale Modal */}
      {isOfflineModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141a] border border-amber-500/30 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsOfflineModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  শোরুম অফলাইন বিক্রয় এন্ট্রি (In-Store POS)
                </h3>
                <p className="text-xs text-zinc-400">
                  দোকানে সরাসরি এসে নগদ/মোবাইল ব্যাংকিংয়ে কেনাকাটা করা কাস্টমারদের ক্যাশ মেমো ও বিক্রয় রেকর্ড
                </p>
              </div>
            </div>

            {offError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {offError}
              </div>
            )}

            <form onSubmit={handleSaveOfflineSale} className="space-y-4 mt-4">
              {/* Customer Info */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>কাস্টমার তথ্য (ঐচ্ছিক)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-300 font-semibold mb-1 block">কাস্টমারের নাম</label>
                    <input
                      type="text"
                      placeholder="যেমন: শোরুম কাস্টমার / রাকিব হাসান"
                      value={offCustomerName}
                      onChange={(e) => setOffCustomerName(e.target.value)}
                      className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300 font-semibold mb-1 block">মোবাইল নম্বর (ঐচ্ছিক)</label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={offPhone}
                      onChange={(e) => setOffPhone(e.target.value)}
                      className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Product and Size */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>পণ্য ও স্টক নির্বাচন</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-zinc-300 font-semibold mb-1 block">পণ্য নির্বাচন</label>
                    <select
                      value={offProductId}
                      onChange={(e) => {
                        setOffProductId(e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) {
                          setOffUnitPrice(prod.price);
                        }
                      }}
                      className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#181a22] text-white">
                          {p.title} (মূল্য: ৳{p.price} | স্টক: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300 font-semibold mb-1 block">সাইজ</label>
                    <select
                      value={offSize}
                      onChange={(e) => setOffSize(e.target.value as ProductSize)}
                      className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                    >
                      {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                        <option key={sz} value={sz} className="bg-[#181a22] text-white">{sz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quantity & Unit Price */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs text-zinc-300 font-semibold mb-1 block">পরিমাণ (Quantity)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={offQty}
                      onChange={(e) => setOffQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 font-mono text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-300 font-semibold mb-1 block">একক রেট (৳ প্রতি পিস)</label>
                    <input
                      type="number"
                      min={0}
                      value={offUnitPrice}
                      onChange={(e) => setOffUnitPrice(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Dedicated In-Store Discount Section */}
              {(() => {
                const sub = (Number(offUnitPrice) || 0) * offQty;
                const discAmt = offDiscountType === 'percent'
                  ? Math.round((sub * Math.min(100, Math.max(0, Number(offDiscountValue) || 0))) / 100)
                  : Math.min(sub, Math.max(0, Number(offDiscountValue) || 0));
                const finalPayable = Math.max(0, sub - discAmt);

                return (
                  <>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          <span>শোরুম বিশেষ ছাড় / ডিসকাউন্ট (In-Store Discount)</span>
                        </div>

                        {/* Toggle Flat Taka vs Percentage */}
                        <div className="flex rounded-lg bg-black/50 p-0.5 border border-white/10 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setOffDiscountType('flat')}
                            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                              offDiscountType === 'flat'
                                ? 'bg-amber-500 text-black font-bold shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>টাকা (৳)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOffDiscountType('percent')}
                            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                              offDiscountType === 'percent'
                                ? 'bg-amber-500 text-black font-bold shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Percent className="w-3 h-3" />
                            <span>শতাংশ (%)</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-zinc-300 font-semibold mb-1 block">
                            {offDiscountType === 'flat' ? 'ছাড়ের পরিমাণ (টাকায়)' : 'ছাড়ের হার (শতাংশে)'}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={offDiscountType === 'percent' ? 100 : sub}
                              value={offDiscountValue || ''}
                              onChange={(e) => setOffDiscountValue(Math.max(0, Number(e.target.value)))}
                              placeholder={offDiscountType === 'flat' ? 'যেমন: ১০০' : 'যেমন: ১০'}
                              className="w-full bg-[#181a22] border border-amber-500/40 rounded-xl pl-3 pr-8 py-2 text-white text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
                            />
                            <span className="absolute right-3 top-2 text-xs font-bold text-amber-400">
                              {offDiscountType === 'flat' ? '৳' : '%'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-zinc-300 font-semibold mb-1 block">
                            ছাড়ের কারণ / নোট (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            placeholder="যেমন: ঈদ স্পেশাল / রেগুলার কাস্টমার"
                            value={offDiscountReason}
                            onChange={(e) => setOffDiscountReason(e.target.value)}
                            className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="space-y-1.5 pt-1 border-t border-white/5">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span>কুইক ডিসকাউন্ট বাটন:</span>
                          {discAmt > 0 && (
                            <span className="text-emerald-400 font-bold">
                              মোট ছাড় প্রযোজ্য: -৳{discAmt} {offDiscountType === 'percent' ? `(${offDiscountValue}%)` : sub > 0 ? `(${Math.round((discAmt / sub) * 100)}%)` : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {offDiscountType === 'flat' ? (
                            <>
                              {[50, 100, 150, 200, 300].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setOffDiscountValue(amt)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition border ${
                                    offDiscountValue === amt
                                      ? 'bg-amber-400 text-black border-amber-400 font-bold'
                                      : 'bg-white/5 text-zinc-300 border-white/10 hover:border-amber-400/50 hover:text-white'
                                  }`}
                                >
                                  ৳{amt}
                                </button>
                              ))}
                            </>
                          ) : (
                            <>
                              {[5, 10, 15, 20, 25].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setOffDiscountValue(pct)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition border ${
                                    offDiscountValue === pct
                                      ? 'bg-amber-400 text-black border-amber-400 font-bold'
                                      : 'bg-white/5 text-zinc-300 border-white/10 hover:border-amber-400/50 hover:text-white'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setOffDiscountValue(0);
                              setOffDiscountReason('');
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition"
                          >
                            ছাড় রিসেট (৳০)
                          </button>
                        </div>

                        {/* Quick Reason Chips */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[10px] text-zinc-500 mr-1">অফারের ধরণ:</span>
                          {['ঈদ অফার', 'রেগুলার কাস্টমার', 'ফ্রেন্ডস & ফ্যামিলি', 'ক্লিয়ারেন্স ডিল'].map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => setOffDiscountReason(reason)}
                              className={`px-2 py-0.5 rounded-md text-[10px] transition ${
                                offDiscountReason === reason
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                  : 'text-zinc-400 bg-white/5 hover:text-zinc-200 border border-white/5'
                              }`}
                            >
                              +{reason}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5" />
                        <span>পেমেন্ট মাধ্যম</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-zinc-300 font-semibold mb-1 block">টাকা পরিশোধের পদ্ধতি</label>
                          <select
                            value={offPaymentMethod}
                            onChange={(e) => setOffPaymentMethod(e.target.value as 'cash' | 'bkash' | 'nagad')}
                            className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                          >
                            <option value="cash" className="bg-[#181a22] text-white">ক্যাশ পেমেন্ট (Direct Cash)</option>
                            <option value="bkash" className="bg-[#181a22] text-white">বিকাশ (bKash Payment)</option>
                            <option value="nagad" className="bg-[#181a22] text-white">নগদ (Nagad Payment)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-300 font-semibold mb-1 block">
                            {offPaymentMethod === 'cash' ? 'ক্যাশ রিসিভ নোট' : 'TrxID / ট্রানজেকশন নম্বর'}
                          </label>
                          <input
                            type="text"
                            placeholder={offPaymentMethod === 'cash' ? 'ক্যাশ কাউন্টারে জমা' : 'যেমন: BK928LA02'}
                            value={offTrxId}
                            onChange={(e) => setOffTrxId(e.target.value)}
                            className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-zinc-300 font-semibold mb-1 block">মন্তব্য / সেলস নোট (ঐচ্ছিক)</label>
                        <input
                          type="text"
                          placeholder="যেমন: বিশেষ গিফট বা কাউন্টার মন্তব্য"
                          value={offNotes}
                          onChange={(e) => setOffNotes(e.target.value)}
                          className="w-full bg-[#181a22] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Total Calculation & Action */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5 text-center sm:text-left">
                        <div className="text-xs text-zinc-400">
                          সাবটোটাল: ৳{sub} {discAmt > 0 && <span className="text-emerald-400 font-medium"> | ছাড়: -৳{discAmt}</span>}
                        </div>
                        <div className="text-lg font-black text-amber-400 font-mono">
                          নগদ আদায়: ৳{finalPayable}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          (ডেলিভারি চার্জ: ৳০ - সরাসরি শোরুম থেকে সংগৃহীত)
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsOfflineModalOpen(false)}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs transition font-semibold"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingOffline}
                          className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-md flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{isSubmittingOffline ? 'রেকর্ড হচ্ছে...' : 'বিক্রয় সম্পন্ন ও মেমো তৈরি'}</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* Printable In-Store Cash Memo Modal */}
      {selectedMemoToPrint && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 print:p-0 print:shadow-none print:border-none print:w-full">
            <div className="flex items-center justify-between border-b pb-4 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-zinc-900">শোরুম ক্যাশ মেমো (POS Voucher)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMemoToPrint(null)}
                  className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-500 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Memo Layout */}
            <div className="border border-dashed border-zinc-300 p-5 rounded-xl bg-[#fafafa]">
              {/* Header */}
              <div className="text-center border-b border-zinc-200 pb-3 mb-3">
                <h2 className="text-2xl font-black tracking-wider uppercase text-black font-mono">OSTAD GEAR</h2>
                <p className="text-[11px] text-zinc-600 font-medium">Premium Streetwear & Jersey Store</p>
                <p className="text-[10px] text-zinc-500">শোরুম: রামপুরা বাজার সংলগ্ন, ঢাকা-১২১৯</p>
                <p className="text-[10px] text-zinc-700 font-mono font-semibold">হটলাইন / হোয়াটসঅ্যাপ: 01572923114</p>
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-zinc-200 text-zinc-800 text-[10px] font-bold tracking-widest uppercase">
                  ইন-স্টোর ক্যাশ মেমো / POS MEMO
                </div>
              </div>

              {/* Memo Info */}
              <div className="grid grid-cols-2 text-[11px] mb-3 text-zinc-700 gap-1">
                <div>
                  <p><span className="font-bold">মেমো নং:</span> <span className="font-mono">{selectedMemoToPrint.orderNumber}</span></p>
                  <p><span className="font-bold">কাস্টমার:</span> {selectedMemoToPrint.customerName}</p>
                  <p><span className="font-bold">মোবাইল:</span> <span className="font-mono">{selectedMemoToPrint.phone}</span></p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">তারিখ:</span> {new Date(selectedMemoToPrint.orderDate).toLocaleDateString('bn-BD')}</p>
                  <p><span className="font-bold">সময়:</span> {new Date(selectedMemoToPrint.orderDate).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p><span className="font-bold">বিক্রয় চ্যানেল:</span> শোরুম ওয়াক-ইন</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-[11px] border-collapse mb-3">
                <thead>
                  <tr className="border-b-2 border-zinc-300 text-zinc-600">
                    <th className="py-1">পণ্য</th>
                    <th className="py-1 text-center">সাইজ</th>
                    <th className="py-1 text-center">পরিমাণ</th>
                    <th className="py-1 text-right">মূল্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {selectedMemoToPrint.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 font-medium">{item.title}</td>
                      <td className="py-1.5 text-center font-mono">{item.size}</td>
                      <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono">৳{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t-2 border-zinc-300 pt-2 text-[11px] space-y-1">
                <div className="flex justify-between text-zinc-600">
                  <span>সাবটোটাল</span>
                  <span className="font-mono font-medium">৳{selectedMemoToPrint.subtotal}</span>
                </div>
                {selectedMemoToPrint.discount ? (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>
                      বিশেষ ছাড় {selectedMemoToPrint.notes?.includes('[ছাড়:') ? `(${selectedMemoToPrint.notes.split('[ছাড়:')[1]?.split(']')[0]?.trim() || ''})` : ''}
                    </span>
                    <span className="font-mono font-medium">- ৳{selectedMemoToPrint.discount}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-zinc-600">
                  <span>ডেলিভারি ফি</span>
                  <span className="font-mono font-medium">৳০ (শোরুম)</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-zinc-300 pt-1 text-zinc-900">
                  <span>মোট নগদ আদায়:</span>
                  <span className="font-mono text-base font-black">৳{selectedMemoToPrint.total}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                  <span>পরিশোধের মাধ্যম:</span>
                  <span className="uppercase font-semibold">{selectedMemoToPrint.paymentMethod} {selectedMemoToPrint.trxId ? `(Trx: ${selectedMemoToPrint.trxId})` : ''}</span>
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="mt-8 pt-4 border-t border-dashed border-zinc-300 flex justify-between text-[10px] text-zinc-500">
                <div className="text-center">
                  <div className="w-24 border-b border-zinc-400 mb-1"></div>
                  <span>কাস্টমার স্বাক্ষর</span>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b border-zinc-400 mb-1"></div>
                  <span>কর্তৃপক্ষ স্বাক্ষর</span>
                </div>
              </div>

              <div className="text-center mt-4 text-[9px] text-zinc-400">
                ধন্যবাদ আবার আসবেন! পণ্য পরিবর্তনের জন্য ৭ দিনের মধ্যে মেমো সাথে রাখুন।
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
