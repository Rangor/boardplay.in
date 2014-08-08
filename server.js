// dependencies
var restify = require('restify'),
    session = require('restify-session')({
        debug : true,
        ttl   : 2
    });

// create the server
var server  = restify.createServer();

// attach the session manager
server.use(session.sessionManager)

// attach a route
server.get('/', function(req, res, next){
   res.send({ success: true, session: req.session });
   return next();
});

// start the server
server.listen(3000);
