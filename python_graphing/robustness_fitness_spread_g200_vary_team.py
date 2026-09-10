# importing the required module
import matplotlib.pyplot as plt
import numpy as np
import json

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/3_robustness_and_noise/images/"

#f1 = open("../data/robustness_tests_data_gen199_one_strong.json")
f1 = open("../data/gen200_oneStrong_fitness_spread_June25.json")
f2 = open("../data/gen200_twoStrong_fitness_spread_June25.json")
f3 = open("../data/gen200_threeStrong_fitness_spread_June25.json")
f4 = open("../data/gen200_fourStrong_fitness_spread_June25.json")
raw_data = json.load(f1)
raw_data_2 = json.load(f2)
raw_data_3 = json.load(f3)
raw_data_4 = json.load(f4)


#note, this currently only looks at the FIRST entry of the data.

best_race_time = raw_data[0]["best_race_time"]
selected_generation = raw_data[0]["selected_generation"]


x_vals_1 = []
y_vals_1 = [d for d in json.loads(raw_data[0]["variation_times"])] #note this is stored as a string, so need to parse out the array
for i,x in enumerate(y_vals_1):
    x_vals_1.append(i)

x_vals_2 = []
y_vals_2 = [d for d in json.loads(raw_data_2[0]["variation_times"])]
for i,x in enumerate(y_vals_2):
    x_vals_2.append(i)

x_vals_3 = []
y_vals_3 = [d for d in json.loads(raw_data_3[0]["variation_times"])]
for i, x in enumerate(y_vals_3):
    x_vals_3.append(i)

x_vals_4 = []
y_vals_4 = [d for d in json.loads(raw_data_4[0]["variation_times"])]
for i, x in enumerate(y_vals_4):
    x_vals_4.append(i)


print(str(len(y_vals_2)) + " I.V. values")

y_vals_1.sort();
y_vals_2.sort();
y_vals_3.sort();
y_vals_4.sort();


plt.figure(figsize=(10,6))

# plotting the points

plt.plot(x_vals_1, y_vals_1, color="yellowgreen", label=r'One Strong', linestyle="--")

plt.plot(x_vals_2, y_vals_2, color="deepskyblue", label=r'Two Strong', linestyle="-.")

plt.plot(x_vals_3, y_vals_3, color="orchid", label=r'Three Strong', linestyle="-")

plt.plot(x_vals_4, y_vals_4, color="goldenrod", label=r'Four Strong', linestyle=":")

plt.ylabel('Race Finish Time')
plt.xlabel(r'Population (ordered by fitness)')

# giving a title to my graph
plt.title('Spread of I.V. Robustness test for four team types')

plt.legend()
#SAVE
plt.savefig(fileP+"robustness_fitness_spread_four_team_types_Sep2", dpi=220)


# function to show the plot
plt.show()