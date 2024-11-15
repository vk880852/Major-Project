import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId=req.user._id;
    if(!videoId.trim()||!isValidObjectId(videoId))
    {
        throw new ApiError(200,"videoId is not valid");
    }
    const existlike=await Like.findOne({
        likedBy:userId,
        video:videoId
    })
    if(!existlike)
    {
       const newlike=await Like.create({
           likedBy:userId,
           video:videoId
       })
       return res.status(201).json(new ApiResponse(201,"like is done",newlike));
    }
    const deletelike=await Like.findByIdAndDelete(existlike._id);
    return res.status(201).json(new ApiResponse(201,"unlike is done successsfully",deletelike));
    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!commentId.trim()||!isValidObjectId(commentId))
    {
        throw new ApiError(401,"something went wrong");
    }
    const existlike=await Like.findOne({
        likedBy:userId,
        comment:commentId
    })
    if(!existlike)
    {
       const newlike=await Like.create({
           likedBy:userId,
           comment:commentId
       })
       return res.status(201).json(new ApiResponse(201,"like is done",newlike));
    }
    const deletelike=await Like.findByIdAndDelete(existlike._id);
    return res.status(201).json(new ApiResponse(201,"unlike is done successsfully",deletelike));

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId.trim()||!isValidObjectId(tweetId))
        {
            throw new ApiError(401,"something went wrong");
        }
        const existlike=await Like.findOne({
            likedBy:userId,
            tweet:tweetId
        })
        if(!existlike)
        {
           const newlike=await Like.create({
               likedBy:userId,
               tweet:tweetId

           })
           return res.status(201).json(new ApiResponse(201,"like is done",newlike));
        }
        const deletelike=await Like.findByIdAndDelete(existlike._id);
        return res.status(201).json(new ApiResponse(201,"unlike is done successsfully",deletelike));
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos
    const liked_video = await Like.aggregate([
        {
            $match: {
                likedBy: req.user._id,
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video_information",
                pipeline: [
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            view: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video_information"  
        },
        {
            $project: {
                video_information: 1  
            }
        }
    ]);
    return res.status(201).json(new ApiResponse(201,"liked Video",liked_video));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}