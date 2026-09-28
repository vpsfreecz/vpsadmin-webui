import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { JSDOM } from 'jsdom';

describe('the installed DOM encoding runtime', () => {
  it('sniffs UTF-8 HTML and preserves Czech text through HTML parsing', () => {
    const html = Buffer.from('<meta charset="utf-8"><p>Žluťoučký kůň</p>', 'utf8');
    const dom = new JSDOM(html);

    assert.equal(dom.window.document.characterSet, 'UTF-8');
    assert.equal(dom.window.document.querySelector('p')?.textContent, 'Žluťoučký kůň');
  });

  it('honors UTF-8 and UTF-16 BOMs ahead of conflicting encoding hints', () => {
    const utf8 = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('<meta charset="windows-1252"><p>Příliš žluťoučký</p>', 'utf8'),
    ]);
    const utf16le = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('<p>Český text</p>', 'utf16le'),
    ]);
    const utf16be = Buffer.concat([
      Buffer.from([0xfe, 0xff]),
      Buffer.from('<p>Živý text</p>', 'utf16le').swap16(),
    ]);

    assert.equal(
      new JSDOM(utf8, { contentType: 'text/html; charset=windows-1252' }).window.document.querySelector('p')?.textContent,
      'Příliš žluťoučký',
    );
    assert.equal(new JSDOM(utf16le).window.document.querySelector('p')?.textContent, 'Český text');
    assert.equal(new JSDOM(utf16be).window.document.querySelector('p')?.textContent, 'Živý text');
  });

  it('decodes Windows-1252 bytes outside Latin-1 when parsing HTML', () => {
    const html = Buffer.concat([
      Buffer.from('<meta charset="iso-8859-1"><p>', 'ascii'),
      Buffer.from([0x8a, 0x80, 0x9e]),
      Buffer.from('</p>', 'ascii'),
    ]);
    const dom = new JSDOM(html);

    assert.equal(dom.window.document.characterSet, 'windows-1252');
    assert.equal(dom.window.document.querySelector('p')?.textContent, 'Š€ž');
  });

  it('parses Czech HTML and XML through DOMParser', () => {
    const { DOMParser } = new JSDOM('').window;
    const parser = new DOMParser();

    assert.equal(parser.parseFromString('<p>Český obsah</p>', 'text/html').querySelector('p')?.textContent, 'Český obsah');
    assert.equal(parser.parseFromString('<zpráva>Živý obsah</zpráva>', 'application/xml').documentElement.textContent, 'Živý obsah');
  });

  it('reads UTF-8 and Windows-1252 blobs through FileReader', async () => {
    const { Blob, FileReader, TextEncoder } = new JSDOM('').window;
    const readAsText = (bytes, encoding) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result);
      reader.readAsText(new Blob([bytes]), encoding);
    });

    assert.equal(await readAsText(new TextEncoder().encode('Příliš žluťoučký'), 'utf-8'), 'Příliš žluťoučký');
    assert.equal(await readAsText(new Uint8Array([0x8a, 0x80, 0x9e]), 'iso-8859-1'), 'Š€ž');
  });
});
