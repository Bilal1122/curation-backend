"use strict";

var express = require("express");

var router = express.Router();

var sha256 = require("sha256");

var fs = require("fs");

var path = require("path");

var moment = require("moment");

var momentTimeZone = require("moment-timezone"); // models


var GroupsPlaylist = require("../../models/GroupsPlaylist");

var Group = require("../../models/Group");

var User = require("../../models/User");

var Publishers = require("../../models/Publishers"); // middleware


var _require = require("../../middleware/jwt"),
    newAuthToken = _require.newAuthToken,
    adminAuthVerification = _require.adminAuthVerification;

var _require2 = require("../../middleware/validators"),
    isValid = _require2.isValid;

var _require3 = require("../../helpers/responses"),
    response = _require3.response;

var AvailableTracks = require("../../models/AvailableTracks");

var History = require("../../models/History");

var _require4 = require("../../helpers/CRONJobGenerator"),
    ReportsGenerator = _require4.ReportsGenerator;

var _require5 = require("../../helpers/uploadFilesToS3"),
    processFile = _require5.processFile;

var socketG = {
  io: null,
  client: null
};

var groupSocket = function groupSocket(io, client) {
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


router.post("/", function _callee3(req, res) {
  var authorization, _req$body, name, _publisher;

  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          authorization = req.headers.authorization;
          _req$body = req.body, name = _req$body.name, _publisher = _req$body._publisher;
          _context3.next = 4;
          return regeneratorRuntime.awrap(isValid({
            name: name,
            _publisher: _publisher
          }).then(function _callee2() {
            return regeneratorRuntime.async(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    // admin authorization verification
                    adminAuthVerification(authorization).then(function _callee() {
                      var newGroup, groupRegistered;
                      return regeneratorRuntime.async(function _callee$(_context) {
                        while (1) {
                          switch (_context.prev = _context.next) {
                            case 0:
                              newGroup = new Group({
                                name: name.trim(),
                                _publisher: _publisher
                              }); // save a new group

                              _context.next = 3;
                              return regeneratorRuntime.awrap(newGroup.save()["catch"](function (err) {
                                return res.status(400).json(response("SWR", null, null, err));
                              }));

                            case 3:
                              groupRegistered = _context.sent;
                              console.log(groupRegistered);

                              if (!groupRegistered) {
                                _context.next = 9;
                                break;
                              }

                              return _context.abrupt("return", res.status(200).json(response("S", "New Group registration !", {
                                group: groupRegistered
                              }, null)));

                            case 9:
                              return _context.abrupt("return", res.status(400).json(response("SWR", "Registration failed. Try again!", null, null)));

                            case 10:
                            case "end":
                              return _context.stop();
                          }
                        }
                      });
                    })["catch"](function (err) {
                      return res.status(400).json(response("PD", null, null, err));
                    });

                  case 1:
                  case "end":
                    return _context2.stop();
                }
              }
            });
          })["catch"](function (err) {
            return res.status(400).json(response("MD", null, null, err));
          }));

        case 4:
        case "end":
          return _context3.stop();
      }
    }
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

router.get("/", function _callee5(req, res) {
  var authorization;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          authorization = req.headers.authorization; // admin verification

          adminAuthVerification(authorization).then(function _callee4() {
            var getAllGroups;
            return regeneratorRuntime.async(function _callee4$(_context4) {
              while (1) {
                switch (_context4.prev = _context4.next) {
                  case 0:
                    _context4.next = 2;
                    return regeneratorRuntime.awrap(Group.find().sort({
                      updatedAt: -1
                    })["catch"](function (err) {
                      return res.status(400).json(response("SWR"));
                    }));

                  case 2:
                    getAllGroups = _context4.sent;

                    if (!getAllGroups) {
                      _context4.next = 7;
                      break;
                    }

                    return _context4.abrupt("return", res.status(200).json(response("S", "All groups!", {
                      groups: getAllGroups
                    }, null)));

                  case 7:
                    return _context4.abrupt("return", res.status(400).json(response("SWR", "Fetching groups failed. Try again!", null, null)));

                  case 8:
                  case "end":
                    return _context4.stop();
                }
              }
            });
          })["catch"](function (err) {
            return res.status(400).json(response("PD", null, null, err));
          });

        case 2:
        case "end":
          return _context5.stop();
      }
    }
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

