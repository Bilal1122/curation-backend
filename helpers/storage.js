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

    await Artists.findOneAndUpdate(
      {},
      {
        $addToSet: { name: { $each: artists } },
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log('Artists Saved');

    await Labels.findOneAndUpdate(
      {},
      {
        $addToSet: { name: { $each: labels } },
      },
      {
        upsert: true,
        new: true,
      }
    );

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
    );

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
    );

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
    );

    console.log('Decade Saved');
    const uniquePubs = [];
    for await (const pub of publishers) {
      const found = await Publishers.findOne({
        name: pub,
      });
      if (!found) uniquePubs.push(pub); //await new Publishers({ name: pub }).save();
    }

    await Publishers.insertMany(uniquePubs);

    const chunks = chunk(availableTracks, CHUNK_LIMIT);

    // console.log(chunks[0], "chunk");

    let counter = 0;
    for await (const slice of chunks) {
      await AvailableTracks.insertMany(slice);
      counter++;
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
