import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  asyncHandler  from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    const { text } = req.body; 
  
    const newTweet = await Tweet.create({ content:text, owner: req.user._id });
    
    console.log({text,newTweet});
    const fullInformation = await Tweet.findById(newTweet._id).populate({
        path: "owner",
        select: "-password -refreshtoken"
    });

    return res.status(201).json({
        status: 201,
        message: "Tweet created successfully.",
        data: fullInformation
    });
});


const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params; 
    console.log(userId);
    if (!isValidObjectId(userId)) {
        console.log("Invalid user ID.");
        throw new ApiError(400, "Invalid user ID.");
    }

    const tweets = await Tweet.find({ owner: userId }).populate("owner", "-password -refreshToken");
    return res.status(200).json(new ApiResponse(tweets, "User tweets retrieved successfully."));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params; 
    const { content } = req.body; 

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId, { content }, { new: true }).populate("owner", "-password -refreshToken");

    if (!updatedTweet) {
        throw new ApiError(404, "Tweet not found.");
    }

    return res.status(200).json(new ApiResponse(updatedTweet, "Tweet updated successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet) {
        throw new ApiError(404, "Tweet not found.");
    }

    return res.status(200).json(new ApiResponse(null, "Tweet deleted successfully."));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};
