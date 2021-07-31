const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const USER = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      select: false,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    auth_token: {
      type: String,
      required: true,
    },
    query_count: {
      type: Number,
      default: 100000000000,
    },
    user_search_limit: {
      type: Number,
      default: 0,
    },
    _group: {
      type: Schema.Types.ObjectID,
      ref: "group",
      required: true,
    },
    history: {
      type: Schema.Types.ObjectID,
      ref: "history",
      default: null,
    },
    spotify_token: {
      type: String,
      required: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    lastSearchAt: {
      type: Number,
      default: Date.now(),
    },
    filterByLicencedPublishers: {
      type: Boolean,
      default: true,
    },
    filterByLicencedLabels: {
      type: Boolean,
      default: true,
    },
    filterByLicencedPROs: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = User = mongoose.model("user", USER);
