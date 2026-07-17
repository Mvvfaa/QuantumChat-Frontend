import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import client from '../api/client.js';
import UserAvatar, { bustAvatarCache } from './UserAvatar.jsx';

function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <button type="button" className="settings-row" onClick={() => !disabled && onChange?.(!checked)} disabled={disabled}>
      <span className="settings-row-left">
        <span className="settings-row-label">{label}</span>
        {hint ? <span className="settings-row-hint">{hint}</span> : null}
      </span>
      <span className={`menu-switch ${checked ? 'on' : ''}`} aria-hidden="true">
        <span className="menu-switch-knob" />
      </span>
    </button>
  );
}

const TABS = [
  ['profile', 'Profile'],
  ['privacy', 'Privacy'],
  ['security', 'Security'],
  ['blocked', 'Blocked'],
  ['data', 'Data'],
];

export default function SettingsModal({
  user,
  onClose,
  onImportKeys,
  onGenerateKeys,
  onUserUpdated,
  onLogout,
  onExportChat,
}) {
  const { theme, toggleTheme } = useTheme();
  const closeRef = useRef(null);
  const keyInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [tab, setTab] = useState('profile');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [privacy, setPrivacy] = useState({
    lastSeen: user?.privacy?.lastSeen || 'everyone',
    online: user?.privacy?.online || 'everyone',
    readReceipts: user?.privacy?.readReceipts !== false,
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [blocked, setBlocked] = useState([]);
  const [deletePassword, setDeletePassword] = useState('');

  const isDark = theme === 'dark';
  const shownName = user?.displayName || user?.username || 'You';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (tab !== 'blocked') return;
    client
      .get('/users/me/blocked')
      .then((res) => setBlocked(res.data.data || []))
      .catch(() => setBlocked([]));
  }, [tab]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await client.post('/users/me/avatar', form);
      bustAvatarCache(user.id);
      onUserUpdated?.(data.data);
      setOk('Profile photo updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload profile photo');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setBusy(true);
    setError('');
    try {
      const { data } = await client.delete('/users/me/avatar');
      bustAvatarCache(user.id);
      onUserUpdated?.(data.data);
      setOk('Profile photo removed');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove photo');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const { data } = await client.patch('/users/me', {
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
      });
      onUserUpdated?.(data.data);
      setOk('Profile saved');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setBusy(false);
    }
  }

  async function savePrivacy() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const { data } = await client.patch('/users/me', { privacy });
      onUserUpdated?.(data.data);
      setOk('Privacy settings saved');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save privacy');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      await client.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setOk('Password updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setError('');
    setOk('');
    try {
      const { data } = await client.post('/auth/resend-verification');
      onUserUpdated?.(data.data.user);
      if (data.data.verifyUrl) {
        setOk(`Verification link: ${data.data.verifyUrl}`);
      } else {
        setOk(data.data.message || 'Verification email sent');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification');
    } finally {
      setBusy(false);
    }
  }

  async function unblock(id) {
    setBusy(true);
    try {
      const { data } = await client.delete(`/users/${id}/block`);
      onUserUpdated?.(data.data);
      setBlocked((prev) => prev.filter((u) => String(u.id) !== String(id)));
      setOk('User unblocked');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to unblock');
    } finally {
      setBusy(false);
    }
  }

  async function downloadData() {
    setBusy(true);
    setError('');
    try {
      const { data } = await client.get('/users/me/export');
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quantumchat-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setOk('Account data downloaded (ciphertext messages not included)');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download data');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!deletePassword) {
      setError('Enter your password to delete the account');
      return;
    }
    if (
      !window.confirm(
        'Permanently delete your account? Encrypted message history on the server will be removed. Local keys on this device should be backed up first.'
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await client.delete('/users/me', { data: { password: deletePassword } });
      onLogout?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setBusy(false);
    }
  }

  return (
    <div className="create-group-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-modal settings-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-modal-header">
          <div className="settings-modal-heading">
            <h2 id="settings-title">Settings</h2>
            <p>Profile, privacy, security, and data</p>
          </div>
          <button ref={closeRef} type="button" className="settings-close" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <nav className="settings-tabs" aria-label="Settings sections">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`settings-tab ${tab === id ? 'active' : ''}`}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id);
                setError('');
                setOk('');
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="settings-body">
          {error && <div className="auth-error">{error}</div>}
          {ok && <div className="settings-ok">{ok}</div>}

          {tab === 'profile' && (
            <section className="settings-section">
              <div className="settings-identity">
                <div className="settings-avatar-stack">
                  <UserAvatar
                    userId={user?.id}
                    name={shownName}
                    hasAvatar={user?.hasAvatar}
                    size="lg"
                  />
                  <button
                    type="button"
                    className="settings-avatar-edit"
                    disabled={avatarBusy}
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label="Change profile photo"
                  >
                    {avatarBusy ? '…' : '✎'}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                </div>
                <div className="settings-account-meta">
                  <span className="settings-account-name">{shownName}</span>
                  <span className="settings-account-email">{user?.email}</span>
                  <div className="settings-status-row">
                    {user?.emailVerified ? (
                      <span className="settings-badge settings-badge-ok">Verified</span>
                    ) : (
                      <span className="settings-badge settings-badge-warn">Unverified email</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="settings-photo-actions">
                <button
                  type="button"
                  className="settings-btn ghost"
                  disabled={avatarBusy}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarBusy ? 'Uploading…' : 'Change photo'}
                </button>
                {user?.hasAvatar && (
                  <button type="button" className="settings-btn ghost" disabled={busy} onClick={removeAvatar}>
                    Remove
                  </button>
                )}
              </div>

              {!user?.emailVerified && (
                <div className="settings-verify-banner">
                  <div>
                    <strong>Confirm your email</strong>
                    <p>Verify to unlock full account recovery and security alerts.</p>
                  </div>
                  <button type="button" className="settings-btn text" disabled={busy} onClick={resendVerification}>
                    Resend link
                  </button>
                </div>
              )}

              <div className="settings-fieldset">
                <h3 className="settings-section-title">About you</h3>
                <label className="settings-field">
                  <span>Username</span>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} autoComplete="username" />
                </label>
                <label className="settings-field">
                  <span>Display name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    placeholder="Shown to others"
                  />
                </label>
                <label className="settings-field">
                  <span>Bio</span>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} placeholder="A short line about you" />
                </label>
                <label className="settings-field">
                  <span>Phone</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={32}
                    placeholder="Private to you"
                    inputMode="tel"
                  />
                </label>
              </div>

              <button type="button" className="settings-btn primary" disabled={busy} onClick={saveProfile}>
                {busy ? 'Saving…' : 'Save profile'}
              </button>

              <div className="settings-fieldset">
                <h3 className="settings-section-title">Appearance</h3>
                <ToggleRow label="Dark theme" hint={isDark ? 'On' : 'Off'} checked={isDark} onChange={toggleTheme} />
              </div>
            </section>
          )}

          {tab === 'privacy' && (
            <section className="settings-section">
              <p className="settings-section-copy">These control what others see. Encryption keys stay on this device.</p>
              <ToggleRow
                label="Show last seen"
                hint={privacy.lastSeen === 'everyone' ? 'Everyone' : 'Nobody'}
                checked={privacy.lastSeen === 'everyone'}
                onChange={(on) => setPrivacy((p) => ({ ...p, lastSeen: on ? 'everyone' : 'nobody' }))}
              />
              <ToggleRow
                label="Show online status"
                hint={privacy.online === 'everyone' ? 'Everyone' : 'Hidden'}
                checked={privacy.online === 'everyone'}
                onChange={(on) => setPrivacy((p) => ({ ...p, online: on ? 'everyone' : 'nobody' }))}
              />
              <ToggleRow
                label="Read receipts"
                hint={privacy.readReceipts ? 'Send & see read ticks' : 'Off'}
                checked={privacy.readReceipts}
                onChange={(on) => setPrivacy((p) => ({ ...p, readReceipts: on }))}
              />
              <button type="button" className="settings-btn primary" disabled={busy} onClick={savePrivacy}>
                Save privacy
              </button>
            </section>
          )}

          {tab === 'security' && (
            <section className="settings-section">
              <div className="settings-fieldset">
                <h3 className="settings-section-title">Change password</h3>
                <label className="settings-field">
                  <span>Current password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <label className="settings-field">
                  <span>New password</span>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
                <button
                  type="button"
                  className="settings-btn primary"
                  disabled={busy || !currentPassword || newPassword.length < 8}
                  onClick={changePassword}
                >
                  Update password
                </button>
              </div>

              <div className="settings-fieldset">
                <h3 className="settings-section-title">Encryption keys</h3>
                <p className="settings-section-copy">
                  Keys stay on this device. Import a backup to recover old messages, or generate a new set if keys are gone.
                </p>
                <div className="settings-key-actions">
                  <button type="button" className="settings-btn ghost" onClick={() => keyInputRef.current?.click()}>
                    Import keys.txt
                  </button>
                  <input ref={keyInputRef} type="file" accept=".txt" hidden onChange={onImportKeys} />
                  <button type="button" className="settings-btn primary" onClick={onGenerateKeys}>
                    Generate new keys
                  </button>
                </div>
              </div>
            </section>
          )}

          {tab === 'blocked' && (
            <section className="settings-section">
              {blocked.length === 0 ? (
                <p className="settings-section-copy">No blocked users.</p>
              ) : (
                <ul className="group-member-list">
                  {blocked.map((u) => (
                    <li key={u.id}>
                      <div>
                        <strong>{u.displayName || u.username}</strong>
                        <span className="group-member-meta">@{u.username}</span>
                      </div>
                      <button type="button" className="settings-btn ghost" disabled={busy} onClick={() => unblock(u.id)}>
                        Unblock
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'data' && (
            <section className="settings-section">
              <p className="settings-section-copy">
                Download account metadata, or export the open conversation decrypted on this device.
              </p>
              <button type="button" className="settings-btn ghost" disabled={busy} onClick={downloadData}>
                Download my data (JSON)
              </button>
              <button type="button" className="settings-btn ghost" disabled={busy || !onExportChat} onClick={() => onExportChat?.()}>
                Export current chat
              </button>

              <div className="settings-danger-zone">
                <h3 className="settings-section-title">Danger zone</h3>
                <p className="settings-section-copy">This permanently removes your account from the server.</p>
                <label className="settings-field">
                  <span>Password to confirm</span>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <button type="button" className="settings-btn danger" disabled={busy} onClick={deleteAccount}>
                  Delete account
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
