import * as profileService from '../services/profileService.js';

export async function getProfile(req, res, next) {
  try {
    const reveal = req.query.reveal === 'true';
    const profile = await profileService.getProfile({
      userId: req.user.id,
      reveal,
    });
    return res.status(200).json(profile);
  } catch (err) {
    return next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const result = await profileService.updateProfile({
      userId: req.user.id,
      name,
      phone,
    });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
