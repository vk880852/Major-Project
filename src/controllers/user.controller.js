import asyncHandler from "../utils/asyncHandler.js";

import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import {uploadOnCloudinary,deleteOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
//// All stuffed related to the user
const generateAccessAndRefreshToken=async(user)=>
{
    try{
        const accessToken=await user.generateAccessToken();
        const refreshtoken=await user.generateRefreshToken();
        user.refreshtoken=refreshtoken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshtoken}
    }
    catch(error)
    {
        console.log("error occurs while generating refresh and access tokens",error)
    }
}
const registerUser = asyncHandler(async (req, res) => {
    const { username, fullname, email, password } = req.body;
    if ([username, fullname, email, password].some(field => field?.trim()==="")) {
        throw new ApiError(400, "All fields are required");
    }
    if (await User.findOne({ $or: [{ username }, { email }] })) {
        throw new ApiError(409, "Username or email already exists");
    }
    const avatarLocalPath = req.files?.avatar?.[0]?.path||"";
    const coverLocalPath = req.files?.coverimage?.[0]?.path || "";
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverimage = coverLocalPath ? await uploadOnCloudinary(coverLocalPath) : "";

    if (!avatar) {
        throw new ApiError(500, "Error uploading avatar file");
    }

    const newUser = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username:username.toLowerCase(),
    });
    if (!newUser) {
        throw new ApiError(500, "Error creating user");
    }

    const createdUser = await User.findById(newUser._id).select("-password -refreshtoken");

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});
const loginUser=asyncHandler(async(req,res)=>{
    const { username, email, password } = req.body;
    if(!(username||email))
    {
     throw new ApiError(400,"username and password is required");
    }
    const isUser=await User.findOne({$or:[{username},{email}]});
    if(!isUser)
    {
        throw new ApiError(400,"user does not exist");
    }
    const isPasswordvalid=await isUser.isPasswordCorrect(password);
    if(!isPasswordvalid)
    {
        throw new ApiError(401,"Password is not correct");
    }
    const {accessToken,refreshtoken}=await generateAccessAndRefreshToken(isUser);
    const loginUser=await User.findById(isUser._id).select("-password -refreshtoken");
    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(201).cookie("accesstoken",accessToken,options).cookie("refreshtoken",refreshtoken,options).json(new ApiResponse(201,{loginUser,refreshtoken,accessToken}
        ,"User loggedin Successfully"));
})
const logoutUser = asyncHandler(async (req, res) => {
    const loggedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshtoken: 1 } },
    );

    // Now you can perform any operation with the updated user data
    // For example, sending a response back to the client
    const option={
      httpOnly:true,
      secure:true
    }
    return res
    .status(200)
    .clearCookie("accesstoken", option)
    .clearCookie("refreshtoken", option)
    .json(new ApiResponse(200, {}, "User logged Out"))
});
const refreshAccessToken=asyncHandler(async(req,res)=>{
    const oldrefreshtoken=req.cookies.refreshtoken||req.body.refreshtoken;
    if(!oldrefreshtoken)
    {
        throw new ApiError(401,"UnAuthorised request")
    }
    try {
        const decodedtoken= jwt.verify(oldrefreshtoken,process.env.REFRESH_TOKEN_SECRET);
        const user=await User.findById(decodedtoken?._id);
        const newrefreshtoken=user?.refreshtoken;
        if(oldrefreshtoken!==newrefreshtoken)
        {
            throw new ApiError(401,"UnAuthorised access||Refresh token is expired or used");
        }
        const {accessToken,refreshtoken}=await generateAccessAndRefreshToken(user);
        const option={
            httpOnly:true,
            secure:true
        }
        return res.status(200).cookie("accesstoken",accessToken,option).cookie("refreshtoken",refreshtoken,option).json(
            new ApiResponse(200,{refreshtoken,accessToken},"Access token Refreshed")
        )
    } catch (error) {
        throw new ApiError(401,"Invalid refresh-token");
    }
})
const changeCurrentPassword=asyncHandler(async(req,res)=>{
      const {newPassword,confirmPassword,oldPassword}=req.body;
      if(newPassword!==confirmPassword)
      {
        return new ApiError(201,"newPassword and confirmPassword is not same");
      }
      const user=await User.findById(req.user._id);
      const verifypassword=await user.isPasswordCorrect(oldPassword);
      if(!verifypassword)
      {
        throw new ApiError(400,"invalid Password");
      }
      user.password=newPassword;
      await user.save({validateBeforeSave:false});
      return res.status(200).json(new ApiResponse(200,{},"password change successfully")); 
})
const updateAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req?.file?.path;
    if(!avatarLocalPath)
    {
        throw new ApiError(400,"new avatar-file is not availble");
    }
    const oldAvatar = req.user.avatar;
    const avatarh = oldAvatar.split("/");
    const publicIdavatar= avatarh[avatarh.length - 1].split(".")[0];
    deleteOnCloudinary(publicIdavatar);
    const cloudinarylocalpath=await uploadOnCloudinary(avatarLocalPath);
    const user=await User.findOneAndUpdate(req.user._id,{
         $set:{
             avatar:cloudinarylocalpath.url
        }
     }).select("-password -refreshtoken");
     return res.status(200).json(new ApiResponse(200,user,"Avatar-file is uploaded successfully"));
})
const updateCoverimage=asyncHandler(async(req,res)=>{
    
    const coverimageLocalPath=req?.file?.path;
    if(!coverimageLocalPath)
    {
        throw new ApiError(400,"new avatar-file is not availble");
    }
    const oldcoverimage = req.user.coverimage;
    const avatarh = oldcoverimage.split("/");
    const publicIdavatar= avatarh[avatarh.length - 1].split(".")[0];
    deleteOnCloudinary(publicIdavatar);
    const cloudinarylocalpath=await uploadOnCloudinary(coverimageLocalPath);
    const user=await User.findOneAndUpdate(req.user._id,{
         $set:{
             coverimage:cloudinarylocalpath.url
        }
     }).select("-password -refreshtoken");
     return res.status(200).json(new ApiResponse(200,user,"coverimage-file is uploaded successfully"));
})
const getUserChannelProfile = asyncHandler(async (req, res) => {
    let { username } = req.params;
    if (!username) {
        throw new ApiError(400, "Username is not provided");
    }
    
    username = username.trim();
    //console.log(username);
    const channel = await User.aggregate([
        {
            $match: { username: username?.toLowerCase() }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                _id:0,// Exclude _id field
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverimage: 1,
                email: 1
            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist");
    }
    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
});
const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})
export  
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAvatar,
    updateCoverimage,
    getUserChannelProfile,
    getWatchHistory
};
