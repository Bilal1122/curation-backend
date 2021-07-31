const {EventEmitter} = require('events');
const {getFileContent} = require('../helpers/external_file_reader');
const CustomEvent = new EventEmitter();
const EventNames = {
  PROCESS_RECORDS: 'PROCESS_RECORDS',
  CHUNK_PROCESS_RECORDS: 'CHUNK_PROCESS_RECORDS',

};

const {sendEmail} = require('./Email');


const Publishers = require('../models/Publishers');
const AvailableTracks = require('../models/AvailableTracks');
const Groups = require('../models/Group');
const Artists = require('../models/Artists');
const Decade = require('../models/Decade');
const Genre = require('../models/Genre');


function chunk(array, size) {
  const chunked_arr = [];
  let index = 0;
  while (index < array.length) {
    chunked_arr.push(array.slice(index, size + index));
    index += size;
  }
  return chunked_arr;
}



CustomEvent.on(
  EventNames.PROCESS_RECORDS,
  async (
    assembledDataAllDataAssembeled,
    allArtists,
    allGenre,
    allDecade,
    headers,
    start_publishers,
    end_publishers,
    tracks,
    assembledData
  ) => {
    console.log('event fired');

    let filteredGenre = [...new Set(allGenre)];
    let filteredDecade = [...new Set(allDecade)];
    let filteredallArtists = [...new Set(allArtists)];

    await Artists.deleteOne();
    console.log("Artists deleted");
    await Genre.deleteOne();
    console.log(" genre deleted");
    await Decade.deleteOne();
    console.log(" decade deleted");
    let newArtists = new Artists({
      name: filteredallArtists
    });

    let newGenres = new Genre({
      name: filteredGenre
    });

    let newDecades = new Decade({
      name: filteredDecade
    });

    await newArtists.save();
    console.log("Artists saved");
    await newGenres.save();
    console.log("genre saved");
    await newDecades.save();
    console.log("decades saved");

    await AvailableTracks.deleteMany({}).catch(async (err) => {
      console.log("Error Occurred",err);
      await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while cleaning old data. Try again or contact developer.');
      return;

    });
    console.log("available tracks deleted");
    // insert all tracks to db
    const chunks = chunk(assembledDataAllDataAssembeled, 100);
    console.log(chunks.length);

     const uploadAvailableTracks =  await Promise.all(chunks.map(async (el)=>{
      console.log(el.length);
      return AvailableTracks.insertMany(el);
    }));

    console.log(uploadAvailableTracks);
    console.log("promise resolved");
    // let uploadAvailableTracks = await AvailableTracks.insertMany(
    //   assembledDataAllDataAssembeled
    // ).catch(async (err) => {
    //   console.log("Error Occurred",err);
    //   await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while uploading data to database. Try again or contact developer.');
    //   return;
    //
    // });
    if (uploadAvailableTracks) {
      console.log('All tracks uploaded/');
      let publishers = headers.slice(start_publishers + 1, end_publishers);

      // reading all publishers
      for (let k = 0; k < publishers.length; k++) {
        let name = publishers[k].trim();
        // find a publisher
        let isPublisherExists = await Publishers.findOne({
          name
        }).catch(async (err) => {
          console.log("Error Occurred",err);
          await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while duplicating publishers. Try again or contact developer.');
          return;

        });
        if (isPublisherExists) {
          continue;
        } else {
          let insertPublisher = new Publishers({
            name
          });
          let publisherInserted = await insertPublisher.save().catch(async (err) => {
            console.log("Error Occurred",err);
            await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while adding a new publisher. Try again or contact developer.');
            return;

          });
          if (!publisherInserted) {
            console.log("Error Occurred",err);
            await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while adding a new publisher. Try again or contact developer.');
            return;
          }
        }
      }
      console.log({s: tracks.length});
      console.log({s2: assembledData.length});

      //   tracks = [];
      //   assembledData = [];

      console.log({s: tracks.length});
      console.log({s2: assembledData.length});
      await sendEmail('', null, 'datasetUpload', null, 'Tracks are uploaded successfully.');
      return;

    } else {
      await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while adding a new publisher. Try again or contact developer.');
      return;
    }
  }
);


