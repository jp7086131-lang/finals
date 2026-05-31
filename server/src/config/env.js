const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const absoluteCandidate = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);

  if (!fs.existsSync(absoluteCandidate)) {
    // Do not throw during startup; log a warning and unset the value so the
    // firebase initializer can attempt other credential methods (service
    // account env vars or application default credentials). Throwing here
    // prevents helpful diagnostics and makes local development brittle.
    // In production, prefer setting an absolute path to the service account.
    // Keep the warning visible so operators can fix their configuration.
    // eslint-disable-next-line no-console
    console.warn(`GOOGLE_APPLICATION_CREDENTIALS does not exist: ${absoluteCandidate}. Ignoring and continuing.`);
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  } else {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = absoluteCandidate;
  }
}

const hasServiceAccountEnv = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY;
const hasGoogleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const required = [];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES || 60),
  jwtSecret: process.env.JWT_SECRET || 'replace-with-a-secure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  firebase: {
    hasServiceAccountEnv,
    hasGoogleCredentials,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  },
};
