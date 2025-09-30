const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Joi = require('joi');
const db = require('./db');
const app = express();
const collectionSettings = "experiment_settings";
const collectionResults = "experiment_results";
const collectionSequences = "experiment_sequences";
const collectionTestSuite = "test_suite_functions";

var ObjectId = require('mongodb').ObjectID;

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
  tags:Joi.string().allow(""),
  global_settings:Joi.object().required(),
  race_settings:Joi.object().required(),
  rider_settings:Joi.array().required(),
  date_created: Joi.string().required()
});

const schemaSequence = Joi.object().keys({
  sequence_name:Joi.string().required(),
  notes:Joi.string().required(),
  tags:Joi.string().allow(""),
  settings_id:Joi.string().required(),
  sequence_options: Joi.object().required(),
  date_created: Joi.string().required(),
  date_updated: Joi.string().required()
});

const schemaTestSuiteFunction = Joi.object().keys({
  name:Joi.string().required(),
  function:Joi.string().required(),
  ga_settings:Joi.string().optional()
});

const getDateTime = (format) => {
  let t = new Date();
  let datestring = "";
  if (format=="nospace"){
    dateString = t.getFullYear() + "-" + (t.getUTCMonth()+1) + "-" + t.getUTCDate() + "-" + t.getHours() + "-" + t.getMinutes() + "-" + t.getSeconds();
  }
  else if (format=="notime"){
    dateString = t.getFullYear() + "-" + (t.getUTCMonth()+1) + "-" + t.getUTCDate();
  }
  else{
    dateString = t.getFullYear() + "-" + (t.getUTCMonth()+1) + "-" + t.getUTCDate() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds();
  }
  return dateString;
}


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
app.get('/tpgamebreakaway',(req,res)=> {
  res.sendFile(path.join(__dirname,'public/tpgamebreakaway.html'));
});
app.get('/results',(req,res)=> {
  res.sendFile(path.join(__dirname,'public/results.html'));
});
app.get('/about',(req,res)=> {
  res.sendFile(path.join(__dirname,'public/about.html'));
});
app.get('/test_suite',(req,res)=> {
  res.sendFile(path.join(__dirname,'public/test_suite.html'));
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
          tags : userInput.tags,
          date_created: userInput.date_created};

          db.getDB().collection(collectionResults).insertOne(newExperimentResults,(err,result)=>{
            if(err){
              const error = new Error("Failed to insert new experiment settings");
              console.log("*******ERROR SAVING EXPERIMENT RESULTS*******");
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
      db.getDB().collection(collectionResults).find({},{projection:{settings_name : 1, date_created: 1, short_title:1, notes:1, tags:1}}).sort({_id:-1}).toArray((err,documents)=>{
        if(err){
          console.log("error getting collection of result names:  err " + err);
        }
        else{
          console.log("getting list of results");
          res.json(documents);
        }
      });
    });

    app.get('/searchResults/:searchTerm',cors(corsOptions), (req,res)=>{
      const searchTerm = req.params.searchTerm;
      console.log("Search results with tags " + searchTerm);


      // search text indexes, or is it an index named text, for the string
      // only search for the id if it loks valid
      let validId = false;
      if (ObjectId.isValid(searchTerm) && (String(new ObjectId(searchTerm)) === searchTerm)){
        validId = true;
      }
      if(validId){
        db.getDB().collection(collectionResults).find({ $or: [{ "_id" : ObjectId(searchTerm)}, {$text: { $search: "\""+ searchTerm +"\"" }}]},{projection:{settings_name : 1, date_created: 1, short_title:1, notes:1, tags:1}}).sort({_id:-1}).toArray((err,documents)=>{
          if(err){
            console.log("error searching collection of results with id and tags/notes:  err " + err);
          }
          else{
            console.log("searching list of search results on id/tags/notes");
            res.json(documents);
          }
        });
      }
      else{
        //search tags and notes only
        db.getDB().collection(collectionResults).find({$text: { $search: "\""+ searchTerm +"\"" }},{projection:{settings_name : 1, date_created: 1, short_title:1, notes:1, tags:1}}).sort({_id:-1}).toArray((err,documents)=>{
          if(err){
            console.log("error searching collection of results with tags/notes:  err " + err);
          }
          else{
            console.log("searching list of search results on tags/notes");
            res.json(documents);
          }
        });
      }

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

    app.get('/best_in_final_gen_tests/:id',cors(corsOptions), (req,res)=>{
      const resultID = req.params.id;
      console.log("best_in_final_gen_tests with ids " + resultID);
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
          let return_data = [];

          //aim is to get the test data, currently fixed to noise data, not very dynamic

          for(let i = 0; i < documents.length; i++){
            let return_data_element = {};
            return_data_element.best_in_final_gen_noise_value = 0;
            return_data_element.data_rows = [];

            let ga_settings_c = JSON.parse(documents[i].global_settings);
            //this is very specific and arbitrary and a new graph or more general solution would be needed for any extensions
            return_data_element.best_in_final_gen_noise_value = ga_settings_c.noise_1_probability_instruction_misheard;


            //results are actually a string so need to convert back
            let ga_results = JSON.parse(documents[i].ga_results);
            console.log("*****> ga_results");
            //console.log(ga_results);

            let best_in_final_gen_test_results = ga_results["generations"][ga_results["generations"].length-1]["best_in_gen_tests_results"];

            console.log("****> best_in_final_gen_test_results");
            console.log(best_in_final_gen_test_results);

            return_data_element.data_rows.push(best_in_final_gen_test_results);
            return_data.push(return_data_element);
          }

          res.json(return_data);
        }
      });
    });

    app.get('/best_in_gen_robustness_test_times/:id/:gen',cors(corsOptions), (req,res)=>{
      const resultID = req.params.id;
      const generationID = req.params.gen;

      console.log("best_in_gen_robustness_test_times with ids " + resultID + " and generation " + generationID);
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
          let return_data = [];

          //aim is to get the robustness data for the selected generation

          for(let i = 0; i < documents.length; i++){
            let return_data_element = {};
            return_data_element.experiment_id = documents[i]._id;

            return_data_element.mutant_times = [];
            return_data_element.variation_times = [];
            return_data_element.best_race_time = 0;
            let ga_results = JSON.parse(documents[i].ga_results);

            //get the specified generation OR the LAST one if -1 is sent in

            let selected_generationID = generationID;
            if(generationID == -1){
              selected_generationID = ga_results.generations.length - 1;
            }
            return_data_element.selected_generation = selected_generationID;
            return_data_element.best_race_time = ga_results.generations[selected_generationID].best_race_time;
            return_data_element.mutant_times =  ga_results.generations[selected_generationID].robustness_mutation_results.mutant_times;
            return_data_element.variation_times = ga_results.generations[selected_generationID].robustness_variation_results.robustness_single_mutation_times_systematic;
            console.log(">> returning robustness mutant and variant times <<");
            return_data.push(return_data_element);
          }

          res.json(return_data);
        }
      });
    });

    app.get('/cup_noise_events/:id/:gen',cors(corsOptions), (req,res)=>{
      const resultID = req.params.id;
      const generationID = req.params.gen;

      console.log("cup_noise_events with ids " + resultID + " and generation " + generationID);
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
          let return_data = [];

          //aim is to get the robustness data for the selected generation

          for(let i = 0; i < documents.length; i++){
            let return_data_element = {};
            return_data_element.experiment_id = documents[i]._id;
            return_data_element.choke_under_pressure_events = [];
            return_data_element.average_race_time = [];
            return_data_element.best_race_time = 0;
            let ga_results = JSON.parse(documents[i].ga_results);

            //get the specified generation OR the LAST one if -1 is sent in

            let selected_generationID = generationID;
            if(generationID == -1){
              selected_generationID = ga_results.generations.length - 1;
            }
            return_data_element.selected_generation = selected_generationID;
            return_data_element.best_race_time = ga_results.generations[selected_generationID].best_race_time;
            return_data_element.average_race_time =  ga_results.generations[selected_generationID].stats_average_time;
            return_data_element.choke_under_pressure_events = ga_results.generations[selected_generationID].choke_event_timestep_pairs;
            console.log(">> returning c.u.p. events array <<");
            return_data.push(return_data_element);
          }

          res.json(return_data);
        }
      });
    });


    app.get('/over_eagerness_event_arrays/:id/:gen',cors(corsOptions), (req,res)=>{
      const resultID = req.params.id;
      const generationID = req.params.gen;

      console.log("over_eagerness_event_arrays with ids " + resultID + " and generation " + generationID);
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
          let return_data = [];

          //aim is to get the robustness data for the selected generation

          for(let i = 0; i < documents.length; i++){
            let return_data_element = {};
            return_data_element.experiment_id = documents[i]._id;
            return_data_element.generation_list_of_overeagerness_affected_effort_timesteps = [];
            return_data_element.generation_list_of_NON_overeagerness_affected_effort_timesteps = [];
            let ga_results = JSON.parse(documents[i].ga_results);

            //get the specified generation OR the LAST one if -1 is sent in

            let selected_generationID = generationID;
            if(generationID == -1){
              selected_generationID = ga_results.generations.length - 1;            }
            return_data_element.selected_generation = selected_generationID;
            return_data_element.generation_list_of_overeagerness_affected_effort_timesteps = ga_results.generations[selected_generationID].generation_list_of_overeagerness_affected_effort_timesteps;
            return_data_element.generation_list_of_NON_overeagerness_affected_effort_timesteps = ga_results.generations[selected_generationID].generation_list_of_NON_overeagerness_affected_effort_timesteps;
            console.log(">> returning overeagerness events array <<");
            return_data.push(return_data_element);
          }

          res.json(return_data);
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

    app.options('/deleteSelectedResults/:id', cors())
    app.post('/deleteSelectedResults/:id',cors(corsOptions),(req,res)=>{
      const resultID = req.params.id;
      console.log("delete results with ids " + resultID);
      let ids = JSON.parse(resultID);
      let ids_mongo = [];
      for(let i = 0; i < ids.length;i++){
        ids_mongo.push(db.getPrimaryKey(ids[i]));
      }

      db.getDB().collection(collectionResults).deleteMany({_id : {$in: ids_mongo}},(err,result)=>{
        if(err){
          console.log("error when deleting results err = " + err);
        }
        else{
          res.json(result);
        }
      });
    });


    app.options('/update_results/:id', cors())
    app.post('/update_results/:id',cors(corsOptions),(req,res)=>{
      const results_id = req.params.id;
      const result_settings = req.body;
      console.log("updating result ", results_id);
      db.getDB().collection(collectionResults).findOneAndUpdate({_id : db.getPrimaryKey(results_id)},{$set : {short_title : result_settings.short_title,notes : result_settings.notes,tags : result_settings.tags}},{returnOriginal : false},(err,result)=>{
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
      db.getDB().collection(collectionSequences).find({},{projection:{sequence_name : 1, tags : 1, settings_id:1, date_updated: 1, notes:1}}).sort({_id:-1}).toArray((err,documents)=>{
        if(err){
          console.log("error getting collection of sequences:  err " + err);
        }
        else{
          console.log("getting list of sequences");
          res.json(documents);
        }
      });
    });

    app.get('/searchSequences/:searchTerm',cors(corsOptions), (req,res)=>{

      const searchTerm = req.params.searchTerm;
      console.log("Search sequences (tags/notes) with term " + searchTerm);

      // search text indexes, or is it an index named text, for the string
      // only search for the id if it loks valid
      let validId = false;
      if (ObjectId.isValid(searchTerm) && (String(new ObjectId(searchTerm)) === searchTerm)){
        validId = true;
      }

      if(validId){
        // search text indexes, or is it an index named text, for the string.. may also be serchign via the id but only if it is in the valid format
        db.getDB().collection(collectionSequences).find({ $or: [{ "_id" : ObjectId(searchTerm)}, {$text: { $search: "\""+ searchTerm +"\"" }}]},{projection:{sequence_name : 1, tags : 1, settings_id:1, date_updated: 1, notes:1}}).sort({_id:-1}).toArray((err,documents)=>{
          if(err){
            console.log("error searching sequences:  err " + err);
          }
          else{
            console.log("searching sequences on id/tags/notes");
            res.json(documents);
          }
        });
      }
      else{
        // search text indexes, or is it an index named text, for the strin
        db.getDB().collection(collectionSequences).find({ $text: { $search: "\""+ searchTerm +"\"" } },{projection:{sequence_name : 1, tags : 1, settings_id:1, date_updated: 1, notes:1}}).sort({_id:-1}).toArray((err,documents)=>{
          if(err){
            console.log("error searching sequences:  err " + err);
          }
          else{
            console.log("searching sequences on tags/notes");
            res.json(documents);
          }
        });
      }


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

      db.getDB().collection(collectionSequences).findOneAndUpdate({_id : db.getPrimaryKey(sequence_id)},{$set : {sequence_name : sequence_settings.sequence_name,notes : sequence_settings.notes,tags : sequence_settings.tags, settings_id : sequence_settings.settings_id, sequence_options : sequence_settings.sequence_options, date_updated : sequence_settings.date_updated}},{returnOriginal : false},(err,result)=>{
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
            tags : userInput.tags,
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

      app.options('/deleteSelectedSequences/:id', cors())
      app.post('/deleteSelectedSequences/:id',cors(corsOptions),(req,res)=>{
        const resultID = req.params.id;
        console.log("delete sequences with ids " + resultID);
        let ids = JSON.parse(resultID);
        let ids_mongo = [];
        for(let i = 0; i < ids.length;i++){
          ids_mongo.push(db.getPrimaryKey(ids[i]));
        }

        db.getDB().collection(collectionSequences).deleteMany({_id : {$in: ids_mongo}},(err,result)=>{
          if(err){
            console.log("error when deleting sequences err = " + err);
          }
          else{
            res.json(result);
          }
        });
      });

      app.get('/getOldestActiveSequenceDetails',cors(corsOptions), (req,res)=>{
        db.getDB().collection(collectionSequences).find({'sequence_options.active':1}).sort({date_created:-1}).limit(1).toArray((err,documents)=>{
          if(err){
            console.log("error getting collection of active sequences:  err " + err);
          }
          else{
            console.log("getting list of active sequences");
            res.json(documents);
          }
        });
      });

      app.options('/assign_sequence_iteration/:id', cors())
      app.post('/assign_sequence_iteration/:id',cors(corsOptions),(req,res)=>{
        const sequence_id = req.params.id;
        const sequence_settings = req.body;

        console.log("updating sequence ", sequence_id);
        console.log(sequence_settings);
        dateString = getDateTime();

        db.getDB().collection(collectionSequences).findOneAndUpdate({_id : db.getPrimaryKey(sequence_id)},{$set : {'sequence_options.experiments' : sequence_settings, date_updated : dateString}},{returnOriginal : false},(err,result)=>{
          if(err){
            console.log("error when updating sequence err = " + err);
          }
          else{
            res.json(result);
          }
        });
      });

      app.options('/update_sequence_iteration/:id', cors())
      app.post('/update_sequence_iteration/:id',cors(corsOptions),(req,res)=>{
        const sequence_id = req.params.id;
        const sequence_settings = req.body;

        console.log("updating sequence ", sequence_id);
        console.log(sequence_settings);

        let t = new Date();
        dateString = t.getFullYear() + "-" + (t.getUTCMonth()+1) + "-" + t.getUTCDate() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds();

        db.getDB().collection(collectionSequences).findOneAndUpdate({_id : db.getPrimaryKey(sequence_id)},{$set : { "sequence_options.experiments.$[elem].status" : "complete" }

      },{  multi: true,
        returnOriginal : false,
        arrayFilters: [{ $and: [{"elem.client_id": sequence_settings.client_id}, {"elem.iteration": sequence_settings.iteration}] }]
      },(err,result)=>{
        if(err){
          console.log("error when updating sequence err = " + err);
        }
        else{
          res.json(result);
        }
      });
    });

    app.options('/deactivate_sequence/:id', cors())
    app.post('/deactivate_sequence/:id',cors(corsOptions),(req,res)=>{
      const sequence_id = req.params.id;
      console.log("deactivating sequence ", sequence_id);

      dateString = getDateTime();

      db.getDB().collection(collectionSequences).findOneAndUpdate({_id : db.getPrimaryKey(sequence_id)},{$set : {'sequence_options.active' : 0, 'date_updated' : dateString }},{returnOriginal : false},(err,result)=>{
        if(err){
          console.log("error when deactivating sequence err = " + err);
        }
        else{
          res.json(result);
        }
      });
    });

    //******* test_suite functions code START ********

    app.get('/getTestSuiteFunctionNames',cors(corsOptions), (req,res)=>{
      db.getDB().collection(collectionTestSuite).find({},{projection:{name : 1}}).sort({_id:-1}).toArray((err,documents)=>{
        if(err){
          console.log("error getting collection of test suite function names err " + err);
        }
        else{
          console.log("getting list of test suite function names");
          res.json(documents);
        }
      });
    });
    app.get('/getTestSuiteFunctionFromID/:id',cors(corsOptions), (req,res)=>{
      const functionID = req.params.id;
      console.log("Get test suite function ID " + functionID)
      db.getDB().collection(collectionTestSuite).find({_id : db.getPrimaryKey(functionID)}).toArray((err,documents)=>{
        if(err){
          console.log("error getting test suite function using ID " + err);
        }
        else{
          console.log("getting specific test suite function");
          res.json(documents);
        }
      });
    });


    app.options('/update_test_suite_function/:id', cors())
    app.post('/update_test_suite_function/:id',cors(corsOptions),(req,res)=>{
      const function_id = req.params.id;
      const userInput = req.body;
      console.log("updating existing test suite function  ", function_id);

      db.getDB().collection(collectionTestSuite).findOneAndUpdate({_id : db.getPrimaryKey(function_id)},{$set : {name : userInput.name, function : userInput.function, ga_settings:userInput.ga_settings}},{returnOriginal : false},(err,result)=>{
        if(err){
          console.log("error when updating test suite function err = " + err);
        }
        else{
          res.json(result);
        }
      });
    });

    app.options('/new_test_suite_function', cors())
    app.post("/new_test_suite_function",cors(),(req,res,next) => {
      const userInput = req.body;
      console.log("save new test suite function " + userInput);
      Joi.validate(userInput, schemaTestSuiteFunction, (err,result) =>{
        if(err){
          const error = new Error("Invalid Input adding new test suite function");
          console.log(err);
          error.status = 400;
          next(error);
        }
        else{
          let newSettings = {name : userInput.name,
            function : userInput.function,
            ga_settings: userInput.ga_settings};

            db.getDB().collection(collectionTestSuite).insertOne(newSettings,(err,result)=>{
              if(err){
                const error = new Error("Failed to insert new test suite function");
                console.log(err);
                error.status = 400;
                next(error);
              }
              else{
                res.json({result:result.result, document: result.ops[0],msg:"Successfully inserted new test suite function",err:null});
              }
            });
          }
        })

      });

      app.options('/deleteTestSuiteFunction/:id', cors())
      app.post('/deleteTestSuiteFunction/:id',cors(corsOptions),(req,res)=>{
        const resultID = req.params.id;
        console.log("delete test suite function with ids " + resultID);
        let ids = JSON.parse(resultID);
        let ids_mongo = [];
        for(let i = 0; i < ids.length;i++){
          ids_mongo.push(db.getPrimaryKey(ids[i]));
        }
        db.getDB().collection(collectionTestSuite).deleteMany({_id : {$in: ids_mongo}},(err,result)=>{
          if(err){
            console.log("error when deleting test suite err = " + err);
          }
          else{
              console.log("delete test suite function. ");
            res.json(result);
          }
        });
      });

  //******* test_suite functions code END ********
