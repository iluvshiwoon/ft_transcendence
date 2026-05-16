// Point d'entrée du serveur : construit l'app et la met en écoute sur le port 3000.

import { buildServer } from "./server.js";

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
