!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GQL=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function arrayCollate(a, b) {
  var len = Math.min(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var sort = pouchCollate(a[i], b[i]);
    if (sort !== 0) {
      return sort;
    }
  }
  return (a.length === b.length) ? 0 :
    (a.length > b.length) ? 1 : -1;
}
function stringCollate(a, b) {
  // See: https://github.com/daleharvey/pouchdb/issues/40
  // This is incompatible with the CouchDB implementation, but its the
  // best we can do for now
  return (a === b) ? 0 : ((a > b) ? 1 : -1);
}
function objectCollate(a, b) {
  var ak = Object.keys(a), bk = Object.keys(b);
  var len = Math.min(ak.length, bk.length);
  for (var i = 0; i < len; i++) {
    // First sort the keys
    var sort = pouchCollate(ak[i], bk[i]);
    if (sort !== 0) {
      return sort;
    }
    // if the keys are equal sort the values
    sort = pouchCollate(a[ak[i]], b[bk[i]]);
    if (sort !== 0) {
      return sort;
    }

  }
  return (ak.length === bk.length) ? 0 :
    (ak.length > bk.length) ? 1 : -1;
}
// The collation is defined by erlangs ordered terms
// the atoms null, true, false come first, then numbers, strings,
// arrays, then objects
function collationIndex(x) {
  var id = ['boolean', 'number', 'string', 'object'];
  if (id.indexOf(typeof x) !== -1) {
    if (x === null) {
      return 1;
    }
    return id.indexOf(typeof x) + 2;
  }
  if (Array.isArray(x)) {
    return 4.5;
  }
}
module.exports = pouchCollate;
function pouchCollate(a, b) {
  var ai = collationIndex(a);
  var bi = collationIndex(b);
  if ((ai - bi) !== 0) {
    return ai - bi;
  }
  if (a === null) {
    return 0;
  }
  if (typeof a === 'number') {
    return a - b;
  }
  if (typeof a === 'boolean') {
    return a === b ? 0 : (a < b ? -1 : 1);
  }
  if (typeof a === 'string') {
    return stringCollate(a, b);
  }
  if (Array.isArray(a)) {
    return arrayCollate(a, b);
  }
  if (typeof a === 'object') {
    return objectCollate(a, b);
  }
};;
},{}],2:[function(require,module,exports){
"use strict";
var pouchCollate = require('pouchdb-collate');

function GQL(db) {
  if (!(this instanceof GQL)) {
    return new GQL(db);
  }
  this.db = db;
}
GQL.prototype.gql = function (fun, opts, callback) {

  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  if (callback) {
    opts.complete = callback;
  }

  if (typeof fun === 'object') {
    return viewQuery(this.db, fun, opts);
  }

  return opts.complete(GQL.Errors.UNRECOGNIZED_QUERY);
};
function viewQuery(db, query, options) {
  if (!options.complete) {
    return;
  }

  var results = [];

  function isAggregator(str) {
    return (/max|average|min|sum|count/).test(str);
  }

  function getIdentifierList(str) {
    var columns;
    if (!str) {
      return [];
    }
    if (str.indexOf(",") === -1) {
      columns = [str.trim()];
    } else {
      columns = str.trim().split(/\s*,\s*/);
    }
    //handle back-quote escaping.  note that they don't really do anything here
    return columns.map(function (id) {
      return id.replace(/`([^`]*)`/, "$1");
    });
  }

  function parse(queryString) {

    var lexedTokens = (function () {
      var tokens = [],
        c, index = 0,
        currentString = "";

      function isOperator(c) {
        return (/[=<>!+\-*\/(),]/).test(c);
      }
      function isFullWordOperator(str) {
        return (/^and$|^or$|^not$|^is$/).test(str);
      }
      function isBooleanLiteral(str) {
        return (/true|false/).test(str);
      }
      function isDigit(c) {
        return (/[0-9.]/).test(c);
      }
      function isWhiteSpace(c) {
        return (/\s/).test(c);
      }
      function isConstant(str) {
        return (/null/).test(str);
      }
      function isString(str) {
        return (/^".*"$|^'.*'$/).test(str);
      }

      //always ending with a space to simplify lexer parsing
      queryString += " ";

      function advance() {
        if (index < queryString.length) {
          c = queryString[index++];
          return true;
        }
        return false;
      }

      function addToken(type, value) {
        currentString = "";
        tokens.push({
          type: type,
          value: value
        });
      }

      function handleDelimitedCharacters() {
        var normalizedString = currentString.toLowerCase();
        if (normalizedString !== "") {
          //full-word operators, e.g. not, where
          if (isFullWordOperator(normalizedString)) {
            addToken(normalizedString);
            //boolean literal
          } else if (isBooleanLiteral(normalizedString)) {
            addToken("boolean", normalizedString === "true");
            //number literal
          } else if (isDigit(normalizedString[0])) {
            addToken("number", parseFloat(normalizedString));
          } else if (isConstant(normalizedString)) {
            addToken("constant", normalizedString);
            //note that string literals are cast sensitive
          } else if (isString(currentString)) {
            addToken("string", currentString);
          } else {
            addToken("identifier", normalizedString);
          }
        }
      }

      function pairedOperator() {
        addToken(c + queryString[index]);
        advance();
      }

      function quotedString(delimiter, label) {
        while (advance()) {
          if (c !== delimiter) {
            currentString += c;
          } else {
            addToken(label, currentString);
            return;
          }
        }
        throw GQL.Errors.LEXER_ERROR(label + " needs a closing " + delimiter, index);
      }

      while (advance()) {
        //back quoted identifiers
        if (c === "`") {
          quotedString("`", "identifier");
          //string literals with single quotes
        } else if (c === "'") {
          quotedString("'", "string");
          //string literals with double quotes
        } else if (c === '"') {
          quotedString('"', "string");
          //non-word operators
        } else if (isOperator(c)) {
          handleDelimitedCharacters();
          switch (c) {
            case "<":
              if (queryString[index] === "=" || queryString[index] === ">") {
                pairedOperator();
              } else {
                addToken(c);
              }
              break;

            case ">":
              if (queryString[index] === "=") {
                pairedOperator();
              } else {
                addToken(c);
              }
              break;

            case "!":
              if (queryString[index] === "=") {
                pairedOperator();
              } else {
                throw GQL.Errors.LEXER_ERROR("'!' not followed by '='", index);
              }
              break;

            default:
              addToken(c);
              break;
          }

          //end of some token
        } else if (isWhiteSpace(c)) {
          handleDelimitedCharacters();
        } else {
          currentString += c;
        }
      }
      addToken("(end)");

      return tokens;
    }());

    var parseTree = [],
      symbolTable = {}, index = 0,
      token;

    function advance() {
      if (index < lexedTokens.length) {
        token = interpretToken(lexedTokens[index++]);
        return true;
      }
      return false;
    }

    function peekToken(n) {
      n = n || 0;
      if (index + n < lexedTokens.length) {
        return interpretToken(lexedTokens[index + n]);
      }
      return null;
    }

    function interpretToken(token) {
      var sym = Object.create(symbolTable[token.type]);
      sym.type = token.type;
      sym.value = token.value;
      return sym;
    }

    function isFunction(name) {
      return isAggregator(name) || /lower|upper/.test(name.toLowerCase());
    }

    function expression(rbp) {
      var left;
      advance();
      if (!token.nud) {
        throw GQL.Errors.PARSING_ERROR("Unexpected token: " + token.type);
      }
      left = token.nud(token);
      while (rbp < peekToken().lbp) {
        advance();
        if (!token.led) {
          throw GQL.Errors.PARSING_ERROR("Unexpected token: " + token.type);
        }
        left = token.led(left);
      }
      return left;
    }

    function symbol(id, nud, lbp, led) {
      var sym = symbolTable[id] || {};
      symbolTable[id] = {
        lbp: sym.lbp || lbp,
        nud: sym.nud || nud,
        led: sym.led || led
      };
    }

    function infix(id, lbp, rbp, led) {
      rbp = rbp || lbp;
      symbol(id, null, lbp, led || function (left) {
        return {
          type: id,
          left: left,
          right: expression(rbp)
        };
      });
    }

    function prefix(id, rbp) {
      symbol(id, function () {
        return {
          type: id,
          right: expression(rbp)
        };
      });
    }

    infix("+", 50);
    infix("-", 50);
    infix("*", 60);
    infix("/", 60);

    prefix("-", 70);

    infix("=", 40);
    infix("<", 40);
    infix("<=", 40);
    infix(">", 40);
    infix(">=", 40);
    infix("!=", 40);
    infix("<>", 40);

    infix("and", 30);
    infix("or", 30);
    prefix("not", 70);

    symbol(")");
    symbol("(end)");

    symbol("(", function () {
      var value = expression(20);
      if (peekToken().type !== ")") {
        throw GQL.Errors.PARSING_ERROR("Expected closing parenthesis ')'");
      }
      advance();
      return value;
    });

    symbol("number", function (number) {
      return number;
    });
    symbol("boolean", function (bool) {
      return bool;
    });
    symbol("constant", function (c) {
      return c;
    });
    symbol("string", function (str) {
      return str;
    });

    symbol(",", function () {
      //commas are used to separate independent statements
      return expression(20);
    });

    symbol("is", null, 40, function (left) {
      var type = "is";
      //"is not" is a special case
      if (peekToken().type === "not") {
        type = "!=";
        advance();
      }
      return {
        type: type,
        left: left,
        right: expression(40)
      };
    });

    symbol("identifier", function (tok) {
      //here we allow for identifiers with the same name as functions
      if (isFunction(tok.value) && peekToken().type === "(") {
        var args = [];
        while (advance()) {
          if (token.type === ")") {
            return {
              type: "call",
              args: args,
              name: tok.value
            };
          }
          args.push(expression(20));
        }
        throw GQL.Errors.PARSING_ERROR("Expected closing parenthesis for function " + tok.value);
      }
      return tok;
    });

    do {
      parseTree.push(expression(0));
    } while (peekToken().type !== "(end)");

    return parseTree;
  }



  var selectFun = (function () {

    //handle special "select all" case
    if (!query.select || query.select.trim() === "*") {
      if (query.pivot || query.groupBy) {
        throw GQL.Errors.SELECT_ERROR(
          "If a pivot or group by is present, select columns must be " + "specified explicitly.");
      } else {
        return function (doc) {
          return doc;
        };
      }
    }

    //parse the tokens and add appropriate labels to the top level tokens
    var parsedTokens = (function () {

      function statementToString(statement) {
        var result = [];

        function recur(node) {
          switch (node.type) {
            case "boolean":
              return node.value.toString();

            case "number":
              return node.value.toString();

            case "string":
              return node.value;

            case "call":
              var tempArgs = [];
              if (isAggregator(node.name)) {
                return node.name + "(" + node.args[0].value + ")";
              }
              for (var i = 0; i < node.args.length; i++) {
                tempArgs.push(recur(node.args[i]));
              }
              return node.name + "(" + tempArgs.join(', ') + ")";

            case "identifier":
              return node.value;

            default:
              var returnString = "";
              if (node.left) {
                returnString += recur(node.left) + " ";
              }
              returnString += node.type + " ";
              return returnString += recur(node.right);
          }
        }

        result.push(recur(statement));
        return result.join(' ');
      }

      var labels = {};
      if (query.label) {
        var labelTokens = parse(query.label);
        //make sure there is an even number of label/statement pairs
        if (labelTokens.length / 2 !== 0 || labelTokens.length === 0) {
          //TODO: label error
        }
        for (var i = 1; i < labelTokens.length; i += 2) {
          labels[statementToString(labelTokens[i - 1])] = labelTokens[i].value;
        }
      }
      var tokens = parse(query.select);
      tokens.forEach(function (tok) {
        var key = statementToString(tok);
        if (labels[key]) {
          tok["label"] = labels[key];
        } else {
          tok["label"] = key;
        }
      });
      return tokens;
    }());

    return (function () {

      var operators = {
        "+": function (a, b) {
          return a + b;
        },
        "-": function (a, b) {
          if (typeof b === "undefined") {
            return -a;
          }
          return a - b;
        },
        "*": function (a, b) {
          return a * b;
        },
        "/": function (a, b) {
          return a / b;
        },
        "=": function (a, b) {
          return a === b;
        },
        "<": function (a, b) {
          return a < b;
        },
        "<=": function (a, b) {
          return a <= b;
        },
        ">": function (a, b) {
          return a > b;
        },
        ">=": function (a, b) {
          return a >= b;
        },
        "!=": function (a, b) {
          return a !== b;
        },
        "<>": function (a, b) {
          return a !== b;
        },
        "and": function (a, b) {
          return a && b;
        },
        "or": function (a, b) {
          return a || b;
        },
        "not": function (a) {
          return !a;
        }
      };

      var functions = {
        upper: function (str) {
          return str.toUpperCase();
        },
        lower: function (str) {
          return str.toLowerCase();
        },
        max: function (values, label) {
          return values.reduce(function (max, a) {
            if (a[label] && (!max || a[label] > max)) {
              max = a[label];
            }
            return max;
          }, null);
        },
        min: function (values, label) {
          return values.reduce(function (min, a) {
            if (a[label] && (!min || a[label] < min)) {
              min = a[label];
            }
            return min;
          }, null);
        },
        average: function (values, label) {
          var v = values.reduce(function (tracker, a) {
            if (a[label]) {
              if (typeof a[label] !== "number") {
                throw GQL.Errors.SELECT_ERROR("All values being averaged must be numbers, but " +
                  a[label] + " is not.");
              }
              return {
                count: ++tracker.count,
                total: tracker.total + a[label]
              };
            }
            return tracker;
          }, {
            count: 0,
            total: 0
          });
          return v.total / v.count;
        },
        count: function (values, label) {
          return values.reduce(function (count, a) {
            if (a[label]) {
              return ++count;
            }
            return count;
          }, 0);
        },
        sum: function (values, label) {
          return values.reduce(function (sum, a) {
            if (a[label]) {
              if (typeof a[label] !== "number") {
                throw GQL.Errors.SELECT_ERROR("All values being summed must be numbers, but " +
                     a[label] + " is not.");
              }
              return sum + a[label];
            }
            return sum;
          }, 0);
        }
      };

      function parseTreeSearch(condition) {
        function recur(parentNode) {
          if (!parentNode) {
            return false;
          }
          if (condition(parentNode)) {
            return true;
          }
          if (recur(parentNode.left)) {
            return true;
          }
          return recur(parentNode.right);
        }

        var matchesCondition = false;

        for (var i = 0; i < parsedTokens.length; i++) {
          if (recur(parsedTokens[i])) {
            matchesCondition = true;
            break;
          }
        }
        return matchesCondition;
      }

      function containsAggregator() {
        return parseTreeSearch(function (node) {
          return node.type === "call" && isAggregator(node.name);
        });
      }

      function containsIdentifierWithoutAggregator() {
        return parseTreeSearch(function (node) {
          if (node.type === "call") {
            if (isAggregator(node.name)) {
              return false;
            }
            return true;
          }
          //unaggregated identifiers are allowed if they are in the groupBy clause
          if (node.type === "identifier") {
            var re = new RegExp("\\b" + node.value + "\\b");
            if (query.groupBy && re.test(query.groupBy)) {
              return false;
            }
            return true;
          }
        });
      }

      function pivotOverlap(pivotingColumns) {
        var groupByColumns = getIdentifierList(query.groupBy);
        var selectColumns = [];

        function recur(parentNode) {
          if (!parentNode) {
            return;
          }
          if (parentNode.type === "call") {
            selectColumns.push(parentNode.args[0].value);
          }
          if (parentNode.type === "identifier") {
            selectColumns.push(parentNode.value);
            return;
          }
          recur(parentNode.left);
          recur(parentNode.right);
        }

        parsedTokens.forEach(function (node) {
          recur(node);
        });

        for (var i = 0; i < pivotingColumns.length; i++) {
          if (groupByColumns.indexOf(pivotingColumns[i]) !== -1 ||
            selectColumns.indexOf(pivotingColumns[i]) !== -1) {
            return true;
          }
        }
        return false;
      }

      function parseNode(node, doc) {
        switch (node.type) {
          case "boolean":
            return node.value;

          case "number":
            return node.value;

          case "string":
            return node.value;

          case "call":
            if (functions[node.name]) {
              var tempArgs = [];
              if (isAggregator(node.name)) {
                return functions[node.name].apply(null, [doc, node.args[0].value]);
              }
              for (var i = 0; i < node.args.length; i++) {
                tempArgs.push(parseNode(node.args[i], doc));
              }
              return functions[node.name].apply(null, tempArgs);
            }
            throw GQL.Errors.PARSING_ERROR("Unrecognized function: " + node.name);

          case "identifier":
            //handle the case where a column in the group-by is present in the
            //select without and aggregate function (all cells will have the same value)
            if (Array.isArray(doc)) {
              if (doc[0][node.value] === undefined) {
                return null;
              }
              return doc[0][node.value];
            }
            if (doc[node.value] === undefined) {
              return null;
            }
            return doc[node.value];

          default:
            if (operators[node.type]) {
              if (node.left) {
                return operators[node.type](parseNode(node.left, doc), 
                                            parseNode(node.right, doc));
              }
              return operators[node.type](parseNode(node.right, doc));
            }
            throw GQL.Errors.PARSING_ERROR("Unknown token type: " + node.type);
        }
      }


      return (function () {
        //reduce special case checking
        if (!query.pivot) {
          query.pivot = "";
        }

        if (!containsAggregator() && !query.pivot) {
          return function (values) {
            var result = [];
            values.forEach(function (doc) {
              var viewRow = {};
              parsedTokens.forEach(function (statement, i) {
                viewRow[statement.label] = parseNode(statement, doc);
              });
              if (Object.keys(viewRow).length !== 0) {
                result.push(viewRow);
              }
            });

            return result;
          };
        } else {
          //select in the presence of aggregators and/or pivot
          if (containsIdentifierWithoutAggregator()) {
            throw GQL.Errors.SELECT_ERROR(
              "If an aggregation function is used in the select clause, all identifiers " +
              "in the select clause must be wrapped by an aggregation function or appear in" +
              " the group-by clause.");
          }
          if (query.pivot) {
            //if there are pivoting columns
            var pivotingColumns = getIdentifierList(query.pivot);
            if (pivotOverlap(pivotingColumns)) {
              throw GQL.Errors.PIVOT_ERROR(
                "Columns that appear in the pivot clause may not appear in the group by or " +
                "select clauses.");
            }
            return function (values) {
              var viewRow = {};
              var pivotGroups = {};
              values.forEach(function (doc) {
                var pivotKey = pivotingColumns.map(function (id) {
                  return doc[id];
                }).join(", ");
                if (!pivotGroups[pivotKey]) {
                  pivotGroups[pivotKey] = [doc];
                } else {
                  pivotGroups[pivotKey].push(doc);
                }
              });

              function processPivotGroups(statement) {
                if (statement.type === "identifier") {
                  viewRow[statement.label] = parseNode(statement, pivotGroups[pg]);
                } else if (statement.type === "call" && isAggregator(statement.name)) {
                  //aggregate across entire pivot group
                  viewRow[pg + " " + statement.label] = parseNode(statement, pivotGroups[pg]);
                }
              }

              for (var pg in pivotGroups) {
                parsedTokens.forEach(processPivotGroups);
              }
              if (Object.keys(viewRow).length !== 0) {
                return [viewRow];
              }
            };
          } else {
            return function (values) {
              var viewRow = {};
              parsedTokens.forEach(function (statement, i) {
                viewRow[statement.label] = parseNode(statement, values);
              });

              if (Object.keys(viewRow).length !== 0) {
                return [viewRow];
              }
            };
          }
        }
      }());
    }());
  }());

  var whereFun = (function () {

    if (!query.where) {
      return function () {
        return true;
      };
    }

    var parsedTokens = parse(query.where);

    function interpreter(doc) {

      var operators = {
        "+": function (a, b) {
          return a + b;
        },
        "-": function (a, b) {
          if (typeof b === "undefined") {
            return -a;
          }
          return a - b;
        },
        "*": function (a, b) {
          return a * b;
        },
        "/": function (a, b) {
          return a / b;
        },
        "=": function (a, b) {
          return a === b;
        },
        "is": function (a, b) {
          return a === b;
        },
        "<": function (a, b) {
          return a < b;
        },
        "<=": function (a, b) {
          return a <= b;
        },
        ">": function (a, b) {
          return a > b;
        },
        ">=": function (a, b) {
          return a >= b;
        },
        "!=": function (a, b) {
          return a !== b;
        },
        "<>": function (a, b) {
          return a !== b;
        },
        "and": function (a, b) {
          return a && b;
        },
        "or": function (a, b) {
          return a || b;
        },
        "not": function (a) {
          return !a;
        }
      };

      function parseNode(node) {
        switch (node.type) {
          case "boolean":
            return node.value;

          case "number":
            return node.value;

          case "constant":
            if (node.value === "null") {
              return null;
            }
            throw GQL.Errors.PARSING_ERROR("Unknown constant: " + node.value);

          case "string":
            return node.value;

          case "identifier":
            if (doc[node.value] === undefined) {
              return null;
            }
            return doc[node.value];

          default:
            if (operators[node.type]) {
              if (node.left) {
                var left = parseNode(node.left);
                var right = parseNode(node.right);
                return operators[node.type](left, right);
              }
              return operators[node.type](parseNode(node.right));
            }
            throw GQL.Errors.PARSING_ERROR("Unknown token type " + node.type);
        }
      }

      return parseNode(parsedTokens[0]);
    }

    return interpreter;
  }());

  var groupByFun = (function () {
    if (!query.groupBy) {
      return function (doc) {
        return "";
      };
    }

    var columns = getIdentifierList(query.groupBy);

    function interpreter(doc) {
      var key = [];
      columns.forEach(function (col) {
        key.push(doc[col]);
      });
      return key;
    }

    return interpreter;
  }());

  function map(doc) {
    if (whereFun(doc)) {
      results.push({
        id: doc._id,
        key: groupByFun(doc),
        value: doc
      });
    }
  }

  function reduce(keys, values) {
    return selectFun(values);
  }

  //// exclude  _conflicts key by default
  //// or to use options.conflicts if it's set when called by db.query
  var conflicts = ('conflicts' in options ? options.conflicts : false);

  //only proceed once all documents are mapped and joined
  function checkComplete() {
    results.sort(function (a, b) {
      return pouchCollate(a.key, b.key);
    });
    if (options.descending) {
      results.reverse();
    }

    var groups = [];
    results.forEach(function (e) {
      var last = groups[groups.length - 1] || null;
      if (last && pouchCollate(last.key[0][0], e.key) === 0) {
        last.key.push([e.key, e.id]);
        last.value.push(e.value);
        return;
      }
      groups.push({
        key: [
          [e.key, e.id]
        ],
        value: [e.value]
      });
    });

    groups.forEach(function (e) {
      e.value = reduce(e.key, e.value);
      e.value = (typeof e.value === 'undefined') ? null : e.value;
      e.key = e.key[0][0];
    });

    var flattenedOutput = [];

    //this bit is to make the output palatable
    groups.forEach(function (e) {
      e.value.forEach(function (f) {
        flattenedOutput.push(f);
      });
    });

    options.complete(null, {
      rows: flattenedOutput
    });
  }

  db.changes({
    conflicts: conflicts,
    include_docs: true,
    onChange: function (doc) {
      if (!('deleted' in doc)) {
        map(doc.doc);
      }
    },
    complete: function () {
      checkComplete();
    }
  });
}
GQL.Errors = {
  UNRECOGNIZED_QUERY: {
    status: 400,
    error: 'not_recognized',
    reason: 'Format of input query is not valid'
  },
  LEXER_ERROR: function (message, index) {
    return {
      status: 400,
      error: "tokenizing_error",
      reason: message + " on character " + index + "." || "Generic tokenizing error"
    };
  },
  PARSING_ERROR: function (message) {
    return {
      status: 400,
      error: "parsing_error",
      reason: message || "Generic parsing error"
    };
  },
  SELECT_ERROR: function (message) {
    return {
      status: 400,
      error: "select_error",
      reason: message || "Generic select error"
    };
  },
  PIVOT_ERROR: function (message) {
    return {
      status: 400,
      error: "pivot_error",
      reason: message || "Generic pivot error"
    };
  }
};
// Deletion is a noop since we dont store the results of the view
GQL._delete = function () {};

if (typeof window !== 'undefined' && window.PouchDB) {
  window.PouchDB.plugin('gql', GQL);
}

module.exports = GQL;

},{"pouchdb-collate":1}]},{},[2])
(2)
});