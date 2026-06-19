import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Standardize date and date-time formatting system-wide to "Month /  Day / Year" (e.g., "June /  19 / 2026")
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
const originalToLocaleString = Date.prototype.toLocaleString;

Date.prototype.toLocaleDateString = function (locales, options) {
  let shouldOverride = false;
  if (!options) {
    shouldOverride = true;
  } else if (typeof options === 'object') {
    const hasDay = 'day' in options;
    const hasYear = 'year' in options;
    const hasDateStyle = 'dateStyle' in options;
    if ((hasDay && hasYear) || hasDateStyle) {
      shouldOverride = true;
    }
  }

  if (shouldOverride) {
    try {
      const monthStr = originalToLocaleDateString.call(this, 'en-US', { month: 'long' });
      const dayVal = this.getDate();
      const yearVal = this.getFullYear();
      if (!isNaN(dayVal) && !isNaN(yearVal) && monthStr && monthStr !== 'Invalid Date') {
        return `${monthStr} /  ${dayVal} / ${yearVal}`;
      }
    } catch (e) {
      // fallback
    }
  }

  return originalToLocaleDateString.call(this, locales, options);
};

Date.prototype.toLocaleString = function (locales, options) {
  let shouldOverride = false;
  if (!options) {
    shouldOverride = true;
  } else if (typeof options === 'object') {
    const hasDay = 'day' in options;
    const hasYear = 'year' in options;
    const hasDateStyle = 'dateStyle' in options;
    if ((hasDay && hasYear) || hasDateStyle) {
      shouldOverride = true;
    }
  }

  if (shouldOverride) {
    try {
      const monthStr = originalToLocaleDateString.call(this, 'en-US', { month: 'long' });
      const dayVal = this.getDate();
      const yearVal = this.getFullYear();
      if (!isNaN(dayVal) && !isNaN(yearVal) && monthStr && monthStr !== 'Invalid Date') {
        const datePart = `${monthStr} /  ${dayVal} / ${yearVal}`;
        const hasTime = 'hour' in options || 'minute' in options || 'second' in options || 'timeStyle' in options;
        if (hasTime || !options) {
          const timeStr = this.toLocaleTimeString(locales || 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: options?.second,
            hour12: options?.hour12 ?? true
          });
          return `${datePart} at ${timeStr}`;
        }
        return datePart;
      }
    } catch (e) {
      // fallback
    }
  }

  return originalToLocaleString.call(this, locales, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);