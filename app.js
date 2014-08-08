/**
 * Module dependencies.
 */

var express = require('express');
var hash = require('./pass').hash;
var bodyParser = require('body-parser');
var session = require('express-session');
var Game = require("./models").Game;
var Play = require("./models").Play;


var http = require ('http');             // For serving a basic web page.
var mongoose = require ("mongoose"); // The reason for this demo.

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.
var uristring =
process.env.MONGOLAB_URI ||
process.env.MONGOHQ_URL ||
'mongodb://localhost/HelloMongoose';

// The http server will listen to an appropriate port, or default to
// port 5000.
var theport = process.env.PORT || 5000;

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
});
// mongoose.connect('mongodb://localhost/test');


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
});
var app = module.exports = express();

// config

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// middleware

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'shhhh, very secret'
}));

// Session-persisted message middleware

app.use(function(req, res, next){
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});

// dummy database

var users = {
  // tj: { name: 'tj' },
  martin: { name: 'martin' }
};

// when you create a user, generate a salt
// and hash the password ('foobar' is the pass here)

hash('foobar', function(err, salt, hash){
  if (err) throw err;
  // store the salt & hash in the "db"
  users.martin.salt = salt;
  users.martin.hash = hash;
});


// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {
  if (!module.parent) console.log('authenticating %s:%s', name, pass);
  var user = users[name];
  // query the db for the given username
  if (!user) return fn(new Error('cannot find user'));
  // apply the same algorithm to the POSTed password, applying
  // the hash against the pass / salt, if there is a match we
  // found the user
  hash(pass, user.salt, function(err, hash){
    if (err) return fn(err);
    if (hash == user.hash) return fn(null, user);
    fn(new Error('invalid password'));
  });
}

function restrict(req, res, next) {
  // req.session.user = "Martin";

  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

app.get('/', restrict,function(req, res){
      Game.find(function (err, data) {
      if (err) return console.error(err);
        res.locals.games = data;
        res.locals.user = req.session.user;
        res.render('main');
      });
});

app.get('/games', restrict,function(req, res){
      Game.find(function (err, data) {
      if (err) return console.error(err);
        res.locals.games = data;
        res.locals.user = req.session.user;
        res.render('games');
      });
});

app.get('/plays', restrict,function(req, res){
      Play.find(function (err, data) {
      if (err) return console.error(err);
        res.locals.plays = data;
        res.locals.user = req.session.user;
        res.render('plays');
      });
});

app.get('/newgame', restrict,function(req, res){
        res.locals.user = req.session.user;
        res.render('newgame');
});

app.post('/newgame', restrict,function(req, res){
        console.log("New game added, name:" + req.param("name"));
        var game = new Game();
        game.name = req.param("name");
        game.save(function () {
          res.locals.user = req.session.user;
          res.redirect('games');
        });
});

app.get('/logplay', restrict,function(req, res){
        res.locals.user = req.session.user;
        res.render('logplay');
});

app.post('/logplay', restrict,function(req, res){
        console.log("New play was logged, name:" + req.param("name"));
        var play = new Play();
        play.gameName = req.param("name");
        play.save(function () {
          res.locals.user = req.session.user;
          res.redirect('plays');
        });
});

app.get('/game/:id', restrict,function(req, res){

      var selectedId = req.param("id");

      var query = Game.findOne({ '_id': selectedId });
      query.select('name');
      query.exec(function (err, game) {
        if (err) return handleError(err);
          console.log(game.name);
          res.locals.game = game;
          res.locals.user = req.session.user;
          res.render('game');
      })
});

app.get('/delete/:id', restrict,function(req, res){
      var selectedId = req.param("id");
      var query = Game.findOne({ '_id': selectedId });
      query.select('name');
      query.remove(function (err, game) {
        if (err) return handleError(err);
          console.log("Deleted game with id " + selectedId);
          res.redirect('/games');
      })
});

app.get('/restricted', restrict, function(req, res){
  res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});

app.get('/main', restrict, function(req, res){
  var games;
  Game.find(function (err, games) {
  if (err) return console.error(err);
    res.render('main');
  })


});

app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
});

app.get('/login', function(req, res){
  res.render('login');
});

app.post('/login', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation
      req.session.regenerate(function(){
        // Store the user's primary key
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.name
          + ' click to <a href="/logout">logout</a>. '
          + ' You may now access <a href="/restricted">/restricted</a>.';
        res.redirect('/');
      });
    } else {
      req.session.error = 'Authentication failed, please check your '
        + ' username and password.'
        + ' (use "tj" and "foobar")';
      res.redirect('/login');
    }
  });
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}
