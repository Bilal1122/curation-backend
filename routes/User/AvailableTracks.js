const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
// models
const AvailableTracks = require("../../models/AvailableTracks");
const Group = require("../../models/Group");
const History = require("../../models/History");
const User = require("../../models/User");
const Publishers = require("../../models/Publishers");
const LabelsModel = require("../../models/Labels");
const ProModel = require("../../models/PROs");

// helpers
const { response } = require("../../helpers/responses");

// middleware
const { userAuthVerification } = require("../../middleware/jwt");
const {
  availableTrackSearchValidator
} = require("../../middleware/validators");
const {
  getTracksWithoutFiltersLogs,
  getTracksWithFiltersLogs
} = require("../../middleware/available_search_tracks");

/**
 * @swagger
 * /api/user/availableTracks/oldSearch2:
 *  post:
 *    tags:
 *      - User
 *    description: Search through available tracks
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    - name: _group
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: _user
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: title
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: genre
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: decade
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: bpm_start
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: bpm_end
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: duration_start
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: duration_end
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: skip
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: type
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: artist
 *      type: array
 *      items:
 *        oneOf:
 *          type: string
 *      required: false
 *      in: formData
 *      collectionFormat: multi
 *      description: query
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/oldSearch2", async (req, res) => {
  let { authorization } = req.headers;
  //
  let {
    title,
    genre,
    decade,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end,
    seconds,
    range,
    artist,
    skip,
    _group,
    _user,
    type,
    userLabelFilter,
    userPROFilter,
    userPublisherFilter,
    isrc
  } = req.body;

  let filterPreferences = {
    userPublisherFilter: userPublisherFilter,
    userLabelFilter: userLabelFilter,
    userPROFilter: userPROFilter
  };

  console.log(userLabelFilter, userPROFilter, userPublisherFilter);
  console.log(
    { title },
    { genre },
    { decade },
    { bpm_start },
    { bpm_end },
    { duration_start },
    { duration_end },
    { seconds },
    { range },
    { artist },
    { _group },
    { _user },
    { skip },
    filterPreferences,
    { isrc }
  );
  let groupPublishers = [];
  let groupLabels = [];
  let groupPros = [];
  let allTracksTotalLength = 0;

  // user auth token verifications
  userAuthVerification(authorization)
    .then(async () => {
      // Validate all query params and return assembled query

      let checkUserQueryCount = await User.findOne({ _id: _user }).catch(
        (err) => {
          return res
            .status(400)
            .json(response("SWR", "Invalid user.", null, err));
        }
      );

      if (checkUserQueryCount) {
        // check user query limitations
        if (checkUserQueryCount.query_count <= 0) {
          return res
            .status(400)
            .json(
              response(
                "SWR",
                "You have reached your search limitations.",
                null,
                null
              )
            );
        }
      } else {
        return res
          .status(400)
          .json(response("SWR", "Invalid User", null, null));
      }

      // get all available tracks with query

      let group_publisher_list = [];
      let publisher_list = [];
      let label_list = [];
      let pro_list = [];
      let remaining_pubs = [];
      let remaining_labels = [];
      let remaining_pros = [];

      let allPublishers = await Publishers.find({});
      let allLabels = await LabelsModel.find({});
      let allPros = await ProModel.find({});

      let getGroup = await Group.findOne({ _id: _group }).populate({
        model: "publisher",
        path: "_publisher"
      });

      if (!getGroup.filterByLicencedPublishers)
        filterPreferences.userPublisherFilter = false;
      if (!getGroup.filterByLicencedLabels)
        filterPreferences.userLabelFilter = false;
      if (!getGroup.filterByLicencedPROs)
        filterPreferences.userPROFilter = false;

      console.log(filterPreferences, "filter{{{{{{{{{{{{{pppp");
      if (!getGroup.searchLimit) {
        return res
          .status(400)
          .json(
            response(
              "SWR",
              "You have reached your search limitations.",
              null,
              null
            )
          );
      }

      getGroup._publisher.map((item) => {
        group_publisher_list.push(item.name);
      });
      getGroup._PROs.map((item) => {
        pro_list.push(item);
      });
      getGroup._labels.map((item) => {
        label_list.push(item);
      });
      allPublishers.map((item) => {
        publisher_list.push(item.name);
      });

      if (type == "unavailable") {
        for (let i = 0; i < publisher_list.length; i++) {
          if (!group_publisher_list.includes(publisher_list[i])) {
            remaining_pubs.push(publisher_list[i]);
          }
        }

        // if (!remaining_pubs.length) {
        //   return res.status(200).json(
        //     response(
        //       'S',
        //       'Successful',
        //       {
        //         allTracksTotalLength: 0,
        //         tracks: []
        //       },
        //       null
        //     )
        //   );
        // }
      }

      if (type == "available") {
        for (let i = 0; i < publisher_list.length; i++) {
          if (group_publisher_list.includes(publisher_list[i])) {
            console.log("In available-- ", group_publisher_list[i]);
            remaining_pubs.push(group_publisher_list[i]);
          }
        }
      }

      if (type == "all") {
        remaining_pubs = group_publisher_list;
      }

      let query = availableTrackSearchValidator({
        title,
        genre,
        decade,
        seconds,
        range,
        artist,
        bpm_start,
        bpm_end,
        duration_start,
        duration_end,
        type,
        remaining_pubs
      });

      let allAvailableTracks = [];

      let { isSearch } = query[0];
      query = query.slice(1, query.length);
      query = query.length === 0 ? {} : { $and: query };
      query = isrc == null ? query : isrc.length ? { isrc } : {};
      console.log({ query });

      // let {isSearch} = query[0];
      // query = query.slice(1, query.length);
      // query = query.length === 0 ? {} : {$and: query};
      // // res.json(query)
      let limit = 10;
      if (isSearch) {
        limit = 1000;
        allAvailableTracks = await getTracksWithFiltersLogs(
          query,
          skip,
          limit,
          group_publisher_list,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences
        );
      } else {
        allAvailableTracks = await getTracksWithoutFiltersLogs(
          query,
          skip,
          limit,
          remaining_pubs,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences
        );
      }

      if (allAvailableTracks == null) {
        return res
          .status(400)
          .json(response("SWR", "Tracks not found", null, null));
      }
      if (allAvailableTracks.length) {
        console.log(getGroup.searchLimit, allAvailableTracks.length, "->>>");
        let isPassLength =
          allAvailableTracks.length > 10 ? 10 : allAvailableTracks.length;
        console.log(
          getGroup.searchLimit,
          allAvailableTracks.length,
          "<<<<->>>>>>>"
        );
        if (getGroup.searchLimit < isPassLength || !getGroup.searchLimit) {
          return res
            .status(400)
            .json(
              response(
                "SWR",
                "You have reached your search limitations.",
                null,
                null
              )
            );
        }

        let allUNAvailable = [];

        for (let i = 0; i < allAvailableTracks.length; i++) {
          if (allAvailableTracks[i].matchWithLocalTracks == false) {
            allUNAvailable.push(allAvailableTracks[i]);
          }
        }
        let updateUserQueryCount = await User.findOneAndUpdate(
          { _id: _user },
          {
            $inc: {
              query_count:
                allAvailableTracks.length > 10
                  ? -10
                  : -allAvailableTracks.length
            }
          },
          { new: true }
        ).catch((err) => {
          return response("SWR", "Search count not updated", null, err);
        });

        let updateGroupLimit = await Group.findOneAndUpdate(
          { _id: _group },
          {
            $inc: {
              searchLimit:
                allAvailableTracks.length > 10
                  ? -10
                  : -allAvailableTracks.length
            }
          },
          { new: true }
        ).catch((err) => {
          return response("SWR", "Group count not updated", null, err);
        });
        console.log(
          { allUNAvailable: allUNAvailable.length },
          "--------------->>>>>>>"
        );

        if (allUNAvailable.length) {
          console.log("Logging need");
          // console.log(allUNAvailable);
          if (filterPreferences.userPublisherFilter) {
            for (let i = 0; i < allUNAvailable.length; i++) {
              for (let j = 0; j < remaining_pubs.length; j++) {
                // publisher exists or not in the tracks
                console.log(
                  allUNAvailable[i].publishers,
                  "---------",
                  allUNAvailable[i].isrc
                );
                if (
                  allUNAvailable[i].publishers &&
                  allUNAvailable[i].publishers[remaining_pubs[j]] &&
                  allUNAvailable[i].publishers[remaining_pubs[j].toString()]
                ) {
                  // console.log(remaining_pubs[j]);
                  allUNAvailable[i].publishers[remaining_pubs[j]] = undefined;
                }
              }
              console.log("------------------------------");
            }
          }
          // insert in history
          let historyObject = new History({
            email: updateUserQueryCount.email,
            _group: getGroup._id,
            query: {
              title,
              genre,
              decade,
              bpm:
                bpm_start && bpm_end ? `${bpm_start} - ${bpm_end}` : undefined,
              minutes:
                duration_start && duration_end
                  ? `${duration_start} - ${duration_end}`
                  : undefined,
              seconds,
              range,
              artist,
              ...filterPreferences
            },
            _track: allUNAvailable,
            success: true,
            type: "TrackNotAvailable"
          });
          historyObject.save();
          // res.json(historyObject)
        }

        return res.status(200).json(
          response(
            "S",
            "Successful",
            {
              allTracksTotalLength:
                allAvailableTracks.length > 10 ? 10 : allAvailableTracks.length,
              tracks: allAvailableTracks.slice(0, 10)
            },
            null
          )
        );
      } else {
        return res.status(200).json(
          response(
            "S",
            "No more tracks",
            {
              allTracksTotalLength: 0,
              tracks: []
            },
            null
          )
        );
      }

      // update user recent search time
      // let updateUserLastSearchTime =await User.findOneAndUpdate({_id: _user}, {
      //   $set: {
      //     lastSearchAt: Date.now()
      //   }
      // }).catch(err => {
      //   return res
      //     .status(400)
      //     .json(
      //       response(
      //         'SWR',
      //         'Try again.',
      //         null,
      //         null
      //       )
      //     );
      // });
      // console.log(updateUserLastSearchTime)
    })
    .catch((err) => {
      return res
        .status(400)
        .json(
          response(
            "PD",
            "You dont have protocols to complete this process.",
            null,
            err
          )
        );
    });
});

/**
 * @swagger
 * /api/user/availableTracks/oldSearch:
 *  post:
 *    tags:
 *      - User
 *    description: Search through available tracks
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    - name: _group
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: _user
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: title
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: genre
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: decade
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: bpm_start
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: bpm_end
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: duration_start
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: duration_end
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: skip
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: type
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: artist
 *      type: array
 *      items:
 *        oneOf:
 *          type: string
 *      required: false
 *      in: formData
 *      collectionFormat: multi
 *      description: query
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/oldSearch", async (req, res) => {
  let { authorization } = req.headers;
  //
  let {
    title,
    genre,
    decade,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end,
    seconds,
    range,
    artist,
    skip,
    _group,
    _user,
    type,
    userPublisherFilter,
    userLabelFilter,
    userPROFilter
  } = req.body;

  console.log(
    { title },
    { genre },
    { decade },
    { bpm_start },
    { bpm_end },
    { duration_start },
    { duration_end },
    { seconds },
    { range },
    { artist },
    { _group },
    { _user },
    { skip }
  );
  let groupPublishers = [];
  let allTracksTotalLength = 0;

  // user auth token verifications
  userAuthVerification(authorization)
    .then(async () => {
      // Validate all query params and return assembled query

      let checkUserQueryCount = await User.findOne({ _id: _user }).catch(
        (err) => {
          return res
            .status(400)
            .json(response("SWR", "Invalid user.", null, err));
        }
      );

      if (checkUserQueryCount) {
        // check user query limitations
        if (checkUserQueryCount.query_count <= 0) {
          return res
            .status(400)
            .json(
              response(
                "SWR",
                "You have reached your search limitations.",
                null,
                null
              )
            );
        }
      } else {
        return res
          .status(400)
          .json(response("SWR", "Invalid User", null, null));
      }

      // get all available tracks with query

      let group_publisher_list = [];
      let publisher_list = [];
      let remaining_pubs = [];

      let allPublishers = await Publishers.find({});
      console.log(allPublishers, "-=-=-==-=-=");

      let getGroup = await Group.findOne({ _id: _group }).populate({
        model: "publisher",
        path: "_publisher"
      });

      getGroup._publisher.map((item) => {
        group_publisher_list.push(item.name);
      });

      allPublishers.map((item) => {
        publisher_list.push(item.name);
      });

      if (type == "unavailable") {
        for (let i = 0; i < publisher_list.length; i++) {
          if (!group_publisher_list.includes(publisher_list[i])) {
            remaining_pubs.push(publisher_list[i]);
          }
        }
        console.log("unavailable", { remaining_pubs });
        if (!remaining_pubs.length) {
          return res.status(200).json(
            response(
              "S",
              "Successful",
              {
                allTracksTotalLength: 0,
                tracks: []
              },
              null
            )
          );
        }
      }

      if (type == "available") {
        for (let i = 0; i < publisher_list.length; i++) {
          if (group_publisher_list.includes(publisher_list[i])) {
            remaining_pubs.push(group_publisher_list[i]);
          }
        }
      }

      if (type == "all") {
        remaining_pubs = group_publisher_list;
      }

      let query = availableTrackSearchValidator({
        title,
        genre,
        decade,
        seconds,
        range,
        artist,
        bpm_start,
        bpm_end,
        duration_start,
        duration_end,
        type,
        remaining_pubs
      });

      console.log(query, "-e-d--");

      let allAvailableTracks = [];
      let { isSearch } = query[0];
      // console.log({isSearch});
      query = query.slice(1, query.length);
      query = query.length === 0 ? {} : { $and: query };

      // res.json(query)
      let limit = 10;
      if (isSearch) {
        limit = 1000;
        allAvailableTracks = await getTracksWithFilters(
          query,
          skip,
          limit,
          remaining_pubs,
          type,
          duration_start,
          duration_end
        );
      } else {
        allAvailableTracks = await getTracksWithoutFilters(
          query,
          skip,
          limit,
          remaining_pubs,
          type,
          duration_start,
          duration_end
        );
      }

      console.log(allAvailableTracks.length, "<------------------------");

      if (allAvailableTracks == null) {
        return res
          .status(400)
          .json(response("SWR", "Tracks not found", null, null));
      }

      console.log(allAvailableTracks.length, "--------");
      if (allAvailableTracks.length) {
        let allUNAvailable = [];
        let user_group = await Group.findById(_group);
        // console.log(user_group,"::::");
        // console.log(user_group._publisher,"::::");
        let user_group_publishers = await Publishers.find({
          _id: user_group._publisher
        });
        // console.log(user_group_publishers,"ASDFASDF",user_group_publishers.length);
        user_group_publishers = user_group_publishers.map((item) => item.name);
        // console.log(user_group_publishers,"::::::::::::");

        // allAvailableTracks.forEach((item, key) => {
        //   // console.log(item,key)
        //   // console.log(item.all_pubs);
        //   let availablity = {}
        //   if (userPublisherFilter) {
        //     item.all_pubs.forEach(track_pub => {
        //       user_group_publishers.forEach(pub => {
        //         if (pub == track_pub) {
        //           availablity.pub = true;
        //         }
        //         else {
        //           availablity.pro = false;
        //         }
        //       })
        //     })
        //   }
        //   if (userLabelFilter) {
        //     user_group._labels.forEach(label => {
        //       if (label == item.label) {
        //         availablity.lab = true;
        //       }
        //       else {
        //         availablity.pro = false;
        //       }
        //     })
        //   }
        //   if (userPROFilter) {
        //     user_group._PROs.map(pro => {
        //       if (pro == item.PRO) {
        //         availablity.pro = true;
        //       }
        //       else {
        //         availablity.pro = false;
        //       }
        //     })
        //   }
        //   // console.log(availablity)
        //   let availablityValues = Object.values(availablity)
        //   let avail = availablityValues.every(val => val)
        //   // console.log(avail)
        //   item.available = avail;
        //   // console.log(item,"::::::::::");
        // })

        console.log(checkUserQueryCount, "-----??????");

        for (let i = 0; i < allAvailableTracks.length; i++) {
          if (allAvailableTracks[i].matchWithLocalTracks == false) {
            allUNAvailable.push(allAvailableTracks[i]);
          }
        }
        let updateUserQueryCount = await User.findOneAndUpdate(
          { _id: _user },
          {
            $inc: {
              query_count:
                allAvailableTracks.length > 10
                  ? -10
                  : -allAvailableTracks.length
            }
          },
          { new: true }
        ).catch((err) => {
          return response("SWR", "Search count not updated", null, err);
        });

        if (allUNAvailable.length) {
          console.log("Logging need");
          // console.log(allUNAvailable);

          // for (let i = 0; i < allUNAvailable.length; i++) {
          //   for (let j = 0; j < remaining_pubs.length; j++) {
          //     // publisher exists or not in the tracks
          //
          //     if (
          //       allUNAvailable[i].publishers &&
          //       allUNAvailable[i].publishers[remaining_pubs[j].toString()]
          //     ) {
          //       // console.log(remaining_pubs[j]);
          //       allUNAvailable[i].publishers[remaining_pubs[j]] = undefined;
          //     }
          //   }
          //   console.log('------------------------------');
          // }

          // insert in history
          let historyObject = new History({
            email: updateUserQueryCount.email,
            query: {
              title,
              genre,
              decade,
              bpm:
                bpm_start && bpm_end ? `${bpm_start} - ${bpm_end}` : undefined,
              minutes:
                duration_start && duration_end
                  ? `${duration_start} - ${duration_end}`
                  : undefined,
              seconds,
              range,
              artist,
              userPublisherFilter,
              userLabelFilter,
              userPROFilter
            },
            _track: allUNAvailable,
            success: true,
            type: "TrackNotAvailable"
          });
          historyObject.save();
          // res.json(historyObject)
        }

        console.log(userPublisherFilter, userLabelFilter, userPROFilter);

        return res.status(200).json(
          response(
            "S",
            "Successful",
            {
              allTracksTotalLength:
                allAvailableTracks.length > 10 ? 10 : allAvailableTracks.length,
              tracks: allAvailableTracks.slice(0, 10)
            },
            null
          )
        );
      } else {
        return res.status(200).json(
          response(
            "S",
            "No more tracks",
            {
              allTracksTotalLength: 0,
              tracks: []
            },
            null
          )
        );
      }

      // update user recent search time
      // let updateUserLastSearchTime =await User.findOneAndUpdate({_id: _user}, {
      //   $set: {
      //     lastSearchAt: Date.now()
      //   }
      // }).catch(err => {
      //   return res
      //     .status(400)
      //     .json(
      //       response(
      //         'SWR',
      //         'Try again.',
      //         null,
      //         null
      //       )
      //     );
      // });
      // console.log(updateUserLastSearchTime)
    })
    .catch((err) => {
      return res
        .status(400)
        .json(
          response(
            "PD",
            "You dont have protocols to complete this process.",
            null,
            err
          )
        );
    });
});

/**
 * @swagger
 * /api/user/availableTracks/oldSearch3:
 *  post:
 *    tags:
 *      - User
 *    description: Search through available tracks
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    - name: _group
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: _user
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: title
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: genre
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: decade
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: bpm_start
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: bpm_end
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: duration_start
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: duration_end
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: skip
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: type
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: artist
 *      type: array
 *      items:
 *        oneOf:
 *          type: string
 *      required: false
 *      in: formData
 *      collectionFormat: multi
 *      description: query
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/oldSearch3", async (req, res) => {
  let { authorization } = req.headers;
  //
  let {
    title,
    genre,
    decade,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end,
    seconds,
    range,
    artist,
    skip,
    _group,
    _user,
    type,
    userPublisherFilter,
    userLabelFilter,
    userPROFilter
  } = req.body;

  console.log(
    userPublisherFilter,
    userLabelFilter,
    userPROFilter,
    "+++++++++++"
  );
  console.log(
    { title },
    { genre },
    { decade },
    { bpm_start },
    { bpm_end },
    { duration_start },
    { duration_end },
    { seconds },
    { range },
    { artist },
    { _group },
    { _user },
    { skip }
  );
  let groupPublishers = [];
  let allTracksTotalLength = 0;

  // user auth token verifications
  userAuthVerification(authorization)
    .then(async () => {
      // Validate all query params and return assembled query

      let checkUserQueryCount = await User.findOne({ _id: _user }).catch(
        (err) => {
          return res
            .status(400)
            .json(response("SWR", "Invalid user.", null, err));
        }
      );

      if (checkUserQueryCount) {
        // check user query limitations
        if (checkUserQueryCount.query_count <= 0) {
          return res
            .status(400)
            .json(
              response(
                "SWR",
                "You have reached your search limitations.",
                null,
                null
              )
            );
        }
      } else {
        return res
          .status(400)
          .json(response("SWR", "Invalid User", null, null));
      }

      // get all available tracks with query

      let group_publisher_list = [];
      let publisher_list = [];
      let remaining_pubs = [];

      let allPublishers = await Publishers.find({});
      // console.log(allPublishers,"-=-=-==-=-=")

      let getGroup = await Group.findOne({ _id: _group }).populate({
        model: "publisher",
        path: "_publisher"
      });

      getGroup._publisher.map((item) => {
        group_publisher_list.push(item.name);
      });

      allPublishers.map((item) => {
        publisher_list.push(item.name);
      });

      if (type == "unavailable") {
        for (let i = 0; i < publisher_list.length; i++) {
          if (!group_publisher_list.includes(publisher_list[i])) {
            remaining_pubs.push(publisher_list[i]);
          }
        }
        // console.log('unavailable', {remaining_pubs});
        if (!remaining_pubs.length) {
          return res.status(200).json(
            response(
              "S",
              "Successful",
              {
                allTracksTotalLength: 0,
                tracks: []
              },
              null
            )
          );
        }
      }

      if (type == "available") {
        for (let i = 0; i < publisher_list.length; i++) {
          if (group_publisher_list.includes(publisher_list[i])) {
            remaining_pubs.push(group_publisher_list[i]);
          }
        }
      }

      if (type == "all") {
        remaining_pubs = group_publisher_list;
      }

      let query = availableTrackSearchValidator({
        title,
        genre,
        decade,
        seconds,
        range,
        artist,
        bpm_start,
        bpm_end,
        duration_start,
        duration_end,
        type,
        remaining_pubs
      });

      // console.log(query,"-e-d--")

      let allAvailableTracks = [];
      let { isSearch } = query[0];
      // console.log({isSearch});
      query = query.slice(1, query.length);
      query = query.length === 0 ? {} : { $and: query };

      // res.json(query)
      let limit = 10;
      if (isSearch) {
        limit = 1000;
        allAvailableTracks = await getTracksWithFilters(
          query,
          skip,
          limit,
          remaining_pubs,
          type,
          duration_start,
          duration_end,
          [],
          userPublisherFilter,
          userLabelFilter,
          userPROFilter
        );
      } else {
        allAvailableTracks = await getTracksWithoutFilters(
          query,
          skip,
          limit,
          remaining_pubs,
          type,
          duration_start,
          duration_end
        );
      }

      // console.log(allAvailableTracks.length,"<------------------------")

      if (allAvailableTracks == null) {
        return res
          .status(400)
          .json(response("SWR", "Tracks not found", null, null));
      }

      // console.log(allAvailableTracks.length,"--------")
      if (allAvailableTracks.length) {
        let allUNAvailable = [];
        let user_group = await Group.findById(_group);
        let user_group_publishers = await Publishers.find({
          _id: user_group._publisher
        });
        user_group_publishers = user_group_publishers.map((item) => item.name);

        // allAvailableTracks.forEach((item, key) => {
        //   let availablity = {}
        //   if (userPublisherFilter) {
        //     item.all_pubs.forEach(track_pub => {
        //       user_group_publishers.forEach(pub => {
        //         if (pub == track_pub) {
        //           availablity.pub = true;
        //         }
        //         else {
        //           availablity.pro = false;
        //         }
        //       })
        //     })
        //   }
        //   if (userLabelFilter) {
        //     user_group._labels.forEach(label => {
        //       if (label == item.label) {
        //         availablity.lab = true;
        //       }
        //       else {
        //         availablity.pro = false;
        //       }
        //     })
        //   }
        //   if (userPROFilter) {
        //     user_group._PROs.map(pro => {
        //       if (pro == item.PRO) {
        //         availablity.pro = true;
        //       }
        //       else {
        //         availablity.pro = false;
        //       }
        //     })
        //   }
        //   // console.log(availablity)
        //   let availablityValues = Object.values(availablity)
        //   let avail = availablityValues.every(val => val)
        //   // console.log(avail)
        //   item.available = avail;
        //   // console.log(item,"::::::::::");
        // })

        // console.log(checkUserQueryCount,"-----??????")

        for (let i = 0; i < allAvailableTracks.length; i++) {
          if (allAvailableTracks[i].matchWithLocalTracks == false) {
            allUNAvailable.push(allAvailableTracks[i]);
          }
          // userPublisherFilter -=-=-=>
        }
        let updateUserQueryCount = await User.findOneAndUpdate(
          { _id: _user },
          {
            $inc: {
              query_count:
                allAvailableTracks.length > 10
                  ? -10
                  : -allAvailableTracks.length
            }
          },
          { new: true }
        ).catch((err) => {
          return response("SWR", "Search count not updated", null, err);
        });

        if (allUNAvailable.length) {
          console.log("Logging need");
          // console.log(allUNAvailable);

          // console.log(allUNAvailable,"-=-=-=--")

          for (let i = 0; i < allUNAvailable.length; i++) {
            for (let j = 0; j < remaining_pubs.length; j++) {
              // publisher exists or not in the tracks

              if (
                allUNAvailable[i].publishers &&
                allUNAvailable[i].publishers[remaining_pubs[j].toString()]
              ) {
                // console.log(remaining_pubs[j]);
                allUNAvailable[i].publishers[remaining_pubs[j]] = undefined;
              }
            }
            console.log("------------------------------");
          }

          // insert in history
          // let historyObject = new History({
          //   email: updateUserQueryCount.email,
          //   query: {
          //     title,
          //     genre,
          //     decade,
          //     bpm:
          //       bpm_start && bpm_end
          //         ? `${bpm_start} - ${bpm_end}`
          //         : undefined,
          //     minutes:
          //       duration_start && duration_end
          //         ? `${duration_start} - ${duration_end}`
          //         : undefined,
          //     seconds,
          //     range,
          //     artist
          //   },
          //   _track: allUNAvailable,
          //   success: true,
          //   type: 'TrackNotAvailable'
          // });
          // historyObject.save();

          const user = await User.findById(_user);

          let logItems = [];
          allUNAvailable.forEach((item) => {
            let logItem = JSON.parse(JSON.stringify(item));
            let logReason = [];
            let newFormatLogReason = {};
            let publisherUnMatchString = "Publishers(";
            let labelUnMatchString = "Label(";
            let proUnMatchString = "Pro(";

            if (userPublisherFilter) {
              let publishersMatch = true;
              let mismatchPublisher = [];
              item.all_pubs.forEach((item) => {
                if (!user_group_publishers.includes(item)) {
                  mismatchPublisher.push(item);
                  publishersMatch = false;
                }
              });
              if (!publishersMatch) {
                logReason.push({
                  type: "Publishers mismatch",
                  mismatchedItems: mismatchPublisher
                });
                query.publisher = true;
              }
            }
            // if (userPROFilter) {
            //   let proMatch = true;
            //   if (!user_group._PROs.includes(item.PRO)) proMatch = false;
            //   if (!proMatch) {
            //     logReason.push({
            //       type: "PRO mismatch",
            //       mismatchedItems: [item.PRO],
            //     });
            //     query.pro = true;
            //   }
            // }

            // if (userLabelFilter) {
            //   let labelMatch = true;
            //   if (!user_group._labels.includes(item.label)) labelMatch = false;
            //   if (!labelMatch) {
            //     logReason.push({
            //       type: 'Label mismatch',
            //       mismatchedItems: [item.label]
            //     });
            //   }
            // }
            if (logReason.length > 0) {
              logItem.logReason = logReason;
              // logItem.searchingTime = new Date();
              logItems.push(logItem);
            }
          });

          let history = new History({
            email: user.email,
            _group: user_group._id,
            query: {
              licencedPublishers: userPublisherFilter,
              licencedLabels: userLabelFilter,
              licencedPROs: userPROFilter
            },
            _track: logItems,
            success: true,
            type: "TrackNotAvailable"
          });

          console.log(history._track);

          // console.log(history);
          // console.log("Saving History!");

          // let dateMin = new Date();
          // dateMin.setMonth(dateMin.getMonth() - 1);
          // await History.deleteMany({ createdAt: { $lt: dateMin } });

          await history.save();
          // res.json(historyObject)
        }

        return res.status(200).json(
          response(
            "S",
            "Successful",
            {
              allTracksTotalLength:
                allAvailableTracks.length > 10 ? 10 : allAvailableTracks.length,
              tracks: allAvailableTracks.slice(0, 10)
            },
            null
          )
        );
      } else {
        return res.status(200).json(
          response(
            "S",
            "No more tracks",
            {
              allTracksTotalLength: 0,
              tracks: []
            },
            null
          )
        );
      }

      // update user recent search time
      // let updateUserLastSearchTime =await User.findOneAndUpdate({_id: _user}, {
      //   $set: {
      //     lastSearchAt: Date.now()
      //   }
      // }).catch(err => {
      //   return res
      //     .status(400)
      //     .json(
      //       response(
      //         'SWR',
      //         'Try again.',
      //         null,
      //         null
      //       )
      //     );
      // });
      // console.log(updateUserLastSearchTime)
    })
    .catch((err) => {
      return res
        .status(400)
        .json(
          response(
            "PD",
            "You dont have protocols to complete this process.",
            null,
            err
          )
        );
    });
});

/**
 * @swagger
 * /api/user/availableTracks/AggregatonSearch:
 *  post:
 *    tags:
 *      - User
 *    description: Search through available tracks
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    - name: _group
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: _user
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: title
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: genre
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: decade
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: bpm_start
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: bpm_end
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: duration_start
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: duration_end
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: page
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: type
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: artist
 *      type: array
 *      items:
 *        oneOf:
 *          type: string
 *      required: false
 *      in: formData
 *      collectionFormat: multi
 *      description: query
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/AggregatonSearch", async (req, res) => {
  let { authorization } = req.headers;
  let {
    title,
    genre,
    decade,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end,
    seconds,
    range,
    artist,
    _group,
    _user,
    page,
    type
  } = req.body;
  let av_unMatch = {};

  console.log(
    title,
    genre,
    decade,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end,
    seconds,
    range,
    artist,
    _group,
    _user,
    { page }
  );

  let query = availableTrackSearchValidator({
    title,
    genre,
    decade,
    seconds,
    range,
    artist,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end
  });

  let queryMatch = query.length == 0 ? false : true;
  query = query.length == 0 ? undefined : { $match: { $and: query } };
  if (!query) query = { $match: {} };

  // res.json(query)
  if (type === "available") {
    av_unMatch = {
      $match: {
        $expr: {
          $eq: ["$total_tracks_pct", 100]
        }
      }
    };
  } else if (type === "unavailable") {
    av_unMatch = {
      $match: {
        $expr: {
          $ne: ["$total_tracks_pct", 100]
        }
      }
    };
  } else {
    av_unMatch = {
      $match: {
        $expr: {
          $or: [
            { $ne: ["$total_tracks_pct", 100] },
            { $eq: ["$total_tracks_pct", 100] }
          ]
        }
      }
    };
  }

  let tracks = await Group.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(_group) } },
    {
      $lookup: {
        from: "publishers",
        localField: "publishers._id",
        foreignField: "_publisher",
        as: "rspublishers"
      }
    },
    {
      $unwind: "$rspublishers"
    },
    {
      $project: {
        rspublishers: "$rspublishers",
        present: { $in: ["$rspublishers._id", "$_publisher"] },
        as: "ak11"
      }
    },
    {
      $lookup: {
        from: "available_tracks",
        let: {
          tracks_id: "$available_tracks._id",
          total_share: "$available_tracks.total_pub_share",
          publisher_name: "$rspublishers.name",
          available: "$present"
        },
        pipeline: [
          {
            $project: {
              tracksid: "$$tracks_id",
              tot_share: "$$total_share",
              available: "$available",
              publisher: {
                $objectToArray: "$publishers"
              }
            }
          },
          // {$skip: 10 * page},
          // {
          //   $limit: 10
          // },
          {
            $unwind: "$publisher"
          },
          {
            $project: {
              tracks: "$$tracks_id",
              publisher: "$publisher.k",
              available: "$$available",
              percentage: "$publisher.v"
            }
          },
          {
            $match: {
              $expr: {
                $eq: ["$publisher", "$$publisher_name"]
              }
            }
          }
          // , {
          //   $skip: 10 * 1
          // }
        ],
        as: "getpublisher_data"
      }
    },
    {
      $project: {
        // gettracks: tracks,
        getpublisher_data: 1
      }
    },
    {
      $unwind: "$getpublisher_data"
    },
    {
      $group: {
        _id: "$getpublisher_data._id",
        track_pct: {
          $sum: {
            $cond: {
              if: { $eq: ["$getpublisher_data.available", true] },
              then: "$getpublisher_data.percentage",
              else: 0
            }
          }
        }
      }
    },
    {
      $lookup: {
        from: "available_tracks",
        localField: "_id",
        foreignField: "_id",
        as: "rstracks"
      }
    },
    {
      $unwind: "$rstracks"
    },
    {
      $project: {
        rstracks: 1,
        total_tracks_pct: "$track_pct"
      }
    },
    av_unMatch,
    query
  ]);
  // .catch(err => {
  // return res
  //   .status(400)
  //   .json(
  //     response(
  //       'SWR',
  //       'failed',
  //       null,
  //       err
  //     )
  //   );
  // });
  if (tracks) {
    // pagination
    let limit = 10 * (page != undefined ? page * 1 : 0);
    // let paginationData = tracks.slice(limit, limit + 10);
    let paginationData = tracks;

    let allUnavailableTracksForLogging = [];
    paginationData.map((item) => {
      if (item.total_tracks_pct != 100) {
        allUnavailableTracksForLogging.push(item.rstracks);
      }
    });

    // reduce user query count
    let updateUserQueryCount = await User.findOneAndUpdate(
      { _id: _user },
      {
        $inc: {
          query_count: -paginationData.length
        }
      },
      { new: true }
    ).catch((err) => {
      return response("SWR", "Search count not updated", null, err);
    });

    // log history
    let historyObject = new History({
      email: updateUserQueryCount.email,
      query: {
        title,
        genre,
        decade,
        bpm: bpm_start && bpm_end ? `${bpm_start} - ${bpm_end}` : undefined,
        minutes:
          duration_start && duration_end
            ? `${duration_start} - ${duration_end}`
            : undefined,
        seconds,
        range,
        artist
      },
      _track: allUnavailableTracksForLogging,
      success: true,
      type: "TrackNotAvailable"
    });

    if (Object.keys(query["$match"]).length) {
      await historyObject.save();
    }

    return res.status(200).json(
      response(
        "S",
        "Successful",
        {
          allTracksTotalLength: tracks.length,
          pgCount: paginationData.length,
          tracks: paginationData
        },
        null
      )
    );
  } else {
    return res
      .status(400)
      .json(
        response(
          "SWR",
          "Issue while getting all Tracks. Please try later.",
          null,
          null
        )
      );
  }
});

/**
 * @swagger
 * /api/user/availableTracks/search2:
 *  post:
 *    tags:
 *      - User
 *    description: Search through available tracks
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    - name: _group
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: _user
 *      in: formData
 *      required: truer
 *      type: string
 *      description: query
 *    - name: title
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: genre
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: decade
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: bpm_start
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: bpm_end
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: duration_start
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: duration_end
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: page
 *      in: formData
 *      required: false
 *      type: integer
 *      description: query
 *    - name: type
 *      in: formData
 *      required: false
 *      type: string
 *      description: query
 *    - name: artist
 *      type: array
 *      items:
 *        oneOf:
 *          type: string
 *      required: false
 *      in: formData
 *      collectionFormat: multi
 *      description: query
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post("/search2", async (req, res) => {
  let { authorization } = req.headers;
  let {
    title,
    genre,
    decade,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end,
    seconds,
    range,
    artist,
    _group,
    _user,
    page,
    type
  } = req.body;
  let av_unMatch = {};

  console.log(
    title,
    genre,
    decade,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end,
    seconds,
    range,
    artist,
    _group,
    _user,
    { page }
  );

  let query = availableTrackSearchValidator({
    title,
    genre,
    decade,
    seconds,
    range,
    artist,
    bpm_start,
    bpm_end,
    duration_start,
    duration_end
  });

  let queryMatch = query.length == 0 ? false : true;
  query = query.length == 0 ? undefined : { $match: { $and: query } };
  if (!query) query = { $match: {} };

  // res.json(query)
  if (type === "available") {
    av_unMatch = {
      $match: {
        $expr: {
          $eq: ["$total_tracks_pct", 100]
        }
      }
    };
  } else if (type === "unavailable") {
    av_unMatch = {
      $match: {
        $expr: {
          $ne: ["$total_tracks_pct", 100]
        }
      }
    };
  } else {
    av_unMatch = {
      $match: {
        $expr: {
          $or: [
            { $ne: ["$total_tracks_pct", 100] },
            { $eq: ["$total_tracks_pct", 100] }
          ]
        }
      }
    };
  }

  let tracks = await Group.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(_group) } },
    { $unwind: "$pub_names" },
    {
      $project: {
        pub_name: "$pub_names"
      }
    },

    {
      $lookup: {
        from: "available_tracks",
        let: {
          tracks_id: "$available_tracks._id",
          total_share: "$available_tracks.total_pub_share"
          // publisher_name: "$pub_name",
          // available: "$present"
        },
        pipeline: [
          // {
          //   $project: {
          //     // tracks_id: "$available_tracks._id",
          //     totadfasdfl_share: "$$all_publisher",
          //     publisher: "$$all_publisher"
          //     // pct_publisher: "$pct_publisher"
          //   }
          // },

          {
            $project: {
              tracks: "$$tracks_id",
              // publisher: '$publisher.k',
              // available: '$$available',
              percentage: "$$total_share"
            }
          },
          //   {
          //     $unwind: '$all_pubs'
          //   }
          // {
          //   $match: {
          //     $expr: { $in: ["$$pub_name", "$$all_pubssss"] }
          //   }
          // },
          // { $sort: { createdAt: 1 } }, // add sort if needed (for example, if you want first 100 comments by
          // creation date)
          { $limit: 10 }
          // let: {
          //   tracks_id: '$available_tracks._id',
          //   total_share: '$available_tracks.total_pub_share',
          //   publisher_name: '$pub_name',
          //   available: '$present'
          // },
          // pipeline: [
          //   {
          //     $project: {
          //       tracksid: '$$tracks_id',
          //       tot_share: '$$total_share',
          //       available: '$available',
          //       publisher: '$all_pubs'
          //     }
          //   },
          //   {
          //     $unwind: '$all_pubs'
          //   },
          //   {
          //     $project: {
          //       tracks: '$$tracks_id',
          //       publisher: '$publisher.k',
          //       available: '$$available',
          //       percentage: '$publisher.v'
          //     }
          //   },
          //   {
          //     $match: {
          //       $expr: {
          //         $eq: ['$publisher', '$$publisher_name']
          //       }
          //     }
          //   }
        ],
        as: "getpublisher_data"
      }
    }
    // {
    //   $project: {
    //     getpublisher_data: 1
    //   }
    // },
    // {
    //   $unwind: '$getpublisher_data'
    // }
    // {
    //   $unwind: '$getpublisher_data.test_publishers'
    // },
    // {
    //   $group: {
    //     _id: '$getpublisher_data._id',
    //     track_pct: {
    //
    //       $sum:
    //         {
    //           $cond: {
    //             if: {$in: ['$getpublisher_data.test_publishers.pub_name', "$$all_publisher"]},
    //             then: '$getpublisher_data.test_publishers.pub_pec',
    //             else: 0
    //           }
    //         }
    //
    //     }
    //   }
    // }
    // // {$limit: 10},
    // {
    //   $lookup: {
    //     from: 'available_tracks',
    //     localField: '_id',
    //     foreignField: '_id',
    //     as: 'rstracks'
    //
    //   }
    // },
    // {
    //   $unwind: '$rstracks'
    // },
    // {
    //   $project: {
    //     rstracks: 1,
    //     total_tracks_pct: '$track_pct'
    //   }
    // },
    // av_unMatch,
    // query,
  ]);
  // .catch(err => {
  // return res
  //   .status(400)
  //   .json(
  //     response(
  //       'SWR',
  //       'failed',
  //       null,
  //       err
  //     )
  //   );
  // });
  if (tracks) {
    console.log("complete");
    // pagination
    let limit = 10 * (page != undefined ? page * 1 : 0);
    // let paginationData = tracks.slice(limit, limit + 10);
    let paginationData = tracks;

    let allUnavailableTracksForLogging = [];
    paginationData.map((item) => {
      if (item.total_tracks_pct != 100) {
        allUnavailableTracksForLogging.push(item.rstracks);
      }
    });

    // reduce user query count
    // console.log(_user)
    // let updateUserQueryCount = await User.findOneAndUpdate(
    //   {_id: _user},
    //   {
    //     $inc: {
    //       query_count: -paginationData.length
    //     }
    //   },
    //   {new: true}
    // ).catch(err => {
    //   return response('SWR', 'Search count not updated', null, err);
    // });

    // log history
    // let historyObject = new History({
    //   email: updateUserQueryCount.email,
    //   query: {
    //     title,
    //     genre,
    //     decade,
    //     bpm:
    //       bpm_start && bpm_end
    //         ? `${bpm_start} - ${bpm_end}`
    //         : undefined,
    //     minutes:
    //       duration_start && duration_end
    //         ? `${duration_start} - ${duration_end}`
    //         : undefined,
    //     seconds,
    //     range,
    //     artist
    //   },
    //   _track: allUnavailableTracksForLogging,
    //   success: true,
    //   type: 'TrackNotAvailable'
    // });
    //
    // if (Object.keys(query['$match']).length) {
    //   await historyObject.save();
    // }

    return res.status(200).json(
      response(
        "S",
        "Successful",
        {
          allTracksTotalLength: tracks.length,
          pgCount: paginationData.length,
          tracks: paginationData
        },
        null
      )
    );
  } else {
    return res
      .status(400)
      .json(
        response(
          "SWR",
          "Issue while getting all Tracks. Please try later.",
          null,
          null
        )
      );
  }
});

module.exports = router;

// local time limiter with database

// find user
// let getUser = await User.findOne({_id: _user}).catch(err => {
//   return res
//     .status(400)
//     .json(
//       response(
//         'SWR',
//         'Try again.',
//         null,
//         null
//       )
//     );
// });
// if (getUser) {
// rate limter check less then 5 seconds
// if ((Date.now() - getUser.lastSearchAt) < 5000) {
//   return res
//     .status(400)
//     .json(
//       response(
//         'SWR',
//         'You cannot request within 5 seconds. Try again with a gap.',
//         null,
//         null
//       )
//     );
// }

// } else {
//   return res
//     .status(400)
//     .json(
//       response(
//         'SWR',
//         'Invalid user.',
//         null,
//         null
//       )
//     );
// }
