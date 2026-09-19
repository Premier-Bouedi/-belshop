// api/admin/add-client.js
// -----------------------------------------------------------------------------
// POST /api/admin/add-client
// Permet à l'administrateur d'inscrire manuellement un client hors-ligne
// (ex : client venu en boutique physique) dans la base de données.
// Route protégée par cookie de session admin (JWT).
// -----------------------------------------------------------------------------

const { supabase } = require('../../models/db');
const { verifyAdminRequest } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const admin = verifyAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  try {
    const { name, phone, email, address, notes } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ error: 'Nom et téléphone sont obligatoires.' });
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
        notes: notes ? String(notes).trim() : null,
        source: 'manuel',
      })
      .select()
      .single();

    if (error) {
      console.error('[api/admin/add-client] Erreur Supabase :', error);
      return res.status(500).json({ error: "Impossible d'enregistrer le client." });
    }

    return res.status(201).json({ success: true, client: data });
  } catch (err) {
    console.error('[api/admin/add-client] Erreur inattendue :', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
