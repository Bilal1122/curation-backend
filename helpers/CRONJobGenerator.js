const fs = require('fs');
const Group = require('../models/Group');
const History = require('../models/History');
const path = require('path');
const {processFile} = require('../helpers/uploadFilesToS3');
const moment = require('moment-timezone');

const ReportsGenerator = async (group_id, type, title) => {
  // group_id = '5ef25fe549b6220017d97bf3'

  let groups = [];
  let dataCollectionForGroups = {}
  if (!group_id) {
    groups = await Group.find({}); //_id: ["5ef25fe549b6220017d97bf3","60531f150edf8ffd24877163"]
  }
  else {
    groups = await Group.find({_id: group_id});
  }

  // let date = moment().tz('America/Los_Angeles').format()
  let days = type === 'W' ? 7 : 30;
  console.log({days})
  let prevWeek = moment().startOf('day').tz('America/Los_Angeles').subtract(days, "days");
  console.log({prevWeek})

  for (let i = 0; i < groups.length; i++) {
    dataCollectionForGroups[groups[i]._id] = [];
  }


  let groupsAlias = Object.keys(dataCollectionForGroups);
  for (let i = 0; i < Object.keys(dataCollectionForGroups).length; i++) {
    let histories = await History.find({
      _group: groupsAlias[i],
      // type: 'TrackNotAvailable',
      createdAt: {$gt: new Date(prevWeek)}
    })
      .sort({createdAt: -1});

    if (histories) {
      histories.forEach(item => {
        console.log(item._id)
        if (item._track.length) {
          dataCollectionForGroups[groupsAlias[i]] = [...dataCollectionForGroups[groupsAlias[i]], ...item._track.map(item => {
            return (
              item.title ? {
                name: `"${item.title}"`,
                isrc: item.isrc,
                artist:  item.artist ? typeof item.artist == "string" ? item.artist.split(',').map(item => item) : item.artist["0"].split(',').map(item => item): []
              } : {
                name: item.name && item.name,
                isrc: item.external_ids && item.external_ids.isrc,
                artist: item.artists && item.artists.map(item => item.name)
              })
          })];

          // item._track.forEach(item => {
          //   if (item.title) {
          //     isrcWithCounts[makeCombo] ? isrcWithCounts[makeCombo] = isrcWithCounts[makeCombo] + 1 :
          // isrcWithCounts[makeCombo] = 1; } else { let sISRC = item.external_ids && item.external_ids.isrc
          // isrcWithCounts[sISRC] ? isrcWithCounts[sISRC] = isrcWithCounts[sISRC] + 1 : isrcWithCounts[sISRC] = 1; }
          // })
        }
      })
    }
  }

  groupsAlias = Object.keys(dataCollectionForGroups);
  for (let i = 0; i < groupsAlias.length; i++) {
    let inGroup = dataCollectionForGroups[groupsAlias[i]];
    let tacksWithCounts = {};
    for (let j = 0; j < inGroup.length; j++) {
      if (inGroup[j].artist && inGroup[j].isrc && inGroup[j].name) {
        let artists = inGroup[j].artist.map(item => item.trim()).join('/');
        let makeCombo = `${inGroup[j].isrc.trim()}--${inGroup[j].name.trim()}--${artists}`;
        tacksWithCounts[makeCombo] ? tacksWithCounts[makeCombo] = tacksWithCounts[makeCombo] + 1 : tacksWithCounts[makeCombo] = 1;
        console.log(makeCombo, tacksWithCounts[makeCombo])
      }
    }
    dataCollectionForGroups[groupsAlias[i]] = tacksWithCounts;
    tacksWithCounts = {};
  }

  groupsAlias = Object.keys(dataCollectionForGroups);
  for (let i = 0; i < groupsAlias.length; i++) {
    let inGroup = dataCollectionForGroups[groupsAlias[i]];
    let arrayOfSubGroup = []
    let inSubGroup = Object.keys(inGroup);
    for (let j = 0; j < inSubGroup.length; j++) {
      arrayOfSubGroup.push({
        key: inSubGroup[j],
        count: inGroup[inSubGroup[j]]
      })
    }
    dataCollectionForGroups[groupsAlias[i]] = arrayOfSubGroup.sort((a, b) => {
      return b.count - a.count;
    });
  }

  groupsAlias = Object.keys(dataCollectionForGroups);
  for (let i = 0; i < groupsAlias.length; i++) {
    let groupKey = groupsAlias[i];
    let groupData = dataCollectionForGroups[groupsAlias[i]];
    let getGroup = await Group.findOne({_id: groupKey})
    let fileText = 'ISRC,Title,Artists,Count\n';

    groupData.forEach((item) => {
      let key = item.key.split('--')
      fileText += `"${key[0]}","${key[1].replace(/(\\r\\n|\\n|\\r|")/gm, '')}",${key[2]},${item.count}\n`;
      // fileText += `"${key[0]}","${key[1]}",${key[2]},${item.count}\n`;
    });

    let filePath = path.join(__dirname, '../');
    let fileName = `${type === 'W' ? 'Weekly' : 'Monthly'}.csv`;

    try {
      fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
      await processFile(
        fileName,
        getGroup.groupEmail,
        type === 'W' ? ' Weekly Report' : ' Monthly Report',
        getGroup.name,
        prevWeek,
        new Date(),
        title
      );
    } catch (err) {
      console.log(err);
    }
  }
  return dataCollectionForGroups;
  // for (let i = 0; i < groupsEmails.length; i++) {
  //   const myHistories = [];
  //   let tracksCount = {};
  //   let tracks = [];
  //   histories.forEach((history) => {
  //     if (history.email && history.email == groupsEmails[i])
  //       myHistories.push(history);
  //   });
  //
  //   // console.log(tracks);
  //
  //   // console.log(sortedTracks);
  //
  //
  //   // console.log(fileText, "fileTExt");
  //
  //   let filePath = path.join(__dirname, '../');
  //   let fileName = `monthlyReport.csv`;
  //   try {
  //     fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
  //     await processFile(
  //       fileName,
  //       groupsEmails[i],
  //       'Monthly Report!',
  //       groupsNames[i]
  //     );
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }
};

const weeklyReports = async (group_id) => {
  //
  //   // Weekly
  //   console.log('ITs Monday!');
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
  //   console.log(new Date(prevWeek), '-----prev');
  //
  //   const histories = await History.find({
  //     email: groupsEmails,
  //     type: 'TrackNotAvailable',
  //     createdAt: {$gte: new Date(prevWeek)}
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
  //         }
  //         else {
  //           tracks[index].logCount += 1;
  //         }
  //       });
  //     });
  //
  //     // console.log(tracks);
  //     let fileText = 'ISRC,Title,Artists,Count\n';
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
  //     let filePath = path.join(__dirname, '../../');
  //     // console.log(filePath);
  //     console.log('----------');
  //     console.log(fileText);
  //     console.log('----------');
  //     // console.log(filePath);
  //     let fileName = `monthlyReport.csv`;
  //     try {
  //       fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
  //       await processFile(
  //         fileName,
  //         groupsEmails[i],
  //         'Weekly Report!',
  //         groupsNames[i]
  //       );
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   }
};

module.exports = {ReportsGenerator, weeklyReports};
