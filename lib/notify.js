// lib/notify.js
// -----------------------------------------------------------------------------
// Envoi des notifications de commande (e-mail à l'admin + au client, SMS optionnel).
// - E-mail : Resend (https://resend.com) — simple, gratuit jusqu'à un certain volume.
// - SMS    : Twilio (optionnel). Si les clés Twilio ne sont pas configurées,
//            le SMS est simplement ignoré (pas d'erreur bloquante pour la commande).
// -----------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const SENDER_EMAIL = process.env.NOTIFICATION_SENDER_EMAIL || 'commandes@belrosewally.com';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const ADMIN_NOTIFICATION_PHONE = process.env.ADMIN_NOTIFICATION_PHONE;

/**
 * Envoie un e-mail via l'API Resend (appel HTTP direct, pas de SDK nécessaire).
 */
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[notify] RESEND_API_KEY manquant — e-mail non envoyé (mode dégradé).');
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: SENDER_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[notify] Échec envoi e-mail Resend :', errText);
    return { skipped: false, error: errText };
  }
  return { skipped: false, ok: true };
}

/**
 * Envoie un SMS via Twilio. Ignoré silencieusement si non configuré.
 */
async function sendSMS({ to, body }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !to) {
    console.warn('[notify] Configuration Twilio incomplète — SMS non envoyé.');
    return { skipped: true };
  }

  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('[notify] Échec envoi SMS Twilio :', errText);
    return { skipped: false, error: errText };
  }
  return { skipped: false, ok: true };
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

  if (ADMIN_NOTIFICATION_PHONE) {
    tasks.push(
      sendSMS({
        to: ADMIN_NOTIFICATION_PHONE,
        body: `Nouvelle commande BELROSE WALLY de ${order.client_name} (${order.client_phone}) — ${order.total.toLocaleString('fr-FR')} FCFA.`,
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

  // On n'attend pas que tout réussisse pour valider la commande côté client :
  // les échecs de notification sont journalisés mais ne bloquent jamais l'achat.
  await Promise.allSettled(tasks);
}

module.exports = { notifyNewOrder, sendEmail, sendSMS };
