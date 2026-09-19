// api/admin/settings.js
// -----------------------------------------------------------------------------
// GET / POST /api/admin/settings
// Gestion des paramètres de la boutique et du compte Admin.
// -----------------------------------------------------------------------------

const { verifyAdminRequest } = require('../../lib/auth');

let siteSettings = {
  storeName: 'BELROSE WALLY',
  city: 'Libreville, Gabon',
  whatsappPhone: '+24100000000',
  notifyEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@belrosewally.com',
  orderNotifications: true
};

module.exports = async function handler(req, res) {
  const admin = verifyAdminRequest(req);
  if (!admin) {
    return res.status(401).json({ error: 'Session non autorisée.' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ settings: siteSettings, adminEmail: admin.email });
  }

  if (req.method === 'POST') {
    const { storeName, city, whatsappPhone, notifyEmail, orderNotifications } = req.body || {};
    siteSettings = {
      ...siteSettings,
      storeName: storeName || siteSettings.storeName,
      city: city || siteSettings.city,
      whatsappPhone: whatsappPhone || siteSettings.whatsappPhone,
      notifyEmail: notifyEmail || siteSettings.notifyEmail,
      orderNotifications: orderNotifications !== undefined ? orderNotifications : siteSettings.orderNotifications
    };
    return res.status(200).json({ success: true, settings: siteSettings });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Méthode non autorisée.' });
};
