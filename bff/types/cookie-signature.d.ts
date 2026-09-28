// The deployed package has no declarations; these are its sign/unsign contracts.
declare module 'cookie-signature' {
  type Secret = string | NodeJS.ArrayBufferView | import('node:crypto').KeyObject;
  export function sign(value: string, secret: Secret): string;
  export function unsign(value: string, secret: Secret): string | false;
}
