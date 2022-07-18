const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { ReportsGenerator } = require('./helpers/CRONJobGenerator');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

exports.rootDir = __dirname;
// helpers
const KEYS = require('./configs/keys');

// app
const app = express();
// Sentry.init({
//   dsn: 'https://f958378e55b94d158cfdbd4b3de07050@o1323715.ingest.sentry.io/6581605',
//   integrations: [
//     // enable HTTP calls tracing
//     new Sentry.Integrations.Http({ tracing: true }),
//     // enable Express.js middleware tracing
//     new Tracing.Integrations.Express({ app }),
//   ],

//   // Set tracesSampleRate to 1.0 to capture 100%
//   // of transactions for performance monitoring.
//   // We recommend adjusting this value in production
//   tracesSampleRate: 1.0,
// });
// app.use(Sentry.Handlers.requestHandler());

// Body Parser
// app.use(bodyParser.json({ limit: '350mb' }));
// app.use(bodyParser.urlencoded({ limit: '350mb', extended: true }));

app.use(express.json({ limit: '300mb' }));

// cross servers
app.use(cors());
app.options('*', cors());

// const limiterSeconds = new RateLimit({
//   windowMs: 1000, // 1 second
//   max: 40,
//   message: response(
//     "SWR",
//     "You have reached your search limit. Please contact Crunch Digital.",
//     null,
//     null
//   ),
// });
//
// const limiterMinutes = new RateLimit({
//   windowMs: 60 * 1000, // 1 minutes
//   max: 60,
//   message: response(
//     "SWR",
//     "You have reached your search limit. Please contact Crunch Digital.",
//     null,
//     null
//   ),
// });
//
// const limiterHour = new RateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 1000,
//   message: response(
//     "SWR",
//     "You have reached your search limit. Please contact Crunch Digital.",
//     null,
//     null
//   ),
// });
//
// app.use(timeout("1000000s"));
//
// app.use([limiterSeconds, limiterMinutes, limiterHour], (req, res, next) => {
//   if (req.rateLimit.limit > req.rateLimit.current) next();
// });

// app.use(limiterMinutes);
// app.use(function (req, res, next) {
//   if (req.rateLimit.limit < req.rateLimit.current)
//     res.status(400).json({message: 'Too many accounts created from this IP, please try again after an hour
// (minutes)'}); else next(); });

// connect mongoDB

mongoose
  .connect(KEYS.dbURI)
  .then((_) => {
    console.log('Database connected.');
  })
  .catch((err) => {
    console.log('Database connection failed.');
    console.log(err);
  });

// static
app.use('/uploads/', express.static(path.join(__dirname, 'uploads')));

// api
app.use('/api', require('./routes/router'));

// file upload static page
app.get('/uploadfile', (req, res, next) => {
  res.send(path.join(__dirname, 'views', 'file.html'));
});

app.get('/getReportData', async (req, res, next) => {
  let reports = await ReportsGenerator(
    '5ef25fe549b6220017d97bf3',
    'W',
    'allpubsTest'
  );
  res.json(reports);
});

app.get('', (req, res) => {
  res.json('Welcome to curation digital testers!');
});

// app.use(Sentry.Handlers.errorHandler());

// port & server
const server = app.listen(KEYS.port, () => {
  console.log(`Connected to port ${KEYS.port} @ ${new Date()}`);
});

const socketIO = require('socket.io');
const { initiateCRONJobs } = require('./helpers/CRONJobs');

const io = socketIO.listen(server);

//CRON JOBS
initiateCRONJobs();

module.exports = {
  io,
};
// // --max-old-space-size=4096
