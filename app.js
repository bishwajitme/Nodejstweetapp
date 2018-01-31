var express = require('express');
var path = require('path');
var fs = require('fs');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var busboy = require('connect-busboy');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

var routes = require('./controllers/index');
var users = require('./controllers/users');



// Init App
var app = express();

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

//custom validator for image type check although html5 does not allow to upload image other than this format
app.use(expressValidator({
    customValidators: {
        isPNG: function(value, filename) {
            var extension = (path.extname(filename)).toLowerCase();
           if(extension == '.jpg' || extension == '.png' || extension == '.gif' || extension == '.mp4'){
               return true;
           }

        }
    }
}));

//custom validator for video duration check
app.use(expressValidator({
    customValidators: {
        videoDuration: function(value, duration) {
            var video_duration = duration;
            if(video_duration < 30){
                return true;
            }

        }
    }
}));

//custom validator for file size  check Image 5mb and for video 15MB

app.use(expressValidator({
    customValidators: {
        videosize: function(value, size, fileType) {
           fileSizeInBytes = size;
           if(fileType ==='video/mp4'){
               if(fileSizeInBytes < 15000000){
                   return true
               }
           }
           else{
                if(fileSizeInBytes < 5000000){
                    return true
                }
            }


        }
    }
}));



// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('success_msg');
  res.locals.user = req.user || null;
  next();
});



app.use('/', routes);
app.use('/users', users);

// Set Port
app.set('port', (process.env.PORT || 3000));

app.listen(app.get('port'), function(){
	console.log('Server started on port '+app.get('port'));
});

