#donalk, graph the win ratio and average fitness of tests for rising sprinter coop turn length


import numpy as np
import matplotlib.pyplot as plt

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/5_breakaway/images/"


turn_length = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,32,34,36,38,40,50,60,70,80,90,100,140,180]
win_ratio = [0.336,0.5303,0.444,0.397,0.264,0.309,0.531,0.613,0.457,0.431,0.294,0.24,0.403,0.545,0.6043,0.551,0.453,0.3877,0.241,0.0313,0.199,0.1617,0.315,0.488,0.565,0.6191,0.537,0.4497,0.38,0.003,0.011,0.067,0.162,0.439,0.586,0,0,0,0,0,0,0,0]
average_fitness = [0.7825,0.8242,0.8132,0.8139,0.7798,0.7808,0.827,0.847,0.8254,0.8212,0.7832,0.7626,0.7984,0.836,0.8493,0.8412,0.8259,0.8131,0.7731,0.6639,0.7507,0.7449,0.7846,0.826,0.8404,0.8524,0.8389,0.8262,0.8101,0.6023,0.6292,0.7007,0.7455,0.8136,0.8467,0.5513,0.4454,0.2278,0.2961,0.2886,0.2858,0.1525,0.1525]

plt.figure(figsize=(10,6))

plt.plot(turn_length, win_ratio, color='tomato', linestyle='solid', label='Win Ratio')
plt.plot(turn_length, average_fitness, color='seagreen', linestyle='dotted', label='Average Fitness')


plt.title("Win ratio and average fitness for evolving rider coop. turn length values (Race Length: 5000m).")
plt.xlabel("Evolving rider coop. turn length (timesteps)")
plt.ylabel("value")
plt.legend()

plt.savefig(fileP+"breakaway_sprint_coop_turn_length_win_ratio_tests_Dec1", dpi=230)

plt.show()