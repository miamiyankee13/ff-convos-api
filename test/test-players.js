'use strict'
//Import dependencies
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const jwt = require('jsonwebtoken');

//Import modules
const { User, Player } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { JWT_SECRET, TEST_DATABASE_URL } = require('../config');

//Enable expect style syntax
const expect = chai.expect;

//Enable use of chai-http testing methods
chai.use(chaiHttp);

//Declate function to create user & login
function createUserAndLogin() {
    const username = 'exampleUser'
    const password = 'examplePassword';
    const firstName = 'Derek';
    const lastName = 'Jeter';

    return User.hashPassword(password)
        .then(function(password) {
            return User.create({
                username,
                password,
                firstName,
                lastName
            })
        })
        .then(function() {
            return chai.request(app)
                .post('/api/auth/login')
                .send({username, password})
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.a('object');
                    const token = res.body.authToken
                    expect(token).to.be.a('string');
                    const payload = jwt.verify(token, JWT_SECRET, {
                        algorithm: ['HS256']
                    });
                    expect(payload.user.username).to.equal(username);
                    expect(payload.user.firstName).to.equal(firstName);
                    expect(payload.user.lastName).to.equal(lastName);
                    return token
                });
        });
}

//Return object of random player data
function generatePlayerData() {
    return {
        name: faker.lorem.words(),
        position: faker.lorem.word(),
        number: faker.lorem.word(),
        team: faker.lorem.word()
    }
}

//Add 2 randomly generated players to DB
function seedPlayerData() {
    console.info('Seeding player data');
    const seedData = [];

    for (let i = 0; i < 2; i++) {
        seedData.push(generatePlayerData());
    }

    return Player.insertMany(seedData);
}

//Declare function to delete entire DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('players endpoints', function() {
    //Activate server before tests run
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    //Delete & create new data before each test
    beforeEach(function() {
        return tearDownDb().then(seedPlayerData);
    });

    //Delete databse after each test
    afterEach(function() {
        return tearDownDb();
    });

    //Close server after tests run
    after(function() {
        return closeServer();
    });

    describe('GET /api/players', function() {

        it('Should return all existing players', function() {
            let response;
            return chai.request(app)
                .get('/api/players')
                .then(function(res) {
                    response = res;
                    expect(response).to.have.status(200);
                    expect(response).to.be.json;
                    return Player.countDocuments();
                })
                .then(function(count) {
                    expect(response.body.players).to.have.lengthOf(count);
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should return players with correct fields', function() {
            let responsePlayer;
            return chai.request(app)
                .get('/api/players')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.players).to.be.a('array');
                    expect(res.body.players).to.have.lengthOf.at.least(1);
                    res.body.players.forEach(function(player) {
                        expect(player).to.be.a('object');
                        expect(player).to.include.keys('_id', 'name', 'position', 'number', 'team');
                    });
                    responsePlayer = res.body.players[0];
                    return Player.findById(responsePlayer._id);
                })
                .then(function(player) {
                    expect(responsePlayer._id).to.equal(player.id);
                    expect(responsePlayer.name).to.equal(player.name);
                    expect(responsePlayer.position).to.equal(player.position);
                    expect(responsePlayer.number).to.equal(player.number);
                    expect(responsePlayer.team).to.equal(player.team)
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });
    });

    describe('POST /api/players & /api/players/:id', function() {

        it('Should add a new player', function() {
            return createUserAndLogin()
                .then(function(token) {
                    const newPlayer = generatePlayerData();
                    return chai.request(app)
                    .post('/api/players')
                    .set('authorization', `Bearer ${token}`)
                    .send(newPlayer)
                    .then(function(res) {
                        expect(res).to.have.status(201);
                        expect(res).to.be.json;
                        expect(res.body).to.be.a('object');
                        expect(res.body).to.include.keys('_id', 'name', 'position', 'number', 'team');
                        expect(res.body._id).to.not.be.null;
                        expect(res.body.name).to.equal(newPlayer.name);
                        expect(res.body.position).to.equal(newPlayer.position);
                        expect(res.body.number).to.equal(newPlayer.number);
                        expect(res.body.team).to.equal(newPlayer.team);
                        return Player.findById(res.body._id);
                    })
                    .then(function(player) {
                        expect(player.name).to.equal(newPlayer.name);
                        expect(player.position).to.equal(newPlayer.position);
                        expect(player.number).to.equal(newPlayer.number);
                        expect(player.team).to.equal(newPlayer.team);
                    })
                    .catch(function(err) {
                        if (err instanceof chai.AssertionError) {
                            throw err;
                        }
                    });
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should add a new player & add a comment', function() {
            let playerId
            return createUserAndLogin()
                .then(function(token) {
                    const newPlayer = generatePlayerData();
                    return chai.request(app)
                        .post('/api/players')
                        .set('authorization', `Bearer ${token}`)
                        .send(newPlayer)
                        .then(function(res) {
                            expect(res).to.have.status(201);
                            playerId = res.body._id;
                        })
                        .then(function() {
                            return chai.request(app)
                                .post(`/api/players/${playerId}`)
                                .set('authorization', `Bearer ${token}`)
                                .send({comment: { content: 'Test', author: 'Author'}})
                                .then(function(res) {
                                    expect(res).to.have.status(201);
                                    expect(res.body).to.be.a('object');
                                    expect(res.body.message).to.equal('Comment added to player');
                                });
                        })
                        .catch(function(err) {
                            if (err instanceof chai.AssertionError) {
                                throw err;
                            }
                        });
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

    });

    describe('PUT /api/players/:id', function() {

        it('Should update a player', function() {
            return createUserAndLogin()
                .then(function(token) {
                    const updatedPlayer = {
                        name: 'Anthony D',
                        position: 'WR',
                        number: '7',
                        team: 'Dolphins'
                    }
                    return Player.findOne()
                        .then(function(player) {
                            updatedPlayer._id = player._id;
                            return chai.request(app)
                                .put(`/api/players/${player._id}`)
                                .set('authorization', `Bearer ${token}`)
                                .send(updatedPlayer)
                                .then(function(res) {
                                    expect(res).to.have.status(200);
                                    return Player.findById(updatedPlayer._id)
                                })
                                .then(function(player) {
                                    expect(player.name).to.equal(updatedPlayer.name);
                                    expect(player.position).to.equal(updatedPlayer.position);
                                    expect(player.number).to.equal(updatedPlayer.number);
                                    expect(player.team).to.equal(updatedPlayer.team);
                                })
                                .catch(function(err) {
                                    if (err instanceof chai.AssertionError) {
                                        throw err;
                                    }
                                });
                        })
                        .catch(function(err) {
                            if (err instanceof chai.AssertionError) {
                                throw err;
                            }
                        });
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

    });

    describe('DELETE /api/players/:id & /api/players/:id/:commentId', function() {

        it('Should delete a player', function() {
            let player;
            return createUserAndLogin()
                .then(function(token) {
                    return Player.findOne()
                        .then(function(_player) {
                            player = _player;
                            return chai.request(app)
                                .delete(`/api/players/${player.id}`)
                                .set('authorization', `Bearer ${token}`)
                                .then(function(res) {
                                    expect(res).to.have.status(204);
                                    return Player.findById(player._id);
                                })
                                .then(function(_player) {
                                    expect(_player).to.be.null;
                                })
                                .catch(function(err) {
                                    if (err instanceof chai.AssertionError) {
                                        throw err;
                                    }
                                });
                        })
                        .catch(function(err) {
                            if (err instanceof chai.AssertionError) {
                                throw err;
                            }
                        });
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });

        });
    });

});