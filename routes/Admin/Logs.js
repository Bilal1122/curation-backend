const express = require('express');
const router = express.Router();

// models
const History = require('../../models/History');

// middleware
const {adminAuthVerification} = require('../../middleware/jwt');

// helpers
const {response} = require('../../helpers/responses');

/**
 * @swagger
 * /api/admin/logs:
 *  post:
 *    tags:
 *      - Admin Logs
 *    description: Get all logs
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: admin
 *    - name: type
 *      in: formData
 *      required: true
 *      type: string
 *      description: logs type
 *    - name: email
 *      in: formData
 *      required: false
 *      type: string
 *      description: user email
 *    - name: title
 *      in: formData
 *      required: false
 *      type: string
 *      description: user email
 *    - name: artist
 *      in: formData
 *      required: false
 *      type: string
 *      description: user email
 *    - name: createdAt
 *      in: formData
 *      required: false
 *      type: string
 *      description: user email
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post('/', async (req, res) => {
  let {authorization} = req.headers;
  let {type, title, email, artist, createdAt} = req.body;
  email = email.toLowerCase();

  // admin auth token verification
  await adminAuthVerification(authorization)
    .then(async () => {

      console.log(req.body,"0-0-0-0-0")


      // Assembling params
      let dateMin = new Date();
      dateMin.setMonth(dateMin.getMonth() - 1);
      let deletedOld = await History.deleteMany({createdAt: {$lt: dateMin}});
      let query = {
        createdAt: {$gte: dateMin}
      };
      if (type === 'TrackNotAvailable') {
        query.type = 'TrackNotAvailable';
      } else {
        query.type = 'SpotifyTrackNotAvailable';
      }

      if (email != null) {
        query.email = email;
      }

      if (type == 'TrackNotAvailable' && title != null) {
        query['query.title'] = title;
      }

      if (type == 'TrackNotAvailable' && artist != null) {
        query['query.artist'] = {$in: [artist]};
      }

      if (createdAt != null) {
        let start = new Date(createdAt);
        let end = new Date(createdAt);
        // start.setDate(start.getDate() + 1);
        // end.setDate(end.getDate() + 1);

        console.log("STARTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT", start, end)
        start.setHours(0);
        start.setMinutes(0);
        start.setSeconds(0);
        start.setMilliseconds(0);

        end.setHours(23);
        end.setMinutes(59);
        end.setSeconds(0);
        end.setMilliseconds(0);

        query.createdAt = {'$gte': start, '$lte': end};
      }

      // params assembled
      // console.log(query);

      // find logs
      let getLogs = await History.find(query).sort({createdAt: -1}).catch(err => {
        return res.status(400).json(response('SWR', 'invalid type', null, err));
      });

      console.log(getLogs,"-=-=-=-=-=-=-")

      if (getLogs) {
        return res
          .status(200)
          .json(response('S', null, {logs: getLogs}, null));
      } else {
        return res.status(400).json(response('SWR', 'No Data', null, null));
      }
    })
    .catch(err => {
      return res.status(400).json(response('PD', null, null, err));
    });
});

module.exports = router;
