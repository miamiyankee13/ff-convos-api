'use strict'
//Import dependencies
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');

//Import modules
const { User } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { JWT_SECRET, TEST_DATABASE_URL } = require('../config');

//Enable expect style syntax
const expect = chai.expect;

//Enable use of chai-http testing methods
chai.use(chaiHttp);

//Declare function to create user
function createUser() {
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
        });
}

//Declare function to delete entire DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('auth endpoints', function() {
    //Declare user fields
    const username = 'exampleUser'
    const password = 'examplePassword';
    const firstName = 'Derek';
    const lastName = 'Jeter';

    //Activate server before tests run
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    //Delete DB & create user before each test
    beforeEach(function() {
        return tearDownDb().then(createUser);
    });

    //Delete DB after each test
    afterEach(function() {
        return tearDownDb();
    })

    //Close server after tests run
    after(function() {
        return closeServer();
    });

    describe('/api/auth/login', function() {
        
        it('Should reject requests with no credentials', function() {
            return chai.request(app)
                .post('/api/auth/login')
                .send({})
                .then(function(res) {
                    expect(res).to.have.status(400);
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject requests with incorrect username', function() {
            return chai.request(app)
                .post('/api/auth/login')
                .send({username: 'wrongUsername', password})
                .then(function(res) {
                    expect(res).to.have.status(401)
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject requests with incorrect password', function() {
            return chai.request(app)
                .post('/api/auth/login')
                .send({username, password: 'wrongPassword'})
                .then(function(res) {
                    expect(res).to.have.status(401)
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should return a valid token', function() {
            return chai.request(app)
                .post('/api/auth/login')
                .send({username, password})
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.a('object');
                    const token = res.body.authToken;
                    expect(token).to.be.a('string');
                    const payload = jwt.verify(token, JWT_SECRET, {
                        algorithm: ['HS256']
                    });
                    expect(payload.user.username).to.equal(username);
                    expect(payload.user.firstName).to.equal(firstName);
                    expect(payload.user.lastName).to.equal(lastName);
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });
    });

    describe('/api/auth/refresh', function() {
        
        it('Should reject requests with no credentials', function() {
            return chai.request(app)
                .post('/api/auth/refresh')
                .send({})
                .then(function(res) {
                    expect(res).to.have.status(401);
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject requests with an invalid token', function() {
            const token = jwt.sign(
                {
                    user: {
                        username,
                        firstName,
                        lastName
                    }
                },
                'wrongSecret',
                {
                    algorithm: 'HS256',
                    expiresIn: '7d'
                }
            );

            return chai.request(app)
                .post('/api/auth/refresh')
                .set('authorization', `Bearer ${token}`)
                .then(function(res) {
                    expect(res).to.have.status(401);
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject requests with an expired token', function() {
            const token = jwt.sign(
                {
                    user: {
                        username,
                        firstName,
                        lastName
                    },
                    exp: Math.floor(Date.now() / 1000) - 10
                },
                JWT_SECRET,
                {
                    algorithm: 'HS256',
                    subject: username
                }
            );

            return chai.request(app)
                .post('/api/auth/refresh')
                .set('authorization', `Bearer ${token}`)
                .then(function(res) {
                    expect(res).to.have.status(401);
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should return a valid token with a new expiry date', function() {
            const token = jwt.sign(
                {
                    user: {
                        username,
                        firstName,
                        lastName
                    }
                },
                JWT_SECRET,
                {
                    algorithm: 'HS256',
                    subject: username,
                    expiresIn: '7d'
                }
            );
            const decoded = jwt.decode(token);

            return chai.request(app)
                .post('/api/auth/refresh')
                .set('authorization', `Bearer ${token}`)
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.a('object');
                    const token = req.body.authToken;
                    expect(token).to.be.a('string');
                    const payload = jwt.verify(token, JWT_SECRET, {
                        algorithm: ['HS256']
                    });
                    expect(payload.exp).to.be.at.least(decoded.exp);
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });
    });
});