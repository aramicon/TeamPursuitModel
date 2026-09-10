# importing the required module
import matplotlib.pyplot as plt

# rider starts relatively very weak but gradually increases in power until very strong- other 3 riders are ewual at 400/1000
# plot rider threshold power to time at front after running GA




x_vals_1 = [50,100,150,200,250,300,350,380,400,420,440,450,480,500,520,550,600,650,700,750,800,1000]
y_vals_1 = [0,0,0,0,0,8.56,7.48,28.12,12.75,32.53,36.95,26.51,42.11,58.63,54.03,61.32,81.4,87.39,89.5,98.74,89.87,99.55]


x_vals_2 = [50,100,150,200,250,300,350,380,400,420,440,450,480,500,520,550,600,650,700,750,800,1000]
y_vals_2 = [30.98,22.66,32.42,32.42,41.86,27.24,31.5,25.4,23.11,15.26,26.1,12.05,20.65,13.65,22.18,8.23,4.55,0,7.14,0,0,0]

x_vals_3 = [50,100,150,200,250,300,350,380,400,420,440,450,480,500,520,550,600,650,700,750,800,1000]
y_vals_3 = [18.43,28.91,17.58,32.03,37.21,24.12,26.77,30.95,41.04,31.73,15.66,27.31,19.43,12.85,15.73,17.28,4.96,8.4,0,0,6.33,0]

x_vals_4 = [50,100,150,200,250,300,350,380,400,420,440,450,480,500,520,550,600,650,700,750,800,1000]
y_vals_4 = [50.2,48.05,49.61,35.16,20.54,39.69,33.86,15.08,22.71,20.08,20.88,33.73,17.41,14.46,7.66,12.76,8.68,3.78,2.94,0.84,3.38,0]


# plotting the points
plt.plot(x_vals_1, y_vals_1, color=[0.8,0.2,0.2], label=r'Rider 1')

plt.plot(x_vals_2, y_vals_2, color=[0.2,0.6,0.4], label=r'Rider 2', linestyle="-.")

plt.plot(x_vals_3, y_vals_3, color=[0.3,0.3,0.3], label=r'Rider 3', linestyle="--")

plt.plot(x_vals_4, y_vals_4, color=[0.5,0.8,0.9], label=r'Rider 4', linestyle=":")

plt.ylabel('Percentage of time leading the race')
plt.xlabel(r'Rider 1 Fatigue threshold power (watts)')

# giving a title to my graph
plt.title('Percentage of time riders spend at the front as the power of rider 1 changes.')

plt.legend()

# function to show the plot
plt.show()