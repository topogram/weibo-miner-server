window.Topogram = angular.module('Topogram', [
                                 'ngRoute', 
                                 'restangular', 
                                 'LocalStorageModule',
                                 'angular-flash.service',
                                 'angular-flash.flash-alert-directive',
                                 'angularFileUpload',
                                 "ui.bootstrap",
                                 "ui.bootstrap-slider",
                                 "ngTable"
                                 ])
.run(["$location", "Restangular", "AuthService", function($location, Restangular, AuthService) {
    Restangular.setFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {
        headers['Authorization'] = 'Basic ' + AuthService.getToken();
        return {
            headers: headers
        };
    });
 
    Restangular.setErrorInterceptor(function(response, deferred, responseHandler) {
        if (response.config.bypassErrorInterceptor) {
            return true;
        } else {
            switch (response.status) {
                case 401:
                    AuthService.logout();
                    $location.path('/sessions/create');
                    break;
                default:
                    // throw new Error('No handler for status code ' + response.status);
                    // console.log(response);
                    return response

            }
            return false;
        }
    });
}])

// fix for flash alerts bootstrap 3
Topogram.config(['flashProvider', function(flashProvider) {
  flashProvider.errorClassnames.push('alert-danger');
}])

Topogram.filter('unsafe', ["$sce", function($sce) { return $sce.trustAsHtml; }]);

Topogram.filter("round", function () {
        return function(input, precision) {
            return input ?
                parseFloat(input).toFixed(precision) :
                "";
        };
    });


