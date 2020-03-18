rem startup notes (home xps laptop)
echo start mongo
start cmd.exe /k "C:\mongodb\bin\mongod.exe" --config C:\mongodb\data\db\mongod.cfg

rem now launch the experiment server in 
cd C:\Users\Donal\Documents\Projects\RESEARCH\bikeracing\TeamPursuitModel\TeamPursuitModel\experiment_server
rem launch explorer at current location
start .
echo start node up
start cmd.exe /k  node app.js

echo start browser
start chrome http://127.0.0.1:3003/ga 