
var mongoose = require('mongoose');
var Game = require("./models").Game;
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {

});

var express = require('express');
var app = express();

app.get('/hello.txt', function(req, res){
  res.send('Hello World');
});

app.get('/', function(req, res){
  Game.find(function (err, data) {
  if (err) return console.error(err);
    res.end(data.toString());
  })
});

var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});
