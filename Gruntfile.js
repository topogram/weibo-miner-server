module.exports = function(grunt) {

  grunt.initConfig({
        ngAnnotate: { // angular JS compression
            topogram: {
                files : {
                            "client/dist/topogram.js" : [ "client/js/main.js", "client/js/routes.js", "client/js/controllers/**.js", "client/js/factories/**.js",  "client/js/services/**.js", "client/js/directives/**.js", "client/js/directives/**/*.js", "client/js/directives/**/**/*.js"]
                }
            },
        },
        bower_concat: {
              all: {
                  dest: 'client/dist/bower.js',
                  cssDest: 'client/dist/bower.css',
                  mainFiles: {
                    "simg" : "simg/src/simg.js",
                    "socket.io-client" : "socket.io-client/dist/socket.io.min.js",

                  },
                  separator : ';' 
                  // ,
                  // callback: function(mainFiles, component) {
                  //       return mainFiles.map( function(filepath) {
                  //           // Use minified files if available
                  //           var min = filepath.replace(/\.js$/, '.min.js');
                  //           return grunt.file.exists(min) ? min : filepath;
                  //       });
                  //   }
              },
        },
        uglify: {
           bower: {
            options: {
              mangle: true,
              compress: true
            },
            files: {
              'client/dist/bower.min.js': 'client/dist/bower.js'
            }
          }
        }
    })
  
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // deal with bower stuff
  grunt.registerTask('buildbower', [
    'bower_concat',
    'uglify:bower'
  ]);

  grunt.registerTask('minify', [
        'ngAnnotate',
        "buildbower"
    ])
};
