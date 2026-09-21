import { useState } from 'react';
import { useAppStore } from '../store';
import { 
  Truck, 
  MapPin, 
  Plus, 
  Edit2, 
  CheckCircle, 
  Wrench, 
  Trash2, 
  Fuel, 
  Users, 
  UserPlus,
  Coins, 
  X,
  PlusCircle,
  TrendingUp,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { VehicleExpense, Driver, Vehicle } from '../types';
import ConfirmModal from './ConfirmModal';

export default function FleetView() {
  const { 
    state, 
    updateTripStatus, 
    addTrip, 
    deleteTrip, 
    addVehicleExpense, 
    deleteVehicleExpense, 
    addDriver,
    updateDriver,
    deleteDriver, 
    addVehicle,
    updateVehicle,
    deleteVehicle 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'trips' | 'expenses' | 'vehicles_drivers'>('trips');
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  
  // Entity Add/Edit Modals
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'trip' | 'expense' | 'vehicle' | 'driver' } | null>(null);

  // Driver Form State
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLicense, setDriverLicense] = useState('');

  // Vehicle Form State
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState(10);

  // Trip Form State
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [destination, setDestination] = useState('');
  const [tripNotes, setTripNotes] = useState('');

  // Expense Form State
  const [expenseData, setExpenseData] = useState<Partial<VehicleExpense>>({
    vehicleId: '',
    type: 'gas',
    amount: 0,
    notes: ''
  });

  const activeTrips = state.trips.filter(t => t.status !== 'returned' && t.status !== 'delivered');
  const pastTrips = state.trips.filter(t => t.status === 'returned' || t.status === 'delivered');

  // Calculations for Stats
  const totalExpenses = state.vehicleExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const loadingVehiclesCount = state.trips.filter(t => t.status === 'loading').length;
  const onRouteVehiclesCount = state.trips.filter(t => t.status === 'on_route').length;

  const user = state.currentUser;
  const isAdmin = user?.role === 'admin';
  const canDelete = isAdmin || (user?.permissions?.canDelete ?? false);

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverId || !destination) {
      alert("الرجاء استكمال بيانات الرحلة");
      return;
    }
    
    addTrip({
      vehicleId,
      driverId,
      destination,
      status: 'loading',
      departureTime: new Date().toISOString(),
      notes: tripNotes
    });

    setIsTripModalOpen(false);
    setVehicleId('');
    setDriverId('');
    setDestination('');
    setTripNotes('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseData.vehicleId || !expenseData.amount) {
      alert("الرجاء استكمال بيانات المصروف");
      return;
    }
    addVehicleExpense(expenseData as Omit<VehicleExpense, 'id' | 'date'>);
    setIsExpenseModalOpen(false);
    setExpenseData({ vehicleId: '', type: 'gas', amount: 0, notes: '' });
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverPhone || !driverLicense) {
      alert("الرجاء إدخال اسم السائق، رقم الهاتف، ورقم الرخصة");
      return;
    }

    if (editingDriverId) {
      updateDriver(editingDriverId, { name: driverName, phone: driverPhone, licenseNumber: driverLicense });
      alert("تم تعديل بيانات السائق بنجاح");
    } else {
      addDriver({ name: driverName, phone: driverPhone, licenseNumber: driverLicense });
      alert("تم إضافة السائق بنجاح");
    }

    setIsDriverModalOpen(false);
    setEditingDriverId(null);
    setDriverName('');
    setDriverPhone('');
    setDriverLicense('');
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !vehicleModel) {
      alert("الرجاء إدخال رقم اللوحة وموديل السيارة");
      return;
    }

    if (editingVehicleId) {
      updateVehicle(editingVehicleId, { plateNumber, model: vehicleModel, capacity: vehicleCapacity });
      alert("تم تعديل بيانات السيارة بنجاح");
    } else {
      addVehicle({ plateNumber, model: vehicleModel, capacity: vehicleCapacity });
      alert("تم إضافة السيارة بنجاح");
    }

    setIsVehicleModalOpen(false);
    setEditingVehicleId(null);
    setPlateNumber('');
    setVehicleModel('');
    setVehicleCapacity(10);
  };

  const openEditDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setDriverName(driver.name);
    setDriverPhone(driver.phone);
    setDriverLicense(driver.licenseNumber || '');
    setIsDriverModalOpen(true);
  };

  const openEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setPlateNumber(vehicle.plateNumber);
    setVehicleModel(vehicle.model);
    setVehicleCapacity(vehicle.capacity);
    setIsVehicleModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'loading': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black">جاري التحميل 📦</span>;
      case 'on_route': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black">في الطريق 🚚</span>;
      case 'delivered': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">تم التسليم ✓</span>;
      case 'returned': return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black">عادت للمخزن ↩</span>;
      default: return null;
    }
  };

  const expenseTypes = {
    gas: 'بنزين / سولار',
    maintenance: 'صيانة وإصلاح',
    license: 'تراخيص / غرامات',
    other: 'مصروفات أخرى'
  };

  return (
    <div className="space-y-6">
      {/* Header with quick action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Truck className="w-8 h-8 text-blue-600" />
            منظومة أسطول سيارات النقل والتوصيل
          </h1>
          <p className="text-sm text-slate-500 font-bold mt-0.5">متابعة خطوط السير والرحلات اللوجستية وتتبع السائقين وحساب مصروفات النقل</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-amber-200"
          >
            <Fuel className="w-4 h-4" />
            تسجيل مصروف سيارة
          </button>
          <button 
            onClick={() => setIsTripModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-blue-200"
          >
            <PlusCircle className="w-4 h-4" />
            إنشاء خط سير / رحلة
          </button>
        </div>
      </div>

      {/* Modern Connected KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white/95 border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">إجمالي السيارات</p>
            <p className="text-xl font-black text-slate-900">{state.vehicles.length} سيارات</p>
          </div>
        </div>

        <div className="bg-white/95 border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">السائقين المسجلين</p>
            <p className="text-xl font-black text-slate-900">{state.drivers.length} سائقين</p>
          </div>
        </div>

        <div className="bg-white/95 border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">الرحلات النشطة حالياً</p>
            <p className="text-xl font-black text-amber-600">{activeTrips.length} رحلات</p>
          </div>
        </div>

        <div className="bg-white/95 border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">مصروفات الأسطول</p>
            <p className="text-xl font-black text-rose-600">{totalExpenses.toLocaleString()} ج.م</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 no-print">
        <button 
          onClick={() => setActiveTab('trips')}
          className={`pb-3 font-bold text-sm px-2.5 transition-all duration-200 ${activeTab === 'trips' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          الرحلات النشطة وتتبع المسارات
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 font-bold text-sm px-2.5 transition-all duration-200 ${activeTab === 'expenses' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          كشف حساب المصروفات والتشغيل
        </button>
        <button 
          onClick={() => setActiveTab('vehicles_drivers')}
          className={`pb-3 font-bold text-sm px-2.5 transition-all duration-200 ${activeTab === 'vehicles_drivers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          تعريف السائقين والسيارات
        </button>
      </div>

      {/* Tab Contents: Trips */}
      {activeTab === 'trips' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Trips */}
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Truck className="text-blue-600 w-5 h-5" />
                <h2 className="text-base font-bold text-slate-800">رحلات قيد التوصيل والتشغيل حالياً</h2>
              </div>
              <div className="p-4 space-y-4">
                {activeTrips.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm font-semibold">لا توجد رحلات جارية حالياً.</p>
                ) : (
                  activeTrips.map(trip => {
                    const vehicle = state.vehicles.find(v => v.id === trip.vehicleId);
                    const driver = state.drivers.find(d => d.id === trip.driverId);
                    return (
                      <div key={trip.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-all shadow-inner">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-black text-slate-800 text-base">السيارة: {vehicle?.plateNumber || 'غير محددة'}</h3>
                            <p className="text-xs text-slate-600 font-black mt-1">السائق المكلف: {driver?.name || 'غير محدد'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(trip.status)}
                            {canDelete && (
                              <button
                                onClick={() => setConfirmDelete({ id: trip.id, type: 'trip' })}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                                title="حذف الرحلة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-slate-600 mb-4 text-xs font-bold">
                          <MapPin className="w-4 h-4 text-rose-500" />
                          <span className="font-black text-slate-700">الوجهة وعنوان العميل:</span>
                          <span className="text-blue-800 font-black">{trip.destination}</span>
                        </div>

                        {trip.notes && (
                          <div className="bg-slate-100 p-2.5 rounded-lg text-xs font-semibold text-slate-600 mb-3 border border-slate-200">
                            <strong>ملاحظات التحميل:</strong> {trip.notes}
                          </div>
                        )}
                        
                        <div className="flex gap-2 border-t border-slate-200 pt-3">
                          {trip.status === 'loading' && (
                            <button 
                              onClick={() => updateTripStatus(trip.id, 'on_route')}
                              className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg font-bold transition-colors text-xs active:scale-95"
                            >
                              خروج السيارة للمسار 🚚
                            </button>
                          )}
                          {trip.status === 'on_route' && (
                            <button 
                              onClick={() => updateTripStatus(trip.id, 'delivered')}
                              className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-2 rounded-lg font-bold transition-colors text-xs active:scale-95"
                            >
                              تأكيد تسليم البضاعة للعميل ✓
                            </button>
                          )}
                          {trip.status === 'delivered' && (
                            <button 
                              onClick={() => updateTripStatus(trip.id, 'returned')}
                              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-bold transition-colors text-xs active:scale-95"
                            >
                              العودة للمخزن ↩
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Past/Completed Trips */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <CheckCircle className="text-emerald-600 w-5 h-5" />
              <h2 className="text-base font-bold text-slate-800">أرشيف الرحلات السابقة المكتملة</h2>
            </div>
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {pastTrips.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm font-semibold">لا توجد سجلات رحلات سابقة منتهية.</p>
              ) : (
                pastTrips.map(trip => {
                  const vehicle = state.vehicles.find(v => v.id === trip.vehicleId);
                  const driver = state.drivers.find(d => d.id === trip.driverId);
                  return (
                    <div key={trip.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/20 opacity-80 hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-slate-700 text-sm">السيارة: {vehicle?.plateNumber}</h3>
                          <p className="text-xs text-slate-500 font-bold mt-0.5">السائق: {driver?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(trip.status)}
                          {canDelete && (
                            <button
                              onClick={() => setConfirmDelete({ id: trip.id, type: 'trip' })}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                              title="حذف الرحلة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>الوجهة: {trip.destination}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Expenses */}
      {activeTab === 'expenses' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800">بيان تفصيلي بمصروفات أسطول السيارات المحملة على الخزينة</h2>
            <span className="text-xs text-rose-600 font-black bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg">إجمالي التكلفة: {totalExpenses.toLocaleString()} ج.م</span>
          </div>
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-6 py-3.5 font-bold">التاريخ</th>
                <th className="px-6 py-3.5 font-bold">السيارة</th>
                <th className="px-6 py-3.5 font-bold">نوع المصروف</th>
                <th className="px-6 py-3.5 font-bold">المبلغ المدفوع</th>
                <th className="px-6 py-3.5 font-bold">ملاحظات وبيان الصرف</th>
                <th className="px-6 py-3.5 font-bold text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold">
              {state.vehicleExpenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(exp => {
                const vehicle = state.vehicles.find(v => v.id === exp.vehicleId);
                return (
                  <tr key={exp.id} className="even:bg-slate-50/50 hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{new Date(exp.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4 font-black text-slate-800">{vehicle?.plateNumber || 'غير معروف'}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-black">
                        {expenseTypes[exp.type as keyof typeof expenseTypes]}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-rose-600">{exp.amount.toLocaleString()} ج.م</td>
                    <td className="px-6 py-4 text-slate-600">{exp.notes || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete({ id: exp.id, type: 'expense' })}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {state.vehicleExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">لا توجد مصروفات مسجلة على السيارات حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Contents: Definition Cards (Unified Integration) */}
      {activeTab === 'vehicles_drivers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicles Board */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                أسطول السيارات واللوحات المسجلة
              </h2>
              <button 
                onClick={() => {
                  setEditingVehicleId(null);
                  setPlateNumber('');
                  setVehicleModel('');
                  setVehicleCapacity(10);
                  setIsVehicleModalOpen(true);
                }}
                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة سيارة
              </button>
            </div>
            <div className="p-4 space-y-2">
              {state.vehicles.map(v => {
                const isAssigned = state.trips.some(t => t.vehicleId === v.id && t.status !== 'returned' && t.status !== 'delivered');
                return (
                  <div key={v.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                    <div>
                      <p className="font-black text-slate-800 text-sm flex items-center gap-2">
                        <span>{v.plateNumber}</span>
                        {isAssigned && <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">في مأمورية 🚀</span>}
                      </p>
                      <p className="text-xs text-slate-500 font-bold mt-1">{v.model} - أقصى حمولة: <strong className="text-slate-700">{v.capacity} طن</strong></p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => openEditVehicle(v)}
                        className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="تعديل بيانات السيارة"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete({ id: v.id, type: 'vehicle' })}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="حذف السيارة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {state.vehicles.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">لا توجد سيارات مسجلة بالنظام.</p>
              )}
            </div>
          </div>

          {/* Drivers Board */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                قائمة كباتن وسائقي الأسطول
              </h2>
              <button 
                onClick={() => {
                  setEditingDriverId(null);
                  setDriverName('');
                  setDriverPhone('');
                  setDriverLicense('');
                  setIsDriverModalOpen(true);
                }}
                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                إضافة سائق
              </button>
            </div>
            <div className="p-4 space-y-2">
              {state.drivers.map(d => {
                const tripsCount = state.trips.filter(t => t.driverId === d.id).length;
                return (
                  <div key={d.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                    <div>
                      <p className="font-black text-slate-800 text-sm">{d.name}</p>
                      <p className="text-xs text-slate-500 font-bold mt-1">الهاتف: {d.phone} • الرخصة: {d.licenseNumber} • الرحلات: <strong className="text-blue-700">{tripsCount}</strong></p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => openEditDriver(d)}
                        className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="تعديل بيانات السائق"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setConfirmDelete({ id: d.id, type: 'driver' })}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="حذف السائق"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {state.drivers.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">لا يوجد سائقين مسجلين بالنظام.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Trip */}
      {isTripModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-800">إنشاء مأمورية شحن / رحلة تملية جديدة</h2>
              <button onClick={() => setIsTripModalOpen(false)} className="text-slate-400 hover:text-rose-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTrip} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">السيارة المختارة للمهمة</label>
                <select 
                  value={vehicleId} 
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black"
                >
                  <option value="">اختر السيارة من قائمة السيارات المتاحة...</option>
                  {state.vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plateNumber} (حمولة {v.capacity} طن)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">السائق المسند إليه المهمة</label>
                <select 
                  value={driverId} 
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black"
                >
                  <option value="">اختر السائق من القائمة...</option>
                  {state.drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">الوجهة (عنوان العميل أو اسم المصنع)</label>
                <input 
                  type="text" 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="مثال: القاهرة، مدينة نصر، مخازن العميل"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">ملاحظات التحميل وخط السير (اختياري)</label>
                <textarea 
                  value={tripNotes} 
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="مثال: محملة حديد زوايا وصاج ليزر، تسليم بون الميزان."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold resize-none h-20"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-black transition-colors active:scale-95">
                  حفظ وتأكيد بدء التحميل 📦
                </button>
                <button type="button" onClick={() => setIsTripModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-black transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-800">تسجيل مديونية/مصروف سيارة جديد</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-rose-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">السيارة المستهلكة للمصروف</label>
                <select 
                  value={expenseData.vehicleId} 
                  onChange={(e) => setExpenseData({...expenseData, vehicleId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black"
                >
                  <option value="">اختر السيارة المستهلكة...</option>
                  {state.vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plateNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">تصنيف المصروف</label>
                <select 
                  value={expenseData.type} 
                  onChange={(e) => setExpenseData({...expenseData, type: e.target.value as VehicleExpense['type']})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black"
                >
                  {Object.entries(expenseTypes).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">المبلغ المصروف (ج.م)</label>
                <input 
                  type="number" 
                  value={expenseData.amount || ''} 
                  onChange={(e) => setExpenseData({...expenseData, amount: Number(e.target.value)})}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-black text-rose-600"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">البيان وملاحظات الصرف (اختياري)</label>
                <textarea 
                  value={expenseData.notes} 
                  onChange={(e) => setExpenseData({...expenseData, notes: e.target.value})}
                  placeholder="مثال: فاتورة بنزين تفويل لرحلة الإسكندرية."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold resize-none h-20"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-black transition-colors active:scale-95">
                  تسجيل المصروف بالخزنة 💸
                </button>
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-black transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Driver */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-800">
                {editingDriverId ? "تعديل بيانات السائق" : "إضافة سائق جديد لأسطول النقل"}
              </h2>
              <button onClick={() => setIsDriverModalOpen(false)} className="text-slate-400 hover:text-rose-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDriver} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">اسم السائق بالكامل</label>
                <input 
                  type="text" 
                  value={driverName} 
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="اسم السائق..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">رقم الهاتف الجوال</label>
                <input 
                  type="text" 
                  value={driverPhone} 
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">رقم رخصة القيادة</label>
                <input 
                  type="text" 
                  value={driverLicense} 
                  onChange={(e) => setDriverLicense(e.target.value)}
                  placeholder="رقم الرخصة..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-black transition-colors active:scale-95">
                  حفظ بيانات السائق ✓
                </button>
                <button type="button" onClick={() => setIsDriverModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-black transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-800">
                {editingVehicleId ? "تعديل بيانات السيارة" : "إضافة سيارة/شاحنة جديدة للأسطول"}
              </h2>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-rose-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveVehicle} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">أرقام/حروف لوحة السيارة</label>
                <input 
                  type="text" 
                  value={plateNumber} 
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="مثال: ر ص أ 9521"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">الموديل والنوع</label>
                <input 
                  type="text" 
                  value={vehicleModel} 
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="مثال: جامبو شيفروليه"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">سعة الحمولة القياسية (بالطن)</label>
                <input 
                  type="number" 
                  value={vehicleCapacity} 
                  onChange={(e) => setVehicleCapacity(Number(e.target.value))}
                  placeholder="10"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-black transition-colors active:scale-95">
                  حفظ السيارة ✓
                </button>
                <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-black transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="تأكيد الحذف"
        message={
          confirmDelete?.type === 'trip' ? "هل أنت متأكد من حذف هذه الرحلة نهائياً؟" :
          confirmDelete?.type === 'expense' ? "هل أنت متأكد من حذف هذا السند المصروفي؟" :
          confirmDelete?.type === 'vehicle' ? "هل أنت متأكد من حذف هذه السيارة؟ سيتم حذف كافة السجلات المرتبطة بها." :
          confirmDelete?.type === 'driver' ? "هل أنت متأكد من حذف هذا السائق؟" :
          "هل أنت متأكد من الحذف؟"
        }
        onConfirm={() => {
          if (confirmDelete) {
            if (confirmDelete.type === 'trip') deleteTrip(confirmDelete.id);
            if (confirmDelete.type === 'expense') deleteVehicleExpense(confirmDelete.id);
            if (confirmDelete.type === 'vehicle') deleteVehicle(confirmDelete.id);
            if (confirmDelete.type === 'driver') deleteDriver(confirmDelete.id);
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
