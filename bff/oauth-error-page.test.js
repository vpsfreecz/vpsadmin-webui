'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { renderOAuthErrorPage } = require('./oauth-error-page');

test('OAuth recovery page gives a plain bilingual retry without provider details', () => {
  const english = renderOAuthErrorPage('en');
  const czech = renderOAuthErrorPage('cs');

  assert.match(english, /<html lang="en">/);
  assert.match(english, /Sign-in could not be completed\. Try signing in again\./);
  assert.match(czech, /<html lang="cs">/);
  assert.match(czech, /Přihlášení se nepodařilo dokončit\. Zkus se přihlásit znovu\./);

  for (const page of [english, czech]) {
    assert.match(page, /href="\/oauth\/login\?next=%2Fapp"/);
    assert.doesNotMatch(page, /error_description|provider response|OAuth state/iu);
  }
});
