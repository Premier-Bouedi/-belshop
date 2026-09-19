// lib/auth.js
// -----------------------------------------------------------------------------
// Utilitaires d'authentification Admin par JWT stocké dans un cookie HttpOnly.
// Aucun token n'est jamais accessible en JavaScript côté navigateur
// (protection contre le vol de session via XSS).
// -----------------------------------------------------------------------------

const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'belrose_admin_token';
const TOKEN_DURATION_SECONDS = 60 * 60 * 8; // 8 heures

/**
 * Génère le header Set-Cookie pour poser le token JWT en HttpOnly + Secure.
 */
function buildAuthCookie(token) {
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,       // HTTPS uniquement (Vercel sert toujours en HTTPS)
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_DURATION_SECONDS,
  });
}

/**
 * Cookie de déconnexion (valeur vide, expiration immédiate).
 */
function buildLogoutCookie() {
  return cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Crée un JWT signé pour l'admin authentifié.
 */
function signAdminToken(payload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET manquant dans les variables d\'environnement.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_DURATION_SECONDS });
}

/**
 * Vérifie la requête entrante : lit le cookie, valide le JWT.
 * Retourne le payload décodé si valide, sinon null.
 */
function verifyAdminRequest(req) {
  try {
    const rawCookies = req.headers.cookie || '';
    const parsed = cookie.parse(rawCookies);
    const token = parsed[COOKIE_NAME];
    if (!token || !JWT_SECRET) return null;

    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  buildAuthCookie,
  buildLogoutCookie,
  signAdminToken,
  verifyAdminRequest,
};
