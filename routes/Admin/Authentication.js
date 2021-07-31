const express = require('express');
const router = express.Router();
const sha256 = require('sha256');

// models
const Admin = require('../../models/Admin');

// middleware
const {newAuthToken, adminAuthVerification} = require('../../middleware/jwt');
const {isValid} = require('../../middleware/validators');
const {response} = require('../../helpers/responses');

/**
 * @swagger
 * /api/admin/auth/login:
 *  post:
 *    tags:
 *      - Admin Auth
 *    description: Admin login
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: username
 *      in: formData
 *      required: true
 *      type: string
 *      description: Admin username
 *    - name: password
 *      in: formData
 *      required: true
 *      type: string
 *      description: Admin password
 *    responses:
 *      200:
 *        description: login succesful
 *      400:
 *       description: request failed
 */
router.post('/login', async (req, res) => {
  let {username, password} = req.body;

  await isValid({username, password})
    .then(async () => {
      // Find Admin using email
      let loginAdmin = await Admin.findOne({username})
        .select('+password')
        .catch(err => {
          return res
            .status(400)
            .json(response('SWR', 'Invalid username', null, err));
        });
      if (loginAdmin) {
        // Check password
        if (sha256(password) == loginAdmin.password) {
          let AdminNewToken = await Admin.findOneAndUpdate({}, {$set: {auth_token: newAuthToken()}}, {new: true}).catch(err => {
            res.status(400).json(response('ID', 'Something went wrong.', null, null));
          });
          if (AdminNewToken) {
            return res.status(200).json(response('S', null, {admin: AdminNewToken}, null));
          } else {
            res.status(400).json(response('ID', 'Something went wrong.', null, null));
          }
        } else {
          res.status(400).json(response('ID', 'Invalid password.', null, null));
        }
      } else {
        return res
          .status(400)
          .json(response('ID', 'Invalid username', null, null));
      }
    })
    .catch(err => {
      return res.status(400).json(response('MD', null, null, err));
    });
});

/**
 * @swagger
 * /api/admin/auth/storeSpotifyAccessToken:
 *  post:
 *    tags:
 *      - Admin Auth
 *    description: store Admin spotify access token
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Admin token
 *    - name: spotify_token
 *      in: formData
 *      required: true
 *      type: string
 *      description: spotify access token
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: Admin _id
 *    responses:
 *      200:
 *        description: process completed
 *      400:
 *       description: process failed
 */
router.post('/storeSpotifyAccessToken', async (req, res) => {
  let {authorization} = req.headers;
  let {spotify_token, _id} = req.body;
  await isValid({spotify_token, _id})
    .then(async () => {
      adminAuthVerification(authorization)
        .then(async () => {
          let updateAdminToken = await Admin.findOneAndUpdate(
            {_id},
            {$set: {spotify_token}},
            {new: true}
          ).catch(err => {
            return res
              .status(400)
              .json(response('SWR', 'Admin not found', null, err));
          });

          if (updateAdminToken) {
            return res
              .status(200)
              .json(
                response(
                  'S',
                  'Admin spotify token accepted',
                  {admin: updateAdminToken},
                  null
                )
              );
          } else {
            return res
              .status(400)
              .json(response('SWR', 'Admin not found', null, null));
          }
        })
        .catch(err => {
          return res
            .status(400)
            .json(
              response(
                'PD',
                'You dont have Admin protocols to complete this process.',
                null,
                err
              )
            );
        });
    })
    .catch(err => {
      return res.status(400).json(response('MD', null, null, err));
    });
});


// /**
//  * @swagger
//  * /api/admin/auth/register:
//  *  post:
//  *    tags:
//  *      - Admin Auth
//  *    description: store Admin spotify access token
//  *    produces:
//  *       - application/json
//  *    responses:
//  *      200:
//  *        description: process completed
//  *      400:
//  *       description: process failed
//  */
// router.post("/register", (req,res)=>{
//   let newAdmin = new Admin({
//     auth_token:newAuthToken()
//   })
//   newAdmin.save()
// })

module.exports = router;
