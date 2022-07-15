const schedule = require('node-schedule');
const { resetFreeGroups } = require('../routes/Admin/Groups');
const { ReportsGenerator } = require('./CRONJobGenerator');

const initiateCRONJobs = () => {
  const test = new schedule.RecurrenceRule();
  test.second = 2;
  // weeklyRule.hour = 1;
  // weeklyRule.dayOfWeek = 1;
  test.tz = 'Atlantic/Azores';

  const weeklyRule = new schedule.RecurrenceRule();
  weeklyRule.second = 0;
  weeklyRule.minute = 0;
  weeklyRule.hour = 0;
  weeklyRule.dayOfWeek = 1;
  weeklyRule.tz = 'America/Edmonton';

  const monthlyRule = new schedule.RecurrenceRule();
  monthlyRule.second = 0;
  monthlyRule.minute = 0;
  monthlyRule.hour = 0;
  monthlyRule.date = 1;
  monthlyRule.tz = 'America/Edmonton';

  console.log('cron job hitted');

  // '0 0 0 1 * *' Monthly Schedule
  schedule.scheduleJob(monthlyRule, async () => {
    console.log('Monthly called');
    await ReportsGenerator(null, 'M', '');
  });

  // '0 0 0 * * 1' Weekely Schedule
  schedule.scheduleJob(weeklyRule, async () => {
    console.log('Weekly called');
    await ReportsGenerator(null, 'W', '');
  });

  // Free groups limit reset
  schedule.scheduleJob(monthlyRule, async () => {
    console.log('Reset Monthly group limit Called.');
    await resetFreeGroups();
  });
};

module.exports = { initiateCRONJobs };
