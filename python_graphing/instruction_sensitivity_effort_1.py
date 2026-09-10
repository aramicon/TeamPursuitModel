# importing the required module
import matplotlib.pyplot as plt

# rider starts relatively very weak but gradually increases in power until very strong- other 3 riders are ewual at 400/1000
# plot rider threshold power to time at front after running GA




x_vals_1 = [3,4,5,6,6.3,6.35,6.4,6.45,6.5,6.55,6.575,6.6,6.625,6.65,6.675,6.7,6.75,6.8,6.85,6.9,6.95,7,8,9,10]
y_vals_1 = [289.121,278.409,268.426,255.71,260.376,260.876,260.001,260.12,244.994,244.584,244.315,244.185,243.881,256.979,258.541,250.117,260.671,284.315,276.844,283.635,271.353,270.205,281.965,285.326,279.902]
# plotting the points

plt.plot(x_vals_1, y_vals_1, color=[0.2,0.6,0.4], linestyle="-")



plt.ylabel('Race Finish Time (fitness)')
plt.xlabel(r'Instruction Effort Level')

# giving a title to my graph
plt.title('Effect of effort instruction value on race time.')

plt.legend()

# function to show the plot
plt.show()