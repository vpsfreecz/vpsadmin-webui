import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const bffRequire = createRequire(fileURLToPath(new URL('../bff/server.js', import.meta.url)));
const { createSessionQueue } = bffRequire('./session-queue');
const signature = bffRequire('cookie-signature');

function response() {
  return {
    destroyed: false,
    headers: {},
    statusCode: 200,
    endArgs: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    type() {
      return this;
    },
    send(value) {
      this.sent = value;
      return this;
    },
    end(...args) {
      this.endArgs = args;
      return this;
    },
  };
}

test('the queue keeps response-end arguments, order and the busy rejection', async () => {
  const secret = 'synthetic-queue-secret';
  const cookie = `sid=${encodeURIComponent(`s:${signature.sign('session-id', secret)}`)}`;
  const middleware = createSessionQueue({ name: 'sid', secret, maxPending: 2 });
  const events = [];
  const first = response();
  const second = response();
  const rejected = response();
  middleware({ headers: { cookie } }, first, () => events.push('first'));
  middleware({ headers: { cookie } }, second, () => events.push('second'));
  middleware({ headers: { cookie } }, rejected, () => events.push('rejected'));
  assert.deepEqual(events, ['first']);
  assert.equal(rejected.statusCode, 503);
  assert.equal(rejected.headers['retry-after'], '1');
  assert.equal(rejected.sent, 'Session busy. Please retry.');

  const finished = () => {};
  assert.equal(first.end('body', 'utf8', finished), first);
  assert.deepEqual(first.endArgs, ['body', 'utf8', finished]);
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual(events, ['first', 'second']);
  second.end();
  const later = response();
  middleware({ headers: { cookie } }, later, () => events.push('later'));
  assert.deepEqual(events, ['first', 'second', 'later']);

  const invalid = response();
  middleware({ headers: { cookie: 'sid=s%3Ainvalid' } }, invalid, () => events.push('invalid'));
  assert.deepEqual(events, ['first', 'second', 'later', 'invalid']);
});
