// api/admin/verify-code.js
// -----------------------------------------------------------------------------
// POST /api/admin/verify-code
// Valide le code OTP et finalise l'inscription ou la mise à jour admin.
// -----------------------------------------------------------------------------

const bcrypt = require('bcryptjs');
const { verifyOtp } = require('../../lib/otp');
const { signAdminToken, buildAuthCookie } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const { email, code, password } = req.body || {};

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'E-mail, code et mot de passe sont requis.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Vérification du code OTP
    const otpResult = verifyOtp(email, code);
    if (!otpResult.valid) {
      return res.status(400).json({ error: otpResult.message });
    }

    // Hachage du mot de passe pour confirmation
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`[verify-code] Validation réussie pour ${email}. Nouveau hash: ${hashedPassword}`);

    // Connexion automatique après inscription / réinitialisation
    const token = signAdminToken({ role: 'admin', email: email.trim().toLowerCase() });
    res.setHeader('Set-Cookie', buildAuthCookie(token));

    return res.status(200).json({
      success: true,
      message: 'Compte Admin validé et connecté avec succès !',
      hash: hashedPassword
    });
  } catch (err) {
    console.error('[verify-code] Erreur :', err);
    return res.status(500).json({ error: 'Erreur lors de la vérification.' });
  }
};
