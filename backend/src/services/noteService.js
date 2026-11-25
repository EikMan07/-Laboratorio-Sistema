import { Nota } from '../models/index.js';
import { encryptText, decryptText } from '../utils/crypto.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { recordSecurityEvent } from './auditService.js';

// A06 Insecure Design: límites de negocio explícitos
const MAX_NOTES_PER_USER = 50;

function formatNote(row) {
  return {
    id: row.id,
    title: decryptText(row.title_enc),
    content: decryptText(row.content_enc),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNotes(ownerId) {
  const rows = await Nota.findAll({
    where: { owner_id: ownerId },
    attributes: ['id', 'title_enc', 'content_enc', 'created_at', 'updated_at'],
    order: [['updated_at', 'DESC']],
  });

  return rows.map(formatNote);
}

export async function getNoteById({ noteId, ownerId, ipAddress }) {
  // A01 Broken Access Control: verificación estricta de propiedad (evita IDOR)
  const row = await Nota.findOne({
    where: { id: noteId, owner_id: ownerId },
    attributes: ['id', 'title_enc', 'content_enc', 'created_at', 'updated_at'],
  });

  if (!row) {
    await recordSecurityEvent({
      eventType: 'NOTE_ACCESS_DENIED',
      userId: ownerId,
      ipAddress,
      details: { noteId },
    });
    throw new NotFoundError('Nota no encontrada.');
  }

  return formatNote(row);
}

export async function createNote({ ownerId, title, content }) {
  const total = await Nota.count({ where: { owner_id: ownerId } });
  if (total >= MAX_NOTES_PER_USER) {
    throw new BadRequestError(
      `Has alcanzado el límite máximo de ${MAX_NOTES_PER_USER} notas privadas.`
    );
  }

  const row = await Nota.create({
    owner_id: ownerId,
    title_enc: encryptText(title),
    content_enc: encryptText(content),
  });

  return {
    id: row.id,
    title,
    content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateNote({ noteId, ownerId, title, content }) {
  const row = await Nota.findOne({
    where: { id: noteId, owner_id: ownerId },
  });

  if (!row) {
    throw new NotFoundError('Nota no encontrada.');
  }

  await row.update({
    title_enc: encryptText(title),
    content_enc: encryptText(content),
  });

  return {
    id: row.id,
    title,
    content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteNote({ noteId, ownerId }) {
  const row = await Nota.findOne({
    where: { id: noteId, owner_id: ownerId },
    attributes: ['id'],
  });

  if (!row) {
    throw new NotFoundError('Nota no encontrada.');
  }

  // paranoid: true -> borrado lógico (establece deleted_at preservando historial)
  await row.destroy();
}
