export interface ReceiptTranslations {
  digitalReceiptTitle: string;
  paidDigitallyBadge: string;
  orderTypeLabel: string;
  orderTypeDelivery: string;
  orderTypeLocal: string;
  tableGeneral: string;
  orderDetailsLabel: string;
  totalPaidLabel: string;
  thankYouMessage: string;
  referenceNumberLabel: string;
  currency: string;
}

export const receiptTranslations: Record<'ar' | 'fr' | 'en', ReceiptTranslations> = {
  ar: {
    digitalReceiptTitle: "مطعم MenuFlow",
    paidDigitallyBadge: "✓ فاتورة مدفوعة رقمياً",
    orderTypeLabel: "نوع الطلب:",
    orderTypeDelivery: "🛵 توصيل خارجي",
    orderTypeLocal: "🍽️ طاولة رقم",
    tableGeneral: "عامة",
    orderDetailsLabel: "تفاصيل الطلب:",
    totalPaidLabel: "الإجمالي المدفوع:",
    thankYouMessage: "شكراً لزيارتكم! نتمنى لكم وجبة شهية ❤️",
    referenceNumberLabel: "رقم المرجع:",
    currency: "د.ج",
  },
  fr: {
    digitalReceiptTitle: "Restaurant MenuFlow",
    paidDigitallyBadge: "✓ Reçu payé numériquement",
    orderTypeLabel: "Type de commande :",
    orderTypeDelivery: "🛵 Livraison à domicile",
    orderTypeLocal: "🍽️ Table N°",
    tableGeneral: "Générale",
    orderDetailsLabel: "Détails de la commande :",
    totalPaidLabel: "Total payé :",
    thankYouMessage: "Merci pour votre visite ! Bon appétit ❤️",
    referenceNumberLabel: "Référence :",
    currency: "DZD",
  },
  en: {
    digitalReceiptTitle: "MenuFlow Restaurant",
    paidDigitallyBadge: "✓ Digitally Paid Receipt",
    orderTypeLabel: "Order Type:",
    orderTypeDelivery: "🛵 Home Delivery",
    orderTypeLocal: "🍽️ Table No.",
    tableGeneral: "General",
    orderDetailsLabel: "Order Details:",
    totalPaidLabel: "Total Paid:",
    thankYouMessage: "Thank you for visiting us! Enjoy your meal ❤️",
    referenceNumberLabel: "Ref No:",
    currency: "DZD",
  },
};