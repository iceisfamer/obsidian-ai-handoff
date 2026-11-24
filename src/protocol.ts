/** Narrow untrusted CLI JSON before using it as application state. */
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
export function requiredId(value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error('客户端未返回有效会话标识，请更新客户端后重试。');
  return value;
}
