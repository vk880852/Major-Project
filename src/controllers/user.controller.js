import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";

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
    // Take the email, username, fullname, and password from request body
    const { username, fullname, email, password } = req.body;
    // Check if any required field is empty
    if ([username, fullname, email, password].some(field => field?.trim()==="")) {
        throw new ApiError(400, "All fields are required");
    }
    // Check if username or email already exists
    if (await User.findOne({ $or: [{ username }, { email }] })) {
        throw new ApiError(409, "Username or email already exists");
    }
    // Get the local paths of avatar and cover image files
    const avatarLocalPath = req.files?.avatar?.[0]?.path||"";
    const coverLocalPath = req.files?.coverimage?.[0]?.path || "";
    // Check if avatar file is provided
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    
    // Upload avatar and cover image files to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverimage = coverLocalPath ? await uploadOnCloudinary(coverLocalPath) : "";

    // Check if avatar upload was successful
    if (!avatar) {
        throw new ApiError(500, "Error uploading avatar file");
    }

    //Create the user
    const newUser = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username:username.toLowerCase(),
    });
    // Check if user creation was successful
    if (!newUser) {
        throw new ApiError(500, "Error creating user");
    }

    // Return the newly created user (excluding sensitive information)
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
        { $set: { refreshtoken: undefined } },
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
       // console.log(user);
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


export  {registerUser,loginUser,logoutUser,refreshAccessToken};
