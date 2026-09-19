// scripts/test-email.js
// -----------------------------------------------------------------------------
// Script pour tester la configuration SMTP Gmail.
// Usage : node scripts/test-email.js <votre_email_destinataire>
// -----------------------------------------------------------------------------

require('dotenv').config();
const { sendEmail } = require('../lib/notify');

const toEmail = process.argv[2] || process.env.MAIL_USERNAME;

if (!toEmail || toEmail.includes('votre_email')) {
  console.error('❌ Veuillez spécifier une adresse email valide.');
  console.log('Usage : node scripts/test-email.js exemple@gmail.com');
  process.exit(1);
}

console.log(`📡 Test d'envoi d'e-mail via SMTP Gmail vers : ${toEmail}...`);
console.log(`⚙️  Hôte : ${process.env.MAIL_HOST || 'smtp.gmail.com'}:${process.env.MAIL_PORT || 587}`);
console.log(`👤 Utilisateur SMTP : ${process.env.MAIL_USERNAME}`);

sendEmail({
  to: toEmail,
  subject: '🧪 Test d\'envoi d\'e-mail — BELROSE WALLY',
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f6f3; border-radius: 10px;">
      <h2 style="color: #ff6469;">✅ Configuration Gmail SMTP réussie !</h2>
      <p>Ceci est un e-mail de test envoyé depuis votre application <strong>BELROSE WALLY</strong>.</p>
      <p>Votre boutique est prête à envoyer les codes de vérification admin et les notifications de commande.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <small style="color: #888;">Envoyé le ${new Date().toLocaleString('fr-FR')}</small>
    </div>
  `
}).then((res) => {
  if (res.ok) {
    console.log('🎉 E-mail envoyé avec succès ! ID :', res.messageId);
  } else if (res.skipped) {
    console.log('⚠️ Envoi ignoré : vérifiez que MAIL_USERNAME et MAIL_PASSWORD sont bien renseignés dans .env');
  } else {
    console.error('❌ Échec :', res.error);
  }
}).catch((err) => {
  console.error('❌ Erreur inattendue :', err);
});
