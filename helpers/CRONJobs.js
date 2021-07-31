const schedule = require('node-schedule');
const {ReportsGenerator} = require('./CRONJobGenerator');

const initiateCRONJobs = () => {

  const test = new schedule.RecurrenceRule();
  test.second = 2;
  // weeklyRule.hour = 1;
  // weeklyRule.dayOfWeek = 1;
  test.tz = 'Atlantic/Azores'

  const weeklyRule = new schedule.RecurrenceRule();
  weeklyRule.second = 0;
  weeklyRule.minute = 0;
  weeklyRule.hour = 0;
  weeklyRule.dayOfWeek = 1;
  weeklyRule.tz = 'America/Edmonton'

  const monthlyRule = new schedule.RecurrenceRule();
  monthlyRule.second = 0;
  monthlyRule.minute = 0;
  monthlyRule.hour = 0;
  monthlyRule.date  = 1;
  monthlyRule.tz = 'America/Edmonton'

  console.log('cron job hitted')

  // '0 0 0 1 * *'
  schedule.scheduleJob(monthlyRule, async () => {
    console.log('Monthly called')
    await ReportsGenerator(null, 'M', '')
  });

  // '0 0 0 * * 1'
  schedule.scheduleJob(weeklyRule, async () => {
    console.log('Weekly called')
    await ReportsGenerator(null, 'W', '')
  });
};


module.exports = {initiateCRONJobs};


// schedule.scheduleJob("0 0 2 1 * *", async () => {
//   console.log("Its 1 am of 1st", "-----------------------");
//
//   const groups = await Group.find({});
//
//   const groupsEmails = [];
//   const groupsNames = [];
//   groups.forEach((group) => {
//     if (group.groupEmail) groupsEmails.push(group.groupEmail);
//     if (group.groupEmail) groupsNames.push(group.name);
//   });
//
//   // console.log(new Date());
//
//   let date = new Date();
//   let prevMonth = new Date().setMonth(date.getMonth() - 1);
//
//   const histories = await History.find({
//     email: groupsEmails,
//     type: "TrackNotAvailable",
//     createdAt: { $gte: new Date(prevMonth) },
//   });
//
//   for (let i = 0; i < groupsEmails.length; i++) {
//     const myHistories = [];
//     let tracksCount = {};
//     let tracks = [];
//     histories.forEach((history) => {
//       if (history.email && history.email == groupsEmails[i])
//         myHistories.push(history);
//     });
//
//     let ii = 0;
//
//     myHistories.forEach((history) => {
//       history._track.forEach((track) => {
//         // console.log(track.isrc);
//         // console.log("-----------");
//         tracksCount[track.isrc] = tracksCount.hasOwnProperty(track.isrc)
//           ? tracksCount[track.isrc] + 1
//           : 1;
//         const index = tracks.findIndex((item) => item.isrc === track.isrc);
//         console.log(index);
//         if (index == -1) {
//           track.logCount = 1;
//           tracks.push(track);
//         } else {
//           tracks[index].logCount += 1;
//         }
//       });
//     });
//
//     // console.log(tracks);
//     let fileText = "ISRC,Title,Artists,Count\n";
//     let sortedTracks = tracks.sort((a, b) => {
//       return b.logCount - a.logCount;
//     });
//
//     // console.log(sortedTracks);
//
//     sortedTracks.forEach((item) => {
//       fileText += `${item.isrc},${item.title},${item.artist[0]},${item.logCount}\n`;
//     });
//     // console.log(fileText, "fileTExt");
//
//     let filePath = path.join(__dirname, "../");
//     // console.log(filePath);
//     // console.log("----------");
//     // console.log(fileText);
//     // console.log("----------");
//     // console.log(filePath);
//     let fileName = `monthlyReport.csv`;
//     try {
//       fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
//       await processFile(
//         fileName,
//         groupsEmails[i],
//         "Monthly Report!",
//         groupsNames[i]
//       );
//     } catch (err) {
//       console.log(err);
//     }
//   }
// });

// Weekly
// schedule.scheduleJob("0 0 1 * * 1", async () => {
//   console.log("ITs Monday!");
//   const groups = await Group.find({});
//
//   const groupsEmails = [];
//   const groupsNames = [];
//   groups.forEach((group) => {
//     if (group.groupEmail) groupsEmails.push(group.groupEmail);
//     if (group.groupEmail) groupsNames.push(group.name);
//   });
//
//   // console.log(new Date());
//
//   let date = new Date();
//   let prevWeek = new Date().setDate(date.getDate() - 7);
//   console.log(new Date(prevWeek), "-----prev");
//
//   const histories = await History.find({
//     email: groupsEmails,
//     type: "TrackNotAvailable",
//     createdAt: { $gte: new Date(prevWeek) },
//   });
//
//   for (let i = 0; i < groupsEmails.length; i++) {
//     const myHistories = [];
//     let tracksCount = {};
//     let tracks = [];
//     histories.forEach((history) => {
//       if (history.email && history.email == groupsEmails[i])
//         myHistories.push(history);
//     });
//
//     let ii = 0;
//
//     myHistories.forEach((history) => {
//       history._track.forEach((track) => {
//         // console.log(track.isrc);
//         // console.log("-----------");
//         tracksCount[track.isrc] = tracksCount.hasOwnProperty(track.isrc)
//           ? tracksCount[track.isrc] + 1
//           : 1;
//         const index = tracks.findIndex((item) => item.isrc === track.isrc);
//         console.log(index);
//         if (index == -1) {
//           track.logCount = 1;
//           tracks.push(track);
//         } else {
//           tracks[index].logCount += 1;
//         }
//       });
//     });
//
//     // console.log(tracks);
//     let fileText = "ISRC,Title,Artists,Count\n";
//     let sortedTracks = tracks.sort((a, b) => {
//       return b.logCount - a.logCount;
//     });
//
//     // console.log(sortedTracks);
//
//     sortedTracks.forEach((item) => {
//       fileText += `${item.isrc},${item.title},${item.artist[0]},${item.logCount}\n`;
//     });
//     // console.log(fileText, "fileTExt");
//
//     let filePath = path.join(__dirname, "../../");
//     // console.log(filePath);
//     console.log("----------");
//     console.log(fileText);
//     console.log("----------");
//     // console.log(filePath);
//     let fileName = `monthlyReport.csv`;
//     try {
//       fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
//       await processFile(
//         fileName,
//         groupsEmails[i],
//         "Weekly Report!",
//         groupsNames[i]
//       );
//     } catch (err) {
//       console.log(err);
//     }
//   }
// });