// routes
Topogram.config(["$routeProvider", "RestangularProvider", function($routeProvider, RestangularProvider) {
 

    RestangularProvider.setBaseUrl('/api/v1');

    var partialsDir = '../partials';

    var redirectIfAuthenticated = function(route) {
        return function($location, $q, AuthService) {
 
            var deferred = $q.defer();
 
            if (AuthService.isAuthenticated()) {
                deferred.reject()
                $location.path(route);
            } else {
                deferred.resolve()
            }
 
            return deferred.promise;
        }
    }
 
    var redirectIfNotAuthenticated = function(route) {
        return function($location, $q, AuthService) {
 
            var deferred = $q.defer();
 
            if (! AuthService.isAuthenticated()) {
                deferred.reject()
                $location.path(route);
            } else {
                deferred.resolve()
            }
 
            return deferred.promise;
        }
    }
 
    $routeProvider
        .when('/', {
            controller: 'HomeDetailCtrl',
            templateUrl: partialsDir + '/home/index.html'
        })
        .when('/sessions/create', {
            controller: 'SessionCreateCtrl',
            templateUrl: partialsDir + '/session/create.html',
            resolve: {
                redirectIfAuthenticated: redirectIfAuthenticated('/posts/create')
            }
        })
        .when('/sessions/destroy', {
            controller: 'SessionDestroyCtrl',
            templateUrl: partialsDir + '/session/destroy.html'
        })
        .when('/users/create', {
            controller: 'UserCreateCtrl',
            templateUrl: partialsDir + '/user/create.html'
        })
        .when('/datasets/create', {
            controller: 'DatasetCreateCtrl',
            templateUrl: partialsDir + '/datasets/create.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/datasets', {
            controller: 'DatasetIndexCtrl',
            templateUrl: partialsDir + '/datasets/index.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/datasets/:datasetId', {
            controller: 'DatasetViewCtrl',
            templateUrl: partialsDir + '/datasets/view.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/datasets/:datasetId/topograms/create', {
            controller: 'TopogramCreateCtrl',
            templateUrl: partialsDir + '/topograms/create.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        // .when('/topograms', {
        //     controller: 'TopogramIndexCtrl',
        //     templateUrl: partialsDir + '/topograms/index.html',
        //     resolve: {
        //         redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
        //     }
        // })
        .when('/datasets/:datasetId/topograms/:topogramId', {
            controller: 'TopogramViewCtrl',
            templateUrl: partialsDir + '/topograms/view.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        ;
}])

    

function ApplicationCtrl($scope, Restangular, AuthService, flash) {
    $scope.isLoggedIn = AuthService.isAuthenticated();
    $scope.isLogged= function() {
        return AuthService.isAuthenticated();
    }
}

function DatasetCreateCtrl($scope, $timeout, $location, Restangular,FileUploader, modalService, flash) {

    $scope.dataset = {};
    $scope.dataset.title = "";


    // FILE UPLOAD
    var uploader = $scope.uploader = new FileUploader({
        url: '/api/v1/datasets',
        alias : "dataset",
        formData : [ $scope.dataset ]
    });

    // FILTERS
    uploader.filters.push({
        name: 'csvFilter',
        fn: function(item /*{File|FileLikeObject}*/, options) {
            var filetype = item.name.split('.').pop();
            var authorized  = ["csv", "txt"];
            return authorized.indexOf(filetype) !== -1;
        }
    });

    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
                console.info('onWhenAddingFileFailed', item, filter, options);
                flash.error = "Error when adding file ";
            };

    uploader.onAfterAddingFile = function(fileItem) {
        console.info('onAfterAddingFile', fileItem);
        console.log($scope.dataset);
    };

    uploader.onBeforeUploadItem = function(item) {
            uploader.formData = $scope.dataset;
    }

    uploader.onSuccessItem = function(fileItem, response, status, headers) {

        console.log(response);
        flash.success = "Dataset created ! " + response.id;

        $timeout(function() {
            $location.path("/datasets/"+response.id);
        })
    };

    uploader.onErrorItem = function(fileItem, response, status, headers) {
        flash.error = response
    };

}

function DatasetIndexCtrl($scope, $http, $location, $timeout, Restangular, flash, modalService, socket) {

    Restangular.all('datasets').getList().then(function(datasets){
        $scope.posts = datasets.map(function(d){
            d.csvfilename = d.filepath.replace(/^.*[\\\/]/, ''); // extract just file name
            return d;
        }).sort(function(a,b){
              return new Date(b.created_at) - new Date(a.created_at); // sort by date
        });
    }, function(err) {
        console.log(err);
        flash.error = err.status + " : "+ err.statusText;
    });
    
    // init socket.io

    socket.on('connect', function () {
          console.log('connect');
    });

    socket.on('progress', function (data) {
        console.log(data);
        // var d=JSON.parse(data)
        // console.log(typeof(data), typeof(d));
        // $scope.loadingNetworks=JSON.parse(data);
    });

    $scope.delete = function(dataset) {

        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Delete',
            headerText: 'Delete',
            bodyText: 'Are you sure you want to delete this data set?',
            waitModal : false
        };

        modalService.showModal({}, modalOptions).then(function (deleted) {
            console.log("modal");
            console.log(deleted);
            dataset.remove().then(function() {

                // remove from scope
                var index = $scope.posts.indexOf(dataset);
                if (index > -1) $scope.posts.splice(index, 1);

                // notify user
                $timeout(function() { flash.success = "Dataset deleted" })
            });
        }, function () {
            // TODO : hit cancel
            console.info('Modal dismissed at: ' + new Date());
        });

    }
}

function DatasetViewCtrl($scope, $routeParams, $timeout, $interval, $location, Restangular, flash, modalService, socket) {

    // set a default value 
    $scope.dataset = {};
    $scope.languages = ["zh"];
    $scope.dataset.time_pattern = "%Y-%m-%d %H:%M";

    // load dataset description from db
    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
            // console.log(dataset);
            $scope.dataset = dataset;
            $scope.dataset.time_pattern = "%Y-%m-%d %H:%M";

            $scope.dataset.filename = $scope.dataset.filepath.replace(/^.*[\\\/]/, ''); // extract just file name
            if (dataset.additional_columns) {
              $scope.dataset.addColumns = dataset.additional_columns.split(",");
            } else {
              $scope.dataset.addColumns = [];
            }

            if ($scope.dataset.text_column == ""  && $scope.dataset.time_column == "" && $scope.dataset.source_column == "" ) {
               $scope.isDescribed = false;
            }
              else
                $scope.isDescribed = true;

            // restitute state
            console.log($scope.dataset.index_state);
            if ($scope.dataset.index_state == 'processing' ) $scope.isIndexing = true; 

    });

    $scope.loadMoreSamples = function() {
            Restangular.one('datasets',$routeParams.datasetId).getList("sample").then(function(sample) {
                console.log(sample);
                $scope.dataset.csv.sample = sample;
            });
    }

    $scope.$watch('dataset.time_column', function(newVal, oldVal){
      if(newVal != "undefined" && newVal != oldVal) {
            $scope.regDate = $scope.dataset.csv.sample[0][newVal];
      }
    })
    
  
   // dataset description
    $scope.postDatasetDescription = function() {
        $scope.dataset.additional_columns  = $scope.dataset.addColumns.join(",");
        $scope.dataset.put().then(function(dataset) {
            flash.success = "Your dataset description has been updated";
            $scope.isDescribed = true;
        }, function errorCallback(response) {
                console.log(response);
                flash.error = response.data
            });
    }

    $scope.stfrDate = function(pattern) {
        return strftime(pattern)
    }



    // Topograms
    // $scope.topogram = [];
    // Restangular.one('datasets',$routeParams.datasetId).getList('topograms').then(function(topograms) {
    //         // console.log(topograms);
    //         $scope.topograms = topograms;
    // });

    // $scope.deleteTopogram = function(topogram) {
    //     var modalOptions = {
    //         closeButtonText: 'Cancel',
    //         actionButtonText: 'Delete',
    //         headerText: 'Delete',
    //         bodyText: 'Are you sure you want to delete this topogram?',
    //         waitModal : false
    //     };

    //     modalService.showModal({}, modalOptions).then(function (deleted) {
    //         console.log("deleted", deleted);
    //         topogram.remove().then(function() {

    //             // remove from scope
    //             var index = $scope.topograms.indexOf(topogram);
    //             if (index > -1) $scope.topograms.splice(index, 1);

    //             // notify user
    //             $timeout(function() { flash.success = "Topogram deleted" })
    //         });
    //     }, function () {
    //         // TODO : hit cancel
    //         console.info('Modal dismissed at: ' + new Date());
    //     });
    // }

     /* 
    REGEXPS
    */

      // iterator for browsing sample data
      $scope.currentColumn = 1;
      $scope.regTxt = "";
      $scope.regexp ={}
      $scope.regexp.regexp=undefined;
      $scope.regexps = [];

      $scope.addPatternsVisible = true

      $scope.toggleAddPatterns = function() {
          $scope.addPatternsVisible = $scope.addPatternsVisible === false ? true: false;
      //    console.log($scope.addPatternsVisible);
      }; ;

      Restangular.one('regexps').getList().then(function(regexps) {
        $scope.regexps = regexps;
      });


      // regexp
      $scope.nextColumn = function() {
        if($scope.currentColumn != $scope.dataset.csv.sample.length)
          $scope.currentColumn++;
        else  $scope.currentColumn = $scope.dataset.csv.sample.length;
        $scope.updateRegTxt();
      }

      $scope.prevColumn = function() {
          if($scope.currentColumn != 1) {$scope.currentColumn--;}
          else $scope.currentColumn = 1;
          $scope.updateRegTxt();
      }

      $scope.updateRegTxt = function() {
          $scope.regTxt = $scope.dataset.csv.sample[$scope.currentColumn-1][$scope.dataset.text_column];
          $scope.updateNewRegTxt();
      }

      $scope.updateNewRegTxt = function () {
           if( $scope.regexp.regexp != undefined) {
                var re = new RegExp($scope.regexp.regexp, "gi");
                $scope.regNewTxt = $scope.regTxt.replace(re, function(str) {return '<mark>'+str+'</mark>'}); 
          } else {
            $scope.regNewTxt = $scope.regTxt;
          }
      }

      // auto update when typing
      $scope.$watch( "regexp.regexp", function(newVal, oldVal){
            // \b(([\w-]+://?|www[.])[^\s()<>]+(?:\([\w\d]+\)|([^\p{P}\s]|/)))
                $scope.updateNewRegTxt();
      }); 

      $scope.saveRegexp = function() {
          console.log($scope.regexp);
          Restangular.all('regexps').post($scope.regexp).then(function(regexp) {
              console.log(regexp);
              $scope.regexps.push(regexp);
              flash.success = "Your pattern has been saved";
          });
      } 

      // init 

       // init socket.io
        socket.on('connect', function () {
              console.log('connect');
        });

      $scope.reqs = {}; //init
      $scope.getJobState= function(job_keys) {
          if ($scope.isIndexing == true) {
               $scope.reqs = $interval(function() {
                  // console.log("get job_key", job_keys);
                  socket.emit("job", job_keys)
              }, 2000);
          } 
      }

      $scope.endProcessing = function() {
          // $scope.dataset.index_state == "done";
          // $interval.cancel($scope.reqs);
          $timeout(function() {
                $location.path("/datasets/"+ $routeParams.datasetId + "/topograms/create");
            })
      }

      socket.on('job_progress', function (jobs_finished) {
          // console.log(jobs_finished)
          if (jobs_finished[0] && ! jobs_finished[1]) {
            flash.success = "Processing 1/2 : dataset is indexed";
          }
          else if (jobs_finished[0]  && jobs_finished[1]) {
            flash.success = "Processing 2/2 : dataset is processed.";
            $scope.endProcessing();
          }
      });





      // DATA processing 
      $scope.isIndexing = false;
      $scope.processData = function() {

            Restangular.one('datasets',$routeParams.datasetId).one("index").get().then(function(job_keys) {

                    // notify processing start 
                    flash.success = "Dataset "+$scope.dataset.filename+" is now indexing";
                    $scope.isIndexing = true;
                    $scope.dataset.index_state = 'processing';

                    // request jobs state at regular interval
                    $scope.getJobState(job_keys);

            }, function (error){
                console.log(error);
                flash.error = error.data;
            });
    }

}

//
// strftime
// github.com/samsonjs/strftime
// @_sjs
//
// Copyright 2010 - 2013 Sami Samhuri <sami@samhuri.net>
//
// MIT License
// http://sjs.mit-license.org
//

;(function() {

  //// Where to export the API
  var namespace;

  // CommonJS / Node module
  if (typeof module !== 'undefined') {
    namespace = module.exports = strftime;
  }

  // Browsers and other environments
  else {
    // Get the global object. Works in ES3, ES5, and ES5 strict mode.
    namespace = (function(){ return this || (1,eval)('this') }());
  }

  function words(s) { return (s || '').split(' '); }

  var DefaultLocale =
  { days: words('Sunday Monday Tuesday Wednesday Thursday Friday Saturday')
  , shortDays: words('Sun Mon Tue Wed Thu Fri Sat')
  , months: words('January February March April May June July August September October November December')
  , shortMonths: words('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec')
  , AM: 'AM'
  , PM: 'PM'
  , am: 'am'
  , pm: 'pm'
  };

  namespace.strftime = strftime;
  function strftime(fmt, d, locale) {
    return _strftime(fmt, d, locale);
  }

  // locale is optional
  namespace.strftimeTZ = strftime.strftimeTZ = strftimeTZ;
  function strftimeTZ(fmt, d, locale, timezone) {
    if ((typeof locale == 'number' || typeof locale == 'string') && timezone == null) {
      timezone = locale;
      locale = undefined;
    }
    return _strftime(fmt, d, locale, { timezone: timezone });
  }

  namespace.strftimeUTC = strftime.strftimeUTC = strftimeUTC;
  function strftimeUTC(fmt, d, locale) {
    return _strftime(fmt, d, locale, { utc: true });
  }

  namespace.localizedStrftime = strftime.localizedStrftime = localizedStrftime;
  function localizedStrftime(locale) {
    return function(fmt, d, options) {
      return strftime(fmt, d, locale, options);
    };
  }

  // d, locale, and options are optional, but you can't leave
  // holes in the argument list. If you pass options you have to pass
  // in all the preceding args as well.
  //
  // options:
  //   - locale   [object] an object with the same structure as DefaultLocale
  //   - timezone [number] timezone offset in minutes from GMT
  function _strftime(fmt, d, locale, options) {
    options = options || {};

    // d and locale are optional so check if d is really the locale
    if (d && !quacksLikeDate(d)) {
      locale = d;
      d = undefined;
    }
    d = d || new Date();

    locale = locale || DefaultLocale;
    locale.formats = locale.formats || {};

    // Hang on to this Unix timestamp because we might mess with it directly below.
    var timestamp = d.getTime();

    var tz = options.timezone;
    var tzType = typeof tz;

    if (options.utc || tzType == 'number' || tzType == 'string') {
      d = dateToUTC(d);
    }

    if (tz) {
      // ISO 8601 format timezone string, [-+]HHMM
      //
      // Convert to the number of minutes and it'll be applied to the date below.
      if (tzType == 'string') {
        var sign = tz[0] == '-' ? -1 : 1;
        var hours = parseInt(tz.slice(1, 3), 10);
        var mins = parseInt(tz.slice(3, 5), 10);
        tz = sign * ((60 * hours) + mins);
      }

      if (tzType) {
        d = new Date(d.getTime() + (tz * 60000));
      }
    }

    // Most of the specifiers supported by C's strftime, and some from Ruby.
    // Some other syntax extensions from Ruby are supported: %-, %_, and %0
    // to pad with nothing, space, or zero (respectively).
    return fmt.replace(/%([-_0]?.)/g, function(_, c) {
      var mod, padding;

      if (c.length == 2) {
        mod = c[0];
        // omit padding
        if (mod == '-') {
          padding = '';
        }
        // pad with space
        else if (mod == '_') {
          padding = ' ';
        }
        // pad with zero
        else if (mod == '0') {
          padding = '0';
        }
        else {
          // unrecognized, return the format
          return _;
        }
        c = c[1];
      }

      switch (c) {

        // Examples for new Date(0) in GMT

        // 'Thursday'
        case 'A': return locale.days[d.getDay()];

        // 'Thu'
        case 'a': return locale.shortDays[d.getDay()];

        // 'January'
        case 'B': return locale.months[d.getMonth()];

        // 'Jan'
        case 'b': return locale.shortMonths[d.getMonth()];

        // '19'
        case 'C': return pad(Math.floor(d.getFullYear() / 100), padding);

        // '01/01/70'
        case 'D': return _strftime(locale.formats.D || '%m/%d/%y', d, locale);

        // '01'
        case 'd': return pad(d.getDate(), padding);

        // '01'
        case 'e': return pad(d.getDate(), padding == null ? ' ' : padding);

        // '1970-01-01'
        case 'F': return _strftime(locale.formats.F || '%Y-%m-%d', d, locale);

        // '00'
        case 'H': return pad(d.getHours(), padding);

        // 'Jan'
        case 'h': return locale.shortMonths[d.getMonth()];

        // '12'
        case 'I': return pad(hours12(d), padding);

        // '000'
        case 'j':
          var y = new Date(d.getFullYear(), 0, 1);
          var day = Math.ceil((d.getTime() - y.getTime()) / (1000 * 60 * 60 * 24));
          return pad(day, 3);

        // ' 0'
        case 'k': return pad(d.getHours(), padding == null ? ' ' : padding);

        // '000'
        case 'L': return pad(Math.floor(timestamp % 1000), 3);

        // '12'
        case 'l': return pad(hours12(d), padding == null ? ' ' : padding);

        // '00'
        case 'M': return pad(d.getMinutes(), padding);

        // '01'
        case 'm': return pad(d.getMonth() + 1, padding);

        // '\n'
        case 'n': return '\n';

        // '1st'
        case 'o': return String(d.getDate()) + ordinal(d.getDate());

        // 'am'
        case 'P': return d.getHours() < 12 ? locale.am : locale.pm;

        // 'AM'
        case 'p': return d.getHours() < 12 ? locale.AM : locale.PM;

        // '00:00'
        case 'R': return _strftime(locale.formats.R || '%H:%M', d, locale);

        // '12:00:00 AM'
        case 'r': return _strftime(locale.formats.r || '%I:%M:%S %p', d, locale);

        // '00'
        case 'S': return pad(d.getSeconds(), padding);

        // '0'
        case 's': return Math.floor(timestamp / 1000);

        // '00:00:00'
        case 'T': return _strftime(locale.formats.T || '%H:%M:%S', d, locale);

        // '\t'
        case 't': return '\t';

        // '00'
        case 'U': return pad(weekNumber(d, 'sunday'), padding);

        // '4'
        case 'u':
          var day = d.getDay();
          return day == 0 ? 7 : day; // 1 - 7, Monday is first day of the week

        // ' 1-Jan-1970'
        case 'v': return _strftime(locale.formats.v || '%e-%b-%Y', d, locale);

        // '00'
        case 'W': return pad(weekNumber(d, 'monday'), padding);

        // '4'
        case 'w': return d.getDay(); // 0 - 6, Sunday is first day of the week

        // '1970'
        case 'Y': return d.getFullYear();

        // '70'
        case 'y':
          var y = String(d.getFullYear());
          return y.slice(y.length - 2);

        // 'GMT'
        case 'Z':
          if (options.utc) {
            return "GMT";
          }
          else {
            var tzString = d.toString().match(/\(([\w\s]+)\)/);
            return tzString && tzString[1] || '';
          }

        // '+0000'
        case 'z':
          if (options.utc) {
            return "+0000";
          }
          else {
            var off = typeof tz == 'number' ? tz : -d.getTimezoneOffset();
            return (off < 0 ? '-' : '+') + pad(Math.floor(Math.abs(off) / 60)) + pad(Math.abs(off) % 60);
          }

        default: return c;
      }
    });
  }

  function dateToUTC(d) {
    var msDelta = (d.getTimezoneOffset() || 0) * 60000;
    return new Date(d.getTime() + msDelta);
  }

  var RequiredDateMethods = ['getTime', 'getTimezoneOffset', 'getDay', 'getDate', 'getMonth', 'getFullYear', 'getYear', 'getHours', 'getMinutes', 'getSeconds'];
  function quacksLikeDate(x) {
    var i = 0
      , n = RequiredDateMethods.length
      ;
    for (i = 0; i < n; ++i) {
      if (typeof x[RequiredDateMethods[i]] != 'function') {
        return false;
      }
    }
    return true;
  }

  // Default padding is '0' and default length is 2, both are optional.
  function pad(n, padding, length) {
    // pad(n, <length>)
    if (typeof padding === 'number') {
      length = padding;
      padding = '0';
    }

    // Defaults handle pad(n) and pad(n, <padding>)
    if (padding == null) {
      padding = '0';
    }
    length = length || 2;

    var s = String(n);
    // padding may be an empty string, don't loop forever if it is
    if (padding) {
      while (s.length < length) s = padding + s;
    }
    return s;
  }

  function hours12(d) {
    var hour = d.getHours();
    if (hour == 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return hour;
  }

  // Get the ordinal suffix for a number: st, nd, rd, or th
  function ordinal(n) {
    var i = n % 10
      , ii = n % 100
      ;
    if ((ii >= 11 && ii <= 13) || i === 0 || i >= 4) {
      return 'th';
    }
    switch (i) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
    }
  }

  // firstWeekday: 'sunday' or 'monday', default is 'sunday'
  //
  // Pilfered & ported from Ruby's strftime implementation.
  function weekNumber(d, firstWeekday) {
    firstWeekday = firstWeekday || 'sunday';

    // This works by shifting the weekday back by one day if we
    // are treating Monday as the first day of the week.
    var wday = d.getDay();
    if (firstWeekday == 'monday') {
      if (wday == 0) // Sunday
        wday = 6;
      else
        wday--;
    }
    var firstDayOfYear = new Date(d.getFullYear(), 0, 1)
      , yday = (d - firstDayOfYear) / 86400000
      , weekNum = (yday + 7 - wday) / 7
      ;
    return Math.floor(weekNum);
  }

}());

function HomeDetailCtrl($scope, Restangular, flash) {
    // $scope.posts = Restangular.all('datasets').getList().$object;

    $scope.test = function() {

        // Publish a success flash
        flash.success = 'Do it live!';
    }
}

   /*
    console.log(Post.get());
    Post.getAll().then(function(bla){
        console.log(bla);
        console.log("posts");
    })

    Restangular.all('posts').getList().then(function(ha){
        console.log(ha);
    });

    $scope.add = function() {
        resource.post($scope.newVegetable).then(function(newResource){
                $scope.vegetables.push(newResource);
        })
    }
    */

// curl --dump-header - -H "Content-Type: application/json" -X POST -d '{"email": "johndoe@gmail.com","password": "admin"}' http://localhost:5000/api/v1/sessions

function SessionCreateCtrl($scope, $location, $timeout, AuthService, flash) {

    $scope.loginInfo = {};

    $scope.submitLoginForm = function () {
        // console.log($scope.loginInfo);
        // console.log(AuthService.login($scope.loginInfo));
        AuthService.login($scope.loginInfo).then(function(logInfo) {
            console.log(logInfo);
            $timeout(function() {
                $location.path("/");
                $scope.isLoggedIn = true;
                $scope.$apply();
            })

        }, function(err) {
            console.log(err);
            flash.error = "Login failed : ("+ err.status+") "+ err.statusText;
        });
    }
}

function SessionDestroyCtrl($scope, $timeout, $location, flash, AuthService) {

    $scope.doLogout = function () {
        AuthService.logout();
        $timeout(function() {
            console.log('test');
            $location.path("/");
            flash.success = "You have been logged out successfully."
        });
    }
}

function TopogramCreateCtrl($scope, $routeParams, $location, Restangular, flash, socket, $timeout, $interval) {

    // Initialize the scope defaults.
    $scope.topogram = {};
    $scope.topogram.stopwords = [];
    $scope.topogram.excludeWords = [];
    $scope.topogram.includeWords = [];

    // $scope.messages = [];
    // $scope.rows = [];     // An array of messages results to display
    // $scope.page = 0;        // A counter to keep track of our current page
    // $scope.allResults = false;  // Whether or not all results have been found.
    // $scope.totalResults=0 // All messages matching the query

    $scope.columns = [{"title": "Text", 'field': "text_column"}, {"title": "Creation Date", 'field': "time_column"},{"title": "Author", 'field': "source_column"} ]; 

    // max size for networks
    $scope.topogram.citations_limit=5;

    // load dataset info from DB
    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
          $scope.dataset = dataset;
          $scope.index = dataset.index_name;
          $scope.dataset.filename =  dataset.filepath.replace(/^.*[\\\/]/, ''); // extract just file name
          // console.log(dataset);

          // additional columns
          if(dataset.additional_columns) {
            var addCol = dataset.additional_columns.split(",")
            for (i in addCol) {
              $scope.columns.push({ "title": addCol[i] ,"field": addCol[i]});
            }
          }

          // load data
          Restangular.one('datasets',$routeParams.datasetId).one("size").get().then(function(datasetSize) {
                // console.log($scope.dataset);
                $scope.dataset.size = datasetSize.count;
                // load number of posts to estimate the size of the graph 
                $scope.topogram.words_limit = Math.round(datasetSize.count / 25); // for now, arbitrary value 
          });
    });


        // init socket.io
        socket.on('connect', function () {
              console.log('connect');
        });

        socket.on('progress', function (data) {
            console.log(data);
            // var d=JSON.parse(data)
            // console.log(typeof(data), typeof(d));
            // $scope.loadingNetworks=JSON.parse(data);
        });
      

      $scope.recordOffset = 0;
      $scope.recordStep = 100;
      
      $scope.getRecords = function(start,qty) {
          Restangular.one('datasets',$routeParams.datasetId).one("from", $scope.recordOffset).one("qty",$scope.recordStep ).get().then(function(datasample) {
              var data = JSON.parse( JSON.parse(datasample));
              // console.log(data);
              $scope.messages = data;
          });
        }

      $scope.getNextRecords =function() {
        if ($scope.recordOffset + $scope.recordStep >  $scope.dataset.size) return
        $scope.recordOffset = $scope.recordOffset + $scope.recordStep ;
        $scope.getRecords($scope.recordStart, $scope.recordQty);
      }

      $scope.getPrevRecords =function() {
        if( $scope.recordOffset - $scope.recordStep < 0) return
        $scope.recordOffset = $scope.recordOffset - $scope.recordStep ;
        $scope.getRecords($scope.recordStart, $scope.recordQty);
      }

      $scope.getRecords(0, $scope.recordQty); // init

      // most frequent words 
      $scope.topogram.frequent_words_limit = 50;
      $scope.getMostFrequentWords = function() {
          Restangular.one('datasets',$routeParams.datasetId).one("frequentWords").one(String($scope.topogram.frequent_words_limit)).get().then(function(frequentWords) {
                // console.log(frequentWords);
                $scope.frequentWords = frequentWords;
          });
      }

    // word graph
    $scope.topogram.words_limit = 0;
    $scope.wordsGraphLoading = false;

    
    $scope.getWordsGraph = function() {
        $scope.wordsGraphLoading = true; // display loader
        $scope.wordsGraphTooBig = false;
        
        // require graph to server
        var data = { "dataset": $scope.dataset , "words_limit" : $scope.topogram.words_limit  }
        console.log(data);

         Restangular.one('datasets',$routeParams.datasetId).one("words").one(String($scope.topogram.words_limit)).get().then(function(wordsGraph) {
            if (wordsGraph.top_words.length > 250) {
              $scope.wordsGraphTooBig = true;
              $scope.wordsGraphLoading = false;

            } else {
              $scope.wordsGraph=wordsGraph;
              $scope.wordsForceStarted = true;
              console.log($scope.wordsGraph);
              $scope.wordsGraphLoading = false;
            }
            
        });
        
    }

    

       



    // time series
    $scope.getTimeSeries = function() {
        Restangular.one('datasets',$routeParams.datasetId).one("timeSeries").get().then(function(timeSeries) {
            console.log(timeSeries);
            $scope.start=timeSeries[0].time;
            $scope.end=timeSeries[timeSeries.length-1].time;
            $scope.timeData = timeSeries.map(function(d){
                return { "count" : d.count, "time" : new Date(d.time*1000)};
            });
        });
    }

    /*
    STOPWORDS
    */

    // stopwords
    $scope.addWord =function() {
          if($scope.addedStopWord){
            // console.log($scope.addedStopWord);
            $scope.topogram.stopwords.push(this.addedStopWord);
            $scope.addedStopWord= '';
          }
    }

    /* SAVE IMAGES */
    $('body').keydown(function (e) {
          if(e.which==87 && e.shiftKey==true) $scope.saveWords() // W
          else if (e.which==71 && e.shiftKey==true) $scope.saveMap() // G
          else if (e.which==67 && e.shiftKey==true) $scope.saveUsers() //C
          else if (e.which==84 && e.shiftKey==true) $scope.saveTimeSeries()
          else if (e.which==65 && e.shiftKey==true) $scope.saveAll()
    });

    $scope.saveTimeSeries = function(){
      var fn="time_"+$scope.dataset.title;
      $scope.downloadPNG($("#timeseries  svg")[0], fn);
      // var sv=new Simg($("#timeseries  svg")[0]);
      // sv.download();
    }

    $scope.saveWords = function(){
      var name ="words_"+$scope.dataset.title;
      $scope.downloadPNG($(".words-container svg")[0], name);
       // var sv=new Simg($(".words-container svg")[0]);
       // sv.download();
    }

    $scope.downloadPNG=function(container, name) {

        var sv=new Simg(container);
        // console.log(sv);
        // sv.download();
        // sv.downloadWithName(name);

        // rewrite download function
         sv.toImg(function(img){
           var a = document.createElement("a");
           a.download = name+".png";
           a.href = img.getAttribute('src');
           a.click();
         });

    } // end controller

    $scope.downloadAsCSV = function(dataObject, filename) {
        // remove angular verbose stuff
        var cleanObject = dataObject.map(function(d) { delete d["$$hashKey"] ; return d})
        // convert to csv dialect
        var csv = ConvertToCSV( cleanObject);
        // download as file
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:attachment/csv,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = filename+'.csv';
        hiddenElement.click();
    }

     function ConvertToCSV(objArray) {
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
            var str = '';

            for (var i = 0; i < array.length; i++) {
                var line = '';
            for (var index in array[i]) {
                if (line != '') line += ','

                line += array[i][index];
            }

            str += line + '\r\n';
        }

        return str;
    }

    /*
    $scope.saveTopogram = function () {

      $scope.topogram.dataset_id = $routeParams.datasetId;
      $scope.topogram.es_query = $scope.searchTerm;
      $scope.topogram.es_index_name = $scope.index;
      $scope.topogram.stopwords = $scope.topogram.stopwords.toString();

      console.log($scope.topogram);

      Restangular.all('topograms').post($scope.topogram).then(function(topogram) {
            $timeout(function() {
                $location.path("/datasets/"+ $routeParams.datasetId + "/topograms/" + topogram.id);
            })
            flash.success = "New topogram created !"

      }, function (error){
          console.log(error);
          flash.error = error.data;
      });

    };
    */


    /*
    PROGRESS BAR
    */
     // var stopLoader;
     // $scope.readyToSave = false;
     // $scope.loadingNetworks = {};
     // $scope.loadingNetworks.percent= 0;

    // init socket.io
    /*
    socket.on('connect', function () {
          console.log('connect');
    });

    socket.on('progress', function (data) {
        console.log(data);
        // var d=JSON.parse(data)
        // console.log(typeof(data), typeof(d));
        // $scope.loadingNetworks=JSON.parse(data);
    });
  */
     // $scope.$watch("loadingNetworks", function(newVal, oldVal){

     //      console.log("loadingNetworks", newVal);

     //      if(newVal !=oldVal && newVal==1) {
     //          stopLoader=$interval( function  () {
     //            console.log("loadingNetworks started");
     //            socket.emit('progress', {"index_name": $scope.index});
     //          }, 200)

     //      } else if(newVal !=oldVal && newVal==100){
     //          $interval.cancel(stopLoader);
     //          stopLoader = undefined;
     //          console.log("done");

     //      }
     // });


    /* 
    $scope.saveTopogram = function () {
      console.log($scope);

      var topogram = {
        "es_query" : $scope.searchTerm,
        "es_index_name" : $scope.index,
        "description" : $scope.description,
        "dataset_id" : $routeParams.datasetId,
        "topotype_id" : $scope.dataset.topotype_id
        // ,
        // "words"     : JSON.stringify($scope.words),
        // "citations" : JSON.stringify($scope.citations) 
      };
      console.log($scope.words, $scope.citations);

      Restangular.all('topograms').post(topogram).then(function(topogram) {
        flash.success = "New topogram created !"
        $location.path("/datasets/"+$routeParams.datasetId+"/topograms/"+topogram.id);
      });
    }

        $scope.processData = function() {
          var topoInfo = {
            "es_query" : $scope.providerhTerm,
            "es_index_name" : $scope.index,
            "dataset_id" : $routeParams.datasetId,
            "topotype_id" : $scope.dataset.topotype_id,
            "citations_limit" : 50,
            "words_limit" : 50
          };

          // process data if any results
          if (results.total !=0) { 
              $scope.loadingNetworks.percent = 1;
              
              Restangular.all('topograms').all('networks').post(topoInfo).then(function(topogram) {

                $scope.loadingNetworks.current = results.total;
                $scope.loadingNetworks.percent = 100;

                $scope.readyToSave = true;

                console.log("all data is ok ! ");
                
                // words
                if (topogram.words.index.length !=0) {
                  $scope.words=topogram.words;
                  if(data.words.index!=undefined) $scope.wordsLength=topogram.words.index.length;
                  $scope.wordForceStarted = true;
                }
                
                // citations
                console.log(topogram);
                if (topogram.citations.index.length !=0) {

                  $scope.showCommunities=false; // show provinces clustering or communities

                  $scope.citations=topogram.citations;
                  if(topogram.citations.index!=undefined) $scope.citationsLength=topogram.citations.index.length;
                  $scope.wordForceStarted = true;
                }
              });
          }
    } */

} // end controller

function TopogramIndexCtrl($scope, $routeParams, $timeout, $location, Restangular) {

    $scope.topograms = Restangular.all('topograms').getList().$object;

    
    $scope.delete = function(topogram) {
        console.log($scope.topograms);
        topogram.remove().then(function() {
            $timeout(function() {
                $location.path("/topograms");
            })
            $scope.posts = _.without($scope.topograms, topogram);
        });
    }
}

function TopogramViewCtrl($scope, $routeParams, $timeout, $location, Restangular, searchService, TopogramService, ConfigService, ngTableParams,  $filter) {


    // INIT
    $scope.messages = [];
    $scope.allResults = true;  // Whether or not all results have been found.

    $scope.tableParams = new ngTableParams({
          page: 1,            // show first page
          count: 100,          // count per page
          sorting: {
              name: 'asc'     // initial sorting
          }
      }, {
          total: $scope.messages.length, // length of data
          getData: function($defer, params) {

                var orderedData = params.sorting() ? $filter('orderBy')($scope.messages, params.orderBy()) :
                            $scope.messages;

                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
      });

    // some stats for the brave
    $scope.stats = {}; 
    $scope.stats.addCols = []; //  an array to store info about additional columns


    // load topogram
    Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).get().then(function(topogram) {

            $scope.topogram = topogram;
            $scope.dataset = topogram.dataset;

            $scope.columns = [
              {"title": "Text", 'field': "text_column"}, 
              {"title": "Creation Date", 'field': "time_column"},
              {"title": "Author", 'field': "source_column"} 
            ]; 

            // additional columns
            if(topogram.dataset.additional_columns) {
              var addCol = topogram.dataset.additional_columns.split(",")
              for (i in addCol) {
                $scope.columns.push({ "title": addCol[i] ,"field": i });
                $scope.stats.addCols[i] = { "name" : addCol[i], "countNotNull" : 0, "total" : 0};
              }
            }

            // SEARCH RESULTS
            searchService.search($scope.topogram.es_index_name, $scope.topogram.es_query).then(function(results){

              $scope.totalResults=results.total;

              if(results.histogram.length){
                    $scope.start=results.histogram[0].time;
                    $scope.end=results.histogram[results.histogram.length-1].time;
                    $scope.timeData=results.histogram;
                }

              searchService.loadAll($scope.index, $scope.searchTerm, results.total).then(function(results){

                  // TODO : improve fallback to bypass sorting with non latin characters 
                  if(topogram.dataset.additional_columns) {
                      $scope.messages = [];

                      var addCol = topogram.dataset.additional_columns.split(",")
                      for (var i = 0; i < results.messages.length; i++) {
                            var m = results.messages[i];
                            for (var j = 0; j < addCol.length; j++) {
                              var value; 
                              try {
                                  value = parseInt(m[addCol[j]]) // TODO : fix nasty Int parsing
                                  if(value != 0) {
                                    $scope.stats.addCols[j].countNotNull++;
                                    $scope.stats.addCols[j].total+=value;
                                  };

                              } catch(e) {
                                value = m[addCol[j]];
                              }
                              m[j] = value; // rename columns to latin 
                            }
                            $scope.messages.push(m);
                      };

                      // extract percent
                      for (var i = 0; i < $scope.stats.addCols.length; i++) {
                        $scope.stats.addCols[i].percentNotNull = ($scope.stats.addCols[i].countNotNull / $scope.totalResults)*100;
                      }
                      console.log($scope.stats);
                 } else {
                      $scope.messages = results.messages;
                  }

                  // get some stats

              }); // end searchAll
          })
      });


    $scope.wordsLimit = 10;
    $scope.citationsLimit = 10;

    $scope.wordsListStart = 0;
    $scope.wordsListEnd = 10;

      $scope.nextTopWords = function() {
        if ($scope.wordsListStart + 10 < $scope.words.top_words.length  ){
          $scope.wordsListStart +=10;
          $scope.wordsListEnd +=10;
        }
      }

      $scope.prevTopWords = function() {
        if ($scope.wordsListStart -10 >=  0){
                  $scope.wordsListStart -=10;
                  $scope.wordsListEnd -=10;
        }
      }

    // WORDS 
    $scope.wordColors = d3.scale.category10();

    Restangular.one('topograms',$routeParams.topogramId).one('words', $scope.wordsLimit).get().then(function(words) {
        console.log(words);
        $scope.words=words;
        $scope.wordsForceStarted = true;
    });

    // CITATIONS 
    Restangular.one('topograms',$routeParams.topogramId).one('citations', $scope.citationsLimit).get().then(function(citations) {
        console.log(citations);
        $scope.citations=citations;
        $scope.citationsForceStarted = true;
    });

    /**
    * Load the next page of results, incrementing the page counter.
    * When query is finished, push results onto $scope.recipes and decide
    * whether all results have been returned (i.e. were 10 results returned?)
    */

    $scope.loadMore = function(){
      searchService
      .loadMore($scope.index, $scope.searchTerm, $scope.page++).then(function(results){
        if(results.messages.length !== 10){
          $scope.allResults = true;
        }

        var ii = 0;
        for(;ii < results.messages.length; ii++){
          $scope.messages.push(results.messages[ii]);
        }
      })
    };


           /*
              // words
              $scope.words=topogram.words;
              if(data.words.index!=undefined) $scope.wordsLength=topogram.words.index.length;
              $scope.wordForceStarted = true;

              // citations
              $scope.showCommunities=false; // show provinces clustering or communities

              $scope.citations=data.citations;
              if(data.citations.index!=undefined) $scope.citationsLength=data.citations.index.length;
              $scope.wordForceStarted = true;

            */



$('body').keydown(function (e) {
      if(e.which==87 && e.shiftKey==true) $scope.saveWords() // W
      else if (e.which==71 && e.shiftKey==true) $scope.saveMap() // G
      else if (e.which==67 && e.shiftKey==true) $scope.saveUsers() //C
      else if (e.which==84 && e.shiftKey==true) $scope.saveTime()
      else if (e.which==65 && e.shiftKey==true) $scope.saveAll()
});

$scope.downloadAsCSV = function() {
    var csv = ConvertToCSV($scope.messages);
    // console.log(csv);

    var hiddenElement = document.createElement('a');

    hiddenElement.href = 'data:attachment/csv,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'results.csv';
    hiddenElement.click();
}

$scope.saveAll = function () {
  $scope.saveTimeSeries();
  $scope.saveWords();
  // $scope.saveMap();
  $scope.saveUsers();
}

$scope.saveTimeSeries = function(){
  console.log('saveTimeSeries');
  var sv=new Simg($("#timeseries  svg")[0]);
  // var fn="time_"+$scope.dataset.title;
  sv.download();
}

$scope.saveWords = function(){
  var name ="words_"+$scope.dataset.title +"_"+$scope.searchTerm;
  // $scope.downloadPNG($(".words-container svg")[0], name);
     var sv=new Simg($(".words-container svg")[0]);
     // console.log(sv);
     sv.download();
}

$scope.saveUsers = function(){
  var name ="users_"+$scope.dataset.title +"_"+$scope.searchTerm;
  $scope.downloadPNG($(".user-container svg")[0], name);
}

$scope.downloadPNG=function(container, name) {

    var sv=new Simg(container);
    // console.log(sv);
    // sv.download();
    // sv.downloadWithName(name);

    // rewrite download function
     sv.toImg(function(img){
       var a = document.createElement("a");
       a.download = name+".png";
       a.href = img.getAttribute('src');
       a.click();
     });
} // end controller


    $scope.downloadAsCSV = function() {
        var csv = ConvertToCSV($scope.messages);
        // console.log(csv);

        var hiddenElement = document.createElement('a');

        hiddenElement.href = 'data:attachment/csv,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'results.csv';
        hiddenElement.click();
    }
 function ConvertToCSV(objArray) {
        var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        var str = '';

        for (var i = 0; i < array.length; i++) {
            var line = '';
        for (var index in array[i]) {
            if (line != '') line += ','

            line += array[i][index];
        }

        str += line + '\r\n';
    }

    return str;
}


    /*Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).get().then(function(topogram) {
        console.log(topogram);
        $scope.topogram = topogram;
        $scope.topogramName= topogram.dataset.title;
    });

    Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).getList("timeframes").then(function(timeframes) {
            $scope.timeframes = timeframes;

            // x1000 for JS ts
            $scope.timeSeriesData = timeframes;
            $scope.timeSeriesData.map(function(d){ d.timestamp=d.timestamp*1000});

            $scope.timeMax=$scope.timeSeriesData.length;
            $scope.start=$scope.timeSeriesData[0].timestamp;
            $scope.end=$scope.timeSeriesData[timeframes.length-1].timestamp;

            $scope.updateTimeData();

        });

    $scope.updateTimeData=function () {
        $scope.timeSeriesData.forEach(function(d) {
            if(d.timestamp>$scope.start && d.timestamp<$scope.end) d.selected=true
                else d.selected=false
                    d.time=new Date(d.timestamp);
            });
    }

    $scope.stop = function(){
        $timeout.cancel($scope.playFrame);
    }

    var i,step,frames;

    $scope.playAll=function (){
        step=10,
        i=step, 
        frames=$scope.timeSeriesData.length/step;
        $timeout($scope.playFrame,100);
    }

    $scope.playFrame=function() {

        var t0=$scope.timeSeriesData[i-step].timestamp;
        var t1=$scope.timeSeriesData[i].timestamp;

        $scope.end=t1;
        console.log(t0,t1);

        i+=step;
        $timeout($scope.playFrame,100)
    }

    // // monitor time changes
    $scope.$watch('start', function(newStart, oldVal) {
        if (newStart!=undefined) {
              $scope.start=newStart; 
              $scope.updateTimeData();
              ConfigService.start = newStart
              $scope.updateData();
        }
    })

    $scope.$watch('end', function(newEnd, oldVal) {
        if (newEnd!=undefined) {
          $scope.end=newEnd; 
          $scope.updateTimeData();
          ConfigService.end = newEnd;
          $scope.updateData();
        }
    })

    $scope.updateData=function () {

        if($scope.start!=undefined && $scope.end!=undefined && ($scope.prevStart!=$scope.start || $scope.prevEnd!=$scope.end)) {

            Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).one("timeframes", $scope.start/1000).getList($scope.end/1000).then(function(data) {

                data=data[0];

                // TopogramService.citations.nodes=data.citations.nodes;
                // TopogramService.citations.edges=data.citations.edges;
                // TopogramService.citations.index=data.citations.index;
                // TopogramService.words.nodes=data.words.nodes;
                // TopogramService.words.edges=data.words.edges;
                // TopogramService.words.index=data.words.index;

                // words
                $scope.words=data.words;
                if(data.words.index!=undefined) $scope.wordsLength=data.words.index.length;
                $scope.wordForceStarted = true;

                // citations
                $scope.showCommunities=false; // show provinces clustering or communities

                $scope.citations=data.citations;
                if(data.citations.index!=undefined) $scope.citationsLength=data.citations.index.length;
                $scope.wordForceStarted = true;

                $scope.citationForceStarted=true;
            });

        }

    }

    $scope.saveWords=function(){
        var fn="words_"+config.getFilename()
        var sv=new Simg($(".words-container svg")[0]);
        sv.download(fn);
    }
*/
}

// curl --dump-header - -H "Content-Type: application/json" -X POST -d '{"email": "johndoe@gmail.com","password": "admin"}' http://localhost:5000/api/v1/users

function UserCreateCtrl($scope, $location, flash, Restangular) {

    $scope.loginInfo = {};

    $scope.submitRegisterForm = function () {
        // console.log($scope.loginInfo);
        Restangular.all('users').post($scope.loginInfo).then(function(resp) {
            // console.log(resp);
            $location.path("/");
            flash.success = "Thanks! You have been succesfully registered.";
        }, function(response) {
            console.log(response);
            flash.error =  response.data;
        });
    }
}

Topogram.factory('Dataset', ["Restangular", function(Restangular) {
    var Dataset;
    Dataset = {
        get: function() {
            return Restangular
                .one('datasets')
                .getList();
        },
        getAll: function() {
             return Restangular
             .all('datasets')
             .getList();
        },
        create: function(data) {
            return Restangular
                .one('datasets')
                .customPOST(data);
        }
    };
    return Dataset;
}])

Topogram.factory('Session', ["Restangular", function(Restangular) {
    var Session;
    Session = {
        create: function(data, bypassErrorInterceptor) {
            return Restangular
                .one('sessions')
                .withHttpConfig({bypassErrorInterceptor: bypassErrorInterceptor})
                .customPOST(data);
        },
        destroy : function(data) {
            // console.log('closing session');
            return Restangular
                .one('sessions')
                .remove()
        }
    };
    return Session;
}])

Topogram.factory('User', ["Restangular", function(Restangular) {
    var User;
    User = {
        create: function(user) {
            return Restangular
                .one('users')
                .customPOST(user);
        }
    };
    return User;
}])

Topogram.service('AuthService', AuthService = function($q, localStorageService, Session) {
 
    this.login = function(credentials) {
        var me = this;
        deferred = $q.defer()
        Session.create(credentials, true).then(function(user) {
            me.setToken(credentials);
            return deferred.resolve(user);
        }, function(response) {
            switch (response.status) {
                case 401:
                    return deferred.reject(false);
                case 422:
                    return deferred.reject({status: 422, statusText:"Wrong password or email"});
                default:
                    // throw new Error('No handler for status code ' + response.status);
                    return deferred.reject(response)
            }
            return deferred.reject(response)
        });
        return deferred.promise
    };
 
    this.logout = function() {
        Session.destroy();
        localStorageService.clearAll();
    };
 
    this.isAuthenticated = function() {
        var token = this.getToken();

        if (token) {
            return true
        }
        return false;
    };
 
    this.setToken = function(credentials) {
        localStorageService.set('token', btoa(credentials.email + ':' + credentials.password));
    };
 
    this.getToken = function() {
        // console.log(localStorageService.get('token'));
        return localStorageService.get('token');
    };
 
    return this;
})

Topogram.factory('ConfigService', ["$window", function($window) {
    return {
        "start" :  0,
        "end" : 0
    }
}]);

Topogram.service('modalService', 
                 ['$modal', '$modalStack',  function($modal, $modalStack) {

        var modalDefaults = {
            backdrop: true,
            keyboard: true,
            modalFade: true,
            templateUrl: '/modal.html'
        };

        var modalOptions = {
            closeButtonText: 'Close',
            actionButtonText: 'OK',
            headerText: 'Proceed?',
            bodyText: 'Perform this action?',
            waitModal : false
        };

        this.showModal = function (customModalDefaults, customModalOptions) {
            if (!customModalDefaults) customModalDefaults = {};
            customModalDefaults.backdrop = 'static';
            return this.show(customModalDefaults, customModalOptions);
        };

        this.show = function (customModalDefaults, customModalOptions) {
            //Create temp objects to work with since we're in a singleton service
            var tempModalDefaults = {};
            var tempModalOptions = {};

            //Map angular-ui modal custom defaults to modal defaults defined in service
            angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

            //Map modal.html $scope custom properties to defaults defined in service
            angular.extend(tempModalOptions, modalOptions, customModalOptions);

            if (!tempModalDefaults.controller) {
                tempModalDefaults.controller = function ($scope, $modalInstance) {
                    $scope.modalOptions = tempModalOptions;
                    $scope.modalOptions.ok = function (result) {
                        $modalInstance.close(result);
                    };
                    $scope.modalOptions.close = function (result) {
                        $modalInstance.dismiss('cancel');
                    };
                }
            }

            return $modal.open(tempModalDefaults).result;
        };

         this.closeAll = function() {
            $modalStack. dismissAll();
         }

    }]);

/**
 * Create a service to power calls to Elasticsearch. We only need to
 * use the search endpoint.
 */
Topogram.factory('searchService',
    ['$q', 'esFactory', '$location', function($q, elasticsearch, $location){
        var client = elasticsearch({
            host: $location.host() + ":9200"
        });

        /*
        * Given an index,a term, give count and results.
        *
        * Returns a promise.
        */
        var search = function(index,term) {
          console.log(index, term);

          var deferred = $q.defer();
          client.search({
            // explain: true,
            version:true,
            // stats :
            q: term,
            size:10,
            index:index,
            type : 'message'
            ,
            body: {
                "facets" : {
                    "histogram" : {
                        "date_histogram" : {
                            "field" : "time_column",
                            "interval" : "hour"
                        }
                    }
                }
            }
          }
          ).then(function (result) {
            console.log(result);
              var ii = 0, hits_in, hits_out = [];
                hits_in = (result.hits || {}).hits || [];
                for(;ii < hits_in.length; ii++){
                    hits_out.push(hits_in[ii]._source);
                }
                deferred.resolve({
                  "messages":hits_out,
                  "total":result.hits.total ,
                  "histogram":result.facets.histogram.entries
                });
          }, deferred.reject);
          return deferred.promise;
        }

        /**
         * Given an index, a term and an offset, load another round of 10 results.
         *
         * Returns a promise.
         */
        var loadMore = function(index, term, offset){
            var deferred = $q.defer();
            var query = {
                "match": {
                    "_all": term
                }
            };

            client.search({
                "index": index,
                "type": 'message',
                q: term,
                "body": {
                    "size": 10,
                    "from": (offset || 0) * 10
                }
            }).then(function(result) {
                console.log(result);
                var ii = 0, hits_in, hits_out = [];
                hits_in = (result.hits || {}).hits || [];
                for(;ii < hits_in.length; ii++){
                    hits_out.push(hits_in[ii]._source);
                }

                deferred.resolve({
                  "messages":hits_out,
                  "total":result.hits.total
                });

            }, deferred.reject);
            return deferred.promise;
        };

         /**
         * Given an index, a term and an max number, load all results.
         *
         * Returns a promise.
         */
        var loadAll = function(index, term, max){
            var deferred = $q.defer();
            var query = {
                "match": {
                    "_all": term
                }
            };

            client.search({
                "index": index,
                "type": 'message',
                q: term,
                "body": {
                    "size": max,
                    "from": 0
                }
            }).then(function(result) {
                console.log(result);
                var ii = 0, hits_in, hits_out = [];
                hits_in = (result.hits || {}).hits || [];
                for(;ii < hits_in.length; ii++){
                    hits_out.push(hits_in[ii]._source);
                }

                deferred.resolve({
                  "messages":hits_out,
                  "total":result.hits.total
                });

            }, deferred.reject);
            return deferred.promise;
        };

        /**
         * Given nothing.
         *
         * Returns a list of indices.
         */
        var indexes = function(callback){
          var deferred = $q.defer();

          client.indices.getAliases(function(err,resp) {
            if (err) {
                console.log(err);
                return err;
            } else {
              var indices=[];
              for(var index in resp){
                   indices.push(index);
              }
              callback(indices);
            }
          });
        }

        return {
            "search": search,
            "loadMore": loadMore,
            "loadAll": loadAll,
            "indexes" :indexes

        };
    }]
);

Topogram.factory('socket', ["$rootScope", function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
}]);

