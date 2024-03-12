import { connectDB } from './db/index.js';
import dotenv from "dotenv"
import { app } from './app.js';
dotenv.config({
    path:'./env'
})
connectDB().then(()=>{
    app.on("error",(error)=>{
       console.log("error",error);
       throw error;
    })
    app.listen(process.env.PORT||8000,()=>{
        console.log("connected to the server");
    })
}).catch(error,()=>{
    console.log("error occurs during to connect db",db)
});

