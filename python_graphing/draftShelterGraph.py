# importing the required module
import matplotlib.pyplot as plt

# x axis values

# create series of shelter effect values

start = -2
end = 8
numpoints = 100
dmin = 2
dmax = 6
smax = 0.4

x_vals = []
y_vals = []

dc = start
for i in range(numpoints):
    if dc < end:
        slevel = 1
        if dc < 0:
            slevel = 0
        elif dc > dmax:
            slevel = 0
        elif dc > dmin:
            slevel = (1-((dc-dmin)/(dmax-dmin)))
        y = slevel * smax
        x = dc
        x_vals.append(x)
        y_vals.append(y)

    dc += round((end-start)/numpoints,2)


# plotting the points
plt.plot(x_vals, y_vals)

plt.ylabel('Drag reduction (draft shelter) amount')
plt.xlabel('Distance from rider in front (m)')

# giving a title to my graph
plt.title('Effect of distance behind object on drag force reduction')

# function to show the plot
plt.show()