import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;  // Extract videoId from URL params
    const { page = 1, limit = 10 } = req.query;  // Extract page and limit from query params

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),  // Match comments based on videoId
            },
        },
        {
            $lookup: {
                from: "users",  // Join with the "users" collection
                localField: "owner",  // Comment owner field
                foreignField: "_id",  // User _id field
                as: "comment_information",  // Alias for joined data
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $sort: {
                createdAt: -1,  // Sort by createdAt field, descending (newest first)
            },
        },
        {
            $skip: (page - 1) * limit,  // Skip comments based on page number
        },
        {
            $limit: limit,  // Limit the number of comments to the specified limit
        },
        {
            $addFields: {
                user:"$comment_information",  // Get the first element from the joined user data
            },
        },
        {
            $project: {
                user: 1,
                content: 1,  // Only return user information and content of the comment
            },
        },
    ]);

    // If no comments found, throw an error
    if (comments.length === 0) {
        throw new ApiError(404, "No comments found for this video or comments may have been deleted.");
    }

    // Return the comments in the response
    return res.status(200).json(new ApiResponse(200, "Comments found", comments));
});


const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId}=req.params;
    const {content}=req.body;
    const owner=req.user._id;
    const newComment=await Comment.create({
        content,
        video:videoId,
        owner
    })
    return res.status(201).json(new ApiResponse(201,"comment is done",newComment));
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;  // Get the commentId from URL params
    const { content } = req.body;  // Get content from the request body

    // Validate the content field
    if (!content) {
        throw new ApiError(400, "Content is required to update the comment");
    }

    // Find the comment by ID
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment does not exist");
    }

    // Update the comment's content
    comment.content = content;
    await comment.save();  // Save the updated comment

    // Aggregation to retrieve the updated comment along with user info
    const updatedComment = await Comment.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(commentId),  // Match by commentId
            }
        },
        {
            $lookup: {
                from: "users",  // Lookup the "users" collection
                localField: "owner",  // Match the "owner" field in comments with "_id" in users
                foreignField: "_id",  // Match the user _id
                as: "user",  // Alias for the result of the lookup
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,  // Select the necessary fields from the user
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                user: { $arrayElemAt: ["$user", 0] }  // Extract the first user from the array (since it's only one user)
            }
        },
        {
            $project: {
                content: 1,  // Include the updated content
                user: 1,  // Include the user information
            }
        }
    ]);

    // Return the updated comment in the response
    return res.status(200).json(new ApiResponse(200, "Comment updated successfully", updatedComment));
});


const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId}=req.params;
    console.log(commentId);
    if(!commentId.trim()||!isValidObjectId(commentId))
    {
        throw new ApiError(400,"comment id is required or invalid!")
    }
    const existcomment=await Comment.findById(commentId);
    if(!existcomment)
    {
        throw new ApiError("Comment does not exist");
    }
    if (existcomment.owner.toString() != (req.user?._id).toString()) {
        throw new ApiError(401, "Unauthorised user!");
      }
    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if (!deletedComment) {
        throw new ApiError(500, "Error while deleting comment!");
      }
  
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "comment deleted successfully!"));

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }