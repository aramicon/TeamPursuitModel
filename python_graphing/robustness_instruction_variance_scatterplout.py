import matplotlib.pyplot as plt
import numpy as np

import json

fileP = "C:/Users/donak/Documents/RESEARCH/thesisDraft1/3_robustness_and_noise/images/"

#need instruction_type, timestep, value, race_time
# create two sets, one for each kind of instructions
#load the data from a file.

fPreAmble = "../data/"

f1 = "robustness_instruction_variance_test_gen_48"
f2 = "robustness_instruction_variance_test_gen_49"
f3 = "robustness_instruction_variance_test_gen_99"
f4 = "robustness_instruction_variance_test_gen_105_two_strong_Jun18"
f4b = "robustness_instruction_variance_test_gen_106_two_strong_Jun18"
f5 = "robustness_instruction_variance_test_SCATTERPLOT_one_strong_gen200"
f6 = "robustness_instruction_variance_test_SCATTERPLOT_all_equal_gen200"
f7 = "robustness_instruction_variance_test_SCATTERPLOT_all_equal_gen200_B"
f8 = "robustness_instruction_variance_test_SCATTERPLOT_all_equal_gen200_C"
f9 = "robustness_instruction_variance_test_SCATTERPLOT_one_strong_gen200_B"
f10 = "robustness_instruction_variance_test_SCATTERPLOT_one_strong_gen200_C"
f11 = "robustness_instruction_variance_test_SCATTERPLOT_one_strong_gen200_A"
f12 = "robustness_instruction_variance_test_SCATTERPLOT_two_strong_gen200_B"
f12b = "robustness_instruction_variance_test_SCATTERPLOT_two_strong_gen200_C"
f13 = "robustness_instruction_variance_test_gen_199_two_strong_Jun18"
f14 = "robustness_instruction_variance_test_SCATTERPLOT_three_strong_gen200_A"
f15 = "robustness_instruction_variance_test_SCATTERPLOT_four_strong_gen200_B"


fCHOSEN = f14

fileLoaded = open(fPreAmble + fCHOSEN + ".json")
fileGraphFullName = fileP + fCHOSEN + "V2.png"

power_data = {}

raw_data = json.load(fileLoaded)
variation_data = raw_data["variations"]

effort_data = []
for v in variation_data:
    if v[2] == "effort" or v[2] == "timestep_effort":
        effort_data.append([v[1],v[4],v[7]])


x = [d[0] for d in effort_data]
print(x)
y = [d[1] for d in effort_data]
z = [d[2] for d in effort_data]

# that was effort, now create drop data
drop_data = []
for v in variation_data:
    if v[2] == "drop" or v[2] == "timestep_drop":
        drop_data.append([v[1],v[4],v[7]])

x2 = [d[0] for d in drop_data]
y2 = [d[1] for d in drop_data]
z2 = [d[2] for d in drop_data]



#use cmap for colour variation
# see https://stackoverflow.com/questions/8202605/how-to-color-scatter-markers-as-a-function-of-a-third-variable
# and https://matplotlib.org/2.0.2/examples/color/colormaps_reference.html

plt.figure(figsize=(10,6))


plt.scatter(x, y, c=z, s=30, cmap='viridis_r',alpha=0.8)
plt.scatter(x2, y2, c=z2, s=40, cmap='Reds',alpha=0.8)

plt.title("Robustness: instruction variation (I.V.) effect on finish time, team with three strong riders.")
plt.xlabel("instruction Timestep")
plt.ylabel("Instruction Value")
plt.legend()


plt.savefig(fileGraphFullName, dpi=220)
plt.show()

# try to save a higher res version
