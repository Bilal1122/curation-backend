const express = require("express");
const router = express.Router();

// models
const Publishers = require("../../models/Publishers");

// middleware
const { adminAuthVerification } = require("../../middleware/jwt");

// helpers
const { response } = require("../../helpers/responses");
const Labels = require("../../models/Labels");

/**
 * @swagger
 * /api/admin/labels/:
 *  get:
 *    tags:
 *      - Labels
 *    description: Get all labels for Admin
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
 *        description: success
 *      400:
 *        description:  failed
 */
router.get("", async (req, res) => {
  let { authorization } = req.headers;
console.log("asdfasd")
  // admin verification
  adminAuthVerification(authorization)
    .then(async () => {
      // get all publishers


      let getAllLabels = await Labels.findOne({}).catch(err => {
        return res.status(400).json(response("SWR"));
      });
      console.log(getAllLabels, "---------------")
      if (getAllLabels) {
        return res
          .status(200)
          .json(
            response(
              "S",
              "All Labels!",
              { Labels: getAllLabels.name },
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
      console.log("----------")
      console.log("----------")
      console.log("----------")
      console.log("----------")
      console.log("----------")
      console.log("----------",  err)
      return res.status(400).json(response("PD", null, null, err));
    });
});

module.exports = router;
