# importing the required module
import matplotlib.pyplot as plt
import numpy as np
import json

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/3_robustness_and_noise/images/"


f1 = open("../data/robustness_tests_gen199_all_equal_raw_data.json")
f2 = open("../data/robustness_tests_gen0_all_equal_raw_data.json")
f3 = open("../data/robustness_tests_gen9_all_equal_raw_data.json")
f4 = open("../data/robustness_tests_gen59_all_equal_raw_data.json")

raw_data = json.load(f1)
raw_data2 = json.load(f2)
raw_data3 = json.load(f3)
raw_data4 = json.load(f4)

#note, this currently only looks at the FIRST entry of the data.

best_race_time = raw_data[0]["best_race_time"]
selected_generation = raw_data[0]["selected_generation"]


x_vals_1 = []
y_vals_1 = [d for d in raw_data[0]["mutant_times"]]
for i,x in enumerate(y_vals_1):
    x_vals_1.append(i)

x_vals_2 = []
y_vals_2 = [d for d in raw_data2[0]["mutant_times"]]
for i,x in enumerate(y_vals_2):
    x_vals_2.append(i)

x_vals_3 = []
y_vals_3 = [d for d in raw_data3[0]["mutant_times"]]
for i, x in enumerate(y_vals_3):
    x_vals_3.append(i)

x_vals_4 = []
y_vals_4 = [d for d in raw_data4[0]["mutant_times"]]
for i, x in enumerate(y_vals_4):
    x_vals_4.append(i)

#draw a line for best-in-gen, generation 200 (199)

best_in_gen_200 = 257.128;
x_vals_5 = []
y_vals_5 = [best_in_gen_200 for d in range(len(x_vals_4))]
for i, x in enumerate(y_vals_5):
    x_vals_5.append(i)


y_vals_1.sort();
y_vals_2.sort();
y_vals_3.sort();
y_vals_4.sort();
y_vals_5.sort();

# plotting the points

plt.figure(figsize=(10,6))

plt.plot(x_vals_2, y_vals_2, color="yellowgreen", label=r'Random Mutations (R.M.) Gen. 1', linestyle=":")

plt.plot(x_vals_3, y_vals_3, color="deepskyblue", label=r'Random Mutations (R.M.) Gen. 10', linestyle="-.")

plt.plot(x_vals_4, y_vals_4, color="goldenrod", label=r'Random Mutations (R.M.) Gen. 60', linestyle=":")

plt.plot(x_vals_1, y_vals_1, color="tomato", label=r'Random Mutations (R.M.) Gen. 200', linestyle="--")

plt.plot(x_vals_5, y_vals_5, color="orchid", label=r'Best-in-Gen Time, Generation 200', linestyle="-",alpha=0.5)


plt.ylabel('Race Finish Time')
plt.xlabel(r'Population (ordered by race time ascending)')

# giving a title to my graph
plt.title('Robustness Test Random Mutation Finish Times during GA')

plt.legend()

#SAVE
plt.savefig(fileP+"fitness_spread_all_equal_from_4_generations_sep2", dpi=220)



# function to show the plot
plt.show()