const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Joi = require('joi');
const db = require('./db');
const app = express();
const collection = "todo";

const schema = Joi.object().keys({
	todo:Joi.string().required()
});

app.use(bodyParser.json());





app.get('/',(req,res)=> {
	res.sendFile(path.join(__dirname,'index.html'));
});

app.get('/getTodos',(req,res)=>{
	db.getDB().collection(collection).find({}).toArray((err,documents)=>{
		if(err){
			console.log("error getting collection err " + err);

		}
		else{
			console.log(documents);
			res.json(documents);
		}
	});
});

app.put('/:id',(req,res)=>{
	const todoID = req.params.id;
	const userInput = req.body;
	console.log("update existing todo using id");
	console.log("id " + todoID + " body " + userInput.todo);

	db.getDB().collection(collection).findOneAndUpdate({_id : db.getPrimaryKey(todoID)},{$set : {todo : userInput.todo}},{returnOriginal : false},(err,result)=>{
		if(err){
			console.log("error when updating err = " + err);
		}
		else{
			res.json(result);
		}

	});
});

app.post("/",(req,res,next) => {
	const userInput = req.body;

	Joi.validate(userInput, schema, (err,result) =>{
		if(err){
			const error = new Error("Invalid Input adding todo");
			error.status = 400;
			next(error);
		}
		else{
			db.getDB().collection(collection).insertOne(userInput,(err,result)=>{
				if(err){
					const error = new Error("Failed to insert todo");
					error.status = 400;
					next(error);
				}
				else{
					res.json({result:result.result, document: result.ops[0],msg:"Successfully inserted todo",err:null});
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
		app.listen(3000,()=>{
			console.log('connected to database... listening on port 3000');
		});
	}
});
