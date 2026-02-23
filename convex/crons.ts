import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Daily at midnight UTC: aggregate yesterday's daily analytics into monthly
crons.daily(
    'aggregate-daily-analytics',
    { hourUTC: 0, minuteUTC: 0 },
    internal.analyticsJobs.aggregateDailyToMonthly
);

export default crons;
