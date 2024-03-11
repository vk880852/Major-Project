import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDB=async()=>{
    try{
        const p= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`mongodb is connected ${p.connection.host}`);
    }
    catch(error)
    {
        console.log("error happened during connect with database",error);
        process.exit(1);
    }
}
export {connectDB};