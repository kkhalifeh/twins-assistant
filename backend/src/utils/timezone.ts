import { DateTime, IANAZone } from 'luxon';

export class TimezoneService {
  /**
   * Convert UTC timestamp to specified timezone
   */
  static toTimezone(utcTimestamp: Date, timezone: string): DateTime {
    return DateTime.fromJSDate(utcTimestamp, { zone: 'utc' })
      .setZone(timezone);
  }

  /**
   * Convert timestamp from source timezone to target timezone
   */
  static convertTimezone(
    timestamp: Date,
    fromTimezone: string,
    toTimezone: string
  ): DateTime {
    return DateTime.fromJSDate(timestamp, { zone: fromTimezone })
      .setZone(toTimezone);
  }

  /**
   * Get date range in specific timezone
   * Returns UTC Date objects for database queries
   */
  static getDateRangeInTimezone(
    dateStr: string, // YYYY-MM-DD
    timezone: string,
    viewMode: 'day' | 'week' | 'month' = 'day'
  ): { startDate: Date; endDate: Date } {
    const [year, month, day] = dateStr.split('-').map(Number);

    let start: DateTime;
    let end: DateTime;

    switch (viewMode) {
      case 'day':
        start = DateTime.fromObject(
          { year, month, day, hour: 0, minute: 0, second: 0 },
          { zone: timezone }
        );
        end = DateTime.fromObject(
          { year, month, day, hour: 23, minute: 59, second: 59 },
          { zone: timezone }
        );
        break;

      case 'week':
        const weekStart = DateTime.fromObject(
          { year, month, day },
          { zone: timezone }
        ).startOf('week');
        const weekEnd = weekStart.endOf('week');
        start = weekStart;
        end = weekEnd;
        break;

      case 'month':
        start = DateTime.fromObject(
          { year, month, day: 1 },
          { zone: timezone }
        ).startOf('month');
        end = start.endOf('month');
        break;
    }

    return {
      startDate: start.toUTC().toJSDate(),
      endDate: end.toUTC().toJSDate()
    };
  }

  /**
   * Check if a log entry falls within a date range in specific timezone
   */
  static isInDateRange(
    logTimestamp: Date,
    logEntryTimezone: string,
    dateStr: string, // YYYY-MM-DD
    viewTimezone: string,
    viewMode: 'day' | 'week' | 'month' = 'day'
  ): boolean {
    // Convert log timestamp to view timezone
    const logInViewTz = DateTime.fromJSDate(logTimestamp, { zone: logEntryTimezone })
      .setZone(viewTimezone);

    const [year, month, day] = dateStr.split('-').map(Number);

    switch (viewMode) {
      case 'day':
        return (
          logInViewTz.year === year &&
          logInViewTz.month === month &&
          logInViewTz.day === day
        );

      case 'week': {
        const weekStart = DateTime.fromObject({ year, month, day }, { zone: viewTimezone })
          .startOf('week');
        const weekEnd = weekStart.endOf('week');
        return logInViewTz >= weekStart && logInViewTz <= weekEnd;
      }

      case 'month':
        return logInViewTz.year === year && logInViewTz.month === month;

      default:
        return false;
    }
  }

  /**
   * Validate IANA timezone string
   */
  static isValidTimezone(timezone: string): boolean {
    return IANAZone.isValidZone(timezone);
  }

  /**
   * Get user-friendly timezone display
   */
  static getTimezoneDisplay(timezone: string): string {
    const dt = DateTime.now().setZone(timezone);
    return `${timezone} (UTC${dt.offsetNameShort})`;
  }

  /**
   * Format timestamp for display in specific timezone
   */
  static formatInTimezone(
    timestamp: Date,
    entryTimezone: string,
    displayTimezone: string,
    format: string = 'MMM dd, yyyy h:mm a'
  ): string {
    return DateTime.fromJSDate(timestamp, { zone: entryTimezone })
      .setZone(displayTimezone)
      .toFormat(format);
  }
}
