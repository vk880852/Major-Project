import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';
const app=express();
// app.use(cors({
//     origin:process.env.CORS_ORIGIN,
//     credentials:true
// }));
app.use(cors());
app.use(express.json({
    limit:"16kb"
}))
app.use(express.urlencoded({
    limit:"16kb"
}))
app.use(express.static("public"));
app.use(cookieParser());
import userRouter from './routes/user.routes.js'
import  videoRouter from './routes/video.routes.js'
import tweetRouter from './routes/tweet.routes.js'
import subcriptionRouter from './routes/subscription.routes.js'
import commentRouter from './routes/comment.routes.js'
import likeRouter from './routes/like.routes.js'
app.use("/api/v1/users",userRouter);
app.use("/api/v1",videoRouter);
app.use("/api/v1",tweetRouter);
app.use("/api/v1",subcriptionRouter);
app.use("/api/v1",commentRouter);
app.use("/api/v1/like",likeRouter);
export {app}