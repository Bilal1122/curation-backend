const readline = require("readline");
const fs = require("fs");


module.exports = {

  getFileContent: function(filename, onDoneCB) {
    let allWC = [];
    const readInterface = readline.createInterface({
      input: fs.createReadStream( `./dataSet/${filename}.txt`),
      console: false
    });

    readInterface.on("line", function(line) {
      const parts = line.trim().split("\t");
      allWC.push(parts);
    });

    readInterface.on("close", () => {
      onDoneCB(allWC);
    });
  }
};
