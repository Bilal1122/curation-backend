const express = require("express");
const router = express.Router();

// models
const Publishers = require("../../models/Publishers");

// middleware
const { adminAuthVerification } = require("../../middleware/jwt");

// helpers
const { response } = require("../../helpers/responses");
const Labels = require("../../models/Labels");
const PROs = require("../../models/PROs");

/**
 * @swagger
 * /api/admin/PROs/:
 *  get:
 *    tags:
 *      - PROs
 *    description: Get all PROs for Admin
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
      let getAllPROs = await PROs.findOne({}).catch(err => {
        return res.status(400).json(response("SWR"));
      });
      if (getAllPROs) {
        return res
          .status(200)
          .json(
            response(
              "S",
              "All PROs!",
              { PROs: getAllPROs.name },
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
