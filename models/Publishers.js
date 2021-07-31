const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PUBLISHERS = new Schema(
  {
    name: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = Publisher = mongoose.model("publisher", PUBLISHERS);
