# importing the required module
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import json
import math

#import data from files

f1 = open("../data/cup_gen2_aug9.json")

#parse the data file
data1 = json.load(f1)
events = data1[0]["choke_under_pressure_events"]

x_vals_1 = [x[0] for x in events]
y_vals_1 = [x[1] for x in events]

best_race_time = math.floor(data1[0]["best_race_time"])
average_race_time = math.floor(data1[0]["average_race_time"])

best_race_x = [x for x in range(max(x_vals_1))]
best_race_y = [best_race_time for x in best_race_x]

average_race_x = [x for x in range(max(x_vals_1))]
average_race_y = [average_race_time for x in best_race_x]


plt.scatter(x_vals_1, y_vals_1, color="green",s=2,linewidth=1,cmap='viridis', alpha=0.7 )
plt.plot(best_race_x, best_race_y, color='deepskyblue', linestyle='-', label='Best-in-gen finish time', alpha=0.7)
plt.plot(average_race_x, average_race_y, color='orchid', linestyle=':', label='Avg. gen. finish time', alpha=0.7)


plt.ylabel('Race Finish Time (fitness)')
plt.xlabel(r'Instruction Timestep')
plt.title('\'Choke under pressure\' events and associated race finish times (Generation 3).')

plt.legend()

# function to show the plot
plt.show()