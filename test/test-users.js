'use strict'
//Import dependencies
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const jwt = require('jsonwebtoken');

//Import modules
const { User } = require('../models');
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

//Declare function to delete entire DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('users endpoints', function() {
    //Declare user fields
    const username = 'exampleUser'
    const password = 'examplePassword';
    const firstName = 'Derek';
    const lastName = 'Jeter';

    //TODO: create fake player fields

    //Activate server before tests run
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    //Delete DB before each test
    beforeEach(function() {
        return tearDownDb()
    });

    //Delete DB after each test
    afterEach(function() {
        return tearDownDb();
    })

    //Close server after tests run
    after(function() {
        return closeServer();
    });

    describe('/api/users', function() {

        it('Should reject users with missing username', function() {
            return chai.request(app)
                .post('/api/users')
                .send({password, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Missing Field');
                    expect(res.body.location).to.equal('username');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with missing password', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Missing Field');
                    expect(res.body.location).to.equal('password');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with missing firstName', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username, password, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Missing Field');
                    expect(res.body.location).to.equal('firstName');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with missing lastName', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username, password, firstName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Missing Field');
                    expect(res.body.location).to.equal('lastName');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with non-string username', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username: 1234, password, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('username');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                })
        });

        it('Should reject users with non-string password', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username, password: 1234, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('password');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with non-trimmed username', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username: ` ${username} `, password, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Cannot start or end with whitespace');
                    expect(res.body.location).to.equal('username');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with non-trimmed password', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username, password: ` ${password} `, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Cannot start or end with whitespace');
                    expect(res.body.location).to.equal('password');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with empty username', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username: '', password, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Must be at least 1 characters long');
                    expect(res.body.location).to.equal('username');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with password less than 7 characters', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username, password: '123456', firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Must be at least 7 characters long');
                    expect(res.body.location).to.equal('password');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should reject users with duplicate username', function() {
            return User.create({username, password, firstName, lastName})
                .then(function() {
                    return chai.request(app)
                        .post('/api/users')
                        .send({username, password, firstName, lastName});    
                })
                .then(function(res) {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('username already taken');
                    expect(res.body.location).to.equal('username');
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        it('Should create a new user', function() {
            return chai.request(app)
                .post('/api/users')
                .send({username, password, firstName, lastName})
                .then(function(res) {
                    expect(res).to.have.status(201);
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys('username', 'firstName', 'lastName');
                    expect(res.body.username).to.equal(username);
                    expect(res.body.firstName).to.equal(firstName);
                    expect(res.body.lastName).to.equal(lastName);
                    return User.findOne({username});
                })
                .then(function(user) {
                    expect(user).to.not.be.null;
                    expect(user.firstName).to.equal(firstName);
                    expect(user.lastName).to.equal(lastName);
                    return user.validatePassword(password)
                })
                .then(function(passwordIsCorrect) {
                    expect(passwordIsCorrect).to.be.true;
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });
    });

});