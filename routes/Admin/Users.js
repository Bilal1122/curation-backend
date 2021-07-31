const express = require('express');
const router = express.Router();

// models
const User = require('../../models/User');

// middleware
const {adminAuthVerification} = require('../../middleware/jwt');
const {accessToken} = require('../../middleware/spotify_connector');

// helpers
const {response} = require('../../helpers/responses');

/**
 * @swagger
 * /api/admin/user/query_count:
 *  put:
 *    tags:
 *      - Admin Auth
 *    description: update query count of a user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: admin
 *    - name: email
 *      in: formData
 *      required: true
 *      type: string
 *      description: user email
 *    - name: count
 *      in: formData
 *      required: true
 *      type: integer
 *      description: query limitation count.
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.put('/query_count', async (req, res) => {
  let {authorization} = req.headers;
  let {email, count} = req.body;
  email = email.toLowerCase();

  // admin auth token verification
  await adminAuthVerification(authorization)
    .then(async () => {
      // Find Admin using email
      let userUpdate = await User.findOneAndUpdate(
        {email},
        {
          $set: {
            query_count: count,
            user_search_limit: count
          }
        },
        {new: true}
      ).catch((err) => {
        return res
          .status(400)
          .json(response('SWR', 'Invalid Email', null, err));
      });

      if (userUpdate) {
        return res
          .status(200)
          .json(
            response(
              'S',
              'User query limitations updated!',
              {user: userUpdate},
              null
            )
          );
      }
      else {
        return res
          .status(400)
          .json(response('SWR', 'Invalid email.', null, null));
      }
    })
    .catch((err) => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/user/count:
 *  post:
 *    tags:
 *      - Admin Auth
 *    description: get current limit count of a user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: admin
 *    - name: email
 *      in: formData
 *      required: true
 *      type: string
 *      description: user email
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/count', async (req, res) => {
  let {authorization} = req.headers;
  let {email} = req.body;
  email = email.toLowerCase();

  // admin auth verification
  await adminAuthVerification(authorization)
    .then(async () => {
      // Find Admin using email
      // find user by email
      let userUpdate = await User.findOne({email}).catch((err) => {
        return res
          .status(400)
          .json(response('SWR', 'Invalid Email', null, err));
      });

      if (userUpdate) {
        return res
          .status(200)
          .json(
            response(
              'S',
              'user',
              {
                count: userUpdate.query_count,
                user_search_limit: userUpdate.user_search_limit
              },
              null
            )
          );
      }
      else {
        return res
          .status(400)
          .json(response('SWR', 'Invalid email.', null, null));
      }
    })
    .catch((err) => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/user/getAccessToken:
 *  post:
 *    tags:
 *      - Admin Auth
 *    description: get spotify access token for user
 *    produces:
 *       - application/json
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/getAccessToken', async (req, res) => {
  accessToken()
    .then((accessToken) => {
      return res.status(200).json(response('S', 'user', {accessToken}, null));
    })
    .catch((err) => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/user/abc:
 *  post:
 *    tags:
 *      - Admin Auth
 *    description: get spotify access token for user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: formData
 *      required: true
 *      type: string
 *      description: admin
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/abc', async (req, res) => {
  let {authorization} = req.body;
  console.log(authorization);
  accessToken()
    .then((accessToken) => {
      return res.status(200).json(response('S', 'user', {accessToken}, null));
    })
    .catch((err) => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/user:
 *  post:
 *    tags:
 *      - Admin Auth
 *    description: get spotify access token for user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: formData
 *      required: true
 *      type: string
 *      description: admin
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.delete('/:_user', async (req, res) => {
  let {authorization} = req.body;
  let {_user} = req.params;
  try {
    let userDelete = await User.deleteOne({_id: _user})
    return res.status(200).json(response('S', 'user', {message: "user Delete successfully"}, null));
  } catch (err) {
    return res.status(400).json(response('PD', null, null, err));
  }
});

module.exports = router;
