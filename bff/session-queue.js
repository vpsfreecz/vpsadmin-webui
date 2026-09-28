'use strict';

const cookie = require('cookie');
const signature = require('cookie-signature');

/** @typedef {{ headers: { cookie?: string } }} QueueRequest */
/**
 * @typedef {import('node:http').ServerResponse & {
 *   status: (code: number) => QueueResponse,
 *   type: (contentType: string) => QueueResponse,
 *   send: (body: string) => unknown
 * }} QueueResponse
 */
/** @typedef {(error?: unknown) => void} QueueNext */

// Install BEFORE express-session: its store read and response-time save/touch
// must both happen inside the queue. One BFF process must own each session store.
/**
 * @param {{ name: string, secret: string, maxPending?: number }} options
 * @returns {(req: QueueRequest, res: QueueResponse, next: QueueNext) => void}
 */
function createSessionQueue({ name, secret, maxPending = 32 }) {
  /** @type {Map<string, Array<() => void>>} */
  const queues = new Map();
  return function sessionQueue(req, res, next) {
    const value = cookie.parse(req.headers.cookie || '')[name];
    const id = value?.startsWith('s:') ? signature.unsign(value.slice(2), secret) : false;
    // Unauthenticated/invalid cookies produce independent new session IDs.
    if (!id) return next();

    let queue = queues.get(id);
    if (!queue) {
      queue = [];
      queues.set(id, queue);
    }
    if (queue.length >= maxPending) {
      res.setHeader('cache-control', 'no-store');
      res.setHeader('retry-after', '1');
      return res.status(503).type('text/plain').send('Session busy. Please retry.');
    }

    const run = () => {
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        queue.shift();
        const nextRun = queue[0];
        if (nextRun) queueMicrotask(nextRun);
        else queues.delete(id);
      };
      if (res.destroyed) return release();

      // express-session wraps this end and calls it AFTER its asynchronous
      // store write. Socket close alone must not unlock a still-running refresh.
      const end = res.end;
      res.end = /** @type {typeof end} */ (function (...args) {
        try { return Reflect.apply(end, this, args); }
        finally { release(); }
      });
      try { next(); }
      catch (error) { next(error); }
    };
    queue.push(run);
    if (queue.length === 1) run();
  };
}

module.exports = { createSessionQueue };
