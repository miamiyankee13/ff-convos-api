'use strict'
//Import dependencies
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const objectID = require('mongodb').ObjectID;

//Declare JSON parser
const jsonParser = bodyParser.json();

//Import modules
const { Player } = require('../models');

//Create router instance
const router = express.Router();

//Declare JWT strategy middleware
const jwtAuth = passport.authenticate('jwt', { session: false });