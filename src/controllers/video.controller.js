import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary,deleteOnCloudinary } from "../utils/cloudinary.js";
import { parse } from "dotenv";
import { ApiError } from "../utils/ApiError.js";

const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
     const filters = {};
     const page1=parseInt(page);
     const limit1=parseInt(limit);
     if(userId && isValidObjectId(userId))
     {
        filters["$match"]={
             owner:new mongoose.Types.ObjectId(userId),
        }
     }
     if (query) {
        if (filters["$match"]) {
          filters["$match"]["$or"] = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ];
        } else {
          filters["$match"] = {
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
            ],
          };
        }
      }
      if(query && userId)
      {
        filters["$match"]={
            $and:[
                {owner:new mongoose.Types.ObjectId(userId)},
                {
                $or:[
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                ]
                }
            ]
        }
      }

    const sortOptions = {};
    if(sortBy && sortType)
    {
        sortOptions["$sort"]={
            [sortBy]:sortType==='asc'?1:-1
        }
    }
    else 
    {
        sortOptions["$sort"]={
            createdAt: -1,
        }
    }
    const videos=await Video.aggregate([
        filters,
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner_information",
                pipeline:[
                    {
                    $project:{
                        username:1,
                        fullname:1,
                        avatar:1,
                    }
                },
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes",
            }
        },
        sortOptions,
        {
            $skip:(page1-1)*(limit1),
        },
        {
            $limit:(limit1)
        },
        {
            $addFields:{
               owner_information:
               { 
                $first:"$owner_information",
               },
               likes:{
                $size:"$likes"
               },
            }
        }
    ])
    if(!videos)
    {
        throw new ApiError(404,"videos not found");
    }
    return res.status(200).json(new ApiResponse(200,"Videos fetched successfully", videos));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const videoPath = req.files?.videoFile?.[0]?.path;
    const thumbnailPath = req.files?.thumbnail?.[0]?.path;

    if (!videoPath || !thumbnailPath) {
        const missingFile = !videoPath ? "video" : "thumbnail";
        return res.status(400).json(new ApiResponse(400, null, `${missingFile} file is required`, false));
    }

    try {
        const [videoFile, thumbnail] = await Promise.all([
            uploadOnCloudinary(videoPath),
            uploadOnCloudinary(thumbnailPath)
        ]);

        const newVideo = await Video.create({
            title,
            description,
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            owner: req.user._id 
        });
        const populatedVideo = await Video.findById(newVideo._id)
    .populate({
        path: "owner",
        select: "-password -refreshtoken" 
    });

        return res.status(201).json(new ApiResponse(201, populatedVideo, "Video uploaded successfully", true));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiResponse(500, null, "An error occurred while uploading the video", false));
    }
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid video ID", false));
    }

    const video = await Video.findById(videoId);

    if (!video) {
        return res.status(404).json(new ApiResponse(404, null, "Video not found", false));
    }
    return res.status(200).json(new ApiResponse(200, video, "Successfully fetched video", true));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!mongoose.isValidObjectId(videoId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid video ID", false));
    }

    const deletedVideo = await Video.findById(videoId);
    if (deletedVideo && deletedVideo.videoFile) {
        const newVideo = deletedVideo.videoFile.split("/").at(-1).split(".").at(0);
        await deleteOnCloudinary(newVideo);
    }

    const videoPath = req.files?.videoFile?.[0]?.path;
    if (!videoPath) {
        return res.status(400).json(new ApiResponse(400, null, "Video file is required", false));
    }

    const videourl = await uploadOnCloudinary(videoPath);

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            title: title,
            description: description,
            videoFile: videourl?.url,
        },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully", true));
});


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid video ID", false));
    }
    const deletedVideo = await Video.findById(videoId);
    const newVideo=deletedVideo.videoFile.split("/").at(-1).split(".").at(0);
    await deleteOnCloudinary(newVideo);
    if (!deletedVideo) {
        return res.status(404).json(new ApiResponse(404,deletedVideo, "Video not found", false));
    }
    return res.status(200).json(new ApiResponse(200, deletedVideo, "Video deleted successfully", true));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid video ID", false));
    }

    const video = await Video.findById(videoId);

    if (!video) {
        return res.status(404).json(new ApiResponse(404, null, "Video not found", false));
    }

    video.isPublished = !video.isPublished;
    await video.save();

    return res.status(200).json(new ApiResponse(200, video, "Video publish status toggled", true));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
