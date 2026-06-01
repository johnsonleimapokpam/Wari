class TypingService {
  constructor({ defaultTimeoutMs = 3000 } = {}) {
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.conversations = new Map();
    this.socketIndex = new Map();
  }

  getConversationEntry(conversationId) {
    return this.conversations.get(conversationId) || null;
  }

  ensureConversationEntry(conversationId) {
    const existingEntry = this.getConversationEntry(conversationId);

    if (existingEntry) {
      return existingEntry;
    }

    const newEntry = new Map();
    this.conversations.set(conversationId, newEntry);
    return newEntry;
  }

  ensureUserEntry(conversationId, userId) {
    const conversationEntry = this.ensureConversationEntry(conversationId);
    const existingUserEntry = conversationEntry.get(userId);

    if (existingUserEntry) {
      return existingUserEntry;
    }

    const newUserEntry = {
      socketIds: new Set(),
      timers: new Map(),
      startedAt: null,
      lastActivityAt: null
    };

    conversationEntry.set(userId, newUserEntry);
    return newUserEntry;
  }

  indexSocket(socketId, conversationId, userId) {
    if (!this.socketIndex.has(socketId)) {
      this.socketIndex.set(socketId, new Map());
    }

    this.socketIndex.get(socketId).set(conversationId, userId);
  }

  unindexSocket(socketId, conversationId) {
    const socketConversationMap = this.socketIndex.get(socketId);

    if (!socketConversationMap) {
      return;
    }

    socketConversationMap.delete(conversationId);

    if (socketConversationMap.size === 0) {
      this.socketIndex.delete(socketId);
    }
  }

  cleanupConversationIfEmpty(conversationId) {
    const conversationEntry = this.getConversationEntry(conversationId);

    if (conversationEntry && conversationEntry.size === 0) {
      this.conversations.delete(conversationId);
    }
  }

  createSnapshot(conversationId) {
    const conversationEntry = this.getConversationEntry(conversationId);
    const activeTypingUsers = [];

    if (!conversationEntry) {
      return {
        conversationId,
        activeTypingUsers,
        activeTypingUsersCount: 0
      };
    }

    for (const [userId, userEntry] of conversationEntry.entries()) {
      if (userEntry.socketIds.size > 0) {
        activeTypingUsers.push({
          userId,
          activeConnectionsCount: userEntry.socketIds.size,
          startedAt: userEntry.startedAt ? userEntry.startedAt.toISOString() : null,
          lastActivityAt: userEntry.lastActivityAt ? userEntry.lastActivityAt.toISOString() : null
        });
      }
    }

    return {
      conversationId,
      activeTypingUsers,
      activeTypingUsersCount: activeTypingUsers.length
    };
  }

  clearTimer(userEntry, socketId) {
    const timer = userEntry.timers.get(socketId);

    if (timer) {
      clearTimeout(timer);
      userEntry.timers.delete(socketId);
    }
  }

  startTyping({ conversationId, userId, socketId, timeoutMs, onTimeout, occurredAt = new Date() }) {
    const userEntry = this.ensureUserEntry(conversationId, userId);
    const wasTyping = userEntry.socketIds.size > 0;
    const effectiveTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : this.defaultTimeoutMs;

    userEntry.socketIds.add(socketId);
    userEntry.startedAt = userEntry.startedAt || occurredAt;
    userEntry.lastActivityAt = occurredAt;

    this.clearTimer(userEntry, socketId);

    const timer = setTimeout(() => {
      const result = this.stopTyping({
        conversationId,
        userId,
        socketId,
        occurredAt: new Date(),
        reason: 'timeout'
      });

      if (result.stoppedTyping && typeof onTimeout === 'function') {
        onTimeout(result);
      }
    }, effectiveTimeoutMs);

    userEntry.timers.set(socketId, timer);
    this.indexSocket(socketId, conversationId, userId);

    return {
      snapshot: this.createSnapshot(conversationId),
      startedTyping: !wasTyping,
      alreadyTyping: wasTyping
    };
  }

  stopTyping({ conversationId, userId, socketId, occurredAt = new Date(), reason = 'manual' }) {
    const conversationEntry = this.getConversationEntry(conversationId);

    if (!conversationEntry) {
      return {
        snapshot: this.createSnapshot(conversationId),
        stoppedTyping: false,
        reason
      };
    }

    const userEntry = conversationEntry.get(userId);

    if (!userEntry) {
      return {
        snapshot: this.createSnapshot(conversationId),
        stoppedTyping: false,
        reason
      };
    }

    this.clearTimer(userEntry, socketId);
    userEntry.socketIds.delete(socketId);
    this.unindexSocket(socketId, conversationId);

    if (userEntry.socketIds.size === 0) {
      userEntry.lastActivityAt = occurredAt;
      conversationEntry.delete(userId);
      this.cleanupConversationIfEmpty(conversationId);

      return {
        snapshot: this.createSnapshot(conversationId),
        stoppedTyping: true,
        reason
      };
    }

    userEntry.lastActivityAt = occurredAt;

    return {
      snapshot: this.createSnapshot(conversationId),
      stoppedTyping: false,
      reason
    };
  }

  clearSocket(socketId) {
    const socketConversationMap = this.socketIndex.get(socketId);
    const stoppedConversations = [];

    if (!socketConversationMap) {
      return stoppedConversations;
    }

    for (const [conversationId, userId] of Array.from(socketConversationMap.entries())) {
      const result = this.stopTyping({
        conversationId,
        userId,
        socketId,
        occurredAt: new Date(),
        reason: 'disconnect'
      });

      if (result.stoppedTyping) {
        stoppedConversations.push({
          conversationId,
          snapshot: result.snapshot
        });
      }
    }

    this.socketIndex.delete(socketId);
    return stoppedConversations;
  }
}

const typingService = new TypingService();

module.exports = typingService;
module.exports.TypingService = TypingService;