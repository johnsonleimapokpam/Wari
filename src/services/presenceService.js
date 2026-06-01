const ApiError = require('../utils/ApiError');
const userRepository = require('../repositories/userRepository');

class InMemoryPresenceStore {
  constructor() {
    this.users = new Map();
  }

  getEntry(userId) {
    return this.users.get(userId) || null;
  }

  ensureEntry(userId) {
    const existingEntry = this.getEntry(userId);

    if (existingEntry) {
      return existingEntry;
    }

    const newEntry = {
      socketIds: new Set(),
      lastSeenAt: null
    };

    this.users.set(userId, newEntry);
    return newEntry;
  }

  snapshot(userId) {
    const entry = this.getEntry(userId);

    if (!entry) {
      return null;
    }

    return {
      userId,
      isOnline: entry.socketIds.size > 0,
      activeConnectionsCount: entry.socketIds.size,
      lastSeen: entry.lastSeenAt ? entry.lastSeenAt.toISOString() : null
    };
  }

  registerConnection(userId, socketId, occurredAt) {
    const entry = this.ensureEntry(userId);
    const wasOnline = entry.socketIds.size > 0;

    entry.socketIds.add(socketId);
    entry.lastSeenAt = occurredAt;

    return {
      snapshot: this.snapshot(userId),
      isNewOnlineTransition: !wasOnline,
      alreadyRegistered: wasOnline && entry.socketIds.size === 1 && entry.socketIds.has(socketId) === false
    };
  }

  registerHeartbeat(userId, socketId, occurredAt) {
    const entry = this.getEntry(userId);

    if (!entry) {
      return this.registerConnection(userId, socketId, occurredAt);
    }

    const wasAlreadyRegistered = entry.socketIds.has(socketId);
    entry.socketIds.add(socketId);
    entry.lastSeenAt = occurredAt;

    return {
      snapshot: this.snapshot(userId),
      isNewOnlineTransition: false,
      alreadyRegistered: wasAlreadyRegistered
    };
  }

  unregisterConnection(userId, socketId, occurredAt) {
    const entry = this.getEntry(userId);

    if (!entry) {
      return {
        snapshot: {
          userId,
          isOnline: false,
          activeConnectionsCount: 0,
          lastSeen: occurredAt.toISOString()
        },
        wentOffline: false,
        shouldPersistLastSeen: false
      };
    }

    entry.socketIds.delete(socketId);

    if (entry.socketIds.size > 0) {
      return {
        snapshot: this.snapshot(userId),
        wentOffline: false,
        shouldPersistLastSeen: false
      };
    }

    entry.lastSeenAt = occurredAt;
    const snapshot = this.snapshot(userId) || {
      userId,
      isOnline: false,
      activeConnectionsCount: 0,
      lastSeen: occurredAt.toISOString()
    };

    this.users.delete(userId);

    return {
      snapshot,
      wentOffline: true,
      shouldPersistLastSeen: true
    };
  }

  isOnline(userId) {
    const entry = this.getEntry(userId);
    return Boolean(entry && entry.socketIds.size > 0);
  }
}

const store = new InMemoryPresenceStore();

const normalizeTimestamp = (occurredAt = new Date()) => {
  return occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
};

const getPresence = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found', { code: 'USER_NOT_FOUND' });
  }

  const onlineSnapshot = store.snapshot(userId);

  if (onlineSnapshot) {
    return onlineSnapshot;
  }

  return {
    userId,
    isOnline: false,
    activeConnectionsCount: 0,
    lastSeen: user.lastSeenAt ? new Date(user.lastSeenAt).toISOString() : null
  };
};

const registerConnection = async ({ userId, socketId, occurredAt = new Date() }) => {
  const timestamp = normalizeTimestamp(occurredAt);
  return store.registerConnection(userId, socketId, timestamp);
};

const recordHeartbeat = async ({ userId, socketId, occurredAt = new Date() }) => {
  const timestamp = normalizeTimestamp(occurredAt);
  return store.registerHeartbeat(userId, socketId, timestamp);
};

const unregisterConnection = async ({ userId, socketId, occurredAt = new Date() }) => {
  const timestamp = normalizeTimestamp(occurredAt);
  const result = store.unregisterConnection(userId, socketId, timestamp);

  if (result.shouldPersistLastSeen) {
    await userRepository.updateLastSeen(userId, timestamp);
  }

  return result;
};

const recordLogout = async ({ userId, occurredAt = new Date() }) => {
  const timestamp = normalizeTimestamp(occurredAt);
  await userRepository.updateLastSeen(userId, timestamp);

  return {
    userId,
    lastSeen: timestamp.toISOString(),
    isOnline: store.isOnline(userId)
  };
};

module.exports = {
  getPresence,
  registerConnection,
  recordHeartbeat,
  recordLogout,
  unregisterConnection
};