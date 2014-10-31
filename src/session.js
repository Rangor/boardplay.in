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