// lib/otp.js
// -----------------------------------------------------------------------------
// Gestionnaire de codes de vérification OTP temporaires (e-mail admin).
// Stocke les codes en mémoire avec une durée de validité de 10 minutes.
// -----------------------------------------------------------------------------

const otpStore = new Map(); // email -> { code, expiresAt, purpose }
const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Génère un code numérique aléatoire à 6 chiffres.
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sauvegarde un code pour un e-mail donné.
 */
function storeOtp(email, purpose = 'verification') {
  const cleanEmail = email.trim().toLowerCase();
  const code = generateCode();
  const expiresAt = Date.now() + CODE_EXPIRY_MS;

  otpStore.set(cleanEmail, { code, expiresAt, purpose });

  // Nettoyage automatique après expiration
  setTimeout(() => {
    const item = otpStore.get(cleanEmail);
    if (item && item.expiresAt <= Date.now()) {
      otpStore.delete(cleanEmail);
    }
  }, CODE_EXPIRY_MS + 1000);

  return code;
}

/**
 * Vérifie si le code fourni est valide.
 */
function verifyOtp(email, code) {
  const cleanEmail = email.trim().toLowerCase();
  const item = otpStore.get(cleanEmail);

  if (!item) return { valid: false, message: 'Aucun code trouvé. Veuillez demander un nouveau code.' };
  if (Date.now() > item.expiresAt) {
    otpStore.delete(cleanEmail);
    return { valid: false, message: 'Code expiré. Veuillez en demander un nouveau.' };
  }
  if (item.code !== code.trim()) {
    return { valid: false, message: 'Code de vérification incorrect.' };
  }

  // Code valide : on le consomme
  otpStore.delete(cleanEmail);
  return { valid: true, purpose: item.purpose };
}

module.exports = {
  storeOtp,
  verifyOtp,
};
