#donalk, graph the win ratio and average fitness of tests for rising sprinter coop turn length


import numpy as np
import matplotlib.pyplot as plt

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/5_breakaway/images/"


threshold_power = [325, 350, 375, 400, 425, 450, 475, 500]
win_ratio = [0.222, 0.242, 0.278, 0.494, 0.521, 0.961, 1, 0.995]
average_fitness = [0.7875, 0.8691, 0.8772, 0.8964, 0.8937, 0.9495, 0.97, 0.9648]

plt.figure(figsize=(10,6))

plt.plot(threshold_power, win_ratio, color='tomato', linestyle='solid', label='Win Ratio')
plt.plot(threshold_power, average_fitness, color='seagreen', linestyle='dotted', label='Average Fitness')


plt.title("Win ratio/average fitness for evolved rider with increasing threshold power (1 stronger sprinter in breakaway).")
plt.xlabel("Evolving Rider Threshold Power")
plt.ylabel("value")
plt.legend()

plt.savefig(fileP+"breakaway_seven_props_versus_sprinter_vary_ER_threshold_power", dpi=230)

plt.show()