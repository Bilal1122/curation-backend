let jwt = require('jsonwebtoken');
const KEYS = require('../configs/keys');

// Models
const Admin = require('../models/Admin');
const User = require('../models/User');

let dev = KEYS.dev;
// methods
module.exports = {
  newAuthToken: () => {
    let secretKey = jwt.sign(
      {
        exp: Math.floor(Date.now() / 1000) + 31556952,
        data: 'foobar',
      },
      'secret'
    );
    return secretKey;
  },
  adminAuthVerification: (auth_token) => {
    return new Promise(async (resolve, reject) => {
      if (dev) {
        resolve({
          status: true,
        });
      }
      let tokenDoc = await Admin.findOne({ auth_token }).catch((err) => {
        reject({
          status: false,
          message: 'Token validation failed.',
        });
      });

      if (tokenDoc) {
        let secret_key_validity = await verifyAuthToken(auth_token);
        if (secret_key_validity) {
          resolve({
            status: true,
          });
        } else {
          reject({
            status: false,
            message:
              "You don't have access to complete this process right now.",
          });
        }
      } else {
        reject({
          status: false,
          message: "You don't have access to complete this process right now.",
        });
      }
    });
  },
  userAuthVerification: (auth_token) => {
    return new Promise(async (resolve, reject) => {
      if (dev) {
        resolve({
          status: true,
        });
      }
      let tokenDoc = await User.findOne({ auth_token }).catch((err) => {
        reject({
          status: false,
          message: 'Token validation failed.',
        });
      });

      if (tokenDoc) {
        let secret_key_validity = await verifyAuthToken(auth_token);
        if (secret_key_validity) {
          resolve({
            status: true,
          });
        } else {
          reject({
            status: false,
            message: 'You validation key has expired please login again.',
          });
        }
      } else {
        reject({
          status: false,
          message: 'Token validation failed.',
        });
      }
    });
  },
};

const verifyAuthToken = async (secretKey) => {
  let verificationStatus = await jwt.verify(
    secretKey,
    'secret',
    (err, validity) => {
      if (err == null) {
        // token is valid
        return true;
      } else {
        console.log({ err });
        return false;
      }
    }
  );

  return verificationStatus;
};
