const ALLOWED_HOSTS = new Set(['api.github.com']);

/**
 * A01 (SSRF): Valida que cualquier petición saliente use HTTPS y un host en lista blanca,
 * bloqueando IPs privadas, loopback y metadatos cloud (169.254.169.254).
 */
export function assertSafeOutboundUrl(rawUrl, allowedHosts = ALLOWED_HOSTS) {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:') {
    throw new Error('Solo se permiten destinos HTTPS.');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    host === '::1'
  ) {
    throw new Error('Destino interno bloqueado.');
  }
  if (!allowedHosts.has(host)) {
    throw new Error('Host no autorizado en la lista blanca.');
  }
  return parsed.toString();
}
