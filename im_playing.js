var mongoose = require('mongoose');
var Game = require("./models").Game;
mongoose.connect('mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {

    Game.find(function (err, games) {
      if (err) return console.error(err);
      console.log(games);

      // games.[0].delete(function(err, games[0]){
      //   if(err) return console.error(err);
      // })

      process.exit(code=0);
    })
});





// var catan = new Game({ name: 'Catan' })
// console.log(catan.name) // 'Catan'
//
// catan.save(function (err, catan) {
//   if (err) return console.error(err);
// });
