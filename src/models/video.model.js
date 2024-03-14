import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema=new Schema(
    {
       videofile:{
        type:String,
        required:true
       },
       thumbnail:{
        Type:String,
        required:true
       },
       title:{
        Type:String,
        required:true
       },
       description:{
        Type:String,
        required:true
       },
       duration:{
        Type:Number,
        required:true
       },
       view:{
        type:Number,
        default:0
       },
       ispublished:{
        type:Boolean,
        default:true
       },
       owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
       }
},{
    timestamps:true
})
videoSchema.plugin(mongooseAggregatePaginate)
export const Video=Schema.model("Video",videoSchema)