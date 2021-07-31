const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GENRE = new Schema(
  {
    name: {
      type: [String],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = Decade = mongoose.model("genre", GENRE);
