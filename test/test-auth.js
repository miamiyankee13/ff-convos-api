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

//Delete entire DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

//Test for /auth endpoints
describe('auth endpoints', function() {
    //Declare user fields
    const username = 'exampleUser'
    const password = 'examplePassword';
    const firstName = 'Babe';
    const lastName = 'Ruth';

    //Activate server before tests run
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    //Create user before each test
    beforeEach(function() {
        return User.hashPassword(password)
            .then(function(password) {
                return User.create({
                    username,
                    password,
                    firstName,
                    lastName
                })
            });
    });

    //Delete database after each test
    afterEach(function() {
        return tearDownDb();
    })

    //Close server after tests run
    after(function() {
        return closeServer();
    });

    //Tests for /api/auth/login
    describe('/api/auth/login', function() {
        
        it('Should reject request with no credentials', function() {
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
    });
});