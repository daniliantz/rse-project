const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /ghp_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g
];

export function maskSecrets(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, "[REDACTED_SECRET]");
  }
  return output;
}

export function hasSecretLikeContent(input: string): boolean {
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}
