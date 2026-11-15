import UserAvatar from './UserAvatar.jsx';

/**
 * TypingIndicator — WhatsApp-style three-dots bubble for DMs,
 * and bouncing dots + name(s) + avatar stack for group chats.
 */
function TypingIndicator({ isTyping, username, usernames = [], isGroup = false }) {
  if (!isTyping && usernames.length === 0) return null;

  // Direct Message (1-to-1): animated three-dots bubble without username or text
  if (!isGroup) {
    return (
      <div
        className="typing-bubble-dm"
        role="status"
        aria-label="typing"
      >
        <span className="typing-dots" aria-hidden="true">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      </div>
    );
  }

  // Group chat: existing name-based indicator with multi-user handling
  const activeUsers = usernames.filter(Boolean);
  const names = activeUsers.map((user) =>
    typeof user === "string" ? user : user.username,
  ).filter(Boolean);
  const label = names.length
    ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} typing`
    : username
      ? `${username} is typing`
      : "Someone is typing";

  if (!isTyping && names.length === 0) return null;

  let text = 'Someone is typing';
  let avatars = null;

  if (activeUsers.length > 0) {
    if (activeUsers.length === 1) {
      text = `${names[0]} is typing`;
    } else if (activeUsers.length === 2) {
      text = `${names[0]} and ${names[1]} are typing`;
    } else {
      text = `${names[0]}, ${names[1]} and ${activeUsers.length - 2} others are typing`;
    }

    const shown = activeUsers.slice(0, 3);
    avatars = (
      <div className="typing-avatar-stack">
        {shown.map((u, i) => (
          <UserAvatar
            key={u.id}
            userId={u.id}
            name={u.username}
            hasAvatar={u.hasAvatar}
            size="sm"
            stackIndex={i}
            stackTotal={shown.length}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="typing-indicator"
      role="status"
      aria-label={label}
    >
      {avatars}
      {names.length ? (
        <span className="typing-indicator-text">{label}</span>
      ) : username ? (
        <span className="typing-indicator-text">{username} is typing</span>
      ) : null}
      <span className="typing-dots" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
    </div>
  );
}

export default TypingIndicator;
