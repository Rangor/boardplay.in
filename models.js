var mongoose = require("mongoose");

var gameSchema = mongoose.Schema({
    name: String
})

var sessionSchema = mongoose.Schema({
    userName: {type:String, required: true},
    userId: {type:String, required: true},
    gameName: {type:String, required: true},
    gameId : {type:String, required: true},
    date: {type: Date, default: Date.now},
    duration: Number,
    summary: String
})

var userSchema = mongoose.Schema({
    name: {type:String, required: true,unique: true},
    password: {type:String, required: true},
    salt:{type:String, required:true}
})

var Game = mongoose.model('Game', gameSchema);
var Session = mongoose.model('Session', sessionSchema);
var User = mongoose.model('User', userSchema);

module.exports = {
  Game: Game,
  Session: Session,
  User: User
}
