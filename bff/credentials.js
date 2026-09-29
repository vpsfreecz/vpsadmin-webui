'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_CREDENTIAL_BYTES = 16 * 1024;
const CREDENTIALS = {
  oauthClientId: 'oauth-client-id',
  oauthClientSecret: 'oauth-client-secret',
  sessionSecret: 'session-secret',
};
const RETIRED_VARIABLES = ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET', 'SESSION_SECRET'];

function invalid(name, reason) {
  throw new Error(`${name}: ${reason}`);
}

function readCredential(directory, name) {
  const filename = path.join(directory, name);
  let fd;
  try {
    const entry = fs.lstatSync(filename);
    if (!entry.isFile()) invalid(name, 'regular file required');
    if (entry.size > MAX_CREDENTIAL_BYTES) invalid(name, 'file too large');
    fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const opened = fs.fstatSync(fd);
    if (!opened.isFile()) invalid(name, 'regular file required');
    if (opened.size > MAX_CREDENTIAL_BYTES) invalid(name, 'file too large');

    const buffer = Buffer.alloc(MAX_CREDENTIAL_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(fd, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    let value;
    try {
      if (length > MAX_CREDENTIAL_BYTES) invalid(name, 'file too large');
      if (length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        invalid(name, 'BOM is forbidden');
      }
      value = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length));
    } catch (error) {
      if (error.message?.startsWith(`${name}: `)) throw error;
      invalid(name, 'invalid UTF-8');
    } finally {
      buffer.fill(0);
    }
    if (value.endsWith('\r\n')) value = value.slice(0, -2);
    else if (value.endsWith('\n')) value = value.slice(0, -1);
    if (!value || value.trim() !== value || /[\x00-\x1f\x7f-\x9f\uFEFF]/u.test(value)) {
      invalid(name, 'invalid whitespace or control character');
    }
    return value;
  } catch (error) {
    if (error.message?.startsWith(`${name}: `)) throw error;
    if (error.code === 'ENOENT') invalid(name, 'missing file');
    invalid(name, 'unreadable file');
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { invalid(name, 'unreadable file'); }
    }
  }
}

function readCredentials(env) {
  for (const name of RETIRED_VARIABLES) {
    if (Object.hasOwn(env, name)) invalid(name, 'retired environment variable');
  }
  const directory = env.CREDENTIALS_DIRECTORY;
  if (typeof directory !== 'string' || !path.isAbsolute(directory) ||
      directory.trim() !== directory || /[\x00-\x1f\x7f]/.test(directory)) {
    invalid('CREDENTIALS_DIRECTORY', 'absolute directory required');
  }
  try {
    if (!fs.lstatSync(directory).isDirectory()) {
      invalid('CREDENTIALS_DIRECTORY', 'directory required');
    }
  } catch (error) {
    if (error.message?.startsWith('CREDENTIALS_DIRECTORY: ')) throw error;
    invalid('CREDENTIALS_DIRECTORY', 'unavailable directory');
  }
  return Object.fromEntries(Object.entries(CREDENTIALS).map(([key, name]) => [
    key, readCredential(directory, name),
  ]));
}

module.exports = { CREDENTIALS, MAX_CREDENTIAL_BYTES, readCredentials };
