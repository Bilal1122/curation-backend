const {groupSocket} = require("../routes/Admin/Groups")

const connectSockets = (io)=>{
    io.on("connection", (client) => {
        groupSocket(io,client)
    });
}


module.exports = connectSockets
