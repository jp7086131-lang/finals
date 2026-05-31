const { admin, db } = require('../config/firebase');

async function resetRiderPassword() {
  const email = process.env.RIDER_EMAIL || 'rider@motobook.local';
  const password = process.env.RIDER_PASSWORD;
  const name = process.env.RIDER_NAME || 'MotoBook Rider';

  if (!password) {
    throw new Error('RIDER_PASSWORD is missing in .env');
  }

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, {
      password,
      displayName: name,
      disabled: false,
      emailVerified: true,
    });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });
  }

  await db.collection('users').doc(userRecord.uid).set(
    {
      email,
      name,
      role: 'rider',
      isActive: true,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'rider' });

  console.log(`Rider password reset for ${email}`);
}

resetRiderPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`Failed to reset rider password: ${error.message}`);
    process.exit(1);
  });
