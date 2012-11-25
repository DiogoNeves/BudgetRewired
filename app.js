var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var crypto = require('crypto');
var fs = require('fs');

var validCategories = [
	"Health", "Education", "Social Protection", "Defense", "Debt Interest", "Other"
];

var govData = {
	"Health": 17,
	"Education": 17,
	"Social Protection": 17,
	"Defense": 17,
	"Debt Interest": 16,
	"Other": 16
};

function BudgetDatabase() {
	var self = this;

	var budgetData = {
		numOfSubmissions: +0,
		totals: {}
	};

	var submissionData = {
		budgets: {}
	}

	for (var c in validCategories) {
		var category = validCategories[c];
		budgetData.totals[category] = +0;
	}

	this.addBudget = function(budget) {
		++budgetData.numOfSubmissions;
		for (var c in validCategories) {
			var category = validCategories[c];
			budgetData.totals[category] += +budget[category];
		}

		var key = budgetData.numOfSubmissions + '';
		submissionData.budgets[key] = budget;

		return key;
	};

	this.calculateAverage = function() {
		var average = {};
		var sum = +0;
		for (var c in validCategories) {
			var category = validCategories[c];
			average[category] = budgetData.totals[category] / budgetData.numOfSubmissions;
			sum += average[category];
		}

		if (sum !== +100) {
			average[validCategories[0]] += +100 - sum;
			console.log('WARN: Had to tweak the average');
		}

		return average;
	};

	this.getBudgetData = function() {
		return budgetData;
	};

	this.getBudget = function(key) {
		var submission = submissionData.budgets[key];
		if (submission === undefined)
			submission = null;

		return submission;
	};

	this.getSubmissions = function() {
		return submissionData;
	};
}

// TODO: replace with redis
var allBudgetData = new BudgetDatabase();

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

app.get('/view/global', function(req, res) {
	res.sendfile(__dirname + '/web/global.html');
});

var report_hack = fs.readFileSync('report_hack.html', 'utf-8');
var footer_hack = "\n</script>\n</body>\n</html>";
app.get('/report.html', function(req, res) {
	var submission = allBudgetData.getBudget(req.query.key);
	if (submission != null && submission !== undefined) {
		res.write(report_hack);

		var script = "var submission = " + JSON.stringify(submission) + ';';
		script += "\nvar govData = " + JSON.stringify(govData) + ';';

		res.write(script);
		res.write(footer_hack);
	} else {
		res.write(req.query.key || '');
	}

	res.end();
});

app.get('/debug', function(req, res) {
	var debugData = {};
	debugData.budget = allBudgetData.getBudgetData();
	debugData.average = allBudgetData.calculateAverage();
	debugData.submissions = allBudgetData.getSubmissions();

	res.json(debugData);
});


var purifyBudget = function(budget) {
	var purified = null;
	if (budget != null && budget !== undefined) {
		purified = {};
		var sum = +0;

		for (var c in validCategories) {
			var category = validCategories[c];
			if (budget[category] === undefined || budget[category] == null)
				return null;

			purified[category] = +budget[category];
			sum += +budget[category];
		}

		if (sum !== +100) {
			console.log('Invalid sum ' + sum);
			return null;
		}
	}

	return purified;
};

app.post('/post/budget', function(req, res) {
	var purifiedBudget = purifyBudget(req.body);
	var result = {};
	if (purifiedBudget != null) {
		var budgetKey = allBudgetData.addBudget(purifiedBudget);
		result = { result: "OK", key: budgetKey };

		// Broadcast to clients
		io.sockets.emit('uptavg', allBudgetData.calculateAverage());
	} else {
		result = { result: "FAIL", msg: "Oops, invalid budget :S" };
	}

	res.json(result);
});

io.sockets.on('connection', function (socket) {
	socket.emit('setavg', allBudgetData.calculateAverage());
});


// Start listening (read port from arguments)
var port = 1234;
if (process.argv && process.argv[2])
	port = process.argv[2];

server.listen(port);

console.log('Started server on port ' + port);