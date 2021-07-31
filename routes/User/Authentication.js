const express = require('express');
const router = express.Router();
const sha256 = require('sha256');
const verificationCode = require('generate-sms-verification-code');
const {sendEmail} = require('../../helpers/Email');

// models
const User = require('../../models/User');
const Group = require('../../models/Group');
const ResetCodes = require('../../models/ResetCodes');

// middleware
const {newAuthToken, userAuthVerification} = require('../../middleware/jwt');
const {isValid} = require('../../middleware/validators');
const {response} = require('../../helpers/responses');

/**
 * @swagger
 * /api/user/auth/register:
 *  post:
 *    tags:
 *      - User
 *    description: register a user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: username
 *      in: formData
 *      required: true
 *      type: string
 *      description: username
 *    - name: password
 *      in: formData
 *      required: true
 *      type: string
 *      description: password
 *    - name: email
 *      in: formData
 *      required: true
 *      type: string
 *      description: email
 *    - name: _group
 *      in: formData
 *      required: true
 *      type: string
 *      description: group _id
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/register', async (req, res) => {
  let {username, password, email, _group} = req.body;
  email = email.toLowerCase();
  await isValid({username, password, email, _group})
    .then(async () => {
      // Find Admin using email
      let emailCheck = await User.findOne({email}).catch((err) => {
        return res
          .status(400)
          .json(response('SWR', 'Invalid Email', null, err));
      });
      if (!emailCheck) {
        const UserCountInGroup = await User.count({_group});
        console.log({UserCountInGroup})
        const group = await Group.findById(_group);
        if (UserCountInGroup >= group.userLimit){
          return res
            .status(400)
            .json(
              response(
                'SWR',
                'Group\'s user limit exceeded!',
                null,
                null
              )
            );
        }

          if (!group) {
          return res.status(400).send({message: 'Group not found!'});
        }

        let doc = new User({
          username,
          email,
          password: sha256(password),
          _group,
          user_search_limit: group.searchLimit,
          auth_token: newAuthToken()
        });
        // save a new user
        let registerEmail = await doc.save().catch((err) => {
          return res.status(400).json(response('SWR', 'Register failed.', err));
        });
        if (registerEmail) {
          // assign group to user
          let insertUserInGroup = await Group.findOneAndUpdate(
            {_id: _group},
            {$addToSet: {_user: doc._id}},
            {new: true}
          ).catch((err) => {
            return res
              .status(400)
              .json(response('SWR', 'User is not added to group.', null, err));
          });
          if (insertUserInGroup) {
            // find user by _id
            let getUser = await User.findOne({_id: registerEmail._id})
              .populate({
                model: 'group',
                path: '_group'
              })
              .catch((err) => {
                return res
                  .status(400)
                  .json(response('SWR', 'User not found.', null, err));
              });
            // send email verification
            await sendEmail(
              email,
              null,
              'verification',
              getUser._id,
              null,
              getUser
            );
            await sendEmail(
              email,
              null,
              'userSignedUp',
              getUser._id,
              null,
              getUser
            );

            console.log(getUser, '<-----')
            console.log(insertUserInGroup, '<=-----')


            return res
              .status(200)
              .json(
                response(
                  'S',
                  'Registration successful.',
                  {user: getUser, insertUserInGroup},
                  null
                )
              );
          }
          else {
            return res
              .status(400)
              .json(response('SWR', 'Group not valid.', null, null));
          }
        }
        else {
          return res
            .status(400)
            .json(
              response(
                'SWR',
                'Registration failed. Please try later.',
                null,
                null
              )
            );
        }
      }
      else {
        return res
          .status(400)
          .json(response('SWR', 'Email already in use.', null, null));
      }
    })
    .catch((err) => {
      return res.status(400).json(response('MD', null, null, err));
    });
});

/**
 * @swagger
 * /api/user/auth/login:
 *  post:
 *    tags:
 *      - User
 *    description: login a user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: email
 *      in: formData
 *      required: true
 *      type: string
 *      description: username
 *    - name: password
 *      in: formData
 *      required: true
 *      type: string
 *      description: password
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/login', async (req, res) => {
  let {email, password} = req.body;
  email = email.toLowerCase();
  const userVerified = await User.findOne({email});

  if (!userVerified) {
    return res.status(401).send({message: 'Invalid credentials. Please try again.'});
  }

  if (userVerified.blocked || !userVerified.verified) {
    return res.status(401).send({
      message:
        'Your access has been disabled. Please contact Tempo@crunchdigital.com'
    });
  }

  let userGroup = await Group.findById(userVerified._group);

  if (!userGroup.active) {
    return res.status(401).send({
      message:
        'Your access has been disabled. Please contact Tempo@crunchdigital.com'
    });
  }

  await isValid({email, password})
    .then(async () => {
      // Find Admin using email
      console.log(userVerified.verified, "asdf")
      if (!userVerified.verified)
        return res
          .status(400)
          .json(
            response(
              'SWR',
              'You email is not verified. Please check you email.',
              null,
              null
            )
          );

      let emailCheck = await User.findOne({email})
        .select('+password')
        .populate({
          model: 'group',
          path: '_group'
        })
        .catch((err) => {
          return res
            .status(400)
            .json(response('SWR', 'Invalid credentials. Please try again.', null, err));
        });

      if (emailCheck) {

        // match password
        if (emailCheck.password == sha256(password)) {
          // update user with new user auth token
          let updateUserAuth = await User.findOneAndUpdate(
            {_id: emailCheck._id},
            {$set: {auth_token: newAuthToken()}},
            {new: true}
          ).populate({
            model: 'group',
            path: '_group'
          });

          return res
            .status(200)
            .json(
              response(
                'S',
                'Registration successful.',
                {user: updateUserAuth},
                null
              )
            );
        }
        else {
          return res
            .status(400)
            .json(response('SWR', 'Invalid credentials. Please try again.', null, null));
        }
      }
      else {
        return res
          .status(400)
          .json(response('SWR', 'Please enter valid email.', null, null));
      }
    })
    .catch((err) => {
      return res.status(400).json(response('MD', null, null, err));
    });
});

/**
 * @swagger
 * /api/user/auth/storeSpotifyAccessToken:
 *  post:
 *    tags:
 *      - User
 *    description: Store Spotify access token for user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: User token
 *    - name: spotify_token
 *      in: formData
 *      required: true
 *      type: string
 *      description: spotify access token
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: User _id
 *    responses:
 *      200:
 *        description: offer created
 *      400:
 *       description: crashed
 */
