# importing the required module
import matplotlib.pyplot as plt

# x axis values

# create series of shelter effect values

power_min = 500
power_max = 1200
numpoints = 100

power_threshold = 500

fatigue_rate_1 = 20
fatigue_exponent_1 = 1

fatigue_rate_2 = 20
fatigue_exponent_2 = 1.5

fatigue_rate_3 = 20
fatigue_exponent_3 = 2

fatigue_rate_4 = 50
fatigue_exponent_4 = 1

fatigue_rate_5 = 50
fatigue_exponent_5 = 1.5

fatigue_rate_6 = 50
fatigue_exponent_6 = 2


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


power = power_min
for i in range(numpoints):
    if power < power_max:

        x_1 = power
        y_1 = fatigue_rate_1*(((power-power_threshold)/(power_max-power_threshold))**fatigue_exponent_1)
        x_vals_1.append(x_1)
        y_vals_1.append(y_1)

        x_2 = power
        y_2 = fatigue_rate_2 * (((power - power_threshold) / (power_max - power_threshold)) ** fatigue_exponent_2)
        x_vals_2.append(x_2)
        y_vals_2.append(y_2)

        x_3 = power
        y_3 = fatigue_rate_3 * (((power - power_threshold) / (power_max - power_threshold)) ** fatigue_exponent_3)
        x_vals_3.append(x_3)
        y_vals_3.append(y_3)

        x_4 = power
        y_4 = fatigue_rate_4 * (((power - power_threshold) / (power_max - power_threshold)) ** fatigue_exponent_4)
        x_vals_4.append(x_4)
        y_vals_4.append(y_4)

        x_5 = power
        y_5 = fatigue_rate_5 * (((power - power_threshold) / (power_max - power_threshold)) ** fatigue_exponent_5)
        x_vals_5.append(x_5)
        y_vals_5.append(y_5)

        x_6 = power
        y_6 = fatigue_rate_6 * (((power - power_threshold) / (power_max - power_threshold)) ** fatigue_exponent_6)
        x_vals_6.append(x_6)
        y_vals_6.append(y_6)

    power += round((power_max-power_min)/numpoints,2)

#use latex math mode to print labels
#plt.rcParams['text.usetex'] = True

# plotting the points
plt.plot(x_vals_1, y_vals_1, color=[0.3,0.8,0.5], label=r'$FR_i = 20, F^{exp}=1$')
plt.plot(x_vals_2, y_vals_2, color=[0.2,0.6,0.4], label=r'$FR_i = 20, F^{exp}=1.5$')
plt.plot(x_vals_3, y_vals_3, color=[0.1,0.5,0.3], label=r'$FR_i = 20, F^{exp}=2$')

plt.plot(x_vals_4, y_vals_4, color=[0.5,0.8,0.9], label=r'$FR_i = 50, F^{exp}=1$', linestyle=":")
plt.plot(x_vals_5, y_vals_5, color=[0.3,0.4,0.9], label=r'$FR_i = 50, F^{exp}=1.5$', linestyle=":")
plt.plot(x_vals_6, y_vals_6, color=[0.2,0.1,0.9], label=r'$FR_i = 50, F^{exp}=2$', linestyle=":")


plt.ylabel('$Fatigue\_increment(i,t)$')
plt.xlabel('$P^{current}_{i,t}$')

# giving a title to my graph
plt.title('Fatigue accumulated at timestep $t$ for rider $i$')

plt.legend()

# function to show the plot
plt.show()