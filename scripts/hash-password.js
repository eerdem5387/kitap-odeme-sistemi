const bcrypt = require('bcryptjs');

// Kullanım: node scripts/hash-password.js "yeni-sifreniz"
const password = process.argv[2];

if (!password) {
  console.error('❌ Kullanım: node scripts/hash-password.js "yeni-sifreniz"');
  process.exit(1);
}

async function hashPassword() {
  try {
    const hashed = await bcrypt.hash(password, 12);
    console.log('\n✅ Şifre hash\'lendi!\n');
    console.log('📋 Neon Tables\'ta password alanına yapıştırın:\n');
    console.log(hashed);
    console.log('\n');
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

hashPassword();

