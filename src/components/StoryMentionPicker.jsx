import { useMemo, useState } from 'react';
import UserAvatar from './UserAvatar.jsx';

export default function StoryMentionPicker({ friends, selected, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pickedIds = new Set(selected.map((s) => s.id));
    return (friends || [])
      .filter((f) => f?.id && !pickedIds.has(String(f.id)))
      .filter((f) => !q || f.username?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [friends, selected, query]);

  function addMention(f) {
    onChange([...selected, { id: String(f.id), username: f.username, hasAvatar: f.hasAvatar, visibility: 'public' }]);
    setQuery('');
  }

  function removeMention(id) {
    onChange(selected.filter((m) => m.id !== id));
  }

  function toggleVisibility(id) {
    onChange(
      selected.map((m) => (m.id === id ? { ...m, visibility: m.visibility === 'public' ? 'hidden' : 'public' } : m))
    );
  }

  return (
    <div className="story-mention-picker">
      <p className="story-mention-picker-label">Tag people</p>
      <div className="story-mention-input-row">
        <input
          type="text"
          className="story-mention-input"
          placeholder="Tag a friend…"
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && candidates.length > 0 && (
        <div className="story-mention-suggestions">
          {candidates.map((f) => (
            <button
              type="button"
              key={f.id}
              className="story-mention-suggestion"
              disabled={disabled}
              onClick={() => {
                addMention(f);
                setOpen(false);
              }}
            >
              <UserAvatar userId={f.id} name={f.username} hasAvatar={f.hasAvatar} size="sm" />
              <span>@{f.username}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && candidates.length === 0 && (
        <p className="story-mention-empty">No friends match "{query.trim()}"</p>
      )}
      {selected.length > 0 && (
        <div className="story-mention-chips">
          {selected.map((m) => (
            <span key={m.id} className={`story-mention-chip ${m.visibility}`}>
              @{m.username}
              <button
                type="button"
                className="story-mention-chip-visibility"
                disabled={disabled}
                onClick={() => toggleVisibility(m.id)}
                title={m.visibility === 'public' ? 'Visible to anyone who sees this story' : 'Only you can see this tag'}
              >
                {m.visibility === 'public' ? '👁 Public' : '🔒 Hidden'}
              </button>
              <button
                type="button"
                className="story-mention-chip-remove"
                disabled={disabled}
                onClick={() => removeMention(m.id)}
                aria-label={`Remove tag @${m.username}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
