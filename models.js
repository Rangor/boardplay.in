var mongoose = require("mongoose");

var gameSchema = mongoose.Schema({
    name: String
})

var playSchema = mongoose.Schema({
    userName: String,
    userId: String,
    gameName: String,
    gameId,
    date: {type: Date, default: Date.now}
})

new Schema({
  title:  String,
  author: String,
  body:   String,
  comments: [{ body: String, date: Date }],
  date: { type: Date, default: Date.now },
  hidden: Boolean,
  meta: {
    votes: Number,
    favs:  Number
  }
});

var Game = mongoose.model('Game', gameSchema);

module.exports = {
  Game: Game
}
