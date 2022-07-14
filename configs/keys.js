const dev = false;
const KEYS = {
  dev,
  jwtPrivateKey: "",
  port: process.env.PORT || 5000,

  dbURI: dev ?
    "mongodb+srv://logicfab:uUTVrpDeH2cUNodY@cluster0.vmdtd.mongodb.net/test?retryWrites=true&w=majority":
    "mongodb+srv://logicfab:uUTVrpDeH2cUNodY@cluster0.vmdtd.mongodb.net/prod?retryWrites=true&w=majority",

  // mongodbForBadaTesting:
  //   "mongodb+srv://logicfab:logicfab5@cluster0.vmdtd.mongodb.net/cleanDatabase?retryWrites=true&w=majority",

  // TEMPO V2 NEW ACCOUNT
  spotifyAdminUserName: "rczymupvqblvs8qqmb3onu45f",
  spotifyClientID: "f3a6a59fa4234f0a89e7f7740e5a06ce",
  spotifyClientSecret: "45d45710a93540088de7d4c46235a6d5",
  spotify_url: "https://api.spotify.com/v1",

  frontEnd_URL: dev
    ? "http://tempo-v2-testers.s3-website.us-east-2.amazonaws.com/"
    : "https://crunchdigital.biz/",
  hosted_at: "https://crunchdigital.biz/",
};

module.exports = KEYS;
