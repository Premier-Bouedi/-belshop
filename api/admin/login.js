// api/admin/login.js
// -----------------------------------------------------------------------------
// POST /api/admin/login
// Authentifie l'administrateur et pose un cookie JWT HttpOnly.
// Les identifiants admin (e-mail + hash du mot de passe) sont stockés
// UNIQUEMENT dans les variables d'environnement Vercel, jamais en base
// "en clair" ni dans le code source.
// -----------------------------------------------------------------------------

const bcrypt = require('bcryptjs');
const { signAdminToken, buildAuthCookie } = require('../../lib/auth');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // généré avec bcrypt, voir README

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail et mot de passe requis.' });
    }

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
      console.error('[api/admin/login] Variables ADMIN_EMAIL / ADMIN_PASSWORD_HASH manquantes.');
      return res.status(500).json({ error: 'Configuration admin manquante côté serveur.' });
    }

    // Comparaison de l'e-mail insensible à la casse, mot de passe via bcrypt
    const emailMatches = email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();
    const passwordMatches = emailMatches
      ? await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
      : false;

    if (!emailMatches || !passwordMatches) {
      // Message volontairement générique (ne pas révéler quel champ est faux)
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const token = signAdminToken({ role: 'admin', email: ADMIN_EMAIL });
    res.setHeader('Set-Cookie', buildAuthCookie(token));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[api/admin/login] Erreur inattendue :', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
