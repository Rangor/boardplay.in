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