router.post('/storeSpotifyAccessToken', async (req, res) => {
  let {authorization} = req.headers;
  let {spotify_token, _id} = req.body;
  // is all required data valid
  await isValid({spotify_token, _id})
    .then(async () => {
      // user auth token verification
      userAuthVerification(authorization)
        .then(async () => {
          // find and update user spotifu access token
          let updateAdminToken = await User.findOneAndUpdate(
            {_id},
            {$set: {spotify_token}},
            {new: true}
          ).catch((err) => {
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
                  {user: updateAdminToken},
                  null
                )
              );
          }
          else {
            return res
              .status(400)
              .json(response('SWR', 'Admin not found', null, null));
          }
        })
        .catch((err) => {
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
    .catch((err) => {
      return res.status(400).json(response('MD', null, null, err));
    });
});

/**
 * @swagger
 * /api/user/auth/requestPasswordReset:
 *  post:
 *    tags:
 *      - User
 *    description: request reset password
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: email
 *      in: formData
 *      required: true
 *      type: string
 *      description: User _id
 *    responses:
 *      200:
 *        description: success
 *      400:
 *       description: failed
 */
router.post('/requestPasswordReset', async (req, res) => {
  let {email} = req.body;

  let getUser = await User.findOne({email}).catch((err) => {
    return res
      .status(400)
      .json(response('SWR', 'Something went wrong try later', null, err));
  });
  if (getUser) {
    // generate a unique token for reset url
    let vCode = verificationCode(6, {type: 'number'});
    console.log(vCode);
    // del all old codes of a user
    await ResetCodes.deleteMany({_user: getUser._id});
    let newRestCode = new ResetCodes({
      _user: getUser._id,
      code: vCode
    });

    // save token
    let newCode = await newRestCode.save();
    if (newCode) {
      // send reset password email
      await sendEmail(email, vCode, 'resetPassword', null);

      return res
        .status(200)
        .json(
          response(
            'S',
            'Reset details sent. Please check your email.',
            {},
            null
          )
        );
    }
    else {
      return res.status(400).json(response('SWR', 'Try again.', null, null));
    }
  }
  else {
    return res.status(400).json(response('SWR', 'Invalid email.', null, null));
  }
});

/**
 * @swagger
 * /api/user/auth/updatePassword:
 *  post:
 *    tags:
 *      - User
 *    description: update user password
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: code
 *      in: formData
 *      required: true
 *      type: string
 *      description: verification code
 *    - name: password
 *      in: formData
 *      required: true
 *      type: string
 *      description: new password
 *    responses:
 *      200:
 *        description: success
 *      400:
 *       description: failed
 */
router.post('/updatePassword', async (req, res) => {
  let {code, password} = req.body;

  // check code verification expiry date
  let verifyCode = await ResetCodes.findOne({
    code,
    // expiry: {
    //   $gte: new Date()
    // }
  });
  if (verifyCode) {
    // update password
    let updatePassword = await User.findOneAndUpdate(
      {_id: verifyCode._user},
      {
        $set: {
          password: sha256(password)
        }
      }
    );
    if (updatePassword) {
      // delete used codes
      await ResetCodes.deleteOne({_id: verifyCode._id});
      return res
        .status(200)
        .json(response('S', 'Password Updated successful.', {}, null));
    }
    else {
      return res
        .status(400)
        .json(
          response(
            'SWR',
            'Password update failed please reload and try again..',
            null,
            null
          )
        );
    }
  }
  else {
    return res.status(400).json(response('SWR', 'Reset password request expired.', null, null));
  }
});

/**
 * @swagger
 * /api/user/auth/verifyAccount:
 *  post:
 *    tags:
 *      - User
 *    description: Verify User account
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: _id
 *      in: formData
 *      required: true
 *      type: string
 *      description: User _id
 *    responses:
 *      200:
 *        description: success
 *      400:
 *       description: failed
 */
router.post('/verifyAccount', async (req, res) => {
  let {_id} = req.body;

  // update user verify account
  let getUser = await User.findOneAndUpdate(
    {_id},
    {
      $set: {
        verified: true
      }
    }
  ).catch((err) => {
    return res
      .status(400)
      .json(response('SWR', 'Something went wrong try later', null, err));
  });
  if (getUser) {
    return res
      .status(200)
      .json(response('S', 'Verified successfully.', {}, null));
  }
  else {
    return res.status(400).json(response('SWR', 'Invalid URL.', null, null));
  }
});

/**
 * @swagger
 * /api/user/auth/sendNewVerification:
 *  post:
 *    tags:
 *      - User
 *    description: Send new verification email to user
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: email
 *      in: formData
 *      required: true
 *      type: string
 *      description: User _id
 *    responses:
 *      200:
 *        description: success
 *      400:
 *       description: failed
 */
router.post('/sendNewVerification', async (req, res) => {
  let {email} = req.body;
  email = email.toLowerCase();

  // check user existence
  let getUser = await User.findOne({email}).catch((err) => {
    return res
      .status(400)
      .json(response('SWR', 'Something went wrong try later', null, err));
  });
  if (getUser) {
    // send Email
    await sendEmail(email, null, 'verification', getUser._id);
    return res
      .status(200)
      .json(
        response(
          'S',
          'Verification email sent. Please check your email.',
          {},
          null
        )
      );
  }
  else {
    return res.status(400).json(response('SWR', 'Invalid email.', null, null));
  }
});

module.exports = router;
