const { logger } = require('firebase-functions');

const DIAGNOSTIC_OPERATIONS = new Set([
  'provision_authz_claims',
  'admin_membership',
  'order_create',
  'order_mutation',
  'order_transition',
  'analytics_summary',
  'operational_notification',
]);

const ERROR_CATEGORIES = new Set([
  'authorization',
  'validation',
  'dependency',
  'timeout',
  'data_integrity',
  'not_found',
  'internal',
]);

function sanitizeId(value, max = 128) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function sanitizeDiagnosticContext(context = {}) {
  const safe = {};
  const restaurantId = sanitizeId(context.restaurantId);
  const operation = sanitizeId(context.operation, 64);
  const actorUid = sanitizeId(context.actorUid);
  const orderId = sanitizeId(context.orderId);
  const requestId = sanitizeId(context.requestId);
  if (restaurantId) safe.restaurantId = restaurantId;
  if (operation && DIAGNOSTIC_OPERATIONS.has(operation)) safe.operation = operation;
  if (actorUid) safe.actorUid = actorUid;
  if (orderId) safe.orderId = orderId;
  if (requestId) safe.requestId = requestId;
  return safe;
}

function classifyError(error) {
  const code = String(error?.code || '').toLowerCase();
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'authorization';
  if (code.includes('invalid-argument') || code.includes('failed-precondition')) return 'validation';
  if (code.includes('deadline') || code.includes('timeout')) return 'timeout';
  if (code.includes('not-found')) return 'not_found';
  if (code.includes('resource-exhausted') || code.includes('unavailable') || code.includes('aborted')) return 'dependency';
  if (code.includes('data-loss') || code.includes('already-exists')) return 'data_integrity';
  return 'internal';
}

function logDiagnostic(level, operation, error, context = {}) {
  const category = classifyError(error);
  const safeContext = sanitizeDiagnosticContext({ ...context, operation });
  const payload = {
    event: 'menuflow_diagnostic',
    category,
    code: typeof error?.code === 'string' ? error.code.slice(0, 96) : undefined,
    message: typeof error?.message === 'string' ? error.message.slice(0, 240) : 'Unknown error',
    ...safeContext,
  };
  const method = typeof logger[level] === 'function' ? logger[level].bind(logger) : logger.error.bind(logger);
  method(payload);
  return category;
}

module.exports = {
  ERROR_CATEGORIES,
  DIAGNOSTIC_OPERATIONS,
  classifyError,
  sanitizeDiagnosticContext,
  logDiagnostic,
};
