const KEYS = require("../configs/keys");
const mongoose = require("mongoose");
const History = require("../models/History");
const AvailableTracks = require("../models/AvailableTracks");

process.on("message", async (msg) => {
  const {
    user,
    publishersInGroup,
    query,
    user_group,
    ISRCs,
    Artists,
    Titles,
    userFilters,
  } = msg;

  console.log(userFilters);

  let {
    filterByLicencedLabels,
    filterByLicencedPROs,
    filterByLicencedPublishers,
  } = userFilters;



  try {
    await mongoose.connect(KEYS.mongodb, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
    });

    console.log("Database connected in Child process.");
    console.log(userFilters,"<-----Filters")
    let rTracks = await AvailableTracks.find({
      $or: [
        { $and: [{ isrc: { $ne: "#" } }, { isrc: ISRCs }] },
        {
          $and: [{ artist: Artists }, { title: Titles }],
        },
      ],
    });

    // console.log(rTracks,"rTracks")
    // console.log(rTracks.length,"rTracks")
    // console.log(userFilters);
    let logItems = [];
    rTracks.forEach((item) => {
      let logItem = JSON.parse(JSON.stringify(item));
      let logReason = [];

      if (filterByLicencedPublishers) {
        let publishersMatch = true;
        let mismatchPublisher = [];
        item.all_pubs.forEach((item) => {
          if (!publishersInGroup.includes(item)) {
            mismatchPublisher.push(item);
            publishersMatch = false;
          }
        });
        if (!publishersMatch) {
          logReason.push({
            type: "Publishers mismatch",
            mismatchedItems: mismatchPublisher,
          });
          query.publisher = true;
        }
      }
      if (filterByLicencedPROs) {
        let proMatch = true;
        if (!user_group._PROs.includes(item.PRO)) proMatch = false;
        if (!proMatch) {
          logReason.push({
            type: "PRO mismatch",
            mismatchedItems: [item.PRO],
          });
          query.pro = true;
        }
      }
      if (filterByLicencedLabels) {
        let labelMatch = true;
        if (!user_group._labels.includes(item.label)) labelMatch = false;
        if (!labelMatch) {
          logReason.push({
            type: "Label mismatch",
            mismatchedItems: [item.label],
          });
        }
      }
      if (logReason.length > 0) {
        logItem.logReason = logReason;
        // logItem.searchingTime = new Date();
        logItems.push(logItem);
      }
    });

    let history = new History({
      email: user.email,
      _group:user_group._id,
      query: {
        licencedPublishers: filterByLicencedPublishers,
        licencedLabels: filterByLicencedLabels,
        licencedPROs: filterByLicencedPROs,
      },
      _track: logItems,
      success: true,
      type: "TrackNotAvailable",
    });


    // console.log(history);
    // console.log("Saving History!");

    let dateMin = new Date();
    dateMin.setMonth(dateMin.getMonth() - 1);
    await History.deleteMany({ createdAt: { $lt: dateMin } });

    await history.save();
  } catch (error) {
    console.log(error);
  }
});
