const legacyFunctions = require('./index');
const { createOrder } = require('./canonicalOrderCreation');
const { mutateOrder } = require('./secureOrderMutations');

legacyFunctions.createOrder = createOrder;
legacyFunctions.mutateOrder = mutateOrder;
module.exports = legacyFunctions;
