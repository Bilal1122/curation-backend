const express = require("express");
const router = express.Router();

const Auth = require("./Authentication");
const Playlist = require("./Playlists");
const AvailableTracks = require("./AvailableTracks");
const Tracks = require("./Tracks");

router.use("/auth", Auth);
router.use("/playlist", Playlist);
router.use("/availableTracks", AvailableTracks);
router.use("/tracks", Tracks);
router.use("/", require("./Users"));

const node_mailer = require("nodemailer");
const { sendEmail } = require("../../helpers/Email");

/**
 * @swagger
 * /api/user/send-contact-email:
 *  post:
 *    tags:
 *      - User
 *    description: sendContact email to admin from customer support
 *    produces:
 *       - application/json
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: false
 *      type: string
 *      description: user
 *    responses:
 *      200:
 *        description: successful
 *      400:
 *       description: failed
 */
router.post("/send-contact-email", async (req, res) => {
  let {
    name,
    company,
    email,
    phone,
    businessArea,
    interestCall,
    interestDemo,
    howHear,
    whatDiscuss,
  } = req.body;

  await sendEmail(email, null, "contactUs", null, {
    name,
    company,
    email,
    phone,
    businessArea,
    interestCall,
    interestDemo,
    howHear,
    whatDiscuss,
  });

  await res.json(true);
});

module.exports = router;
