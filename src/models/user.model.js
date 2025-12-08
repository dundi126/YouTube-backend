import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //Cloudinary public_id or url
      default: "",
      required: true,
    },
    coverImage: {
      type: String, //Cloudinary public_id or url
      default: "",
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: ["true", "Password is required!!!"],
    },
    refereshTokens: {
      type: String,
    },
  },
  { timestamps: true }
);


userSchema.pre("save", async function (next) { 
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function (password) { 
    return await bcrypt.compare(password, this.password);
}

userScheama.methods.generateAccessToken = function () { 
    jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
         

    )
}

userScheama.methods.generateRefereshToken = function () {
        jwt.sign(
          {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullname: this.fullname,
          },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
        );

};

export const User = mongoose.model("User", userSchema);
