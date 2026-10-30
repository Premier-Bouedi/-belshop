// models/db.js
// -----------------------------------------------------------------------------
// Connexion hybride : Supabase en production (si configuré)
// OU Base de données locale persistée dans data/db.json en local / mode hors-ligne.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  !SUPABASE_URL.includes('xxxx') && 
  SUPABASE_SERVICE_KEY && 
  !SUPABASE_SERVICE_KEY.includes('xxxx')
);

let supabase;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
    console.log('[models/db.js] Connecté à Supabase Cloud.');
  } catch (err) {
    console.warn('[models/db.js] Échec connexion Supabase, bascule en local :', err.message);
  }
}

if (!supabase) {
  // Mode local / autonome : stockage persistant dans data/db.json
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const DB_FILE = path.join(DATA_DIR, 'db.json');

  const INITIAL_PRODUCTS = [
    { id: 'c1', category: 'caps', name: 'CASQUETTE NOIR', desc: 'Casquette élégante brodée avec filet de ventilation', price: 15000, stock: 12, alertThreshold: 3, img: 'assets/casquette (1).png', created_at: new Date().toISOString() },
    { id: 'c2', category: 'caps', name: 'CASQUETTE HERMÈS STYLE', desc: 'Finition haute qualité édition spéciale', price: 18000, stock: 4, alertThreshold: 3, img: 'assets/casquette (2).png', created_at: new Date().toISOString() },
    { id: 'c3', category: 'caps', name: 'CASQUETTE LUXE', desc: 'Tissu respirant et ajustement parfait', price: 15000, stock: 2, alertThreshold: 3, img: 'assets/casquette (3).png', created_at: new Date().toISOString() },
    { id: 'c4', category: 'caps', name: 'CASQUETTE PRESTIGE', desc: 'Édition limitée confort optimal', price: 15000, stock: 0, alertThreshold: 3, img: 'assets/casquette (4).png', created_at: new Date().toISOString() },
    { id: 's1', category: 'sacs', name: 'Sac Classic', desc: 'Sac à bandoulière en cuir avec finition dorée', price: 45000, stock: 8, alertThreshold: 3, img: 'assets/sac 1 (1).png', created_at: new Date().toISOString() },
    { id: 's2', category: 'sacs', name: 'Sac Seared Saffron', desc: 'Modèle compact haut de gamme pour soirées', price: 40000, stock: 5, alertThreshold: 3, img: 'assets/sac 1 (2).png', created_at: new Date().toISOString() },
    { id: 's3', category: 'sacs', name: 'Green Garden Bag', desc: 'Collection prestige édition limitée', price: 50000, stock: 1, alertThreshold: 3, img: 'assets/sac 1 (3).png', created_at: new Date().toISOString() },
    { id: 'p1', category: 'parfums', name: 'Parfum Belrose Eau De Parfum', desc: 'Senteur florale et envoûtante 100ml', price: 35000, stock: 15, alertThreshold: 3, img: 'assets/parfuns 3.png', created_at: new Date().toISOString() },
    { id: 'p2', category: 'parfums', name: 'Parfum Belrose Collection', desc: 'Senteur raffinée pour les occasions spéciales', price: 40000, stock: 10, alertThreshold: 3, img: 'assets/parfuns.png', created_at: new Date().toISOString() }
  ];

  const INITIAL_ORDERS = [
    {
      id: 1,
      client_name: 'Marc Nguema',
      client_phone: '+241 77 12 34 56',
      client_address: 'Libreville, Quartier Glass',
      items: [{ id: 'c2', name: 'CASQUETTE HERMÈS STYLE', price: 18000, qty: 1 }],
      total: 18000,
      payment_method: 'Paiement à la livraison',
      status: 'en_attente',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 2,
      client_name: 'Sarah Biyogo',
      client_phone: '+241 66 98 76 54',
      client_address: 'Libreville, Louis',
      items: [{ id: 's1', name: 'Sac Classic', price: 45000, qty: 1 }],
      total: 45000,
      payment_method: 'Paiement à la livraison',
      status: 'confirmee',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 3,
      client_name: 'Franck Obame',
      client_phone: '+241 74 11 22 33',
      client_address: 'Libreville, Akébé Plaine',
      items: [{ id: 'p1', name: 'Parfum Belrose Eau De Parfum', price: 35000, qty: 1 }],
      total: 35000,
      payment_method: 'Paiement à la livraison',
      status: 'livree',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];

  const INITIAL_CLIENTS = [
    { id: 1, name: 'Marc Nguema', phone: '+241 77 12 34 56', email: 'marc.nguema@gmail.com', address: 'Libreville, Glass', source: 'en_ligne', notes: 'Client régulier', created_at: new Date().toISOString() },
    { id: 2, name: 'Sarah Biyogo', phone: '+241 66 98 76 54', email: 'sarah.b@gmail.com', address: 'Libreville, Louis', source: 'en_ligne', notes: '', created_at: new Date().toISOString() },
    { id: 3, name: 'Franck Obame', phone: '+241 74 11 22 33', email: 'franck.o@gmail.com', address: 'Libreville, Akébé', source: 'manuel', notes: 'Visite boutique physique', created_at: new Date().toISOString() }
  ];

  function loadLocalDb() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.products && parsed.orders) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[db.js] Réinitialisation data/db.json');
    }

    const initial = {
      products: INITIAL_PRODUCTS,
      orders: INITIAL_ORDERS,
      clients: INITIAL_CLIENTS
    };
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (_) {}
    return initial;
  }

  function saveLocalDb(data) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[db.js] Erreur écriture data/db.json:', e.message);
    }
  }

  // Émulateur Supabase avec support des opérations SQL habituelles
  supabase = {
    from(tableName) {
      let db = loadLocalDb();
      if (!db[tableName]) db[tableName] = [];

      let currentRows = [...db[tableName]];
      let isSingle = false;
      let lastInserted = null;
      let totalCount = currentRows.length;

      const builder = {
        select(cols = '*', opts = {}) {
          if (opts && opts.count === 'exact') {
            totalCount = currentRows.length;
          }
          return builder;
        },
        order(field, { ascending = true } = {}) {
          currentRows.sort((a, b) => {
            const valA = a[field] || '';
            const valB = b[field] || '';
            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
          });
          return builder;
        },
        range(from, to) {
          currentRows = currentRows.slice(from, to + 1);
          return builder;
        },
        eq(field, value) {
          currentRows = currentRows.filter(r => String(r[field]) === String(value));
          return builder;
        },
        insert(data) {
          const rows = Array.isArray(data) ? data : [data];
          const newRows = rows.map((r, i) => ({
            id: r.id || (Date.now() + i),
            created_at: new Date().toISOString(),
            ...r
          }));
          db[tableName].push(...newRows);
          saveLocalDb(db);
          currentRows = newRows;
          lastInserted = newRows.length === 1 ? newRows[0] : newRows;
          return builder;
        },
        upsert(data) {
          const items = Array.isArray(data) ? data : [data];
          const updatedRows = [];
          items.forEach(item => {
            const idx = db[tableName].findIndex(r => String(r.id) === String(item.id));
            if (idx >= 0) {
              db[tableName][idx] = { ...db[tableName][idx], ...item };
              updatedRows.push(db[tableName][idx]);
            } else {
              const newItem = { id: item.id || ('item_' + Date.now()), created_at: new Date().toISOString(), ...item };
              db[tableName].push(newItem);
              updatedRows.push(newItem);
            }
          });
          saveLocalDb(db);
          currentRows = updatedRows;
          lastInserted = updatedRows.length === 1 ? updatedRows[0] : updatedRows;
          return builder;
        },
        delete() {
          return {
            eq(field, value) {
              db[tableName] = db[tableName].filter(r => String(r[field]) !== String(value));
              saveLocalDb(db);
              return Promise.resolve({ data: null, error: null });
            }
          };
        },
        single() {
          isSingle = true;
          return builder;
        },
        then(resolve, reject) {
          try {
            const resultData = isSingle ? (lastInserted || currentRows[0] || null) : currentRows;
            resolve({
              data: resultData,
              error: null,
              count: totalCount
            });
          } catch (e) {
            reject(e);
          }
        }
      };

      return builder;
    }
  };
}

module.exports = { supabase };