router.post("/byId", function _callee6(req, res) {
  var _id, getGroup;

  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _id = req.body._id;
          _context6.next = 3;
          return regeneratorRuntime.awrap(Group.findOne({
            _id: _id
          })["catch"](function (err) {
            return res.status(400).json(response("SWR"));
          }));

        case 3:
          getGroup = _context6.sent;

          if (!getGroup) {
            _context6.next = 8;
            break;
          }

          return _context6.abrupt("return", res.status(200).json(response("S", "All groups!", {
            group: getGroup
          }, null)));

        case 8:
          return _context6.abrupt("return", res.status(400).json(response("SWR", "Fetching groups failed. Try again!", null, null)));

        case 9:
        case "end":
          return _context6.stop();
      }
    }
  });
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

router.put("/", function _callee8(req, res) {
  var authorization, _req$body2, _id, groupEmail, _publisher, searchLimit, userLimit, batchSearchLimit, _labels, _PROs, filterByLicencedPublishers, filterByLicencedLabels, filterByLicencedPROs, manualSearchReports;

  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          authorization = req.headers.authorization;
          _req$body2 = req.body, _id = _req$body2._id, groupEmail = _req$body2.groupEmail, _publisher = _req$body2._publisher, searchLimit = _req$body2.searchLimit, userLimit = _req$body2.userLimit, batchSearchLimit = _req$body2.batchSearchLimit, _labels = _req$body2._labels, _PROs = _req$body2._PROs, filterByLicencedPublishers = _req$body2.filterByLicencedPublishers, filterByLicencedLabels = _req$body2.filterByLicencedLabels, filterByLicencedPROs = _req$body2.filterByLicencedPROs, manualSearchReports = _req$body2.manualSearchReports;
          console.log(req.body, "------------"); // admin auth token verification

          adminAuthVerification(authorization).then(function _callee7() {
            var getGroup, allNames, aPub, i, updateDoc;
            return regeneratorRuntime.async(function _callee7$(_context7) {
              while (1) {
                switch (_context7.prev = _context7.next) {
                  case 0:
                    _context7.next = 2;
                    return regeneratorRuntime.awrap(Group.findOne({
                      _id: _id
                    })["catch"](function (err) {
                      return res.status(400).json(response("SWR", "Invalid group _id. Try again!", null, null));
                    }));

                  case 2:
                    getGroup = _context7.sent;
                    console.log("update publihsr");
                    console.log(groupEmail, "==============================================");

                    if (!getGroup) {
                      _context7.next = 21;
                      break;
                    }

                    // update group
                    allNames = [];
                    _context7.next = 9;
                    return regeneratorRuntime.awrap(Publishers.find({
                      _id: {
                        $in: getGroup._publisher
                      }
                    })["catch"](function (er) {
                      return console.log(er);
                    }));

                  case 9:
                    aPub = _context7.sent;

                    for (i = 0; i < aPub.length; i++) {
                      allNames.push(aPub[i].name);
                    }

                    _context7.next = 13;
                    return regeneratorRuntime.awrap(Group.findOneAndUpdate({
                      _id: _id
                    }, {
                      $set: {
                        _publisher: _publisher
                      },
                      pub_names: allNames,
                      searchLimit: searchLimit,
                      userLimit: userLimit,
                      batchSearchLimit: batchSearchLimit,
                      _labels: _labels,
                      _PROs: _PROs,
                      filterByLicencedPublishers: filterByLicencedPublishers,
                      filterByLicencedLabels: filterByLicencedLabels,
                      filterByLicencedPROs: filterByLicencedPROs,
                      groupEmail: groupEmail,
                      manualSearchReports: manualSearchReports
                    }, {
                      "new": true
                    })["catch"](function (err) {
                      return res.status(400).json(response("SWR", "Publisher update failed. Try again!", null, null));
                    }));

                  case 13:
                    updateDoc = _context7.sent;

                    if (!updateDoc) {
                      _context7.next = 18;
                      break;
                    }

                    return _context7.abrupt("return", res.status(200).json(response("S", "Successful", {
                      group: updateDoc
                    }, null)));

                  case 18:
                    return _context7.abrupt("return", res.status(400).json(response("SWR", "Update failed. Try again!", null, null)));

                  case 19:
                    _context7.next = 22;
                    break;

                  case 21:
                    return _context7.abrupt("return", res.status(400).json(response("SWR", "Make sure group exists. Try again!", null, null)));

                  case 22:
                  case "end":
                    return _context7.stop();
                }
              }
            });
          })["catch"](function (err) {
            return res.status(400).json(response("PD", null, null, err));
          });

        case 4:
        case "end":
          return _context8.stop();
      }
    }
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

