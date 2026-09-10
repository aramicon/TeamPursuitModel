#donalk, graph the win ratio and average fitness of tests for rising sprinte eagerness


import numpy as np
import matplotlib.pyplot as plt

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/5_breakaway/images/"


eagerness = [0,0.1,0.2,0.4,0.6,0.8,1,2,3,4,5,6,7,8,9,10]
win_ratio = [0,0.063,0.138,0.229,0.327,0.427,0.495,0.732,0.874,0.944,0.971,0.988,0.993,0.997,1,1]
average_fitness = [0.67,0.6881,0.708,0.7337,0.7621,0.7884,0.8062,0.8667,0.9021,0.9183,0.9248,0.9287,0.9304,0.9313,0.9323,0.9332]

plt.figure(figsize=(10,6))

plt.plot(eagerness, win_ratio, color='tomato', linestyle='solid', label='Win Ratio')
plt.plot(eagerness, average_fitness, color='seagreen', linestyle='dotted', label='Average Fitness')


plt.title("Win ratio and average fitness for evolving rider sprint eagerness values.")
plt.xlabel("Evolving rider sprint eagerness level")
plt.ylabel("value")
plt.legend()

plt.savefig(fileP+"breakaway_sprint_eagerness_win_ratio_tests_Nov27", dpi=230)

plt.show()