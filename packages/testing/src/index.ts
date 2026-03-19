export function buildCorrelationId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

