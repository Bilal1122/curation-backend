const express = require('express');
const router = express.Router();
const axios = require('axios');
const { spotify_url } = require('../../configs/keys');

// KEYS
const KEYS = require('../../configs/keys');

// models
const Admin = require('../../models/Admin');

// middleware
const { adminAuthVerification } = require('../../middleware/jwt');
const { accessToken } = require('../../middleware/spotify_connector');

// helpers
const { response } = require('../../helpers/responses');

/**
 * @swagger
 * /api/admin/playlists/spotifyPlaylists:
 *  get:
 *    tags:
 *      - Admin Playlist
 *    description: Get all playlists from admin
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: admin
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.get('/spotifyPlaylists', async (req, res) => {
  let { authorization } = req.headers;
  let { query, skip, limit } = req.query;
  skip = parseInt(skip);
  limit = parseInt(limit);
  query = req.query.query;
  // admin auth token verification
  await adminAuthVerification(authorization)
    .then(async () => {
      let adminSpotify = await Admin.findOne().catch((err) => {
        return res
          .status(400)
          .json(response('SWR', 'Invalid Email', null, err));
      });

      if (!adminSpotify) {
        return res
          .status(400)
          .json(
            response('SWR', 'Admin has not connect any playlist. Coming soon!')
          );
      }

      await getSpotifyPlaylist(query, [], limit,  0, (data) => {
        console.log({ data: data.data.length }, '##', query);
        let items = data.data.filter((item) => {
          const value = item.name;
          return value.toLowerCase().indexOf(query.toLowerCase()) > -1;
        });
        console.log({ skip, limit, all: skip + limit });
        return res.status(200).json(
          response(
            'S',
            'Spotity playlists!',
            {
              data: items.slice(skip, skip + limit),
              skip,
              limit,
              total: items.length,
            },
            null
          )
        );
      });
    })
    .catch((err) => {
      console.log(err.message);
      // return res.status(400).json(response('PD', null, null, err));
    });
});

async function getSpotifyPlaylist(searchQuery, data, limit, skip, cb) {
  const respon = await axios
    .get(
      `${spotify_url}/users/${KEYS.spotifyAdminUserName}/playlists?limit=${limit}&offset=${skip}`,
      {
        headers: {
          Authorization: `Bearer ${await accessToken()}`,
        },
      }
    )
    .catch((error) => {
      console.log({ error });
      throw error;
    });

  // if (!respon && !respon?.data)
  //   return cb({
  //     data,
  //     skip: response_data.offset,
  //     limit: response_data.limit,
  //     total: response_data.total,
  //   });

  const response_data = JSON.parse(JSON.stringify(respon.data));
  const next = response_data.next;
  data = [...data, ...response_data.items];
  console.log('###3', next);
  if (!next)
    return cb({
      data,
      skip: response_data.offset,
      limit: response_data.limit,
      total: response_data.total,
    });

  console.log('-------------');

  skip += limit;
  getSpotifyPlaylist(searchQuery, data, limit, skip, cb);
}

module.exports = router;
