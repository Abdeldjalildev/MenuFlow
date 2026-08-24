export interface MyReceiptsTranslations {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  noReceipts: string;
  noReceiptsSub: string;
  backBtn: string;
  totalCount: string;
  loadingText: string;
}

export const myReceiptsTranslations: Record<'ar' | 'fr' | 'en', MyReceiptsTranslations> = {
  ar: {
    title: 'فواتيري الرقمية 🧾',
    subtitle: 'جميع فواتيرك المدفوعة محفوظة هنا إلكترونياً',
    searchPlaceholder: 'ابحث برقم مرجع الفاتورة...',
    noReceipts: 'لا توجد فواتير مدفوعة حتى الآن',
    noReceiptsSub: 'بمجرد تأكيد طلبك ودفع المبلغ ستظهر فاتورتك هنا فوراً.',
    backBtn: 'العودة للمنيو',
    totalCount: 'إجمالي الفواتير:',
    loadingText: 'جاري تحميل فواتيرك...',
  },
  fr: {
    title: 'Mes Reçus Numériques 🧾',
    subtitle: 'Tous vos reçus payés sont conservés ici',
    searchPlaceholder: 'Rechercher par N° de référence...',
    noReceipts: 'Aucun reçu payé pour le moment',
    noReceiptsSub: 'Dès que votre commande est payée, votre reçu apparaîtra ici.',
    backBtn: 'Retour au menu',
    totalCount: 'Total des reçus :',
    loadingText: 'Chargement de vos reçus...',
  },
  en: {
    title: 'My Digital Receipts 🧾',
    subtitle: 'All your paid receipts are stored here electronically',
    searchPlaceholder: 'Search by reference ID...',
    noReceipts: 'No paid receipts yet',
    noReceiptsSub: 'Once your order is confirmed and paid, your receipt will appear here.',
    backBtn: 'Back to menu',
    totalCount: 'Total Receipts:',
    loadingText: 'Loading your receipts...',
  },
};