//required("dotenv").config({path: './env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({ path: "./.env" });

connectDB();

/*
import express from "express";
const app = express();
(async () => {
  try {
      await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
      app.on("listening", () => { 
          console.log(`Server is listening on port ${process.env.PORT}`);
      });
      app.on("error", (error) => {
          console.log("Error starting server", error);
      });

  } catch (error) {
    console.log("Error connecting to database", error);
  }
})();
*/
