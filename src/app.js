import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "50kb",
  })
);

app.use(urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

export default app;
