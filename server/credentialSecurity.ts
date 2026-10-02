import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const HASH_PREFIX = 'scrypt';
const HASH_VERSION = '1';
const SALT_BYTES = 16;
const KEY_BYTES = 64;

function normalizeSecret(
  value: string | null | undefined
): string {
  return String(value ?? '');
}

export function isHashedCredential(
  value: string | null | undefined
): boolean {
  const credential = normalizeSecret(value);

  return credential.startsWith(
    `${HASH_PREFIX}$${HASH_VERSION}$`
  );
}

export function hashCredential(
  value: string
): string {
  const credential = normalizeSecret(value);

  if (!credential) {
    throw new Error(
      'Credential cannot be empty.'
    );
  }

  const salt = randomBytes(
    SALT_BYTES
  ).toString('hex');

  const derivedKey = scryptSync(
    credential,
    salt,
    KEY_BYTES
  ).toString('hex');

  return [
    HASH_PREFIX,
    HASH_VERSION,
    salt,
    derivedKey,
  ].join('$');
}

export function verifyCredential(
  suppliedValue: string,
  storedValue: string | null | undefined
): boolean {
  const supplied =
    normalizeSecret(suppliedValue);

  const stored =
    normalizeSecret(storedValue);

  if (!supplied || !stored) {
    return false;
  }

  if (!isHashedCredential(stored)) {
    const suppliedBuffer =
      Buffer.from(supplied);

    const storedBuffer =
      Buffer.from(stored);

    if (
      suppliedBuffer.length !==
      storedBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(
      suppliedBuffer,
      storedBuffer
    );
  }

  const parts = stored.split('$');

  if (
    parts.length !== 4 ||
    parts[0] !== HASH_PREFIX ||
    parts[1] !== HASH_VERSION
  ) {
    return false;
  }

  const salt = parts[2];
  const expectedHex = parts[3];

  if (!salt || !expectedHex) {
    return false;
  }

  let expected: Buffer;

  try {
    expected = Buffer.from(
      expectedHex,
      'hex'
    );
  } catch {
    return false;
  }

  if (
    expected.length !== KEY_BYTES
  ) {
    return false;
  }

  let actual: Buffer;

  try {
    actual = scryptSync(
      supplied,
      salt,
      KEY_BYTES
    );
  } catch {
    return false;
  }

  return timingSafeEqual(
    actual,
    expected
  );
}

export function needsCredentialUpgrade(
  storedValue: string | null | undefined
): boolean {
  const stored =
    normalizeSecret(storedValue);

  return Boolean(
    stored &&
    !isHashedCredential(stored)
  );
}
