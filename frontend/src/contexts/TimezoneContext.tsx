'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DateTime } from 'luxon';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  formatTime: (date: Date | string, format?: string) => string;
  formatDate: (date: Date | string, format?: string) => string;
  formatDateTime: (date: Date | string, format?: string) => string;
  getUserTimezone: () => string;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>('America/New_York');
  const [isLoading, setIsLoading] = useState(true);

  // Load timezone from localStorage and API on mount
  useEffect(() => {
    const loadTimezone = async () => {
      try {
        // First, try to get from localStorage
        const savedTimezone = localStorage.getItem('userTimezone');
        if (savedTimezone) {
          setTimezoneState(savedTimezone);
        }

        // Then fetch from API
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('/api/user/timezone', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.timezone) {
              setTimezoneState(data.timezone);
              localStorage.setItem('userTimezone', data.timezone);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load timezone:', error);
        // Fall back to browser timezone
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezoneState(browserTz);
      } finally {
        setIsLoading(false);
      }
    };

    loadTimezone();
  }, []);

  const setTimezone = async (newTimezone: string) => {
    try {
      setTimezoneState(newTimezone);
      localStorage.setItem('userTimezone', newTimezone);

      // Update on server
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/user/timezone', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ timezone: newTimezone })
        });
      }
    } catch (error) {
      console.error('Failed to update timezone:', error);
    }
  };

  const formatTime = (date: Date | string, format: string = 'h:mm a') => {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
    return dt.setZone(timezone).toFormat(format);
  };

  const formatDate = (date: Date | string, format: string = 'MMM d, yyyy') => {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
    return dt.setZone(timezone).toFormat(format);
  };

  const formatDateTime = (date: Date | string, format: string = 'MMM d, yyyy h:mm a') => {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
    return dt.setZone(timezone).toFormat(format);
  };

  const getUserTimezone = () => {
    return timezone;
  };

  return (
    <TimezoneContext.Provider
      value={{
        timezone,
        setTimezone,
        formatTime,
        formatDate,
        formatDateTime,
        getUserTimezone,
        isLoading
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
