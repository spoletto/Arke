
function(key, value, emit) {
	// Input: key = "size of subdivision, subdivision"
	var numCities = 15;
	var numPermutations = 87178291200;
	var startCity = 0;
	var costArray = [[0], [27, 0], [41, 57, 0], [30, 45, 70, 0], [96, 10, 13, 76, 0], [20, 54, 24, 60, 57, 0], [30, 50, 31, 40, 94, 41, 0], [52, 69, 60, 49, 40, 40, 33, 0], [58, 30, 87, 35, 73, 100, 41, 73, 0], [72, 39, 73, 57, 24, 41, 64, 70, 32, 0], [97, 20, 99, 34, 17, 42, 74, 46, 44, 75, 0], [13, 14, 86, 87, 17, 25, 79, 43, 52, 26, 68, 0], [54, 37, 22, 42, 100, 85, 40, 13, 50, 23, 56, 69, 0], [33, 13, 26, 50, 19, 69, 29, 13, 89, 72, 66, 32, 20, 0], [41, 80, 59, 92, 58, 11, 46, 68, 97, 39, 42, 14, 66, 53, 0]]
	
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