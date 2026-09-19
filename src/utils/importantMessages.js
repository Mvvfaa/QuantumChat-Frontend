export function normalizeImportantEntries(entries = []) {
  const byId = new Map();

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry) continue;
    const id = entry.id ?? entry._id;
    if (id == null) continue;

    const key = String(id);
    const current = byId.get(key) || {
      ...entry,
      id: key,
      isStarred: false,
      isImportant: false,
      reasons: [],
    };

    const next = {
      ...current,
      ...entry,
      id: key,
      isStarred: Boolean(current.isStarred || entry.isStarred || entry.starredAt || entry.starred),
      isImportant: Boolean(current.isImportant || entry.isImportant || entry.important || entry.importantAt),
    };

    next.reasons = [];
    if (next.isStarred) next.reasons.push('Starred');
    if (next.isImportant) next.reasons.push('Important');
    byId.set(key, next);
  }

  return [...byId.values()].sort((a, b) => {
    const at = new Date(a.createdAt || a.starredAt || a.importantAt || 0).getTime();
    const bt = new Date(b.createdAt || b.starredAt || b.importantAt || 0).getTime();
    return bt - at;
  });
}

export function filterImportantEntries(entries = [], filter = 'all', query = '') {
  const normal = normalizeImportantEntries(entries);
  const normalizedQuery = String(query || '').trim().toLowerCase();

  const filtered = normal.filter((entry) => {
    if (filter === 'starred' && !entry.isStarred) return false;
    if (filter === 'important' && !entry.isImportant) return false;
    if (!normalizedQuery) return true;

    const haystacks = [
      entry.text,
      entry.title,
      entry.conversationTitle,
      entry.conversationName,
      entry.senderName,
      entry.from,
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    return haystacks.some((value) => value.includes(normalizedQuery));
  });

  return filtered;
}
