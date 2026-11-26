'use strict';

const THEME_COOKIE = 'vpsadmin_oauth_theme';

function parseTheme(value) {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : undefined;
}

function themeCookieOptions(req) {
  return { path: '/', secure: req.secure, sameSite: 'lax', httpOnly: false };
}

function clearThemeCookie(req, res) {
  res.clearCookie(THEME_COOKIE, themeCookieOptions(req));
}

function writeThemeCookie(req, res, selected, initiating) {
  if (!parseTheme(selected) || !parseTheme(initiating)) return;
  res.cookie(THEME_COOKIE, `${selected}.${initiating}`, { ...themeCookieOptions(req), maxAge: 120000 });
}

module.exports = { parseTheme, clearThemeCookie, writeThemeCookie };
