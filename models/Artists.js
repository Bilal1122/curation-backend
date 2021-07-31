const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ARTISTS = new Schema(
  {
    name: {
      type: [String],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = artists = mongoose.model("artists", ARTISTS);
