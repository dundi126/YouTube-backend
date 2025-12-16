import mongoose, { Schema } from "mongoose";
import { User } from "./user.model";

const subscriptionSchema = new mongoose.Schema({
    subscriber:{
    type: mongoose.Schema.Types.ObjectId,//People who are subscribing to a channel
        ref: User
},
    channel: {
        type: mongoose.Schema.Types.ObjectId,//Channel of subscription by the owner of the account 
        ref:User
    }
    
}, { timestamps: true })

export const Subscription = mongoose.model("Subscription",subscriptionSchema)