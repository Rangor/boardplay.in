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