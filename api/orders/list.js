// api/orders/list.js
// -----------------------------------------------------------------------------
// GET /api/orders/list
// Route protégée : renvoie la liste des commandes pour l'espace Admin.
// Nécessite un cookie de session admin valide (JWT HttpOnly).
// -----------------------------------------------------------------------------

const { supabase } = require('../../models/db');
const { verifyAdminRequest } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const admin = verifyAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[api/orders/list] Erreur Supabase :', error);
      return res.status(500).json({ error: 'Impossible de récupérer les commandes.' });
    }

    return res.status(200).json({ orders: data, total: count, page, pageSize });
  } catch (err) {
    console.error('[api/orders/list] Erreur inattendue :', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
