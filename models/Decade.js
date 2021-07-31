const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DECADE = new Schema(
  {
    name: {
      type: [String],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = Decade = mongoose.model("decade", DECADE);
