// api/products/index.js
// -----------------------------------------------------------------------------
// GET /api/products : Récupérer le catalogue et les stocks
// POST /api/products : Ajouter ou mettre à jour un produit
// DELETE /api/products?id=xxx : Supprimer un produit
// -----------------------------------------------------------------------------

const { supabase } = require('../../models/db');
const { verifyAdminSession } = require('../../lib/auth');

// Catalogue par défaut avec stock
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

// Cache mémoire serveur
let memoryProducts = [...DEFAULT_PRODUCTS];

module.exports = async function handler(req, res) {
  const { method } = req;

  // GET : Public - Consultation des produits
  if (method === 'GET') {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (!error && data && data.length > 0) {
          return res.status(200).json({ success: true, products: data });
        }
      }
      return res.status(200).json({ success: true, products: memoryProducts });
    } catch (err) {
      return res.status(200).json({ success: true, products: memoryProducts });
    }
  }

  // POST / PUT / DELETE requièrent l'authentification admin
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Non authentifié. Veuillez vous connecter.' });
  }

  if (method === 'POST') {
    try {
      const product = req.body;
      if (!product.name || !product.price) {
        return res.status(400).json({ error: 'Nom et prix obligatoires.' });
      }

      const id = product.id || 'prod_' + Date.now();
      const newProduct = {
        id,
        category: product.category || 'caps',
        name: String(product.name).trim(),
        desc: String(product.desc || '').trim(),
        price: Number(product.price) || 0,
        stock: Number(product.stock) >= 0 ? Number(product.stock) : 0,
        alertThreshold: Number(product.alertThreshold) || 3,
        img: product.img || 'assets/casquette (1).png',
        updated_at: new Date().toISOString()
      };

      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        await supabase
          .from('products')
          .upsert(newProduct, { onConflict: 'id' });
      }

      // Mise à jour cache mémoire
      const idx = memoryProducts.findIndex(p => p.id === id);
      if (idx >= 0) {
        memoryProducts[idx] = { ...memoryProducts[idx], ...newProduct };
      } else {
        memoryProducts.push(newProduct);
      }

      return res.status(200).json({ success: true, product: newProduct, products: memoryProducts });
    } catch (err) {
      console.error('[products-post] Erreur :', err);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du produit.' });
    }
  }

  if (method === 'DELETE') {
    try {
      const id = req.query.id || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ error: 'Identifiant du produit requis.' });
      }

      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        await supabase.from('products').delete().eq('id', id);
      }

      memoryProducts = memoryProducts.filter(p => p.id !== id);
      return res.status(200).json({ success: true, id, products: memoryProducts });
    } catch (err) {
      console.error('[products-delete] Erreur :', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Méthode non autorisée.' });
};
