"use strict";

var PouchDB = require('pouchdb');
var GQL = require('../pouchdb.gql');

var chai = require('chai');
var should = chai.should();
var _ = require('underscore');


before(function (done) {
  var db;
  PouchDB('testdb', function (err, d) {
    if (!err) {
      db = d;
      var testTable = [{
        "name": "John",
        "dept": "Eng",
        "lunchTime": "12:00:00",
        "salary": "1000",
        "hire date": "2005-03-19",
        "age": "35",
        "isSenior": "true",
        "seniorityStartTime": "2007-12-02 15:56:00"
      }, {
        "name": "Dave",
        "dept": "Eng",
        "lunchTime": "12:00:00",
        "salary": "500",
        "hire date": "2006-04-19",
        "age": "27",
        "isSenior": "false",
        "seniorityStartTime": "null"
      }, {
        "name": "Sally",
        "dept": "Eng",
        "lunchTime": "13:00:00",
        "salary": "600",
        "hire date": "2005-10-10",
        "age": "30",
        "isSenior": "false",
        "seniorityStartTime": "null"
      }, {
        "name": "Ben",
        "dept": "Sales",
        "lunchTime": "12:00:00",
        "salary": "400",
        "hire date": "2002-10-10",
        "age": "32",
        "isSenior": "true",
        "seniorityStartTime": "2005-03-09 12:30:00"
      }, {
        "name": "Dana",
        "dept": "Sales",
        "lunchTime": "12:00:00",
        "salary": "350",
        "hire date": "2004-09-08",
        "age": "25",
        "isSenior": "false",
        "seniorityStartTime": "null"
      }, {
        "name": "Mike",
        "dept": "Marketing",
        "lunchTime": "13:00:00",
        "salary": "800",
        "hire date": "2005-01-10",
        "age": "24",
        "isSenior": "true",
        "seniorityStartTime": "2007-12-30 14:40:00"
      }];
      db.bulkDocs({
        docs: testTable
      }, {}, function () {
        done();
      });
    }
  });
});
after(function (done) {
  PouchDB.destroy('testdb', function () {
    done();
  });
});


