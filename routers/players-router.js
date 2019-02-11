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

//POST route handler for creating a player
//-validate request body
//-check if player already exists
//-create player & send JSON response
router.post('/', jsonParser, jwtAuth, (req, res) => {
    const requiredFields = ['name', 'position', 'number', 'team'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField) {
        const message = `Missing ${missingField} in request body`;
        console.error(message);
        return res.status(400).json({ message });
    }

    Player.findOne({ name: req.body.name })
        .then(player => {
            if (player) {
                const message = 'Player already exists';
                console.error(message);
                return res.status(400).json({ message });
            } else {
                return Player.create({
                   name: req.body.name,
                   position: req.body.position,
                   number: req.body.number,
                   team: req.body.team
                })
                .then(player => {
                    return res.status(201).json(player.serialize());
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).json({ message: 'All fields must be strings' });
                });
            }
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        });

});

module.exports = router;