Topogram.factory('StrfrtimeService', function() {
    return {
        "start" : function convertToDate(dateFormat){
            return strftime(dateFormat);
        }
    }
});


//
// strftime
// github.com/samsonjs/strftime
// @_sjs
//
// Copyright 2010 - 2013 Sami Samhuri <sami@samhuri.net>
//
// MIT License
// http://sjs.mit-license.org
//

;(function() {

  //// Where to export the API
  var namespace;

  // CommonJS / Node module
  if (typeof module !== 'undefined') {
    namespace = module.exports = strftime;
  }

  // Browsers and other environments
  else {
    // Get the global object. Works in ES3, ES5, and ES5 strict mode.
    namespace = (function(){ return this || (1,eval)('this') }());
  }

  function words(s) { return (s || '').split(' '); }

  var DefaultLocale =
  { days: words('Sunday Monday Tuesday Wednesday Thursday Friday Saturday')
  , shortDays: words('Sun Mon Tue Wed Thu Fri Sat')
  , months: words('January February March April May June July August September October November December')
  , shortMonths: words('Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec')
  , AM: 'AM'
  , PM: 'PM'
  , am: 'am'
  , pm: 'pm'
  };

  namespace.strftime = strftime;
  function strftime(fmt, d, locale) {
    return _strftime(fmt, d, locale);
  }

  // locale is optional
  namespace.strftimeTZ = strftime.strftimeTZ = strftimeTZ;
  function strftimeTZ(fmt, d, locale, timezone) {
    if ((typeof locale == 'number' || typeof locale == 'string') && timezone == null) {
      timezone = locale;
      locale = undefined;
    }
    return _strftime(fmt, d, locale, { timezone: timezone });
  }

  namespace.strftimeUTC = strftime.strftimeUTC = strftimeUTC;
  function strftimeUTC(fmt, d, locale) {
    return _strftime(fmt, d, locale, { utc: true });
  }

  namespace.localizedStrftime = strftime.localizedStrftime = localizedStrftime;
  function localizedStrftime(locale) {
    return function(fmt, d, options) {
      return strftime(fmt, d, locale, options);
    };
  }

  // d, locale, and options are optional, but you can't leave
  // holes in the argument list. If you pass options you have to pass
  // in all the preceding args as well.
  //
  // options:
  //   - locale   [object] an object with the same structure as DefaultLocale
  //   - timezone [number] timezone offset in minutes from GMT
  function _strftime(fmt, d, locale, options) {
    options = options || {};

    // d and locale are optional so check if d is really the locale
    if (d && !quacksLikeDate(d)) {
      locale = d;
      d = undefined;
    }
    d = d || new Date();

    locale = locale || DefaultLocale;
    locale.formats = locale.formats || {};

    // Hang on to this Unix timestamp because we might mess with it directly below.
    var timestamp = d.getTime();

    var tz = options.timezone;
    var tzType = typeof tz;

    if (options.utc || tzType == 'number' || tzType == 'string') {
      d = dateToUTC(d);
    }

    if (tz) {
      // ISO 8601 format timezone string, [-+]HHMM
      //
      // Convert to the number of minutes and it'll be applied to the date below.
      if (tzType == 'string') {
        var sign = tz[0] == '-' ? -1 : 1;
        var hours = parseInt(tz.slice(1, 3), 10);
        var mins = parseInt(tz.slice(3, 5), 10);
        tz = sign * ((60 * hours) + mins);
      }

      if (tzType) {
        d = new Date(d.getTime() + (tz * 60000));
      }
    }

    // Most of the specifiers supported by C's strftime, and some from Ruby.
    // Some other syntax extensions from Ruby are supported: %-, %_, and %0
    // to pad with nothing, space, or zero (respectively).
    return fmt.replace(/%([-_0]?.)/g, function(_, c) {
      var mod, padding;

      if (c.length == 2) {
        mod = c[0];
        // omit padding
        if (mod == '-') {
          padding = '';
        }
        // pad with space
        else if (mod == '_') {
          padding = ' ';
        }
        // pad with zero
        else if (mod == '0') {
          padding = '0';
        }
        else {
          // unrecognized, return the format
          return _;
        }
        c = c[1];
      }

      switch (c) {

        // Examples for new Date(0) in GMT

        // 'Thursday'
        case 'A': return locale.days[d.getDay()];

        // 'Thu'
        case 'a': return locale.shortDays[d.getDay()];

        // 'January'
        case 'B': return locale.months[d.getMonth()];

        // 'Jan'
        case 'b': return locale.shortMonths[d.getMonth()];

        // '19'
        case 'C': return pad(Math.floor(d.getFullYear() / 100), padding);

        // '01/01/70'
        case 'D': return _strftime(locale.formats.D || '%m/%d/%y', d, locale);

        // '01'
        case 'd': return pad(d.getDate(), padding);

        // '01'
        case 'e': return pad(d.getDate(), padding == null ? ' ' : padding);

        // '1970-01-01'
        case 'F': return _strftime(locale.formats.F || '%Y-%m-%d', d, locale);

        // '00'
        case 'H': return pad(d.getHours(), padding);

        // 'Jan'
        case 'h': return locale.shortMonths[d.getMonth()];

        // '12'
        case 'I': return pad(hours12(d), padding);

        // '000'
        case 'j':
          var y = new Date(d.getFullYear(), 0, 1);
          var day = Math.ceil((d.getTime() - y.getTime()) / (1000 * 60 * 60 * 24));
          return pad(day, 3);

        // ' 0'
        case 'k': return pad(d.getHours(), padding == null ? ' ' : padding);

        // '000'
        case 'L': return pad(Math.floor(timestamp % 1000), 3);

        // '12'
        case 'l': return pad(hours12(d), padding == null ? ' ' : padding);

        // '00'
        case 'M': return pad(d.getMinutes(), padding);

        // '01'
        case 'm': return pad(d.getMonth() + 1, padding);

        // '\n'
        case 'n': return '\n';

        // '1st'
        case 'o': return String(d.getDate()) + ordinal(d.getDate());

        // 'am'
        case 'P': return d.getHours() < 12 ? locale.am : locale.pm;

        // 'AM'
        case 'p': return d.getHours() < 12 ? locale.AM : locale.PM;

        // '00:00'
        case 'R': return _strftime(locale.formats.R || '%H:%M', d, locale);

        // '12:00:00 AM'
        case 'r': return _strftime(locale.formats.r || '%I:%M:%S %p', d, locale);

        // '00'
        case 'S': return pad(d.getSeconds(), padding);

        // '0'
        case 's': return Math.floor(timestamp / 1000);

        // '00:00:00'
        case 'T': return _strftime(locale.formats.T || '%H:%M:%S', d, locale);

        // '\t'
        case 't': return '\t';

        // '00'
        case 'U': return pad(weekNumber(d, 'sunday'), padding);

        // '4'
        case 'u':
          var day = d.getDay();
          return day == 0 ? 7 : day; // 1 - 7, Monday is first day of the week

        // ' 1-Jan-1970'
        case 'v': return _strftime(locale.formats.v || '%e-%b-%Y', d, locale);

        // '00'
        case 'W': return pad(weekNumber(d, 'monday'), padding);

        // '4'
        case 'w': return d.getDay(); // 0 - 6, Sunday is first day of the week

        // '1970'
        case 'Y': return d.getFullYear();

        // '70'
        case 'y':
          var y = String(d.getFullYear());
          return y.slice(y.length - 2);

        // 'GMT'
        case 'Z':
          if (options.utc) {
            return "GMT";
          }
          else {
            var tzString = d.toString().match(/\(([\w\s]+)\)/);
            return tzString && tzString[1] || '';
          }

        // '+0000'
        case 'z':
          if (options.utc) {
            return "+0000";
          }
          else {
            var off = typeof tz == 'number' ? tz : -d.getTimezoneOffset();
            return (off < 0 ? '-' : '+') + pad(Math.floor(Math.abs(off) / 60)) + pad(Math.abs(off) % 60);
          }

        default: return c;
      }
    });
  }

  function dateToUTC(d) {
    var msDelta = (d.getTimezoneOffset() || 0) * 60000;
    return new Date(d.getTime() + msDelta);
  }

  var RequiredDateMethods = ['getTime', 'getTimezoneOffset', 'getDay', 'getDate', 'getMonth', 'getFullYear', 'getYear', 'getHours', 'getMinutes', 'getSeconds'];
  function quacksLikeDate(x) {
    var i = 0
      , n = RequiredDateMethods.length
      ;
    for (i = 0; i < n; ++i) {
      if (typeof x[RequiredDateMethods[i]] != 'function') {
        return false;
      }
    }
    return true;
  }

  // Default padding is '0' and default length is 2, both are optional.
  function pad(n, padding, length) {
    // pad(n, <length>)
    if (typeof padding === 'number') {
      length = padding;
      padding = '0';
    }

    // Defaults handle pad(n) and pad(n, <padding>)
    if (padding == null) {
      padding = '0';
    }
    length = length || 2;

    var s = String(n);
    // padding may be an empty string, don't loop forever if it is
    if (padding) {
      while (s.length < length) s = padding + s;
    }
    return s;
  }

  function hours12(d) {
    var hour = d.getHours();
    if (hour == 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return hour;
  }

  // Get the ordinal suffix for a number: st, nd, rd, or th
  function ordinal(n) {
    var i = n % 10
      , ii = n % 100
      ;
    if ((ii >= 11 && ii <= 13) || i === 0 || i >= 4) {
      return 'th';
    }
    switch (i) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
    }
  }

  // firstWeekday: 'sunday' or 'monday', default is 'sunday'
  //
  // Pilfered & ported from Ruby's strftime implementation.
  function weekNumber(d, firstWeekday) {
    firstWeekday = firstWeekday || 'sunday';

    // This works by shifting the weekday back by one day if we
    // are treating Monday as the first day of the week.
    var wday = d.getDay();
    if (firstWeekday == 'monday') {
      if (wday == 0) // Sunday
        wday = 6;
      else
        wday--;
    }
    var firstDayOfYear = new Date(d.getFullYear(), 0, 1)
      , yday = (d - firstDayOfYear) / 86400000
      , weekNum = (yday + 7 - wday) / 7
      ;
    return Math.floor(weekNum);
  }

}());

