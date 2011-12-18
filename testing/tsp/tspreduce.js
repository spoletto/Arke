

//just find the max

var minCost = 2147483647;
var bestRoute = null;

debugMessage("starting reduce with " + values.length + " values");
for (var i = 0; i < values.length; i++)
{
	debugMessage("checking value: " + values[i]);
	var commaIndex = values[i].indexOf(",");
	var cost = parseInt(values[i].substring(0, commaIndex));
	if (cost < minCost)
	{
		minCost = cost;
		bestRoute = JSON.parse(values[i].substring(commaIndex+1));
	}
}
emit(JSON.stringify(minCost+","+bestRoute))
