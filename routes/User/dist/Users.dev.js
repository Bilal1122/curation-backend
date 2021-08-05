"use strict";

var express = require("express");

var Group = require("../../models/Group");

var User = require("../../models/User");

var History = require("../../models/History");

var router = express.Router();
/**
 * @swagger
 * /api/user/getUsers:
 *  get:
 *    tags:
 *      - User
 *    description: Get All Users
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: search_term
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */

router.get("/getUsers", function _callee(req, res) {
  var skip, limit, users, totalUsers;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          skip = parseInt(req.query.skip);
          limit = parseInt(req.query.limit);
          _context.next = 5;
          return regeneratorRuntime.awrap(User.find({}).populate({
            model: "group",
            path: "_group",
            select: "name"
          }).skip(skip).limit(limit).select("username verified blocked _group email"));

        case 5:
          users = _context.sent;
          _context.next = 8;
          return regeneratorRuntime.awrap(User.countDocuments({}));

        case 8:
          totalUsers = _context.sent;
          res.send({
            users: users,
            totalUsers: totalUsers
          });
          _context.next = 15;
          break;

        case 12:
          _context.prev = 12;
          _context.t0 = _context["catch"](0);
          res.status(500).send(_context.t0.message ? _context.t0.message : _context.t0);

        case 15:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 12]]);
});
router.post("/getGroupByID", function _callee2(req, res) {
  var getGroup;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return regeneratorRuntime.awrap(Group.findOne({
            _id: req.body._id
          }));

        case 2:
          getGroup = _context2.sent;
          res.json(getGroup);

        case 4:
        case "end":
          return _context2.stop();
      }
    }
  });
});
/**
 * @swagger
 * /api/user/toggleVerification:
 *  post:
 *    tags:
 *      - User
 *    description: Toggle User Verification
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: user _id
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */

router.post("/toggleVerification", function _callee3(req, res) {
  var _id, user, userUpdated;

  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _id = req.body._id;
          _context3.next = 4;
          return regeneratorRuntime.awrap(User.findById(_id));

        case 4:
          user = _context3.sent;

          if (user) {
            _context3.next = 7;
            break;
          }

          return _context3.abrupt("return", res.status(400).send({
            msg: "User not found!"
          }));

        case 7:
          _context3.next = 9;
          return regeneratorRuntime.awrap(User.findByIdAndUpdate(_id, {
            verified: !user.verified
          }, {
            "new": true,
            useFindAndModify: true
          }).select("username verified blocked"));

        case 9:
          userUpdated = _context3.sent;
          res.send(userUpdated);
          _context3.next = 16;
          break;

        case 13:
          _context3.prev = 13;
          _context3.t0 = _context3["catch"](0);
          res.status(500).send(_context3.t0.message ? _context3.t0.message : _context3.t0);

        case 16:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 13]]);
});
/**
 * @swagger
 * /api/user/toggleBlockStatus:
 *  post:
 *    tags:
 *      - User
 *    description: Toggle User Block Status
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: user _id
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */

router.post("/toggleBlockStatus", function _callee4(req, res) {
  var _id, user, userUpdated;

  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _id = req.body._id;
          _context4.next = 4;
          return regeneratorRuntime.awrap(User.findById(_id));

        case 4:
          user = _context4.sent;

          if (user) {
            _context4.next = 7;
            break;
          }

          return _context4.abrupt("return", res.status(400).send({
            msg: "User not found!"
          }));

        case 7:
          _context4.next = 9;
          return regeneratorRuntime.awrap(User.findByIdAndUpdate(_id, {
            blocked: !user.blocked
          }, {
            "new": true,
            useFindAndModify: true
          }).populate({
            model: "group",
            path: "_group",
            select: "name"
          }).select("username verified blocked email _group"));

        case 9:
          userUpdated = _context4.sent;
          console.log(userUpdated);
          res.send(userUpdated);
          _context4.next = 17;
          break;

        case 14:
          _context4.prev = 14;
          _context4.t0 = _context4["catch"](0);
          res.status(500).send(_context4.t0.message ? _context4.t0.message : _context4.t0);

        case 17:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 14]]);
});
/**
 * @swagger
 * /api/user/searchUser:
 *  get:
 *    tags:
 *      - User
 *    description: Search User
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: search_term
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */

