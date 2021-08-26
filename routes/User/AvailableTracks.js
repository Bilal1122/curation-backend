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
        let isPassLength =
          allAvailableTracks.length > 10 ? 10 : allAvailableTracks.length;
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

        if (allUNAvailable.length) {
          console.log("Logging need");
          console.log("isthelength", allUNAvailable.length);
          console.log(duration_start.length && duration_end.length
              ? `${duration_start} - ${duration_end}`
              : undefined,)
          if (filterPreferences.userPublisherFilter) {
            for (let i = 0; i < allUNAvailable.length; i++) {
              for (let j = 0; j < remaining_pubs.length; j++) {
                // publisher exists or not in the tracks
                if (
                  allUNAvailable[i].publishers &&
                  allUNAvailable[i].publishers[remaining_pubs[j]] &&
                  allUNAvailable[i].publishers[remaining_pubs[j].toString()]
                ) {
                  allUNAvailable[i].publishers[remaining_pubs[j]] = undefined;
                }
              }
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
                duration_start.length && duration_end.length
                  ? `${duration_start} - ${duration_end}`
                  : undefined,
              seconds,
              range,
              artist,
              ...filterPreferences,
              isrc: isrc?.length ? isrc : undefined
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
      }
      else {
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

module.exports = router;