Topogram.factory('TopogramService', function() {
    return {

      "citations" : { nodes:[],edges:[]},
      "words" : { nodes:[],edges:[]},
      "geo"   : [],
      "wordProvinces": [],
      "trigger": 0

    };
});

Topogram.directive("citations", function () {
     return {
        replace: false,
        restrict: 'E',
        link: function ($scope, element, attrs) {
            
            var svg_w=d3.select(element[0]).style('width'),
                h=500,
                w=1600;
            
            var sw=1,
                sh=1,
                sx=0,
                sy=0;

            var viz=d3.select(element[0]).append("svg")
                .attr("class","svg-viz")
                .style("background","#fff")
                .attr("width", w)
                .attr("height", h)
                .attr("preserveAspectRatio", "xMidYMid")
                .attr("viewBox", "0 0 "+ w + " " + h)
                

            var divCitations=viz.append("g").attr("class","citationzone")
                    .attr("transform","scale("+sh+","+sw+") translate("+sx+","+sy+")")

            var citationEdges = divCitations.append("g")
                        .attr("class", "citationgraph")

            var citations = divCitations.append("g")
                        .attr("class", "citations")

            var citationsLegend=divCitations.append("g")
                        .attr("class", "citations-legend")
                        .attr("transform", "translate("+(20)+","+(h-50)+")");
                    
            $scope.$watch('topogramName', function(newVal, oldVal) {
                console.log(newVal);
                if(newVal!=undefined) {                           
                    citationsLegend.append("text")
                        .attr("dx",1)
                        .attr("dy",12)
                        .text("Conversational graph for '"+newVal+"'")
                        .style("fill","#404040")
                        .style("margin-left",5)
                        .style("font-size",10)
                        .call(wrap, 135);

                    citationsLegend.append("text")
                        .attr("transform","translate(0,30)")
                        .attr("dx",1)
                        .attr("dy",10)
                        .text("Citations interactions (@,RT)")
                        .style("fill","#aaa")
                        .style("margin-left",5)
                        .style("font-size",10)
                        .call(wrap, 150);
                }
            });

            function wrap(text, width) {
                text.each(function() {
                    var text = d3.select(this),
                        words = text.text().split(/\s+/).reverse(),
                        word,
                        line = [],
                        lineNumber = 0,
                        lineHeight = 0.7, // ems
                        y = text.attr("y"),
                        dy = parseFloat(text.attr("dy")),
                        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy );
                    while (word = words.pop()) {
                      line.push(word);
                      tspan.text(line.join(" "));
                      if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy ).text(word);
                      }
                    }
                });
            }

            var citationColor=d3.scale.category20b();

            $scope.$watch("citationsLength", function(newVal,oldVal){
                if(newVal==undefined) return
                console.log(newVal);
                var citationData=$scope.citations;

                // parse data properly                     
                var myCitationsNodes={}
                var color = d3.scale.category20c();

                for (var i = 0; i < citationData.nodes.length; i++) {
                    myCitationsNodes[citationData.nodes[i]["name"]]=citationData.nodes[i];
                    citationData.nodes[i].children=[];
                    citationData.nodes[i].selected=false;
                };

                citationData.edges.forEach(function(link) {

                    myCitationsNodes[link.source].children.push(myCitationsNodes[link.target]);
                    myCitationsNodes[link.target].children.push(myCitationsNodes[link.source]);

                    link.source = myCitationsNodes[link.source] || 
                        (myCitationsNodes[link.source] = {name: link.source});
                    link.target = myCitationsNodes[link.target] || 
                        (myCitationsNodes[link.target] = {name: link.target});
                    link.value = link.weight;
                });


                // TODO : move data logic to controllers
                var myCommunities={},
                    myProvinces={},
                    leaders={};

                var communities=citationData.nodes.map(function(d){
                    if(myCommunities[d.community]== undefined) myCommunities[d.community]=[]
                        myCommunities[d.community].push(d);
                        return d.community
                })
                
                for (com in myCommunities) {
                    myCommunities[com].sort(function(a,b){ return b.count-a.count});
                    leaders[com]=myCommunities[com][0]; // keep only the biggest node
                    
                    // count by provinces
                    var pc=count(myCommunities[com].map(function(d){ return d.province }))
                    myProvinces[com]=[]
                    for (p in pc) { 
                        myProvinces[com].push({"label":p, "value":pc[p], "color": color(p)})
                    }
                }

                function count(arr){
                    var obj={}
                    for (var i = 0, j = arr.length; i < j; i++) {
                       if (obj[arr[i]]) {
                          obj[arr[i]]++;
                       }
                       else {
                          obj[arr[i]] = 1;
                       } 
                    }
                    return obj;
                }

                d3.selectAll(".citation-link").remove();
                d3.selectAll(".citation").remove();

                var citationForce=d3.layout.force()
                        .nodes(citationData.nodes)
                        .links(citationData.edges)
                        .size([500,h])
                        // .linkDistance(50)
                        .charge(-100)
                        .gravity(.4)
                        .on("tick", tickCitations);

                var citationPath=citationEdges.selectAll(".citation-link")
                        .data(citationForce.links())
                
                citationPath.enter()
                    .append("line")
                    .attr("class", "citation-link")

                var citationNodes=citations.selectAll(".citation")
                        .data(citationForce.nodes())

                citationNodes.enter()
                    .append("g")
                    .attr("class", "citation")

                if($scope.citationForceStarted) {
                    citationForce.start();
                    // console.log(citationNodes.call(""));
                    citationNodes.call(citationForce.drag);
                } 


                drawCitations();
                
                var padding = 5, // separation between same-color circles
                    clusterPadding = 36, // separation between different-color circles
                    maxRadius = 20;

                function drawCitations(){

                    var citationExt=citationData.nodes.map(function(d){ return d.children.length }),
                        legendExt=d3.scale.linear().domain([0,3]).range(d3.extent(citationExt)),
                        citationSize=d3.scale.linear().domain(d3.extent(citationExt)).range([3,20]);

                    var a=[];
                    for(p in myProvinces) {
                        a.push(myProvinces[p].length);
                    }

                    var clutersColors=colorbrewer.Accent[4].reverse(),
                        citationProvinceClusteringColor=d3.scale.linear().domain(d3.extent(a)).range(clutersColors);

                    citationNodes.each(function (d, i) {
                            
                            var self = d3.select(this);
                            
                            self.append("circle")
                            .attr("r",function(d){ 
                                d.radius=citationSize(d.children.length);
                                return d.radius;
                            })
                            .style("fill", function(d){
                                if($scope.showCommunities) return citationColor(d.community)
                                else return citationProvinceClusteringColor(myProvinces[d.community].length)
                            })
                    })
                    /*
                    .on("click",function(d,i){

                        $scope.selection=true;
                        d.selected=true;
                        d.children.forEach(function(e){
                            e.selected=true;
                        })
                        var pieX=400+d3.selectAll(".pie-chart")[0].length*200;
                        // console.log(pieX);
                        var self=d3.select(this);
                        
                        self.append("text")
                          .attr("class", "legend")
                          .style("text-anchor", "middle")
                          .style("font-size", 11)
                          .style("fill","#404040")
                          // .attr("transform", "translate(0,"+(-width/2)+")")
                          .text(d.community)

                          console.log(myProvinces[d.community]);

                        drawCitationPie(
                            divCitations.append("g").attr("transform",'translate('+pieX+',200)'),
                            myProvinces[d.community],
                            d.community)
                    }) 
                    .on("mouseout",function(d,i){
                        $scope.selection=false;
                        d.selected=false;
                        d.children.forEach(function(e){
                            e.selected=false;
                        })
                        d3.select(".pie-chart").remove()
                    });
                    */
                    // legend
                    d3.select(".legend-communities").remove()

                    var legendCommunities=citationsLegend.append("g")
                        .attr("class","legend-communities")
                        .attr("transform","translate("+(400)+",0)")
                        .append("g")
                        .attr("class","legend-size")

                    // clustering
                    if(!$scope.showCommunities) {

                        var clusterLeg=d3.scale.linear().domain([0,clutersColors.length]).range(d3.extent(a))

                        legendCommunities
                            .append("text")
                            .style("fill","#404040")
                            .style("font-size", 10)
                            // .attr("height", 15)
                            .attr("dy", function(d,i) {return -40-(clutersColors.length+1)*15 })
                            .attr("dx", 55)
                            .text("Provinces clusters")

                        for (var j = 0; j < clutersColors.length+1; j++) {
                            legendCommunities
                                .append("rect")
                                .style("stroke","none")
                                .attr("width", 15)
                                .attr("height", 15)
                                .attr("y", function(d,i) {return -45-j*15 })
                                .attr("x", 60)
                                .attr("fill", citationProvinceClusteringColor(clusterLeg(j)))

                            legendCommunities
                                .append("text")
                                .style("fill","#ccc")
                                .style("font-size", 10)
                                // .attr("height", 15)
                                .attr("dy", function(d,i) {return -40-j*15 })
                                .attr("dx", 85)
                                .text(Math.round(clusterLeg(j))+" provinces")
                                // .attr("fill", citationProvinceClusteringColor(clusterLeg(j)))

                        }
                    }

                    // size
                    legendCommunities
                        .append("text")
                        .style("fill","#404040")
                        .style("font-size", 10)
                        // .attr("height", 15)
                        .attr("dy", function(d,i) {return -10 })
                        .attr("dx", 30)
                        .text("Interactions for each citations")

                    for (var i = 0; i < 3; i++) {
                        
                        var d=legendExt(i);
                        
                        legendCommunities
                            .append("circle")
                            .attr("r",citationSize(d) )
                            .attr("cy",citationSize(d))
                            .attr("cx", 50)
                            .style("fill","transparent")
                            .style("stroke","#ccc")

                        legendCommunities
                            .append("line")
                            .attr("x1", 50)
                            .attr("y1", citationSize(d)*2)
                            .attr("x2", 100)
                            .attr("y2", citationSize(d)*2)
                            .style("stroke","#ccc")
                            .style("stroke-width",.5);
                        
                        legendCommunities        
                            .append("text")
                            .attr("dx", 100)
                            .attr("dy", citationSize(d)*2)
                            .style("font-size",9)
                            .style("fill","#aaa")

                            .text((Math.round(d)+1)+" interactions")
                        
                    }
                    drawCitationPath()
                }

                function drawCitationPath() {
                    
                    citationPath.each(function (d, i) {
                        var self = d3.select(this);
                        self.style("stroke", function(d){return "#ccc"})
                            .style("stroke-width",2)
                    })
                }

                function tickCitations(e) {

                    var r=5,
                        w=citationForce.size()[0],
                        h=citationForce.size()[1];

                    citationPath.each(function (d,i) {
                        var self=d3.select(this);

                        var x1=Math.max(r, Math.min(w - r, d.source.x)),
                            y1=Math.max(r, Math.min(h - r, d.source.y)),
                            x2=Math.max(r, Math.min(w - r, d.target.x)),
                            y2=Math.max(r, Math.min(h - r, d.target.y));

                        self.attr("stroke-opacity",function(e){
                            if($scope.selection) {
                                if(!d.selected) return 0.2;
                                else return 1;
                            } else return 1;
                        })

                        if(!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                            self.attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                        }
                        
                    })
                        

                    citationNodes
                        // .each(cluster(12 * e.alpha * e.alpha))
                        .each(collide(.5))
                        .attr("transform", function(d) { 
                            
                            var r=5,
                                w=citationForce.size()[0],
                                h=citationForce.size()[1],
                                x=Math.max(r, Math.min(w - r, d.x)),
                                y=Math.max(r, Math.min(h - r, d.y));
                                // x=d.x,
                                // y=d.y;

                            return "translate(" + x + "," + y + ")"; 
                        }).attr("fill-opacity",function(d){
                            if($scope.selection) {
                                if(!d.selected) return 0.3;
                                else return 1;
                            } else return 1;
                        });
                }

                // Move d to be adjacent to the cluster node.
                function cluster(alpha) {
                  return function(d) {
                    var cluster = leaders[d.community];
                    // console.log(cluster);
                    if (cluster === d) return;
                    var x = d.x - cluster.x,
                        y = d.y - cluster.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + cluster.radius;
                    if (l != r) {
                      l = (l - r) / l * alpha;
                      d.x -= x *= l;
                      d.y -= y *= l;
                      cluster.x += x;
                      cluster.y += y;
                    }
                  };
                }

                // Resolves collisions between d and all other circles. 
                function collide(alpha) {
                  var quadtree = d3.geom.quadtree(citationData.nodes);
                  return function(d) {
                    var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
                        nx1 = d.x - r,
                        nx2 = d.x + r,
                        ny1 = d.y - r,
                        ny2 = d.y + r;
                    quadtree.visit(function(quad, x1, y1, x2, y2) {
                      if (quad.point && (quad.point !== d)) {
                        var x = d.x - quad.point.x,
                            y = d.y - quad.point.y,
                            l = Math.sqrt(x * x + y * y),
                            r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
                        if (l < r) {
                          l = (l - r) / l * alpha;
                          d.x -= x *= l;
                          d.y -= y *= l;
                          quad.point.x += x;
                          quad.point.y += y;
                        }
                      }
                      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                    });
                  };
                }

                function drawCitationPie(element, _data, _community) {

                    element.select(".pie-chart").remove()

                    // console.log($scope.geoColors);

                    // parse only more than 3 % and group others
                    data=[];
                    var t=d3.sum(_data.map(function(d){ return d.value }));
                    var others=0;
                    
                    _data.forEach(function (d){
                        if(d.label == 0) return
                        if(d.value/t*100>7) data.push({"label":d.label,
                                    "color": $scope.geoColors[d.label], 
                                    "value": d.value})
                        else others+=d.value
                    })

                    if(others!=0) data.push({"label":"Others",
                                            "color": "#ccc", 
                                            "value": others})
                    // console.log(data);
                    var width = 200,
                        height = 200,
                        radius = Math.min(width, height) / 2;

                    var arc = d3.svg.arc()
                      .outerRadius(radius - 10)
                      .innerRadius(0);

                    var pie = d3.layout.pie()
                      .sort(null)
                      .value(function(d) { return d.value; });

                    var svg = element
                      .append("g")
                      .attr("class","pie-chart")
                      .attr("width", 200)
                      .attr("height", 200)
                      .append("g")
                      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
                
                    svg.on("click", function(d){
                        element.select(".pie-chart").remove()
                    })

                    var g = svg.selectAll(".arc")
                      .data(pie(data))
                      .enter()


                    g.append("path")
                      .attr("class", "arc")
                      .attr("d", arc)
                      .attr("data-legend", function(d){ return d.data.label })
                      .style("fill", function(d) { return d.data.color; });

                    g.append("text")
                      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                      .attr("dy", ".25em")
                      .style("fill-opacity","0.8")
                      .style("text-anchor", "middle")
                      .style("font-size", 10)
                      .style("fill","#000")
                      .text(function(d) { return d.data.label; });

                    svg.append("text")
                      .attr("class", "legend")
                      .style("text-anchor", "middle")
                      .style("font-size", 11)
                      .style("fill","#404040")
                      .attr("transform", "translate(0,"+(-width/2)+")")
                      .text("Community "+_community)
                }

            })
        }
    }
})

