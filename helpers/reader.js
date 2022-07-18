const mongoose = require('mongoose');
const fs = require('fs');
const PROs = require('../models/PROs');

const Keys = {
  ARTIST: 'artist',
  GENRE: 'genre',
  DECADE: 'decade',
  TITLE: 'title',
  PRO: 'PRO',
  LABEL: 'label',
  TOTAL_PUB_SHARE: 'total_pub_share',
  duration_seconds: 'duration_seconds',
};

module.exports.readfile = async (filename) => {
  try {
    let contents = await (() =>
      new Promise((resolve, reject) => {
        fs.readFile(
          filename,
          {
            encoding: 'utf-8',
          },
          (err, data) => {
            if (err) return reject(err);
            resolve(data);
          }
        );
      }))();

    contents = contents.split('\n') || [];
    let headers = contents[0].split('\t').map((el) => el.trim());
    console.log(headers, '---');

    let start = headers.indexOf(Keys.TITLE);
    let end = headers.indexOf(Keys.TOTAL_PUB_SHARE);

    if (start == -1) {
      throw new Error('Title not found');
    }
    if (end == -1) {
      throw new Error('Total pubs not found');
    }

    contents.splice(0, 1);

    const {
      availableTracks,
      artists,
      genre,
      decade,
      publishers,
      labels,
      PROs,
    } = contents.reduce(
      (acc, row) => {
        // string line
        console.log('Rolling file', Math.random());
        const obj = {};
        obj.publishers = {};
        obj.all_pubs = [];
        row.split('\t').forEach((tuple, idx) => {
          //  array of string

          // console.log("Here!");
          if (idx > end && idx < headers.length) {
            // check for publishers
            acc.publishers.add(headers[idx]);
            // console.log(tuple.split("%")[0], "Num");
            if (parseInt(tuple.split('%')[0].trim())) {
              // for stats
              obj.publishers[headers[idx]] = tuple;
              // console.log(obj.publishers[headers[idx]], "--");
              // for list
              obj.all_pubs.push(headers[idx]);
            }
          } else {
            obj[headers[idx]] = tuple;
            if (idx == 2) {
              obj['searchTitle'] = tuple.replace(/['$"]/g, '');
            }
          }

          if (headers[idx] == Keys.ARTIST) {
            acc.artists.add(tuple);
          }
          if (headers[idx] == Keys.GENRE) {
            acc.genre.add(tuple);
          }
          if (headers[idx] == Keys.DECADE) {
            acc.decade.add(tuple);
          }
          if (headers[idx] == Keys.LABEL) {
            if (tuple.replace(/(\r\n|\n|\r|")/gm, '').length) {
              acc.labels.add(tuple);
            }
          }
          if (headers[idx] == Keys.PRO) {
            if (tuple) {
              acc.PROs.add(tuple);
            }
          }
        });

        // console.log(obj.publishers, "---91");
        // console.log(obj.publishers, "---91");

        // push a record e.g obj
        acc.availableTracks.push(obj);

        return acc;
      },
      {
        availableTracks: [],
        artists: new Set(),
        genre: new Set(),
        decade: new Set(),
        publishers: new Set(),
        labels: new Set(),
        PROs: new Set(),
      }
    );

    // console.log(availableTracks, artists, genre, decade, publishers);

    // console.log(availableTracks[100], "=-92");
    return {
      availableTracks: availableTracks,
      artists: [...artists.values()],
      genre: [...genre.values()],
      decade: [...decade.values()],
      publishers: [...publishers.values()],
      labels: [...labels.values()],
      PROs: [...PROs.values()],
    };
  } catch (er) {
    console.log({ er }, 'from reader file');
  }
};
