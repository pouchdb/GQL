var PouchDB = require('pouchdb');
var GQL = require('../pouchdb.gql');
var should = require('chai').should();
describe('GQL',function(){
  var db;
  beforeEach(function(done){
    PouchDB('testdb',function(err,d){
      db = d;
      done();
    })
  });
  // afterEach(function(done){
  //   PouchDB.destroy('testdb',function(){
  //       db = undefined;
  //       done();
  //     });
  // });
  it('should be able to work',function(done){
    should.not.exist(db.gql);
    PouchDB.plugin('gql', GQL);
    PouchDB('testdb',function(err,db){
      db.gql.should.exist;
      done();
    });
  });
});