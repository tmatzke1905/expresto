import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/** Only allow safe HMAC algs by default */
export type SupportedHmacAlg = 'HS256' | 'HS384' | 'HS512';

function algOrDefault(alg?: string): SupportedHmacAlg {
  // normalize & validate, fallback to HS512
  const up = (alg || '').toUpperCase().trim();
  if (up === 'HS256' || up === 'HS384' || up === 'HS512') return up;
  return 'HS512';
}

/**
 * Sign a JWT with an HMAC secret.
 * @param payload - arbitrary claims (will be placed in JWT payload)
 * @param secret  - HMAC secret (utf8)
 * @param algorithm - HS256|HS384|HS512 (default HS512)
 * @param expiresIn - e.g. "1h", "15m" (forwarded to jose as `setExpirationTime`)
 */
export async function signToken(
  payload: JWTPayload,
  secret: string,
  algorithm?: string,
  expiresIn?: string
): Promise<string> {
  const alg = algOrDefault(algorithm);
  const key = new TextEncoder().encode(secret);

  let jwt = new SignJWT(payload).setProtectedHeader({ alg });
  if (expiresIn) jwt = jwt.setExpirationTime(expiresIn);

  return jwt.sign(key);
}

/**
 * Verify a JWT and return its payload.
 * Throws on invalid/expired token.
 */
export async function verifyToken<T extends JWTPayload = JWTPayload>(
  token: string,
  secret: string,
  algorithm?: string
): Promise<T> {
  const alg = algOrDefault(algorithm);
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { algorithms: [alg] });
  return payload as T;
}
