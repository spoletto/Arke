

var numTimes = parseInt(value);
var numInside = 0;
for (var i = 0; i < numTimes; i++)
{
	var x = Math.random();
	var y = Math.random();
	if (x * x + y * y) < 1)
		numTimes++;
}
emitIntermediate("answer", "" + (4.0 * numInside / numTimes));