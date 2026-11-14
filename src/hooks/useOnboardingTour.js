import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/onboardingTour.css';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ONBOARDING_TOUR_STEPS } from '../config/onboardingTourSteps.js';

const LOCAL_STORAGE_PREFIX = 'qc_tour_seen_';

export default function useOnboardingTour({ onEnsureSidebarOpen, onEnsureSidebarClose } = {}) {
  const { user, updateSessionUser } = useAuth();
  const driverInstanceRef = useRef(null);
  const isTourActiveRef = useRef(false);

  const getStorageKey = useCallback(() => {
    return `${LOCAL_STORAGE_PREFIX}${user?.id || 'guest'}`;
  }, [user?.id]);

  const hasSeenTourLocally = useCallback(() => {
    try {
      return localStorage.getItem(getStorageKey()) === 'true';
    } catch {
      return false;
    }
  }, [getStorageKey]);

  const markTourCompleted = useCallback(async () => {
    // 1. Immediately cache in localStorage
    try {
      localStorage.setItem(getStorageKey(), 'true');
    } catch {
      // Ignore storage quota/security issues
    }

    // 2. Optimistically update local session state
    if (user && !user.hasSeenTour) {
      updateSessionUser({ ...user, hasSeenTour: true });
    }

    // 3. Persist to server if logged in
    if (user?.id) {
      try {
        await client.patch('/users/me', { hasSeenTour: true });
      } catch (err) {
        console.warn('Failed to persist hasSeenTour to server:', err?.message);
      }
    }
  }, [getStorageKey, user, updateSessionUser]);

  const startTour = useCallback(
    ({ isReplay = false } = {}) => {
      if (isTourActiveRef.current) return;

      // Close any previous instance
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch {}
      }

      // Filter and adapt steps based on currently available DOM elements
      const resolvedSteps = [];

      for (const step of ONBOARDING_TOUR_STEPS) {
        let el = document.querySelector(step.element);
        let desc = step.popover.description;

        if (!el && step.fallbackElement) {
          el = document.querySelector(step.fallbackElement);
          if (step.popover.fallbackDescription) {
            desc = step.popover.fallbackDescription;
          }
        }

        // If target or fallback exists, add to active steps
        if (el) {
          resolvedSteps.push({
            element: el,
            popover: {
              ...step.popover,
              description: desc,
              popoverClass: 'qc-tour-popover',
            },
          });
        }
      }

      if (resolvedSteps.length === 0) {
        return;
      }

      isTourActiveRef.current = true;

      const driverObj = driver({
        animate: true,
        smoothScroll: true,
        allowClose: true,
        showProgress: true,
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Done',
        overlayColor: '#000000',
        overlayOpacity: 0.4,
        stagePadding: 6,
        stageRadius: 8,
        popoverOffset: 12,
        steps: resolvedSteps,
        popoverClass: 'qc-tour-popover',
        onHighlightStarted: (element, step, { state }) => {
          // Responsive check: if target is in the sidebar and on mobile, open sidebar
          const isSidebarTarget =
            element?.closest?.('.sidebar') ||
            element?.matches?.('[data-tour="chat-list"], [data-tour="new-chat-btn"], [data-tour="profile-menu"]');

          if (window.innerWidth < 768) {
            if (isSidebarTarget && onEnsureSidebarOpen) {
              onEnsureSidebarOpen();
            } else if (!isSidebarTarget && onEnsureSidebarClose) {
              onEnsureSidebarClose();
            }
          }

          // Ensure target element is smoothly visible
          try {
            element?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
          } catch {}
        },
        onPopoverRender: (popover, { config, state }) => {
          // Ensure ARIA modal attributes for accessibility
          popover.wrapper.setAttribute('role', 'dialog');
          popover.wrapper.setAttribute('aria-modal', 'true');
          popover.wrapper.setAttribute('aria-label', 'Product onboarding tour');

          const footer = popover.footer;
          const navBtns = popover.navigationBtns;

          if (footer && !footer.querySelector('.driver-popover-skip-btn')) {
            const isLastStep = state.activeIndex === resolvedSteps.length - 1;
            if (!isLastStep) {
              const skipBtn = document.createElement('button');
              skipBtn.type = 'button';
              skipBtn.className = 'driver-popover-skip-btn';
              skipBtn.textContent = 'Skip';
              skipBtn.setAttribute('aria-label', 'Skip tour walkthrough');
              skipBtn.onclick = () => {
                markTourCompleted();
                driverObj.destroy();
              };
              // Insert Skip button on the left of footer
              footer.insertBefore(skipBtn, footer.firstChild);
            }
          }
        },
        onDestroyStarted: () => {
          // Closing with Esc, X, backdrop, or finishing counts as completing/skipping
          markTourCompleted();
          driverObj.destroy();
        },
        onDestroyed: () => {
          isTourActiveRef.current = false;
          driverInstanceRef.current = null;
        },
      });

      driverInstanceRef.current = driverObj;
      driverObj.drive();
    },
    [markTourCompleted, onEnsureSidebarOpen, onEnsureSidebarClose]
  );

  const replayTour = useCallback(async () => {
    // Reset local cache
    try {
      localStorage.removeItem(getStorageKey());
    } catch {}

    // Reset user state
    if (user?.hasSeenTour) {
      updateSessionUser({ ...user, hasSeenTour: false });
    }

    // Reset server flag
    if (user?.id) {
      try {
        await client.patch('/users/me', { hasSeenTour: false });
      } catch (err) {
        console.warn('Failed to reset hasSeenTour on server:', err?.message);
      }
    }

    // Give any open modal (like Settings) time to close before starting
    setTimeout(() => {
      startTour({ isReplay: true });
    }, 250);
  }, [getStorageKey, user, updateSessionUser, startTour]);

  // Automatic trigger on first login / visit
  useEffect(() => {
    if (!user?.id) return;

    // Do not run if user model has seen tour or localStorage indicates completed
    if (user.hasSeenTour || hasSeenTourLocally()) return;

    // Allow the main UI layout to mount before launching the tour
    const timer = setTimeout(() => {
      startTour({ isReplay: false });
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [user?.id, user?.hasSeenTour, hasSeenTourLocally, startTour]);

  return {
    startTour,
    replayTour,
    hasSeenTour: Boolean(user?.hasSeenTour || hasSeenTourLocally()),
  };
}
