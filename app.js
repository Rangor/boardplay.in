
var express = require('express');
var hash = require('./pass').hash;
var bodyParser = require('body-parser');
var session = require('express-session');
var Game = require("./models").Game;
var Session = require("./models").Session;
var User = require("./models").User;
var md5 = require('MD5');
var http = require ('http');            
var mongoose = require ("mongoose"); 

var uristring =
process.env.MONGOLAB_URI ||
process.env.MONGOHQ_URL ||
'mongodb://localhost/test';

var theport = process.env.PORT || 5000;

var oneDay = 86400000;

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
  query.select('name password salt gravatarHash');//Todo something went wrong on the server here, salt was null or something
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
    return fn(data);
  });
}

function getLatestGamesAndSessions(fn){
  var query = Game.find();
  query.limit(5);
  query.sort('-_id');
  query.select('_id name bggLink description');
  query.exec(function (err, games) {
  if (err) return console.error(err);
    var query = Session.find();
    query.limit(25);
    query.sort("-date");
    query.select('userName gameName date summary gravatarHash');
    query.exec(function (err, sessions) {
    if (err) return console.error(err);
      for(i = 0; i < sessions.length; i++){
        var next = +i + +1;
        if(next < sessions.length){
          if(sessions[i].userName === sessions[next].userName && sessions[i].date.getDate() === sessions[next].date.getDate()){
             sessions[next].gameName = sessions[next].gameName+", "+sessions[i].gameName;
             sessions[next].summary = "";
             if(i > 0){
               var tempSession = sessions[0];
               sessions[0] = sessions[i];
               sessions[i]  = tempSession;
               i = -1;
             }
             sessions.shift();   
          }
        }
      }
      sessions.sort(function(a,b) { return b.date - a.date } );
      while(sessions.length > 6){
        sessions.pop();
      }
      return fn(games, sessions);
    });
  });
}

app.get('/sessions', restrict,function(req, res){
      var query = Session.find();
      query.sort("-date");
      query.select('userName gameName date summary gravatarHash _id');
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
        session.gravatarHash = req.session.user.gravatarHash;
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
        if(req.param("invitekey") != "thisismyinvitekey"){
            res.locals.errormessage = "Wrong invite key";
            res.render('newuser');
        }else{
        hash(req.param("password"), function(err, salt, hash){
        if (err) throw err;
          user.salt = salt;
          user.password = hash;

          user.save(function () {
            res.redirect('/');
          });

        });
      }
});

app.get('/resetpassword', function(req, res){
        res.locals.user = req.session.user;
        res.render('resetpassword');
});

app.post('/resetpassword', function(req, res){
        // console.log("resetting password");
        // var secretKey = req.param("secretkey");
        // console.log(req.param("userid"));
        // if(secretKey != "oihfdsgpiougaddlkhjasd"){
        //   res.redirect('/');
        // }else{
        //   var selectedId = req.param("userid");
        //   var query = User.findOne({ '_id': selectedId });
        //   query.select('password salt');
        //   query.exec(function (err, user) {
        //     hash(req.param("password"), function(err, salt, hash){
        //       user.salt = salt;
        //       user.password = hash;
        //       user.save(function () {
        //         console.log("Password was reset");
        //         res.redirect('/login');
        //       });
              
        //     })
        //   })
        // }
});

app.get('/session/:id', restrict,function(req, res){

      var selectedId = req.param("id");

      var query = Session.findOne({ '_id': selectedId });
      query.select('gameName date userName summary otherGamerIds otherGamerUserNames');
      query.exec(function (err, session) {
        if (err) return handleError(err);
          res.locals.session = session;
          res.locals.user = req.session.user;
          res.render('session');
      })
});

app.post('/addUserToSession/:id', restrict, function(req, res){
      var selectedId = req.param("id");
      var newUserId = req.param("newUserId");
      var newUserName = req.param("newUserName");

      var query = Session.findOne({ '_id': selectedId });
      query.select('gameName date userName summary otherGamerIds otherGamerUserNames');
      query.exec(function (err, session) {
        if (err) return handleError(err);
          if(session.otherGamerIds){

          }else{
            var otherGamerIds = [];
            session.otherGamerIds = otherGamerIds;
            var otherGamerUserNames = [];
            session.otherGamerUserNames = otherGamerUserNames;
          }
          session.otherGamerIds.push(newUserId);
          session.otherGamerUserNames.push(newUserName);
          session.save(function (err){
              res.locals.session = session;
              res.locals.user = req.session.user;
              res.render('session');
          })
      })
});

app.get('/deletesession/:id', restrict,function(req, res){
      var selectedId = req.param("id");
      var query = Session.findOne({ '_id': selectedId });
      query.remove(function (err, session) {
        if (err) return handleError(err);
          res.redirect('/sessions');
      })
});

app.get('/game/:id', restrict,function(req, res){

      var selectedId = req.param("id");

      var query = Game.findOne({ '_id': selectedId });
      query.select('name bggLink description');
      query.exec(function (err, game) {
        if (err) return handleError(err);
        var sessionQuery = Session.find().where("gameName").equals(game.name);
          sessionQuery.exec(function(err, sessions){
            res.locals.numberOfSessions = sessions.length;          
            res.locals.game = game;
            res.locals.user = req.session.user;
            res.render('game');
          })
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
        //var sessionQuery = Session.find().where('userName').equals(user.name);
        var sessionQuery = Session.find({userName : user.name});
        sessionQuery.select('gameName userName date summary');
        sessionQuery.sort('-date');
        sessionQuery.exec(function (err, sessions){
          if (err) return handleError(err);
          var sessionQueryOther = Session.find({otherGamerUserNames : user.name});
          sessionQueryOther.select('gameName userName date summary');
          sessionQueryOther.sort('-date');
          sessionQueryOther.exec(function (err, sessionsOther){
             sessions.push.apply(sessions, sessionsOther);
             var gamesDict = {};
             for(i = 0; i < sessions.length; i++){
                gamesDict[sessions[i].gameName] = sessions[i].gameName;
             }
             res.locals.userEdit = user;
             res.locals.user = req.session.user;
             res.locals.numberOfSessions = sessions.length;
             res.locals.gamesList = gamesDict;
             res.locals.sessions = sessions;
             res.render('user');
          })
        })
      })
});

app.get('/deleteuser/:id', restrict,function(req, res){
      var selectedId = req.param("id");
      if(req.session.user._id != selectedId){
        res.redirect('/');
      }else{
        var query = Game.findOne({ '_id': selectedId });
        query.select('name');
        query.remove(function (err, game) {
          if (err) return handleError(err);
            res.redirect('/games');
        })
      }
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
            updateSessionsWithGravatarHash(req.session.user.name, gravatar);
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
      req.session.regenerate(function(){
        req.session.user = user;
        res.redirect('/');
      });
    } else {
      req.session.error = 'Authentication failed, please check your '
        + ' username and password.';
      res.redirect('/login');
    }
  });
});

if (!module.parent) {
  var port = Number(process.env.PORT || 5000);
  app.listen(port, function() {
  console.log("Listening on " + port);
});
}
