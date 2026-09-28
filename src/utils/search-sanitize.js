const BOOLEAN_MODE_SPECIAL_CHARS = /[+\-><()~*"@]/g;

function toBooleanModeQuery(rawTerm, minTokenSize = 3) {
  if (rawTerm === undefined || rawTerm === null) {
    return '';
  }

  const cleaned = String(rawTerm)
    .trim()
    .replace(BOOLEAN_MODE_SPECIAL_CHARS, ' ');

  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minTokenSize)
    .map((token) => `${token}*`);

  return tokens.join(' ');
}

module.exports = {
  toBooleanModeQuery,
};
