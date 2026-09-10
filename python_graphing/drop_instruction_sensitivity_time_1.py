# importing the required module
import matplotlib.pyplot as plt

x_vals_1 = [63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83]
y_vals_1 = [258.306, 258.306, 258.306, 258.306, 258.306, 258.306, 258.306, 244.185, 244.185, 244.185, 244.185, 244.185, 244.185, 244.185, 244.185, 258.902, 258.902, 258.902, 258.902, 258.902, 258.902]




plt.plot(x_vals_1, y_vals_1, color=[0.2,0.6,0.4], linestyle="-")

plt.ylabel('Race Finish Time (fitness)')
plt.xlabel(r'Instruction Timestep')
plt.title('Effect of drop instruction timestep on race time.')
plt.xticks(x_vals_1)

plt.legend()

# function to show the plot
plt.show()