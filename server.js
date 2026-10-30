// server.js - Serveur local pour BELROSE WALLY (BELSHOP)
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

// Map des routes API vers leurs contrôleurs
const API_ROUTES = {
  '/api/settings': './api/admin/settings.js',
  '/api/products': './api/products/index.js',
  '/api/orders/create': './api/orders/create.js',
  '/api/orders/list': './api/orders/list.js',
  '/api/admin/login': './api/admin/login.js',
  '/api/admin/logout': './api/admin/logout.js',
  '/api/admin/send-code': './api/admin/send-code.js',
  '/api/admin/verify-code': './api/admin/verify-code.js',
  '/api/admin/settings': './api/admin/settings.js',
  '/api/admin/add-client': './api/admin/add-client.js',
};

// Enricheur pour req et res imitant le format Vercel / Express
function enhanceReqRes(req, res, parsedUrl) {
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());

  res.status = function (code) {
    res.statusCode = code;
    return res;
  };

  res.json = function (data) {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(data));
    return res;
  };

  res.send = function (data) {
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return res.json(data);
    }
    res.end(data);
    return res;
  };
}

// Extraction du body en JSON
function parseBody(req) {
  return new Promise((resolve) => {
    let bodyData = '';
    req.on('data', (chunk) => {
      bodyData += chunk;
    });
    req.on('end', () => {
      if (bodyData) {
        try {
          req.body = JSON.parse(bodyData);
        } catch (_) {
          req.body = bodyData;
        }
      } else {
        req.body = {};
      }
      resolve();
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  enhanceReqRes(req, res, parsedUrl);

  // 1. Endpoint d'actualisation de la base de données
  if (pathname === '/api/admin/refresh-db') {
    try {
      delete require.cache[require.resolve('./models/db')];
      const { supabase } = require('./models/db');
      const { data: products } = await supabase.from('products').select('*');
      const { data: orders } = await supabase.from('orders').select('*');
      const { data: clients } = await supabase.from('clients').select('*');
      return res.status(200).json({
        success: true,
        message: 'Base de données actualisée avec succès !',
        counts: {
          products: products ? products.length : 0,
          orders: orders ? orders.length : 0,
          clients: clients ? clients.length : 0
        }
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. Gestion des endpoints API
  const apiHandlerPath = API_ROUTES[pathname];
  if (apiHandlerPath) {
    try {
      await parseBody(req);
      // Nettoyer les caches des modules locaux
      Object.keys(require.cache).forEach((key) => {
        if (key.includes('api') || key.includes('models') || key.includes('lib')) {
          delete require.cache[key];
        }
      });
      const handler = require(path.join(__dirname, apiHandlerPath));
      await handler(req, res);
      return;
    } catch (err) {
      console.error(`[API Error] ${pathname}:`, err);
      if (!res.writableEnded) {
        res.status(500).json({ error: 'Erreur interne du serveur API', details: err.message });
      }
      return;
    }
  }

  // 2. Rewrites (ex: /admin -> admin.html)
  if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin.html';
  } else if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // 3. Fichiers statiques (dossier public/)
  const filePath = path.join(PUBLIC_DIR, pathname);

  // Sécurité anti-traversée
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.status(403).end('Accès refusé');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.status(404).end('Page non trouvée (404)');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 BELROSE WALLY (BELSHOP) démarré avec succès en local !`);
  console.log(`------------------------------------------------------`);
  console.log(`🛍️  Boutique client : http://localhost:${PORT}`);
  console.log(`🔐 Espace Admin     : http://localhost:${PORT}/admin`);
  console.log(`======================================================\n`);
});
