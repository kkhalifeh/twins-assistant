'use client';

import React from 'react';
import { useTimezone } from '../contexts/TimezoneContext';
import { DateTime } from 'luxon';

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'US & Canada' },
  { value: 'America/Chicago', label: 'Central Time (CT)', region: 'US & Canada' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'US & Canada' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'US & Canada' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', region: 'US & Canada' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)', region: 'US & Canada' },
  { value: 'Europe/London', label: 'London (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)', region: 'Europe' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Middle East' },
  { value: 'Asia/Amman', label: 'Jordan (GMT+3)', region: 'Middle East' },
  { value: 'Asia/Kolkata', label: 'India (IST)', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'China (CST)', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', region: 'Asia' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', region: 'Australia' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', region: 'Pacific' },
];

export function TimezoneSelector({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { timezone, setTimezone } = useTimezone();

  const getTimezoneOffset = (tz: string) => {
    try {
      const dt = DateTime.now().setZone(tz);
      const offset = dt.toFormat('ZZ');
      return offset;
    } catch {
      return '';
    }
  };

  if (variant === 'compact') {
    return (
      <select
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        {COMMON_TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label} (UTC{getTimezoneOffset(tz.value)})
          </option>
        ))}
      </select>
    );
  }

  // Group timezones by region
  const groupedTimezones = COMMON_TIMEZONES.reduce((acc, tz) => {
    if (!acc[tz.region]) {
      acc[tz.region] = [];
    }
    acc[tz.region].push(tz);
    return acc;
  }, {} as Record<string, typeof COMMON_TIMEZONES>);

  return (
    <div className="space-y-2">
      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
        Timezone
      </label>
      <select
        id="timezone"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {Object.entries(groupedTimezones).map(([region, timezones]) => (
          <optgroup key={region} label={region}>
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label} (UTC{getTimezoneOffset(tz.value)})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="mt-1 text-sm text-gray-500">
        Current time: {DateTime.now().setZone(timezone).toFormat('h:mm a')}
      </p>
    </div>
  );
}
