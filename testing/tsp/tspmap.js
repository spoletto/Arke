	var numCities = 11;
	var numPermutations = 3628800; //=(numCities-1)!
	var startCity = 0;
	//var numCities = 4;
	//var numPermutations = 6;
	//var startCity = 0;
	var costArray = [[0], [68, 0], [22, 69, 0], [38, 84, 56, 0], [40, 81, 25, 93, 0], [83, 40, 88, 64, 14, 0], [10, 57, 63, 26, 56, 68, 0], [42, 41, 39, 80, 79, 40, 71, 0], [89, 84, 23, 34, 48, 94, 74, 98, 0], [63, 49, 47, 75, 54, 76, 42, 39, 90, 0], [42, 46, 14, 96, 46, 93, 62, 33, 33, 38, 0]];
	
	//var key = "1000000,0";//TOM MAKE SURE TO TAKE THIS OUT
	//input: size of subdivision, subdivision
	var inputs = key.split(",");
	var subdivisionSize = parseInt(inputs[0]);
	var subdivisionId = parseInt(inputs[1]);
	var rangeStart = subdivisionSize * subdivisionId;
	var rangeEnd = rangeStart + subdivisionSize;
	if (rangeEnd > numPermutations)
		rangeEnd = numPermutations;
	
	
	var minCost = 2147483647; //max integer value
	var bestRoute = null;
	for (var i = rangeStart; i < rangeEnd; i++)
	{
		var cost = 0;
		var prevCity = startCity;
		var div = numPermutations;
		var route = [numCities];
		for (var j = numCities-1; j > 0; j--)
		{
			div /= j;
			var city = Math.floor(i/div)%j+1;
			
			route[numCities-j] = city;
			
			if (prevCity < city)//ask for the larger one first; this lets us have a smaller array
				cost += costArray[city][prevCity];
			else
				cost += costArray[prevCity][city];
		}
		if (cost < minCost)
		{
			minCost = cost;
			bestRoute = route;
			//document.write("" + minCost + "," + JSON.stringify(bestRoute));
		}
	}
	//document.write("done");
	//turn bestRoute into a string
	var resultsStr = minCost + "," + JSON.stringify(bestRoute);
	emitIntermediate("answer", resultsStr);
	//document.write(resultsStr)