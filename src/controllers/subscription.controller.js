import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user._id; 
    const existingSubscription = await Subscription.findOne({
        subcriber: subscriberId,
        channel: channelId
    });

    if (existingSubscription) {
        await Subscription.deleteOne({ _id: existingSubscription._id });
        return res.status(200).json({
            status: 200,
            message: "Unsubscribed successfully."
        });
    } else {
        const newSubscription = await Subscription.create({
            subcriber: (subscriberId),
            channel: channelId
        });
        return res.status(201).json({
            status: 201,
            message: "Subscribed successfully.",
            data: newSubscription
        });
    }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId.trim() || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid or missing channelId");
    }

    const channel = await User.findById(channelId).select("-coverimage -watchhistory -password -refreshtoken");
    if (!channel) {
        throw new ApiError(400, "Channel does not exist");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: { 
                channel: new mongoose.Types.ObjectId(channelId), 
            }
        },
        {
            $lookup: { 
                from: "users",  
                localField: "subcriber",  
                foreignField: "_id",   
                as: "subcriberDetails",  
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: { 
                path: "$subcriberDetails",
                preserveNullAndEmptyArrays: true  
            }
        },
        {
            $project: {
                subcriber: "$subcriberDetails" 
            }
        }
    ]);

    if (!subscribers || subscribers.length === 0) {
        return res.status(404).json(new ApiResponse(404, "No subscribers found", null));
    }

    return res.status(200).json(new ApiResponse(200, "Subscribers fetched successfully", subscribers));
});



const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if(!channelId.trim()||!isValidObjectId(channelId))
    {
        throw new ApiError(400,"invalide subscriber Id");
    }
    const channel=await User.findById(channelId);
    if(!channel)
    {
        throw new ApiError(400,"channel is not found");
    }
    const getsubschannel=await Subscription.aggregate([
        {
            $match:{
                subcriber:new mongoose.Types.ObjectId(channelId),
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel_information",
                pipeline:[
                    {
                    $project:{
                        fullname:1,
                        username:1,
                        avatar:1
                    }
                    }
                ]
            }
        },
        {
            $unwind:{
                path:"$channel_information",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project:{
               subcribed_channel:"$channel_information"
            }
        },
        {
            $replaceRoot: {
              newRoot: "$subcribed_channel",
            },
          },
    ]);
    console.log(getsubschannel);
return res.status(201).json(new ApiResponse(200,"list of subscribered channels",getsubschannel))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}