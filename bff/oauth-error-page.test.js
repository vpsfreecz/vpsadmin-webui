'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { renderOAuthErrorPage } = require('./oauth-error-page');

test('OAuth recovery page gives a plain bilingual retry without provider details', () => {
  const english = renderOAuthErrorPage('en');
  const czech = renderOAuthErrorPage('cs');

  assert.match(english, /<html lang="en" data-theme="auto">/);
  assert.match(english, /Sign-in could not be completed\. Try signing in again\./);
  assert.match(czech, /<html lang="cs" data-theme="auto">/);
  assert.match(czech, /Přihlášení se nepodařilo dokončit\. Zkus se přihlásit znovu\./);

  for (const page of [english, czech]) {
    assert.match(page, /href="\/oauth\/login\?next=%2Fapp&amp;theme=auto&amp;theme_return=1"/);
    assert.doesNotMatch(page, /error_description|provider response|OAuth state/iu);
  }
});

test('recovery uses the initiating preference and bounds retry appearance', () => {
  for (const theme of ['light', 'dark', 'auto']) {
    const page = renderOAuthErrorPage('en', theme);
    assert.match(page, new RegExp(`data-theme="${theme}"`));
    assert.ok(page.includes(`theme=${theme}&amp;theme_return=1`));
    if (theme === 'light') assert.match(page, /@media not all/);
    if (theme === 'dark') assert.match(page, /@media all/);
  }
  assert.doesNotMatch(renderOAuthErrorPage('en', '<script>'), /<script>/);
});
