const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HISTORY = new Schema(
  {
    email: {
      type: String,
      required: true
    },
    _group:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"group",
      // default:"5ef25fe549b6220017d97bf3"
    },
    query: {
      type: Object,
      required: true
    },
    _track: {
      type: [Object],
      // ref: "track",
      required: true
    },
    success: {
      type: Boolean,
      required: true
    },
    type: {
      type: String,
      enum: ['SearchKeyword', 'TrackNotAvailable', 'SpotifyTrackNotAvailable',"NoMatch"]
    }
  },
  {timestamps: true}
);

module.exports = User = mongoose.model('history', HISTORY);
