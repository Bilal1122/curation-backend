const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GROUP = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    _publisher: {
      type: [Schema.Types.ObjectID],
      ref: 'publisher',
      required: true,
    },
    _labels: {
      type: [String],
      required: true,
    },
    _PROs: {
      type: [String],
      required: true,
    },
    _user: {
      type: [Schema.Types.ObjectID],
      ref: 'user',
      default: [],
    },
    pub_names: {
      type: [String],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    searchLimit: {
      type: Number,
      default: 1000,
    },
    userLimit: {
      type: Number,
      default: 1000,
    },
    batchSearchLimit: {
      type: Number,
      default: 50,
    },
    filterByLicencedPublishers: {
      type: Boolean,
      default: false,
    },
    filterByLicencedLabels: {
      type: Boolean,
      default: false,
    },
    filterByLicencedPROs: {
      type: Boolean,
      default: false,
    },
    groupEmail: {
      type: String,
      default: '',
      trim: true,
    },
    manualSearchReports: {
      type: Boolean,
      default: false,
    },
    freeGroup: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = Group = mongoose.model('group', GROUP);