router.get("/searchUser", function _callee5(req, res) {
  var skip, limit, search_term, regex, resultantGroups, users, totalUsers;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          skip = parseInt(req.query.skip);
          limit = parseInt(req.query.limit);
          search_term = req.query.search_term;
          regex = new RegExp("".concat(search_term), "ig");
          _context5.next = 7;
          return regeneratorRuntime.awrap(Group.find({
            name: {
              $regex: regex
            }
          }));

        case 7:
          resultantGroups = _context5.sent;
          resultantGroups = resultantGroups.map(function (gr) {
            return gr._id;
          });
          _context5.next = 11;
          return regeneratorRuntime.awrap(User.find({
            $or: [{
              username: {
                $regex: regex
              }
            }, {
              email: {
                $regex: regex
              }
            }, {
              _group: resultantGroups
            }]
          }).populate({
            model: "group",
            path: "_group",
            select: "name"
          }).skip(skip).limit(limit));

        case 11:
          users = _context5.sent;
          _context5.next = 14;
          return regeneratorRuntime.awrap(User.countDocuments({
            $or: [{
              username: {
                $regex: regex
              }
            }, {
              email: {
                $regex: regex
              }
            }, {
              _group: resultantGroups
            }]
          }));

        case 14:
          totalUsers = _context5.sent;
          res.send({
            users: users,
            totalUsers: totalUsers
          });
          _context5.next = 21;
          break;

        case 18:
          _context5.prev = 18;
          _context5.t0 = _context5["catch"](0);
          res.status(500).send(_context5.t0.message ? _context5.t0.message : _context5.t0);

        case 21:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 18]]);
});
/**
 * @swagger
 * /api/user/getFiltersByLicenced Labels:
 *  post:
 *    tags:
 *      - User
 *    description: get Filters by Licenced LAbels
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */

router.post("/getFiltersByLicenced", function _callee6(req, res) {
  var _id, user;

  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          _id = req.body._id;
          _context6.next = 4;
          return regeneratorRuntime.awrap(User.findById(_id).populate({
            model: "group",
            path: "_group"
          }).select("filterByLicencedPublishers filterByLicencedLabels filterByLicencedPROs _group"));

        case 4:
          user = _context6.sent;

          if (user) {
            _context6.next = 7;
            break;
          }

          return _context6.abrupt("return", res.status(400).send({
            message: "No User Availabe!"
          }));

        case 7:
          res.send(user);
          _context6.next = 13;
          break;

        case 10:
          _context6.prev = 10;
          _context6.t0 = _context6["catch"](0);
          res.status(500).send(_context6.t0.message ? _context6.t0.message : _context6.t0);

        case 13:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 10]]);
});
/**
 * @swagger
 * /api/user/changeValidationFilters Labels:
 *  patch:
 *    tags:
 *      - User
 *    description: change validation filters
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    - name: filterByLicencedPublishers
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    - name: filterByLicencedLabels
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    - name: filterByLicencedPROs
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */

router.patch("/changeValidationFilters", function _callee7(req, res) {
  var _req$body, _id, filterByLicencedPublishers, filterByLicencedPROs, filterByLicencedLabels, user, response;

  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          _req$body = req.body, _id = _req$body._id, filterByLicencedPublishers = _req$body.filterByLicencedPublishers, filterByLicencedPROs = _req$body.filterByLicencedPROs, filterByLicencedLabels = _req$body.filterByLicencedLabels;
          _context7.next = 4;
          return regeneratorRuntime.awrap(User.findById(_id));

        case 4:
          user = _context7.sent;

          if (user) {
            _context7.next = 7;
            break;
          }

          return _context7.abrupt("return", res.status(400).send({
            message: "No user available!"
          }));

        case 7:
          _context7.next = 9;
          return regeneratorRuntime.awrap(User.findByIdAndUpdate(_id, {
            filterByLicencedLabels: filterByLicencedLabels,
            filterByLicencedPROs: filterByLicencedPROs,
            filterByLicencedPublishers: filterByLicencedPublishers
          }, {
            "new": true
          }).populate({
            path: "_group",
            model: "group"
          }));

        case 9:
          response = _context7.sent;
          res.send(response);
          _context7.next = 16;
          break;

        case 13:
          _context7.prev = 13;
          _context7.t0 = _context7["catch"](0);
          res.status(500).send(_context7.t0.message ? _context7.t0.message : _context7.t0);

        case 16:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 13]]);
});
/**
 * @swagger
 * /api/user/getGroup Labels:
 *  post:
 *    tags:
 *      - User
 *    description: get User Group
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */

