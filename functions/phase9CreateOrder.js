const legacyFunctions = require('./index');
const { createOrder } = require('./canonicalOrderCreation');

legacyFunctions.createOrder = createOrder;
module.exports = legacyFunctions;
