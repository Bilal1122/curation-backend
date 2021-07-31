const express = require("express");
const router = express.Router();
const axios = require("axios");
const { spotify_url } = require("../../configs/keys");

// KEYS
const KEYS = require("../../configs/keys");

// models
const Admin = require("../../models/Admin");

// middleware
const { adminAuthVerification } = require("../../middleware/jwt");
const { accessToken } = require("../../middleware/spotify_connector");

// helpers
const { response } = require("../../helpers/responses");

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
router.get("/spotifyPlaylists", async (req, res) => {
  let { authorization } = req.headers;
  const skip = parseInt(req.query.skip);
  const limit = parseInt(req.query.limit);

  // admin auth token verification
  await adminAuthVerification(authorization)
    .then(async () => {
      // Find Admin using email
      let adminSpotify = await Admin.findOne().catch((err) => {
        return res
          .status(400)
          .json(response("SWR", "Invalid Email", null, err));
      });

      // get spotifyAccess token
      let spotifyAccess = await accessToken().catch((err) => {
        console.log("failed");
      });
      if (adminSpotify) {
        // get all playlist of developer account
        await axios
          .get(
            `${spotify_url}/users/${KEYS.spotifyAdminUserName}/playlists?limit=${limit}&offset=${skip}`,
            {
              headers: {
                Authorization: `Bearer ${spotifyAccess}`,
              },
            }
          )
          .then(function (respon) {
            // handle success

            console.log(respon, "90909090");
            console.log(skip, limit);
            let total = respon.data.total;
            console.log(total);
            let response_data = JSON.parse(JSON.stringify(respon.data));
            delete response_data.href;
            delete response_data.next;
            // console.log(respon.data.items.length);
            return res
              .status(200)
              .json(response("S", "Spotity playlists!", response_data, null));
          })
          .catch(function (error) {
            // handle error
            console.log({ error });
            return res
              .status(400)
              .json(
                response("SWR", "Spotity not responding!", null, { err: error })
              );
          });
      } else {
        return res
          .status(400)
          .json(
            response("SWR", "Admin has not connect any playlist. Coming soon!")
          );
      }
    })
    .catch((err) => {
      return res.status(400).json(response("PD", null, null, err));
    });
});

module.exports = router;
