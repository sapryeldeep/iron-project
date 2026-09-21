import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { 
  Settings, Search, PackageSearch, Users, 
  FileText, Receipt, Wallet, TrendingUp, Truck, 
  Scale, Printer, ShieldAlert, LogOut, Key, 
  ChevronLeft, Home, UserCircle, Menu, ArrowRight
} from 'lucide-react';
import LoginModal from './LoginModal';
import ChangePasswordModal from './ChangePasswordModal';
import { ScaleSerialDriver } from '../utils/scaleSerial';

export type ViewType = 'dashboard' | 'scale' | 'clients' | 'suppliers' | 'statements' | 'invoices' | 'payments' | 'treasury' | 'journal' | 'sales_reports' | 'expenses' | 'fleet' | 'inventory' | 'users' | 'settings' | 'audit' | 'persons';

interface LayoutProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  children: React.ReactNode;
}

export default function Layout({ currentView, onNavigate, children }: LayoutProps) {
  const { state, setLiveScaleWeight, switchUser } = useAppStore();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // USB physical scale driver integration
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbMessage, setUsbMessage] = useState('');
  const serialDriverRef = useRef<ScaleSerialDriver | null>(null);

  useEffect(() => {
    serialDriverRef.current = new ScaleSerialDriver();
    return () => {
      if (serialDriverRef.current) {
        serialDriverRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

  const handleConnectUSBScale = async () => {
    if (!serialDriverRef.current) return;
    try {
      setUsbMessage('جاري تحديد منفذ الميزان...');
      await serialDriverRef.current.connect(
        (weight) => {
          setLiveScaleWeight(weight);
        },
        (connected, msg) => {
          setUsbConnected(connected);
          setUsbMessage(msg || '');
        }
      );
    } catch (e: any) {
      const isCancellation = 
        e.name === 'NotFoundError' || 
        e.name === 'AbortError' || 
        (e.message && (e.message.includes('No port selected') || e.message.includes('user cancelled') || e.message.includes('canceled')));
      setUsbConnected(false);
      setUsbMessage(isCancellation ? '' : (e.message || 'فشل الاتصال بالمنفذ التسلسلي للميزان'));
    }
  };

  const handleDisconnectUSBScale = async () => {
    if (serialDriverRef.current) {
      await serialDriverRef.current.disconnect();
      setUsbConnected(false);
      setUsbMessage('تم فصل الميزان الفيزيائي');
    }
  };

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const isAdmin = state.currentUser?.role === 'admin';
  const isViewAllowed = (view: string) => {
    if (isAdmin) return true;
    const allowedViews = state.currentUser?.permissions?.allowedViews;
    if (!allowedViews) return true;
    return allowedViews.includes(view);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSearchResults = () => {
    if (!searchQuery.trim()) return { items: [], persons: [], invoices: [] };
    const q = searchQuery.toLowerCase();
    
    const items = isViewAllowed('inventory') 
      ? state.inventory.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)).slice(0, 3)
      : [];
      
    const persons = (isViewAllowed('clients') || isViewAllowed('suppliers'))
      ? [...state.clients, ...state.suppliers].filter(p => {
          if (p.type === 'client' && !isViewAllowed('clients')) return false;
          if (p.type === 'supplier' && !isViewAllowed('suppliers')) return false;
          return p.name.toLowerCase().includes(q) || p.phone.includes(q);
        }).slice(0, 3)
      : [];

    const invoices = isViewAllowed('invoices')
      ? state.invoices.filter(i => {
          const person = [...state.clients, ...state.suppliers].find(p => p.id === i.personId);
          return i.invoiceNumber.toLowerCase().includes(q) || (person?.name || '').toLowerCase().includes(q);
        }).slice(0, 3)
      : [];
    
    return { items, persons, invoices };
  };

  const searchResults = getSearchResults();

  const viewTitles: Record<ViewType, string> = {
    dashboard: 'الرئيسية',
    scale: 'قراءة الميزان',
    clients: 'العملاء',
    suppliers: 'الموردين',
    persons: 'العملاء والموردين',
    statements: 'كشوف الحسابات',
    invoices: 'الفواتير والعمليات',
    payments: 'المدفوعات',
    treasury: 'الخزينة والمالية',
    journal: 'القيود اليومية',
    sales_reports: 'تقارير المبيعات',
    expenses: 'المصروفات',
    fleet: 'السيارات والنقل',
    inventory: 'المخزون والجرد',
    users: 'المستخدمين والصلاحيات',
    audit: 'سجل التدقيق',
    settings: 'الإعدادات',
  };

  const displayName = state.currentUser?.username || 'زائر';
  const displayRole = state.currentUser?.role || 'guest';

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden" dir="rtl">
      {/* Universal Header (Brand + Nav + Indicators + User) */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 flex-shrink-0 z-50 shadow-sm print:hidden">
        
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
              <Scale className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">سيستم إجازة</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Iron Management Pro</span>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>

          {currentView !== 'dashboard' ? (
            <button 
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع للرئيسية</span>
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-800">
              <Home className="w-4 h-4 text-slate-400" />
              <span>لوحة التحكم الرئيسية</span>
            </div>
          )}
        </div>

        {/* Universal Search Bar */}
        <div className="flex-1 max-w-xl px-4 md:px-8" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text"
              placeholder="بحث شامل (عملاء، فواتير، مخزون)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-3 pr-11 pl-4 text-xs font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            />

            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full right-0 left-0 mt-3 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-[70vh] overflow-y-auto p-2 space-y-2">
                  
                  {/* Persons */}
                  {searchResults.persons.length > 0 && (
                    <div>
                      <h4 className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-lg mb-1">العملاء والموردين</h4>
                      {searchResults.persons.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onNavigate(p.type === 'client' ? 'clients' : 'suppliers');
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-right"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.type === 'client' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            <Users className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{p.phone}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Invoices */}
                  {searchResults.invoices.length > 0 && (
                    <div>
                      <h4 className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-lg mb-1">الفواتير والعمليات</h4>
                      {searchResults.invoices.map(inv => (
                        <button
                          key={inv.id}
                          onClick={() => {
                            onNavigate('invoices');
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-right"
                        >
                          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">فاتورة {inv.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{new Date(inv.date).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Inventory */}
                  {searchResults.items.length > 0 && (
                    <div>
                      <h4 className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 rounded-lg mb-1">المخزون والجرد</h4>
                      {searchResults.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate('inventory');
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors text-right"
                        >
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                            <PackageSearch className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{item.category}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {searchResults.persons.length === 0 && searchResults.invoices.length === 0 && searchResults.items.length === 0 && (
                    <div className="py-10 text-center space-y-2">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">لا توجد نتائج مطابقة لبحثك</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Indicators & User Control */}
        <div className="flex items-center gap-3 lg:gap-6">
          
          {/* Global Scale Live Feed */}
          <div 
            onClick={usbConnected ? handleDisconnectUSBScale : handleConnectUSBScale}
            className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all cursor-pointer select-none shadow-sm ${
              usbConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">الوزن الحي</span>
              <span className="text-xl font-black font-mono leading-none tracking-tighter">
                {(state.liveScaleWeight || 0).toLocaleString()} <span className="text-xs">كجم</span>
              </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-1 opacity-50"></div>
            <Scale className={`w-6 h-6 transition-transform ${usbConnected ? 'text-emerald-600 scale-110' : 'text-slate-300'}`} />
          </div>

          <div className="h-10 w-[1px] bg-slate-200 hidden sm:block"></div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 pr-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
            >
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-black text-slate-800 leading-none mb-1">{displayName}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{state.currentUser?.role === 'admin' ? 'مدير النظام' : 'موظف'}</span>
              </div>
              <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black border border-slate-800 group-hover:scale-105 transition-all">
                {displayName.charAt(0)}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute left-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 mb-2">
                  <p className="text-xs font-black text-slate-800">{displayName}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{state.currentUser?.role === 'admin' ? 'مدير النظام' : 'موظف مسئول'}</p>
                </div>
                
                <button 
                  onClick={() => { onNavigate('settings'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  إعدادات النظام
                </button>
                
                <button 
                  onClick={() => { setShowChangePassModal(true); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <Key className="w-4 h-4" />
                  تغيير كلمة السر
                </button>

                <div className="h-[1px] bg-slate-100 my-2"></div>

                <button 
                  onClick={() => switchUser(null)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dynamic Content Viewport */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>

      {/* Professional Production Footer */}
      <footer className="h-10 bg-white border-t border-slate-200 px-6 lg:px-10 flex items-center justify-between shrink-0 text-[10px] text-slate-400 font-bold select-none print:hidden">
        <div className="flex items-center gap-4">
          <span className="text-slate-800">{state.settings?.companyName}</span>
          <span className="text-slate-200">|</span>
          <span>نظام إجازة الاحترافي &copy; 2024</span>
          <span className="text-slate-200">|</span>
          <span className="text-emerald-600">حالة السيرفر: متصل</span>
        </div>
        <div className="font-mono tracking-tighter text-slate-500">
          programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
        </div>
      </footer>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <ChangePasswordModal isOpen={showChangePassModal} onClose={() => setShowChangePassModal(false)} />
    </div>
  );
}
