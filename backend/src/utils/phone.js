const COUNTRY_CODE = '505';

/**
 * Normaliza un teléfono al formato internacional de Nicaragua (505XXXXXXXX).
 * Acepta entradas como "8888-7777", "+505 8888 7777" o "50588887777".
 * @param {string|number} value
 * @returns {string} teléfono normalizado o cadena vacía si no hay dígitos
 */
export const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.length === 8) {
    return `${COUNTRY_CODE}${digits}`;
  }

  if (digits.startsWith(COUNTRY_CODE)) {
    return digits;
  }

  return `${COUNTRY_CODE}${digits}`;
};

/**
 * Valida que un teléfono ya normalizado tenga el formato 505 + 8 dígitos.
 * @param {string} value
 * @returns {boolean}
 */
export const isValidPhone = (value) => /^505\d{8}$/.test(String(value ?? ''));
