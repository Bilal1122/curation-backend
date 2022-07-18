const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const { fork } = require('child_process');
const https = require('https');
const fs = require('fs');
const { rootDir } = require('../../server');
// models
const Publishers = require('../../models/Publishers');
const AvailableTracks = require('../../models/AvailableTracks');
const Groups = require('../../models/Group');
const Artists = require('../../models/Artists');
const Decade = require('../../models/Decade');
const Genre = require('../../models/Genre');
const History = require('../../models/History');

// helpers

const { getFileContent } = require('../../helpers/external_file_reader');
const { response } = require('../../helpers/responses');
const { CustomEvent, EventNames } = require('../../helpers/events');
const { readfile } = require('../../helpers/reader');

// middleware
const {
  userAuthVerification,
  adminAuthVerification,
} = require('../../middleware/jwt');
const User = require('../../models/User');
const Group = require('../../models/Group');
const { readMyTextFile } = require('../../helpers/readTextFile');
const { resolve } = require('path');

// upload file
const uploadCSV = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'dataSet');
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '.txt');
    },
  }),
});

/**
 * @swagger
 * /api/admin/availableTracks:
 *  get:
 *    tags:
 *      - Available Tracks
 *    description: get all available tracks
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.get('/', async (req, res) => {
  let { authorization } = req.headers;

  adminAuthVerification(authorization)
    .then(async () => {
      // get all available tracks from db
      let allAvailableTracks = await AvailableTracks.find({}).catch((err) => {
        return res.status(400).json(response('SWR', null, null, err));
      });
      if (allAvailableTracks) {
        return res
          .status(400)
          .json(
            response('S', 'Successful', { track: allAvailableTracks }, null)
          );
      } else {
        return res
          .status(400)
          .json(
            response(
              'SWR',
              'Issue while getting all Tracks. Please try later.',
              null,
              null
            )
          );
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
});

router.get('/getSearchFilters', async (req, res) => {
  let getAllArtists = await Artists.find().catch((err) => {
    return res.status(400).json(response('SWR', null, null, err));
  });
  // set unique
  let filtered = [...new Set(getAllArtists[0].name)];
  // clean empty ones
  let Cleanfiltered = filtered.filter(function (el) {
    return el != '';
  });

  let allGenre = await Genre.findOne().catch((err) => {
    return res.status(400).json(response('SWR', null, null, err));
  });

  let allDecade = await Decade.find().catch((err) => {
    return res.status(400).json(response('SWR', null, null, err));
  });
  res.json({
    status: true,
    artists: Cleanfiltered.sort(),
    genres: allGenre.name.sort(),
    decades: allDecade[0].name.sort().reverse(),
  });
});

/**
 * @swagger
 * /api/admin/availableTracks/artists:
 *  get:
 *    tags:
 *      - Available Tracks
 *    description: get all available tracks artists
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.get('/artists', async (req, res) => {
  let { authorization } = req.headers;
  let allArtists = [];
  userAuthVerification(authorization)
    .then(async () => {
      // get all artists

      let getAllArtists = await Artists.find().catch((err) => {
        return res.status(400).json(response('SWR', null, null, err));
      });

      // set unique
      let filtered = [...new Set(getAllArtists[0].name)];
      // clean empty ones
      let Cleanfiltered = filtered.filter(function (el) {
        return el != '';
      });
      return res
        .status(200)
        .json(
          response('S', 'Successful', { artists: Cleanfiltered.sort() }, null)
        );
    })
    .catch((err) => {
      return res
        .status(400)
        .json(
          response(
            'PD',
            'You dont have protocols to complete this process.',
            null,
            err
          )
        );
    });
});

/**
 * @swagger
 * /api/admin/availableTracks/genre:
 *  get:
 *    tags:
 *      - Available Tracks
 *    description: get all genre
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.get('/genre', async (req, res) => {
  let { authorization } = req.headers;
  let allGenre = [];
  userAuthVerification(authorization)
    .then(async () => {
      // get ll genre
      let allGenre = await Genre.findOne().catch((err) => {
        return res.status(400).json(response('SWR', null, null, err));
      });
      if (allGenre) {
        return res
          .status(200)
          .json(
            response('S', 'Successful', { genre: allGenre.name.sort() }, null)
          );
      } else {
        return res
          .status(400)
          .json(
            response(
              'SWR',
              'Issue while getting all Tracks. Please try later.',
              null,
              null
            )
          );
      }
    })
    .catch((err) => {
      return res
        .status(400)
        .json(
          response(
            'PD',
            'You dont have protocols to complete this process.',
            null,
            err
          )
        );
    });
});

/**
 * @swagger
 * /api/admin/availableTracks/decade:
 *  get:
 *    tags:
 *      - Available Tracks
 *    description: get all decade
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.get('/decade', async (req, res) => {
  let { authorization } = req.headers;
  let allDecade = [];
  userAuthVerification(authorization)
    .then(async () => {
      let allDecade = await Decade.find().catch((err) => {
        return res.status(400).json(response('SWR', null, null, err));
      });
      if (allDecade) {
        return res
          .status(200)
          .json(
            response(
              'S',
              'Successful',
              { decade: allDecade[0].name.sort() },
              null
            )
          );
      } else {
        return res
          .status(400)
          .json(
            response(
              'SWR',
              'Issue while getting all Tracks. Please try later.',
              null,
              null
            )
          );
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
});

/**
 * @swagger
 * /api/admin/availableTracks/bpm:
 *  get:
 *    tags:
 *      - Available Tracks
 *    description: get all bpm
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.get('/bpm', async (req, res) => {
  let { authorization } = req.headers;
  let allbpm = [];
  userAuthVerification(authorization)
    .then(async () => {
      // get all bpms
      let allAvailableTracks = await AvailableTracks.find({})
        .select('bpm')
        .catch((err) => {
          return res.status(400).json(response('SWR', null, null, err));
        });
      if (allAvailableTracks) {
        allAvailableTracks.forEach((item, index) => {
          if (item.bpm != null && item.bpm != '') {
            allbpm.push(item.bpm);
          }
        });
        // set
        let filtered = [...new Set(allbpm)];
        return res
          .status(200)
          .json(
            response(
              'S',
              'Successful',
              { bpm: filtered.sort((a, b) => a - b) },
              null
            )
          );
      } else {
        return res
          .status(400)
          .json(
            response(
              'SWR',
              'Issue while getting all Tracks. Please try later.',
              null,
              null
            )
          );
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
});

/**
 * @swagger
 * /api/admin/availableTracks/processTracksGroups:
 *  post:
 *    tags:
 *      - Data Processor
 *    description: Search through available tracks
 *    parameters:
 *    - name: authorization
 *      in: header
 *      required: true
 *      type: string
 *      description: Authentication token
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: success
 *      400:
 *        description: failed
 */
