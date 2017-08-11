var expect = require('chai').expect;
var request = require('supertest');

describe('API Call Works', function () {
    var server;
    beforeEach(function () {
        server = require('../server/server');
    });
    it('should work', function () {
        expect(true).to.be.true;
    });
    it('responds to /', function (done) {
        request(server)
            .get('/')
            .expect(200, done);
    });
    it('ports should be 17', function testPath(done) {
        request(server)
            .get('/api/PortCalls')
            .expect(function (res) {
                expect(res.body).to.have.lengthOf(17);
            })
            .end(done);
    });
})