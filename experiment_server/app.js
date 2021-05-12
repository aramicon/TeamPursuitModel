const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Joi = require('joi');
const db = require('./db');
const app = express();
const collectionSettings = "experiment_settings";
const collectionResults = "experiment_results";
const collectionSequences = "experiment_sequences";

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

const schemaSequence = Joi.object().keys({
  sequence_name:Joi.string().required(),
  notes:Joi.string().required(),
  settings_id:Joi.string().required(),
  sequence_options: Joi.string().required(),
  date_created: Joi.string().required(),
  date_updated: Joi.string().required()
}

)

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
app.get('/sequence',(req,res)=> {
	res.sendFile(path.join(__dirname,'public/sequence.html'));
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
	db.getDB().collection(collectionSettings).find({},{projection:{name : 1}}).sort({_id:-1}).toArray((err,documents)=>{
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
	db.getDB().collection(collectionResults).find({},{projection:{settings_name : 1, date_created: 1, short_title:1, notes:1}}).sort({_id:-1}).toArray((err,documents)=>{
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

app.get('/best_fitness_per_generation/:id',cors(corsOptions), (req,res)=>{
	const resultID = req.params.id;
  console.log("best_fitness_per_generation with id " + resultID);
  let ids = JSON.parse(resultID);
  let ids_mongo = [];
  for(let i = 0; i < ids.length;i++){
    ids_mongo.push(db.getPrimaryKey(ids[i]));
  }
  db.getDB().collection(collectionResults).find({_id : {$in: ids_mongo}},{_id:1,'ga_results':1}).toArray((err,documents)=>{
		if(err){
			console.log("error getting results using ID " + err);
		}
		else{
      //console.log(documents);
      console.log(documents.length + " docs");
      //get back an array, need to parse out "generations":[{"best_race_time":1234.12,"stats_average_time":344.43}]
      let return_data = [];
      let short_titles = [];
      //first put in the short titles (first array in results array)
        for(let i = 0; i < documents.length; i++){
          if(documents[i].short_title){
              short_titles.push(documents[i].short_title);
          }
          else{
              short_titles.push("Data " + (i+1));
          }
        }

        return_data.push(short_titles);

      for(let i = 0; i < documents.length; i++){
        let return_data_entry = [];
        //results are actually a string so need to convert back
        let ga_results = JSON.parse(documents[i].ga_results);
        let gens = ga_results["generations"];

        // go through generations and add best_race_time for each
         for(let j = 0; j < gens.length; j++){
           return_data_entry.push(gens[j].best_race_time)
         }
        return_data.push(return_data_entry);
      }

			res.json(return_data);
		}
	});
});

app.options('/update_results/:id', cors())
app.post('/update_results/:id',cors(corsOptions),(req,res)=>{
  const results_id = req.params.id;
	const result_settings = req.body;
  console.log("updating result ", results_id);
	 db.getDB().collection(collectionResults).findOneAndUpdate({_id : db.getPrimaryKey(results_id)},{$set : {short_title : result_settings.short_title,notes : result_settings.notes}},{returnOriginal : false},(err,result)=>{
	    if(err){
			console.log("error when updating err = " + err);
		}
		else{
			res.json(result);
		}
	});
});

/******SEQUENCES**********/
app.get('/getSequences',cors(corsOptions), (req,res)=>{
	db.getDB().collection(collectionSequences).find({},{projection:{sequence_name : 1, settings_id:1, date_updated: 1, notes:1}}).sort({_id:-1}).toArray((err,documents)=>{
		if(err){
			console.log("error getting collection of sequences:  err " + err);
		}
		else{
				console.log("getting list of sequences");
			  res.json(documents);
		}
	});
});

app.get('/getSequence/:id',cors(corsOptions), (req,res)=>{
	const seqID = req.params.id;
	db.getDB().collection(collectionSequences).find({_id : db.getPrimaryKey(seqID)}).toArray((err,documents)=>{
		if(err){
			console.log("error getting sequence using ID " + err);
		}
		else{
			console.log("getting results for specific seq. id");
			res.json(documents);
		}
	});
});

app.options('/update_sequence/:id', cors())
app.post('/update_sequence/:id',cors(corsOptions),(req,res)=>{
  const sequence_id = req.params.id;
	const sequence_settings = req.body;
  console.log("updating sequence ", sequence_id);
  console.log(sequence_settings);
  
	 db.getDB().collection(collectionSequences).findOneAndUpdate({_id : db.getPrimaryKey(sequence_id)},{$set : {sequence_name : sequence_settings.sequence_name,notes : sequence_settings.notes, settings_id : sequence_settings.settings_id, sequence_options : sequence_settings.sequence_options, date_updated : sequence_settings.date_updated}},{returnOriginal : false},(err,result)=>{
	    if(err){
			console.log("error when updating sequence err = " + err);
		}
		else{
			res.json(result);
		}
	});
});

app.options('/add_sequence', cors())
app.post("/add_sequence",cors(),(req,res,next) => {
	const userInput = req.body;
	console.log("save new sequence");
	Joi.validate(userInput, schemaSequence, (err,result) =>{
		if(err){
			const error = new Error("Invalid Input adding sequence");
			console.log(err);
			error.status = 400;
			next(error);
		}
		else{
      let newSettings = {sequence_name : userInput.sequence_name,
        notes : userInput.notes,
        settings_id : userInput.settings_id,
        sequence_options : userInput.sequence_options,
        date_created : userInput.date_created,
        date_updated : userInput.date_updated};

			db.getDB().collection(collectionSequences).insertOne(newSettings,(err,result)=>{
				if(err){
					const error = new Error("Sols, failed to insert new sequence");
					console.log(err);
					error.status = 400;
					next(error);
				}
				else{
					res.json({result:result.result, document: result.ops[0],msg:"Yay, successfully inserted new sequence",err:null});
				}
			});
		}
	})

});
