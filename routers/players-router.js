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

//GET route handler for all players
//-find all strains, sort by name, & send JSON response
router.get('/', (req, res) => {
    return Player.find().sort({ name: 1 })
        .then(players => {
            return res.json({ players: players.map(player => player.serialize())});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        });
});

//GET route handler for individual player
//-find individual player by id & send JSON response
router.get('/:id', (req, res) => {
    if(!objectID.isValid(req.params.id)){
        return res.status(400).json({ message: 'Bad ID' });
    }

    return Player.findById(req.params.id)
        .then(player => {
            if (!player) {
                return res.status(404).json({ message: 'ID not found'});
            } else {
                console.log('ID validated');
            }

            return res.json(player.serialize());
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        })
});

//POST route handler for adding strain to DB
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

    return Player.findOne({ name: req.body.name })
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
                    res.status(400).json({ message: 'Bad request' });
                });
            }
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        });

});

//PUT route handler for updated a player
//-validate request id & updateable fields
//-update player & send JSON response
router.put('/:id', jsonParser, jwtAuth, (req, res) => {
    if(!objectID.isValid(req.params.id)){
        return res.status(400).json({ message: 'Bad ID' });
    }

    return Player.findById(req.params.id)
        .then(player => {
            if (!player) {
                return res.status(404).json({ message: 'ID not found'});
            } else {
                console.log('ID validated');
            }
            
            if (!(req.params.id && req.body._id && req.params.id === req.body._id)) {
                const message = `Request path id ${req.params.id} and request body id ${req.body._id} must match`;
                console.error(message);
                return res.status(400).send(message);
            }
        
            const updatedPlayer = {};
            const updateableFields = ['name', 'position', 'number', 'team'];
        
            updateableFields.forEach(field => {
                if (field in req.body) {
                    updatedPlayer[field] = req.body[field];
                }
            });
        
            return Player.findByIdAndUpdate(player._id, { $set: updatedPlayer }, { new: true })
                .then(player => {
                    return res.status(200).json(player.serialize());
                })
                .catch(err => {
                    console.error(err);
                    return res.status(500).json({ message: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        })
});

//DELETE route handler for removing player from DB
//-validate ID
//-delete player & send response status
router.delete('/:id', jwtAuth, (req, res) => {
    if(!objectID.isValid(req.params.id)){
        return res.status(400).json({ message: 'Bad ID' });
    }

    return Player.findById(req.params.id)
        .then(player => {
            if (!player) {
                return res.status(404).json({ message: 'ID not found'});
            } else {
                console.log('ID validated');
            }

            return Player.findByIdAndRemove(req.params.id)
                .then(() => {
                    return res.status(204).end();
                })
                .catch(err => {
                    console.error(err);
                    return res.status(500).json({ message: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        })
});

//POST route handler for adding comment to player
//-validate request ID & fields
//-add comment to player & send JSON response
router.post('/:id', jsonParser, jwtAuth, (req, res) => {
    if(!objectID.isValid(req.params.id)){
        return res.status(400).json({ message: 'Bad ID' });
    }

    return Player.findById(req.params.id)
        .then(player => {
            if (!player) {
                return res.status(404).json({ message: 'ID not found'});
            } else {
                console.log('ID validated');
            }
            
            const requiredField = 'comment';
            if (!(requiredField in req.body)) {
                const message = `Please include ${requiredField} object with 'content' & 'author' properties in request body`;
                console.error(message);
                return res.status(400).json({message});
            }

            return Player.updateOne({_id: req.params.id}, { $push: {comments: req.body.comment} }, { new: true })
                .then(() => {
                    return res.status(201).json({ message: 'Comment added to player' });
                })
                .catch(err => {
                    return res.status(400).json({ message: 'Bad request' });
                });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        })
});

//DELETE route handler for removing comment from player
//-validate request ID & fields
//-delete comment from player & send response status
router.delete('/:id/:commentId', jwtAuth, (req, res) => {
    if(!objectID.isValid(req.params.id)){
        return res.status(400).json({ message: 'Bad player ID' });
    }

    if(!objectID.isValid(req.params.commentId)){
        return res.status(400).json({ message: 'Bad comment ID' });
    }

    return Player.findById(req.params.id)
        .then(player => {
            if (!player) {
                return res.status(404).json({ message: 'Player ID not found'});
            } else {
                console.log('Player ID validated');
            }

            const comment = player.comments.find(comment => comment._id == req.params.commentId);
            if (!comment) {
                return res.status(404).json({ message: 'Comment ID not found'});
            } else {
                console.log('Comment ID validated');
            }
            
            return Player.updateOne({_id: req.params.id}, { $pull: {comments: {_id: req.params.commentId} } }, { new: true })
                .then(() => {
                    return res.status(200).json({ message: 'Comment removed from player' });
                })
                .catch(err => {
                    console.error(err);
                    return res.status(500).json({ message: 'Internal server error' });
                });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        })
});

module.exports = router;