import queue = require('../../../bff/session-queue');

queue.createSessionQueue({ name: 'sid', secret: 'secret', maxPending: 'many' });
