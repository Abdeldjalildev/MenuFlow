const { FieldValue } = require('firebase-admin/firestore');
const { logDiagnostic } = require('./operationalDiagnostics');

const NOTIFICATION_TYPES = new Set(['new_order', 'order_transition']);
const MAX_TITLE_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 500;

/**
 * Trusted backend-only operational alert writer. Notification failure is deliberately
 * isolated from canonical order lifecycle callers: callers should invoke this only
 * after their authoritative transaction succeeds.
 */
async function createOperationalNotification(db, { restaurantId, type, orderId, orderNumber, status, title, message, eventId }) {
  if (!restaurantId || !NOTIFICATION_TYPES.has(type) || !orderId) return null;
  const notifications = db.collection(`restaurants/${restaurantId}/notifications`);
  const safeEventId = typeof eventId === 'string' && eventId.length <= 128 ? eventId : null;
  const ref = safeEventId ? notifications.doc(safeEventId) : notifications.doc();
  try {
    await db.runTransaction(async tx => {
      if (safeEventId) {
        const existing = await tx.get(ref);
        if (existing.exists) return;
      }
      tx.create(ref, {
        restaurantId,
        type,
        orderId,
        ...(Number.isInteger(orderNumber) ? { orderNumber } : {}),
        ...(typeof status === 'string' ? { status: status.slice(0, 64) } : {}),
        title: String(title || '').slice(0, MAX_TITLE_LENGTH),
        message: String(message || '').slice(0, MAX_MESSAGE_LENGTH),
        acknowledgedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return ref.id;
  } catch (error) {
    logDiagnostic('warn', 'operational_notification', error, { restaurantId, orderId });
    return null;
  }
}

module.exports = { createOperationalNotification, NOTIFICATION_TYPES };
