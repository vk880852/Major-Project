import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(401, "Unauthorized User or Invalid userId");
    }

    try {

        const data = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId), 
                },
            },
            {
                $lookup: {
                    from: "likes", 
                    localField: "_id",
                    foreignField: "video",
                    as: "likes",
                },
            },
            {
                $addFields: {
                    likesCount: { $size: "$likes" }, 
                },
            },
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: "$views" }, 
                    totalVideos: { $sum: 1 }, 
                    totalLikes: { $sum: "$likesCount" }, 
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id", 
                    foreignField: "channel",
                    as: "subscriptions",
                },
            },
            {
                $addFields: {
                    totalSubscribers: { $size: "$subscriptions" }, 
                },
            },
            {
                $project: {
                    _id: 0, 
                    totalViews: 1,
                    totalVideos: 1,
                    totalLikes: 1,
                    totalSubscribers: 1,
                },
            },
        ]);

        /
        if (!data || data.length === 0) {
            return res.status(404).json(new ApiResponse(404 ,"No channel stats found",data));
        }

        return res.status(200).json(new ApiResponse(200, "Channel stats fetched successfully,data"));
    } catch (err) {
        console.error("Error fetching channel stats:", err);
        throw new ApiError(500, "Error fetching channel stats");
    }
});


const getChannelVideos = asyncHandler(async (req, res) => {
    const user_id = req.user._id;

    // Validate user_id
    if (!user_id || !isValidObjectId(user_id)) {
        throw new ApiError(401, "Unauthorized access or invalid user ID.");
    }

    // Fetch videos uploaded by the user (channel owner)
    const getVideosWithStats = asyncHandler(async (req, res) => {
        let { page = 1, limit = 10, sortBy, sortType } = req.query;
    
        // Ensure page and limit are numbers and handle invalid values
        page = isNaN(page) ? 1 : Number(page);
        limit = isNaN(limit) ? 10 : Number(limit);
        if (page <= 0) page = 1;
        if (limit <= 10) limit = 10;
    
        // Default sort order: Sort by createdAt in descending order
        const sortStage = sortBy && sortType
            ? { [sortBy]: sortType === 'asc' ? 1 : -1 }
            : { createdAt: -1 };
    
        try {
            // Aggregation pipeline to retrieve videos with additional stats
            const videos = await Video.aggregate([
                {
                    $match: {
                        owner: new mongoose.Types.ObjectId(req.user?._id),
                    },
                },
                {
                    $lookup: {
                        from: "likes",  // Lookup likes for each video
                        localField: "_id",
                        foreignField: "video",
                        as: "video_like",
                        pipeline: [
                            {
                                $project: {
                                    _id: 0,  // Exclude _id field of likes
                                    video: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $unwind: {
                        path: "$video_like",
                        preserveNullAndEmptyArrays: true,  // Ensure videos with no likes are still included
                    },
                },
                {
                    // Project the fields we need, including the likes count
                    $project: {
                        title: 1,
                        description: 1,
                        video_url: 1,
                        created_at: 1,
                        video_like_count: { $size: { $ifNull: ["$video_like", []] } },
                        videoFile: 1,
                        thumbnail: 1,
                        views: 1,
                        duration: 1,
                    },
                },
                // Pagination stages
                { $skip: (page - 1) * limit },
                { $limit: limit },
                { $sort: sortStage }, // Sort according to the provided parameters
            ]);
    
            // Return the response with the videos and stats
            res.status(200).json(new ApiResponse(200, videos, "Videos retrieved successfully"));
        } catch (error) {
            console.error("Error retrieving videos:", error);
            throw new ApiError(500, "Error retrieving videos");
        }
    });
    

export {
    getChannelStats, 
    getChannelVideos
    }