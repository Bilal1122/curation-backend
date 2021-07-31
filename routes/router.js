const express = require("express");
const router = express.Router();

const Admin = require("./Admin/index");
const User = require("./User/index");
const {accessToken} = require('../middleware/spotify_connector');


// Navigate to each main module.
router.use("/admin", Admin);
router.use("/user", User);

router.get('/accessToken', async (req, res) => {
  let spotifyAccess = await accessToken().catch((err) => {
    console.log('failed');
  });
  res.json(spotifyAccess)
});

module.exports = router;
