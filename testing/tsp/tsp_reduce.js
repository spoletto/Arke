
function(key, values, emit) {
	var minCost = 2147483647;
	var bestRoute = null;

	for (var i = 0; i < values.length; i++) {
		var commaIndex = values[i].indexOf(",");
		var cost = parseInt(values[i].substring(0, commaIndex));
		if (cost < minCost) {
			minCost = cost;
			bestRoute = JSON.parse(values[i].substring(commaIndex+1));
		}
	}
	emit("result", JSON.stringify(minCost+","+bestRoute))	
}
