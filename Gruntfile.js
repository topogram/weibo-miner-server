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
              },
        },
        concat: {
          basic_and_extras: {
            files: {
              'client/dist/d3.js': [
                  'client/bower_components/d3/d3.min.js',
                  "client/bower_components/d3.layout.cloud/d3.layout.cloud.js"
              ],
              'client/dist/angular.js': [
                    'client/bower_components/angularjs/angular.js', 
                    'client/bower_components/lodash/dist/lodash.js', 
                    'client/bower_components/angular-route/angular-route.js', 
                    'client/bower_components/angular-local-storage/angular-local-storage.js', 
                    "client/bower_components/restangular/dist/restangular.js", 
                    "client/bower_components/angular-flash/dist/angular-flash.js",
                    "client/bower_components/angular-file-upload/angular-file-upload.js",
                    "client/bower_components/ng-table/ng-table.js",
                    "client/bower_components/angular-bootstrap/ui-bootstrap.js",
                    "client/bower_components/angular-bootstrap/ui-bootstrap-tpls.js",
                    "client/bower_components/angular-bootstrap-slider/slider.js"
                    ],
              'client/dist/jquery-bootstrap.js': [
                    'client/bower_components/jquery/dist/jquery.js', 
                    'bower_components/bootstrap/dist/js/bootstrap.js',
                    'bower_components/bootstrap-slider/bootstrap-slider.js'
              ],
              "client/dist/other-libs.js" : [
                    "client/bower_components/simg/src/simg.js",
                    "client/bower_components/socket.io-client/dist/socket.io.min.js"
              ]
            },
          },
        },
        uglify: {
           bower: {
            options: {
              mangle: true,
              compress: true
            },
            files: {
              'client/dist/angular.min.js': 'client/dist/angular.js',
               'client/dist/d3.min.js':  'client/dist/d3.js',
               'client/dist/jquery-bootstrap.min.js':  'client/dist/jquery-bootstrap.js',
               'client/dist/other-libs.min.js':  'client/dist/other-libs.js',
            }
          }
        }
    })
  
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-bower-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');

  // deal with bower stuff
  grunt.registerTask('buildbower', [
    "concat",
    'uglify:bower'
  ]);

  grunt.registerTask('copy', [
      "copy"
  ])

  grunt.registerTask('minify', [
        'ngAnnotate',
        "buildbower"
    ])
};
