const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF\u00A0]/g;

export function cleanText(value: unknown, maxLen = 300): string {
  if (typeof value !== 'string') return '';
  return value.replace(ZERO_WIDTH_REGEX, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export function normalizeThaiPhone(input: unknown): string | null {
  const cleaned = cleanText(input, 60);
  if (!cleaned) return null;

  let digits = cleaned.replace(/\D/g, '');
  if (!digits) return null;

  if (/^0066\d{8,9}$/.test(digits)) {
    digits = `0${digits.slice(4)}`;
  } else if (/^66\d{8,9}$/.test(digits)) {
    digits = `0${digits.slice(2)}`;
  } else if (/^066\d{8,9}$/.test(digits)) {
    digits = `0${digits.slice(3)}`;
  }

  if (!/^0\d{8,9}$/.test(digits) || /^0+$/.test(digits)) {
    return null;
  }

  return digits;
}

export function formatThaiPhoneDisplay(normalized: string): string {
  if (/^0\d{9}$/.test(normalized)) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  if (/^02\d{7}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
  }
  if (/^0\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return normalized;
}

export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}
