
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