router.get("/getGroup/:_id", function _callee8(req, res) {
  var _id, user, group;

  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          _id = req.params._id;
          _context8.next = 4;
          return regeneratorRuntime.awrap(User.findById(_id));

        case 4:
          user = _context8.sent;

          if (user) {
            _context8.next = 7;
            break;
          }

          return _context8.abrupt("return", res.status(400).send({
            message: "User not found!"
          }));

        case 7:
          _context8.next = 9;
          return regeneratorRuntime.awrap(Group.findById(user._group).select("filterByLicencedPublishers filterByLicencedLabels filterByLicencedPROs"));

        case 9:
          group = _context8.sent;

          if (group) {
            _context8.next = 12;
            break;
          }

          return _context8.abrupt("return", res.status(400).send({
            message: "Group not found!"
          }));

        case 12:
          res.send({
            group: group
          });
          _context8.next = 18;
          break;

        case 15:
          _context8.prev = 15;
          _context8.t0 = _context8["catch"](0);
          res.status(500).send(_context8.t0.message ? _context8.t0.message : _context8.t0);

        case 18:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[0, 15]]);
});
router.get("/:_id", function _callee9(req, res) {
  var user;
  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _context9.next = 3;
          return regeneratorRuntime.awrap(User.findById(req.params._id));

        case 3:
          user = _context9.sent;
          res.send({
            user: user
          });
          _context9.next = 10;
          break;

        case 7:
          _context9.prev = 7;
          _context9.t0 = _context9["catch"](0);
          res.status(500).send(_context9.t0.message ? _context9.t0.message : _context9.t0);

        case 10:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
router.put("/", function _callee10(req, res) {
  var _req$body2, _id, userPreferences, user;

  return regeneratorRuntime.async(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _req$body2 = req.body, _id = _req$body2._id, userPreferences = _req$body2.userPreferences;
          _context10.prev = 1;
          _context10.next = 4;
          return regeneratorRuntime.awrap(User.findOneAndUpdate({
            _id: _id
          }, {
            $set: {
              filterByLicencedPublishers: userPreferences.filterByLicencedPublishers,
              filterByLicencedLabels: userPreferences.filterByLicencedLabels,
              filterByLicencedPROs: userPreferences.filterByLicencedPROs
            }
          }, {
            "new": true
          }));

        case 4:
          user = _context10.sent;
          res.send({
            user: user
          });
          _context10.next = 11;
          break;

        case 8:
          _context10.prev = 8;
          _context10.t0 = _context10["catch"](1);
          res.status(500).send(_context10.t0.message ? _context10.t0.message : _context10.t0);

        case 11:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[1, 8]]);
});
router.put("/groupLimitReduce", function _callee11(req, res) {
  var _req$body3, _id, value, updateGroup;

  return regeneratorRuntime.async(function _callee11$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _req$body3 = req.body, _id = _req$body3._id, value = _req$body3.value;
          _context11.prev = 1;
          _context11.next = 4;
          return regeneratorRuntime.awrap(Group.findOneAndUpdate({
            _id: _id
          }, {
            $inc: {
              searchLimit: -value
            }
          }, {
            "new": true
          }));

        case 4:
          updateGroup = _context11.sent;
          res.send({
            updateGroup: updateGroup
          });
          _context11.next = 11;
          break;

        case 8:
          _context11.prev = 8;
          _context11.t0 = _context11["catch"](1);
          res.status(500).send(_context11.t0.message ? _context11.t0.message : _context11.t0);

        case 11:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[1, 8]]);
});

function throwErr(msg) {
  throw new Error(msg);
}

router.post("/getManualReport", function _callee12(req, res) {
  var _id, current_date, yesterday, getUser, getGroup, getUserHistory;

  return regeneratorRuntime.async(function _callee12$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          _id = req.body._id;
          current_date = new Date();
          yesterday = new Date(current_date.getTime() - 24 * 60 * 60 * 1000);
          console.log(current_date);
          console.log(yesterday);
          _context12.prev = 5;
          _context12.next = 8;
          return regeneratorRuntime.awrap(User.findOne({
            _id: _id
          }).select("_group email")["catch"](function (err) {
            return throwErr(err);
          }));

        case 8:
          getUser = _context12.sent;
          _context12.next = 11;
          return regeneratorRuntime.awrap(Group.findById(getUser._group).select("manualSearchReports")["catch"](function (err) {
            return throwErr(err);
          }));

        case 11:
          getGroup = _context12.sent;

          if (getGroup.manualSearchReports) {
            _context12.next = 14;
            break;
          }

          return _context12.abrupt("return", res.json({
            success: false,
            message: "Feature not available for this group."
          }));

        case 14:
          _context12.next = 16;
          return regeneratorRuntime.awrap(History.find({
            $and: [{
              email: getUser.email,
              createdAt: {
                $gte: yesterday,
                $lte: current_date
              }
            }]
          }).sort({
            createdAt: -1
          })["catch"](function (err) {
            return throwErr(err);
          }));

        case 16:
          getUserHistory = _context12.sent;
          res.json({
            success: true,
            data: getUserHistory
          });
          _context12.next = 23;
          break;

        case 20:
          _context12.prev = 20;
          _context12.t0 = _context12["catch"](5);
          res.status(500).send(_context12.t0.message ? _context12.t0.message : _context12.t0);

        case 23:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[5, 20]]);
});
module.exports = router;