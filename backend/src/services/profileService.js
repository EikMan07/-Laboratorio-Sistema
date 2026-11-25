import { Usuario } from '../models/index.js';
import { encryptText, decryptText, maskSensitiveValue } from '../utils/crypto.js';
import { NotFoundError } from '../utils/errors.js';

export async function getProfile({ userId, reveal = false }) {
  const user = await Usuario.findByPk(userId, {
    attributes: ['id', 'email', 'name_enc', 'phone_enc', 'role'],
  });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado.');
  }

  const phonePlain = user.phone_enc ? decryptText(user.phone_enc) : '';

  return {
    id: user.id,
    email: user.email,
    name: decryptText(user.name_enc),
    role: user.role,
    phoneMasked: maskSensitiveValue(phonePlain),
    ...(reveal ? { phone: phonePlain } : {}),
  };
}

export async function updateProfile({ userId, name, phone }) {
  const user = await Usuario.findByPk(userId, { attributes: ['id'] });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado.');
  }

  const updates = { phone_enc: encryptText(phone) };
  if (name) {
    updates.name_enc = encryptText(name);
  }

  await user.update(updates);

  return {
    message: 'Perfil actualizado.',
    phoneMasked: maskSensitiveValue(phone),
  };
}
