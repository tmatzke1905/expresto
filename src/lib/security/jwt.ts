import { SignJWT, jwtVerify, JWTPayload, JWK } from 'jose';

/**
 * Generates a signed JWT using the given payload and secret.
 */
export async function signToken(
  payload: JWTPayload,
  secret: string,
  algorithm: string = 'HS512',
  options: { expiresIn?: string } = {}
): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: algorithm, typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(options.expiresIn || '1h');

  return await jwt.sign(key);
}

/**
 * Verifies a JWT and returns the decoded payload.
 */
export async function verifyToken(
  token: string,
  secret: string,
  algorithm: string = 'HS512'
): Promise<JWTPayload> {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  const { payload } = await jwtVerify(token, key, {
    algorithms: [algorithm],
  });

  return payload;
}
