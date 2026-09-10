# importing the required module
import matplotlib.pyplot as plt

# rider starts relatively very weak but gradually increases in power until very strong- other 3 riders are ewual at 400/1000
# plot rider threshold power to time at front after running GA




x_vals_1 = [37,38,39,40,41,42,43,44,45,46,47,48,49,50]
y_vals_1 = [289.121,282.531,279.613,277.662,280.215,256.472,244.185,244.424,244.666,259.806,260.106,260.051,259.888,260.242]
# plotting the points

plt.plot(x_vals_1, y_vals_1, color=[0.2,0.6,0.4], linestyle="-")



plt.ylabel('Race Finish Time (fitness)')
plt.xlabel(r'Instruction Time-step')

# giving a title to my graph
plt.title('Effect of effort instruction timestep on race time.')

plt.legend()

# function to show the plot
plt.show()