const mongoose = require('mongoose');
const fs = require('fs');
// models
const AvailableTracks = require('../models/AvailableTracks');
const Artists = require('../models/Artists');
const Decade = require('../models/Decade');
const Genre = require('../models/Genre');
const Publishers = require('../models/Publishers');

const { dbURI } = require('../configs/keys');
const Labels = require('../models/Labels');
const PRO = require('../models/PROs');

const CHUNK_LIMIT = 1000;

process.on(
  'message',
  async ({
    availableTracks,
    artists,
    genre,
    decade,
    publishers,
    labels,
    PROs,
  }) => {
    // try {
    await mongoose.connect(dbURI);
    console.log('db connected');
    console.log(labels);
    console.log(PROs);
    // console.log(artists)
    // console.log(availableTracks.length);

    // TODO: enable 4 below line to remove content before uploading
    // await AvailableTracks.deleteMany();
    // await Artists.deleteMany();
    // await Decade.deleteMany();
    // await Genre.deleteMany();

    console.log('collections truncated');

    // await new Artists({
    //   name: artists,
    // }).save();

    const artistlist = await Artists.findOne({});
    let uniqueArtist = [];
    console.log(artistlist)
    if (artistlist && artistlist.name.length) {
      artists.forEach((i) => {
        console.log(i);
        if (!artistlist?.name?.includes(i)) {
          uniqueArtist.push(i);
        }
      });
    } else {
      uniqueArtist = [...artists];
    }

    console.log({ uniqueArtist }, '----~~~~~~~//////');
    const artistsChunk = chunk(uniqueArtist, 1500);
    let artistCounter = 0;
    for await (const slice of artistsChunk) {
      await Artists.findOneAndUpdate(
        {},
        {
          $addToSet: { name: slice },
        },
        {
          upsert: true,
          new: true,
        }
      ).catch((err) => console.log('ARTIST ERR', err.message));
      console.log('Artists Saved', artistCounter++);
    }

    await Labels.findOneAndUpdate(
      {},
      {
        $addToSet: { name: { $each: labels } },
      },
      {
        upsert: true,
        new: true,
      }
    ).catch((err) => console.log('Labels ERR', err.message));

    console.log('Labels Saved');

    await PRO.findOneAndUpdate(
      {},
      {
        $addToSet: { name: { $each: PROs } },
      },
      {
        new: true,
        upsert: true,
      }
    ).catch((err) => console.log('PRO ERR', err.message));

    console.log('PRO Saved');

    // await new Decade({
    //   name: decade,
    // }).save();

    await Decade.findOneAndUpdate(
      {},
      {
        $addToSet: { name: { $each: decade } },
      },
      {
        new: true,
        upsert: true,
      }
    ).catch((err) => console.log('Decade ERR', err.message));

    console.log('Decade Saved');

    // await new Genre({
    //   name: genre,
    // }).save();

    await Genre.findOneAndUpdate(
      {},
      {
        $addToSet: { name: { $each: genre } },
      },
      {
        new: true,
        upsert: true,
      }
    ).catch((err) => console.log('Genre ERR', err.message));

    console.log('Genre Saved');

    const uniquePubs = [];
    for await (const pub of publishers) {
      const found = await Publishers.findOne({
        name: pub,
      });
      if (!found) uniquePubs.push(pub); //await new Publishers({ name: pub }).save();
    }
    const assemblePubs = [];
    uniquePubs.forEach((i) => assemblePubs.push({ name: i }));
    await Publishers.insertMany(assemblePubs).catch((err) =>
      console.log('Publishers ERR', err.message)
    );
    const chunks = chunk(availableTracks, CHUNK_LIMIT);

    // console.log(chunks[0], "chunk");

    let counter = 0;
    for await (const slice of chunks) {
      await AvailableTracks.insertMany(slice);
      counter++;
      console.log({
        message: `files uploaded : ${((counter / chunks.length) * 100).toFixed(
          2
        )}  / ${100}%`,
      });
      process.send({
        message: `files uploaded : ${((counter / chunks.length) * 100).toFixed(
          2
        )}  / ${100}%`,
      });
    }
    console.log('AvailableTracks Saved');

    process.exit();
  }
);

function chunk(array, size) {
  const chunked_arr = [];
  let index = 0;
  while (index < array.length) {
    chunked_arr.push(array.slice(index, size + index));
    index += size;
  }
  return chunked_arr;
}
