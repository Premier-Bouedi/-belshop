// api/admin/logout.js
// -----------------------------------------------------------------------------
// POST /api/admin/logout
// Efface le cookie de session admin.
// -----------------------------------------------------------------------------

const { buildLogoutCookie } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  res.setHeader('Set-Cookie', buildLogoutCookie());
  return res.status(200).json({ success: true });
};
