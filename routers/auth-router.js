'use strict'
//Import dependencies
const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

//Import modules
const config = require('../config');

//Declare JSON parser
const jsonParser = bodyParser.json();

//Create router instance
const router = express.Router();

//Declare function to handle JWT creation
const createAuthToken = function(user) {
    return jwt.sign({user}, config.JWT_SECRET, {
        subject: user.username,
        expiresIn: config.JWT_EXPIRY,
        algorithm: 'HS256'
    });
}

//Declare local & JWT strategy middleware 
const localAuth = passport.authenticate('local', {session: false});
const jwtAuth = passport.authenticate('jwt', {session: false});

//Enable JSON parser & URL encoded
router.use(jsonParser);
router.use(bodyParser.urlencoded({ extended: true }));

//POST route handler for user login
router.post('/login', localAuth, (req, res) => {
    const authToken = createAuthToken(req.user.serialize());
    return res.json({authToken});
});

//POST route handler for JWT refresh
router.post('/refresh', jwtAuth, (req, res) => {
    const authToken = createAuthToken(req.user);
    return res.json({authToken})
});

module.exports = router;