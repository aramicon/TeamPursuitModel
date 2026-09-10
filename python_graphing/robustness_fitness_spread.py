# importing the required module
import matplotlib.pyplot as plt
import numpy as np
import json


fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/3_robustness_and_noise/images/"


#f1 = open("../data/robustness_tests_data_gen199_one_strong.json")
f1 = open("../data/robustness_tests_data_gen199_two_strong.json")
raw_data = json.load(f1)

#note, this currently only looks at the FIRST entry of the data.

best_race_time = raw_data[0]["best_race_time"]
selected_generation = raw_data[0]["selected_generation"]


x_vals_1 = []
y_vals_1 = [d for d in raw_data[0]["mutant_times"]]
for i,x in enumerate(y_vals_1):
    x_vals_1.append(i)

x_vals_2 = []
y_vals_2 = [d for d in json.loads(raw_data[0]["variation_times"])] #note this is stored as a string, so need to parse out the array
for i,x in enumerate(y_vals_2):
    x_vals_2.append(i)

#draw a line for best-in-gen, generation 200 (199)

best_in_gen_200 = 243.664;
x_vals_3 = []
y_vals_3 = [best_in_gen_200 for d in range(len(x_vals_1))]
for i, x in enumerate(y_vals_3):
    x_vals_3.append(i)


print(str(len(y_vals_2)) + " I.V. values")

y_vals_1.sort();
y_vals_2.sort();
y_vals_3.sort();

plt.figure(figsize=(10,6))

# plotting the points

plt.plot(x_vals_1, y_vals_1, color=[0.3,0.9,0.4], label=r'R.M. Variants', linestyle="--")

plt.plot(x_vals_2, y_vals_2, color=[0.9,0.3,0.3], label=r'I.V. Variants', linestyle=":")

plt.plot(x_vals_3, y_vals_3, color="orchid", label=r'Best-in-Gen, Gen. 200', linestyle="-",alpha=0.5,)



plt.ylabel('Race Finish Time')
plt.xlabel(r'Population (ordered by fitness)')

# giving a title to my graph
plt.title('Robustness Test Finish Times, gen. ' + str((selected_generation+1)) + ', best-in-gen time: ' + str(best_race_time))

plt.legend()

#SAVE
plt.savefig(fileP+"rm_iv_fitness_spread_comparison_two_strong_200gens_Sep2", dpi=220)

# function to show the plot
plt.show()