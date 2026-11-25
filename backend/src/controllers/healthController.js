// RF-08: Responder estado sin revelar versiones, motor de BD ni datos internos
export function getHealth(_req, res) {
  return res.status(200).json({ status: 'ok' });
}
