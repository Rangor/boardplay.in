var mongoose = require('mongoose');
var Game = require("./models").Game;
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
      startServer();
});

function startServer(){
  var restify = require('restify');
  var server = restify.createServer();
  server.use(restify.bodyParser());
  // Set up our routes and start the server
  server.get('/games', getGames);
  server.post('/games', postGame);
  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
  console.log("Waiting for requests");
}

// var catan = new Game({ name: 'Catan' })
// console.log(catan.name) // 'Catan'
//
// catan.save(function (err, catan) {
//   if (err) return console.error(err);
// });

function getGames(req, res, next) {
  console.log("getAllGames was called");
  // Resitify currently has a bug which doesn't allow you to set default headers
  // This headers comply with CORS and allow us to server our response to any origin
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  Game.find(function (err, data) {
  if (err) return console.error(err);
    res.send(data);
  })
}



function postGame(req, res, next) {
  console.log("post new game was called");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  // Create a new message model, fill it up and save it to Mongodb
  var game = new Game();
  game.name = req.params.name;
  game.save(function () {
    res.send(req.body);
  });
}
