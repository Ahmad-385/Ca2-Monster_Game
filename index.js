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
  
  

  // Route to render the homepage
router.get("/", (req, res) => {
    res.render("index");
  });
  
  // Route to render the login page
  router.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect("/game");
    }
    const errorMessage = req.flash("error");
    return res.render("login", { errorMessage });
  });
  
  // Route to handle login
  router.post(
    "/login",
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
      failureMessage: true,
    }),
    function (req, res) {
      res.redirect("/game");
    }
  );
  
  // Route to handle logout
  router.get("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.log("Error logging out: ", err);
      }
      res.redirect("/");
    });
  });
  
  // Route to render the register page
  router.get("/register", (req, res) => {
    if (req.isAuthenticated()) res.redirect("/game");
    res.render("register", {
      errorMessage: null,
    });
  });
  
  // Route to handle registration
  router.post("/register", (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect("/game");
    }
    const newUser = new User({
      name: req.body.name,
      username: req.body.username,
    });
    
    // Register the user with passport
    User.register(newUser, req.body.password, (err) => {
      if (err) {
        if (err.name === "MissingUsernameError") {
          return res.render("register", {
            errorMessage: "Please enter a username",
          });
        } else if (err.name === "MissingPasswordError") {
          return res.render("register", {
            errorMessage: "Please enter a password",
          });
        } else if (err.name === "UserExistsError") {
          return res.render("register", {
            errorMessage: "This username already exists",
          });
        } else {
          return res.render("register", { errorMessage: "An error occurred" });
        }
      }
      passport.authenticate("local")(req, res, () => {
        return res.redirect("/game");
      });
    });
  });
  

  // Route to render the game page
router.get("/game", async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    const user = req.user;
    // Find an ongoing game with only one player
    let game = await Game.findOne({
      status: "ongoing",
      players: { $size: 1 },
    });
  
    if (game) {
      // Add current user to the existing game if they are the same player
      if (game.players[0]._id.toString() === user._id.toString()) {
        game = await game.populate("players");
        return res.render("game", { user, game });
      }
      // Add current user to the existing game as the second player
      game.players.push(user._id);
      await game.save();
      game = game;
    } else {
      // Create a new game with the current user
  