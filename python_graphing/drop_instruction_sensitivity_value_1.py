# importing the required module
import matplotlib.pyplot as plt

x_vals_1 = [1,2,3]
y_vals_1 = [245.305, 256.252, 244.185]
plt.plot(x_vals_1, y_vals_1, color=[0.2,0.6,0.4], linestyle="-")

plt.ylabel('Race Finish Time (fitness)')
plt.xlabel(r'Instruction Drop value')
plt.title('Effect of drop instruction value on race time.')
plt.xticks(x_vals_1)

plt.legend()

# function to show the plot
plt.show()