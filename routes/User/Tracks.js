const express = require('express');
const router = express.Router();
const axios = require('axios').default;
const { spotify_url } = require('../../configs/keys');
const History = require('../../models/History');

// models
const GroupsPlaylist = require('../../models/GroupsPlaylist');
const AvailableTracks = require('../../models/AvailableTracks');
const User = require('../../models/User');
const Group = require('../../models/Group');
const { generateLogsForTrack } = require('../../helpers/Logging');

// middleware
const { userAuthVerification } = require('../../middleware/jwt');
const { accessToken } = require('../../middleware/spotify_connector');

// helpers
const { response } = require('../../helpers/responses');
const { arrayEquals } = require('../../helpers/helperFunctions');

const getSpotifyPlaylistTracks = (playlist, limit = 20, offset) => {
  return accessToken()
    .then((spotifyAccess) => {
      return axios.get(
        `https://api.spotify.com/v1/playlists/${playlist}/tracks?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${spotifyAccess}`,
          },
        }
      );
    })
    .catch((err) => {
      console.log(err, 'call rejected');
      return null;
      // return res.status(400).json(response('SomethingWentWrong', null, null, err))
    });

  console.log('>>', playlist, limit, offset);
};

const spotifyTracksProcessor = async (
  playlist,
  getUserGroupDetails,
  type,
  allTracks,
  remaining,
  userPreferences,
  userSideOffset,
  query,
  addToSpotify,
  limit,
  unAvailableTracks,
  maintainUnavailable,
  finalTracks = []
) => {
  console.log(
    'stattsssss',
    { userSideOffset },
    { limit },
    { finalTracks: finalTracks.length }
  );
  let allTrackProcessed = [];
  let availableTracks = [];
  let processedCount = 0;
  let terminatedAt;
  let spotifyTracksResponse = await getSpotifyPlaylistTracks(
    playlist,
    limit,
    userSideOffset
  )
    .then((res) => res.data)
    .catch((err) => {
      console.log('spotifyGetTrack Crashed', err);
      return null;
    });

  let spotifyTracks = spotifyTracksResponse.items;
  for (let i = 0; i < spotifyTracks.length; i++) {
    userSideOffset++;
    let allArtists = [];
    // if (finalTracks.length === 10) {
    //   break
    // }
    if (
      spotifyTracks[i].track &&
      query.length &&
      !spotifyTracks[i].track.name.toLowerCase().includes(query.toLowerCase())
    ) {
      console.log('ignored');
    } else {
      if (spotifyTracks[i].track) {
        spotifyTracks[i].track.matchWithLocalTracks = false;
        spotifyTracks[i].track.newFormatLogReason = {};
        spotifyTracks[i].track.artists.forEach((item) => {
          allArtists.push(item.name);
        });

        let trackMatched = await AvailableTracks.findOne({
          $or: [
            {
              isrc: spotifyTracks[i].track.external_ids.isrc,
            },
            {
              $and: [
                {
                  title: spotifyTracks[i].track.name,
                },
                {
                  artist: { $in: allArtists.join(', ') },
                },
              ],
            },
          ],
        })
          .collation({ locale: 'en', strength: 1 })
          .catch((err) => {});
        // if (type !== 'noMatch') {
        if (type === 'noMatch') {
          console.log(spotifyTracks[i].title);

          if (!trackMatched) {
            spotifyTracks[i].track.matchWithLocalTracks = false;
            spotifyTracks[i].track.matchAtall = false;
            spotifyTracks[i].track.newFormatLogReason.noMatch = 'No Match';
            unAvailableTracks.push(spotifyTracks[i]);
          }
        } else {
          if (trackMatched) {
            console.log(spotifyTracks[i].track.name, '--->> Any match MATCH');
            spotifyTracks[i].track.matchWithLocalTracks = true;
            spotifyTracks[i].track.localTrack = trackMatched._id;

            let filteredTrack = await generateLogsForTrack(
              spotifyTracks[i].track,
              userPreferences,
              type,
              getUserGroupDetails,
              availableTracks
            );
            spotifyTracks[i].track = filteredTrack.track;
            if (filteredTrack.track.matchWithLocalTracks === true) {
              availableTracks.push(spotifyTracks[i]);
              console.log(availableTracks.length, i);
            }
            if (spotifyTracks[i].track.matchWithLocalTracks === false) {
              console.log(
                'Checking the status here',
                spotifyTracks[i].track.matchWithLocalTracks
              );
              unAvailableTracks.push(spotifyTracks[i]);
            }
          } else {
            spotifyTracks[i].track.matchWithLocalTracks = false;
            spotifyTracks[i].track.matchAtall = false;
            spotifyTracks[i].track.newFormatLogReason.noMatch = 'No Match';
            // if (type == 'noMatch')
            unAvailableTracks.push(spotifyTracks[i]);
          }
          // else {
          //   // title and artist not matched
          //   spotifyTracks[i].track.matchWithLocalTracks = false;
          //   spotifyTracks[i].track.matchAtall = false;
          //   spotifyTracks[i].track.newFormatLogReason.noMatch = 'No Match';
          //   unAvailableTracks.push(spotifyTracks[i]);
          // }
        }

        if (
          type == 'available' &&
          finalTracks.length + availableTracks.length == 10
        ) {
          break;
        }
        if (
          (type == 'noMatch' || type == 'unavailable') &&
          finalTracks.length + unAvailableTracks.length == 10
        ) {
          break;
        }
        if (
          type == 'all' &&
          finalTracks.length + allTrackProcessed.length == 10
        ) {
          break;
        }
        // }
        // else {
        //   // title and artist not matched
        //   spotifyTracks[i].track.matchWithLocalTracks = false;
        //   spotifyTracks[i].track.matchAtall = false;
        //   spotifyTracks[i].track.newFormatLogReason.noMatch = 'No Match';
        //   unAvailableTracks.push(spotifyTracks[i]);
        //
        // }
        allTrackProcessed.push(spotifyTracks[i]);

        terminatedAt = i + 1;
      } else {
        // TODO: spotify track is null so probably add noMatch
        // totalTrackCount -= 1
        // spotifyTracks.splice(i, 1);
      }
      processedCount++;
    }
    console.log();
  }

  maintainUnavailable = [...unAvailableTracks];

  if (type == 'unavailable' || type == 'noMatch') {
    finalTracks = [...finalTracks, ...unAvailableTracks];
    unAvailableTracks = [];
    console.log('unavailable');
  }
  if (type == 'available') {
    console.log('available');
    // finalTracks.push([...availableTracks])
    finalTracks = [...finalTracks, ...availableTracks];
  }
  if (type == 'all') {
    console.log('all');
    // finalTracks.push([...allTrackProcessed])
    finalTracks = [...finalTracks, ...allTrackProcessed];
  }

  console.log(finalTracks.length, 'legth length');

  if (spotifyTracks.length && (addToSpotify || finalTracks.length < 10)) {
    return spotifyTracksProcessor(
      playlist,
      getUserGroupDetails,
      type,
      allTracks,
      remaining,
      userPreferences,
      userSideOffset,
      query,
      addToSpotify,
      10,
      unAvailableTracks,
      maintainUnavailable,
      finalTracks
    );
  } else {
    return { finalTracks, userSideOffset, maintainUnavailable };
  }
};

