const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GWithP = new Schema(
  {
    _group: {
      type: String,
      ref: "group",
      required: true
    },
    playlist: {
      type: String,
      required: true
    },

  },
  { timestamps: true }
);

module.exports = Admin = mongoose.model("groups_playlist", GWithP);
