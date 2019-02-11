'use strict'
//Import dependencies
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const objectID = require('mongodb').ObjectID;

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

//GET route handler for all user's players
//-find current user & return array of players
//-send JSON response
router.get('/players', jwtAuth, (req, res) => {
    return User.findOne({username: req.user.username}, "players")
        .populate({
            model: Player,
            path: 'players'
        })
        .then(players => {
            return res.status(200).json(players);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Internal server error' });
        });
});

//GET route handler for all user's players by position
//-find current user & return array of players for specific position
//-send JSON response
router.get('/players/:position', jwtAuth, (req, res) => {
    return User.findOne({ username: req.user.username }, 'players')
        .populate({
            model: Player,
            path: 'players',
            match: { position: { $eq: req.params.position } }
        })
        .then(players => {
            return res.status(200).json(players);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        });
});

//PUT route handler for adding a player to a user
//-validate ID
//-find current user & add player to array of players
//-send JSON response
router.put('/players/:id', jwtAuth, (req, res) => {
    if(!objectID.isValid(req.params.id)){
        return res.status(400).json({ message: 'Bad ID' });
    }

    Player.findById(req.params.id)
        .then(player => {
            if (!player) {
                return res.status(404).json({ message: 'ID not found'});
            } else {
                console.log('ID validated');
            }
        });

    return User.updateOne({ username: req.user.username }, { $push: { players: req.params.id }}, { new: true })
        .then(() => {
            return res.status(200).json({ message: 'Player added to user ' });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        });
});

//DELETE route handler for removing a player from a user
//-validate ID
//-find current user & remove player from array of players
//-send JSON response
router.delete('/players/:id', jwtAuth, (req, res) => {
    if(!objectID.isValid(req.params.id)){
        return res.status(400).json({ message: 'Bad ID' });
    }

    Player.findById(req.params.id)
        .then(player => {
            if (!player) {
                return res.status(404).json({ message: 'ID not found'});
            } else {
                console.log('ID validated');
            }
        });
    
    return User.updateOne({ username: req.user.username }, { $pull: { players: req.params.id }}, { new: true })
        .then(() => {
            return res.status(200).json({ message: 'Player removed from user '});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        });
});

module.exports = router;