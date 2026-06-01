const MESSAGE_STATUSES = Object.freeze({
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ'
});

const STATUS_RANK = Object.freeze({
  [MESSAGE_STATUSES.SENT]: 1,
  [MESSAGE_STATUSES.DELIVERED]: 2,
  [MESSAGE_STATUSES.READ]: 3
});

const isForwardTransition = (currentStatus, nextStatus) => {
  return STATUS_RANK[nextStatus] >= STATUS_RANK[currentStatus];
};

const isDowngrade = (currentStatus, nextStatus) => {
  return STATUS_RANK[nextStatus] < STATUS_RANK[currentStatus];
};

const assertValidTransition = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (isDowngrade(currentStatus, nextStatus)) {
    const error = new Error(`Invalid message status transition from ${currentStatus} to ${nextStatus}`);
    error.code = 'INVALID_MESSAGE_STATUS_TRANSITION';
    throw error;
  }
};

module.exports = {
  MESSAGE_STATUSES,
  STATUS_RANK,
  assertValidTransition,
  isDowngrade,
  isForwardTransition
};