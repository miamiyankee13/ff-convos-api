'use strict'
//Import dependencies
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//Configure mongoose to use ES6 promises & createIndex
mongoose.Promise = global.Promise;
mongoose.set('useCreateIndex', true);

//Create comment schema
const commentSchema = mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    created: { type: Date, default: Date.now }
});

//Create player schema
const playerSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true },
    position: { type: String, required: true },
    number: { type: String, required: true },
    team: { type: String, required: true },
    comments: [commentSchema]
});

//Create user schema
const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
});

//Create serialize methods to control data sent to client
userSchema.methods.serialize = function() {
    return {
        _id: this.id,
        username: this.username,
        firstName: this.firstName,
        lastName: this.lastName,
        players: this.players
    }
}

playerSchema.methods.serialize = function() {
    return {
        _id: this.id,
        name: this.name,
        position: this.position,
        number: this.number,
        team: this.team,
        comments: this.comments
    }
}

//Create password validation method
userSchema.methods.validatePassword = function(password) {
    return bcrypt.compare(password, this.password);
}

//Create password hash method
userSchema.statics.hashPassword = function(password) {
    return bcrypt.hash(password, 10);
}

//Create mongoose models
const Player = mongoose.model('Player', playerSchema);
const User = mongoose.model('User', userSchema);

module.exports = { Player, User };