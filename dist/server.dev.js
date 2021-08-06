"use strict";

var util = require("util");

var express = require("express");

var bodyParser = require("body-parser");

var mongoose = require("mongoose");

var swagger = require("swagger-ui-express");

var swaggerDocs = require("./middleware/swagger");

var cors = require("cors");

var path = require("path");

var RateLimit = require("express-rate-limit");

var timeout = require("connect-timeout"); // helpers


var _require = require("./helpers/responses"),
    response = _require.response;

var KEYS = require("./configs/keys"); // app


var app = express();
var limiterSeconds = new RateLimit({
  windowMs: 1000,
  // 1 second
  max: 40,
  message: response("SWR", "You have reached your search limit. Please contact Crunch Digital.", null, null)
});
var limiterMinutes = new RateLimit({
  windowMs: 60 * 1000,
  // 1 minutes
  max: 60,
  message: response("SWR", "You have reached your search limit. Please contact Crunch Digital.", null, null)
});
var limiterHour = new RateLimit({
  windowMs: 60 * 60 * 1000,
  // 1 hour
  max: 1000,
  message: response("SWR", "You have reached your search limit. Please contact Crunch Digital.", null, null)
});
app.use(timeout("1000000s"));
app.use([limiterSeconds, limiterMinutes, limiterHour], function (req, res, next) {
  if (req.rateLimit.limit > req.rateLimit.current) next();
}); // app.use(limiterMinutes);
// app.use(function (req, res, next) {
//   if (req.rateLimit.limit < req.rateLimit.current)
//     res.status(400).json({message: 'Too many accounts created from this IP, please try again after an hour
// (minutes)'}); else next(); });
// connect mongoDB

mongoose.connect(KEYS.dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true
}).then(function (db) {
  console.log("Database connected.");
})["catch"](function (err) {
  console.log("Database connection failed.");
  console.log(err);
}); // cross servers

app.use(cors());
app.options('*', cors()); // include before other routes
// Body Parser

app.use(bodyParser.json({
  limit: "50mb"
}));
app.use(bodyParser.urlencoded({
  limit: "50mb",
  extended: true
})); // initiate swagger

app.use("/api-docs", swagger.serve, swagger.setup(swaggerDocs)); // static

app.use("/uploads/", express["static"](path.join(__dirname, "uploads")));

var _require2 = require("./middleware/jwt"),
    userAuthVerification = _require2.userAuthVerification; // api


app.use("/api", require("./routes/router")); // file upload static page

app.get("/uploadfile", function (req, res, next) {
  res.send(path.join(__dirname, "views", "file.html"));
});

var _require3 = require("./helpers/CRONJobGenerator"),
    ReportsGenerator = _require3.ReportsGenerator;

app.get("/getReportData", function _callee(req, res, next) {
  var reports;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(ReportsGenerator("5ef25fe549b6220017d97bf3", "W"));

        case 2:
          reports = _context.sent;
          res.json(reports);

        case 4:
        case "end":
          return _context.stop();
      }
    }
  });
});
app.get("", function (req, res) {
  res.json("Welcome to curation digital testers!");
}); // port & server

var server = app.listen(KEYS.port, function () {
  console.log("Connected to port ".concat(KEYS.port, " @ ").concat(new Date()));
});

var socketIO = require("socket.io");

var _require4 = require("./helpers/CRONJobs"),
    initiateCRONJobs = _require4.initiateCRONJobs;

var connectSockets = require("./helpers/connectSockets");

var sha256 = require("sha256");

var io = socketIO.listen(server); // connectSockets(io)
//CRON JOBS

initiateCRONJobs();
module.exports = {
  io: io
}; // console.log(['hello', 'worled'].includes(''))
//"start": "node --max-old-space-size=4096 server.js",
//"dev": "nodemon --max-old-space-size=4096 server.js",
// change database
// change database url for available tracks
// change frontend url for email and verfication
// sendEmail('hadi.tariq02@gmail.com ', '12345', 'resetPassword')
// console.log(sha256("CrunchAdmin123!"))
// console.log(new Date(1619779192273))
// let test = ["dfds", "asdf"]
// console.log(test.toString())
// .replace(/(\r\n|\n|\r|")/gm, '')