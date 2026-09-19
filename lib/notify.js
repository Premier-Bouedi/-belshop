// lib/notify.js
// -----------------------------------------------------------------------------
// Envoi des notifications par e-mail via Gmail SMTP (nodemailer).
// Configuration via variables d'environnement (.env ou Vercel).
// -----------------------------------------------------------------------------
try { require('dotenv').config(); } catch (_) {}
const nodemailer = require('nodemailer');

const MAIL_HOST = process.env.MAIL_HOST || 'smtp.gmail.com';
const MAIL_PORT = parseInt(process.env.MAIL_PORT || '587', 10);
const MAIL_USERNAME = process.env.MAIL_USERNAME;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;
const MAIL_FROM = process.env.MAIL_FROM_ADDRESS || MAIL_USERNAME;
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || MAIL_USERNAME;

let transporter = null;

/**
 * Crée ou récupère le transporteur SMTP Gmail.
 */
function getTransporter() {
  if (transporter) return transporter;

  if (!MAIL_USERNAME || !MAIL_PASSWORD) {
    console.warn('[notify] MAIL_USERNAME ou MAIL_PASSWORD manquant — e-mails désactivés.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_PORT === 465,
    auth: {
      user: MAIL_USERNAME,
      pass: MAIL_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Envoie un e-mail via Gmail SMTP.
 */
async function sendEmail({ to, subject, html }) {
  const smtp = getTransporter();
  if (!smtp) {
    console.warn('[notify] Transporteur SMTP non configuré — e-mail non envoyé (mode dégradé).');
    return { skipped: true };
  }

  try {
    const info = await smtp.sendMail({
      from: `"BELROSE WALLY" <${MAIL_FROM}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log('[notify] E-mail envoyé avec succès :', info.messageId);
    return { skipped: false, ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[notify] Échec envoi e-mail SMTP :', err.message);
    return { skipped: false, error: err.message };
  }
}

/**
 * Notifie l'admin et (si un e-mail client est fourni) le client, après une commande.
 */
async function notifyNewOrder(order) {
  const itemsHtml = order.items
    .map((it) => `<li>${it.qty} × ${it.name} — ${(it.price * it.qty).toLocaleString('fr-FR')} FCFA</li>`)
    .join('');

  const adminHtml = `
    <h2>Nouvelle commande BELROSE WALLY</h2>
    <p><strong>Client :</strong> ${order.client_name}</p>
    <p><strong>Téléphone / WhatsApp :</strong> ${order.client_phone}</p>
    <p><strong>Quartier de livraison :</strong> ${order.client_address}</p>
    <ul>${itemsHtml}</ul>
    <p><strong>Total :</strong> ${order.total.toLocaleString('fr-FR')} FCFA (paiement à la livraison)</p>
  `;

  const tasks = [];

  if (ADMIN_NOTIFICATION_EMAIL) {
    tasks.push(
      sendEmail({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `🛍️ Nouvelle commande — ${order.client_name}`,
        html: adminHtml,
      })
    );
  }

  if (order.client_email) {
    tasks.push(
      sendEmail({
        to: order.client_email,
        subject: 'Confirmation de votre commande — BELROSE WALLY',
        html: `
          <h2>Merci pour votre commande, ${order.client_name} !</h2>
          <p>Nous avons bien reçu votre commande. Elle sera livrée à l'adresse indiquée
          (${order.client_address}) avec paiement à la livraison.</p>
          <ul>${itemsHtml}</ul>
          <p><strong>Total : ${order.total.toLocaleString('fr-FR')} FCFA</strong></p>
        `,
      })
    );
  }

  await Promise.allSettled(tasks);
}

module.exports = { notifyNewOrder, sendEmail };