router.post('/filterNew', async (req, res) => {
  let { authorization } = req.headers;
  let {
    playlist,
    _user,
    type,
    allTracks,
    remaining,
    userPreferences,
    addToSpotify,
    userSideOffset,
    query,
  } = req.body;
  let allTrackNotPassedWithPercentage = [];
  let userPreferenceAlias = userPreferences;
  let officialLength = 0;
  let totalTrackCount = 0;
  if (!userSideOffset) userSideOffset = 0;
  // user verification authorization
  await userAuthVerification(authorization)
    .then(async () => {
      let userByAuth = await User.findOne({ _id: _user }).catch((err) => {
        return res
          .status(400)
          .json(response('SWR', 'No user found login again.'));
      });
      let getUserGroupDetails;

      let checkUserQueryCount = await User.findOne({ _id: _user }).catch(
        (err) => {
          return res
            .status(400)
            .json(response('SWR', 'Invalid user.', null, err));
        }
      );
      // limit query check
      if (checkUserQueryCount) {
        if (checkUserQueryCount.query_count <= 0) {
          return res
            .status(429)
            .json(
              response(
                'SWR',
                'You have reached your search limitations.',
                null,
                null
              )
            );
        }
      } else {
        return res
          .status(400)
          .json(response('SWR', 'Invalid User', null, null));
      }

      if (!userByAuth) {
        return res
          .status(400)
          .json(response('SWR', 'No user found login again.'));
      } else {
        getUserGroupDetails = await Group.findOne({
          _id: userByAuth._group,
        })
          .populate({
            model: 'publisher',
            path: '_publisher',
          })
          .catch((err) => {
            return res
              .status(400)
              .json(response('SWR', 'Invalid group details.', null, err));
          });

        if (!getUserGroupDetails.filterByLicencedPublishers) {
          userPreferences.userPublisherFilter = false;
        }
        if (!getUserGroupDetails.filterByLicencedLabels) {
          userPreferences.userLabelFilter = false;
        }
        if (!getUserGroupDetails.filterByLicencedPROs) {
          userPreferences.userPROFilter = false;
        }
      }

      let finalTracks = await spotifyTracksProcessor(
        playlist,
        getUserGroupDetails,
        type,
        allTracks,
        remaining,
        userPreferences,
        addToSpotify ? 0 : userSideOffset,
        query,
        addToSpotify,
        10,
        [],
        [],
        []
      );

      let getPlaylistDetails = await accessToken().then((spotifyAccess) => {
        return axios
          .get(`${spotify_url}/playlists/${playlist}`, {
            headers: {
              Authorization: `Bearer ${spotifyAccess}`,
            },
          })
          .then((playlistDetails) => playlistDetails.data);
      });
      console.log(
        getUserGroupDetails.searchLimit,
        finalTracks.finalTracks.length,
        '-->>>'
      );

      if (type == 'unavailable')
        finalTracks.finalTracks = finalTracks.finalTracks.map((i) => {
          if (i.track.matchAtall == undefined && i) return i;
        });
      finalTracks.finalTracks = finalTracks.finalTracks.filter(function (
        element
      ) {
        return element !== undefined;
      });

      let maintainUnavailable = finalTracks.maintainUnavailable;
      if (!addToSpotify && maintainUnavailable.length && type != 'available') {
        //unAvailableTracks.length is postive
        let destructUnavailableTracks = [];
        maintainUnavailable.forEach((item) =>
          destructUnavailableTracks.push(item.track)
        );
        console.log(userPreferences, 'isUSerPreference');

        let historyObject = new History({
          email: userByAuth.email,
          _group: getUserGroupDetails._id,
          query: {
            playlist_name: getPlaylistDetails.name,
            userPublisherFilter: userPreferenceAlias.filterByLicencedPublishers,
            userLabelFilter: userPreferenceAlias.filterByLicencedLabels,
            userPROFilter: userPreferenceAlias.filterByLicencedPROs,
          },
          _track: destructUnavailableTracks,
          success: false,
          type: 'SpotifyTrackNotAvailable',
        });
        await historyObject.save();
      }

      let updateUserQueryCount = await User.findOneAndUpdate(
        { _id: _user },
        {
          $inc: {
            query_count: -finalTracks.finalTracks.length,
          },
        },
        { new: true }
      ).catch((err) => {
        return response('SWR', 'Search count not updated', null, err);
      });

      let updateGroupLimit = await Group.findOneAndUpdate(
        { _id: userByAuth._group },
        {
          $inc: {
            // searchLimit: -finalTracks.finalTracks.length
            searchLimit: 0,
          },
        },
        { new: true }
      ).catch((err) => {
        return response('SWR', 'Group count not updated', null, err);
      });

      // update user last search time to prevent attacks
      let updateUserLastSearchTime = await User.findOneAndUpdate(
        { _id: _user },
        {
          $set: {
            lastSearchAt: Date.now(),
          },
        }
      ).catch((err) => {
        return res.status(400).json(response('SWR', 'Try again.', null, null));
      });

      return res
        .status(200)
        .json(
          response(
            'S',
            'successful',
            { count: finalTracks.finalTracks.length, ...finalTracks },
            null
          )
        );
    })
    .catch((err) => {
      return res
        .status(400)
        .json(
          response(
            'PD',
            'You dont have protocols to complete this process.',
            null,
            err
          )
        );
    });
});

