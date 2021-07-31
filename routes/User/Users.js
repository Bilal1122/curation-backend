const express = require('express');
const Group = require('../../models/Group');
const User = require('../../models/User');
const router = express.Router();

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
router.get('/getUsers', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip);
    const limit = parseInt(req.query.limit);

    let users = await User.find({})
      .populate({
        model: 'group',
        path: '_group',
        select: 'name'
      })
      .skip(skip)
      .limit(limit)
      .select('username verified blocked _group email');

    let totalUsers = await User.countDocuments({});

    res.send({users, totalUsers});
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
});

router.post('/getGroupByID', async (req, res) => {
  let getGroup = await Group.findOne({_id: req.body._id})
  res.json(getGroup)
})

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
router.post('/toggleVerification', async (req, res) => {
  try {
    const {_id} = req.body;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(400).send({msg: 'User not found!'});
    }

    const userUpdated = await User.findByIdAndUpdate(
      _id,
      {
        verified: !user.verified
      },
      {
        new: true,
        useFindAndModify: true
      }
    ).select('username verified blocked');
    res.send(userUpdated);
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
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
router.post('/toggleBlockStatus', async (req, res) => {
  try {
    const {_id} = req.body;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(400).send({msg: 'User not found!'});
    }

    const userUpdated = await User.findByIdAndUpdate(
      _id,
      {
        blocked: !user.blocked
      },
      {
        new: true,
        useFindAndModify: true
      }
    )
      .populate({
        model: 'group',
        path: '_group',
        select: 'name'
      })
      .select('username verified blocked email _group');

    console.log(userUpdated);

    res.send(userUpdated);
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
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
router.get('/searchUser', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip);
    const limit = parseInt(req.query.limit);
    const search_term = req.query.search_term;

    let regex = new RegExp(`${search_term}`, 'ig');

    let resultantGroups = await Group.find({name: {$regex: regex}})
    resultantGroups = resultantGroups.map(gr => gr._id)


    const users = await User.find({
      $or: [{username: {$regex: regex}}, {email: {$regex: regex}}, {_group: resultantGroups}]
    }).populate({
      model: 'group',
      path: '_group',
      select: 'name'
    })
      .skip(skip)
      .limit(limit);
    const totalUsers = await User.countDocuments({
      $or: [{username: {$regex: regex}}, {email: {$regex: regex}}, {_group: resultantGroups}]
    });
    res.send({users, totalUsers});
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
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
router.post('/getFiltersByLicenced', async (req, res) => {
  try {
    const {_id} = req.body;

    const user = await User.findById(_id)
      .populate({
        model: 'group',
        path: '_group'
      })
      .select(
        'filterByLicencedPublishers filterByLicencedLabels filterByLicencedPROs _group'
      );
    if (!user) {
      return res.status(400).send({message: 'No User Availabe!'});
    }

    res.send(user);
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
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
router.patch('/changeValidationFilters', async (req, res) => {
  try {
    const {
      _id,
      filterByLicencedPublishers,
      filterByLicencedPROs,
      filterByLicencedLabels
    } = req.body;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(400).send({message: 'No user available!'});
    }

    const response = await User.findByIdAndUpdate(
      _id,
      {
        filterByLicencedLabels,
        filterByLicencedPROs,
        filterByLicencedPublishers
      },
      {
        new: true
      }
    ).populate({
      path: '_group',
      model: 'group'
    });

    res.send(response);
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
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
router.get('/getGroup/:_id', async (req, res) => {
  try {
    const {_id} = req.params;
    const user = await User.findById(_id);
    if (!user) {
      return res.status(400).send({message: 'User not found!'});
    }
    const group = await Group.findById(user._group).select(
      'filterByLicencedPublishers filterByLicencedLabels filterByLicencedPROs'
    );
    if (!group) {
      return res.status(400).send({message: 'Group not found!'});
    }
    res.send({group});
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
});

router.get('/:_id', async (req, res) => {
  try {
    let user = await User.findById(req.params._id)
    res.send({user});
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
});

router.put('/', async (req, res) => {
  let {_id, userPreferences} = req.body;
  try {
    let user = await User.findOneAndUpdate({_id}, {
      $set: {
        filterByLicencedPublishers: userPreferences.filterByLicencedPublishers,
        filterByLicencedLabels: userPreferences.filterByLicencedLabels,
        filterByLicencedPROs: userPreferences.filterByLicencedPROs
      }
    }, {new:true})
    res.send({user});
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
});

router.put('/groupLimitReduce', async (req, res) => {
  let {_id, value} = req.body;
  console.log(_id, value, "--------------------------------")
  try {
    let updateGroup = await Group.findOneAndUpdate({_id}, {
      $inc: {
        searchLimit : -value
      }
    }, {new:true})
    res.send({updateGroup});
  } catch (err) {
    res.status(500).send(err.message ? err.message : err);
  }
});

module.exports = router;
