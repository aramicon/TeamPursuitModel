# importing the required module
import matplotlib.pyplot as plt
import numpy as np
import json

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/5_breakaway/images/"


f1 = open("../data/sprinter_4_gens_genotype_info_nov27.json")


x = np.random.randn(10, 3)
print(np.shape(x))


raw_data = json.load(f1)
data_gen1_breakaway_sprint_eagerness = raw_data["0"]["breakaway_sprint_eagerness"]["5000"]
data_gen5_breakaway_sprint_eagerness = raw_data["4"]["breakaway_sprint_eagerness"]["5000"]
data_gen20_breakaway_sprint_eagerness = raw_data["19"]["breakaway_sprint_eagerness"]["5000"]
data_gen100_breakaway_sprint_eagerness = raw_data["99"]["breakaway_sprint_eagerness"]["5000"]

# make one dataset out of all three

num_bins = 10
colours = ['tomato', 'cornflowerblue', 'darkorchid', 'seagreen']
labels = ["Gen. 1", "Gen. 5", "Gen 20", "Gen. 100"]

plt.figure(figsize=(10,6))

n, bins, _ = plt.hist([data_gen1_breakaway_sprint_eagerness,data_gen5_breakaway_sprint_eagerness,data_gen20_breakaway_sprint_eagerness,data_gen100_breakaway_sprint_eagerness], num_bins, color=colours, alpha=0.7, label=labels)


plt.xlabel('Sprint Eagerness value (evolving rider, for entire race)')
plt.ylabel('Frequency')
plt.legend(fontsize=12)
plt.title('Evolving rider sprint eagerness levels in population, for 4 generations of GA search.')

plt.savefig(fileP+"breakaway_sprint_eagerness_4_gens_Nov27th", dpi=230)


plt.show()