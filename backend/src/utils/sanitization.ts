import sanitizeHtml from 'sanitize-html';

export function sanitizeInput(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // First sanitize HTML to prevent XSS
  let sanitized = sanitizeHtml(input, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
  });

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove any remaining dangerous characters
  sanitized = sanitized.replace(/[<>\"']/g, '');

  return sanitized;
}

export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const sanitized = sanitizeInput(username, 20);
  
  // Must be at least 2 characters after sanitization
  if (sanitized.length < 2) {
    return false;
  }

  // Must contain at least one alphanumeric character
  if (!/[a-zA-Z0-9]/.test(sanitized)) {
    return false;
  }

  return true;
}

export function validateLobbyName(lobbyName: string): boolean {
  if (!lobbyName || typeof lobbyName !== 'string') {
    return false;
  }

  const sanitized = sanitizeInput(lobbyName, 30);
  
  // Must be at least 3 characters after sanitization
  if (sanitized.length < 3) {
    return false;
  }

  return true;
}