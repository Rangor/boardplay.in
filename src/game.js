//Game
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