Topogram.directive('match', ["$parse", function($parse) {
  return {
    require: 'ngModel',
    link: function(scope, elem, attrs, ctrl) {
      scope.$watch(function() {
        // console.log( (attrs.match)(scope) );
        // console.log(ctrl.$modelValue);
        return $parse(attrs.match)(scope) === ctrl.$modelValue;
      }, function(currentValue) {
        ctrl.$setValidity('mismatch', currentValue);
      });
    }
  };
}]);


Topogram.directive('d3Cloud', function () {
        return {
          replace: false,
          scope: { 
              frequentWords: '=frequentWords'
           },
          link: function ($scope, element, attrs) {
                  
                  console.log("d3cloud");
                  var w=600,
                      h=300,
                      fill = d3.scale.category20(), 
                      fontScale=[10,140],
                      words, 
                      counts, 
                      cloudScaleFont;

                  // build SVG element
                  var svg = d3.select(element[0])
                          .append("svg")
                          // .style("background","#fff")
                          .attr("width", w)
                          .attr("height", h)
                          .append("g")
                          .attr("transform","translate("+(w/2)+","+(h/2)+")")

                  // watch data
                  $scope.$watch('frequentWords', function(frequentWords, oldVal) {
                    
                    if(frequentWords != oldVal && frequentWords != undefined) {
                    
                          // calculate scales
                          words = frequentWords.map(function(d){return d.word}),
                          counts=frequentWords.map(function(d){return d.count}),
                          cloudScaleFont=d3.scale.linear().domain(d3.extent(counts)).range(fontScale);

                          // select layout
                          d3.layout.cloud().size([w, h])
                                .words(frequentWords)
                                .padding(1)
                                .rotate(function() { return ~~(Math.random() * 2) * 90; })
                                .font("Impact")
                                .fontSize(function(d) { return cloudScaleFont(d.count); })
                                .on("end", draw)
                                .start();


                        function draw(_words) {
                          console.log(_words);
                          wordsElements = svg.selectAll("text")
                              .data(_words);

                          wordsElements.enter()
                            .append("text")
                              .style("font-size", function(d) { return d.size + "px"; })
                              .style("font-family", "Impact")
                              .style("fill", function(d, i) { return fill(i); })
                              .attr("text-anchor", "middle")
                              .attr("transform", function(d) {
                                return "translate(" + [d.x, d.y] + ")";
                              })
                              .text(function(d) { return d.word; });
                      }

                 }
          });
          }
    }
});

