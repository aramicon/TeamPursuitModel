const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Joi = require('joi');
const db = require('./db');
const app = express();
const collectionSettings = "experiment_settings";
const collectionResults = "experiment_results";

const cors = require('cors');
const corsOptions = {
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  "preflightContinue": true,
  "optionsSuccessStatus": 204
}

const schema = Joi.object().keys({
	name:Joi.string().required(),
	global_settings:Joi.object().required(),
	race_settings:Joi.object().required(),
	rider_settings:Joi.array().required()
});

const schemaResults = Joi.object().keys({
  ga_results:Joi.string().required(),
  ga_settings_id:Joi.string().required(),
	name:Joi.string().required(),
	notes:Joi.string().allow(""),
	global_settings:Joi.object().required(),
	race_settings:Joi.object().required(),
	rider_settings:Joi.array().required(),
  date_created: Joi.string().required()
});

app.use(bodyParser.json({limit: '50mb'}));

app.use(express.static(__dirname + '/public'));


app.get('/',(req,res)=> {
	res.sendFile(path.join(__dirname,'index.html'));
});

app.get('/ga',(req,res)=> {
	res.sendFile(path.join(__dirname,'public/ga.html'));
});

app.get('/tpgame',(req,res)=> {
	res.sendFile(path.join(__dirname,'public/tpgame.html'));
});
app.get('/results',(req,res)=> {
	res.sendFile(path.join(__dirname,'public/results.html'));
});
app.get('/about',(req,res)=> {
	res.sendFile(path.join(__dirname,'public/about.html'));
});

app.get('/saveSvgAsPng.js', function(req, res) {
    res.sendFile(__dirname + '/node_modules/save-svg-as-png/lib/saveSvgAsPng.js');
});


app.get('/getExperimentSettings',(req,res)=>{
	db.getDB().collection(collectionSettings).find({}).toArray((err,documents)=>{
		if(err){
			console.log("error getting collection err " + err);
			res.json("error")
		}
		else{
			console.log("getting all settings");
			res.json(documents);
		}
	});
});

app.get('/getExperimentSettingNames',cors(corsOptions), (req,res)=>{
	db.getDB().collection(collectionSettings).find({},{projection:{name : 1}}).toArray((err,documents)=>{
		if(err){
			console.log("error getting collection of names err " + err);
		}
		else{
				console.log("getting list of setting names");
			res.json(documents);
		}
	});
});
app.get('/getExperimentSettingFromID/:id',cors(corsOptions), (req,res)=>{
	const todoID = req.params.id;
	db.getDB().collection(collectionSettings).find({_id : db.getPrimaryKey(todoID)}).toArray((err,documents)=>{
		if(err){
			console.log("error getting settings using ID " + err);
		}
		else{
			console.log("getting settings for specific id");
			res.json(documents);
		}
	});
});

app.options('/update_race_settings/:id', cors())
app.post('/update_race_settings/:id',cors(corsOptions),(req,res)=>{
  const settings_id = req.params.id;
	const userInput = req.body;
  console.log("updating existing settings  ", settings_id);

	 db.getDB().collection(collectionSettings).findOneAndUpdate({_id : db.getPrimaryKey(settings_id)},{$set : {name : userInput.name,global_settings : userInput.global_settings, race_settings : userInput.race_settings, rider_settings : userInput.rider_settings}},{returnOriginal : false},(err,result)=>{
	    if(err){
			console.log("error when updating err = " + err);
		}
		else{
			res.json(result);
		}
	});
});

app.options('/new_race_settings', cors())
app.post("/new_race_settings",cors(),(req,res,next) => {
	const userInput = req.body;
	console.log("save new settings");
	Joi.validate(userInput, schema, (err,result) =>{
		if(err){
			const error = new Error("Invalid Input adding experiment");
			console.log(err);
			error.status = 400;
			next(error);
		}
		else{
      let newSettings = {name : userInput.name,
                        global_settings : userInput.global_settings,
                        race_settings : userInput.race_settings,
                        rider_settings : userInput.rider_settings};

			db.getDB().collection(collectionSettings).insertOne(newSettings,(err,result)=>{
				if(err){
					const error = new Error("Failed to insert new experiment settings");
					console.log(err);
					error.status = 400;
					next(error);
				}
				else{
					res.json({result:result.result, document: result.ops[0],msg:"Successfully inserted new experiment",err:null});
				}
			});
		}
	})

});

app.options('/new_experiment_results', cors())
app.post("/new_experiment_results",cors(),(req,res,next) => {
	const userInput = req.body;
    	console.log("save new results");
	//console.log("save experiment results " + JSON.stringify(userInput));
	Joi.validate(userInput, schemaResults, (err,result) =>{
		if(err){
			const error = new Error("Invalid Input adding experiment results");
			console.log(err);
			error.status = 400;
			next(error);
		}
		else{
      let newExperimentResults = {
                        ga_results: userInput.ga_results,
                        ga_settings_id: userInput.ga_settings_id,
                        settings_name : userInput.name,
                        global_settings : userInput.global_settings,
                        race_settings : userInput.race_settings,
                        rider_settings : userInput.rider_settings,
                        notes : userInput.notes,
                        date_created: userInput.date_created};

			db.getDB().collection(collectionResults).insertOne(newExperimentResults,(err,result)=>{
				if(err){
					const error = new Error("Failed to insert new experiment settings");
					console.log(err);
					error.status = 400;
					next(error);
				}
				else{
          //console.log("$$$$$$$$$$$$$$$result.ops[0]$$$$$$$$$$$$$$$$$$$$");
          //console.log(result.ops[0]);
          let id = result.ops[0]._id;
          console.log("saved new results entry with id " + id);
					res.json({result:result.result, document: {_id:id},msg:"Successfully inserted new experiment",err:null});
				}
			});
		}
	})

});



app.delete("/:id",(req,res)=>{
	const todoID = req.params.id;
	console.log("delete id " + todoID);
	db.getDB().collection(collectionSettings).findOneAndDelete({_id : db.getPrimaryKey(todoID)},(err,result)=>{
		if(err){
			console.log("problem deleting record err "+ err);
		}
		else{
			res.json(result);
		}
	});
});

app.use((err,req,res,next) => {
	res.status(err.status).json({
		error: {
			message : err.message
		}
	});
});

db.connect((err)=>{
	if(err){
		console.log("unable to connect to the mongo db");
		process.exit(1); //terminate app
	}
	else{
		app.listen(3003,()=>{
			console.log('connected to database... listening on port 3003');
		});
	}
});

/******RESUlTS**********/

app.get('/getResults',cors(corsOptions), (req,res)=>{
	db.getDB().collection(collectionResults).find({},{projection:{settings_name : 1, date_created: 1, notes:1}}).toArray((err,documents)=>{
		if(err){
			console.log("error getting collection of result names:  err " + err);
		}
		else{
				console.log("getting list of results");
			  res.json(documents);
		}
	});
});

app.get('/getResult/:id',cors(corsOptions), (req,res)=>{
	const resultID = req.params.id;
	db.getDB().collection(collectionResults).find({_id : db.getPrimaryKey(resultID)}).toArray((err,documents)=>{
		if(err){
			console.log("error getting results using ID " + err);
		}
		else{
			console.log("getting results for specific id");
			res.json(documents);
		}
	});
});
