import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'
import express from 'express'
import asyncHandler from './asyncHandler.js';
import { ApiError } from './ApiError.js';
const app=express(); 
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET
});
const uploadOnCloudinary=async(localpath)=>{
    try{
         if(!localpath)return null;
       const res=  await cloudinary.uploader.upload(localpath,{
            resource_type:'auto'
         })
         fs.unlinkSync(localpath);
         return res; 
    }
    catch(error)
    {
        fs.unlinkSync(localpath);
        //if uplaod is failed
        return null
    }
}
const deleteOnCloudinary=async(localpath)=>{
  try{
     await cloudinary.uploader.destroy(localpath);
     console.log("old avatar deleted successfully");
  }
  catch(error)
  {
    throw new ApiError("failed during deletion",error);
  }
}

export { uploadOnCloudinary,deleteOnCloudinary};