Topogram.directive('timeslider', ["$parse", function ($parse) {
    return {
      restrict: 'E',
      replace: true,
      template: '<input type="text" />',
      link: function ($scope, element, attrs) {

        $scope.$watch('timeMax', function(updatedTimeMax, oldVal) {
            
            if(updatedTimeMax != undefined) {
                
                var model = $parse(attrs.model);
                var slider = $(element[0]).slider({
                    "max": updatedTimeMax,
                    "value": [0,updatedTimeMax]
                });

                slider.on('slide', function(ev) {
                    model.assign($scope, ev.value);

                    $scope.start=$scope.timeSeriesData[ev.value[0]].timestamp;
                    $scope.end=$scope.timeSeriesData[ev.value[1]-1].timestamp;

                    $scope.$apply();

                });

            }
        })
      }
    }
}]);

Topogram.directive("words", function () {
     return {
        replace: false,
        scope: { 
              wordsGraph: '=wordsGraph',
              wordsForceStarted :'=wordsForceStarted'
        },
        link: function ($scope, element, attrs) {

            console.log("$scope.wordsGraph");

            //SVG Setup
            var w=900,
                h=500;

            // setup SVG
            var viz=d3.select(element[0]).append("svg")
                .attr("class","svg-viz")
                .style("background","#fff")
                .attr("width", w)
                .attr("height", h)
                .attr("preserveAspectRatio", "xMidYMid")
                .attr("viewBox", "0 0 " + w + " " + h);

            var divWords=viz.append("g").attr("class","wordzone")

            var wordEdges = divWords.append("g")
                        .attr("class", "wordgraph")

            var words = divWords.append("g")
                        .attr("class", "words")

            var wordsLegend=divWords.append("g")
                        .attr("class", "words-legend")
                        .attr("transform", "translate("+(100)+","+(h-200)+")");

            // data 
            $scope.$watch("wordsGraph.words", function(newVal,oldVal){
                console.log(newVal);
                if(newVal == undefined && newVal == oldVal) return // prevent error

                // init
                var wordsData = newVal;
                d3.selectAll(".word-link").remove();
                d3.selectAll(".word").remove();

                /*
                *   DATA : compute data and store in nodes
                */

                newVal

                // arrays to store coordonates  
                var wordsX={},
                      wordsY={};

                // update coordonates based on word and canvas size
                var updateWordXY= function () {
                    var margin=30,
                        rgx=d3.scale.linear().domain([0,wordNodes.length]).range([margin,w-margin-200]),
                        s=d3.shuffle(wordNodes),
                        rgy=d3.scale.linear().domain(fontScale).range([margin,h-150]);

                    for (var i = 0; i < wordNodes.length; i++) {
                        var d=s[i];
                        wordsX[d.id]=rgx(i);
                        wordsY[d.id]=rgy(wordScaleFont(d.weight));
                    };
                }

                // parse data properly                     
                var myWordNodes={},
                    myWordEdges={};

                // init data with a children array 
                for (var i = 0; i < wordsData.nodes.length; i++) {
                    wordsData.nodes[i].children=[];
                    wordsData.nodes[i].selected=false;
                };

                // add childrens to nodes
               for (var i = 0; i < wordsData.links.length; i++) {
                    var link =  wordsData.links[i];
                     wordsData.nodes[link.source].children.push(wordsData.nodes[link.target]);
                     wordsData.nodes[link.target].children.push(wordsData.nodes[link.source]);
                    link.source = wordsData.nodes[link.source] || 
                        (wordsData.nodes[link.source] = {name: link.source});
                    link.target = wordsData.nodes[link.target] || 
                        (wordsData.nodes[link.target] = {name: link.target});
                    link.value = link.weight;
                }

                /*
                *   DRAW : 
                */

                // create graph
                var wordForce=d3.layout.force()
                        .nodes(wordsData.nodes)
                        .links(wordsData.links)
                        .size([w,h])
                        .linkDistance(250)
                        .charge(-1500)
                        .gravity(.3)
                        .on("tick", tickWord);

                var wordPath=wordEdges.selectAll(".word-link")
                        .data(wordForce.links())
                
                wordPath.enter()
                    .append("line")
                    .attr("class", "word-link")

                var wordNodes=words.selectAll(".word")
                        .data(wordForce.nodes())

                wordNodes.enter()
                    .append("g")
                    .attr("class", "word")
                    
                if($scope.wordsForceStarted) {
                    wordForce.start();
                    wordNodes.call(wordForce.drag);
                }

                drawWords(); // init

                // scales
                var fontScale=[15,60],
                    wordScale=wordsData.nodes.map(function(d){return d.weight}),
                    maxMinWordScale=[Math.min.apply(Math,wordScale), Math.max.apply(Math,wordScale)],
                    wordScaleFont=d3.scale.linear().domain(maxMinWordScale).range(fontScale),
                    userPathColor=d3.scale.category20b(),
                    mapColor;
                
                $scope.selection=false;

                // drwa all words
                function drawWords() {
                    var ext=wordsData.nodes.map(function(d){ return d.children.length }), 
                        wordScaleSize=d3.scale.linear().domain(d3.extent(ext)).range([15, 45]),
                        wordScaleOpacity=d3.scale.linear().domain(d3.extent(ext)).range([.5,1]),
                        wordColor = d3.scale.linear().domain(d3.extent(ext)).range(["#a1d99b","#006d2c"]),
                        c=d3.scale.category10();
                    wordNodes.each(function (d, i) {

                        var self = d3.select(this);
                    
                        self.append("rect")
                            .attr("width", function(d) { return wordScaleSize(d.children.length) })
                            .attr("height", function(d) { return 20 })
                            .style("fill", function(d) {  return "transparent"; })
                            .style("stroke", function(d) { return "transparent" });

                        self.append("text")
                            .attr("dx", 12)
                            .attr("dy", 8)
                            .style("font-size", function(d) { return wordScaleSize(d.children.length) })//scale_size(d.btw_cent) })
                            .style("fill", function(d) {
                                return c(d.weight)
                            })
                            .style("fill-opacity", function(d) {  return "#006d2c" })
                            .style("fill-opacity", function(d) {  return wordScaleOpacity(d.weight) })
                            .attr("text-anchor", "middle") // text-align: right
                            .text(function(d) { return d.id });

                        var x=i*20;
                        var y=80;

                        wordsX[d.id]=x;
                        wordsY[d.id]=y;
                    })
                    .on("mouseover",function(d,i,event){
                        $scope.selection=true;
                        d.selected=true;
                        d.children.forEach(function(e){
                            e.selected=true;
                        })
                    }).on("mouseout",function(d,i){
                        $scope.selection=false;
                        d.selected=false;
                        d.children.forEach(function(e){
                            e.selected=false;
                        })
                        // d3.select(".pie-chart").remove()
                    });
                    // .on("click",function(d){
                    //     console.log(d);
                    // })
                    // ;

                    drawWordPath();
                }

                // colors
                function drawWordPath() {
                    var wordPathExt=wordsData.links.map(function(d){ return d.weight }),
                        wordPathWeight=d3.scale.linear().domain(d3.extent(wordPathExt)).range([1, 4]),
                        wordPathOpacity=d3.scale.linear().domain(d3.extent(wordPathExt)).range([.1, 1]);
                    
                    wordPath.each(function (d, i) {
                        var self = d3.select(this);
                        self.style("stroke", function(d) { return "#BBB" })
                            .style("stroke-width", function(d) {  return wordPathWeight(d.weight) })
                            .style("stroke-opacity", function(d) {  return wordPathOpacity(d.weight) });
                    })
                }

                // 
                var ext=wordsData.nodes.map(function(d){ return d.children.length }), 
                    wordScaleOpacity=d3.scale.linear().domain(d3.extent(ext)).range([.5,1]);

                function tickWord() {

                    // remove transition for force
                    var ww = ($scope.wordsForceStarted)? wordNodes : wordNodes.transition();

                    ww.attr("transform", function(d) { 
                    
                        var r=wordScaleFont(d.children.length),
                            x=(d.x==undefined || !$scope.wordsForceStarted)? wordsX[d.id] : Math.max(r, Math.min(w - r, d.x)),
                            y=(d.y==undefined || !$scope.wordsForceStarted)? wordsY[d.id] : Math.max(r, Math.min(h - r, d.y));

                        wordsX[d.id]=x;
                        wordsY[d.id]=y;

                        return "translate(" + x + "," + y + ")"; 

                    }).attr("fill-opacity",function(d){
                        // return 1
                        if($scope.selection) {
                            if(!d.selected) return 0.2;
                            else return 1 // wordScaleOpacity(d.children.length);
                        } else return 1 // wordScaleOpacity(d.children.length);
                    });

                    tickWordPath();
                }

                function tickWordPath() {
                    var wordPathExt=wordsData.links.map(function(d){ return d.weight }),
                        wordPathWeight=d3.scale.linear().domain(d3.extent(wordPathExt)).range([1, 4]),
                        wordPathOpacity=d3.scale.linear().domain(d3.extent(wordPathExt)).range([.1, 1]);

                    wordPath.each(function (d, i) {
                        var self=d3.select(this);

                        self.style("stroke-opacity", function(d) { 
                             if($scope.selection) {
                                if( d.target.selected && d.source.selected) return wordPathOpacity(d.weight)
                                else return 0;
                            } else return wordPathOpacity(d.weight);

                        })
                        
                        var w=wordForce.size()[0],
                            h=wordForce.size()[1],
                            r1=wordScaleFont(d.source.weight),
                            x1=Math.max(r1, Math.min(w, d.source.x));
                            y1=Math.max(r1, Math.min(h, d.source.y)),
                            r2=wordScaleFont(d.target.weight),
                            x2=Math.max(r2, Math.min(w, d.target.x)),
                            y2=Math.max(r2, Math.min(h, d.target.y));

                        if(!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                            self.attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                        }
                    })       
                }

            });
        }
    }
})

