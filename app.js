var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var okResult = { result: 'OK' };
var failResult = { result: 'FAIL' };

app.use(express.logger());
app.use(express.bodyParser());

app.set('trust proxy', true);
app.configure(function() {
    app.use(express.static(__dirname + '/web'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/web/index.html');
});

app.get('/debug', function(req, res) {
	res.end('nothing yet');
});


// Start listening (read port from arguments)
var port = 1234;
if (process.argv && process.argv[2])
	port = process.argv[2];

server.listen(port);

console.log('Started server on port ' + port);