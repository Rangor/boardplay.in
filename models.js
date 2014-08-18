var mongoose = require("mongoose");

var gameSchema = mongoose.Schema({
    name : {type:String, required: true},
    bggLink: String,
    numberOfPlayers: String,
    maxNumberOfPlayers: Number,
    description: String,
    isExpansion: Boolean,
    expansionToGame: String
})

var sessionSchema = mongoose.Schema({
    userName: {type:String, required: true},
    userId: {type:String, required: true},
    gameName: {type:String, required: true},
    gameId : {type:String, required: true},
    date: {type: Date, default: Date.now},
    duration: Number,
    summary: String,
    gravatarHash: String
})

var userSchema = mongoose.Schema({
    name: {type:String, required: true,unique: true},
    password: {type:String, required: true},
    salt:{type:String, required:true},
    bggLink: String,
    bgLink: String,
    homepage: String,
    twitter: String,
    email: String,
    displayName: String,
    gplus: String,
    gravatarHash: String
})

var Game = mongoose.model('Game', gameSchema);
var Session = mongoose.model('Session', sessionSchema);
var User = mongoose.model('User', userSchema);

module.exports = {
  Game: Game,
  Session: Session,
  User: User
}
