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

    //Delete DB & create user before each test
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