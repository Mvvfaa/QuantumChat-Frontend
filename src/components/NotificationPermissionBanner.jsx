import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  enablePushNotifications,
  getNotificationPermission,
  isPushSubscribed,
} from '../utils/pushNotifications.js';
import { unlockAudio } from '../utils/sounds.js';
import './NotificationPermissionBanner.css';

/**
 * Soft prompt so users can enable OS notifications (with sound) when using other apps.
 * Shows when permission is missing, or when permission is granted but push subscribe failed.
 */
export default function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('permission'); // permission | push

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (sessionStorage.getItem('qc-notif-banner-dismissed') === '1') return;

      const permission = getNotificationPermission();
      if (permission === 'default') {
        if (!cancelled) {
          setMode('permission');
          setVisible(true);
        }
        return;
      }
      if (permission === 'granted') {
        const subscribed = await isPushSubscribed();
        if (!cancelled && !subscribed) {
          setMode('push');
          setVisible(true);
        }
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  async function enable() {
    setBusy(true);
    setError('');
    unlockAudio();
    const res = await enablePushNotifications();
    setBusy(false);
    if (res.ok && res.permission === 'granted' && (res.push || mode === 'permission')) {
      if (res.push) {
        setVisible(false);
        return;
      }
      // Permission ok but push still missing — keep banner in push mode.
      setMode('push');
      setError(
        res.error ||
          'Desktop alerts need a push subscription. Click Enable again, or check browser site settings.',
      );
      return;
    }
    if (res.permission === 'denied') {
      setError(res.error || 'Blocked by the browser. Allow notifications in site settings.');
      return;
    }
    setError(res.error || 'Could not enable notifications');
  }

  function dismiss() {
    sessionStorage.setItem('qc-notif-banner-dismissed', '1');
    setVisible(false);
  }

  return (
    <div className="notif-perm-banner" role="status">
      <div className="notif-perm-banner-icon" aria-hidden="true">
        <Bell size={18} strokeWidth={2} />
      </div>
      <div className="notif-perm-banner-copy">
        <strong>
          {mode === 'push' ? 'Turn on desktop alerts' : 'Get message pop-ups'}
        </strong>
        <span>
          {mode === 'push'
            ? 'Allow QuantumChat to alert you when you’re in another app (like Cursor).'
            : 'See a Windows notification when someone messages you, even if this tab is in the background.'}
        </span>
        {error ? <span className="notif-perm-banner-error">{error}</span> : null}
      </div>
      <div className="notif-perm-banner-actions">
        <button type="button" className="notif-perm-btn primary" onClick={enable} disabled={busy}>
          {busy ? 'Enabling…' : 'Enable'}
        </button>
        <button
          type="button"
          className="notif-perm-btn ghost"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
