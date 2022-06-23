const express = require("express");
const router = express.Router();

// models
const Publishers = require("../../models/Publishers");

// middleware
const { adminAuthVerification } = require("../../middleware/jwt");

// helpers
const { response } = require("../../helpers/responses");

/**
 * @swagger
 * /api/admin/publishers/:
 *  get:
 *    tags:
 *      - Publishers
 *    description: Get all publishers for Admin
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: authorization
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: register
 *      400:
 *        description: register failed
 */
router.get("", async (req, res) => {
  let { authorization } = req.headers;
  // admin verification
  adminAuthVerification(authorization)
    .then(async () => {
      // get all publishers
      let getAllPublishers = await Publishers.find()
        .sort({'name' : 1})
        .catch(err => {
        return res.status(400).json(response("SWR"));
      });



      if (getAllPublishers) {
        return res
          .status(200)
          .json(
            response(
              "S",
              "All Publishers!",
              { publishers: getAllPublishers },
              null
            )
          );
      } else {
        return res
          .status(400)
          .json(
            response("SWR", "Fetching groups failed. Try again!", null, null)
          );
      }
    })
    .catch(err => {
      return res.status(400).json(response("PD", null, null, err));
    });
});

module.exports = router;
