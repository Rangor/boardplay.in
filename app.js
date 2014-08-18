/**
 * Module dependencies.
 */

var express = require('express');
var hash = require('./pass').hash;
var bodyParser = require('body-parser');
var session = require('express-session');
var Game = require("./models").Game;
var Session = require("./models").Session;
var User = require("./models").User;
var md5 = require('MD5');

var http = require ('http');             // For serving a basic web page.
var mongoose = require ("mongoose"); // The reason for this demo.

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.
var uristring =
process.env.MONGOLAB_URI ||
process.env.MONGOHQ_URL ||
'mongodb://localhost/test';

// The http server will listen to an appropriate port, or default to
// port 5000.
var theport = process.env.PORT || 5000;

var oneDay = 86400000;

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
});
var app = module.exports = express();

// config

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/js', express.static(__dirname + '/public/js'));


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

// Authenticate using our plain-object database of doom!

function authenticate(name, pass, fn) {
  var query = User.findOne({ 'name': name });
  query.select('name password salt');//Todo something went wrong on the server here, salt was null or something
  query.exec(function (err, user) {
      if (err) return handleError(err);

      hash(pass, user.salt,function(err,hash){
        if (err) throw err;
        if(user.password === hash){
          return fn(null, user);
        }else{
          fn(new Error('invalid password'));
        }
        });
    });
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

app.get('/', restrict, function(req, res){
  getLatestGamesAndSessions(function (games, sessions) {
    // console.log("/main sessions:" + sessions);
    res.locals.sessions = sessions;
    res.locals.user = req.session.user;
    res.locals.games = games;
    res.render('main');
  })


});

app.get('/games', restrict,function(req, res){
      Game.find(function (err, data) {
      if (err) return console.error(err);
        res.locals.games = data;
        res.locals.user = req.session.user;
        res.render('games');
      });
});

app.get('/users', restrict,function(req, res){
      User.find(function (err, data) {
      if (err) return console.error(err);
        res.locals.users = data;
        res.locals.user = req.session.user;
        res.render('users');
      });
});

function getAllGames(fn){
  Game.find(function (err, data) {
  if (err) return console.error(err);
    // console.log("Got all the games " + data);
    return fn(data);
  });
}

function getLatestGames(fn){
  var query = Game.find();
  query.limit(5);
  query.select('name bggLink description');
  query.exec(function (err, data) {
  if (err) return console.error(err);
    // console.log("Got all the games " + data);
    return fn(data);
  });
}

function getAllGamesAndSessions(fn){
  Game.find(function (err, games) {
  if (err) return console.error(err);
    Session.find(function (err, sessions) {
    if (err) return console.error(err);
      return fn(games, sessions);
    });
  });
}

function getLatestGamesAndSessions(fn){
  var query = Game.find();
  query.limit(5);
  query.select('name bggLink description');
  query.exec(function (err, games) {
  if (err) return console.error(err);
    var query = Session.find();
    query.limit(5);
    query.sort('-date');
    query.select('userName gameName date summary gravatarHash');
    query.exec(function (err, sessions) {
    if (err) return console.error(err);
      return fn(games, sessions);
    });
  });
}

app.get('/sessions', restrict,function(req, res){
      var query = Session.find();
      query.sort("-date");
      query.select('userName gameName date summary gravatarHash');
      query.exec(function (err, data) {
      if (err) return console.error(err);
        res.locals.sessions = data;
        res.locals.user = req.session.user;
        res.render('sessions');
      });
});

app.get('/newgame', restrict,function(req, res){
        res.locals.user = req.session.user;
        res.render('newgame');
});

app.post('/newgame', restrict,function(req, res){
        // console.log("New game added, name:" + req.param("name"));
        var game = new Game();
        game.name = req.param("name");
        game.bggLink = req.param("bggLink");
        game.description = req.param("description");
        game.save(function () {
          res.locals.user = req.session.user;
          res.redirect('games');
        });
});

app.get('/logsession', restrict,function(req, res){
        res.locals.user = req.session.user;
        getAllGames(function(data){
          res.locals.games = data;
          res.render('logsession');
        });
});

app.post('/logsession', restrict,function(req, res){
        var game = req.body.gamespicker.split(",");
        var session = new Session();
        session.gameName = game[1];
        session.gameId = game[0];
        session.userName = req.session.user.name;
        session.userId = req.session.user._id;
        session.date = req.param("date");
        session.summary = req.param("summary");
        session.save(function () {
          res.locals.user = req.session.user;
          res.redirect('sessions');
        });
});

app.get('/newuser', function(req, res){
        res.locals.user = req.session.user;
        res.render('newuser');
});

app.post('/newuser', function(req, res){
        var user = new User();
        user.name = req.param("name");

        hash(req.param("password"), function(err, salt, hash){
        if (err) throw err;
          user.salt = salt;
          user.password = hash;

          user.save(function () {
            res.redirect('/');
          });

        });
});

app.get('/game/:id', restrict,function(req, res){

      var selectedId = req.param("id");

      var query = Game.findOne({ '_id': selectedId });
      query.select('name bggLink description');
      query.exec(function (err, game) {
        if (err) return handleError(err);
          res.locals.game = game;
          res.locals.user = req.session.user;
          res.render('game');
      })
});

app.get('/deletegame/:id', restrict,function(req, res){
      var selectedId = req.param("id");
      var query = Game.findOne({ '_id': selectedId });
      query.select('name');
      query.remove(function (err, game) {
        if (err) return handleError(err);
          res.redirect('/games');
      })
});

app.get('/editgame/:id', restrict,function(req, res){
      var selectedId = req.param("id");
      var query = Game.findOne({ '_id': selectedId });
      query.select('name bggLink description');
      query.exec(function (err, game) {
        if (err) return handleError(err);
          res.locals.game = game;
          res.locals.user = req.session.user;
          res.render('editgame');
      })
});

app.post('/editgame', restrict,function(req, res){
      var selectedId = req.param("id");
      Game.findById(selectedId, function (err, game) {
      if (err) return handleError(err);
          game.name = req.param("name");
          game.bggLink = req.param("bggLink");
          game.description = req.param("description");
          game.save(function (err) {
            if (err) return handleError(err);
              res.redirect(/game/+game._id);
          });
    }); 
});

app.get('/user/:id', restrict,function(req, res){

      var selectedId = req.param("id");

      var query = User.findOne({ '_id': selectedId });
      query.select('name bggLink email gravatarHash');
      query.exec(function (err, user) {
        if (err) return handleError(err);
          res.locals.userEdit = user;
          res.locals.user = req.session.user;
          res.render('user');
      })
});

app.get('/deleteuser/:id', restrict,function(req, res){
      var selectedId = req.param("id");
      var query = Game.findOne({ '_id': selectedId });
      query.select('name');
      query.remove(function (err, game) {
        if (err) return handleError(err);
          res.redirect('/games');
      })
});

app.get('/edituser/:id', restrict,function(req, res){
      var selectedId = req.param("id");
      var query = User.findOne({ '_id': selectedId });
      query.select('name bggLink email');
      query.exec(function (err, user) {
        if (err) return handleError(err);
          res.locals.userEdit = user;
          res.locals.user = req.session.user;
          res.render('edituser');
      })
});

app.post('/edituser', restrict,function(req, res){
      var selectedId = req.param("id");
      User.findById(selectedId, function (err, user) {
      if (err) return handleError(err);
          user.displayName = req.param("displayName");
          user.bggLink = req.param("bggLink");
          user.email = req.param("email");
          var gravatar = md5(user.email);
          if(gravatar != user.gravatarHash){
            console.log("New hash, updating sessions");
            updateSessionsWithGravatarHash(req.session.user.name, gravatar);
          }else{
            console.log("Same old hash");
          }
          user.gravatarHash = gravatar;
          user.save(function (err) {
            if (err) return handleError(err);
              res.redirect(/user/+user._id);
          });
    }); 
});

function updateSessionsWithGravatarHash(userName, newGravatarHash){
  var query = Session.find({'userName' : userName});
  query.select("gravatarHash");
  query.exec(function(err,sessions){
    for(i in sessions){
      sessions[i].gravatarHash = newGravatarHash;
      sessions[i].save(function(err){
      });
    }
  });
}

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
  var port = Number(process.env.PORT || 5000);
  app.listen(port, function() {
  console.log("Listening on " + port);
});
}