describe('GQL', function () {
  var db;
  beforeEach(function (done) {
    PouchDB('testdb', function (err, d) {
      db = d;
      done();
    });
  });
  it('should be able to work', function (done) {
    should.not.exist(db.gql);
    PouchDB.plugin(GQL);
    PouchDB('testdb', function (err, db) {
      var throwaway = db.gql.should.exist;
      done();
    });
  });

  describe('select', function () {

    it("should select *", function (done) {
      var query = {
        select: "*"
      };
      var expected = [{
        "name": "John",
        "dept": "Eng",
        "lunchTime": "12:00:00",
        "salary": "1000",
        "hire date": "2005-03-19",
        "age": "35",
        "isSenior": "true",
        "seniorityStartTime": "2007-12-02 15:56:00"
      }, {
        "name": "Dave",
        "dept": "Eng",
        "lunchTime": "12:00:00",
        "salary": "500",
        "hire date": "2006-04-19",
        "age": "27",
        "isSenior": "false",
        "seniorityStartTime": "null"
      }, {
        "name": "Sally",
        "dept": "Eng",
        "lunchTime": "13:00:00",
        "salary": "600",
        "hire date": "2005-10-10",
        "age": "30",
        "isSenior": "false",
        "seniorityStartTime": "null"
      }, {
        "name": "Ben",
        "dept": "Sales",
        "lunchTime": "12:00:00",
        "salary": "400",
        "hire date": "2002-10-10",
        "age": "32",
        "isSenior": "true",
        "seniorityStartTime": "2005-03-09 12:30:00"
      }, {
        "name": "Dana",
        "dept": "Sales",
        "lunchTime": "12:00:00",
        "salary": "350",
        "hire date": "2004-09-08",
        "age": "25",
        "isSenior": "false",
        "seniorityStartTime": "null"
      }, {
        "name": "Mike",
        "dept": "Marketing",
        "lunchTime": "13:00:00",
        "salary": "800",
        "hire date": "2005-01-10",
        "age": "24",
        "isSenior": "true",
        "seniorityStartTime": "2007-12-30 14:40:00"
      }];

      PouchDB('testdb', function (err, db) {
        db.gql(query, function (err, actual) {
          if (!err) {
            var intersection = expected.filter(function (n) {
              return _.findWhere(actual.rows, n) !== undefined;
            });
            intersection.should.have.length(expected.length);
            actual.rows.should.have.length(expected.length);
            done();
          } else {
            done(new Error(err.reason));
          }
        });
      });
    });

    it("should return selected columns", function (done) {
      var query = {
        select: "name, salary"
      };
      var expected = [{
        "name": "John",
        "salary": "1000"
      }, {
        "name": "Dave",
        "salary": "500"
      }, {
        "name": "Sally",
        "salary": "600"
      }, {
        "name": "Ben",
        "salary": "400"
      }, {
        "name": "Dana",
        "salary": "350"
      }, {
        "name": "Mike",
        "salary": "800"
      }];

      
      PouchDB('testdb', function (err, db) {
        db.gql(query, function (err, actual) {
          if (!err) {
            var intersection = expected.filter(function (n) {
              return _.findWhere(actual.rows, n) !== undefined;
            });
            intersection.should.have.length(expected.length);
            actual.rows.should.have.length(expected.length);
            done();
          } else {
            done(new Error(err.reason));
          }
        });
      });
    });


    /* ------------ test is failing - lunchTime column is returned as null ------------- */
    // it("should return selected columns with a time representation", function (done) {
    //   var query = {select: "lunchTime, name"};
    //   var expected = [{"lunchTime": "12:00:00", "name": "John"}, 
    //                  {"lunchTime": "12:00:00", "name": "Dave"}, 
    //                  {"lunchTime": "13:00:00", "name": "Sally"}, 
    //                  {"lunchTime": "12:00:00", "name": "Ben"}, 
    //                  {"lunchTime": "12:00:00", "name": "Dana"}, 
    //                  {"lunchTime": "13:00:00", "name": "Mike"}];
    //   
    //   
    //   PouchDB('testdb',function (err,db){
    //       db.gql(query, function (err, actual){
    //         if(!err){
    //             var intersection = expected.filter(function (n) {
    //               return _.findWhere(actual.rows, n) != undefined
    //             });
    //             console.log(" ");
    //             for (var i=0; i< actual.rows.length; i++) {
    //                 console.log(actual.rows[i]);
    //             }
    //             expect(intersection).to.have.length(expected.length);
    //             expect(actual.rows.length).to.equal(expected.length);
    //             done();            
    //         } else {
    //           done(err);
    //         }
    //       });
    //   });   
    // });

    it("should return selected columns for column names that embed a space", function (done) {
      var query = {
        select: "`hire date`, name"
      };
      var expected = [{
        'hire date': '2005-03-19',
        name: "John"
      }, {
        'hire date': '2006-04-19',
        name: "Dave"
      }, {
        'hire date': '2005-10-10',
        name: "Sally"
      }, {
        'hire date': '2002-10-10',
        name: "Ben"
      }, {
        'hire date': '2004-09-08',
        name: "Dana"
      }, {
        'hire date': '2005-01-10',
        name: "Mike"
      }];

      
      PouchDB('testdb', function (err, db) {
        db.gql(query, function (err, actual) {
          if (!err) {
            var intersection = expected.filter(function (n) {
              return _.findWhere(actual.rows, n) !== undefined;
            });
            intersection.should.have.length(expected.length);
            actual.rows.should.have.length(expected.length);
            done();
          } else {
            done(new Error(err.reason));
          }
        });
      });
    });

    it("should return selected columns matching where clause", function (done) {
      var query = {
        select: "name",
        where: "salary > 700"
      };
      var expected = [{
        "name": "Mike"
      }, {
        "name": "John"
      }];

      
      PouchDB('testdb', function (err, db) {
        db.gql(query, function (err, actual) {
          if (!err) {
            var intersection = expected.filter(function (n) {
              return _.findWhere(actual.rows, n) !== undefined;
            });
            intersection.should.have.length(expected.length);
            actual.rows.should.have.length(expected.length);
            done();
          } else {
            done(new Error(err.reason));
          }
        });
      });
    });

    // /* ------------ test is failing ----------------------------- */
    // it("should return average aggregation for group by clause", function (done) {
    //     
    //   //var query = {select: "name, average(salary)", 
    //                 groupBy: "name"}; //- error is 'Uncaught'
    //   var query = {select: "isSenior, average(salary)", 
    //               groupBy: "isSenior"}; 
    //- error is 'Error: If an aggregation function is used in the select \
    // clause, all identifiers in the select clause must be wrapped by an \
    // aggregation function or appear in the group-by clause.'
    //   var expected = [{"isSenior": true, "average-salary": "2"}, 
    //                  {"isSenior": false, "average-salary": "1"}]; 
    //    
    //   
    //   PouchDB('testdb',function (err,db){
    //       db.gql(query, function (err, actual){
    //         if(!err){
    //             var intersection = expected.filter(function (n) {
    //               return _.findWhere(actual.rows, n) != undefined
    //             });
    //             console.log(' ');
    //             for (var i=0; i< actual.rows.length; i++) {
    //                 console.log(actual.rows[i]);
    //             }
    //             expect(intersection).to.have.length(expected.length);
    //             expect(actual.rows.length).to.equal(expected.length);
    //             done();            
    //         } else {
    //             console.log(err);
    //             done(new Error(err.reason));
    //         }
    //       });
    //   });   
    // });

  });

  describe.skip('pivot', function () {

    it("should pivot three rows of one column into one row of three columns", function (done) {
      var query = {
        select: "sum(salary)",
        pivot: "dept"
      };
      var expected = [{
        "Eng sum-salary": "2100",
        "Marketing sum-salary": "800",
        "Sales sum-salary": "750"
      }];

      
      PouchDB('testdb', function (err, db) {
        db.gql(query, function (err, actual) {
          if (!err) {
            var intersection = expected.filter(function (n) {
              return _.findWhere(actual.rows, n) !== undefined;
            });
            intersection.should.have.length(expected.length);
            actual.rows.should.have.length(expected.length);
            done();
          } else {
            done(new Error(err.reason));
          }
        });
      });
    });

    it("should pivot ", function (done) {
      var query = "select dept, sum(salary) group by dept pivot lunchTime";
      var expected = [{"dept": "Eng", 
                     "12:00:00 sum-salary": "1500", 
                     "13:00:00 sum-salary": "600"}, 
                     {"dept": "Marketing", 
                      "12:00:00 sum-salary": "null", 
                      "13:00:00 sum-salary": "800"}, 
                     {"dept": "Sales", 
                      "12:00:00 sum-salary": "750", 
                      "13:00:00 sum-salary": "null"}];
    });
      
    it("should pivot ", function (done) {
      var query = "select lunchTime, sum(salary) group by lunchTime pivot dept";
      var expected = [{"dept": "Eng", 
                     "12:00:00 sum-salary": "1500", 
                     "13:00:00 sum-salary": "600"}, 
                     {"dept": "Marketing", 
                      "12:00:00 sum-salary": "null", 
                      "13:00:00 sum-salary": "800"}, 
                     {"dept": "Sales", 
                      "12:00:00 sum-salary": "750", 
                      "13:00:00 sum-salary": "null"}];
    });
      
    it("should pivot ", function (done) {
      var query = "select sum(salary) pivot dept, lunchTime";
      var expected = [{"dept": "Eng", 
                     "12:00:00 sum-salary": "1500", 
                     "13:00:00 sum-salary": "600"}, 
                     {"dept": "Marketing", 
                      "12:00:00 sum-salary": "null", 
                      "13:00:00 sum-salary": "800"}, 
                     {"dept": "Sales", 
                      "12:00:00 sum-salary": "750", 
                      "13:00:00 sum-salary": "null"}];
    });
      
    it("should pivot ", function (done) {
      var query = "select sum(salary), max(lunchTime) pivot dept";
      var expected = [{"dept": "Eng", 
                     "12:00:00 sum-salary": "1500", 
                     "13:00:00 sum-salary": "600"}, 
                     {"dept": "Marketing", 
                      "12:00:00 sum-salary": "null", 
                      "13:00:00 sum-salary": "800"}, 
                     {"dept": "Sales", 
                      "12:00:00 sum-salary": "750", 
                      "13:00:00 sum-salary": "null"}];
    });
  });

});
