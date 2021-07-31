const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AVAILABLETRACKS = new Schema(
  {
    isrc: {
      type: String,
      default: "",
    },
    artist: {
      type: [String],
      default: [""],
    },
    spotifyArtists: {
      type: [String],
      default: [],
    },
    title: {
      type: String,
      default: "",
    },
    searchTitle: {
      type: String,
      default: "",
    },
    album: {
      type: String,
      default: "",
    },
    PRO: {
      type: String,
      default: "",
    },
    upc: {
      type: String,
      default: "",
      // required: true
    },
    label: {
      type: String,
      // required: true
    },
    sub_label: {
      type: String,
      default: "",
      // required: true
    },
    genre: {
      type: String,
      default: "",
      // required: true
    },
    bpm: {
      type: Number,
      default: 0,
      // required: true
    },
    decade: {
      type: String,
      default: "",
      // required: true
    },
    duration_minutes: {
      type: Number,
      default: null,
    },
    duration_seconds: {
      type: Number,
      default: null,
    },
    publishers: {
      type: Object,
    },
    test_publishers: {
      type: [Object],
    },
    all_pubs: {
      type: [String],
    },
    total_pub_share: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);
AVAILABLETRACKS.index({ genre: "text", title: "text", decade: "text" });

module.exports = Available_Tracks = mongoose.model(
  "available_tracks",
  AVAILABLETRACKS
);
