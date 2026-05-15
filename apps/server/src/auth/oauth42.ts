// Helpers pour le flow OAuth 42.
// 3 fonctions qui parlent à l'API de l'intra 42 :
//   - getAuthorizationUrl() : URL où on redirige le user pour qu'il se logue sur 42
//   - exchangeCode(code)    : échange le code reçu en callback contre un access_token
//   - getUserInfo(token)    : récupère les infos publiques du user (id, login, email, image)

const CLIENT_ID = process.env.OAUTH42_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH42_CLIENT_SECRET;
const REDIRECT_URI = process.env.OAUTH42_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  throw new Error("Missing OAuth 42 env vars");
}

const AUTHORIZE_URL = "https://api.intra.42.fr/oauth/authorize";
const TOKEN_URL = "https://api.intra.42.fr/oauth/token";
const USER_INFO_URL = "https://api.intra.42.fr/v2/me";

export interface OAuth42User {
  id: number;
  login: string;
  email: string;
  image: { link: string };
}

// Construit l'URL où on redirige le user pour qu'il se logue sur 42.
export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI!,
    response_type: "code",
    scope: "public",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

// Échange le code reçu en callback contre un access_token.
export async function exchangeCode(code: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// Récupère les infos du user authentifié avec l'access_token.
export async function getUserInfo(accessToken: string): Promise<OAuth42User> {
  const response = await fetch(USER_INFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch 42 user info: ${response.status}`);
  }

  return (await response.json()) as OAuth42User;
}