router.post('/filterNewOld', async (req, res) => {
  let { authorization } = req.headers;
  let {
    playlist,
    _user,
    type,
    allTracks,
    remaining,
    userPreferences,
    addToSpotify,
  } = req.body;

  let allTrackNotPassedWithPercentage = [];
  let officialLength = 0;
  let totalTrackCount = 0;
  // user verification authorization
  await userAuthVerification(authorization).then(async () => {
    // spotify access token
    let spotifyAccess = await accessToken().catch((err) => {
      console.log('failed');
    });

    let checkUserQueryCount = await User.findOne({ _id: _user }).catch(
      (err) => {
        return res
          .status(400)
          .json(response('SWR', 'Invalid user.', null, err));
      }
    );
    // limit query check
    if (checkUserQueryCount) {
      if (checkUserQueryCount.query_count <= 0) {
        return res
          .status(429)
          .json(
            response(
              'SWR',
              'You have reached your search limitations.',
              null,
              null
            )
          );
      }
    } else {
      return res.status(400).json(response('SWR', 'Invalid User', null, null));
    }

    totalTrackCount = allTracks.length;
    let getPlaylistDetails = {};
    await axios
      .get(`${spotify_url}/playlists/${playlist}`, {
        headers: {
          Authorization: `Bearer ${spotifyAccess}`,
        },
      })
      .then((playlistDetails) => {
        getPlaylistDetails = playlistDetails.data;
      });

    for (let i = 0; i < allTracks.length; i++) {
      let allArtists = [];

      if (allTracks[i].track) {
        allTracks[i].track.matchWithLocalTracks = false;
        /// Match with isrc
        allTracks[i].track.artists.forEach((item) => {
          allArtists.push(item.name);
        });
        let trackMatched = await AvailableTracks.findOne({
          $or: [
            {
              isrc: allTracks[i].track.external_ids.isrc,
            },
            {
              $and: [
                {
                  title: allTracks[i].track.name,
                },
                {
                  artist: { $in: allArtists.join(', ') },
                },
              ],
            },
          ],
        })
          .collation({ locale: 'en', strength: 1 })
          .catch((err) => {});

        if (trackMatched) {
          console.log(allTracks[i].track.name, '--->> Any match MATCH');
          allTracks[i].track.matchWithLocalTracks = true;
          allTracks[i].track.localTrack = trackMatched._id;
        } else {
          // title and artist not matched
          allTracks[i].track.matchWithLocalTracks = false;
          allTracks[i].track.matchAtall = false;
          // console.log(allTracks[i].track.name, '--> No match for the track');
        }
        // console.log('---------------');
      } else {
        totalTrackCount -= 1;
        // allTracks.splice(i, 1);
      }
    }

    console.log('Hitting! ->>>>>>>>>>>>>>>>', allTracks.length);
    // get user
    let unAvailableTracks = [];
    let allTrackProcessed = [];
    let availableTracks = [];
    let terminatedOnIndex;
    let userByAuth = await User.findOne({ _id: _user }).catch((err) => {
      return res
        .status(400)
        .json(response('SWR', 'No user found login again.'));
    });
    if (userByAuth) {
      let getUserGroupDetails = await Group.findOne({
        _id: userByAuth._group,
      })
        .populate({
          model: 'publisher',
          path: '_publisher',
        })
        .catch((err) => {
          return res
            .status(400)
            .json(response('SWR', 'Invalid group details.', null, err));
        });

      // get user group details
      if (getUserGroupDetails) {
        for (let i = 0; i < allTracks.length; i++) {
          if (allTracks[i].track) {
            allTracks[i].track.newFormatLogReason = {};
            allTracks[i].track.logReason = [];
          }
          if (remaining) {
            if (
              allTracks[i].track &&
              (allTracks[i].track.matchWithLocalTracks != null ||
                allTracks[i].track.matchAtall != null)
            ) {
              // {
              //   filterByLicencedPublishers: false,
              //     filterByLicencedLabels: false,
              //   filterByLicencedPROs: false
              // }
              let filteredTrack = await generateLogsForTrack(
                allTracks[i].track,
                userPreferences,
                type,
                getUserGroupDetails,
                availableTracks
              );
              // if (filteredTrack.availableTracks) {
              allTracks[i].track = filteredTrack.track;
              if (filteredTrack.track.matchWithLocalTracks === true) {
                availableTracks = filteredTrack.availableTracks;
              }
              if (allTracks[i].track.matchWithLocalTracks === false) {
                unAvailableTracks.push(allTracks[i]);
              }
            } else {
              if (allTracks[i].track) {
                allTracks[i].track.newFormatLogReason.noMatch = 'No Match';
                unAvailableTracks.push(allTracks[i]);
              }
              console.log('straight away not available', i);
            }
            if (type == 'all') {
              console.log('In all ', i);
              // remaining -= 1
              allTrackProcessed.push(allTracks[i]);
            }
          }
          --remaining;
          if (!remaining) {
            terminatedOnIndex = i + 1;
            break;
          }
          // console.log('=====> newFormatLogReason >>', allTracks[i].track.newFormatLogReason)
        }
        // return res.json("Killed")

        console.log('simpleUnMatchWithSpotifyTracks', unAvailableTracks.length);
        // save all not matched track in logs collection
        if (unAvailableTracks.length && type != 'available') {
          //unAvailableTracks.length is postive
          let destructUnavailableTracks = [];
          unAvailableTracks.forEach((item) =>
            destructUnavailableTracks.push(item.track)
          );
          let historyObject = new History({
            email: userByAuth.email,
            _group: getUserGroupDetails._id,
            query: {
              playlist_name: getPlaylistDetails.name,
            },
            _track: destructUnavailableTracks,
            success: false,
            type: 'SpotifyTrackNotAvailable',
          });
          await historyObject.save();
        }

        // save all not matched track in logs collection
        // if (allTrackNotPassedWithPercentage.length) {
        //   let historyObject = new History({
        //     email: userByAuth.email,
        //     _group: getUserGroupDetails._id,
        //     query: {
        //       playlist_name: getPlaylistDetails.name
        //     },
        //     _track: allTrackNotPassedWithPercentage,
        //     success: true,
        //     type: 'SpotifyTrackNotAvailable'
        //   });
        //   await historyObject.save();
        // }

        // decrease query limit counter
        let updateUserQueryCount = await User.findOneAndUpdate(
          { _id: _user },
          {
            $inc: {
              query_count: -allTrackProcessed.length,
            },
          },
          { new: true }
        ).catch((err) => {
          return response('SWR', 'Search count not updated', null, err);
        });

        // update user last search time to prevent attacks
        let updateUserLastSearchTime = await User.findOneAndUpdate(
          { _id: _user },
          {
            $set: {
              lastSearchAt: Date.now(),
            },
          }
        ).catch((err) => {
          return res
            .status(400)
            .json(response('SWR', 'Try again.', null, null));
        });
        console.log(allTracks.length);
        let finalTracks = [];
        if (type == 'unavailable') {
          finalTracks = unAvailableTracks;
        } else if (type == 'available') {
          finalTracks = availableTracks;

          console.log(finalTracks.length, '=>>>>>>');
        } else {
          console.log('all ');
          finalTracks = allTrackProcessed;
        }

        console.log({ finalTracks: finalTracks.length });

        if (!terminatedOnIndex) terminatedOnIndex = allTracks.length;
        return res.status(200).json(
          response(
            'S',
            'successful',
            {
              totalTrackCount,
              totalTracks: officialLength,
              tracks: finalTracks,
              terminatedOnIndex,
            },
            null
          )
        );
      } else {
        return res
          .status(400)
          .json(response('SWR', 'Group details invalid.', null, null));
      }
    } else {
      return res.status(400).json(response('SWR', 'Invalid auth.'));
    }
  });
});

