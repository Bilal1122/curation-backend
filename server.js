var util = require("util");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const swagger = require("swagger-ui-express");
const swaggerDocs = require("./middleware/swagger");
const cors = require("cors");
const path = require("path");
const RateLimit = require("express-rate-limit");
const timeout = require("connect-timeout");

// helpers
const { response } = require("./helpers/responses");
const KEYS = require("./configs/keys");

// app
const app = express();

// cross servers
app.use(cors());
app.options('*', cors()) // include before other routes

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
  .connect(KEYS.dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: true,
  })
  .then((db) => {
    console.log("Database connected.");
  })
  .catch((err) => {
    console.log("Database connection failed.");
    console.log(err);
  });

// Body Parser
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// static
app.use("/uploads/", express.static(path.join(__dirname, "uploads")));

// api
app.use("/api", require("./routes/router"));

// file upload static page
app.get("/uploadfile", (req, res, next) => {
  res.send(path.join(__dirname, "views", "file.html"));
});

const { ReportsGenerator } = require("./helpers/CRONJobGenerator");
app.get("/getReportData", async (req, res, next) => {
  // initiateCRONJobs();
  let reports = await ReportsGenerator("5f4df570a038f312330ff9fd", "W");
  res.json(reports);
});

app.get("", (req, res) => {
  res.json("Welcome to curation digital testers!");
});

// port & server
const server = app.listen(KEYS.port, () => {
  console.log(`Connected to port ${KEYS.port} @ ${new Date()}`);
});

const socketIO = require("socket.io");
const { initiateCRONJobs } = require("./helpers/CRONJobs");
const connectSockets = require("./helpers/connectSockets");
const sha256 = require("sha256");

const io = socketIO.listen(server);

// connectSockets(io)

//CRON JOBS
initiateCRONJobs();

module.exports = {
  io,
};

// console.log(sha256("password"))

