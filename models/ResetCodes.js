const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RESET = new Schema(
  {
    _user: {
      type: Schema.Types.ObjectID,
      ref: 'user',
      required: true
    },
    code: {
      type: Number,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    expiry: {
      type: Date,
      default: new Date(new Date().setDate(new Date().getDate() + 1))
    }
  },
  {timestamps: true}
);

module.exports = ResetCode = mongoose.model('reset_code', RESET);