router.post('/processTracksGroups', async (req, res) => {
  let { authorization } = req.headers;

  let groups = ['5ef25fe549b6220017d97bf3', '5ef2e4e8e0eab000177d7824'];

  let tracks = await Groups.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(groups[0]) } },
    {
      $lookup: {
        from: 'publishers',
        localField: 'publishers._id',
        foreignField: '_publisher',
        as: 'rspublishers',
      },
    },
    {
      $unwind: '$rspublishers',
    },
    {
      $project: {
        rspublishers: '$rspublishers',
        present: { $in: ['$rspublishers._id', '$_publisher'] },
        as: 'ak11',
      },
    },
    {
      $lookup: {
        from: 'available_tracks',
        let: {
          tracks_id: '$available_tracks._id',
          total_share: '$available_tracks.total_pub_share',
          publisher_name: '$rspublishers.name',
          available: '$present',
        },
        pipeline: [
          {
            $project: {
              tracksid: '$$tracks_id',
              tot_share: '$$total_share',
              available: '$available',
              publisher: {
                $objectToArray: '$publishers',
              },
            },
          },
          // {$skip: 10 * page},
          // {
          //   $limit: 10
          // },
          {
            $unwind: '$publisher',
          },
          {
            $project: {
              tracks: '$$tracks_id',
              publisher: '$publisher.k',
              available: '$$available',
              percentage: '$publisher.v',
            },
          },
          {
            $match: {
              $expr: {
                $eq: ['$publisher', '$$publisher_name'],
              },
            },
          },
          // , {
          //   $skip: 10 * 1
          // }
        ],
        as: 'getpublisher_data',
      },
    },
    {
      $project: {
        // gettracks: tracks,
        getpublisher_data: 1,
      },
    },
    {
      $unwind: '$getpublisher_data',
    },
    {
      $group: {
        _id: '$getpublisher_data._id',
        track_pct: {
          $sum: {
            $cond: {
              if: { $eq: ['$getpublisher_data.available', true] },
              then: '$getpublisher_data.percentage',
              else: 0,
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'available_tracks',
        localField: '_id',
        foreignField: '_id',
        as: 'rstracks',
      },
    },
    {
      $unwind: '$rstracks',
    },
    {
      $project: {
        rstracks: 1,
        total_tracks_pct: '$track_pct',
      },
    },
  ]);
  // .catch(err => {
  // return res
  //   .status(400)
  //   .json(
  //     response(
  //       'SWR',
  //       'failed',
  //       null,
  //       err
  //     )
  //   );
  // });
  if (tracks) {
    return res.status(200).json(
      response(
        'S',
        'Successful',
        {
          allTracksTotalLength: tracks.length,
          tracks: tracks,
        },
        null
      )
    );
  } else {
    return res
      .status(400)
      .json(
        response(
          'SWR',
          'Issue while getting all Tracks. Please try later.',
          null,
          null
        )
      );
  }
});

/**
 * @swagger
 * /api/admin/availableTracks/oldway:
 *  post:
 *    tags:
 *      - Available Tracks
 *    description: upload an excel file
 *    parameters:
 *    - name: availableTracks
 *      in: formData
 *      required: true
 *      type: file
 *      description: group name
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: file loaded success
 *      400:
 *        description: file failed
 */
