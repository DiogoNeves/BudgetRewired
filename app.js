var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var crypto = require('crypto');
var fs = require('fs');

var validCategories = {
	taxes: [ "Borrowing", "Income Tax", "Corporation Tax", "VAT", "National Insurance", "Other" ],
	spending: [ "Health", "Education", "Social Protection", "Defense", "Debt Interest", "Other" ]
};

function BudgetDatabase() {
	var self = this;

	var budgetData = {
		numOfSubmissions: +0,
		totals: {
			taxes: {},
			spending: {}
		}
	};

	var submissionData = {
		budgets: {}
	}

	for (var c in validCategories.spending) {
		var category = validCategories.spending[c];
		budgetData.totals.spending[category] = +0;
	}

	for (var c in validCategories.taxes) {
		var category = validCategories.taxes[c];
		budgetData.totals.taxes[category] = +0;
	}

	this.addBudget = function(budget) {
		++budgetData.numOfSubmissions;

		for (var c in validCategories.spending) {
			var category = validCategories.spending[c];
			budgetData.totals.spending[category] += +budget.spending[category];
		}

		for (var c in validCategories.taxes) {
			var category = validCategories.taxes[c];
			budgetData.totals.taxes[category] += +budget.taxes[category];
		}

		var key = budgetData.numOfSubmissions + '';
		submissionData.budgets[key] = budget;

		return key;
	};

	this.calculateAverage = function() {
		var average = {
			taxes: {},
			spending: {}
		};
		var sum = +0;
		for (var c in validCategories.taxes) {
			var category = validCategories.taxes[c];
			average.taxes[category] = budgetData.totals.taxes[category] / budgetData.numOfSubmissions;
			sum += average.taxes[category];
		}

		if (sum !== +100) {
			average.taxes[validCategories.taxes[0]] += +100 - sum;
			console.log('WARN: Had to tweak the average ' + sum);
		}

		sum = +0;
		for (var c in validCategories.spending) {
			var category = validCategories.spending[c];
			average.spending[category] = budgetData.totals.spending[category] / budgetData.numOfSubmissions;
			sum += average.spending[category];
		}

		if (sum !== +100) {
			average.spending[validCategories.spending[0]] += +100 - sum;
			console.log('WARN: Had to tweak the average ' + sum);
		}

		console.log(average);

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
	if (budget != null && budget !== undefined && budget.taxes != null && budget.spending != null) {
		purified = {
			taxes: {},
			spending: {}
		};
		var sum = +0;

		for (var c in validCategories.taxes) {
			var category = validCategories.taxes[c];
			if (budget.taxes[category] === undefined || budget.taxes[category] == null)
				return null;

			purified.taxes[category] = +budget.taxes[category];
			sum += +budget.taxes[category];
		}

		for (var c in validCategories.spending) {
			var category = validCategories.spending[c];
			if (budget.spending[category] === undefined || budget.spending[category] == null)
				return null;

			purified.spending[category] = +budget.spending[category];
			sum += +budget.spending[category];
		}

		if (sum !== +200) {
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