'use strict';

/**
 * @ngdoc directive
 * @name izzyposWebApp.directive:adminPosHeader
 * @description
 * # adminPosHeader
 */
Topogram.directive('headerNotification',function(){
		return {
        templateUrl:'js/directives/header/header-notification/header-notification.html',
        restrict: 'E',
        replace: true,
    	}
	});



'use strict';

/**
 * @ngdoc directive
 * @name izzyposWebApp.directive:adminPosHeader
 * @description
 * # adminPosHeader
 */
Topogram.directive('header',function(){
        return {
        templateUrl:'js/directives/header/header.html',
        restrict: 'E',
        replace: true,
        }
    });



/**
 * @ngdoc directive
 * @name izzyposWebApp.directive:adminPosHeader
 * @description
 * # adminPosHeader
 */

// angular.module('sbAdminApp')
//   .directive('sidebarSearch',function() {
//     return {
//       templateUrl:'scripts/directives/sidebar/sidebar-search/sidebar-search.html',
//       restrict: 'E',
//       replace: true,
//       scope: {
//       },
//       controller:function($scope){
//         $scope.selectedMenu = 'home';
//       }
//     }
//   });

'use strict';

/**
 * @ngdoc directive
 * @name izzyposWebApp.directive:adminPosHeader
 * @description
 * # adminPosHeader
 */

