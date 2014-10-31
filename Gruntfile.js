module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
  	pkg: grunt.file.readJSON('package.json'),
  	jshint: {
  		all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js']
  	},
  	concat: {
  		options: {
  			separator: '\n',
  		},
  		dist: {
  			src: ['src/main.js', 'src/helpers.js', 'src/basic.js','src/session.js','src/game.js', 'src/user.js'],
  			dest: 'app.js',
  		},
  	},
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.registerTask('default', ['jshint', 'concat']);
  //grunt.registerTask('default', ['concat']);
};