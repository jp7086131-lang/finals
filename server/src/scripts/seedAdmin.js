const { admin, db } = require('../config/firebase');

function requiredSeedPassword(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required for seeding. Set it in .env with a strong unique password.`);
  }
  return value;
}

async function upsertUser({ name, email, password, role }) {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).limit(1).get();

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0];
    const uid = existingDoc.id;

    try {
      await admin.auth().updateUser(uid, {
        email,
        password,
        displayName: name,
        disabled: false,
        emailVerified: true,
      });
      console.log(`${role} already exists: ${email} (Auth password updated)`);
    } catch (err) {
      await admin.auth().createUser({
        uid,
        email,
        password,
        displayName: name,
        emailVerified: true,
      });
      console.log(`${role} re-created in Auth: ${email} (UID: ${uid})`);
    }

    await existingDoc.ref.update({
      name,
      email,
      role,
      isActive: true,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await admin.auth().setCustomUserClaims(uid, { role });
    return;
  }

  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name,
    emailVerified: true,
  });

  const uid = userRecord.uid;

  await db.collection('users').doc(uid).set({
    uid,
    name,
    email,
    phone: '',
    address: '',
    role,
    isActive: true,
    lastLoginAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await admin.auth().setCustomUserClaims(uid, { role });

  console.log(`${role} created: ${email} (UID: ${uid})`);
}

async function seedAdmin() {
  console.log('Seeding users...\n');

  const users = [
    {
      name: process.env.ADMIN_NAME || 'MotoBook Admin',
      email: process.env.ADMIN_EMAIL || 'admin@motobook.local',
      password: requiredSeedPassword('ADMIN_PASSWORD'),
      role: 'admin',
    },
    {
      name: process.env.RIDER_NAME || 'MotoBook Rider',
      email: process.env.RIDER_EMAIL || 'rider@motobook.local',
      password: requiredSeedPassword('RIDER_PASSWORD'),
      role: 'rider',
    },
    {
      name: process.env.CUSTOMER_NAME || 'Juan Customer',
      email: process.env.CUSTOMER_EMAIL || 'juan@example.com',
      password: requiredSeedPassword('CUSTOMER_PASSWORD'),
      role: 'customer',
    },
  ];

  for (const user of users) {
    try {
      await upsertUser(user);
    } catch (error) {
      console.error(`Failed to seed ${user.role} (${user.email}):`, error.message);
    }
  }

  console.log('\nSeeding complete!');
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
