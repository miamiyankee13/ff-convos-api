'use strict'
//Import dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');

//Import modules
const { app, runServer, closeServer } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

//Enable expect style syntax
const expect = chai.expect;

//Enable use of chai-http testing methods
chai.use(chaiHttp);

describe('API', function() {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    after(function() {
        return closeServer();
    });

    it('Should return 200 on GET requests', function() {
        return chai.request(app)
            .get('/api/dehhhh')
            .then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
            });
    });
});