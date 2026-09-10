# scatterplot to show instructions in a generation
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import json

#import data from files

# plot the power of ONE rider from the data


f1 = open("../data/powerDataAllEqualNoDropJuly26th.json")
f2 = open("../data/powerDataAllEqualNoDropJuly26th_WITHFAILURE_A.json")

rider_threshold = 400


graphTitle = "Final best-in-gen power output of lead rider after GA search with no lead changes."

power_data = {}
power_data = json.load(f1)

f2_power_data = {}
f2_power_data = json.load(f2)


maxPower_data = 0
scatterplotx_effort0 = []
scatterploty_effort0 = []
scatterplotbubblesize_effort0 = []


dataRiders = []
for d in power_data:
    data_rider = []
    for dr in d:
        data_rider.append([dr['x'],dr['y']])
    dataRiders.append(data_rider)


rider1x = [x[0] for x in dataRiders[0]]
rider1y = [y[1] for y in dataRiders[0]]
print(rider1x)
print(rider1y)
rider2x = [x[0] for x in dataRiders[1]]
rider2y = [y[1] for y in dataRiders[1]]

rider3x = [x[0] for x in dataRiders[2]]
rider3y = [y[1] for y in dataRiders[2]]

rider4x = [x[0] for x in dataRiders[3]]
rider4y = [y[1] for y in dataRiders[3]]

f2_dataRiders = []
for d in f2_power_data:
    f2_data_rider = []
    for dr in d:
        f2_data_rider.append([dr['x'],dr['y']])
    f2_dataRiders.append(f2_data_rider)


f2_rider1x = [x[0] for x in f2_dataRiders[0]]
f2_rider1y = [y[1] for y in f2_dataRiders[0]]
print(f2_rider1x)
print(f2_rider1y)
f2_rider2x = [x[0] for x in f2_dataRiders[1]]
f2_rider2y = [y[1] for y in f2_dataRiders[1]]

f2_rider3x = [x[0] for x in f2_dataRiders[2]]
f2_rider3y = [y[1] for y in f2_dataRiders[2]]

f2_rider4x = [x[0] for x in f2_dataRiders[3]]
f2_rider4y = [y[1] for y in f2_dataRiders[3]]

threshold_data_x =  [x[0] for x in dataRiders[0]]
threshold_data_y =  [rider_threshold for x in dataRiders[0]]

fig1 = plt.figure(1)
fig1.set_size_inches(12,8)
ax1 = plt.axes()

ax1.plot(rider2x, rider2y, color='deepskyblue', linestyle='-', label='Lead Rider Power: no failure')
ax1.plot(f2_rider2x, f2_rider2y, color='orchid', linestyle='--',alpha=0.7, label='Lead Rider Power: with failure')
#ax1.plot(rider2x, rider2x, color='blue', linestyle='dashed', label='Rider 2')
#ax1.plot(rider3x, rider3x, color='green', linestyle='dashdot', label='Rider 3')
#ax1.plot(rider4x, rider4x, color='black', linestyle='dotted', label='Rider 4')
ax1.plot(threshold_data_x, threshold_data_y, color='yellowgreen', linestyle='-.', label='Threshold ('+ str(rider_threshold) + ' watts)')

plt.title(graphTitle)
plt.xlabel("Timestep")
plt.ylabel("Power Output")
plt.legend()
plt.show()