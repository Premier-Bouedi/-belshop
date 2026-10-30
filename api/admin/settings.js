// api/admin/settings.js
// -----------------------------------------------------------------------------
// GET /api/settings ou GET /api/admin/settings : Récupérer les paramètres du site (public/admin)
// POST /api/admin/settings : Mettre à jour les paramètres et la photo/bannière du site (admin)
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { verifyAdminRequest } = require('../../lib/auth');

const DB_FILE = path.join(__dirname, '../../data/db.json');
const ASSETS_DIR = path.join(__dirname, '../../public/assets');

const DEFAULT_SETTINGS = {
  storeName: 'BELROSE WALLY',
  city: 'Libreville, Gabon',
  whatsappPhone: '+241 77 00 11 22',
  notifyEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@belrosewally.com',
  orderNotifications: true,
  bannerUrl: 'assets/BARNNIERED.PNG',
  primaryColor: '#ff6469',
  secondaryColor: '#f472b6',
  activeCategories: ['caps', 'sacs', 'parfums', 'chaînette & bijoux']
};

function getSettings() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (data && data.settings) {
        return { ...DEFAULT_SETTINGS, ...data.settings };
      }
    }
  } catch (err) {
    console.warn('[settings] Erreur lecture settings :', err.message);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsToDb(settings) {
  try {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    let db = {};
    if (fs.existsSync(DB_FILE)) {
      try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      } catch (_) {
        db = {};
      }
    }
    db.settings = settings;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[settings] Erreur écriture db.json :', err.message);
  }
}

module.exports = async function handler(req, res) {
  // GET : Accès public ou admin pour charger les paramètres de la boutique
  if (req.method === 'GET') {
    const admin = verifyAdminRequest(req);
    const settings = getSettings();
    return res.status(200).json({
      success: true,
      settings,
      adminEmail: admin ? admin.email : undefined
    });
  }

  // POST : Nécessite l'authentification admin
  const admin = verifyAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Session non autorisée. Veuillez vous reconnecter.' });
  }

  if (req.method === 'POST') {
    try {
      const current = getSettings();
      const {
        storeName,
        city,
        whatsappPhone,
        notifyEmail,
        orderNotifications,
        bannerUrl,
        bannerBase64,
        primaryColor,
        secondaryColor
      } = req.body || {};

      let finalBannerUrl = bannerUrl || current.bannerUrl;

      // Traitement et sauvegarde du fichier image si envoyé en base64
      if (bannerBase64 && typeof bannerBase64 === 'string') {
        const matches = bannerBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
          const buffer = Buffer.from(matches[2], 'base64');
          if (!fs.existsSync(ASSETS_DIR)) {
            fs.mkdirSync(ASSETS_DIR, { recursive: true });
          }
          const filename = `site-banner.${ext}`;
          const dest = path.join(ASSETS_DIR, filename);
          fs.writeFileSync(dest, buffer);
          finalBannerUrl = `assets/${filename}?v=${Date.now()}`;
          console.log(`[settings] Nouvelle photo de bannière enregistrée : ${dest}`);
        } else if (bannerBase64.startsWith('assets/') || bannerBase64.startsWith('http')) {
          finalBannerUrl = bannerBase64;
        }
      }

      const updated = {
        ...current,
        storeName: storeName !== undefined ? storeName : current.storeName,
        city: city !== undefined ? city : current.city,
        whatsappPhone: whatsappPhone !== undefined ? whatsappPhone : current.whatsappPhone,
        notifyEmail: notifyEmail !== undefined ? notifyEmail : current.notifyEmail,
        orderNotifications: orderNotifications !== undefined ? orderNotifications : current.orderNotifications,
        bannerUrl: finalBannerUrl,
        primaryColor: primaryColor || current.primaryColor || '#ff6469',
        secondaryColor: secondaryColor || current.secondaryColor || '#f472b6',
        activeCategories: req.body.activeCategories !== undefined ? req.body.activeCategories : (current.activeCategories || ['caps', 'sacs', 'parfums', 'chaînette & bijoux'])
      };

      saveSettingsToDb(updated);

      return res.status(200).json({
        success: true,
        message: 'Paramètres du site enregistrés avec succès !',
        settings: updated
      });
    } catch (err) {
      console.error('[settings-post] Erreur :', err);
      return res.status(500).json({ error: 'Erreur lors de la sauvegarde : ' + err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Méthode non autorisée.' });
};
