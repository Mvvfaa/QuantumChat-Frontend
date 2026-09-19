import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterImportantEntries,
  normalizeImportantEntries,
} from '../src/utils/importantMessages.js';

test('normalizeImportantEntries deduplicates identical message ids and merges labels', () => {
  const rows = [
    {
      id: 'm-1',
      conversationId: 'u-2',
      title: 'Alice',
      type: 'dm',
      text: 'hello',
      from: 'u-1',
      createdAt: '2025-01-01T00:00:00.000Z',
      starredAt: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'm-1',
      conversationId: 'u-2',
      title: 'Alice',
      type: 'dm',
      text: 'hello',
      from: 'u-1',
      createdAt: '2025-01-01T00:00:00.000Z',
      important: true,
      importantAt: '2025-01-01T00:00:00.000Z',
    },
  ];

  const normalized = normalizeImportantEntries(rows);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].isStarred, true);
  assert.equal(normalized[0].isImportant, true);
  assert.deepEqual(normalized[0].reasons, ['Starred', 'Important']);
});

test('filterImportantEntries supports all, starred, and important filters with text search', () => {
  const rows = [
    {
      id: 'm-1',
      title: 'Alice',
      text: 'Team standup notes',
      from: 'u-1',
      starredAt: '2025-01-01T00:00:00.000Z',
      isStarred: true,
    },
    {
      id: 'm-2',
      title: 'Design group',
      text: 'Roadmap reminder',
      from: 'u-2',
      important: true,
      isImportant: true,
    },
  ];

  const all = filterImportantEntries(rows, 'all', 'roadmap');
  assert.equal(all.length, 1);
  assert.equal(all[0].id, 'm-2');

  const onlyStarred = filterImportantEntries(rows, 'starred', '');
  assert.equal(onlyStarred.length, 1);
  assert.equal(onlyStarred[0].id, 'm-1');

  const onlyImportant = filterImportantEntries(rows, 'important', '');
  assert.equal(onlyImportant.length, 1);
  assert.equal(onlyImportant[0].id, 'm-2');
});
