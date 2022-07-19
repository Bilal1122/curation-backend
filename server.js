const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { ReportsGenerator } = require('./helpers/CRONJobGenerator');

exports.rootDir = __dirname;
// helpers
const KEYS = require('./configs/keys');

// app
const app = express();

// cross servers
app.use(cors());
app.options('*', cors());

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

// Body Parser
app.use(bodyParser.json({ limit: '250mb' }));
app.use(bodyParser.urlencoded({ limit: '250mb', extended: true }));

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

// port & server
const server = app.listen(KEYS.port, () => {
  console.log(`Connected to port ${KEYS.port} @ ${new Date()}`);
});

const socketIO = require('socket.io');
const { initiateCRONJobs } = require('./helpers/CRONJobs');
const Artists = require('./models/Artists');



const io = socketIO.listen(server);

// connectSockets(io)

//CRON JOBS
initiateCRONJobs();

module.exports = {
  io,
};