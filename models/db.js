// models/db.js
// -----------------------------------------------------------------------------
// Connexion sécurisée à Supabase (PostgreSQL managé).
// Ce fichier ne s'exécute JAMAIS côté navigateur : il vit uniquement dans les
// Serverless Functions Vercel (dossier /api). Les clés sont lues depuis les
// Variables d'Environnement Vercel et ne sont donc jamais visibles dans le
// code source livré au client (F12 / inspecteur réseau).
// -----------------------------------------------------------------------------

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// IMPORTANT : on utilise la clé "service_role" (droits serveur complets),
// jamais la clé "anon" côté client, et jamais dans le frontend.
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  // On ne fait pas planter le build, mais on avertit clairement dans les logs Vercel.
  console.warn(
    '[models/db.js] ATTENTION : SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant(e). ' +
    'Configurez ces variables dans Vercel > Project Settings > Environment Variables.'
  );
}

// Client unique réutilisé entre les invocations "chaudes" de la fonction serverless.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

module.exports = { supabase };
