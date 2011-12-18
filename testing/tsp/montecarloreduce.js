
var total = 0.0;

for (var i = 0; i < values.length; i++)
{
	total += parseFloat(values[i])
}

emit("" + (total / values.length))