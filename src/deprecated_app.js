
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
  query.select('name password salt gravatarHash apiKey');//Todo something went wrong on the server here, salt was null or something
  query.exec(function (err, user) {
    if (err) return handleError(err);
    if(!user){
      fn(new Error('invalid password'));
    }else{
      hash(pass, user.salt,function(err,hash){
        if (err) return handleError(err);
        if(user.password === hash){
          return fn(null, user);
        }else{
          fn(new Error('invalid password'));
        }
      });
    }
  });
}

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

function apiRestrict(req, res, next){
  var query = User.findOne({'apiKey':req.param("apikey")});
  query.exec(function(err, user){
    if(user){
      next();
    }
  })
}

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

app.get('/', restrict, function(req, res){
  getLatestGamesAndSessions(function (games, sessions) {
    res.locals.sessions = sessions;
    res.locals.user = req.session.user;
    res.locals.games = games;
    res.render('main');
  })
});

app.get('/about', restrict, function(req, res){
  res.locals.user = req.session.user;
    res.render('about');
});

//Helper methods
function getAllGames(fn){
  var query = Game.find();
  query.sort("name");
  query.exec(function (err, data) {
    if (err) return console.error(err);
    return fn(data);
  });
}

function getLatestGamesAndSessions(fn){
  var query = Game.find();
  query.limit(12);
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
      return fn(games, sessions);
    });
  });
}

// Urls
// Game 
app.get('/games', restrict,function(req, res){
  query = Game.find();
  query.sort("name");
  query.exec(function (err, data) {
    if (err) return console.error(err);
    res.locals.games = data;
    res.locals.user = req.session.user;
    res.render('games');
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

//User
app.get('/users', restrict,function(req, res){
  User.find(function (err, data) {
    if (err) return console.error(err);
    res.locals.users = data;
    res.locals.user = req.session.user;
    res.render('users');
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

//Session
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

app.get('/logsession/:gameId', restrict,function(req, res){
  res.locals.user = req.session.user;
  getAllGames(function(data){
    res.locals.games = data;
    res.locals.selectedGameId = req.param("gameId");
    res.render('logsession');
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

app.post('/removeUserFromSession/:id', restrict, function(req, res){
  var selectedId = req.param("id");
  var newUserId = req.param("newUserId");
  var newUserName = req.param("newUserName");

  var query = Session.findOne({ '_id': selectedId });
  query.select('gameName date userName summary otherGamerIds otherGamerUserNames');
  query.exec(function (err, session) {
    if (err) return handleError(err);
    var idPosition = session.otherGamerIds.indexOf(newUserId);
    session.otherGamerIds[idPosition] = "";
    session.otherGamerIds.sort();
    session.otherGamerIds.shift();

    var namePosition = session.otherGamerUserNames.indexOf(newUserName);
    session.otherGamerUserNames[namePosition] = "";
    session.otherGamerUserNames.sort();
    session.otherGamerUserNames.shift();

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

//////////////////////////////
//Stats
//////////////////////////////


app.get('/stats', restrict, function(req,res){
  res.render('stats');
});

//////////////////////////////
//Password
//////////////////////////////

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

app.get('/user/:name', restrict,function(req, res){
  var selectedUserName = req.param("name");
  var query = User.findOne({ 'name': selectedUserName });
  query.select('name displayName bgLink bggLink email gravatarHash');
  query.exec(function (err, user) {
        //var sessionQuery = Session.find().where('userName').equals(user.name);
        var sessionQuery = Session.find({userName : user.name});
        sessionQuery.select('gameName userName date summary gameId');
        sessionQuery.sort('-date');
        sessionQuery.exec(function (err, sessions){
          if (err) return handleError(err);
          var sessionQueryOther = Session.find({otherGamerUserNames : user.name});
          sessionQueryOther.select('gameName userName date summary gameId');
          sessionQueryOther.sort('-date');
          sessionQueryOther.exec(function (err, sessionsOther){
           sessions.push.apply(sessions, sessionsOther);
           var gamesDict = {};
           for(i = 0; i < sessions.length; i++){
            gamesDict[sessions[i].gameId] = sessions[i].gameName;
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
  query.select('name displayName bgLink bggLink email');
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
    user.bgLink = req.param("bgLink");
    user.email = req.param("email");
    var gravatar = md5(user.email);
    if(gravatar != user.gravatarHash){
      updateSessionsWithGravatarHash(req.session.user.name, gravatar);
    }
    user.gravatarHash = gravatar;
    user.save(function (err) {
      if (err) return handleError(err);
      res.redirect(/user/+user.name);
    });
  }); 
});

//////////////////////////////
// Login
//////////////////////////////

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

//////////////////////////////
//API
//////////////////////////////
app.post('/api/apikey', function(req, res){
  authenticate(req.body.username, req.body.password, function(err, user){
    if(user){
      hash("apikeyseed", function(err, salt, hash){         
        user.apiKey = hash.substring(1,20);
        user.save(function () {
          var apiKeyDict = {};
          apiKeyDict["apiKey"] = user.apiKey;
          res.json(apiKeyDict);
        })
      })
    }
  });
});

app.get('/api/games/:apikey', apiRestrict, function(req, res){
  Game.find(function(err, games){
    res.setHeader('Content-Type', 'application/json');
    res.json(games);
  })
});

app.get('/api/sessions/:apikey', apiRestrict, function(req, res){
  Session.find(function(err, sessions){
    res.setHeader('Content-Type', 'application/json');
    res.json(sessions);
  })
});

app.get('/api/usersessions/:apikey', apiRestrict, function(req, res){
  Session.find(function(err, sessions){
    res.setHeader('Content-Type', 'application/json');
    res.json(sessions);
  })
});


if (!module.parent) {
  var port = Number(process.env.PORT || 5000);
  app.listen(port, function() {
    console.log("Listening on " + port);
  });
}
