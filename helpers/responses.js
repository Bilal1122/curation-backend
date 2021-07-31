module.exports = {
  response: (type, message = null, data = null, err = null) => {
    if (type == "MD") {
      // Missing Data
      return {
        type: "MissingData",
        status: false,
        message: message || "Required data is missing.",
        data,
        err,
      };
    } else if (type == "PD") {
      // permission denied
      return {
        type: "permission Denied",
        status: false,
        message: "You don't have access to complete this process right now.",
        data,
        err,
        logout: true,
      };
    } else if (type == "ID") {
      // Invalid Data
      return {
        type: "InvalidData",
        status: false,
        message,
        data,
        err,
      };
    } else if (type == "S") {
      //success
      return {
        type: "Success",
        status: true,
        message: message || "Successful.",
        data,
        err,
      };
    } else {
      //something went wrong
      return {
        type: "SomethingWentWrong",
        status: false,
        message: message || "Something went wrong. Please try again or later.",
        data,
        err,
      };
    }
  },
};
