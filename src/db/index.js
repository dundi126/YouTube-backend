import mongoose from "mongoose";
import { DB_NAME } from "../contants.js";

const connectDB = async () => {
  try {
    const connectionInstaince = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log(`Mongodb connected ${connectionInstaince.connection.host}`);
  } catch (error) {
    console.log("Error connecting to database failed!!!", error);
    process.exit(1);
  }
};

export default connectDB;
