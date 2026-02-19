export function parseCSP(headerValue: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};

  if (!headerValue) {
    return directives;
  }

  const parts = headerValue.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex === -1) {
      directives[trimmed] = [];
    } else {
      const directive = trimmed.slice(0, spaceIndex);
      const values = trimmed
        .slice(spaceIndex + 1)
        .trim()
        .split(/\s+/);
      directives[directive] = values;
    }
  }

  return directives;
}
