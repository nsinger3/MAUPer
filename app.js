//  This file is mostly untouched, basic express 
//  Only changes on my end have been the static route defined below

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//  https://expressjs.com/en/starter/static-files.html
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + "/node_modules/leaflet.pattern/dist"));

//app.use "mounts the middleware" - i.e. these js files are invoked by app.js here
app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;