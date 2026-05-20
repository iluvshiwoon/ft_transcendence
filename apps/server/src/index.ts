// Point d'entrée du serveur : construit l'app et la met en écoute sur le port 3000.
//
// Étape critique : on charge les secrets depuis Vault AVANT d'importer le reste de l'app.
// Sinon les modules (jwt.ts, db/client.ts) liraient process.env trop tôt.

import { loadFromVault } from "./config/vault.js";

await loadFromVault();

// Dynamic import : exécuté APRÈS loadFromVault, donc process.env est déjà rempli.
const { buildServer } = await import("./server.js");

const app = await buildServer();

const PORT = 3000;
const HOST = "0.0.0.0";

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`Server listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
