import { lazy, Suspense } from 'react';

const QrScanner = lazy(() => import('../components/QrScanner').then(({ QrScanner: Scanner }) => ({ default: Scanner })));

export const StaffScanner = () => {
  const handleScan = (result: string) => {
    // التأكد من أن الرابط يحتوي على تنسيق الطاولة أو إعادة التوجيه الصحيح
    // مثلاً إذا مسح كوداً يحتوي فقط على رقم الطاولة "5"
    if (!result.includes('?table=')) {
        window.location.href = `/?table=${result}`;
    } else {
        window.location.href = result;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-lg text-center">
        <h2 className="text-xl font-bold mb-6 text-slate-800">ماسح النادل</h2>
        <p className="text-sm text-slate-500 mb-6">قم بمسح رمز الطاولة لبدء الجلسة</p>
        
        <div className="overflow-hidden rounded-2xl border-4 border-indigo-100">
          <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-sm text-slate-500">جاري تحميل الماسح...</div>}>
            <QrScanner onScanSuccess={handleScan} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};