router.post("/byPlaylistId", function _callee10(req, res) {
  var authorization, playlist_id;
  return regeneratorRuntime.async(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          authorization = req.headers.authorization;
          playlist_id = req.body.playlist_id; // admin auth token verification

          adminAuthVerification(authorization).then(function _callee9() {
            var getGroup;
            return regeneratorRuntime.async(function _callee9$(_context9) {
              while (1) {
                switch (_context9.prev = _context9.next) {
                  case 0:
                    _context9.next = 2;
                    return regeneratorRuntime.awrap(GroupsPlaylist.find({
                      playlist: playlist_id
                    })["catch"](function (err) {
                      return res.status(400).json(response("SWR"));
                    }));

                  case 2:
                    getGroup = _context9.sent;

                    if (!getGroup) {
                      _context9.next = 7;
                      break;
                    }

                    return _context9.abrupt("return", res.status(200).json(response("S", "All groups!", {
                      group: getGroup
                    }, null)));

                  case 7:
                    return _context9.abrupt("return", res.status(400).json(response("SWR", "Fetching groups failed. Try again!", null, null)));

                  case 8:
                  case "end":
                    return _context9.stop();
                }
              }
            });
          })["catch"](function (err) {
            return res.status(400).json(response("PD", null, null, err));
          });

        case 3:
        case "end":
          return _context10.stop();
      }
    }
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

router.put("/groupPlaylist", function _callee12(req, res) {
  var authorization, _req$body3, playlist_id, _groups, newArray;

  return regeneratorRuntime.async(function _callee12$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          authorization = req.headers.authorization;
          _req$body3 = req.body, playlist_id = _req$body3.playlist_id, _groups = _req$body3._groups;
          newArray = _groups; // admin auth verification

          adminAuthVerification(authorization).then(function _callee11() {
            var check, i, newGroup;
            return regeneratorRuntime.async(function _callee11$(_context11) {
              while (1) {
                switch (_context11.prev = _context11.next) {
                  case 0:
                    _context11.next = 2;
                    return regeneratorRuntime.awrap(GroupsPlaylist.deleteMany({
                      playlist: playlist_id
                    })["catch"](function (err) {
                      return res.status(400).json(response("SWR"));
                    }));

                  case 2:
                    check = _context11.sent;
                    i = 0;

                  case 4:
                    if (!(i < newArray.length)) {
                      _context11.next = 11;
                      break;
                    }

                    newGroup = new GroupsPlaylist({
                      _group: newArray[i],
                      playlist: playlist_id
                    }); // save new group with playlist

                    _context11.next = 8;
                    return regeneratorRuntime.awrap(newGroup.save()["catch"](function (err) {
                      return res.status(400).json(response("SWR", null, null, err));
                    }));

                  case 8:
                    i++;
                    _context11.next = 4;
                    break;

                  case 11:
                    return _context11.abrupt("return", res.status(200).json(response("S", "update successful.", null, null)));

                  case 12:
                  case "end":
                    return _context11.stop();
                }
              }
            });
          })["catch"](function (err) {
            return res.status(400).json(response("PD", null, null, err));
          });

        case 4:
        case "end":
          return _context12.stop();
      }
    }
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

router.patch("/toggleStatus", function _callee13(req, res) {
  var _id, group, response;

  return regeneratorRuntime.async(function _callee13$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          // try {
          _id = req.body._id;
          console.log("jt");
          _context13.next = 4;
          return regeneratorRuntime.awrap(Group.findById(_id));

        case 4:
          group = _context13.sent;

          if (group) {
            _context13.next = 7;
            break;
          }

          return _context13.abrupt("return", res.status(400).send({
            message: "Group not available!"
          }));

        case 7:
          group.active = !group.active;
          console.log("here!"); // console.log(group.active,"-=-=-");
          // console.log(group._user,"------")

          console.log(group.active);

          if (!group.active) {
            console.log(group._user);
            group._user && group._user.forEach(function (user) {
              if (socketG.client) {
                socketG.client.emit("logout-".concat(user));
              }
            });
            console.log("Going out!");
          }

          console.log(group.active);
          _context13.next = 14;
          return regeneratorRuntime.awrap(group.save());

        case 14:
          response = _context13.sent;
          res.send(response); // } catch (err) {
          //   res.status(500).send(err.message ? {message: err.message} : err);
          // }

        case 16:
        case "end":
          return _context13.stop();
      }
    }
  });
});
router.post("/testing", function _callee15(req, res) {
  return regeneratorRuntime.async(function _callee15$(_context16) {
    while (1) {
      switch (_context16.prev = _context16.next) {
        case 0:
          _context16.prev = 0;
          _context16.next = 3;
          return regeneratorRuntime.awrap(function _callee14() {
            var group_id, groups, groupsEmails, groupNames, date, prevMonth, histories, _loop, i;

            return regeneratorRuntime.async(function _callee14$(_context15) {
              while (1) {
                switch (_context15.prev = _context15.next) {
                  case 0:
                    group_id = req.body.group_id;
                    _context15.next = 3;
                    return regeneratorRuntime.awrap(Group.find({
                      _id: group_id
                    }));

                  case 3:
                    groups = _context15.sent;
                    groupsEmails = [];
                    groupNames = [];
                    groups.forEach(function (group) {
                      if (group.groupEmail) groupsEmails.push(group.groupEmail);
                      if (group.groupEmail) groupNames.push(group.name);
                    }); // console.log(new Date());

                    date = new Date();
                    prevMonth = new Date().setMonth(date.getMonth() - 1);
                    _context15.next = 11;
                    return regeneratorRuntime.awrap(History.find({
                      email: groupsEmails,
                      type: "TrackNotAvailable",
                      createdAt: {
                        $gte: new Date(prevMonth)
                      }
                    }));

                  case 11:
                    histories = _context15.sent;

                    _loop = function _loop(i) {
                      var myHistories, tracksCount, tracks, fileText, sortedTracks, filePath, fileName;
                      return regeneratorRuntime.async(function _loop$(_context14) {
                        while (1) {
                          switch (_context14.prev = _context14.next) {
                            case 0:
                              myHistories = [];
                              tracksCount = {};
                              tracks = [];
                              histories.forEach(function (history) {
                                if (history.email && history.email == groupsEmails[i]) myHistories.push(history);
                              });
                              myHistories.forEach(function (history) {
                                history._track.forEach(function (track) {
                                  // console.log(track.isrc);
                                  // console.log("-----------");
                                  tracksCount[track.isrc] = tracksCount.hasOwnProperty(track.isrc) ? tracksCount[track.isrc] + 1 : 1;
                                  var index = tracks.findIndex(function (item) {
                                    return item.isrc === track.isrc;
                                  });
                                  console.log(index);

                                  if (index == -1) {
                                    track.logCount = 1;
                                    tracks.push(track);
                                  } else {
                                    tracks[index].logCount += 1;
                                  }
                                });
                              }); // console.log(tracks);

                              fileText = "ISRC,Title,Artists,Count\n";
                              sortedTracks = tracks.sort(function (a, b) {
                                return b.logCount - a.logCount;
                              }); // console.log(sortedTracks);

                              sortedTracks.forEach(function (item) {
                                fileText += "".concat(item.isrc, ",").concat(item.title, ",").concat(item.artist[0], ",").concat(item.logCount, "\n");
                              }); // console.log(fileText, "fileTExt");

                              filePath = path.join(__dirname, "../../"); // console.log(filePath);

                              console.log("----------");
                              console.log(fileText);
                              console.log("----------"); // console.log(filePath);

                              fileName = "monthlyReport.csv";
                              _context14.prev = 13;
                              console.log(group, "------------>");
                              fs.writeFileSync("".concat(filePath, "logs/").concat(fileName), fileText);
                              _context14.next = 18;
                              return regeneratorRuntime.awrap(processFile(fileName, groupsEmails[i], "Monthly Report!", groupNames[i]));

                            case 18:
                              _context14.next = 23;
                              break;

                            case 20:
                              _context14.prev = 20;
                              _context14.t0 = _context14["catch"](13);
                              console.log(_context14.t0);

                            case 23:
                            case "end":
                              return _context14.stop();
                          }
                        }
                      }, null, null, [[13, 20]]);
                    };

                    i = 0;

                  case 14:
                    if (!(i < groupsEmails.length)) {
                      _context15.next = 20;
                      break;
                    }

                    _context15.next = 17;
                    return regeneratorRuntime.awrap(_loop(i));

                  case 17:
                    i++;
                    _context15.next = 14;
                    break;

                  case 20:
                    res.send("hehe!");

                  case 21:
                  case "end":
                    return _context15.stop();
                }
              }
            });
          }());

        case 3:
          _context16.next = 8;
          break;

        case 5:
          _context16.prev = 5;
          _context16.t0 = _context16["catch"](0);
          res.status(500).send(_context16.t0.message ? {
            message: _context16.t0.message
          } : _context16.t0);

        case 8:
        case "end":
          return _context16.stop();
      }
    }
  }, null, null, [[0, 5]]);
});
router.post("/testMonthly", function _callee17(req, res) {
  return regeneratorRuntime.async(function _callee17$(_context19) {
    while (1) {
      switch (_context19.prev = _context19.next) {
        case 0:
          _context19.prev = 0;
          _context19.next = 3;
          return regeneratorRuntime.awrap(function _callee16() {
            var groups, groupsEmails, groupNames, date, prevMonth, histories, _loop2, i;

            return regeneratorRuntime.async(function _callee16$(_context18) {
              while (1) {
                switch (_context18.prev = _context18.next) {
                  case 0:
                    _context18.next = 2;
                    return regeneratorRuntime.awrap(Group.find({}));

                  case 2:
                    groups = _context18.sent;
                    groupsEmails = [];
                    groupNames = [];
                    groups.forEach(function (group) {
                      if (group.groupEmail) groupsEmails.push(group.groupEmail);
                      if (group.groupEmail) groupNames.push(group.name);
                    }); // console.log(new Date());

                    date = new Date();
                    prevMonth = new Date().setMonth(date.getMonth() - 1);
                    _context18.next = 10;
                    return regeneratorRuntime.awrap(History.find({
                      email: groupsEmails,
                      type: "TrackNotAvailable",
                      createdAt: {
                        $gte: new Date(prevMonth)
                      }
                    }));

                  case 10:
                    histories = _context18.sent;

                    _loop2 = function _loop2(i) {
                      var myHistories, tracksCount, tracks, fileText, sortedTracks, filePath, fileName;
                      return regeneratorRuntime.async(function _loop2$(_context17) {
                        while (1) {
                          switch (_context17.prev = _context17.next) {
                            case 0:
                              myHistories = [];
                              tracksCount = {};
                              tracks = [];
                              histories.forEach(function (history) {
                                if (history.email && history.email == groupsEmails[i]) myHistories.push(history);
                              });
                              myHistories.forEach(function (history) {
                                history._track.forEach(function (track) {
                                  // console.log(track.isrc);
                                  // console.log("-----------");
                                  tracksCount[track.isrc] = tracksCount.hasOwnProperty(track.isrc) ? tracksCount[track.isrc] + 1 : 1;
                                  var index = tracks.findIndex(function (item) {
                                    return item.isrc === track.isrc;
                                  });
                                  console.log(index);

                                  if (index == -1) {
                                    track.logCount = 1;
                                    tracks.push(track);
                                  } else {
                                    tracks[index].logCount += 1;
                                  }
                                });
                              }); // console.log(tracks);

                              fileText = "ISRC,Title,Artists,Count\n";
                              sortedTracks = tracks.sort(function (a, b) {
                                return b.logCount - a.logCount;
                              }); // console.log(sortedTracks);

                              sortedTracks.forEach(function (item) {
                                fileText += "".concat(item.isrc, ",").concat(item.title, ",").concat(item.artist[0], ",").concat(item.logCount, "\n");
                              }); // console.log(fileText, "fileTExt");

                              filePath = path.join(__dirname, "../../"); // console.log(filePath);

                              console.log("----------");
                              console.log(fileText);
                              console.log("----------"); // console.log(filePath);

                              fileName = "monthlyReport ".concat(groups[0].name, ".csv");
                              _context17.prev = 13;
                              console.log(group, "------------>");
                              fs.writeFileSync("".concat(filePath, "logs/").concat(fileName), fileText);
                              _context17.next = 18;
                              return regeneratorRuntime.awrap(processFile(fileName, groupsEmails[i], "Monthly Report!", groupNames[i]));

                            case 18:
                              _context17.next = 23;
                              break;

                            case 20:
                              _context17.prev = 20;
                              _context17.t0 = _context17["catch"](13);
                              console.log(_context17.t0);

                            case 23:
                            case "end":
                              return _context17.stop();
                          }
                        }
                      }, null, null, [[13, 20]]);
                    };

                    i = 0;

                  case 13:
                    if (!(i < groupsEmails.length)) {
                      _context18.next = 19;
                      break;
                    }

                    _context18.next = 16;
                    return regeneratorRuntime.awrap(_loop2(i));

                  case 16:
                    i++;
                    _context18.next = 13;
                    break;

                  case 19:
                    res.send("hehe!");

                  case 20:
                  case "end":
                    return _context18.stop();
                }
              }
            });
          }());

        case 3:
          _context19.next = 8;
          break;

        case 5:
          _context19.prev = 5;
          _context19.t0 = _context19["catch"](0);
          res.status(500).send(_context19.t0.message ? {
            message: _context19.t0.message
          } : _context19.t0);

        case 8:
        case "end":
          return _context19.stop();
      }
    }
  }, null, null, [[0, 5]]);
});
router.post("/testWeeklyAndMonthly", function _callee18(req, res) {
  var _req$body4, group_id, type, reports;

  return regeneratorRuntime.async(function _callee18$(_context20) {
    while (1) {
      switch (_context20.prev = _context20.next) {
        case 0:
          // try {
          _req$body4 = req.body, group_id = _req$body4.group_id, type = _req$body4.type;
          _context20.next = 3;
          return regeneratorRuntime.awrap(ReportsGenerator(group_id, type, "Admin"));

        case 3:
          reports = _context20.sent;
          return _context20.abrupt("return", res.json({
            success: true
          }));

        case 5:
        case "end":
          return _context20.stop();
      }
    }
  });
});
router.post("/downloadReports", function _callee19(req, res) {
  var _req$body5, group_id, from, to, type, _group2, groupEmail, myHistories, tracksCount, tracks, fileText, sortedTracks;

  return regeneratorRuntime.async(function _callee19$(_context21) {
    while (1) {
      switch (_context21.prev = _context21.next) {
        case 0:
          _context21.prev = 0;
          _req$body5 = req.body, group_id = _req$body5.group_id, from = _req$body5.from, to = _req$body5.to, type = _req$body5.type;
          console.log(req.body);
          _context21.next = 5;
          return regeneratorRuntime.awrap(Group.findById(group_id));

        case 5:
          _group2 = _context21.sent;
          console.log(from, "From");
          console.log(to, "To");
          console.log("-------------------"); // to = new Date(to).setDate(new Date(to).getDate());

          groupEmail = _group2.groupEmail;
          from = moment(from);
          to = moment(to);
          from = from.startOf("day");
          to = to.endOf("day");
          _context21.next = 16;
          return regeneratorRuntime.awrap(History.find({
            _group: group_id,
            type: type,
            createdAt: {
              $gte: from,
              $lte: to
            }
          }));

        case 16:
          myHistories = _context21.sent;
          console.log("----------------------", myHistories.length);
          tracksCount = {};
          tracks = [];
          myHistories.forEach(function (history) {
            history._track.forEach(function (track) {
              var keys = [];
              var filtersUsed = "";

              if (track.newFormatLogReason) {
                if (track.newFormatLogReason && track.newFormatLogReason.noMatch) {
                  track.misMatch = "No Match";
                  track.newFormatLogReason = "No Match";
                } else {
                  if (track.newFormatLogReason && track.newFormatLogReason.publisher) keys.push("Publisher");
                  if (track.newFormatLogReason && track.newFormatLogReason.label) keys.push("Label");
                  if (track.newFormatLogReason && track.newFormatLogReason.pro) keys.push("Pro");
                  track.misMatch = keys.join(",");
                  track.newFormatLogReason = track.newFormatLogReason && "".concat(track.newFormatLogReason.publisher ? track.newFormatLogReason.publisher + " " : "").concat(track.newFormatLogReason.label ? track.newFormatLogReason.label + " " : "").concat(track.newFormatLogReason.pro ? track.newFormatLogReason.pro + " " : ""); // .replace(/( ?)(?:(?:\d+\.\d+)|(?:\.\d+)|(?:\d+))%( ?)/g, " ");
                  // track.filtersUsed = Object.keys(track.newFormatLogReason).forEach((item)=> filtersUsed += `${item}=${track.newFormatLogReason[item]}`)
                }
              } else {
                track.misMatch = "-";
                track.newFormatLogReason = "-";
              }

              Object.keys(history.query).map(function (item) {
                if (["userPublisherFilter", "userLabelFilter", "userPROFilter"].includes(item)) {
                  filtersUsed += "".concat(item, "=").concat(history.query[item], " /");
                }
              });
              track.filtersUsed = filtersUsed.substring(0, filtersUsed.length - 1);
              track.searchingTime = history.createdAt;
              tracks.push(track);
            });
          });
          fileText = "ISRC,Title,Artists,Mismatch,Log Reason,Filters Used,Timestamp\n"; // `${item.newFormatLogReason && item.newFormatLogReason.publisher ? ' Publisher ' : ''}
          //  ${item.newFormatLogReason && item.newFormatLogReason.label ? " Label " : ''}
          //  ${item.newFormatLogReason && item.newFormatLogReason.pro ? " PRO " : ''}`

          sortedTracks = []; // tracks.forEach((item, key) => {
          //   if (item.searchingTime) {
          //     tracks.splice(key, 1);
          //     sortedTracks.unshift(item);
          //   }
          //   else {
          //     sortedTracks.push(item);
          //   }
          // })

          sortedTracks = tracks.sort(function (a, b) {
            return b.searchingTime - a.searchingTime;
          });
          sortedTracks.forEach(function (item) {
            var isrc = item.isrc;
            var title = "".concat(item.title);
            var artist = "".concat(item.artist);
            artist = "\"".concat(artist.replace(/(\r\n|\n|\r|")/gm, ""), "\"");

            if (type == "SpotifyTrackNotAvailable") {
              isrc = item.external_ids && item.external_ids.isrc;
              title = "\"".concat(item.name && item.name, "\"");
              artist = item.artists && item.artists.map(function (art) {
                return art.name;
              }).join(" ");
              artist = "\"".concat(artist, "\"");
            } // 'ISRC,Title,Artists,Mismatch,Log Reason,Search Time\n'


            fileText += "".concat(isrc, ",").concat(title, ",").concat(artist, ",\"").concat(item.misMatch, "\",").concat(item.newFormatLogReason ? item.newFormatLogReason : "", ",").concat(item.filtersUsed, ",").concat(item.searchingTime ? "\"".concat(momentTimeZone(item.searchingTime).tz("America/Los_Angeles").format("YYYY-MM-DD HH:mm:ss"), "\"") : "", "\n"); // console.log(item.searchingTime)
          }); // console.log(fileText);

          res.send({
            file: fileText,
            group: _group2.name,
            from: from,
            to: to
          });
          _context21.next = 32;
          break;

        case 28:
          _context21.prev = 28;
          _context21.t0 = _context21["catch"](0);
          console.log(_context21.t0.message);
          res.status(500).send(_context21.t0.message ? {
            message: _context21.t0.message
          } : _context21.t0);

        case 32:
        case "end":
          return _context21.stop();
      }
    }
  }, null, null, [[0, 28]]);
});
router["delete"]("/:_group", function _callee20(req, res) {
  var _group, userGroup, userDelete;

  return regeneratorRuntime.async(function _callee20$(_context22) {
    while (1) {
      switch (_context22.prev = _context22.next) {
        case 0:
          _group = req.params._group;
          _context22.prev = 1;
          _context22.next = 4;
          return regeneratorRuntime.awrap(Group.deleteOne({
            _id: _group
          }));

        case 4:
          userGroup = _context22.sent;
          _context22.next = 7;
          return regeneratorRuntime.awrap(User.deleteMany({
            _group: _group
          }));

        case 7:
          userDelete = _context22.sent;
          return _context22.abrupt("return", res.status(200).json(response("S", "user", {
            message: "user Delete successfully"
          }, null)));

        case 11:
          _context22.prev = 11;
          _context22.t0 = _context22["catch"](1);
          return _context22.abrupt("return", res.status(400).json(response("PD", null, null, _context22.t0)));

        case 14:
        case "end":
          return _context22.stop();
      }
    }
  }, null, null, [[1, 11]]);
});
router.get("/validity", function _callee22(req, res) {
  var authorization;
  return regeneratorRuntime.async(function _callee22$(_context24) {
    while (1) {
      switch (_context24.prev = _context24.next) {
        case 0:
          authorization = req.headers.authorization;
          adminAuthVerification(authorization).then(function _callee21() {
            return regeneratorRuntime.async(function _callee21$(_context23) {
              while (1) {
                switch (_context23.prev = _context23.next) {
                  case 0:
                    return _context23.abrupt("return", res.status(200).json(response("S", "All good", {}, null)));

                  case 1:
                  case "end":
                    return _context23.stop();
                }
              }
            });
          })["catch"](function (err) {
            return res.status(400).json(response("PD", null, null, err));
          });

        case 2:
        case "end":
          return _context24.stop();
      }
    }
  });
});
module.exports = {
  router: router,
  groupSocket: groupSocket
};