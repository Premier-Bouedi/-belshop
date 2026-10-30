// api/products/index.js
// -----------------------------------------------------------------------------
// GET /api/products : Récupérer le catalogue et les stocks
// POST /api/products : Ajouter, modifier un produit, ou enregistrer les stocks
// DELETE /api/products?id=xxx : Supprimer un produit
// -----------------------------------------------------------------------------

const { supabase } = require('../../models/db');
const { verifyAdminRequest } = require('../../lib/auth');

const DEFAULT_PRODUCTS = [
  { id: 'c1', category: 'caps', name: 'CASQUETTE NOIR', desc: 'Casquette élégante brodée avec filet de ventilation', price: 15000, stock: 12, alertThreshold: 3, img: 'assets/casquette (1).png' },
  { id: 'c2', category: 'caps', name: 'CASQUETTE HERMÈS STYLE', desc: 'Finition haute qualité édition spéciale', price: 18000, stock: 4, alertThreshold: 3, img: 'assets/casquette (2).png' },
  { id: 'c3', category: 'caps', name: 'CASQUETTE LUXE', desc: 'Tissu respirant et ajustement parfait', price: 15000, stock: 2, alertThreshold: 3, img: 'assets/casquette (3).png' },
  { id: 'c4', category: 'caps', name: 'CASQUETTE PRESTIGE', desc: 'Édition limitée confort optimal', price: 15000, stock: 0, alertThreshold: 3, img: 'assets/casquette (4).png' },
  { id: 's1', category: 'sacs', name: 'Sac Classic', desc: 'Sac à bandoulière en cuir avec finition dorée', price: 45000, stock: 8, alertThreshold: 3, img: 'assets/sac 1 (1).png' },
  { id: 's2', category: 'sacs', name: 'Sac Seared Saffron', desc: 'Modèle compact haut de gamme pour soirées', price: 40000, stock: 5, alertThreshold: 3, img: 'assets/sac 1 (2).png' },
  { id: 's3', category: 'sacs', name: 'Green Garden Bag', desc: 'Collection prestige édition limitée', price: 50000, stock: 1, alertThreshold: 3, img: 'assets/sac 1 (3).png' },
  { id: 'p1', category: 'parfums', name: 'Parfum Belrose Eau De Parfum', desc: 'Senteur florale et envoûtante 100ml', price: 35000, stock: 15, alertThreshold: 3, img: 'assets/parfuns 3.png' },
  { id: 'p2', category: 'parfums', name: 'Parfum Belrose Collection', desc: 'Senteur raffinée pour les occasions spéciales', price: 40000, stock: 10, alertThreshold: 3, img: 'assets/parfuns.png' }
];

module.exports = async function handler(req, res) {
  const { method } = req;

  // GET : Public - Consultation des produits
  if (method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.status(200).json({ success: true, products: data });
      }
      return res.status(200).json({ success: true, products: DEFAULT_PRODUCTS });
    } catch (err) {
      console.warn('[api/products] Erreur GET :', err.message);
      return res.status(200).json({ success: true, products: DEFAULT_PRODUCTS });
    }
  }

  // POST / DELETE requièrent l'authentification admin
  const admin = verifyAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
  }

  if (method === 'POST') {
    try {
      const body = req.body || {};

      // Cas 1 : Sauvegarde en lot (tableau de produits)
      if (Array.isArray(body.products)) {
        await supabase.from('products').upsert(body.products);
        const { data: updatedList } = await supabase.from('products').select('*');
        return res.status(200).json({
          success: true,
          message: `${body.products.length} produits enregistrés avec succès.`,
          products: updatedList
        });
      }

      // Cas 2 : Modification rapide du stock uniquement { id, stock }
      if (body.id && body.stock !== undefined && !body.name) {
        const { data: existingList } = await supabase.from('products').select('*');
        const existing = (existingList || []).find(p => String(p.id) === String(body.id));
        if (existing) {
          const updatedProduct = {
            ...existing,
            stock: Math.max(0, parseInt(body.stock, 10) || 0),
            updated_at: new Date().toISOString()
          };
          await supabase.from('products').upsert(updatedProduct);
          const { data: allProds } = await supabase.from('products').select('*');
          return res.status(200).json({
            success: true,
            message: `Stock de ${existing.name} mis à jour (${updatedProduct.stock}).`,
            product: updatedProduct,
            products: allProds
          });
        }
      }

      // Cas 3 : Ajout ou modification complète d'un produit
      if (!body.name || body.price === undefined) {
        return res.status(400).json({ error: 'Le nom et le prix du produit sont obligatoires.' });
      }

      const id = body.id || ('prod_' + Date.now());
      const newProduct = {
        id: String(id),
        category: body.category || 'caps',
        name: String(body.name).trim(),
        desc: String(body.desc || '').trim(),
        price: Number(body.price) || 0,
        stock: Number(body.stock) >= 0 ? Number(body.stock) : 0,
        alertThreshold: Number(body.alertThreshold) >= 0 ? Number(body.alertThreshold) : 3,
        img: body.img || 'assets/casquette (1).png',
        updated_at: new Date().toISOString()
      };

      await supabase.from('products').upsert(newProduct);
      const { data: allProds } = await supabase.from('products').select('*');

      return res.status(200).json({
        success: true,
        message: `Produit "${newProduct.name}" enregistré avec succès !`,
        product: newProduct,
        products: allProds
      });
    } catch (err) {
      console.error('[products-post] Erreur :', err);
      return res.status(500).json({ error: "Erreur lors de l'enregistrement : " + err.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ error: 'Identifiant du produit requis.' });
      }

      await supabase.from('products').delete().eq('id', id);
      const { data: allProds } = await supabase.from('products').select('*');

      return res.status(200).json({
        success: true,
        message: 'Produit supprimé avec succès.',
        id,
        products: allProds
      });
    } catch (err) {
      console.error('[products-delete] Erreur :', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression : ' + err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Méthode non autorisée.' });
};
