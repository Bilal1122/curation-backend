const express = require('express');
const router = express.Router();
const axios = require('axios');
const {spotify_url} = require('../../configs/keys');

// models
const GroupsPlaylist = require('../../models/GroupsPlaylist');

// middleware
const {userAuthVerification} = require('../../middleware/jwt');
const {isValid} = require('../../middleware/validators');
const {accessToken} = require('../../middleware/spotify_connector');

// helpers
const {response} = require('../../helpers/responses');

/**
 * @swagger
 * /api/user/playlist/adminPlaylist:
 *  post:
 *    tags:
 *      - User
 *    description: Get all playlists added by admin to group
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: user
 *    - name: _group
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
router.post('/adminPlaylist', async (req, res) => {
  let {authorization} = req.headers;
  let {_group} = req.body;
  let allPlaylistAvailable = [];
  let {limit, skip} = req.body;
  // user verification

  if (isNaN(limit) && !isNaN(skip)) {
    limit = 10;
    skip = 0
  }
  await userAuthVerification(authorization)
    .then(async () => {
      // Find Admin using email
      let dataCount = await GroupsPlaylist.countDocuments({_group});
      let groupPlaylist = await GroupsPlaylist.find({_group})
        .sort({createdAt:-1})
        // .skip(skip)
        // .limit(limit)
        .catch(err => {
          return res
            .status(400)
            .json(response('SWR', 'Invalid Email', null, err));
        });

      if (groupPlaylist) {
        // spotify user access token
        let spotifyAccess = await accessToken().catch(err => {
          console.log('failed');
        });
        for (let i = 0; i < groupPlaylist.length; i++) {
          // get playlist details
          await axios
            .get(`${spotify_url}/playlists/${groupPlaylist[i].playlist}`, {
              headers: {
                Authorization: `Bearer ${spotifyAccess}`
              }
            })
            .then(function (response) {
              // handle success
              allPlaylistAvailable.push(response.data);
            })
            .catch(function (error) {
              return res.status(400).json(response('SWR', 'Try later.'));
            });
        }
        return res
          .status(200)
          .json(
            response(
              'S',
              'successful',
              {
                playlists: allPlaylistAvailable,
                dataCount: dataCount
              },
              null
            )
          );
      }
      else {
        return res
          .status(400)
          .json(
            response('SWR', 'Admin has not connect any playlist. Coming soon!')
          );
      }
    })
    .catch(err => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

module.exports = router;
