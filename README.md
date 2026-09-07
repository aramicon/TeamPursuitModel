This project provides a JavaScript-based simulation of two interesting scenarios found in the sport of competitive cycling:

**1:** a team pursuit track cycling race.

**2:** an end-of-race breakaway/chase scenario.

This readme explains the architecture of this project, how it may be run, and some of the details of its model's mechanisms.

For full reproducibility, a MongoDB dataset containing the configurations and results of multiple experiments may be downloaded via Zenodo.

The basic architecture is as follows:
+ A JavaScript-based simulator developed to model the core mechanisms of cycling, such as the mapping of power to acceleration and velocity, the effects of drag and sheltering, and the impacts of fatigue and failure.
+ A genetic algorithm that uses this simulator as its fitness function, and can discover solutions for any provided configuration of team riders and race conditions.
+ A visual JavaScript/CSS/HTML front-end to allow easy running and saving of configurations and experiments. This front-end UI is served up by a Node.JS server.
+ A MongoDB data storage layer that stores both experiment configurations (every starting parameter) and results, for experiments that are run.

**Importing the MongoDB file**
The MongoDb collection is available on the open Zenodo repository, operated by CERN (The European Organization for Nuclear Research, based in Geneva). 

**Connecting the Node.JS application to the MongoDB data collection**
Once the data has been imported, the simulator application can be connected to it in order to load both experiment settings (for running them) and previous experiment results. The data connection properties must be set in the DB.js file directly inside the experiment_server folder.
```javascript
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const dbname = "crud_mongodb"; //Put your data collection name here (this is the original name).
const url = "mongodb://localhost:27017"; //Put your own server IP and port here.
const mongoOptions = {useNewUrlParser: true};
```

