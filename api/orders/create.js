// api/orders/create.js
// -----------------------------------------------------------------------------
// POST /api/orders/create
// Route publique : reçoit une commande du panier client, la valide,
// l'enregistre dans Supabase, puis déclenche les notifications (email/SMS).
// -----------------------------------------------------------------------------

const { supabase } = require('../../models/db');
const { notifyNewOrder } = require('../../lib/notify');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  try {
    const { client, items, total, paymentMethod, clientEmail } = req.body || {};

    // --- Validation basique des données reçues ---
    if (!client || !client.name || !client.phone || !client.address) {
      return res.status(400).json({ error: 'Informations client incomplètes.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Le panier est vide.' });
    }
    if (typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ error: 'Montant total invalide.' });
    }

    // Recalcul du total côté serveur pour éviter toute manipulation du prix
    // depuis le navigateur (sécurité).
    const recalculatedTotal = items.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.qty),
      0
    );
    if (recalculatedTotal !== total) {
      return res.status(400).json({ error: 'Le total ne correspond pas aux articles envoyés.' });
    }

    const orderRow = {
      client_name: String(client.name).trim(),
      client_phone: String(client.phone).trim(),
      client_address: String(client.address).trim(),
      items,
      total: recalculatedTotal,
      payment_method: paymentMethod || 'Paiement à la livraison',
      status: 'en_attente',
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(orderRow)
      .select()
      .single();

    if (error) {
      console.error('[api/orders/create] Erreur Supabase :', error);
      return res.status(500).json({ error: "Impossible d'enregistrer la commande." });
    }

    // Notifications e-mail/SMS (ne bloquent jamais la réponse en cas d'échec)
    await notifyNewOrder({ ...orderRow, client_email: clientEmail });

    return res.status(201).json({ success: true, order: data });
  } catch (err) {
    console.error('[api/orders/create] Erreur inattendue :', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
