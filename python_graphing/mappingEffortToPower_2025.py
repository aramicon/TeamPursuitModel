# importing the required module
import matplotlib.pyplot as plt

# x axis values

# create series of shelter effect values


threshold_power_a = 400
max_power_a = 1000

threshold_power_b = 500
max_power_b = 1200

threshold_effort_1 = 3
threshold_effort_2 = 5
threshold_effort_3 = 7
effort_min = 0
effort_max = 10
numpoints = 100

x_vals_1 = []
y_vals_1 = []
x_vals_2 = []
y_vals_2 = []
x_vals_3 = []
y_vals_3 = []
x_vals_4 = []
y_vals_4 = []
x_vals_5 = []
y_vals_5 = []
x_vals_6 = []
y_vals_6 = []


effort_1 = effort_min
effort_2 = effort_min
effort_3 = effort_min
effort_4 = effort_min
effort_5 = effort_min
effort_6 = effort_min

for i in range(numpoints):
    if effort_1 <= threshold_effort_1:
        x_1 = effort_1
        y_1 = threshold_power_a*(effort_1)/(threshold_effort_1)
        x_vals_1.append(x_1)
        y_vals_1.append(y_1)
    effort_1 += round((threshold_effort_1-effort_min)/numpoints,2)
    if effort_2 <= threshold_effort_2:
        x_2 = effort_2
        y_2 = threshold_power_a*(effort_2)/(threshold_effort_2)
        x_vals_2.append(x_2)
        y_vals_2.append(y_2)
    effort_2 += round((threshold_effort_2-effort_min)/numpoints,2)
    if effort_3 <= threshold_effort_3:
        x_3 = effort_3
        y_3 = threshold_power_a*(effort_3)/(threshold_effort_3)
        x_vals_3.append(x_3)
        y_vals_3.append(y_3)
    effort_3 += round((threshold_effort_3-effort_min)/numpoints,2)
    if effort_4 <= threshold_effort_1:
        x_4 = effort_4
        y_4 = threshold_power_b*(effort_4)/(threshold_effort_1)
        x_vals_4.append(x_4)
        y_vals_4.append(y_4)
    effort_4 += round((threshold_effort_1-effort_min)/numpoints,2)
    if effort_5 <= threshold_effort_2:
        x_5 = effort_5
        y_5 = threshold_power_b * (effort_5) / (threshold_effort_2)
        x_vals_5.append(x_5)
        y_vals_5.append(y_5)
    effort_5 += round((threshold_effort_2 - effort_min) / numpoints, 2)
    if effort_6 <= threshold_effort_3:
        x_6 = effort_6
        y_6 = threshold_power_b * (effort_6) / (threshold_effort_3)
        x_vals_6.append(x_6)
        y_vals_6.append(y_6)
    effort_6 += round((threshold_effort_3 - effort_min) / numpoints, 2)

# second set of data from threshold to max
for i in range(numpoints):
    if effort_1 <= effort_max:
        x_1 = effort_1
        y_1 = threshold_power_a+(max_power_a-threshold_power_a)*(effort_1-threshold_effort_1)/(effort_max - threshold_effort_1)
        x_vals_1.append(x_1)
        y_vals_1.append(y_1)
    effort_1 += round((effort_max-threshold_effort_1)/numpoints, 2)
    if effort_2 <= effort_max:
        x_2 = effort_2
        y_2 = threshold_power_a + (max_power_a - threshold_power_a) * (effort_2 - threshold_effort_2) / (
                    effort_max - threshold_effort_2)
        x_vals_2.append(x_2)
        y_vals_2.append(y_2)
    effort_2 += round((effort_max - threshold_effort_2) / numpoints, 2)
    if effort_3 <= effort_max:
        x_3 = effort_3
        y_3 = threshold_power_a + (max_power_a - threshold_power_a) * (effort_3 - threshold_effort_3) / (
                    effort_max - threshold_effort_3)
        x_vals_3.append(x_3)
        y_vals_3.append(y_3)
    effort_3 += round((effort_max - threshold_effort_3) / numpoints, 2)
    if effort_4 <= effort_max:
        x_4 = effort_4
        y_4 = threshold_power_b + (max_power_b - threshold_power_b) * (effort_4 - threshold_effort_1) / (
                effort_max - threshold_effort_1)
        x_vals_4.append(x_4)
        y_vals_4.append(y_4)
    effort_4 += round((effort_max - threshold_effort_1) / numpoints, 2)
    if effort_5 <= effort_max:
        x_5 = effort_5
        y_5 = threshold_power_b + (max_power_b - threshold_power_b) * (effort_5 - threshold_effort_2) / (
                effort_max - threshold_effort_2)
        x_vals_5.append(x_5)
        y_vals_5.append(y_5)
    effort_5 += round((effort_max - threshold_effort_2) / numpoints, 2)
    if effort_6 <= effort_max:
        x_6 = effort_6
        y_6 = threshold_power_b + (max_power_b - threshold_power_b) * (effort_6 - threshold_effort_3) / (
                effort_max - threshold_effort_3)
        x_vals_6.append(x_6)
        y_vals_6.append(y_6)
    effort_6 += round((effort_max - threshold_effort_3) / numpoints, 2)


#use latex math mode to print labels
#plt.rcParams['text.usetex'] = True

# plotting the points
plt.plot(x_vals_1, y_vals_1, color=[0.3,0.8,0.5], label=r'$P^{thresh}_a = 400$, $P^{max}_a=1000$, $E^{thresh}=3$')
plt.plot(x_vals_2, y_vals_2, color=[0.2,0.6,0.4], label=r'$P^{thresh}_a = 400$, $P^{max}_a=1000$, $E^{thresh}=5$')
plt.plot(x_vals_3, y_vals_3, color=[0.1,0.5,0.3], label=r'$P^{thresh}_a = 400$, $P^{max}_a=1000$, $E^{thresh}=7$')

plt.plot(x_vals_4, y_vals_4, color=[0.5,0.8,0.9], label=r'$P^{thresh}_b = 500$, $P^{max}_b=1200$, $E^{thresh}=3$', linestyle=":")
plt.plot(x_vals_5, y_vals_5, color=[0.3,0.4,0.9], label=r'$P^{thresh}_b = 500$, $P^{max}_b=1200$, $E^{thresh}=5$', linestyle=":")
plt.plot(x_vals_6, y_vals_6, color=[0.2,0.1,0.9], label=r'$P^{thresh}_b = 500$, $P^{max}_b=1200$, $E^{thresh}=7$', linestyle=":")


plt.ylabel('Power Output (watts)')
plt.xlabel(r'$E^{current}$')

# giving a title to my graph
plt.title('Mapping effort to power for two riders with varying values of $E^{thresh}$')

plt.legend()

# function to show the plot
plt.show()