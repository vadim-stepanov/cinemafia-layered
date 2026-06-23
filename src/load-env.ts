// Load the local .env into process.env before anything reads config (native, no dotenv dep).
// Falls back silently to the ambient environment (CI, container, shell).
try {
  process.loadEnvFile();
} catch {
  // No .env file present — rely on the ambient environment.
}
