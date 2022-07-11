var budget = budget || {};

budget.totalCategories = 6;

budget.govData = {
	"Health": 17,
	"Education": 17,
	"Social Protection": 17,
	"Defense": 17,
	"Debt Interest": 16,
	"Other": 16
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