import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser=asyncHandler(async(req,res,next)=>
{
    //take the email and userid  and password
    const {username,fullname,email,password}=req.body;
    
    if([username,fullname,email,password].some((field)=>field?.trim()===""))
    {
        throw new ApiError(400,"All fields are required");
    }
    if(await User.findOne({$or:[{username,email}]}))
    {
      throw new ApiError(409,"username or email already exist");
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverLocalPath=req.files?.coverimage[0]?.path;
    if(!avatarLocalPath)
    {
      throw new ApiError(400,"avatar file is required");
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverimage=await uploadOnCloudinary(coverLocalPath);
    if(!avatar)
    {
      throw new ApiError(400,"avatar file is required");
    }
   const user= await User.create({
      fullname,
      avatar:avatar.url,
      coverimage:coverimage?.url,
      email,
      password,
      username:username.toLowerCase(),
    })
    const createduser=User.findById(user._id).select("-password -refreshtoken");
    if(!createduser)
    {
      throw new ApiError(500, 'something went wrong while registering');
    }
    return res.status(201).json(new ApiResponse(200,createduser,"user registered successfully"));
   
   

})
export default registerUser