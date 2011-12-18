import random

def gen_distances(numCities):
	distances = []
	for i in range(numCities):
		rowdists = [random.randint(10, 100) if j != i else 0 for j in range(0, i+1)]
		distances.append(rowdists)
	
	return distances
	