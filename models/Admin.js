const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ADMIN = new Schema(
  {
    username: {
      type: String,
      default: "admin",
      required: true
    },
    password: {
      type: String,
      default:
        "a075d17f3d453073853f813838c15b8023b8c487038436354fe599c3942e1f95",
      required: true,
      select: false
    },
    auth_token: {
      type: String,
      required: true
    },
    spotify_token: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = Admin = mongoose.model("admin", ADMIN);
