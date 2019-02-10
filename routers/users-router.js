'use strict'
//Import dependencies
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');

//Import modules
const { User, Player } = require('../models');

//Declare JSON parser
const jsonParser = bodyParser.json();

//Create router instance
const router = express.Router();

//Declare JWT strategy middleware
const jwtAuth = passport.authenticate('jwt', {session: false});

//POST route handler to register a new user
//-validate fields
//-check if username already exists
//-hash password, create user & send JSON response
router.post('/', jsonParser, (req, res) => {
    const requiredFields = ['username', 'password', 'firstName', 'lastName'];

    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Missing Field',
            location: missingField
        });
    }
    
    const nonStringField = requiredFields.find(field => 
        field in req.body && typeof req.body[field] !== 'string'
    );
    if (nonStringField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });  
    }

    const explicitlyTrimmedFields = ['username', 'password'];
    const nonTrimmedField = explicitlyTrimmedFields.find(field => 
        req.body[field].trim() !== req.body[field]
    );
    if (nonTrimmedField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Cannot start or end with whitespace',
            location: nonTrimmedField
        });
    }

    const sizedFields = {
        username: { min: 1 },
        password: {
            min: 7,
            max: 72
        }
    };
    const tooSmallField = Object.keys(sizedFields).find(field => 
        'min' in sizedFields[field] && req.body[field].trim().length < sizedFields[field].min
    );
    const tooLargeField = Object.keys(sizedFields).find(field =>
        'max' in sizedFields[field] && req.body[field].trim().length > sizedFields[field].max
    );
    if (tooSmallField || tooLargeField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: tooSmallField ? `Must be at least ${sizedFields[tooSmallField].min} characters long` : 
            `Must be at most ${sizedFields[tooLargeField].max} characters long`,
            location: tooSmallField || tooLargeField
        });
    }

    let { username, password, firstName, lastName } = req.body;
    firstName = firstName.trim();
    lastName = lastName.trim();

    return User.find({username})
        .countDocuments()
        .then(count => {
            if (count > 0) {
                return Promise.reject({
                    code: 422,
                    reason: 'ValidationError',
                    message: 'username already taken',
                    location: 'username'
                });
            }
            return User.hashPassword(password);
        })
        .then(hash => {
            return User.create({username, password: hash, firstName, lastName});
        })
        .then(user => {
            return res.status(201).json(user.serialize());
        })
        .catch(err => {
            console.error(err);
            if (err.reason === 'ValidationError') {
                return res.status(err.code).json(err);
            }
            res.status(500).json('Internal server error');
        });
});

module.exports = router;