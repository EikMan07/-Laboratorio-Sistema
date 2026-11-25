import * as adminService from '../services/adminService.js';

export async function listUsers(_req, res, next) {
  try {
    const users = await adminService.listUsers();
    return res.status(200).json({ users });
  } catch (err) {
    return next(err);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const user = await adminService.updateUserRole({
      targetUserId: req.params.id,
      role: req.body.role,
      actorUserId: req.user.id,
      ipAddress: req.ip,
    });
    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
}

export async function listAuditLogs(_req, res, next) {
  try {
    const events = await adminService.listAuditLogs();
    return res.status(200).json({ events });
  } catch (err) {
    return next(err);
  }
}