/**
 * @swagger
 * /api/user/tracks/filter:
 *  post:
 *    tags:
 *      - User
 *    description: Filter all tracks of a platlist
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: user
 *    - name: playlist
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    - name: _user
 *      in: formData
 *      required: true
 *      type: string
 *      description: _id
 *    - name: page
 *      in: formData
 *      required: true
 *      type: integer
 *      description: page #
 *    - name: type
 *      in: formData
 *      required: true
 *      type: string
 *      description: page #
 *    - name: addToSpotify
 *      in: formData
 *      required: true
 *      type: boolean
 *      description: are you adding to spotify
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/filter', async (req, res) => {
  let { authorization } = req.headers;
  let { playlist, _user, page, type, addToSpotify, trackLimit } = req.body;
  let allTracks = [];
  let allTrackNotPassedWithPercentage = [];
  let officialLength = 0;
  let totalTrackCount = 0;

  // user verification authorization
  await userAuthVerification(authorization)
    .then(async () => {
      // spotify access token
      let spotifyAccess = await accessToken().catch((err) => {
        console.log('failed');
      });
      // find user by user _id
      // let getUser = await User.findOne({_id: _user}).catch(err => {
      //   return res
      //     .status(400)
      //     .json(
      //       response(
      //         'SWR',
      //         'Try again.',
      //         null,
      //         err
      //       )
      //     );
      // });
      // if (getUser) {
      // throtling check
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

      let checkUserQueryCount = await User.findOne({ _id: _user }).catch(
        (err) => {
          return res
            .status(400)
            .json(response('SWR', 'Invalid user.', null, err));
        }
      );
      // limit query check
      if (checkUserQueryCount) {
        if (checkUserQueryCount.query_count <= 0) {
          return res
            .status(429)
            .json(
              response(
                'SWR',
                'You have reached your search limitations.',
                null,
                null
              )
            );
        }
      } else {
        return res
          .status(400)
          .json(response('SWR', 'Invalid User', null, null));
      }
      // all tracks of a playlist
      await axios
        .get(
          `${spotify_url}/playlists/${playlist}/tracks?limit=${trackLimit}&offset=${
            (page - 1) * 10
          }`,
          {
            // .get(`${spotify_url}/playlists/${playlist}/tracks`, {
            headers: {
              Authorization: `Bearer ${spotifyAccess}`,
            },
          }
        )
        .then(async function (tracks) {
          totalTrackCount = tracks.data.total;
          // console.log(tracks.data.total, '------Get all tracks response')

          //?limit=${10}&offset=${(pageNo - 1) * 10}
          // get playlist details
          let getPlaylistDetails = {};
          // get playlist
          await axios
            .get(`${spotify_url}/playlists/${playlist}`, {
              headers: {
                Authorization: `Bearer ${spotifyAccess}`,
              },
            })
            .then((playlistDetails) => {
              getPlaylistDetails = playlistDetails.data;
            });
          allTracks = tracks.data.items;
          console.log(allTracks[0].track.album);
          // return res.json('killed')
          console.log(allTracks.length, '----');
          for (let i = 0; i < allTracks.length; i++) {
            let titleAndArtisMatch = [];
            // console.log(Object.keys(allTracks[i].track))
            if (allTracks[i].track) {
              allTracks[i].track.matchWithLocalTracks = false;
              let isrc = allTracks[i].track.external_ids.isrc;
              /// Match with isrc
              let matchICRC = await AvailableTracks.findOne({
                isrc,
              })
                .collation({ locale: 'en', strength: 1 })
                .catch((err) => {});

              // isrc matched
              if (matchICRC) {
                console.log(allTracks[i].track.name);
                allTracks[i].track.matchWithLocalTracks = true;
                allTracks[i].track.localTrack = matchICRC._id;
              } else {
                // isrc not matched, matching title and artist
                let allArtists = [];

                // make a simple array of of all artists of a tracks from playlist
                // let concatinated = allTracks[i].track.artists.map(item => {
                //   return item.name.replace(/[^a-zA-Z0-9]/g, '');
                // }).join('');
                //
                //
                allTracks[i].track.artists.map((item) => {
                  allArtists.push(item.name);
                });

                // find tracks based on title and artists
                console.log(allTracks[i].track.name);
                // console.log(concatinated)
                titleAndArtisMatch = await AvailableTracks.findOne({
                  title: allTracks[i].track.name,
                  artist: { $in: allArtists.join(', ') },
                })
                  .collation({ locale: 'en', strength: 1 })
                  .catch((err) => {
                    console.log(err);
                  });
                // is title and artist is a match
                if (titleAndArtisMatch) {
                  console.log('A & T match');
                  allTracks[i].track.matchWithLocalTracks = true;
                  allTracks[i].track.localTrack = titleAndArtisMatch._id;
                } else {
                  // title and artist not matched
                  allTracks[i].track.matchWithLocalTracks = false;
                  allTracks[i].track.matchAtall = false;
                  console.log(allTracks[i].track.name, 'matchAtall');
                }
              }
              console.log('---------------');
            } else {
              console.log('remoevddd');
              totalTrackCount -= 1;
              allTracks.splice(i, 1);
            }
          }

          // let spotifyNotMatched = [];
          // for (let z = 0; z < allTracks.length; z++) {
          //   spotifyNotMatched.push(allTracks[z].track);
          // }

          console.log('Hitting! ->>>>>>>>>>>>>>>>', allTracks.length);
          // get user
          let userByAuth = await User.findOne({ _id: _user }).catch((err) => {
            return res
              .status(400)
              .json(response('SWR', 'No user found login again.'));
          });
          if (userByAuth) {
            let getUserGroupDetails = await Group.findOne({
              _id: userByAuth._group,
            })
              .populate({
                model: 'publisher',
                path: '_publisher',
              })
              .catch((err) => {
                return res
                  .status(400)
                  .json(response('SWR', 'Invalid group details.', null, err));
              });

            // get user group details
            if (getUserGroupDetails) {
              for (let i = 0; i < allTracks.length; i++) {
                if (allTracks[i].track) {
                  let total_share = 0;

                  // find available tracks match
                  let getTrack = await AvailableTracks.findOne({
                    _id: allTracks[i].track.localTrack,
                  }).catch((err) => console.log(err));

                  // user groups publisher
                  if (getTrack) {
                    for (
                      let j = 0;
                      j < getUserGroupDetails._publisher.length;
                      j++
                    ) {
                      if (getUserGroupDetails._publisher[j]) {
                        let isPublisherInIt =
                          getTrack.publishers[
                            getUserGroupDetails._publisher[j].name
                          ];
                        if (isPublisherInIt) {
                          // clean percentage share %
                          let number = parseFloat(
                            isPublisherInIt.split('%')[0] * 1
                          );
                          total_share += number;
                        }

                        // if match by 100 track matches
                        if (total_share == 100) {
                          allTracks[i].track.matchWithLocalTracks = true;
                          break;
                        } else {
                          allTracks[i].track.matchWithLocalTracks = false;
                          allTracks[i].track.publisherUnMatch = false;
                        }
                      } else {
                        allTracks[i].track.matchWithLocalTracks = false;
                        allTracks[i].track.publisherUnMatch = false;
                      }
                    }
                  }
                } else {
                  console.log('elsedddd');
                }
                console.log('-------------------------');
              }

              let allAvailableTrackForPagination = [];
              let allUNAvailableTrackForPagination = [];
              for (let i = 0; i < allTracks.length; i++) {
                if (
                  allTracks[i].track &&
                  allTracks[i].track.matchWithLocalTracks === true
                ) {
                  allAvailableTrackForPagination.push(allTracks[i]);
                } else {
                  allUNAvailableTrackForPagination.push(allTracks[i]);
                }
              }

              // pagination
              let limit = 10 * (page != undefined ? (page - 1) * 1 : 0);
              if (type === 'available') {
                officialLength = allAvailableTrackForPagination.length;
                totalTrackCount = allAvailableTrackForPagination.length;
                console.log('av', officialLength);
              } else if (type === 'unavailable') {
                console.log('un', officialLength);
                officialLength = allUNAvailableTrackForPagination.length;
                totalTrackCount = allUNAvailableTrackForPagination.length;
              } else {
                officialLength = allTracks.length;
                console.log(officialLength);
              }

              // pagination slicing
              if (type === 'available') {
                console.log(!!addToSpotify, typeof addToSpotify);
                if (addToSpotify === false) {
                  allTracks = allAvailableTrackForPagination.slice(
                    limit,
                    limit + 10
                  );
                  console.log('isFalse', allTracks.length);
                } else {
                  allTracks = allAvailableTrackForPagination;
                  console.log('isTrue', allTracks.length);
                }
              } else if (type === 'unavailable') {
                allTracks = allUNAvailableTrackForPagination.slice(
                  limit,
                  limit + 10
                );
              }

              // assemble all unmatched tracks for logging
              let takingOutAllPublishersUnMatched = [];
              for (let i = 0; i < allTracks.length; i++) {
                if (allTracks[i].track.publisherUnMatch === false) {
                  takingOutAllPublishersUnMatched.push(allTracks[i]);
                }
              }
              for (let i = 0; i < takingOutAllPublishersUnMatched.length; i++) {
                let getTrack = await AvailableTracks.findOne({
                  _id: takingOutAllPublishersUnMatched[i].track.localTrack,
                })
                  .lean()
                  .catch((err) => console.log(err));
                getTrack.spotifyTrackName =
                  takingOutAllPublishersUnMatched[i].track.name;
                getTrack.spotifyTrackURI =
                  takingOutAllPublishersUnMatched[i].track.uri;
                getTrack.spotifyTrackArtists =
                  takingOutAllPublishersUnMatched[i].track.artists;

                // traverse all tracks and check which publisher didnt matched
                for (
                  let j = 0;
                  j < getUserGroupDetails._publisher.length;
                  j++
                ) {
                  if (
                    getTrack.publishers[getUserGroupDetails._publisher[j].name]
                  ) {
                    // if matched a publisher that was on both side make it undefined so if will remove from object
                    delete getTrack.publishers[
                      getUserGroupDetails._publisher[j].name
                    ];
                  }
                }
                // console.log(Object.keys(getTrack.publishers).length > 0);
                if (Object.keys(getTrack.publishers).length > 0) {
                  allTrackNotPassedWithPercentage.push(getTrack);
                }
              }
              // console.log(allTrackNotPassedWithPercentage)
              let simpleUnMatchWithSpotifyTracks = [];
              for (let i = 0; i < allTracks.length; i++) {
                if (allTracks[i].track.matchAtall === false) {
                  simpleUnMatchWithSpotifyTracks.push(allTracks[i].track);
                }
              }

              console.log(
                'simpleUnMatchWithSpotifyTracks',
                simpleUnMatchWithSpotifyTracks.length
              );
              // save all not matched track in logs collection
              if (simpleUnMatchWithSpotifyTracks.length) {
                let historyObject = new History({
                  email: userByAuth.email,
                  _group: getUserGroupDetails._id,
                  query: {
                    playlist_name: getPlaylistDetails.name,
                  },
                  _track: simpleUnMatchWithSpotifyTracks,
                  success: false,
                  type: 'SpotifyTrackNotAvailable',
                });
                await historyObject.save();
              }

              // save all not matched track in logs collection
              if (allTrackNotPassedWithPercentage.length) {
                let historyObject = new History({
                  email: userByAuth.email,
                  _group: getUserGroupDetails._id,
                  query: {
                    playlist_name: getPlaylistDetails.name,
                  },
                  _track: allTrackNotPassedWithPercentage,
                  success: true,
                  type: 'SpotifyTrackNotAvailable',
                });
                await historyObject.save();
              }

              // decrease query limit counter
              let updateUserQueryCount = await User.findOneAndUpdate(
                { _id: _user },
                {
                  $inc: {
                    query_count: -allTracks.length,
                  },
                },
                { new: true }
              ).catch((err) => {
                return response('SWR', 'Search count not updated', null, err);
              });

              // update user last search time to prevent attacks
              let updateUserLastSearchTime = await User.findOneAndUpdate(
                { _id: _user },
                {
                  $set: {
                    lastSearchAt: Date.now(),
                  },
                }
              ).catch((err) => {
                return res
                  .status(400)
                  .json(response('SWR', 'Try again.', null, null));
              });
              console.log(allTracks.length);
              return res.status(200).json(
                response(
                  'S',
                  'successful',
                  {
                    totalTrackCount,
                    totalTracks: officialLength,
                    tracks: allTracks,
                  },
                  null
                )
              );
            } else {
              return res
                .status(400)
                .json(response('SWR', 'Group details invalid.', null, null));
            }
          } else {
            return res.status(400).json(response('SWR', 'Invalid auth.'));
          }
        })
        .catch(function (error) {
          console.log(error.message);
          return res
            .status(400)
            .json(response('SWR', 'Try later.', null, { err: error }));
        });
    })
    .catch((err) => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

/**
 * @swagger
 * /api/user/tracks/curatedFilter:
 *  post:
 *    tags:
 *      - User
 *    description: Filter all tracks of a curated platlist
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: user
 *    - name: playlist
 *      in: formData
 *      required: true
 *      type: string
 *      description: user
 *    - name: _user
 *      in: formData
 *      required: true
 *      type: string
 *      description: _id
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/curatedFilter', async (req, res) => {
  let { authorization } = req.headers;
  let { playlist, _user } = req.body;
  let allTracks = [];

  // user verification
  await userAuthVerification(authorization)
    .then(async () => {
      // spotify access token

      let checkUserQueryCount = await User.findOne({ _id: _user }).catch(
        (err) => {
          return res
            .status(400)
            .json(response('SWR', 'Invalid user.', null, err));
        }
      );
      // limit query check
      if (checkUserQueryCount) {
        if (checkUserQueryCount.query_count <= 0) {
          return res
            .status(429)
            .json(
              response(
                'SWR',
                'You have reached your search limitations.',
                null,
                null
              )
            );
        }
      } else {
        return res
          .status(400)
          .json(response('SWR', 'Invalid User', null, null));
      }

      let spotifyAccess = await accessToken().catch((err) => {
        console.info(err);
      });

      // get all playlists
      await axios
        .get(`${spotify_url}/playlists/${playlist}/tracks`, {
          headers: {
            Authorization: `Bearer ${spotifyAccess}`,
          },
        })
        .then(async function (tracks) {
          // get playlist details
          allTracks = tracks.data.items;

          let allArtists = [];
          let allTitles = [];
          let allTrackISRCs = allTracks.map(
            (item) => item.track.external_ids.isrc
          );

          allTracks.forEach((item) => {
            allArtists = [
              ...allArtists,
              ...item.track.artists.map((item) => item.name),
            ];
            allTitles.push(item.track.name);
            item.track.matchWithLocalTracks = false;
          });

          let allMatchingTracks = await AvailableTracks.find({
            $or: [
              {
                isrc: allTrackISRCs,
              },
              {
                $and: [{ artist: allArtists }, { title: allTitles }],
              },
            ],
          });

          let filteredTracks = [];

          // console.log(allTracks);
          for (let i = 0; i < allMatchingTracks.length; i++) {
            // console.log(allMatchingTracks[i]);
            for (let j = 0; j < allTracks.length; j++) {
              if (
                allTracks[j].track.external_ids.isrc ==
                allMatchingTracks[i].isrc
              ) {
                allTracks[j].track.matchWithLocalTracks = true;
                allTracks[j].track.localTrack = allMatchingTracks[i]._id;
                filteredTracks.push(allTracks[j]);
                continue;
              }
              //   // console.log(allTracks[j]);
              let itemArtists = allTracks[j].track.artists.map(
                (item) => item.name
              );

              let isMatch = arrayEquals(
                itemArtists,
                allMatchingTracks[i].artist
              );

              if (
                isMatch &&
                allTracks[j].track.name == allMatchingTracks[i].title
              ) {
                allTracks[j].track.matchWithLocalTracks = true;
                allTracks[j].track.localTrack = allMatchingTracks[i]._id;
                filteredTracks.push(allTracks[j]);
                continue;
              }
              filteredTracks.push(allTracks[j]);
            }
          }

          if (allMatchingTracks.length > 0 && filteredTracks.length > 0)
            allTracks = filteredTracks;

          let userByAuth = await User.findOne({ _id: _user }).catch((err) => {
            return res
              .status(400)
              .json(response('SWR', 'No user found login again.'));
          });
          if (userByAuth) {
            // get group details
            let getUserGroupDetails = await Group.findOne({
              _id: userByAuth._group,
            })
              .populate({
                model: 'publisher',
                path: '_publisher',
              })
              .catch((err) => {
                return res
                  .status(400)
                  .json(response('SWR', 'Invalid group details.', null, err));
              });

            if (getUserGroupDetails) {
              for (let i = 0; i < allTracks.length; i++) {
                // all unmatched tracks based on publishers
                if (allTracks[i].track.matchWithLocalTracks) {
                  let total_share = 0;
                  let getTrack = await AvailableTracks.findOne({
                    _id: allTracks[i].track.localTrack,
                  }).catch((err) => console.log(err));

                  for (
                    let j = 0;
                    j < getUserGroupDetails._publisher.length;
                    j++
                  ) {
                    if (getUserGroupDetails._publisher[j]) {
                      let isPublisherInIt =
                        getTrack.publishers[
                          getUserGroupDetails._publisher[j].name
                        ];
                      if (isPublisherInIt) {
                        // split percentage number
                        let number = parseFloat(
                          isPublisherInIt.split('%')[0] * 1
                        );
                        total_share += number;
                      }

                      if (total_share == 100) {
                        // a matched
                        allTracks[i].track.matchWithLocalTracks = true;
                        break;
                      } else {
                        // allTracks[i].track.matchWithLocalTracks = false;
                        allTracks[i].track.matchWithLocalTracks = false;
                      }
                    } else {
                      allTracks[i].track.matchWithLocalTracks = false;
                    }
                  }
                }
              }
            }
          }

          return res
            .status(200)
            .json(response('S', 'successful', { tracks: allTracks }, null));
        })
        .catch(function (error) {
          return res
            .status(400)
            .json(response('SWR', 'Try later.', null, { err: error }));
        });
    })
    .catch((err) => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

module.exports = router;