router.post(
  '/oldway',
  uploadCSV.single('availableTracks'),
  async (req, res) => {
    console.log('parsing file');
    // let { authorization } = req.headers;
    let headers = '';
    let assembledData = [];
    await getFileContent('availableTracks', async (tracks) => {
      headers = tracks[0];
      let start_publishers = headers.indexOf('title');
      let end_publishers = headers.indexOf('total_pub_share');
      // get publishers starting index
      if (start_publishers == -1) {
        return res
          .status(400)
          .json(
            response(
              'MD',
              'You are missing TITLE header in excel sheet. Kindly check or contact the developer.',
              null,
              null
            )
          );
      }
      // get publishers ending index
      if (end_publishers == -1) {
        return res
          .status(400)
          .json(
            response(
              'MD',
              'You are missing ALBUM header in excel sheet. Kindly check or contact the developer.',
              null,
              null
            )
          );
      }

      let obj = {};
      let publishers = {};
      // console.log(assembledData.length);
      // console.log("------------------------------");
      // console.log(tracks.length);
      // console.log("------------------------------");

      let allArtists = [];
      let allGenre = [];
      let allDecade = [];

      // Assembling data from file
      await new Promise((resolve, reject) => {
        for (let i = 1; i < tracks.length; i++) {
          obj = {};
          publishers = {};
          let test_publishers = [];
          let all_pubs = [];
          for (let j = 0; j < tracks[i].length; j++) {
            if (j >= start_publishers + 1 && j <= end_publishers - 1) {
              if (tracks[i][j].trim().length === 0) continue;
              publishers[headers[j].trim()] = tracks[i][j].trim();
              all_pubs.push(headers[j].trim());
              test_publishers.push({
                pub_name: headers[j].trim(),
                pub_pec: parseFloat(tracks[i][j].split('%')[0].trim()),
              });
            } else {
              obj[headers[j]] = tracks[i][j].replace(/['"]+/g, '');
              // tracks[i][j] = tracks[i][j].replace(/['"]+/g, '');

              if (j == 1) {
                allArtists.push(tracks[i][j].replace(/['"]+/g, ''));
                obj['spotifyArtists'] = tracks[i][j]
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .trim();

                console.log(tracks[i][j]);
              }
              // j == 1
              //   ? (tracks[i][j] = tracks[i][j].replace(/['"]+/g, ""))
              //   : (tracks[i][j] = tracks[i][j].replace(/['"]+/g, "").trim());
              // ? tracks[i][j].split(',').map(item => item.trim().replace('\"', ''))

              if (headers[j] == 'decade') {
                allDecade.push(tracks[i][j]);
              }

              if (headers[j] == 'genre') {
                allGenre.push(tracks[i][j]);
              }
            }
            obj['all_pubs'] = all_pubs;
            obj['test_publishers'] = test_publishers;
          }
          // console.log(publishers);
          obj['publishers'] = publishers;
          // console.log(obj['spotifyArtists']);

          assembledData.push(obj);
        }

        resolve(assembledData);
      })
        .then(async (assembledDataAllDataAssembeled) => {
          CustomEvent.emit(
            EventNames.PROCESS_RECORDS,
            assembledDataAllDataAssembeled,
            allArtists,
            allGenre,
            allDecade,
            headers,
            start_publishers,
            end_publishers,
            tracks,
            assembledData
          );
          console.log('sending response ...');
          return res
            .send(
              response(
                'S',
                'You data is upload you will receive an confirmation email shortly.',
                null,
                null
              )
            )
            .status(200);
        })
        .catch((err) => {
          return res
            .status(400)
            .json(response('SWR', 'Assembling data failed.', null, err));
        });
    });
  }
);

/**
 * @swagger
 * /api/admin/availableTracks/:
 *  post:
 *    tags:
 *      - Available Tracks
 *    description: upload an excel file
 *    parameters:
 *    - name: availableTracks
 *      in: formData
 *      required: true
 *      type: file
 *      description: group name
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: file loaded success
 *      400:
 *        description: file failed
 */
async function readFileOnline(file, fileLink) {
  return new Promise((resolve, reject) => {
    https.get(fileLink, function (res) {
      res.setEncoding('utf8');

      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
        console.count('revolve');
      });
      res.on('end', function () {
        console.log(data);
        // res.pipe(data);
        resolve(data);
      });
    });
  });
}
router.post('/', uploadCSV.single('availableTracks'), async (req, res) => {
  const { io } = require('../../server');
  // const { fileLink } = req.body;
  io.emit('trigger', {
    message: 'file uploaded',
  });
  const location = rootDir + '/dataSet/availableTracks.txt';
  try {
    // if (fileLink) {
    //   console.log('FILELINK ####');
    //   const file = fs.createWriteStream(location);
    //   const fileData = await readFileOnline(file, fileLink);
    //   console.log(fileData);
    //   file.write(fileData, 'utf-8');
    // } else {
    //   console.log('FILE ####');
    // }

    io.emit('trigger', {
      message: 'parsing file',
    });

    const docs = await readfile(location).catch((err) =>
      console.log({ err }, '----opu')
    );
    // console.log(docs, "docs");

    io.emit('trigger', {
      message: 'file parsed',
    });

    res.send({
      message: `file uploaded having ${docs.availableTracks.length} records`,
    });

    const childProcess = fork('./helpers/storage.js');
    childProcess.send(docs);
    childProcess.on('message', ({ message }) => {
      // console.log(message);
      io.emit('trigger', {
        message,
      });
    });
    childProcess.on('exit', () => {
      io.emit('trigger', {
        message: 'Tracks uploaded Successfully',
      });
      console.log('process exited');

      fs.unlink(rootDir + '/dataSet/availableTracks.txt', (err) => {
        if (err) {
          console.error(err, 'FILE REMOVE EEROR');
        }
      });
      // fs.unlink(rootDir + '/dataSet/availableTracks.txt', (err) =>
      //   console.log(err)
      // );
    });
  } catch (error) {
    console.log({ error });
    io.emit('trigger', {
      message: `Invalid file -- ${error.message}`,
    });
    return res.status(400).json(response('SWR', error.message, null, null));
  }
});

/**
 * @swagger
 * /api/admin/availableTracks/userBatchSearch:
 *  post:
 *    tags:
 *      - USER
 *    description: upload an text file
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: file loaded success
 *      400:
 *        description: file failed
 */

router.post(
  '/userBatchSearch',
  uploadCSV.single('availableTracks'),
  async (req, res) => {
    const { io } = require('../../server');

    io.emit('trigger', {
      message: 'file uploaded',
    });

    try {
      let {
        _id,
        filterByLicencedPublishers,
        filterByLicencedPROs,
        filterByLicencedLabels,
      } = req.body;

      filterByLicencedLabels = filterByLicencedLabels == 'true' ? true : false;
      filterByLicencedPROs = filterByLicencedPROs == 'true' ? true : false;
      filterByLicencedPublishers =
        filterByLicencedPublishers == 'true' ? true : false;

      const user = await User.findById(_id);
      if (!user) {
        return res.status(400).send({ message: 'No User Available!' });
      }

      let dir = path.join(__dirname, `../../dataSet/${req.file.filename}`);
      let { rows, headings } = await readMyTextFile(dir);

      //Check if user file exceeds batch limit
      if (rows.length > user.user_search_limit || !user.query_count)
        return res.status(400).send({
          message:
            'You have exceeded the number of rows that can be searched in one file.  Please reduce the number of rows to the limit set for your account. Please contact Tempo@crunchdigital.com if you should need assistance.',
        });
      let user_group = null;
      let batchSearchLimit = null;
      let searchLimit = null;

      user_group = await Group.findById(user._group);
      batchSearchLimit = user_group.batchSearchLimit;
      searchLimit = user_group.searchLimit;
      user.user_search_limit = user.user_search_limit - rows.length;
      user.query_count = user.query_count - 1;
      await user.save();

      if (rows.length > batchSearchLimit)
        return res.status(400).send({
          message:
            'You have exceeded the number of rows that can be searched in one file.  Please reduce the number of rows to the limit set for your account. Please contact Tempo@crunchdigital.com if you should need assistance.',
        });

      if (rows.length > searchLimit)
        return res.status(400).send({
          message:
            'You have exceeded the number of rows that can be searched in one file.  Please reduce the number of rows to the limit set for your account. Please contact Tempo@crunchdigital.com if you should need assistance.',
        });

      console.log(user_group, '=-=-=-=-=');
      user_group.searchLimit = user_group.searchLimit - rows.length;
      if (user_group.searchLimit < 0) user_group.searchLimit = 0;
      user_group.batchSearchLimit = user_group.batchSearchLimit - rows.length;
      if (user_group.batchSearchLimit < 0) user_group.batchSearchLimit = 0;
      await user_group.save();

      // get ISRCs,Artists,Titles from Text Rows
      let ISRCs = [];
      let Artists = [];
      let Titles = [];
      rows.forEach((item) => {
        ISRCs.push(item.split('\t')[0]);
        Artists.push(item.split('\t')[1]);
        Titles.push(item.split('\t')[2]);
      });
      // console.log(rows,"-=-=-=-=-=-=-=-")

      //
      let publishersInGroup = [];
      if (filterByLicencedPublishers) {
        publishersInGroup = await Publishers.find({
          _id: user_group._publisher,
        });
        publishersInGroup = publishersInGroup.map((item) => item.name);
      }
      console.log(publishersInGroup, '----');

      let userSearchCriteria = [];

      if (filterByLicencedPublishers)
        userSearchCriteria.push({ all_pubs: { $in: publishersInGroup } });
      if (filterByLicencedPROs)
        userSearchCriteria.push({ PRO: user_group._PROs });
      if (filterByLicencedLabels)
        userSearchCriteria.push({ label: user_group._labels });

      console.log(userSearchCriteria, 'search criteria');
      let search = {
        $or: [
          { $and: [{ isrc: { $ne: '#' } }, { isrc: { $in: ISRCs } }] },
          {
            $and: [{ artist: { $in: Artists } }, { title: { $in: Titles } }],
          },
        ],
      };

      if (userSearchCriteria.length) {
        search['$and'] = [...userSearchCriteria];
      }

      let resultantTracks = await AvailableTracks.find({
        ...search,
      });

      // console.log(resultantTracks,"909090990")

      let query = { publisher: false, pro: false, label: false };

      let dataToChildProcess = {
        ISRCs,
        Artists,
        Titles,
        user,
        publishersInGroup,
        query,
        user_group,
        userFilters: {
          filterByLicencedPublishers,
          filterByLicencedPROs,
          filterByLicencedLabels,
        },
      };

      const cp = fork('./helpers/maintainLogsForBatchSearch.js');
      cp.send(dataToChildProcess);

      const notAvailable = await AvailableTracks.find({
        isrc: { $nin: ISRCs },
        $and: [{ artist: { $nin: Artists } }, { title: { $nin: Titles } }],
      });

      console.log(notAvailable, '---=- Not Available =-=-=-');
      console.log(notAvailable.length, '---=- Not Available =-=-=-');

      let responseTracks = [];
      rows.forEach((row) => {
        let rowData = row.split('\t');

        console.log(rowData, '=-=-=-=-');
        // console.log(rowData,"-=-=-==-=");
        let isFound = resultantTracks.find((item) => {
          // console.log(item.isrc== rowData[0],item.isrc, rowData[0])
          return (
            item.isrc.replace(/(\r\n|\n|\r)/gm, '').trim() ==
            rowData[0].replace(/(\r\n|\n|\r)/gm, '').trim()
          );
        });
        if (rowData[0] == 'USPG19190028') console.log(isFound);
        if (isFound != undefined) {
          // let isNotAvaible = notAvailable.find(item => item.isrc == isFound.isrc);
          // console.log(isNotAvaible," Track Not Avaible");
          // if (isNotAvaible) {
          //   responseTracks.push({
          //     isrc: isFound.isrc.replace(/(\r\n|\n|\r)/gm, "").trim(),
          //     artist: isFound.artist,
          //     title: isFound.title.replace(/(\r\n|\n|\r)/gm, "").trim(),
          //     results: 'Not Available'
          //   });
          // }
          // else {
          responseTracks.push({
            isrc: isFound.isrc.replace(/(\r\n|\n|\r)/gm, '').trim(),
            artist: isFound.artist,
            title: isFound.title.replace(/(\r\n|\n|\r)/gm, '').trim(),
            results: 'Available',
          });
          // }
        } else {
          // console.log(row,"-=-=-=-?")
          // let isMatch = resultantTracks.find(tr=>{
          //    return tr.artist.includes(rowData[1].toString()) && tr.title == rowData[2]
          // })

          // if(!isMatch){
          //   responseTracks.push({
          //     isrc: rowData[0],
          //     artist: rowData[1],
          //     title: rowData[2],
          //     results: "No Match",
          //   });
          // }
          // else{
          responseTracks.push({
            isrc: rowData[0].replace(/(\r\n|\n|\r)/gm, '').trim(),
            artist: [rowData[1]],
            title: rowData[2].replace(/(\r\n|\n|\r)/gm, '').trim(),
            results: 'No Match',
          });
          // }
          // console.log(isMatch,"isMatch")
        }
      });

      // console.log(responseTracks,"90909090909")

      if (resultantTracks) {
        return res.send({ tracks: responseTracks, headings });
      }
    } catch (error) {
      console.log({ error });
      io.emit('trigger', {
        message: `Invalid file -- ${error.message}`,
      });
      return res.status(400).json(response('SWR', error.message, null, null));
    }
  }
);

router.post(
  '/userBatchSearchHadi',
  uploadCSV.single('availableTracks'),
  async (req, res) => {
    const { io } = require('../../server');
    io.emit('trigger', {
      message: 'file uploaded',
    });

    try {
      let {
        _id,
        filterByLicencedPublishers,
        filterByLicencedPROs,
        filterByLicencedLabels,
      } = req.body;
      filterByLicencedLabels = filterByLicencedLabels == 'true' ? true : false;
      filterByLicencedPROs = filterByLicencedPROs == 'true' ? true : false;
      filterByLicencedPublishers =
        filterByLicencedPublishers == 'true' ? true : false;

      const user = await User.findById(_id);
      if (!user) {
        return res.status(400).send({ message: 'No User Available!' });
      }

      let user_group = null;
      user_group = await Group.findById(user._group);

      if (!user_group.filterByLicencedPublishers)
        filterByLicencedPublishers = false;
      if (!user_group.filterByLicencedLabels) filterByLicencedLabels = false;
      if (!user_group.filterByLicencedPROs) filterByLicencedPROs = false;

      let dir = path.join(__dirname, `../../dataSet/${req.file.filename}`);
      let { rows, headings } = await readMyTextFile(dir);

      if (rows.length > user_group.batchSearchLimit)
        return res.status(400).send({
          message:
            'You have exceeded the number of rows that can be searched in one file.  Please reduce the number of rows to the limit set for your account. Please contact Tempo@crunchdigital.com if you should need assistance',
        });

      if (rows.length > user_group.searchLimit)
        return res.status(400).send({
          message:
            'Your group has exceeded the number of tracks that can be searched. Please contact Tempo@crunchdigital.com if you should need assistance.',
        });

      if (!user.query_count || !user_group.batchSearchLimit)
        return res.status(400).send({
          message:
            'You have exceeded the number of rows that can be searched in one file.  Please reduce the number of rows to the limit set for your account. Please contact Tempo@crunchdigital.com if you should need assistance.',
        });

      let batchSearchLimit = null;
      let searchLimit = null;

      batchSearchLimit = user_group.batchSearchLimit;
      searchLimit = user_group.searchLimit;
      user.user_search_limit = user.user_search_limit; //  - rows.length;
      user.query_count = user.query_count; // -1
      await user.save();

      // user_group.batchSearchLimit = user_group.batchSearchLimit - rows.length;
      await Group.findOneAndUpdate(
        { _id: user._group },
        {
          $inc: {
            searchLimit: -rows.length,
          },
        }
      );

      if (rows.length > batchSearchLimit)
        return res.status(400).send({
          message:
            'You have exceeded the number of rows that can be searched in one file.  Please reduce the number of rows to the limit set for your account. Please contact Tempo@crunchdigital.com if you should need assistance.',
        });

      if (rows.length > searchLimit)
        return res.status(400).send({
          message:
            'You have exceeded the number of rows that can be searched in one file.  Please reduce the number of rows to the limit set for your account. Please contact Tempo@crunchdigital.com if you should need assistance.',
        });

      user_group.searchLimit = user_group.searchLimit - rows.length;
      if (user_group.searchLimit < 0) user_group.searchLimit = 0;
      // user_group.batchSearchLimit = user_group.batchSearchLimit - rows.length;
      if (user_group.batchSearchLimit < 0) user_group.batchSearchLimit = 0;
      await user_group.save();

      // get ISRCs,Artists,Titles from Text Rows
      let ISRCs = [];
      let Artists = [];
      let Titles = [];
      let tracks = [];
      rows.forEach((item) => {
        if (item.split('\t')[0] !== '#') {
          ISRCs.push(item.split('\t')[0]);
        }
        Artists.push(item.split('\t')[1]);
        Titles.push(item.split('\t')[2]);
        tracks.push({
          isrc: item.split('\t')[0],
          artists: item.split('\t')[1],
          title: item.split('\t')[2].replace(/(\r\n|\n|\r|")/gm, ''),
        });
      });

      let publishersInGroup = [];
      let userSearchCriteria = [];

      if (filterByLicencedPublishers) {
        publishersInGroup = await Publishers.find({
          _id: user_group._publisher,
        });
        publishersInGroup = publishersInGroup.map((item) => item.name);
      }
      if (filterByLicencedPublishers)
        userSearchCriteria.push({ all_pubs: { $in: publishersInGroup } });
      if (filterByLicencedPROs)
        userSearchCriteria.push({ PRO: user_group._PROs });
      if (filterByLicencedLabels)
        userSearchCriteria.push({ label: user_group._labels });

      let query = { publisher: false, pro: false, label: false };
      let dataToChildProcess = {
        ISRCs,
        Artists,
        Titles,
        user,
        publishersInGroup,
        query,
        user_group,
        userFilters: {
          filterByLicencedPublishers,
          filterByLicencedPROs,
          filterByLicencedLabels,
        },
      };
      let logItems = [];
      let responseTracks = [];
      for (let i = 0; i < rows.length; i++) {
        let rowData = rows[i].split('\t');
        let isFound = {};
        rowData[2] = rowData[2].replace(/(\r\n|\n|\r|")/gm, '');
        // console.log('ROW ROW ROW ROW DATA', { rowData });
        if (rowData[0] != '#') {
          isFound = await AvailableTracks.findOne({
            $or: [
              { isrc: rowData[0] },
              {
                $and: [
                  {
                    title: {
                      $regex: rowData[2].replace(/(\r\n|\n|\r|")/gm, ''),
                      $options: 'i',
                    },
                  },
                  {
                    artist: {
                      $in: rowData[1].split(',').map((i) => new RegExp(i, 'i')),
                    },
                  },
                ],
              },
            ],
          }).lean();
          console.log('mighty if');
        } else {
          isFound = await AvailableTracks.findOne({
            title: new RegExp(
              rowData[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              'i'
            ),
            artist: {
              $in: rowData[1].split(',').map((i) => new RegExp(i, 'i')),
            },
          }).lean();
        }

        // let isFound = await AvailableTracks.findOne({
        // 	$or: [
        // 		{$and: [{isrc: {$ne: "#"}}, {isrc: rowData[0]}]},
        // 		{
        // 			$and: [{title: rowData[2]}, {artist: {$in: rowData[1]}}],
        // 		},
        // 	],
        // }).lean();
        // isFound = await AvailableTracks.findOne(availableTracISRCBased).lean();
        // console.log('isrc', rowData[0]);
        // console.log('title', rowData[2]);
        // console.log('artist', rowData[1]);
        let labelUnMatchString = 'Label(';
        let proUnMatchString = 'Pro(';
        let publisherUnMatchString = 'Publishers(';
        let isUnavailable = false;
        // console.log('##########FOUND', isFound?._id);
        if (isFound && Object.keys(isFound).length) {
          console.log(isFound.title);
          console.log('_id', isFound._id);
          isFound.newFormatLogReason = {};
          let publishersNotMatch = false;
          let mismatchPublisher = [];
          if (filterByLicencedPublishers) {
            isFound.all_pubs.forEach((item) => {
              if (!publishersInGroup.includes(item)) {
                mismatchPublisher.push(item);
              }
            });

            if (!isFound.all_pubs.length || mismatchPublisher.length) {
              publishersNotMatch = true;
              isUnavailable = true;
            } else {
              isUnavailable = false;
              publishersNotMatch = false;
            }

            if (publishersNotMatch) {
              isFound.logReason = [
                {
                  type: 'Publishers mismatch',
                  mismatchedItems: mismatchPublisher,
                },
              ];
              mismatchPublisher.forEach(
                (item) =>
                  (publisherUnMatchString += `${item}(${isFound.publishers[item]}) `)
              );
              publisherUnMatchString += ')';
              isFound.newFormatLogReason.publisher = publisherUnMatchString;
              // isUnavailable = true;
            }
            // else {
            // 	console.log("In elseeeeeeeeeee")
            // 	isUnavailable = false
            // }
          }
          //TODO: match with labels user_group._labels -- isFound.labels
          if (filterByLicencedLabels) {
            if (!isUnavailable && user_group._labels.includes(isFound.label)) {
            } else {
              if (
                !user_group._labels.includes(isFound.label) &&
                isFound.label.length
              ) {
                console.log('@@filterByLicencedLabels', isFound.label);

                isFound.logReason = [
                  {
                    type: 'Label mismatch',
                    mismatchedItems: [isFound.label],
                  },
                ];
                labelUnMatchString += isFound.label + ')';
                isFound.newFormatLogReason.label = labelUnMatchString;
                isUnavailable = true;
              }
            }
          }
          //TODO: match with pros user_group._PROs -- isFound.PRO
          if (filterByLicencedPROs) {
            if (!isUnavailable && user_group._PROs.includes(isFound.PRO)) {
            } else {
              if (
                !user_group._PROs.includes(isFound.PRO) &&
                isFound.PRO.length
              ) {
                console.log('@@filterByLicencedPROs', isFound.PRO.length);
                isFound.logReason = [
                  {
                    type: 'PRO mismatch',
                    mismatchedItems: [isFound.PRO],
                  },
                ];
                proUnMatchString += isFound.PRO + ')';
                isFound.newFormatLogReason.pro = proUnMatchString;
              }
            }
          }

          isUnavailable =
            !filterByLicencedLabels &&
            !filterByLicencedPROs &&
            !filterByLicencedPublishers
              ? true
              : isUnavailable;

          responseTracks.push({
            isrc: rowData[0].replace(/(\r\n|\n|\r|")/gm, ''),
            artist: `"${[rowData[1].replace(/(\r\n|\n|\r|")/gm, '')]}"`,
            title: `"${rowData[2].replace(/(\r\n|\n|\r|")/gm, '')}"`,
            // results: (!filterByLicencedPublishers && !filterByLicencedLabels && !filterByLicencedPROs) || isUnavailable ? "Not Available" : "Available",

            results:
              !filterByLicencedLabels &&
              !filterByLicencedPROs &&
              !filterByLicencedPublishers
                ? 'Not Available'
                : isUnavailable
                ? 'Not Available'
                : 'Available',
          });
          if (isUnavailable) {
            logItems.push(isFound);
          }
        } else {
          responseTracks.push({
            isrc: rowData[0].replace(/(\r\n|\n|\r|")/gm, ''),
            artist: `"${[rowData[1].replace(/(\r\n|\n|\r|")/gm, '')]}"`,
            title: `"${rowData[2].replace(/(\r\n|\n|\r|")/gm, '')}"`,
            results: 'No Match',
          });
          isFound = {
            isrc: rowData[0].replace(/(\r\n|\n|\r|")/gm, ''),
            artist: `"${[rowData[1]]}"`,
            title: `"${rowData[2].replace(/(\r\n|\n|\r|")/gm, '')}"`,
            results: 'No Match',
          };
        }
        console.log('-------------------------');
      }

      let history = new History({
        email: user.email,
        _group: user_group._id,
        query: {
          userPublisherFilter: filterByLicencedPublishers,
          userLabelFilter: filterByLicencedLabels,
          userPROFilter: filterByLicencedPROs,
        },
        _track: logItems,
        success: true,
        type: 'TrackNotAvailable',
      });
      let isHistoryTaken = await history.save();
      return res.send({ tracks: responseTracks, headings });
    } catch (error) {
      console.log({ error });
      io.emit('trigger', {
        message: `Invalid file -- ${error.message}`,
      });
      return res.status(400).json(response('SWR', error.message, null, null));
    }
  }
);

/**
 * @swagger
 * /api/admin/availableTracks/adminBatchSearch:
 *  post:
 *    tags:
 *      - USER
 *    description: upload an text file
 *    produces:
 *      - application/json
 *    responses:
 *      200:
 *        description: file loaded success
 *      400:
 *        description: file failed
 */
router.post(
  '/adminBatchSearch',
  uploadCSV.single('availableTracks'),
  async (req, res) => {
    const { io } = require('../../server');

    io.emit('trigger', {
      message: 'file uploaded',
    });
    try {
      let { _id, userPreferences } = req.body;
      userPreferences = JSON.parse(userPreferences);

      let filterByLicencedPublishers = false,
        filterByLicencedPROs = false,
        filterByLicencedLabels = false;

      const group = await Group.findById(_id);
      if (!group) {
        return res.status(400).send({ message: 'No Group Available!' });
      }

      filterByLicencedLabels = userPreferences.filterByLicencedLabels;
      filterByLicencedPROs = userPreferences.filterByLicencedPROs;
      filterByLicencedPublishers = userPreferences.filterByLicencedPublishers;

      // console.log({
      //   filterByLicencedLabels,
      //   filterByLicencedPROs,
      //   filterByLicencedPublishers,
      // });

      let dir = path.join(__dirname, `../../dataSet/${req.file.filename}`);
      let { rows, headings } = await readMyTextFile(dir, 'admin');

      let ISRCs = [];
      let Artists = [];
      let Titles = [];
      let tracks = [];
      rows.forEach((item) => {
        ISRCs.push(item.split('\t')[0]);
        Artists.push(item.split('\t')[1]);
        Titles.push(item.split('\t')[2]);
        tracks.push({
          isrc: item.split('\t')[0],
          artists: item.split('\t')[1],
          title: item.split('\t')[2],
        });
      });

      let publishersInGroup = [];
      let userSearchCriteria = [];

      if (filterByLicencedPublishers) {
        publishersInGroup = await Publishers.find({
          _id: group._publisher,
        });
        publishersInGroup = publishersInGroup.map((item) => item.name);
      }

      if (filterByLicencedPublishers)
        userSearchCriteria.push({ all_pubs: { $in: publishersInGroup } });
      if (filterByLicencedPROs) userSearchCriteria.push({ PRO: group._PROs });
      if (filterByLicencedLabels)
        userSearchCriteria.push({ label: group._labels });

      let search = {
        $or: [
          { $and: [{ isrc: { $ne: '#' } }, { isrc: { $in: ISRCs } }] },
          {
            $and: [{ artist: { $in: Artists } }, { title: { $in: Titles } }],
          },
        ],
      };

      if (userSearchCriteria.length) {
        search['$and'] = [...userSearchCriteria];
      }

      let resultantTracks = await AvailableTracks.find({
        ...search,
      });

      let logItems = [];
      let responseTracks = [];
      for (let i = 0; i < rows.length; i++) {
        let rowData = rows[i].split('\t');
        if (rowData.length < 3) continue;

        let isFound = null;
        if (rowData[0] != '#') {
          isFound = await AvailableTracks.findOne({ isrc: rowData[0] }).lean();
        }
        rowData[2] = rowData[2].replace(/(\r\n|\n|\r|")/gm, '');

        if (!isFound) {
          isFound = await AvailableTracks.findOne({
            $and: [
              {
                // title: {
                //   $regex: rowData[2].replace(/(\r)/gm, ''),
                //   $options: 'i',
                // },
                title: new RegExp(
                  rowData[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                  'i'
                ),
              },
              {
                artist: {
                  $in: rowData[1].split(',').map((i) => new RegExp(i, 'i')),
                },
              },
            ],
          }).lean();
        }

        let labelUnMatchString = '';
        let proUnMatchString = '';
        let publisherUnMatchString = '';
        let isUnavailable =
          !filterByLicencedLabels &&
          !filterByLicencedPROs &&
          !filterByLicencedPublishers
            ? true
            : false;

        if (isFound) {
          isFound.newFormatLogReason = {};
          console.log(isFound.newFormatLogReason, 'isFound.newFormatLogReason');

          let publishersNotMatch = false;
          let mismatchPublisher = [];
          if (filterByLicencedPublishers) {
            isFound.all_pubs.forEach((item) => {
              if (!publishersInGroup.includes(item)) {
                mismatchPublisher.push(item);
                publishersNotMatch = true;
                isUnavailable = true;
              }
            });
            if (publishersNotMatch) {
              isFound.logReason = [
                {
                  type: 'Publishers mismatch',
                  mismatchedItems: mismatchPublisher,
                },
              ];
              mismatchPublisher.forEach(
                (item) =>
                  (publisherUnMatchString += `${item}(${isFound.publishers[item]}) `)
              );
              // publisherUnMatchString +=
              isFound.newFormatLogReason.publisher =
                'Publishers(' + publisherUnMatchString + ')';
              isUnavailable = true;
            }
          }
          //TODO: match with labels user_group._labels -- isFound.labels
          if (filterByLicencedLabels) {
            if (!isUnavailable && group._labels.includes(isFound.label)) {
            } else {
              if (
                !group._labels.includes(isFound.label) &&
                isFound.label.length
              ) {
                isFound.logReason = [
                  {
                    type: 'Label mismatch',
                    mismatchedItems: [isFound.label],
                  },
                ];
                labelUnMatchString += isFound.label;
                isFound.newFormatLogReason.label =
                  'Label(' + labelUnMatchString + ')';
                isUnavailable = true;
              }
            }
          }
          //TODO: match with pros user_group._PROs -- isFound.PRO
          if (filterByLicencedPROs) {
            if (!isUnavailable && group._PROs.includes(isFound.PRO)) {
            } else {
              if (isFound.PRO.length) {
                isFound.logReason = [
                  {
                    type: 'PRO mismatch',
                    mismatchedItems: [isFound.PRO],
                  },
                ];
                proUnMatchString += isFound.PRO;
                isFound.newFormatLogReason.pro =
                  'Pro(' + proUnMatchString + ')';
                isUnavailable = true;
              }

              // logItems.push(isFound)
            }
          }
          let keys = [];
          if (
            isFound.newFormatLogReason &&
            isFound.newFormatLogReason.publisher
          )
            keys.push('Publisher');
          if (isFound.newFormatLogReason && isFound.newFormatLogReason.label)
            keys.push('Label');
          if (isFound.newFormatLogReason && isFound.newFormatLogReason.pro)
            keys.push('Pro');

          // isUnavailable =
          //   !filterByLicencedLabels &&
          //   !filterByLicencedPROs &&
          //   !filterByLicencedPublishers
          //     ? true
          //     : isUnavailable;

          let final = isUnavailable
            ? isFound.newFormatLogReason &&
              `${
                isFound.newFormatLogReason.publisher
                  ? isFound.newFormatLogReason.publisher + ' '
                  : ''
              }${
                isFound.newFormatLogReason.label
                  ? isFound.newFormatLogReason.label + ' '
                  : ''
              }${
                isFound.newFormatLogReason.pro
                  ? isFound.newFormatLogReason.pro + ' '
                  : ''
              }`
            : 'Available';
          // console.log(rowData[0], 'FOUND- before', isFound._id, {isUnavailable});

          // console.log(rowData[0], 'FOUND- after', isFound._id, {isUnavailable});

          responseTracks.push({
            isrc: `"${rowData[0].replace(/(\r\n|\n|\r|")/gm, '')}"`,
            artist: `"${rowData[1].replace(/(\r\n|\n|\r|")/gm, '')}"`,
            title: `"${rowData[2].replace(/(\r\n|\n|\r|")/gm, '')}"`,
            results:
              !filterByLicencedLabels &&
              !filterByLicencedPROs &&
              !filterByLicencedPublishers
                ? 'Not Available'
                : isUnavailable
                ? 'Not Available'
                : 'Available',
            Mismatch: isUnavailable ? `"${keys.join(',')}"` : 'Available',
            newFormatLogReason: `${final}`,
          });
        } else {
          responseTracks.push({
            isrc: rowData[0].replace(/(\r\n|\n|\r|")/gm, ''),
            artist: [rowData[1]],
            title: rowData[2].replace(/(\r\n|\n|\r|")/gm, ''),
            results: 'No Match',
            Mismatch: 'No Match',
            newFormatLogReason: 'No Match',
          });
          isFound = {
            isrc: rowData[0].replace(/(\r\n|\n|\r|")/gm, ''),
            artist: [rowData[1]],
            title: rowData[2].replace(/(\r\n|\n|\r|")/gm, ''),
            results: 'No Match',
            newFormatLogReason: 'No Match',
            // newFormatLogReason: {noMatch: 'No Match'}
          };
          logItems.push(isFound);
        }
        // console.log(
        //   '-------------newFormatLogReason--------->>',
        //   isFound.newFormatLogReason,
        //   'name:',
        //   isFound.title
        // );
      }

      if (resultantTracks) {
        return res.send({ tracks: responseTracks, headings });
      }
    } catch (error) {
      return res.status(400).json(response('SWR', error.message, null, null));
    }
  }
);

module.exports = router;
