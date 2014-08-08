var mongoose = require("mongoose");

var gameSchema = mongoose.Schema({
    name: String
})

var playSchema = mongoose.Schema({
    userName: String,
    userId: String,
    gameName: String,
    gameId : String,
    date: {type: Date, default: Date.now}
})

var Game = mongoose.model('Game', gameSchema);
var Play = mongoose.model('Play', playSchema);

module.exports = {
  Game: Game,
  Play: Play
}
