import queue = require('../../../bff/session-queue');

const middleware = queue.createSessionQueue({ name: 'sid', secret: 'secret' });
declare const response: Parameters<typeof middleware>[1];
middleware({ headers: {} }, response, (error: string) => {
  throw new Error(error);
});
