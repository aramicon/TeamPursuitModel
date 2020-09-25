import matplotlib.pyplot as plt
#read in data file
my_file = open("data\\one_stronger_power_time_on_front.txt", "r")
content_list = my_file.readlines()

x = []
y = []

for l in content_list:
    point = l.split(",")
    x.append(float(point[0]))
    y.append(float(point[1]))

print(x)
print(y)

plt.plot(x,y,"b-")
plt.ylabel('Strong Rider % Time on front')
plt.xlabel('Strong Rider Threshold Power')
plt.show()
