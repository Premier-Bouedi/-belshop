// api/admin/send-code.js
// -----------------------------------------------------------------------------
// POST /api/admin/send-code
// Génère et envoie un code de vérification à 6 chiffres par e-mail.
// -----------------------------------------------------------------------------

const { storeOtp } = require('../../lib/otp');
const { sendEmail } = require('../../lib/notify');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const { email, purpose = 'inscription' } = req.body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Adresse e-mail valide requise.' });
    }

    const code = storeOtp(email, purpose);

    const emailSubject = `🔐 Code de vérification Admin — BELROSE WALLY (${code})`;
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; background-color: #f7f6f3; border-radius: 12px;">
        <h2 style="color: #ff6469; margin-bottom: 10px;">BELROSE WALLY - Sécurité Admin</h2>
        <p>Voici votre code de vérification pour votre demande (<strong>${purpose}</strong>) :</p>
        <div style="background: #ffffff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #666;">Ce code est valide pendant <strong>10 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log(`[send-code] Code généré pour ${email}: ${code} (purpose: ${purpose})`);

    return res.status(200).json({
      success: true,
      message: emailResult.skipped
        ? `Code envoyé (Mode simulation : ${code})`
        : 'Code de vérification envoyé par e-mail avec succès.',
      // Retourne le code en mode démo si RESEND_API_KEY n'est pas encore configurée
      devCode: emailResult.skipped ? code : undefined
    });
  } catch (err) {
    console.error('[send-code] Erreur :', err);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi du code.' });
  }
};
