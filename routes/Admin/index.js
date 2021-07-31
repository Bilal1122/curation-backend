const express = require('express');
const router = express.Router();

const Auth = require('./Authentication');
const Group = require('./Groups');
const AvailableTracks = require('./AvailableTracks');
const Publishers = require('./Publishers');
const Playlists = require('./Playlists');
const Users = require('./Users');
const Logs = require('./Logs');
const Labels = require('./Labels');
const PROs = require('./PROs');

router.use('/auth', Auth);
router.use('/group', Group.router);
router.use('/availableTracks', AvailableTracks);
router.use('/publishers', Publishers);
router.use('/playlists', Playlists);
router.use('/user', Users);
router.use('/logs', Logs);
router.use('/labels', Labels);
router.use('/PROs', PROs);

module.exports = router;
