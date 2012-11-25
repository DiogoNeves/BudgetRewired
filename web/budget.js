var budget = budget || {};

budget.totalCategories = 6;

budget.govData = {
	"Health": 19,
	"Education": 13,
	"Social Protection": 30,
	"Defense": 6,
	"Debt Interest": 7,
	"Other": 25
};

budget.categories = {
	taxes: {
		"Borrowing": "tax-colour-1",
		"Income Tax": "tax-colour-2",
		"Corporation Tax": "tax-colour-3",
		"VAT": "tax-colour-4",
		"National Interest": "tax-colour-5",
		"Other": "tax-colour-6"
	},

	spending: {
		"Health": "spend-colour-1",
		"Education": "spend-colour-2",
		"Social Protection": "spend-colour-3",
		"Defense": "spend-colour-4",
		"Debt Interest": "spend-colour-5",
		"Other": "spend-colour-6"
	}
};

budget.createStackBar = function(id, value, colour) {
	var stacked = $('<div id="' + id + '" class="bar pcbar" style="width: ' + value + '%"></div>');
	stacked.addClass(colour);
	return stacked;
};