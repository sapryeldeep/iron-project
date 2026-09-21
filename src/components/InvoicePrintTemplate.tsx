import React from 'react';
import { Invoice, AppSettings, Person } from '../types';

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  person: Person | undefined;
  settings: AppSettings;
  printerType?: 'a4' | 'thermal' | 'workshop';
  fontSize?: 'sm' | 'md' | 'lg';
  showLogo?: boolean;
  showMiniStatement?: boolean;
  showSignatures?: boolean;
  customNotes?: string;
}

const PROGRAMMER_FOOTER = "programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com";

export default function InvoicePrintTemplate({
  invoice,
  person,
  settings,
  printerType = 'a4',
  fontSize = 'md',
  showLogo = true,
  showMiniStatement = true,
  showSignatures = true,
  customNotes = '',
}: InvoicePrintTemplateProps) {
  const isSales = invoice.type === 'sales';
  const isThermal = printerType === 'thermal';
  const isWorkshop = printerType === 'workshop';

  // Calculate correct balances:
  // Since this invoice is already saved, person.balance contains the post-invoice balance.
  // Previous Balance = Current Balance - Invoice effect (remainingAmount for client, -remainingAmount for supplier)
  const remainingAmount = invoice.remainingAmount || 0;
  const currentBalance = person?.balance || 0;
  
  const invoiceEffect = isSales ? remainingAmount : -remainingAmount;
  const previousBalance = currentBalance - invoiceEffect;
  const newBalance = currentBalance;

  // Font size classes mapping
  const sizeClasses = {
    sm: {
      title: 'text-lg',
      subtitle: 'text-xs',
      base: 'text-[11px]',
      bold: 'text-xs font-bold',
      tableHeader: 'text-[11px] p-1.5',
      tableCell: 'text-[11px] p-1.5',
      space: 'space-y-1',
      margin: 'mb-3',
      padding: 'p-2',
    },
    md: {
      title: isThermal ? 'text-xl' : 'text-3xl',
      subtitle: 'text-sm',
      base: 'text-sm',
      bold: 'text-sm font-bold',
      tableHeader: isThermal ? 'text-xs p-1.5' : 'text-sm p-3',
      tableCell: isThermal ? 'text-xs p-1.5' : 'text-sm p-3',
      space: 'space-y-2',
      margin: 'mb-6',
      padding: 'p-4',
    },
    lg: {
      title: isThermal ? 'text-2xl' : 'text-4xl',
      subtitle: 'text-base',
      base: 'text-base',
      bold: 'text-base font-black',
      tableHeader: 'text-base p-4',
      tableCell: 'text-base p-4',
      space: 'space-y-3',
      margin: 'mb-8',
      padding: 'p-6',
    },
  }[fontSize];

  const notesText = customNotes !== undefined ? customNotes : (settings.invoiceNotes || '');
  const items = invoice.items || [];

  const formatInvoiceDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const dateFormatted = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateFormatted} - ${timeFormatted}`;
  };

  // --- WORKSHOP INTERNAL NON-PRICED TICKET ---
  if (isWorkshop) {
    return (
      <div className={`text-slate-900 bg-white leading-normal font-sans ${sizeClasses.base}`} dir="rtl" style={{ width: '100%', maxWidth: '80mm', margin: '0 auto', padding: '2mm' }}>
        {/* Header */}
        <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
          <div className="bg-slate-900 text-white font-black px-2 py-1 rounded text-xs tracking-wider inline-block mb-1">
            بون تشغيل الورشة الداخلي (سرية الأسعار)
          </div>
          <h1 className="text-xl font-black text-slate-900">{settings.companyName}</h1>
          <p className="text-[11px] font-bold text-slate-600">قسم التشغيل - ليزر وتناية وتشكيل صاج</p>
          <p className="text-[10px] text-slate-500 font-bold">رقم المستند الداخلي: #{invoice.invoiceNumber}</p>
          <p className="text-[10px] text-slate-500 font-bold">التاريخ والوقت: {formatInvoiceDateTime(invoice.createdAt)}</p>
        </div>

        {/* Client & Work Info */}
        <div className="bg-slate-100 p-2 rounded-lg border border-slate-300 space-y-1 mb-3 text-[11px]">
          <div className="flex justify-between font-bold">
            <span className="text-slate-600">اسم العميل:</span>
            <span className="text-slate-900 font-black">{person?.name || 'عميل تشغيل'}</span>
          </div>
          {person?.phone && (
            <div className="flex justify-between font-bold">
              <span className="text-slate-600">هاتف التواصل:</span>
              <span className="text-slate-800" dir="ltr">{person.phone}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span className="text-slate-600">نوع التشغيل:</span>
            <span className="text-amber-700 font-black">
              {invoice.category === 'laser' ? 'قص ليزر صاج' : invoice.category === 'bending' ? 'تشغيل وتني صاج' : invoice.category === 'strip' ? 'تفصيل خوص' : 'تصنيع وتشكيل عام'}
            </span>
          </div>
        </div>

        {/* Technical Sheet Calculator & Details */}
        <div className="mb-3 border border-slate-300 rounded-lg overflow-hidden">
          <div className="bg-slate-800 text-white text-[11px] font-black p-1.5 text-center">
            حاسبة أبعاد وأوزان الصاج الفعلي لعمال الورشة
          </div>
          <table className="w-full text-right border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-400 font-black">
                <th className="p-1 text-right">البيان / أبعاد الخامات</th>
                <th className="p-1 text-center">الكمية/الأمتار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-bold">
              {items.map((item, idx) => (
                <tr key={idx} className="even:bg-slate-50">
                  <td className="p-1.5 text-slate-900">
                    <div className="font-black">{item.description}</div>
                    {(item.length || item.width || item.thickness) && (
                      <div className="text-[10px] text-blue-800 bg-blue-50 p-1 rounded mt-1 border border-blue-200 font-mono">
                        الأبعاد: {item.length || '-'} × {item.width || '-'} ({item.dimensionUnit === 'mm' ? 'مم' : item.dimensionUnit === 'm' ? 'م' : 'سم'}) | سمك: {item.thickness || '-'}مم {item.sheetsCount && item.sheetsCount > 1 ? `| عدد: ${item.sheetsCount} ألواح` : ''}
                      </div>
                    )}
                    {item.bendsCount ? (
                      <div className="text-[10px] text-amber-800 font-bold mt-0.5">
                        عدد الضربات/الطعجات: {item.bendsCount} طعجة
                      </div>
                    ) : null}
                  </td>
                  <td className="p-1.5 text-center font-mono font-black text-slate-900">
                    {item.quantity} {item.manufacturingUnit === 'meter' ? 'م' : item.manufacturingUnit === 'piece' ? 'ق' : item.manufacturingUnit === 'ton' ? 'طن' : 'كجم'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-amber-50 border border-amber-300 p-2 rounded-lg text-[10px] text-amber-900 font-bold space-y-1 mb-3">
          <p className="font-black text-center text-amber-950 text-xs">ملاحظة أمان وتأكيد</p>
          <p>⚠️ تم حجب جميع المبالغ والأسعار المادية من هذا المستند لضمان سرية حسابات العميل داخل الورشة.</p>
        </div>

        {/* Worker & Quality Signatures */}
        <div className="border-t-2 border-dashed border-slate-400 pt-3 space-y-2 text-[10px]">
          <div className="flex justify-between items-center font-bold">
            <span>توقيع فني الماكينة (الليزر/التناية):</span>
            <span className="w-24 border-b border-slate-400 inline-block"></span>
          </div>
          <div className="flex justify-between items-center font-bold">
            <span>توقيع مسئول الجودة والفحص:</span>
            <span className="w-24 border-b border-slate-400 inline-block"></span>
          </div>
          <div className="flex justify-between items-center font-bold">
            <span>توقيع المستلم بالورشة:</span>
            <span className="w-24 border-b border-slate-400 inline-block"></span>
          </div>
        </div>

        {/* Permanent Developer Rights Footer */}
        <div className="mt-4 pt-2 border-t border-slate-300 text-[8px] text-slate-500 text-center font-mono font-bold dir-ltr">
          {PROGRAMMER_FOOTER}
        </div>
      </div>
    );
  }

  if (isThermal) {
    // --- THERMAL RECEIPT 80mm LAYOUT ---
    return (
      <div className={`text-slate-900 bg-white leading-normal font-sans ${sizeClasses.base}`} dir="rtl" style={{ width: '100%', maxWidth: '80mm', margin: '0 auto', padding: '2mm' }}>
        {/* Header Logo & Title */}
        <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
          {showLogo && (
            <div className="flex justify-center mb-1">
              <span className="bg-slate-900 text-white font-black px-2 py-1 rounded text-xs tracking-wider">STEEL SYSTEM</span>
            </div>
          )}
          <h1 className={`${sizeClasses.title} font-black tracking-tight text-slate-900`}>{settings.companyName}</h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{settings.address}</p>
          <p className="text-[11px] text-slate-500 font-medium">تليفون: <span dir="ltr">{settings.phone}</span></p>
          {settings.taxNumber && <p className="text-[10px] text-slate-500 mt-0.5">الرقم الضريبي: {settings.taxNumber}</p>}
          
          <div className="mt-2 bg-slate-100 py-1 px-2 rounded font-bold text-center border border-slate-200">
            {isSales ? 'بون مبيعات حديد' : 'بون مشتريات حديد'}
          </div>
        </div>

        {/* Invoice & Person Info */}
        <div className="space-y-1 mb-3 text-[11px] border-b border-dashed border-slate-300 pb-2">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">رقم البون:</span>
            <span className="font-bold text-slate-800">#{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">التاريخ والوقت:</span>
            <span className="font-bold text-slate-800 text-[10px]">{formatInvoiceDateTime(invoice.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">{isSales ? 'العميل:' : 'المورد:'}</span>
            <span className="font-extrabold text-slate-900">{person?.name || 'عميل نقدي'}</span>
          </div>
          {person?.phone && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">الهاتف:</span>
              <span className="font-bold text-slate-800" dir="ltr">{person.phone}</span>
            </div>
          )}
        </div>

        {/* Compact Items Table */}
        <div className="mb-3">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-800 font-extrabold">
                <th className="py-1 text-right w-1/2 text-[11px]">الصنف / البيان</th>
                <th className="py-1 text-center w-1/6 text-[11px]">الكمية (كجم)</th>
                <th className="py-1 text-center w-1/6 text-[11px]">السعر</th>
                <th className="py-1 text-left w-1/6 text-[11px]">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={idx} className="py-1 even:bg-slate-100/60 odd:bg-white">
                  <td className="py-1 text-slate-950 font-bold text-[11px]">
                    {item.description}
                    {invoice.category === 'laser' && (item.length || item.width || item.thickness) && (
                      <span className="text-[9px] text-slate-600 font-normal block dir-rtl">
                        ({item.length}×{item.width} {item.dimensionUnit === 'mm' ? 'مم' : item.dimensionUnit === 'm' ? 'م' : 'سم'} | {item.thickness}مم {item.sheetsCount && item.sheetsCount > 1 ? `| ${item.sheetsCount} ألواح` : ''})
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-center font-mono font-bold text-slate-800 text-[11px]">
                    {item.quantity} {item.manufacturingUnit === 'meter' ? 'م' : item.manufacturingUnit === 'piece' ? 'قطعة' : item.manufacturingUnit === 'ton' ? 'طن' : 'كجم'}
                  </td>
                  <td className="py-1 text-center font-mono text-slate-600 text-[11px]">{item.unitPrice.toLocaleString()}</td>
                  <td className="py-1 text-left font-mono font-black text-slate-900 text-[11px]">{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-xs">
          <div className="flex justify-between font-medium">
            <span className="text-slate-500">الإجمالي الفرعي:</span>
            <span className="font-bold text-slate-800">{invoice.subtotal.toLocaleString()} ج.م</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-rose-600 font-bold">
              <span>الخصم:</span>
              <span>-{invoice.discount.toLocaleString()} ج.م</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-300 pt-1 font-black text-sm text-slate-950">
            <span>صافي الفاتورة:</span>
            <span>{invoice.total.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between font-bold text-emerald-700">
            <span>المدفوع نقداً:</span>
            <span>{invoice.paidAmount.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between font-bold text-rose-700 border-b border-slate-200 pb-1">
            <span>المتبقي بالفاتورة:</span>
            <span>{invoice.remainingAmount.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* Requested Mini Statement (كشف حساب مصغر) */}
        {showMiniStatement && person && (
          <div className="mt-3 bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1 text-[11px]">
            <div className="text-center font-black text-slate-700 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-center gap-1">
              <span>كشف حساب مصغر للعميل</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الرصيد السابق للمستند:</span>
              <span className="font-bold text-slate-800" dir="ltr">
                {Math.abs(previousBalance).toLocaleString()} ج.م {previousBalance > 0 ? '(مدين)' : previousBalance < 0 ? '(دائن)' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">قيمة هذه الفاتورة:</span>
              <span className="font-bold text-slate-800">{invoice.total.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المدفوع الآن:</span>
              <span className="font-bold text-emerald-600">{invoice.paidAmount.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-xs">
              <span className="text-slate-800">الرصيد الإجمالي الجديد:</span>
              <span className={newBalance > 0 ? 'text-rose-600' : newBalance < 0 ? 'text-emerald-600' : 'text-slate-800'}>
                {Math.abs(newBalance).toLocaleString()} ج.م {newBalance > 0 ? '(مدين)' : newBalance < 0 ? '(دائن)' : 'مخلص'}
              </span>
            </div>
          </div>
        )}

        {/* Footer Notes */}
        {notesText && (
          <div className="mt-4 text-center text-[10px] text-slate-500 whitespace-pre-wrap border-t border-dashed border-slate-300 pt-2 font-semibold">
            {notesText}
          </div>
        )}

        {/* Barcode/QR code placeholder for authenticity */}
        <div className="mt-4 text-center">
          <div className="inline-block border border-slate-300 p-1 bg-white">
            <div className="w-16 h-16 bg-slate-200 flex items-center justify-center text-[9px] text-slate-500 font-mono">
              [QR CODE]
            </div>
          </div>
          <p className="text-[9px] text-slate-400 mt-1 font-mono">شكراً لتعاملكم معنا</p>
        </div>

        {/* Permanent Developer Rights Footer */}
        <div className="mt-4 pt-2 border-t border-slate-300 text-[8px] text-slate-500 text-center font-mono font-bold dir-ltr">
          {PROGRAMMER_FOOTER}
        </div>
      </div>
    );
  }

  const activeTemplate = settings.invoiceTemplate || 'classic';

  // --- MODERN A4 PAPER LAYOUT ---
  if (activeTemplate === 'modern') {
    return (
      <div className={`text-slate-900 bg-white leading-relaxed ${sizeClasses.base}`} dir="rtl">
        {/* Modern Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 mb-6 shadow-md flex justify-between items-start">
          <div className="space-y-1">
            {showLogo && (
              <div className="inline-block bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-black mb-2 text-indigo-200">
                شركة إنجاز للحديد والصلب
              </div>
            )}
            <h1 className="text-2xl font-black">{settings.companyName}</h1>
            <p className="text-xs text-indigo-200 font-semibold">{settings.address}</p>
            <p className="text-xs text-indigo-200 font-semibold">تليفون: <span dir="ltr">{settings.phone}</span></p>
            {settings.taxNumber && <p className="text-xs text-indigo-200 font-semibold">رقم ضريبي: {settings.taxNumber}</p>}
          </div>

          <div className="text-left bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
            <span className="text-xs font-black uppercase text-amber-300 block mb-1">
              {isSales ? 'فاتورة مبيعات عصرية' : 'فاتورة مشتريات عصرية'}
            </span>
            <div className="text-xl font-mono font-black">#{invoice.invoiceNumber}</div>
            <div className="text-xs text-slate-300 mt-1">
              {formatInvoiceDateTime(invoice.createdAt)}
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl mb-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">بيانات {isSales ? 'العميل' : 'المورد'}</span>
              <span className="text-slate-900 font-black text-sm">{person?.name || 'نقدي / عام'}</span>
              {person?.phone && <span className="text-slate-500 block text-[11px]" dir="ltr">{person.phone}</span>}
            </div>
            <div className="text-left">
              <span className="text-slate-400 block text-[10px] uppercase">الرصيد المالي اللحظي</span>
              <span className={`text-sm font-black ${currentBalance > 0 ? 'text-rose-600' : currentBalance < 0 ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
                {Math.abs(currentBalance).toLocaleString()} ج.م {currentBalance > 0 ? '(مدين)' : currentBalance < 0 ? '(دائن)' : 'مخلص'}
              </span>
            </div>
          </div>
        </div>

        {/* Modern Items Table */}
        <div className="mb-6 rounded-xl overflow-hidden border border-indigo-100 shadow-sm">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-indigo-950 text-white font-black">
                <th className="p-3 text-center w-10">م</th>
                <th className="p-3">بيان الخامات والمصنعيات</th>
                <th className="p-3 text-center">الكمية/الوزن</th>
                <th className="p-3 text-center">سعر الوحدة</th>
                <th className="p-3 text-center bg-indigo-900">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50 font-semibold">
              {items.map((item, idx) => (
                <tr key={idx} className="even:bg-indigo-50/30 odd:bg-white hover:bg-indigo-50/60">
                  <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="p-3 text-slate-900 font-bold">
                    {item.description}
                    {invoice.category === 'laser' && item.length && (
                      <span className="text-[10px] text-indigo-600 block mt-0.5">({item.length}m × {item.width}m × {item.thickness}mm)</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-700">
                    {item.quantity.toLocaleString()} {
                      item.manufacturingUnit === 'meter' ? 'متر' : 
                      item.manufacturingUnit === 'piece' ? 'قطعة' : 
                      item.manufacturingUnit === 'ton' ? 'طن' : 
                      item.manufacturingUnit === 'bend' ? 'ثنية' : 
                      item.manufacturingUnit === 'hour' ? 'ساعة' : 'كجم'
                    }
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-700">{item.unitPrice.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono font-black text-slate-900 bg-indigo-50/50">{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Statement */}
        <div className="grid grid-cols-2 gap-4 items-start mb-6">
          {showMiniStatement && person ? (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs font-bold">
              <h4 className="font-black text-indigo-900 border-b border-slate-200 pb-1">كشف حساب العميل اللحظي</h4>
              <div className="flex justify-between"><span>الرصيد السابق:</span><span className="font-mono">{Math.abs(previousBalance).toLocaleString()} ج.م</span></div>
              <div className="flex justify-between text-indigo-700"><span>الفاتورة الحالية:</span><span className="font-mono">{invoice.total.toLocaleString()} ج.م</span></div>
              <div className="flex justify-between text-emerald-700"><span>المدفوع:</span><span className="font-mono">{invoice.paidAmount.toLocaleString()} ج.m</span></div>
              <div className="flex justify-between border-t pt-1 font-black text-slate-900"><span>الرصيد النهائي:</span><span className="font-mono">{Math.abs(newBalance).toLocaleString()} ج.م</span></div>
            </div>
          ) : <div />}

          <div className="bg-indigo-900 text-white p-4 rounded-xl space-y-2 text-xs font-bold">
            <div className="flex justify-between text-indigo-200"><span>الإجمالي:</span><span className="font-mono">{invoice.subtotal.toLocaleString()} ج.م</span></div>
            {invoice.discount > 0 && <div className="flex justify-between text-rose-300"><span>الخصم:</span><span className="font-mono">-{invoice.discount.toLocaleString()} ج.م</span></div>}
            <div className="flex justify-between text-base font-black border-t border-indigo-700 pt-2 text-amber-300"><span>الصافي النهائي:</span><span className="font-mono">{invoice.total.toLocaleString()} ج.م</span></div>
          </div>
        </div>

        {/* Signatures */}
        {showSignatures && (
          <div className="flex justify-between pt-6 border-t border-slate-200 text-xs font-bold text-slate-600">
            <div>توقيع المستلم: ....................</div>
            <div>مسؤول الخزينة: ....................</div>
            <div>الختم والإدارة: ....................</div>
          </div>
        )}

        <div className="mt-6 pt-3 border-t text-[9px] text-slate-400 font-mono font-bold text-center dir-ltr">
          {PROGRAMMER_FOOTER}
        </div>
      </div>
    );
  }

  // --- COMPACT A4 PAPER LAYOUT ---
  if (activeTemplate === 'compact' || activeTemplate === 'minimal') {
    return (
      <div className={`text-slate-900 bg-white leading-tight ${sizeClasses.base}`} dir="rtl">
        {/* Compact Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-3 text-xs">
          <div>
            <h1 className="text-lg font-black text-slate-900">{settings.companyName}</h1>
            <p className="text-[10px] text-slate-600 font-bold">{settings.address} | تليفون: <span dir="ltr">{settings.phone}</span></p>
          </div>
          <div className="text-left border-r-2 border-slate-900 pr-3">
            <span className="font-black text-sm bg-slate-900 text-white px-2 py-0.5 rounded inline-block mb-0.5">
              {isSales ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
            </span>
            <div className="font-mono font-black text-xs text-slate-800">#{invoice.invoiceNumber} | {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        {/* Compact Person Bar */}
        <div className="bg-slate-100 p-2 rounded border border-slate-300 mb-3 text-[11px] font-bold flex justify-between">
          <div><span>الجهة: </span><span className="font-black text-slate-900">{person?.name || 'نقدي / عام'}</span></div>
          {person?.phone && <div><span>الهاتف: </span><span dir="ltr">{person.phone}</span></div>}
          <div><span>الرصيد الحالي: </span><span className="font-mono font-black">{Math.abs(currentBalance).toLocaleString()} ج.م</span></div>
        </div>

        {/* Compact Table */}
        <div className="mb-3">
          <table className="w-full text-right border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-800 text-white font-black">
                <th className="p-1 text-center w-8">م</th>
                <th className="p-1">البيان والخامات</th>
                <th className="p-1 text-center">الكمية/الوزن</th>
                <th className="p-1 text-center">السعر</th>
                <th className="p-1 text-center bg-slate-900">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-semibold">
              {items.map((item, idx) => (
                <tr key={idx} className="even:bg-slate-50">
                  <td className="p-1 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="p-1 font-bold text-slate-900">{item.description}</td>
                  <td className="p-1 text-center font-mono font-bold">{item.quantity.toLocaleString()} {item.manufacturingUnit === 'meter' ? 'م' : 'كجم'}</td>
                  <td className="p-1 text-center font-mono">{item.unitPrice.toLocaleString()}</td>
                  <td className="p-1 text-center font-mono font-black text-slate-900 bg-slate-100">{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Compact Totals */}
        <div className="flex justify-between items-start text-xs border-t-2 border-slate-800 pt-2 mb-3">
          {showMiniStatement && person ? (
            <div className="text-[10px] space-y-0.5 font-bold text-slate-600">
              <div>سابق: {Math.abs(previousBalance).toLocaleString()} ج.م | حالي: {invoice.total.toLocaleString()} ج.م | مدفوع: {invoice.paidAmount.toLocaleString()} ج.م</div>
              <div className="font-black text-slate-900">الرصيد المتبقي الإجمالي: {Math.abs(newBalance).toLocaleString()} ج.م</div>
            </div>
          ) : <div />}

          <div className="text-left font-black space-y-0.5">
            <div>صافي الفاتورة: <span className="text-sm font-mono text-emerald-800">{invoice.total.toLocaleString()} ج.م</span></div>
            <div className="text-[10px] text-slate-600">مدفوع: {invoice.paidAmount.toLocaleString()} ج.م | متبقي: {invoice.remainingAmount.toLocaleString()} ج.م</div>
          </div>
        </div>

        {showSignatures && (
          <div className="flex justify-between pt-2 border-t border-slate-300 text-[10px] font-bold text-slate-600">
            <div>توقيع المستلم: ....................</div>
            <div>توقيع الخزينة: ....................</div>
          </div>
        )}

        <div className="mt-2 pt-1 border-t text-[8px] text-slate-400 font-mono font-bold text-center dir-ltr">
          {PROGRAMMER_FOOTER}
        </div>
      </div>
    );
  }

  // --- CLASSIC / STANDARD A4 PAPER LAYOUT (Default) ---
  return (
    <div className={`text-slate-900 bg-white leading-relaxed ${sizeClasses.base}`} dir="rtl">
      
      {/* Upper header */}
      <div className={`flex justify-between items-start border-b-2 border-slate-800 pb-6 ${sizeClasses.margin}`}>
        <div className={sizeClasses.space}>
          {showLogo && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md">
                إ
              </div>
              <span className="font-black text-xl tracking-wide text-slate-800">إنجاز للحديد</span>
            </div>
          )}
          <h1 className={`${sizeClasses.title} font-black text-slate-900`}>{settings.companyName}</h1>
          <p className="text-slate-600 font-bold">{settings.address}</p>
          <p className="text-slate-600 font-bold">تليفون: <span dir="ltr">{settings.phone}</span></p>
          {settings.taxNumber && <p className="text-slate-600 font-bold">الرقم الضريبي: {settings.taxNumber}</p>}
        </div>
        
        <div className="text-left space-y-2">
          <h2 className="text-3xl font-black text-slate-800 border-b-4 border-emerald-600 inline-block pb-1">
            {isSales ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
          </h2>
          <p className="text-xl font-mono font-black text-slate-800 mt-2">رقم المستند: {invoice.invoiceNumber}</p>
          <p className="text-slate-600 font-bold">
            التاريخ والوقت: {formatInvoiceDateTime(invoice.createdAt)}
          </p>
          {invoice.category !== 'general' && (
            <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black border border-slate-200">
              قسم: {invoice.category === 'manufacturing' ? 'تصنيع وتشغيل' : invoice.category === 'laser' ? 'تشغيل ليزر' : invoice.category === 'bending' ? 'شغل تناية' : invoice.category === 'strip' ? 'تفصيل خوصة' : 'عام'}
            </span>
          )}
        </div>
      </div>

      {/* Person Profile Area */}
      <div className={`bg-slate-50 border border-slate-200 ${sizeClasses.padding} rounded-2xl ${sizeClasses.margin} shadow-sm`}>
        <h3 className="text-lg font-black text-slate-800 mb-3 border-b border-slate-200 pb-2">
          تفاصيل الحساب للطرف {isSales ? 'المستلم' : 'المورد'}
        </h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm font-bold">
          <p className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">الاسم التجاري:</span> 
            <span className="text-slate-900 font-black text-base">{person?.name || 'نقدي / عام'}</span>
          </p>
          <p className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">الهاتف:</span> 
            <span className="text-slate-900" dir="ltr">{person?.phone || 'غير مسجل'}</span>
          </p>
          <p className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">العنوان:</span> 
            <span className="text-slate-900">{person?.address || 'غير مسجل'}</span>
          </p>
          <p className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-slate-500">الرصيد المالي الحالي:</span> 
            <span className={`text-base font-black ${currentBalance > 0 ? 'text-rose-600' : currentBalance < 0 ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
              {Math.abs(currentBalance).toLocaleString()} ج.م {currentBalance > 0 ? '(عليه)' : currentBalance < 0 ? '(له)' : 'مخلص'}
            </span>
          </p>
        </div>
      </div>

      {/* Main Items Invoice Table */}
      <div className={`${sizeClasses.margin} min-h-[220px]`}>
        <table className="w-full text-right border-collapse overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-900 text-sm font-black border-b-2 border-slate-300">
              <th className={`${sizeClasses.tableHeader} text-center w-12 border-r border-slate-200`}>م</th>
              <th className={`${sizeClasses.tableHeader} border-r border-slate-200`}>الصنف / بيان خامات الحديد والتشغيل</th>
              <th className={`${sizeClasses.tableHeader} text-center border-r border-slate-200`}>{invoice.category === 'laser' ? 'الوزن (كجم)' : 'الكمية / الوزن (كجم)'}</th>
              <th className={`${sizeClasses.tableHeader} text-center border-r border-slate-200`}>سعر الوحدة</th>
              <th className={`${sizeClasses.tableHeader} text-center bg-slate-200/80 text-slate-900 font-black`}>الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {items.map((item, idx) => (
              <tr key={idx} className="even:bg-slate-50/70 odd:bg-white hover:bg-slate-100/50 transition-colors">
                <td className="p-3 text-center font-bold text-slate-400 w-12">{idx + 1}</td>
                <td className="p-3 font-extrabold text-slate-900">
                  {item.description}
                  {invoice.category === 'laser' && item.length && (
                    <div className="text-xs text-slate-500 font-normal mt-1">
                      (الأبعاد: {item.length}m × {item.width}m × سمك {item.thickness}mm)
                    </div>
                  )}
                  {invoice.category === 'bending' && item.bendsCount && (
                    <div className="text-xs text-slate-500 font-normal mt-1">
                      (إجمالي عدد طعجات التناية: {item.bendsCount})
                    </div>
                  )}
                </td>
                <td className="p-3 font-mono font-bold text-center text-slate-700 whitespace-nowrap">
                  {item.quantity.toLocaleString()} {item.manufacturingUnit === 'meter' ? 'متر' : item.manufacturingUnit === 'piece' ? 'قطعة' : item.manufacturingUnit === 'ton' ? 'طن' : 'كجم'}
                </td>
                <td className="p-3 font-mono font-bold text-center text-slate-700">
                  {item.unitPrice.toLocaleString()}
                </td>
                <td className="p-3 font-mono font-black text-slate-900 text-center bg-slate-50/80">
                  {item.total.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dynamic Summary: Billing Calculations & Requested Account Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left Side: Requested Account Statement Footer "يسمع تحت في الفاتورة نفسها عند الطباعة" */}
        {showMiniStatement && person ? (
          <div className="bg-slate-50 border border-slate-300 rounded-2xl p-5 space-y-3 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              كشف حساب مالي مدمج للعميل
            </h4>
            <div className="space-y-2 text-xs font-bold text-slate-700">
              <div className="flex justify-between">
                <span>رصيد العميل السابق قبل الفاتورة:</span>
                <span className="text-slate-800 font-mono">
                  {Math.abs(previousBalance).toLocaleString()} ج.م {previousBalance > 0 ? '(عليه مديونية)' : previousBalance < 0 ? '(له رصيد)' : 'مخلص'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>قيمة المبيعات / المشتريات الحالية:</span>
                <span className="text-slate-800 font-mono">{invoice.total.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>المسدد نقداً في الخزينة:</span>
                <span className="text-emerald-700 font-mono">{invoice.paidAmount.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black">
                <span className="text-slate-900">رصيد العميل النهائي الجديد:</span>
                <span className={newBalance > 0 ? 'text-rose-600' : newBalance < 0 ? 'text-emerald-600' : 'text-slate-900'}>
                  {Math.abs(newBalance).toLocaleString()} ج.م {newBalance > 0 ? '(عليه مديونية)' : newBalance < 0 ? '(له رصيد)' : 'مخلص'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-4"></div>
        )}

        {/* Right Side: Invoice Subtotals */}
        <div className="bg-slate-50 border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex justify-between p-3 border-b border-slate-200 font-extrabold text-sm">
            <span className="text-slate-600">الإجمالي الفرعي للفاتورة:</span>
            <span className="text-slate-900">{invoice.subtotal.toLocaleString()} ج.م</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between p-3 border-b border-slate-200 font-extrabold text-sm text-rose-600">
              <span>الخصم المسموح به:</span>
              <span>-{invoice.discount.toLocaleString()} ج.م</span>
            </div>
          )}
          <div className="flex justify-between p-4 border-b-2 border-slate-800 font-black text-base bg-emerald-50 text-emerald-950">
            <span>إجمالي الفاتورة الصافي:</span>
            <span>{invoice.total.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between p-3 border-b border-slate-200 font-extrabold text-sm text-emerald-700 bg-white">
            <span>المدفوع من الفاتورة:</span>
            <span>{invoice.paidAmount.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between p-3 font-extrabold text-sm text-rose-700 bg-white">
            <span>المتبقي من الفاتورة:</span>
            <span>{invoice.remainingAmount.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Custom Note Area */}
      {notesText && (
        <div className="mt-8 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500 whitespace-pre-wrap">
          <h4 className="font-bold text-slate-800 mb-1">ملاحظات وشروط الفاتورة:</h4>
          <p>{notesText}</p>
        </div>
      )}

      {/* Official Signature Lines */}
      {showSignatures && (
        <div className="flex justify-between items-end border-t border-slate-200 pt-8 mt-12 px-6">
          <div className="text-center">
            <p className="font-extrabold text-slate-700 mb-8 text-xs">توقيع المستلم المعتمد</p>
            <div className="w-40 border-b border-slate-300"></div>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-slate-700 mb-8 text-xs">مسؤول الخزينة</p>
            <div className="w-40 border-b border-slate-300"></div>
          </div>
          <div className="text-center">
            <p className="font-extrabold text-slate-700 mb-8 text-xs">الختم والتوقيع الإداري</p>
            <div className="w-40 border-b border-slate-300"></div>
          </div>
        </div>
      )}

      {/* Permanent Developer Rights Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400 font-mono font-bold dir-ltr">
        {PROGRAMMER_FOOTER}
      </div>
    </div>
  );
}
