const legacyFunctions = require('./index');
const { createOrder } = require('./canonicalOrderCreation');
const { mutateOrder } = require('./secureOrderMutations');
const { createOperationalNotification } = require('./operationalNotifications');

legacyFunctions.createOrder = createOrder;
legacyFunctions.mutateOrder = mutateOrder;

// Keep lifecycle authority in the established transitionOrder function while
// adding the Phase 11 operational-alert boundary at the deployed export.
const legacyTransitionOrder = legacyFunctions.transitionOrder;
legacyFunctions.transitionOrder = require('firebase-functions/v2/https').onCall(async request => {
  const result = await legacyTransitionOrder.run(request);
  const role = request.auth?.token?.role;
  const restaurantId = role === 'SuperAdmin'
    ? request.data?.restaurantId
    : (role === 'Admin' ? (request.data?.restaurantId || request.auth?.token?.restaurantId) : request.auth?.token?.restaurantId);
  if (result?.ok && typeof restaurantId === 'string' && restaurantId.trim() && typeof request.data?.orderId === 'string' && request.data.orderId.trim() && typeof request.data?.newStatus === 'string' && request.data.newStatus.trim()) {
    await createOperationalNotification(require('firebase-admin/firestore').getFirestore(), {
      restaurantId,
      type: 'order_transition',
      orderId: request.data.orderId,
      status: request.data.newStatus,
      title: 'Order status updated',
      message: `Order #${request.data.orderId} moved to ${request.data.newStatus}.`,
      eventId: `order-transition-${request.data.orderId}-${request.data.newStatus}`,
    });
  }
  return result;
});

module.exports = legacyFunctions;
