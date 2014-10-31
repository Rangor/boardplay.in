//Basic urls
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