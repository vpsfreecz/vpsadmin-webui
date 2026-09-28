import queue = require('../../../bff/session-queue');

const middleware = queue.createSessionQueue({ name: 'sid', secret: 'secret', maxPending: 2 });
declare const response: Parameters<typeof middleware>[1];
middleware({ headers: { cookie: 'signed-cookie' } }, response, (error?: unknown) => {
  if (error) throw error;
});
