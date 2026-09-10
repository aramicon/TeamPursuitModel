# importing the required module
import matplotlib.pyplot as plt
import numpy as np
import json

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/3_robustness_and_noise/images/"



f1 = open("../data/robustness_tests_gen199_all_equal_raw_data.json")
f2 = open("../data/robustness_tests_gen199_all_equal_raw_data_2.json")
f3 = open("../data/robustness_tests_gen199_all_equal_raw_data_3.json")
f4 = open("../data/robustness_tests_gen199_all_equal_raw_data_4.json")

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


y_vals_1.sort();
y_vals_2.sort();
y_vals_3.sort();
y_vals_4.sort();


# plotting the points

plt.figure(figsize=(10,6))

plt.plot(x_vals_2, y_vals_2, color="yellowgreen", label=r'(R.M.) Gen. 200 Run. 1', linestyle=":")

plt.plot(x_vals_3, y_vals_3, color="deepskyblue", label=r'(R.M.) Gen. 200 Run. 2', linestyle="-.")

plt.plot(x_vals_4, y_vals_4, color="goldenrod", label=r'(R.M.) Gen. 200 Run. 3', linestyle=":")

plt.plot(x_vals_1, y_vals_1, color="tomato", label=r'(R.M.) Gen. 200 Run. 4', linestyle="--")




plt.ylabel('Race Finish Time')
plt.xlabel(r'Population (ordered by race time ascending)')

# giving a title to my graph
plt.title('Final Gen. R.M. Finish Times for 4 Runs of GA With All-Equal Team')

plt.legend()


#SAVE
plt.savefig(fileP+"fitness_spread_all_equal_gen200_4runs_Sep2", dpi=220)



# function to show the plot
plt.show()