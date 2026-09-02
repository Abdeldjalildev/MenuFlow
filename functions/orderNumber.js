const ORDER_NUMBER_TIME_ZONE = 'UTC';

function getOrderNumberDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ORDER_NUMBER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function getNextOrderNumber(counterData) {
  const nextNumber = counterData == null ? 1 : Number(counterData.nextNumber);
  if (!Number.isInteger(nextNumber) || nextNumber < 1) {
    throw new Error('Order number counter is invalid.');
  }
  return nextNumber;
}

module.exports = { getOrderNumberDate, getNextOrderNumber, ORDER_NUMBER_TIME_ZONE };
