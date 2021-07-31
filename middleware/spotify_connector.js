let SpotifyWebApi = require("spotify-web-api-node");
const KEYS = require("../configs/keys");

let spotifyApi = new SpotifyWebApi({
  clientId: KEYS.spotifyClientID,
  clientSecret: KEYS.spotifyClientSecret,
  scope:"playlist-modify-public playlist-modify-private"
  // redirectUri: "http://localhost:5000"
});

module.exports = {
  accessToken: () => {
    return new Promise((resolve, reject) => {
      spotifyApi
        .clientCredentialsGrant()
        .then(data => {
          console.log("The access token is " + data.body["access_token"]);
          return resolve(data.body["access_token"]);
        })
        .catch(err => {
          return reject(null);
        });
    });
  }
};
