import argon2 from 'argon2';

// OWASP Password Storage: Argon2id con memoria >= 19 MiB, iteraciones >= 2, paralelismo 1
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(hash, plainPassword) {
  return argon2.verify(hash, plainPassword);
}
