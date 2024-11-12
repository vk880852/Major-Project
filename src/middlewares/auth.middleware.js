import asyncHandler from "../utils/asyncHandler.js";
import jwt  from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
export const verifyJWT=asyncHandler(async(req,res,next)=>{
      console.log(`Jai Shree Ram-Krishna Auth`);
      const token = (req.cookies?.accesstoken) || (req.header("Authorization")?.replace("Bearer ", ""));
      if(!token)
      {
            throw new ApiError(401,"Unauthorised token");
      }
      try{
           const decodedToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
           const user=await User.findById(decodedToken._id).select("-password -refreshtoken");
           if(!user)
           {
            throw new ApiError(401,"invalid access Token");
           }
           req.user=user;
           next();
      }
      catch(error)
      {
            throw new ApiError(401,error?.message||"invalid access token");
      }
});