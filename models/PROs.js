const mongoose = require("mongoose");



const PROSchema = mongoose.Schema({
    name:{
        type:[String],
        required:true
    }
},{
    timestamps:true
})


module.exports = PRO = mongoose.model("pro",PROSchema);