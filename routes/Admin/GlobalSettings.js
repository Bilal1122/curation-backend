const express = require('express');
const router = express.Router();

// middleware
const { adminAuthVerification } = require('../../middleware/jwt');

// helpers
const { response } = require('../../helpers/responses');
const GlobalSettingsModel = require('../../models/Settings');

router.put('', async (req, res) => {
  let { authorization } = req.headers;
  const { freeGroupLimit } = req.body;

  adminAuthVerification('Sdfsdf')
    .then(async () => {
      console.log('ABOUT TO UPDATE', freeGroupLimit);
      let updateSettings = await GlobalSettingsModel.findOneAndUpdate(
        {},
        { freeGroupLimit },
        { upsert: true, new: true }
      );

      return res
        .status(200)
        .json(response('S', 'Group Settings updated.', updateSettings, null));
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(400).json(response('PD', null, null, err));
    });
});

router.get('', async (req, res) => {
  console.log('GET SETTIMG');
  try {
    let updateSettings = await GlobalSettingsModel.findOne({});
    return res
      .status(200)
      .json(response('S', ' Settings data.', updateSettings, null));
  } catch (err) {
    console.log(err);
    return res.status(400).json(response('SWR'));
  }
});

module.exports = router;
