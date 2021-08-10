const express = require("express");
const router = express.Router();
const sha256 = require("sha256");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const momentTimeZone = require("moment-timezone");

// models
const GroupsPlaylist = require("../../models/GroupsPlaylist");
const Group = require("../../models/Group");
const User = require("../../models/User");
const Publishers = require("../../models/Publishers");

// middleware
const { newAuthToken, adminAuthVerification } = require("../../middleware/jwt");
const { isValid } = require("../../middleware/validators");
const { response } = require("../../helpers/responses");
const AvailableTracks = require("../../models/AvailableTracks");
const History = require("../../models/History");
const { ReportsGenerator } = require("../../helpers/CRONJobGenerator");
const { processFile } = require("../../helpers/uploadFilesToS3");

const socketG = {
  io: null,
  client: null
};

const groupSocket = (io, client) => {
  socketG.io = io;
  socketG.client = client;
};

/**
 * @swagger
 * /api/admin/group:
 *  post:
 *    tags:
 *      - Admin Group
 *    description: Create a new group
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    - name: name
 *      in: formData
 *      required: true
 *      type: string
 *      description: group name
 *    - name: _publisher
 *      type: array
 *      items:
 *        oneOf:
 *          type: string
 *      required: true
 *      in: formData
 *      collectionFormat: multi
 *      description: publishers list
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/", async (req, res) => {
  let { authorization } = req.headers;
  let { name, _publisher } = req.body;
  await isValid({ name, _publisher })
    .then(async () => {
      // admin authorization verification
      adminAuthVerification(authorization)
        .then(async () => {
          let newGroup = new Group({
            name: name.trim(),
            _publisher
          });

          // save a new group
          let groupRegistered = await newGroup.save().catch((err) => {
            return res.status(400).json(response("SWR", null, null, err));
          });

          console.log(groupRegistered);
          if (groupRegistered) {
            return res
              .status(200)
              .json(
                response(
                  "S",
                  "New Group registration !",
                  { group: groupRegistered },
                  null
                )
              );
          } else {
            return res
              .status(400)
              .json(
                response("SWR", "Registration failed. Try again!", null, null)
              );
          }
        })
        .catch((err) => {
          return res.status(400).json(response("PD", null, null, err));
        });
    })
    .catch((err) => {
      return res.status(400).json(response("MD", null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/group:
 *  get:
 *    tags:
 *      - Admin Group
 *    description: Get all groups
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: authorization
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.get("/", async (req, res) => {
  let { authorization } = req.headers;

  // admin verification
  adminAuthVerification(authorization)
    .then(async () => {
      // get all groups date sorted
      let getAllGroups = await Group.find()
        .sort({ updatedAt: -1 })
        .catch((err) => {
          return res.status(400).json(response("SWR"));
        });
      if (getAllGroups) {
        return res
          .status(200)
          .json(response("S", "All groups!", { groups: getAllGroups }, null));
      } else {
        return res
          .status(400)
          .json(
            response("SWR", "Fetching groups failed. Try again!", null, null)
          );
      }
    })
    .catch((err) => {
      return res.status(400).json(response("PD", null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/group/byId:
 *  post:
 *    tags:
 *      - Admin Group
 *    description: get group by id
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: authorization
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/byId", async (req, res) => {
  let { _id } = req.body;

  let getGroup = await Group.findOne({ _id }).catch((err) => {
    return res.status(400).json(response("SWR"));
  });

  if (getGroup) {
    return res
      .status(200)
      .json(response("S", "All groups!", { group: getGroup }, null));
  } else {
    return res
      .status(400)
      .json(response("SWR", "Fetching groups failed. Try again!", null, null));
  }
});

/**
 * @swagger
 * /api/admin/group:
 *  put:
 *    tags:
 *      - Admin Group
 *    description: update a group
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: authorization
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: group _id
 *    - name: searchLimit
 *      in: formData
 *      required: true
 *      type: string
 *      description: searchLimit
 *    - name: userLimit
 *      in: formData
 *      required: true
 *      type: string
 *      description: userLimit
 *    - name: _publisher
 *      type: array
 *      items:
 *        oneOf:
 *          type: string
 *      required: true
 *      in: formData
 *      collectionFormat: multi
 *      description: publishers list
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.put("/", async (req, res) => {
  let { authorization } = req.headers;
  let {
    _id,
    groupEmail,
    _publisher,
    searchLimit,
    userLimit,
    batchSearchLimit,
    _labels,
    _PROs,
    filterByLicencedPublishers,
    filterByLicencedLabels,
    filterByLicencedPROs,
    manualSearchReports
  } = req.body;

  console.log(req.body, "------------");
  // admin auth token verification
  adminAuthVerification(authorization)
    .then(async () => {
      let getGroup = await Group.findOne({ _id }).catch((err) => {
        return res
          .status(400)
          .json(response("SWR", "Invalid group _id. Try again!", null, null));
      });
      console.log("update publihsr");
      console.log(groupEmail, "==============================================");
      if (getGroup) {
        // update group
        let allNames = [];
        let aPub = await Publishers.find({
          _id: { $in: getGroup._publisher }
        }).catch((er) => console.log(er));

        for (let i = 0; i < aPub.length; i++) {
          allNames.push(aPub[i].name);
        }

        let updateDoc = await Group.findOneAndUpdate(
          { _id },
          {
            $set: { _publisher },
            pub_names: allNames,
            searchLimit,
            userLimit,
            batchSearchLimit,
            _labels,
            _PROs,
            filterByLicencedPublishers: filterByLicencedPublishers,
            filterByLicencedLabels: filterByLicencedLabels,
            filterByLicencedPROs: filterByLicencedPROs,
            groupEmail,
            manualSearchReports
          },
          { new: true }
        ).catch((err) => {
          return res
            .status(400)
            .json(
              response("SWR", "Publisher update failed. Try again!", null, null)
            );
        });
        if (updateDoc) {
          // console.log(updateDoc._publisher.length);
          return res
            .status(200)
            .json(response("S", "Successful", { group: updateDoc }, null));
        } else {
          return res
            .status(400)
            .json(response("SWR", "Update failed. Try again!", null, null));
        }
      } else {
        return res
          .status(400)
          .json(
            response("SWR", "Make sure group exists. Try again!", null, null)
          );
      }
    })
    .catch((err) => {
      return res.status(400).json(response("PD", null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/group/byPlaylistId:
 *  post:
 *    tags:
 *      - Admin Group
 *    description: Get playlists
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: authorization
 *    - name: playlist_id
 *      in: formData
 *      required: true
 *      type: string
 *      description: authorization
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/byPlaylistId", async (req, res) => {
  let { authorization } = req.headers;
  let { playlist_id } = req.body;

  // admin auth token verification
  adminAuthVerification(authorization)
    .then(async () => {
      // get playlist by id
      let getGroup = await GroupsPlaylist.find({ playlist: playlist_id }).catch(
        (err) => {
          return res.status(400).json(response("SWR"));
        }
      );
      if (getGroup) {
        return res
          .status(200)
          .json(response("S", "All groups!", { group: getGroup }, null));
      } else {
        return res
          .status(400)
          .json(
            response("SWR", "Fetching groups failed. Try again!", null, null)
          );
      }
    })
    .catch((err) => {
      return res.status(400).json(response("PD", null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/group/groupPlaylist:
 *  put:
 *    tags:
 *      - Admin Group
 *    description: update group playlist
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: authorization
 *    - name: playlist_id
 *      in: formData
 *      required: true
 *      type: string
 *      description: playlist id
 *    - name: _groups
 *      type: array
 *      items:
 *        oneOf:
 *          type: array
 *      required: true
 *      in: formData
 *      collectionFormat: multi
 *      description: groups list
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.put("/groupPlaylist", async (req, res) => {
  let { authorization } = req.headers;
  let { playlist_id, _groups } = req.body;
  let newArray = _groups;
  // admin auth verification
  adminAuthVerification(authorization)
    .then(async () => {
      // delete all playlist by id
      let check = await GroupsPlaylist.deleteMany({
        playlist: playlist_id
      }).catch((err) => {
        return res.status(400).json(response("SWR"));
      });

      for (let i = 0; i < newArray.length; i++) {
        let newGroup = new GroupsPlaylist({
          _group: newArray[i],
          playlist: playlist_id
        });
        // save new group with playlist
        await newGroup.save().catch((err) => {
          return res.status(400).json(response("SWR", null, null, err));
        });
      }

      return res
        .status(200)
        .json(response("S", "update successful.", null, null));
    })
    .catch((err) => {
      return res.status(400).json(response("PD", null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/group/toggleStatus:
 *  patch:
 *    tags:
 *      - Admin Group
 *    description: Toggle Group Status
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: Group ID
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.patch("/toggleStatus", async (req, res) => {
  // try {
  const { _id } = req.body;
  console.log("jt");

  const group = await Group.findById(_id);
  if (!group) {
    return res.status(400).send({ message: "Group not available!" });
  }

  group.active = !group.active;

  console.log("here!");
  // console.log(group.active,"-=-=-");
  // console.log(group._user,"------")

  console.log(group.active);

  if (!group.active) {
    console.log(group._user);
    group._user &&
      group._user.forEach((user) => {
        if (socketG.client) {
          socketG.client.emit(`logout-${user}`);
        }
      });
    console.log("Going out!");
  }

  console.log(group.active);

  const response = await group.save();

  res.send(response);
  // } catch (err) {
  //   res.status(500).send(err.message ? {message: err.message} : err);
  // }
});

router.post("/testing", async (req, res) => {
  try {
    let { group_id } = req.body;
    const groups = await Group.find({ _id: group_id });

    const groupsEmails = [];
    const groupNames = [];
    groups.forEach((group) => {
      if (group.groupEmail) groupsEmails.push(group.groupEmail);
      if (group.groupEmail) groupNames.push(group.name);
    });

    // console.log(new Date());

    let date = new Date();
    let prevMonth = new Date().setMonth(date.getMonth() - 1);

    const histories = await History.find({
      email: groupsEmails,
      type: "TrackNotAvailable",
      createdAt: { $gte: new Date(prevMonth) }
    });

    for (let i = 0; i < groupsEmails.length; i++) {
      const myHistories = [];
      let tracksCount = {};
      let tracks = [];
      histories.forEach((history) => {
        if (history.email && history.email == groupsEmails[i])
          myHistories.push(history);
      });

      myHistories.forEach((history) => {
        history._track.forEach((track) => {
          // console.log(track.isrc);
          // console.log("-----------");
          tracksCount[track.isrc] = tracksCount.hasOwnProperty(track.isrc)
            ? tracksCount[track.isrc] + 1
            : 1;
          const index = tracks.findIndex((item) => item.isrc === track.isrc);
          console.log(index);
          if (index == -1) {
            track.logCount = 1;
            tracks.push(track);
          } else {
            tracks[index].logCount += 1;
          }
        });
      });

      // console.log(tracks);
      let fileText = "ISRC,Title,Artists,Count\n";
      let sortedTracks = tracks.sort((a, b) => {
        return b.logCount - a.logCount;
      });

      // console.log(sortedTracks);

      sortedTracks.forEach((item) => {
        fileText += `${item.isrc},${item.title},${item.artist[0]},${item.logCount}\n`;
      });
      // console.log(fileText, "fileTExt");

      let filePath = path.join(__dirname, "../../");
      // console.log(filePath);
      console.log("----------");
      console.log(fileText);
      console.log("----------");
      // console.log(filePath);
      let fileName = `monthlyReport.csv`;
      try {
        console.log(group, "------------>");

        fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
        await processFile(
          fileName,
          groupsEmails[i],
          "Monthly Report!",
          groupNames[i]
        );
      } catch (err) {
        console.log(err);
      }
    }
    res.send("hehe!");
  } catch (err) {
    res.status(500).send(err.message ? { message: err.message } : err);
  }
});

router.post("/testMonthly", async (req, res) => {
  try {
    const groups = await Group.find({});

    const groupsEmails = [];
    const groupNames = [];
    groups.forEach((group) => {
      if (group.groupEmail) groupsEmails.push(group.groupEmail);
      if (group.groupEmail) groupNames.push(group.name);
    });

    // console.log(new Date());

    let date = new Date();
    let prevMonth = new Date().setMonth(date.getMonth() - 1);

    const histories = await History.find({
      email: groupsEmails,
      type: "TrackNotAvailable",
      createdAt: { $gte: new Date(prevMonth) }
    });

    for (let i = 0; i < groupsEmails.length; i++) {
      const myHistories = [];
      let tracksCount = {};
      let tracks = [];
      histories.forEach((history) => {
        if (history.email && history.email == groupsEmails[i])
          myHistories.push(history);
      });

      myHistories.forEach((history) => {
        history._track.forEach((track) => {
          // console.log(track.isrc);
          // console.log("-----------");
          tracksCount[track.isrc] = tracksCount.hasOwnProperty(track.isrc)
            ? tracksCount[track.isrc] + 1
            : 1;
          const index = tracks.findIndex((item) => item.isrc === track.isrc);
          console.log(index);
          if (index == -1) {
            track.logCount = 1;
            tracks.push(track);
          } else {
            tracks[index].logCount += 1;
          }
        });
      });

      // console.log(tracks);
      let fileText = "ISRC,Title,Artists,Count\n";
      let sortedTracks = tracks.sort((a, b) => {
        return b.logCount - a.logCount;
      });

      // console.log(sortedTracks);

      sortedTracks.forEach((item) => {
        fileText += `${item.isrc},${item.title},${item.artist[0]},${item.logCount}\n`;
      });
      // console.log(fileText, "fileTExt");

      let filePath = path.join(__dirname, "../../");
      // console.log(filePath);
      console.log("----------");
      console.log(fileText);
      console.log("----------");
      // console.log(filePath);
      let fileName = `monthlyReport ${groups[0].name}.csv`;
      try {
        console.log(group, "------------>");

        fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
        await processFile(
          fileName,
          groupsEmails[i],
          "Monthly Report!",
          groupNames[i]
        );
      } catch (err) {
        console.log(err);
      }
    }
    res.send("hehe!");
  } catch (err) {
    res.status(500).send(err.message ? { message: err.message } : err);
  }
});

router.post("/testWeeklyAndMonthly", async (req, res) => {
  // try {
  let { group_id, type } = req.body;
  let reports = await ReportsGenerator(group_id, type, "Admin");
  return res.json({ success: true });
  // } catch (err) {
  //   console.log(err.message)
  //   res.status(500).send(err.message ? {message: err.message} : err);
  // }
  // const groups = await Group.find({_id: group_id});
  //
  // const groupsEmails = [];
  // const groupsNames = [];
  // groups.forEach((group) => {
  //   if (group.groupEmail) groupsEmails.push(group.groupEmail);
  //   if (group.groupEmail) groupsNames.push(group.name);
  // });
  //
  // // console.log(new Date());
  //
  // let date = new Date();
  // let prevWeek = new Date().setDate(date.getDate() - 7);
  // console.log(new Date(prevWeek), '-----prev');
  //
  // const histories = await History.find({
  //   email: groupsEmails,
  //   type: 'TrackNotAvailable',
  //   createdAt: {$gte: new Date(prevWeek)}
  // });
  //
  // console.log(histories, '-------------');
  //
  // for (let i = 0; i < groupsEmails.length; i++) {
  //   const myHistories = [];
  //   let tracksCount = {};
  //   let tracks = [];
  //   histories.forEach((history) => {
  //     if (history.email && history.email == groupsEmails[i])
  //       myHistories.push(history);
  //   });
  //
  //   let ii = 0;
  //
  //   myHistories.forEach((history) => {
  //     history._track.forEach((track) => {
  //       // console.log(track.isrc);
  //       // console.log("-----------");
  //       tracksCount[track.isrc] = tracksCount.hasOwnProperty(track.isrc)
  //         ? tracksCount[track.isrc] + 1
  //         : 1;
  //       const index = tracks.findIndex((item) => item.isrc === track.isrc);
  //       console.log(index);
  //       if (index == -1) {
  //         track.logCount = 1;
  //         tracks.push(track);
  //       }
  //       else {
  //         tracks[index].logCount += 1;
  //       }
  //     });
  //   });
  //
  //   // console.log(tracks);
  //   let fileText = 'ISRC,Title,Artists,Count\n';
  //   let sortedTracks = tracks.sort((a, b) => {
  //     return b.logCount - a.logCount;
  //   });
  //
  //   // console.log(sortedTracks);
  //
  //   sortedTracks.forEach((item) => {
  //     fileText += `${item.isrc},${item.title},${item.artist[0]},${item.logCount}\n`;
  //   });
  //   // console.log(fileText, "fileTExt");
  //
  //   let filePath = path.join(__dirname, '../../');
  //   // console.log(filePath);
  //   console.log('----------');
  //   console.log(fileText);
  //   console.log('----------');
  //   // console.log(filePath);
  //   let fileName = `weekly Reports ${groups[0].name}.csv`;
  //   try {
  //     console.log(group, '--------------------------========');
  //     fs.writeFileSync(`${filePath}logs/${fileName}`, fileText);
  //     await processFile(
  //       fileName,
  //       groupsEmails[i],
  //       'Weekly Report!',
  //       groupsNames[i]
  //     );
  //     console.log(group, '--------------------------========');
  //   } catch (err) {
  //     console.log(err, '<<<<---');
  //   }
  // }
});

router.post("/downloadReports", async (req, res) => {
  try {
    let { group_id, from, to, type } = req.body;
    console.log(req.body);
    const group = await Group.findById(group_id);
    console.log(from, "From");
    console.log(to, "To");
    console.log("-------------------");
    // to = new Date(to).setDate(new Date(to).getDate());

    const groupEmail = group.groupEmail;
    from = moment(from);
    to = moment(to);
    from = from.startOf("day");
    to = to.endOf("day");
    const myHistories = await History.find({
      _group: group_id,
      type,
      createdAt: { $gte: from, $lte: to }
    });

    console.log("----------------------", myHistories.length);
    let tracksCount = {};
    let tracks = [];

    myHistories.forEach((history) => {
      let filtersUsed = "";
      history._track.forEach((track) => {
        let keys = [];
        if (track.newFormatLogReason) {
          if (track.newFormatLogReason && track.newFormatLogReason.noMatch) {
            track.misMatch = "No Match";
            track.newFormatLogReason = "No Match";
          } else {
            if (track.newFormatLogReason && track.newFormatLogReason.publisher)
              keys.push("Publisher");
            if (track.newFormatLogReason && track.newFormatLogReason.label)
              keys.push("Label");
            if (track.newFormatLogReason && track.newFormatLogReason.pro)
              keys.push("Pro");
            track.misMatch = keys.join(",");
            track.newFormatLogReason =
              track.newFormatLogReason &&
              `${
                track.newFormatLogReason.publisher
                  ? track.newFormatLogReason.publisher + " "
                  : ""
              }${
                track.newFormatLogReason.label
                  ? track.newFormatLogReason.label + " "
                  : ""
              }${
                track.newFormatLogReason.pro
                  ? track.newFormatLogReason.pro + " "
                  : ""
              }`.replace(/( ?)(?:(?:\d+\.\d+)|(?:\.\d+)|(?:\d+))%( ?)/g, " ");

            // track.filtersUsed = Object.keys(track.newFormatLogReason).forEach((item)=> filtersUsed += `${item}=${track.newFormatLogReason[item]}`)
          }
        } else {
          track.misMatch = "-";
          track.newFormatLogReason = "-";
        }

        Object.keys(history.query).map((item) => {
          if (
            [
              "userPublisherFilter",
              "userLabelFilter",
              "userPROFilter"
            ].includes(item)
          ) {
            filtersUsed += `${item}=${history.query[item]} /`;
          }
        });
        track.filtersUsed = filtersUsed.substring(0, filtersUsed.length-1);
        track.searchingTime = history.createdAt;
        tracks.push(track);
      });
    });

    let fileText =
      "ISRC,Title,Artists,Mismatch,Log Reason,Filters Used,Timestamp\n";
    // `${item.newFormatLogReason && item.newFormatLogReason.publisher ? ' Publisher ' : ''}
    //  ${item.newFormatLogReason && item.newFormatLogReason.label ? " Label " : ''}
    //  ${item.newFormatLogReason && item.newFormatLogReason.pro ? " PRO " : ''}`

    let sortedTracks = [];

    // tracks.forEach((item, key) => {
    //   if (item.searchingTime) {
    //     tracks.splice(key, 1);
    //     sortedTracks.unshift(item);
    //   }
    //   else {
    //     sortedTracks.push(item);
    //   }
    // })

    sortedTracks = tracks.sort((a, b) => {
      return b.searchingTime - a.searchingTime;
    });

    sortedTracks.forEach((item) => {
      let isrc = item.isrc;
      let title = `${item.title}`;
      let artist = `${item.artist}`;
      artist = `"${artist.replace(/(\r\n|\n|\r|")/gm, "")}"`;
      if (type == "SpotifyTrackNotAvailable") {
        isrc = item.external_ids && item.external_ids.isrc;
        title = `"${item.name && item.name}"`;
        artist = item.artists && item.artists.map((art) => art.name).join(" ");
        artist = `"${artist}"`;
      }

      // 'ISRC,Title,Artists,Mismatch,Log Reason,Search Time\n'
      fileText += `${isrc},${title},${artist},"${item.misMatch}",${
        item.newFormatLogReason ? item.newFormatLogReason : ""
      },
      ${item.filtersUsed}      
      ,${
        item.searchingTime
          ? `"${momentTimeZone(item.searchingTime)
              .tz("America/Los_Angeles")
              .format("YYYY-MM-DD HH:mm:ss")}"`
          : ""
      }\n`;
      // console.log(item.searchingTime)
    });
    // console.log(fileText);

    res.send({ file: fileText, group: group.name, from, to });
  } catch (err) {
    console.log(err.message);
    res.status(500).send(err.message ? { message: err.message } : err);
  }
});

router.delete("/:_group", async (req, res) => {
  let { _group } = req.params;
  try {
    let userGroup = await Group.deleteOne({ _id: _group });
    let userDelete = await User.deleteMany({ _group });
    return res
      .status(200)
      .json(
        response("S", "user", { message: "user Delete successfully" }, null)
      );
  } catch (err) {
    return res.status(400).json(response("PD", null, null, err));
  }
});

router.get("/validity", async (req, res) => {
  let { authorization } = req.headers;

  adminAuthVerification(authorization)
    .then(async () => {
      return res.status(200).json(response("S", "All good", {}, null));
    })
    .catch((err) => {
      return res.status(400).json(response("PD", null, null, err));
    });
});

module.exports = { router, groupSocket };
