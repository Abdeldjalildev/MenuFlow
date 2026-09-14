const legacyFunctions = require('./index');
const { createOrder } = require('./canonicalOrderCreation');
const { mutateOrder } = require('./secureOrderMutations');
const { createOperationalNotification } = require('./operationalNotifications');
const { getAnalyticsSummary } = require('./phase12Analytics');
const { createRestaurant } = require('./tenantOnboarding');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');

legacyFunctions.createOrder = createOrder;
legacyFunctions.mutateOrder = mutateOrder;
legacyFunctions.getAnalyticsSummary = getAnalyticsSummary;
legacyFunctions.createRestaurant = createRestaurant;

// Operational lifecycle alerts observe the same order documents used by the
// canonical lifecycle authority. This keeps transitionOrder authoritative and
// isolates notification failure from the order mutation itself.
legacyFunctions.orderTransitionOperationalAlert = onDocumentUpdated(
  { document: 'restaurants/{restaurantId}/orders/{orderId}', region: 'us-central1' },
  async event => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after || before.status === after.status) return null;
    const restaurantId = event.params?.restaurantId;
    const orderId = event.params?.orderId;
    if (typeof restaurantId !== 'string' || !restaurantId.trim() || typeof orderId !== 'string' || !orderId.trim()) return null;
    return createOperationalNotification(getFirestore(), {
      restaurantId,
      type: 'order_transition',
      orderId,
      status: after.status,
      title: 'Order status updated',
      message: `Order #${after.orderNumber ?? orderId} moved to ${after.status}.`,
      eventId: `order-transition-${orderId}-${after.status}`,
    });
  },
);

module.exports = legacyFunctions;
