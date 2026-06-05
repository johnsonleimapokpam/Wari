const ApiError = require('../utils/ApiError');
const userRepository = require('../repositories/userRepository');
const redisClient = require('../config/redis');

class RedisPresenceStore {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async snapshot(userId) {
    const socketCount = await this.redis.sCard(
      `user:${userId}:sockets`
    );

    const lastSeen = await this.redis.get(
      `user:${userId}: lastSeen`
    );

    return {
      userId,
      isOnline: socketCount > 0,
      activeConnectionsCount :socketCount,
      lastSeen
    };
  }

  async registerConnection(userId, socketId, occurredAt) {
    const key = `user:${userId}:sockets`;

    const previousCount = await this.redis.sCard(key);
    
    await this.redis.sAdd(key, socketId);

    await this.redis.set(
      `user:${userId}:presence`,
      "online"
    );

    return {
      snapshot: await this.snapshot(userId),
      isNewOnlineTransition: previousCount === 0,
      alreadyRegistered: false
    };
  }

  async registerHeartbeat(userId, socketId, occurredAt) {
    await this.redis.sAdd(
      `user:${userId}:sockets`,
      socketId
    )

    return {
      snapshot: this.snapshot(userId),
      isNewOnlineTransition: false,
      alreadyRegistered: true
    };
  }

  async unregisterConnection(userId, socketId, occurredAt) {
    const key = `user:${userId}:sockets`;

    await this.redis.sRem( key, socketId);

    const remainingConnections = await this.redis.sCard(key);

    if (remainingConnections > 0){
      return {
        snapshot: await this.snapshot(userId),
        wentOffline: false,
        shouldPersistLastSeen: false
      };
    }

    await this.redis.set(
      `user:${userId}:presence`,
      "offline"
    );

    await this.redis.set(
      `user:${userId}:lastSeen`,
      occurredAt.toISOString()
    );

    return {
      snapshot: {
        userId,
        isOnline: false,
        activeConnectionsCount: 0,
        lastSeen:
          occurredAt.toISOString()
      },
      wentOffline: true,
      shouldPersistLastSeen: true
    };
  }

  async isOnline(userId) {
    const count = await this.redis.sCard(
      `user:${userId}:sockets`
    );

    return count > 0;
  }
}

const store = new RedisPresenceStore(redisClient);

const normalizeTimestamp = (occurredAt = new Date()) => {
  return occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
};

const getPresence = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found', { code: 'USER_NOT_FOUND' });
  }

  const onlineSnapshot = await store.snapshot(userId);

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
  return await store.registerConnection(userId, socketId, timestamp);
};

const recordHeartbeat = async ({ userId, socketId, occurredAt = new Date() }) => {
  const timestamp = normalizeTimestamp(occurredAt);
  return await store.registerHeartbeat(userId, socketId, timestamp);
};

const unregisterConnection = async ({ userId, socketId, occurredAt = new Date() }) => {
  const timestamp = normalizeTimestamp(occurredAt);
  const result = await store.unregisterConnection(userId, socketId, timestamp);

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
    isOnline: await store.isOnline(userId)
  };
};
 
module.exports = {
  getPresence,
  registerConnection,
  recordHeartbeat,
  recordLogout,
  unregisterConnection
};