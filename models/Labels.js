const mongoose = require("mongoose");


const LabelsSchema = mongoose.Schema({
    name:{
        type:[String],
        required:true
    }
},{
    timestamps:true
})



module.exports = Labels = mongoose.model("label",LabelsSchema);