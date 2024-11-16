import mongoose, {isValidObjectId} from "mongoose"
import {Playlist, Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import {Video} from '../models/video.model.js'


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body;
     if(!name.trim()||!description.trim())
     {
        throw new ApiError(401,"name or description is required");
     }
     const playlist=await Playlist.create({
        name,
        description,
        owner:req.user._id
     })
     return res.status(201).send(new ApiResponse(201,"Playlist is created",playlist));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!userId.trim()||!isValidObjectId(userId))
    {
        throw new ApiError(401,"UserId is not defined");
    }
    const playlist=await Playlist.aggregate([
        {
            $match:{
               owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
             $lookup:{
                from:"videos",
                foreignField:"_id",
                localField:"videos",
                as:"video_information",
                pipeline:[
                    {
                        $project:{
                            videoFile:1,
                            thumbnail:1,
                            title:1,
                            description:1,
                            duration:1,
                            view:1,
                            owner:1,
                        }
                    }
                ]
             }
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
          $project:{
            video_information:1
          } 
        }
       
    ]);
     return res.status(201).json(new ApiResponse(201,"PlayList is retrived",playlist));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!playlistId.trim()||isValidObjectId(playlistId))
    {
        throw new ApiError(401,"playlist is not valid");
    }
    const playlist=await Playlist.findById(playlistId);
    if(!playlist)
    {
        throw new ApiError(401,"playlist is not formed");
    }
    const exitplaylist=await Playlist.aggregate([
        {
            $match:_id,
        },
        {
            $lookup:{
                from:"videos",
                foreignField:"_id",
                localField:"videos",
                as:"video_information",
                pipeline:[
                    {
                        $project:{
                            videoFile:1,
                            thumbnail:1,
                            title:1,
                            description:1,
                            duration:1,
                            view:1,
                            owner:1,
                        }
                    }
                ]
             }
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
          $project:{
            video_information:1
          } 
        }
    ])
    return res.staus(201).json(new ApiResponse(201,"playlist is not retrieved",exitplaylist))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const exitplaylist=await Playlist.findById(playlistId);
    if(!exitplaylist)
    {
        throw new ApiError(401,"playlist is not exist");
    }
  const sum=(exitplaylist.videos.some((x)=>{
        return (x==videoId)
    }))
    if(sum)
    {
        return res.status(201).send(new ApiResponse(201,"It is already add to playlist"),[]);
    }
    if(playlistId.owner.to_string()!==req.user_id.to_string())
    {
        return res.status(301).send(new ApiResponse(301,"Unauthorised User"));
    }
    exitplaylist.videos=[...exitplaylist.videos,videoId];
    await Playlist.save();
    const newPlaylist=await Playlist.findById(playlistId);
    return res.status(201).json(new ApiResponse(201,"videos is added to the playlist",newPlaylist));
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
      throw new ApiError(400, "playlist id is required or invalid!");
    }
    if (!videoId.trim() || !isValidObjectId(videoId)) {
      throw new ApiError(400, "video id is required or invalid!");
    }
    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "video not found!");
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      throw new ApiError(404, "playlist not found!");
    }

    if (playlist.owner.toString() != (req.user?._id).toString()) {
      throw new ApiError(401, "UNauthorised user!");
    }
    if (!playlist.videos.includes(videoId)) {
      throw new ApiError(
        400,
        "video is not added to playlist so you cant remove it!"
      );
    }

    const removeVideoplaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $pull: { videos: new mongoose.Types.ObjectId(videoId) },
      },
      {
        $lookup: {
            from: "videos", 
            localField: "videos",
            foreignField: "_id",
            as: "Videos_information",
            pipeline: [
                {
                    $project: {
                        videoFile: 1,
                        thumbnail: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        view: 1
                    }
                }
            ]
        }
    },
    {
        $unwind: {
            path: "$Videos_information",
            preserveNullAndEmptyArrays: true 
        }
    },
    {
        $project:{
            Videos_information:1
        }
    },
      {
        new: true,
      }
    );

    if (!removeVideoplaylist) {
      throw new ApiError(500, "playlist is empty");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200,"remove video from playlist!",removeVideoplaylist)
      );

    })

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!playlistId.trim()||!isValidObjectId(playlistId))
    {
        throw new ApiError(201,"playlist_id does not correct");
    }
    const exist_playlist=await Playlist.findById(playlistId);
    if(!exist_playlist)
    {
        throw new ApiError(201,"playlist does not correct");
    }
    if(exist_playlist.owner.toString()!==req.user._id.to_String())
    {
        throw ApiError(401,"UnAuthorized Access");
    }
    const deleteplaylist=await Playlist.findByIdAndDelete(playlistId);
    return res.status(201).json(new ApiResponse(201,"playlist is deleted successfully",deleteplaylist))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    // Validate playlistId
    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlistId");
    }

    // Check if playlist exists
    const exist_playlist = await Playlist.findById(playlistId);
    if (!exist_playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Check ownership of the playlist
    if (exist_playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized Access");
    }

    // Perform the playlist update (name and description)
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: { name, description } },
        { new: true } 
    );

    const updatedPlaylistWithVideos = await Playlist.aggregate([
        {
            $match: { 
                _id: new mongoose.Types.ObjectId(playlistId), 
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos", 
                localField: "videos",
                foreignField: "_id",
                as: "Videos_information",
                pipeline: [
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            view: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$Videos_information",
                preserveNullAndEmptyArrays: true 
            }
        },
        {
            $project:{
                Videos_information:1
            }
        }
    ]);

   
    return res.status(200).json({
        message: "Playlist updated successfully",
        playlist: updatedPlaylistWithVideos
    });
});


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}