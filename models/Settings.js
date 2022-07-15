const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GlobalSettingsSchema = new Schema(
  {
    freeGroupLimit: {
      type: Number,
      default: 100,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = GlobalSettingsModel = mongoose.model(
  'global_settings',
  GlobalSettingsSchema
);
