
function(key, value, emit) {
	// Input: key = "size of subdivision, subdivision"
	var numCities = 13;
	var numPermutations = 479001600;
	var startCity = 0;
	var costArray = [[0], [68, 0], [22, 69, 0], [38, 84, 56, 0], [40, 81, 25, 93, 0], [83, 40, 88, 64, 14, 0], [10, 57, 63, 26, 56, 68, 0], [42, 41, 39, 80, 79, 40, 71, 0], [89, 84, 23, 34, 48, 94, 74, 98, 0], [63, 49, 47, 75, 54, 76, 42, 39, 90, 0], [42, 46, 14, 96, 46, 93, 62, 33, 33, 38, 0], [42, 46, 14, 96, 46, 93, 62, 33, 33, 38, 25, 0], [61, 42, 46, 14, 96, 46, 93, 62, 33, 33, 38, 25, 0]];
	
	var inputs = key.split(",");
	var subdivisionSize = parseInt(inputs[0]);
	var subdivisionId = parseInt(inputs[1]);
	var rangeStart = subdivisionSize * subdivisionId;
	var rangeEnd = rangeStart + subdivisionSize;
	if (rangeEnd > numPermutations) {
		rangeEnd = numPermutations;
	}
	
	var minCost = 2147483647;
	var bestRoute = null;
	for (var i = rangeStart; i < rangeEnd; i++) {
		var cost = 0;
		var prevCity = startCity;
		var div = numPermutations;
		var route = [numCities];
		for (var j = numCities-1; j > 0; j--) {
			div /= j;
			var city = Math.floor(i/div)%j+1;
			
			route[numCities-j] = city;
			
			if (prevCity < city)
				cost += costArray[city][prevCity];
			else
				cost += costArray[prevCity][city];
		}
		if (cost < minCost) {
			minCost = cost;
			bestRoute = route;
		}
	}

	var resultsStr = minCost + "," + JSON.stringify(bestRoute);
	emit("answer", resultsStr);
}