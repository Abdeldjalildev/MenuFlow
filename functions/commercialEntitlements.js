const PLANS = Object.freeze({
  starter: Object.freeze({
    id: 'starter',
    entitlements: Object.freeze({ analytics: true, advancedAnalytics: false, waiter: true, aiAssistant: false }),
  }),
  growth: Object.freeze({
    id: 'growth',
    entitlements: Object.freeze({ analytics: true, advancedAnalytics: true, waiter: true, aiAssistant: true }),
  }),
});

const SUBSCRIPTION_STATES = new Set(['trialing', 'active', 'past_due', 'grace_period', 'canceled', 'suspended']);
const BILLING_EVENTS = new Set(['subscription.created', 'subscription.updated', 'subscription.canceled', 'invoice.payment_failed', 'invoice.paid']);

function getPlan(planId) {
  return typeof planId === 'string' ? PLANS[planId] : undefined;
}

function assertSubscriptionState(state) {
  if (!SUBSCRIPTION_STATES.has(state)) throw new Error(`Unsupported subscription state: ${state}`);
  return state;
}

function assertBillingEventType(type) {
  if (!BILLING_EVENTS.has(type)) throw new Error(`Unsupported billing event type: ${type}`);
  return type;
}

function buildEntitlementSnapshot(subscription = {}) {
  const plan = getPlan(subscription.planId);
  if (!plan) throw new Error('Unknown plan.');
  const state = assertSubscriptionState(subscription.state);
  const enabled = state === 'trialing' || state === 'active' || state === 'grace_period';
  return {
    planId: plan.id,
    subscriptionState: state,
    entitlements: Object.fromEntries(Object.entries(plan.entitlements).map(([key, value]) => [key, enabled && value])),
  };
}

function isBillingEventAlreadyProcessed(snapshot) {
  return Boolean(snapshot?.processedAt);
}

module.exports = {
  PLANS,
  SUBSCRIPTION_STATES,
  BILLING_EVENTS,
  getPlan,
  assertSubscriptionState,
  assertBillingEventType,
  buildEntitlementSnapshot,
  isBillingEventAlreadyProcessed,
};
