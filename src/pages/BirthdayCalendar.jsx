import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Cake,
  ArrowLeft,
  Search,
  Sparkles,
  Users,
  Plus,
  Shield,
  X,
  Check,
  Lock,
  Globe,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client.js';
import {
  normalizeFriendBirthdays,
  formatBirthdayCountdown,
  formatBirthdayDate
} from '../utils/birthdayUtils';
import '../styles/birthdayCalendar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BirthdayCalendar() {
  const navigate = useNavigate();
  const { user, updateSessionUser, refreshUserFromServer } = useAuth();
  const today = useMemo(() => new Date(), []);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [searchQuery, setSearchQuery] = useState('');

  // Birthday & Privacy Modal state
  const [showModal, setShowModal] = useState(false);
  const [dob, setDob] = useState('');
  const [visibility, setVisibility] = useState('friends');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Sync state with current user
  useEffect(() => {
    if (user?.dateOfBirth) {
      try {
        const d = new Date(user.dateOfBirth);
        if (!isNaN(d.getTime())) {
          setDob(d.toISOString().split('T')[0]);
        }
      } catch (e) {
        // fallback
      }
    } else {
      setDob('');
    }

    const currentVis =
      user?.privacy?.birthdayVisibility ||
      user?.privacySettings?.birthdayVisibility ||
      'friends';
    setVisibility(currentVis);
  }, [user]);

  // Fetch friends list and normalize birthdays with strict privacy enforcement
  useEffect(() => {
    let isMounted = true;
    const fetchFriends = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await client.get('/users/friends');
        if (isMounted) {
          const rawFriends = Array.isArray(res.data)
            ? res.data
            : res.data?.friends || [];
          const normalized = normalizeFriendBirthdays(rawFriends, today);
          setFriends(normalized);
        }
      } catch (err) {
        console.error('Failed to load friends birthdays:', err);
        if (isMounted) {
          setError('Could not load birthdays. Please try again.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFriends();
    return () => {
      isMounted = false;
    };
  }, [today]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleTodayClick = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const handleSaveBirthday = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Update Date of Birth on user profile
      const userRes = await client.patch('/users/me', {
        dateOfBirth: dob ? new Date(dob).toISOString() : ''
      });

      // 2. Update Birthday Visibility Privacy: 'everyone' | 'friends' | 'onlyMe'
      const privRes = await client.patch('/users/me/privacy', {
        birthdayVisibility: visibility
      });

      if (userRes.data?.user) {
        updateSessionUser(userRes.data.user);
      } else if (userRes.data) {
        updateSessionUser(userRes.data);
      } else if (refreshUserFromServer) {
        await refreshUserFromServer();
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowModal(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to save birthday & privacy settings:', err);
      setSaveError(
        err.response?.data?.error || err.message || 'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  };

  // Group birthdays by month & day (1-indexed month, day)
  const birthdaysMap = useMemo(() => {
    const map = new Map();
    friends.forEach((friend) => {
      const key = `${friend.birthMonth}-${friend.birthDay}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(friend);
    });
    return map;
  }, [friends]);

  // Categorize birthdays into Today, This Week, and Later
  const categorizedUpcoming = useMemo(() => {
    const list = [...friends].sort((a, b) => a.daysRemaining - b.daysRemaining);

    const filtered = searchQuery.trim()
      ? list.filter((f) =>
          (f.name || f.username || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      : list;

    const todayList = [];
    const thisWeekList = [];
    const laterList = [];

    filtered.forEach((friend) => {
      if (friend.daysRemaining === 0) {
        todayList.push(friend);
      } else if (friend.daysRemaining > 0 && friend.daysRemaining <= 7) {
        thisWeekList.push(friend);
      } else {
        laterList.push(friend);
      }
    });

    return { todayList, thisWeekList, laterList, total: filtered.length };
  }, [friends, searchQuery]);

  // Calendar matrix calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const selectedKey = `${currentMonth + 1}-${selectedDay}`;
  const selectedDateFriends = birthdaysMap.get(selectedKey) || [];

  return (
    <div className="birthday-page">
      {/* Background Doodles */}
      <div className="bg-doodle bg-doodle-1"></div>
      <div className="bg-doodle bg-doodle-2"></div>
      <div className="bg-doodle bg-doodle-3"></div>
      <div className="bg-doodle bg-doodle-4"></div>
      <div className="bg-doodle bg-doodle-5"></div>
      <div className="bg-doodle bg-doodle-6"></div>
      <div className="bg-doodle bg-doodle-7"></div>
      <div className="bg-doodle bg-doodle-8"></div>
      <div className="bg-doodle bg-doodle-9"></div>
      <div className="bg-doodle bg-doodle-10"></div>
      <div className="bg-doodle bg-doodle-11"></div>
      <div className="bg-doodle bg-doodle-12"></div>
      <div className="bg-doodle bg-doodle-13"></div>
      <div className="bg-doodle bg-doodle-14"></div>
      <div className="bg-doodle bg-doodle-15"></div>
      <div className="bg-doodle bg-doodle-16"></div>
      <div className="bg-doodle bg-doodle-17"></div>
      <div className="bg-doodle bg-doodle-18"></div>
      <div className="bg-doodle bg-doodle-19"></div>
      <div className="bg-doodle bg-doodle-20"></div>
      <div className="bg-doodle bg-doodle-21"></div>
      <div className="bg-doodle bg-doodle-22"></div>
      <div className="bg-doodle bg-doodle-23"></div>
      <div className="bg-doodle bg-doodle-24"></div>
      <div className="bg-doodle bg-doodle-25"></div>
      <div className="bg-doodle bg-doodle-26"></div>
      <div className="bg-doodle bg-doodle-27"></div>
      <div className="bg-doodle bg-doodle-28"></div>
      <div className="bg-doodle bg-doodle-29"></div>
      <div className="bg-doodle bg-doodle-30"></div>
      <div className="birthday-container">
        {/* Top Header */}
        <header className="birthday-header">
          <div className="birthday-header-left">
            <button
              type="button"
              className="birthday-back-btn"
              onClick={() => navigate('/chat')}
              title="Back to Chat"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="birthday-title-group">
              <h1 className="birthday-title">
                <Cake className="birthday-title-icon" size={26} />
                Birthday Calendar
              </h1>
              <p className="birthday-subtitle">Never miss a friend's special day</p>
            </div>
          </div>

          <div className="birthday-header-actions">
            <button
              type="button"
              className="birthday-add-btn"
              onClick={() => setShowModal(true)}
              title="Add or edit your birthday and privacy"
            >
              <Plus size={16} />
              <span>{user?.dateOfBirth ? 'My Birthday & Privacy' : 'Add Birthday'}</span>
            </button>
            <button
              type="button"
              className="birthday-today-btn"
              onClick={handleTodayClick}
            >
              <CalendarIcon size={16} />
              Today
            </button>
          </div>
        </header>

        {/* User Birthday & Privacy Status Banner */}
        <div className="birthday-user-status-banner">
          <div className="status-banner-left">
            <Cake className="status-banner-icon" size={24} />
            <div className="status-banner-text">
              <span className="status-banner-title">
                {user?.dateOfBirth
                  ? `Your Birthday: ${new Date(user.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}`
                  : 'Add your birthday so your friends can celebrate with you!'}
              </span>
              <span className="status-banner-privacy">
                Visibility:{' '}
                <strong>
                  {visibility === 'everyone'
                    ? 'Everybody (Public)'
                    : visibility === 'onlyMe'
                    ? 'Nobody / Private'
                    : 'Friends Only'}
                </strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            className="status-banner-btn"
            onClick={() => setShowModal(true)}
          >
            {user?.dateOfBirth ? 'Edit Birthday & Privacy' : '+ Add Birthday'}
          </button>
        </div>

        {/* Content Layout */}
        <div className="birthday-layout">
          {/* Main Calendar Section */}
          <section className="birthday-calendar-card">
            {/* Month & Year Navigation Bar */}
            <div className="birthday-month-bar">
              <div className="birthday-current-month-display">
                <span className="birthday-month-name">{MONTH_NAMES[currentMonth]}</span>
                <span className="birthday-year-name">{currentYear}</span>
              </div>
              <div className="birthday-nav-controls">
                <button
                  type="button"
                  className="birthday-nav-arrow"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="birthday-nav-arrow"
                  onClick={handleNextMonth}
                  title="Next Month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Weekday Header */}
            <div className="birthday-weekdays-row">
              {WEEKDAY_NAMES.map((name) => (
                <div key={name} className="birthday-weekday-label">
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="birthday-days-grid">
              {/* Previous Month Inactive Padding Days */}
              {Array.from({ length: firstDayWeekday }).map((_, idx) => {
                const dayNum = daysInPrevMonth - firstDayWeekday + idx + 1;
                return (
                  <div key={`prev-${idx}`} className="birthday-day-cell inactive">
                    <span className="birthday-day-number">{dayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Active Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isCurrentToday =
                  today.getFullYear() === currentYear &&
                  today.getMonth() === currentMonth &&
                  today.getDate() === dayNum;

                const isSelected = selectedDay === dayNum;
                const cellKey = `${currentMonth + 1}-${dayNum}`;
                const dayFriends = birthdaysMap.get(cellKey) || [];
                const hasBirthdays = dayFriends.length > 0;

                const cellClasses = ['birthday-day-cell', 'current'];
                if (isCurrentToday) cellClasses.push('is-today');
                if (isSelected) cellClasses.push('is-selected');
                if (hasBirthdays) cellClasses.push('has-birthday');

                return (
                  <div
                    key={dayNum}
                    className={cellClasses.join(' ')}
                    onClick={() => setSelectedDay(dayNum)}
                  >
                    <div className="birthday-day-top">
                      <span className="birthday-day-number">{dayNum}</span>
                      {hasBirthdays && (
                        <span className="birthday-indicator-icon" title="Birthday on this day">
                          🎂
                        </span>
                      )}
                    </div>

                    {hasBirthdays && (
                      <div className="birthday-badges-container">
                        {dayFriends.slice(0, 2).map((friend) => (
                          <div
                            key={friend._id || friend.id || friend.name}
                            className="birthday-friend-chip"
                            title={`${friend.name || friend.username}'s Birthday`}
                          >
                            <span className="birthday-chip-name">
                              {friend.name || friend.username}
                            </span>
                          </div>
                        ))}
                        {dayFriends.length > 2 && (
                          <div className="birthday-more-badge">
                            +{dayFriends.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Details Inspector */}
            <div className="birthday-selected-date-card">
              <div className="selected-date-header">
                <h3 className="selected-date-title">
                  {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
                </h3>
                {selectedDateFriends.length > 0 && (
                  <span className="selected-count-badge">
                    {selectedDateFriends.length} birthday
                    {selectedDateFriends.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {selectedDateFriends.length === 0 ? (
                <p className="selected-date-empty">No friends celebrating on this date.</p>
              ) : (
                <div className="selected-friends-list">
                  {selectedDateFriends.map((friend) => (
                    <div
                      key={friend._id || friend.id || friend.name}
                      className="selected-friend-item"
                      onClick={() => navigate(`/chat?user=${friend._id || friend.id}`)}
                    >
                      <div className="selected-friend-avatar-wrap">
                        {friend.avatar || friend.profilePic ? (
                          <img
                            src={friend.avatar || friend.profilePic}
                            alt={friend.name || friend.username}
                            className="selected-friend-avatar"
                          />
                        ) : (
                          <div className="selected-friend-avatar-fallback">
                            {(friend.name || friend.username || 'F')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="birthday-sparkle-dot">🎉</span>
                      </div>
                      <div className="selected-friend-info">
                        <div className="selected-friend-name">
                          {friend.name || friend.username}
                        </div>
                        <div className="selected-friend-countdown">
                          {formatBirthdayCountdown(friend.daysRemaining)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="selected-friend-chat-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/chat?user=${friend._id || friend.id}`);
                        }}
                      >
                        Wish Happy Birthday
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Sidebar / Upcoming List Section */}
          <aside className="birthday-upcoming-sidebar">
            <div className="upcoming-sidebar-header">
              <h2 className="upcoming-title">
                <Sparkles size={18} className="sparkle-icon" />
                Upcoming Birthdays
              </h2>
            </div>

            {/* Search Filter */}
            <div className="birthday-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="birthday-search-input"
              />
            </div>

            {loading ? (
              <div className="birthday-loading-state">
                <div className="birthday-spinner" />
                <p>Loading birthdays...</p>
              </div>
            ) : error ? (
              <div className="birthday-error-state">
                <p>{error}</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="birthday-empty-state">
                <Users size={36} className="empty-icon" />
                <h3>No Birthdays Found</h3>
                <p>
                  None of your friends have shared their birthday yet, or their privacy settings keep it private.
                </p>
              </div>
            ) : (
              <div className="upcoming-groups-container">
                {/* Today */}
                {categorizedUpcoming.todayList.length > 0 && (
                  <div className="upcoming-category-group">
                    <div className="upcoming-category-title today-highlight">
                      🎂 Today!
                    </div>
                    {categorizedUpcoming.todayList.map((friend) => (
                      <div
                        key={friend._id || friend.id || friend.name}
                        className="upcoming-card is-today"
                        onClick={() => navigate(`/chat?user=${friend._id || friend.id}`)}
                      >
                        <div className="upcoming-card-avatar">
                          {friend.avatar || friend.profilePic ? (
                            <img
                              src={friend.avatar || friend.profilePic}
                              alt={friend.name || friend.username}
                            />
                          ) : (
                            <div className="avatar-fallback">
                              {(friend.name || friend.username || 'F')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="upcoming-card-content">
                          <span className="upcoming-card-name">
                            {friend.name || friend.username}
                          </span>
                          <span className="upcoming-card-date">
                            {formatBirthdayDate(friend.nextBirthdayDate)}
                          </span>
                        </div>
                        <span className="badge-today">Today</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* This Week */}
                {categorizedUpcoming.thisWeekList.length > 0 && (
                  <div className="upcoming-category-group">
                    <div className="upcoming-category-title">⚡ This Week</div>
                    {categorizedUpcoming.thisWeekList.map((friend) => (
                      <div
                        key={friend._id || friend.id || friend.name}
                        className="upcoming-card is-this-week"
                        onClick={() => navigate(`/chat?user=${friend._id || friend.id}`)}
                      >
                        <div className="upcoming-card-avatar">
                          {friend.avatar || friend.profilePic ? (
                            <img
                              src={friend.avatar || friend.profilePic}
                              alt={friend.name || friend.username}
                            />
                          ) : (
                            <div className="avatar-fallback">
                              {(friend.name || friend.username || 'F')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="upcoming-card-content">
                          <span className="upcoming-card-name">
                            {friend.name || friend.username}
                          </span>
                          <span className="upcoming-card-date">
                            {formatBirthdayDate(friend.nextBirthdayDate)}
                          </span>
                        </div>
                        <span className="badge-countdown">
                          {formatBirthdayCountdown(friend.daysRemaining)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Later */}
                {categorizedUpcoming.laterList.length > 0 && (
                  <div className="upcoming-category-group">
                    <div className="upcoming-category-title">📅 Coming Up Later</div>
                    {categorizedUpcoming.laterList.map((friend) => (
                      <div
                        key={friend._id || friend.id || friend.name}
                        className="upcoming-card"
                        onClick={() => navigate(`/chat?user=${friend._id || friend.id}`)}
                      >
                        <div className="upcoming-card-avatar">
                          {friend.avatar || friend.profilePic ? (
                            <img
                              src={friend.avatar || friend.profilePic}
                              alt={friend.name || friend.username}
                            />
                          ) : (
                            <div className="avatar-fallback">
                              {(friend.name || friend.username || 'F')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="upcoming-card-content">
                          <span className="upcoming-card-name">
                            {friend.name || friend.username}
                          </span>
                          <span className="upcoming-card-date">
                            {formatBirthdayDate(friend.nextBirthdayDate)}
                          </span>
                        </div>
                        <span className="badge-countdown">
                          {formatBirthdayCountdown(friend.daysRemaining)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Birthday & Privacy Settings Modal */}
      {showModal && (
        <div className="birthday-modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div
            className="birthday-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="birthday-modal-header">
              <h2 className="birthday-modal-title">
                <Cake size={22} className="status-banner-icon" />
                {user?.dateOfBirth ? 'Edit Birthday & Privacy' : 'Add Birthday & Privacy'}
              </h2>
              <button
                type="button"
                className="birthday-modal-close"
                onClick={() => !saving && setShowModal(false)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBirthday} className="birthday-modal-form">
              {/* Date of Birth Input */}
              <div className="birthday-form-group">
                <label className="birthday-form-label">Date of Birth</label>
                <span className="birthday-form-helper">
                  Select your birth day, month, and year
                </span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="birthday-form-input"
                  required
                />
              </div>

              {/* Privacy Setting Selector */}
              <div className="birthday-form-group">
                <label className="birthday-form-label">
                  <Shield size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                  Who can see your birthday?
                </label>
                <span className="birthday-form-helper">
                  Control who gets birthday reminders and sees your birthday on the calendar
                </span>

                <div className="birthday-privacy-options">
                  {/* Everyone */}
                  <div
                    className={`privacy-option-card ${visibility === 'everyone' ? 'selected' : ''}`}
                    onClick={() => setVisibility('everyone')}
                  >
                    <div className="privacy-option-icon">
                      <Globe size={18} />
                    </div>
                    <div className="privacy-option-text">
                      <span className="privacy-option-title">Everybody</span>
                      <span className="privacy-option-desc">Anyone on QuantumChat can see your birthday</span>
                    </div>
                    <div className="privacy-radio-circle">
                      {visibility === 'everyone' && <div className="privacy-radio-inner" />}
                    </div>
                  </div>

                  {/* Friends */}
                  <div
                    className={`privacy-option-card ${visibility === 'friends' ? 'selected' : ''}`}
                    onClick={() => setVisibility('friends')}
                  >
                    <div className="privacy-option-icon">
                      <UserCheck size={18} />
                    </div>
                    <div className="privacy-option-text">
                      <span className="privacy-option-title">Friends Only</span>
                      <span className="privacy-option-desc">Only confirmed friends can see your birthday</span>
                    </div>
                    <div className="privacy-radio-circle">
                      {visibility === 'friends' && <div className="privacy-radio-inner" />}
                    </div>
                  </div>

                  {/* Nobody / onlyMe */}
                  <div
                    className={`privacy-option-card ${visibility === 'onlyMe' ? 'selected' : ''}`}
                    onClick={() => setVisibility('onlyMe')}
                  >
                    <div className="privacy-option-icon">
                      <Lock size={18} />
                    </div>
                    <div className="privacy-option-text">
                      <span className="privacy-option-title">Nobody / Private</span>
                      <span className="privacy-option-desc">Hidden from everyone. Nobody gets notified.</span>
                    </div>
                    <div className="privacy-radio-circle">
                      {visibility === 'onlyMe' && <div className="privacy-radio-inner" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Feedback */}
              {saveSuccess && (
                <div className="birthday-modal-feedback success">
                  <Check size={18} />
                  <span>Birthday & privacy settings saved!</span>
                </div>
              )}

              {saveError && (
                <div className="birthday-modal-feedback error">
                  <span>{saveError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="birthday-modal-actions">
                <button
                  type="button"
                  className="birthday-btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="birthday-btn-primary"
                  disabled={saving || saveSuccess}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
