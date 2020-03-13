const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Joi = require('joi');
const db = require('./db');
const app = express();
const collection = "experiment_settings";

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

app.use(bodyParser.json());

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


app.get('/getExperimentSettings',(req,res)=>{
	db.getDB().collection(collection).find({}).toArray((err,documents)=>{
		if(err){
			console.log("error getting collection err " + err);
			res.json("error")
		}
		else{
			console.log(documents);
			res.json(documents);
		}
	});
});

app.get('/getExperimentSettingNames',cors(corsOptions), (req,res)=>{
	db.getDB().collection(collection).find({},{projection:{name : 1}}).toArray((err,documents)=>{
		if(err){
			console.log("error getting collection of names err " + err);
		}
		else{
			console.log(documents);
			res.json(documents);
		}
	});
});
app.get('/getExperimentSettingFromID/:id',cors(corsOptions), (req,res)=>{
	const todoID = req.params.id;
	db.getDB().collection(collection).find({_id : db.getPrimaryKey(todoID)}).toArray((err,documents)=>{
		if(err){
			console.log("error getting settings using ID " + err);
		}
		else{
			console.log(documents);
			res.json(documents);
		}
	});
});

app.options('/update_race_settings/:id', cors())
app.post('/update_race_settings/:id',cors(corsOptions),(req,res)=>{
	console.log("update existing experiment using settings_id");
	const settings_id = req.params.id;
	const userInput = req.body;
  console.log("updating existing settings  ", settings_id);

	 db.getDB().collection(collection).findOneAndUpdate({_id : db.getPrimaryKey(settings_id)},{$set : {name : userInput.name,global_settings : userInput.global_settings, race_settings : userInput.race_settings, rider_settings : userInput.rider_settings}},{returnOriginal : false},(err,result)=>{
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
	console.log("save experiment " + JSON.stringify(userInput));
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

			db.getDB().collection(collection).insertOne(newSettings,(err,result)=>{
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

app.delete("/:id",(req,res)=>{
	const todoID = req.params.id;
	console.log("delete id " + todoID);
	db.getDB().collection(collection).findOneAndDelete({_id : db.getPrimaryKey(todoID)},(err,result)=>{
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
