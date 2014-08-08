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

var userSchema = mongoose.Schema({
    name: {type:String, required: true,unique: true},
    password: {type:String, required: true},
    salt:{type:String, required:true}
})

var Game = mongoose.model('Game', gameSchema);
var Play = mongoose.model('Play', playSchema);
var User = mongoose.model('User', userSchema);

module.exports = {
  Game: Game,
  Play: Play,
  User: User
}