Topogram.directive('sidebar',['$location',function() {
    return {
      templateUrl:'js/directives/sidebar/sidebar.html',
      restrict: 'E',
      replace: true,
      scope: {
      },
      controller:["$scope", function($scope){
        $scope.selectedMenu = 'dashboard';
        $scope.collapseVar = 0;
        $scope.multiCollapseVar = 0;
        
        $scope.check = function(x){
          
          if(x==$scope.collapseVar)
            $scope.collapseVar = 0;
          else
            $scope.collapseVar = x;
        };
        
        $scope.multiCheck = function(y){
          
          if(y==$scope.multiCollapseVar)
            $scope.multiCollapseVar = 0;
          else
            $scope.multiCollapseVar = y;
        };
      }]
    }
  }]);

Topogram.directive('timeseries', function () {
    // var chart = d3.custom.timeSerie(),
    return {
        replace: false,
        // templateUrl:'js/directives/timeseries/timeseries.html',
        scope: { 
            timeData: '=timeData',
            start: '=start',
            end: '=end',
            topogramName: "=topogramName"
         },
        link: function ($scope, element, attrs) {

            var margin = {top: 20, right: 20, bottom: 80, left: 40},
                        width = 900,
                        height = 250,
                        gap = 0,
                        ease = 'cubic-in-out',
                        bars;
            
            var duration = 500;

            var time_width = width - margin.left - margin.right,
                time_height = height - margin.top - margin.bottom;

            // Construct our SVG object.
            var svg = d3.select(element[0])
                .append("svg")
                .style("background","#fff")
                .attr("width", time_width + margin.left + margin.right)
                .attr("height", time_height + margin.top + margin.bottom)
                    .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            $scope.$watch('timeData', function(updatedTimeData, oldVal) {

                if(updatedTimeData != undefined && $scope.start!= undefined && $scope.end!= undefined) {

                    console.log(updatedTimeData);

                    var _data=updatedTimeData;

                    // Scales.
                    var x = d3.time.scale().range([time_width/_data.length/2, time_width-time_width/_data.length/2]);
                    // var x = d3.scale.ordinal().rangeRoundBands([0, time_width], .05);
                    var y = d3.scale.linear().range([time_height, 0]);


                    // X-axis.
                    var xAxis = d3.svg.axis()
                        .scale(x)
                        .orient("bottom")
                        .ticks(10)
                        .tickFormat(d3.time.format("%d %B"));

                    var yAxis = d3.svg.axis()
                        .scale(y)
                        .orient("left")
                        .ticks(10);

                    // Set scale domains. 
                    x.domain(d3.extent(_data, function(d) { return d.time; }));
                    y.domain([0, d3.max(_data, function(d) { return d.count; })]);
                    
                    svg.transition().duration(duration).attr({width: width, height: height})
                    
                    // Call x-axis. 
                    d3.select(".x.axis")
                        .transition()
                        .duration(duration)
                        .ease(ease)
                        .call(xAxis);

                    
                    // Draw bars. 
                    bars = svg.append("g")
                        .attr("class","timebar")
                        .selectAll(".timebar")
                        .data( _data, function(d) { return d.time; });

                    d3.select(".timebar")
                        .append("g")
                        .attr("transform","translate(50,10)")
                        .append("text")
                        .style("font-size",9)
                        .style("color", "#404040")
                        .text("Volume of messages")

                    bars.transition()
                        .duration(duration)
                        .ease(ease)
                        .attr("x", function(d) { return x(d.time) - time_width/_data.length/2; })
                        .attr("width", time_width / _data.length)
                        .attr("y", function(d) { return y(d.count); })
                        .attr("height", function(d) { return time_height - y(d.count);});

                    bars.enter().append("rect")
                        .attr("class", "count")
                        .attr("width", time_width / _data.length)
                        .attr("x", function(d) { return x(d.time) - (time_width/_data.length)/2; })
                        .attr("y", time_height)
                        .attr("height", 0)
                        .style("fill", function(d){ return (d.selected)?"steelblue":"#CCC"})
                        .transition().duration(1000)
                        .attr("y", function(d) { return y(d.count); })
                        .attr("height", function(d) { return time_height - y(d.count);});

                    svg.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + time_height + ")")
                        .call(xAxis)
                        .selectAll("text")
                            .attr("font-family", "sans-serif")
                            .attr("fill", "#4B4B4B")
                            .attr("font-size", 10)
                            .style("text-anchor", "end")
                            .attr("dx", "-.8em")
                            .attr("dy", ".15em")
                            .attr("transform", function(d) {
                                return "rotate(-65)" 
                                })
                            // .attr("transform", "rotate(-90)" );

                    svg.append("g")
                        .attr("class", "y axis")
                        .attr("transform", "translate(0,0)")
                        .call(yAxis)
                        .selectAll("text")
                            .attr("font-family", "sans-serif")
                            .attr("fill", "#4B4B4B")
                            .attr("font-size", 10)
                    
                    svg.select(".y")
                        .append("text") // caption
                            .attr("transform", "rotate(-90)")
                            .attr("y", 6)
                            .attr("dy", ".71em")
                            .style("text-anchor", "end")
                            .attr("text-anchor", "middle")  
                            .attr("font-family", "sans-serif")
                            .attr("fill", "#4B4B4B")
                            // .style("text-decoration", "bold")  
                            .attr("font-size", 10)
                            .text("Qty per day (tweets)")
                  
                    svg.selectAll(".domain")
                        .attr("fill", "none")
                        .attr("stroke", "#000")

                    bars.exit().transition().style({opacity: 0}).remove();

                    duration = 500;

                    function updateChart() {
                        // console.log($scope);
                      bars.data($scope.timeData)
                        .style("fill", function(d){ 
                            return (d.selected)?"steelblue":"#CCC"})
                    }

                    $scope.$watch('start', function(newStart, oldVal) {
                        if (newStart!=undefined) updateChart();
                        
                    })
                    $scope.$watch('end', function(newEnd, oldVal) {
                        if (newEnd!=undefined) updateChart();
                        
                    })
                    
                }
            })
        }
    }
});
