const { formatInTimeZone } = require('date-fns-tz');

// Test timezone conversion
const utcDate = new Date('2025-11-14T16:18:00Z'); // 4:18 PM UTC

console.log('UTC Date:', utcDate.toISOString());
console.log('UTC Time:', utcDate.toUTCString());

// Convert to different timezones
const estTime = formatInTimeZone(utcDate, 'America/New_York', 'h:mm a');
const pstTime = formatInTimeZone(utcDate, 'America/Los_Angeles', 'h:mm a');
const cetTime = formatInTimeZone(utcDate, 'Europe/Paris', 'h:mm a');

console.log('\nTimezone Conversions:');
console.log('EST (America/New_York):', estTime);
console.log('PST (America/Los_Angeles):', pstTime);
console.log('CET (Europe/Paris):', cetTime);

// Test with current time
const now = new Date();
console.log('\nCurrent time in different timezones:');
console.log('UTC:', now.toISOString());
console.log('EST:', formatInTimeZone(now, 'America/New_York', 'h:mm a'));
console.log('PST:', formatInTimeZone(now, 'America/Los_Angeles', 'h:mm a'));
