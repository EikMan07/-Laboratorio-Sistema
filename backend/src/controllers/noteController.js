import * as noteService from '../services/noteService.js';

export async function listNotes(req, res, next) {
  try {
    const notes = await noteService.listNotes(req.user.id);
    return res.status(200).json({ notes });
  } catch (err) {
    return next(err);
  }
}

export async function getNoteById(req, res, next) {
  try {
    const note = await noteService.getNoteById({
      noteId: req.params.id,
      ownerId: req.user.id,
      ipAddress: req.ip,
    });
    return res.status(200).json({ note });
  } catch (err) {
    return next(err);
  }
}

export async function createNote(req, res, next) {
  try {
    const { title, content } = req.body;
    const note = await noteService.createNote({
      ownerId: req.user.id,
      title,
      content,
    });
    return res.status(201).json({ note });
  } catch (err) {
    return next(err);
  }
}

export async function updateNote(req, res, next) {
  try {
    const { title, content } = req.body;
    const note = await noteService.updateNote({
      noteId: req.params.id,
      ownerId: req.user.id,
      title,
      content,
    });
    return res.status(200).json({ note });
  } catch (err) {
    return next(err);
  }
}

export async function deleteNote(req, res, next) {
  try {
    await noteService.deleteNote({
      noteId: req.params.id,
      ownerId: req.user.id,
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}
