const normalizeTagName = (name) => {
  if (typeof name !== 'string') {
    return '';
  }
  return name.trim().replace(/\s+/g, ' ');
};

const toTagSlug = (name) => {
  const normalized = normalizeTagName(name).toLowerCase();
  return normalized
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const dedupeTagsBySlug = (tagNames) => {
  const seen = new Set();
  const result = [];

  for (const rawName of tagNames || []) {
    const name = normalizeTagName(rawName);
    if (!name) {
      continue;
    }

    const slug = toTagSlug(name);
    if (!slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    result.push({ name, slug });
  }

  return result;
};

module.exports = {
  normalizeTagName,
  toTagSlug,
  dedupeTagsBySlug,
};