CustomEvent.on(
  EventNames.CHUNK_PROCESS_RECORDS,
  async () => {
    console.log('event fired');
    // let { authorization } = req.headers;
    let headers = '';
    let assembledData = [];
    let obj = {};
    let publishers = {};
    let allArtists = [];
    let allGenre = [];
    let allDecade = [];
    let trackChunk = [];

    await getFileContent('availableTracks', async (tracks) => {
      headers = tracks[0];
      let start_publishers = headers.indexOf('title');
      let end_publishers = headers.indexOf('total_pub_share');


      await AvailableTracks.deleteMany({}).catch(async (err) => {
        console.log('Error Occurred', err);
        await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while cleaning old data. Try again or contact developer.');
        return;

      });
      // Assembling data from file
      await new Promise(async (resolve, reject) => {
        for (let i = 1; i < tracks.length; i++) {

          let test_publishers = [];
          let all_pubs = [];
          for (let j = 0; j < tracks[i].length; j++) {
            if (j >= start_publishers + 1 && j <= end_publishers - 1) {
              if (tracks[i][j].trim().length === 0) continue;
              publishers[headers[j].trim()] = tracks[i][j].trim();
              all_pubs.push(headers[j].trim());
              test_publishers.push({
                pub_name: headers[j].trim(),
                pub_pec: parseFloat(tracks[i][j].split('%')[0].trim())
              });
            } else {
              obj[headers[j]] = tracks[i][j].trim();
              tracks[i][j] = tracks[i][j].replace(/['"]+/g, '');

              if (j == 1) {
                tracks[i][j] = tracks[i][j].replace(/['"]+/g, '');
                allArtists.push(tracks[i][j].replace(/['"]+/g, ''));
                obj['spotifyArtists'] = tracks[i][j]
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .trim();
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
          obj['publishers'] = publishers;

          assembledData.push(obj);
          console.log(i);

          if (tracks.length === i + 1 || assembledData.length / 15000 === 1) {
            console.log('in');
            let ac = await AvailableTracks.insertMany(assembledData);
            console.log(ac);
            assembledData = [];

            console.log('uploaded');
          }
        }

        // resolve(assembledData);
      })
        .then(async (assembledDataAllDataAssembeled) => {
          // console.log(assembledDataAllDataAssembeled)

          let filteredGenre = [...new Set(allGenre)];
          let filteredDecade = [...new Set(allDecade)];
          let filteredallArtists = [...new Set(allArtists)];
          // console.log({filteredGenre});
          // console.log({filteredDecade});

          await Artists.deleteOne();
          console.log('Artists deleted');
          await Genre.deleteOne();
          console.log(' genre deleted');
          await Decade.deleteOne();
          console.log(' decade deleted');
          let newArtists = new Artists({
            name: filteredallArtists
          });

          let newGenres = new Genre({
            name: filteredGenre
          });

          let newDecades = new Decade({
            name: filteredDecade
          });

          await newArtists.save();
          console.log('Artists saved');
          await newGenres.save();
          console.log('genre saved');
          await newDecades.save();
          console.log('decades saved');


          console.log('All tracks uploaded/');
          let publishers = headers.slice(start_publishers + 1, end_publishers);

          // reading all publishers
          for (let k = 0; k < publishers.length; k++) {
            let name = publishers[k].trim();
            // find a publisher
            let isPublisherExists = await Publishers.findOne({
              name
            }).catch(async (err) => {
              console.log('Error Occurred', err);
              await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while duplicating publishers. Try again or contact developer.');
              return;

            });
            if (isPublisherExists) {
              continue;
            } else {
              let insertPublisher = new Publishers({
                name
              });
              let publisherInserted = await insertPublisher.save().catch(async (err) => {
                console.log('Error Occurred', err);
                await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while adding a new publisher. Try again or contact developer.');
                return;

              });
              if (!publisherInserted) {
                console.log('Error Occurred');
                await sendEmail('', null, 'datasetUpload', null, 'Something went wrong while adding a new publisher. Try again or contact developer.');
                return;
              }
            }
          }
          console.log({s: tracks.length});
          console.log({s2: assembledData.length});
          await sendEmail('', null, 'datasetUpload', null, 'Tracks are uploaded successfully.');
          return;
          //   tracks = [];
          //   assembledData = [];

          console.log({s: tracks.length});
          console.log({s2: assembledData.length});
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }
);
module.exports = {
  CustomEvent,
  EventNames
};
