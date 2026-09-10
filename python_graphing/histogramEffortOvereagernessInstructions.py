import numpy as np
from matplotlib import pyplot as plt
import json

#load data from file

#filenames used
#overeagernessGen0EffortTimesteps
#overeagernessGen99EffortTimesteps

#overeagernessGen0EffortTimesteps_distp05riderp05
#overeagernessGen99EffortTimesteps_distp05riderp05

#overeagernessGen0EffortTimestepsNOEAGERNESS.json
#overeagernessGen99EffortTimestepsNOEAGERNESS.json


f1 = open("../data/overeagernessGen99EffortTimesteps_distp05riderp05.json")

#parse the data file
data1 = json.load(f1)
generation_list_of_overeagerness_affected_effort_timesteps = data1[0]["generation_list_of_overeagerness_affected_effort_timesteps"]
generation_list_of_NON_overeagerness_affected_effort_timesteps = data1[0]["generation_list_of_NON_overeagerness_affected_effort_timesteps"]
bins = 25


#Stack the data
plt.figure()
plt.hist([generation_list_of_overeagerness_affected_effort_timesteps,generation_list_of_NON_overeagerness_affected_effort_timesteps], bins, stacked=True, log=False, density=False,color=["deepskyblue","green"])
plt.legend(["Overeagerness","No Overeagerness"])
plt.ylabel('No. of Effort Instructions')
plt.xlabel(r'Instruction Timestep')
plt.title('Aggregated effort instruction with overeagerness, Generation 100, $\\theta_i=0.5$, $d_{oe}=4000/2$.')

plt.show()