# importing the required module
import matplotlib.pyplot as plt

# plot the earliest drop instruction for rising misearnign noise values






x_vals_1 = [0,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1]
y_vals_1 = [52,76,46,79,143,120,146,155,182,182,153,218,170,208,212,160,192,221,227,157,165]
# plotting the points

plt.plot(x_vals_1, y_vals_1, color="mediumorchid", linestyle="-")



plt.ylabel('Timestep')
plt.xlabel(r'GA Search misearing noise level')

# giving a title to my graph
plt.title('Timestep of the earliest drop instruction for final best-in-gen strategy for GA searches with rising levels of noise.')

plt.legend()

# function to show the plot
plt.show()