/**
 * Configuration for the first-time user onboarding tour.
 * Step definitions can be easily reordered or updated here.
 */

export const ONBOARDING_TOUR_STEPS = [
  {
    id: 'chat-list',
    element: '[data-tour="chat-list"]',
    popover: {
      title: 'Conversations & Contacts',
      description: 'Your conversations, active chats, and friends appear here. You can also filter by unread, groups, or friends.',
      side: 'right',
      align: 'start',
    },
  },
  {
    id: 'new-chat-btn',
    element: '[data-tour="new-chat-btn"]',
    popover: {
      title: 'Start a New Conversation',
      description: 'Create a new end-to-end encrypted group chat, or search for friends and people across QuantumChat.',
      side: 'right',
      align: 'start',
    },
  },
  {
    id: 'composer-input',
    // Fallback to chat-main if no conversation is currently open
    element: '[data-tour="composer-input"]',
    fallbackElement: '[data-tour="chat-main"]',
    popover: {
      title: 'Message Input',
      description: 'Type and send end-to-end encrypted messages here. Press Enter to send, or Shift+Enter for a new line.',
      fallbackDescription: 'Once you select or start a chat, you can type and send end-to-end encrypted messages right here.',
      side: 'top',
      align: 'center',
    },
  },
  {
    id: 'composer-actions',
    // Fallback to chat-main if composer buttons are not mounted
    element: '[data-tour="composer-actions"]',
    fallbackElement: '[data-tour="chat-main"]',
    popover: {
      title: 'Attachments & Emoji',
      description: 'Easily attach encrypted files, voice messages, photos, and expressive emojis to your conversations.',
      fallbackDescription: 'Share encrypted files, voice messages, and emojis whenever a conversation is active.',
      side: 'top',
      align: 'start',
    },
  },
  {
    id: 'profile-menu',
    element: '[data-tour="profile-menu"]',
    popover: {
      title: 'Profile & Settings',
      description: 'Manage your profile, themes, encryption keys, private vault, and notifications here anytime.',
      side: 'bottom',
      align: 'end',
    },
  },
];
