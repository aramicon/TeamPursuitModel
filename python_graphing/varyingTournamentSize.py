# importing the required module
import matplotlib.pyplot as plt

x_vals_1 = ["2000","1000","500","100","16","8","4","2","1"]
y_vals_1 = [254.5266667,258.3663333,256.4933333,255.7523333,253.487,251.9196667,251.0396667,254.426,266.5363333]

#flip the ordering as they were entered big to smoll

x_vals_1.reverse()
y_vals_1.reverse()

plt.plot(x_vals_1, y_vals_1, color=[0.2,0.6,0.4], linestyle="-")

plt.ylabel('Race Finish Time (average of 3 runs)')
plt.xlabel(r'Tournament Size')
plt.title('Effect of tournament size on race times found.')
plt.xticks(x_vals_1)

plt.legend()

# function to show the plot
plt.show()