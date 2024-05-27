const express = require("express");
const bodyParser = require("body-parser");
require("ejs");
const http = require("http");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const mongoose = require("mongoose");
const User = require("./models/user");
const flash = require("connect-flash");
const { Server } = require("socket.io");
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const Game = require("./models/game");

// Connect to MongoDB
const mongoConnect = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Error connecting to MongoDB: ", error);
    }
  };
  mongoConnect();
  
  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.static(path.join(__dirname, "public")));
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );
  
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());
  
  const LocalStrategy = require("passport-local").Strategy;
  passport.use(new LocalStrategy(User.authenticate()));
  
  const router = express.Router();
  
  