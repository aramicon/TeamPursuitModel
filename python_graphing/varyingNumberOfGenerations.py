# importing the required module
import matplotlib.pyplot as plt

x_vals_1 = ["2","5","10","20","50","100","200","500"]
y_vals_1 = [265.2666667,261.4346667,258.5,254.877,250.6713333,247.9193333,245.1376667,242.35]

plt.plot(x_vals_1, y_vals_1, color=[0.6,0.3,0.8], linestyle="-")

plt.ylabel('Best Race Finish Time')
plt.xlabel(r'Number of Generations')
plt.title('Effect of the number of generations size on best race times found.')
plt.xticks(x_vals_1)

plt.legend()

# function to show the plot
plt.show()