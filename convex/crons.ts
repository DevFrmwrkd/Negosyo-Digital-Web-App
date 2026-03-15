import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Daily at midnight UTC: aggregate yesterday's daily analytics into monthly
crons.daily(
    'aggregate-daily-analytics',
    { hourUTC: 0, minuteUTC: 0 },
    internal.analyticsJobs.aggregateDailyToMonthly
);

// Hourly: auto-unpublish websites for submissions that haven't paid within 24 hours
crons.hourly(
    'auto-unpublish-overdue-websites',
    { minuteUTC: 0 },
    internal.unpublish.checkAndUnpublish
);

export default crons;
