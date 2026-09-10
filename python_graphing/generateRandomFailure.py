#generate an ordered sequence of random failures
import random

# format: {"20_1":0.8,"40_1":0.8} etc
num_points = 100
start_timestep = 0
end_timestep = 290
lowest_value = 0.1
highest_value = 0.8

digits_in_values = 2

rider = 1

values = {}

num_added = 0

while num_added < num_points:
    rand_timestep = random.randrange(start_timestep,end_timestep)
    rand_value = round(random.uniform(lowest_value,highest_value), digits_in_values)
    v = {}
    v["timestep"] = rand_timestep
    v["value"] = rand_value
    v["rider"] = rider

    if(v["timestep"] not in values):
        values[v["timestep"]] = v
        num_added += 1

# need to get at the dict elements in a sorted way

values_list = [values[v] for v in values.keys()]

sorted_values = sorted(values_list, key=lambda d: d['timestep'])


print(sorted_values)
print(len(sorted_values))

# print out the formatted string
result_string = "{"

for v in sorted_values:
    result_string += "\"" + str(v["timestep"]) + "_" + str(v["rider"]) + "\":" +  str(v["value"]) + ","# "20_1":0.8

#strip off the final comma
result_string = result_string[:-1] + "}"

print("******* result *******")
print(result_string)


