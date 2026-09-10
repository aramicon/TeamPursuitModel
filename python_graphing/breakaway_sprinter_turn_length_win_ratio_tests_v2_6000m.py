#donalk, graph the win ratio and average fitness of tests for rising sprinter coop turn length


import numpy as np
import matplotlib.pyplot as plt

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/5_breakaway/images/"


turn_length = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,32,34,36,38,40,50,55,57,58,59,60,70,80,90,100,140,180]
win_ratio = [0.523,0.401,0.289,0.361,0.618,0.446,0.344,0.254,0.415,0.547,0.522,0.418,0.293,0.219,0.382,0.534,0.595,0.534,0.421,0.058,0.138,0.154,0.15,0.345,0.527,0.583,0.614,0.331,0.364,0.004,0.03,0.136,0.449,0.612,0.304,0.032,0.364,0.58,0.624,0,0,0,0,0,0,0,0]
average_fitness = [0.8237,0.8039,0.78,0.7892,0.8415,0.821,0.8027,0.767,0.8011,0.8295,0.8389,0.8193,0.7912,0.763,0.7935,0.8293,0.8485,0.8396,0.8188,0.6977,0.7323,0.7341,0.7394,0.7941,0.8308,0.8462,0.8528,0.7916,0.8105,0.5989,0.6714,0.7334,0.8175,0.8507,0.7725,0.6686,0.7988,0.8462,0.85,0.376,0.3711,0.1899,0.2467,0.2405,0.2382,0.1271,0.1271]

plt.figure(figsize=(10,6))

plt.plot(turn_length, win_ratio, color='tomato', linestyle='solid', label='Win Ratio')
plt.plot(turn_length, average_fitness, color='seagreen', linestyle='dotted', label='Average Fitness')


plt.title("Win ratio and average fitness for evolving rider coop. turn length values (Race Length: 6000m).")
plt.xlabel("Evolving rider coop. turn length (timesteps)")
plt.ylabel("value")
plt.legend()

plt.savefig(fileP+"breakaway_sprint_coop_turn_length_win_ratio_tests_6000m_Dec3", dpi=230)

plt.show()