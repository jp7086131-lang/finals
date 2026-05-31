const { admin, db } = require('../config/firebase');

async function resetAdminPassword() {
  const email = process.env.ADMIN_EMAIL || 'admin@motobook.local';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD is missing in .env');
  }

  const userRecord = await admin.auth().getUserByEmail(email);

  await admin.auth().updateUser(userRecord.uid, {
    password,
    disabled: false,
    emailVerified: true,
  });

  await db.collection('users').doc(userRecord.uid).set(
    {
      email,
      name: process.env.ADMIN_NAME || userRecord.displayName || 'MotoBook Admin',
      role: 'admin',
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

  console.log(`Admin password reset for ${email}`);
}

resetAdminPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`Failed to reset admin password: ${error.message}`);
    process.exit(1);
  });
