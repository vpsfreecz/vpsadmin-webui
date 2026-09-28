import queue = require('../../../bff/session-queue');

queue.createSessionQueue({ name: 'sid', secret: 42 });
