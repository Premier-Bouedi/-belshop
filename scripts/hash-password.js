// scripts/hash-password.js
// -----------------------------------------------------------------------------
// Utilitaire local (jamais déployé publiquement) pour générer le hash bcrypt
// à placer dans la variable d'environnement ADMIN_PASSWORD_HASH sur Vercel.
//
// Utilisation :
//   node scripts/hash-password.js "MonMotDePasseSuperSecret"
// -----------------------------------------------------------------------------

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage : node scripts/hash-password.js "VotreMotDePasse"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nAjoutez ceci dans vos variables d\'environnement Vercel :\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
