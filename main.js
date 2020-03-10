//main.js handles page events and calls workers
import {settings} from './global_settings.js';
import {race} from './race_settings.js';
import {riders} from './riders.js';

let chosen_global_settings = settings;
let chosen_race_settings = race;
let chosen_rider_settings = riders;
let selected_settings_id = 0;

function run_single_race(){
  console.log("Run single race");
  update_race_settings();
  $("#single_race_result").html("running single race");
  //update settings
  let current_settings_global = JSON.parse($("#global_settings").val());
  let current_settings_race = JSON.parse($("#race_settings").val());
  let current_settings_rider = JSON.parse($("#rider_settings").val());
  let current_settings_option = $("#experiment_names").val();

  if (current_settings_option != 0){
    //we are loading settings
    if (current_settings_global.length == 0 || current_settings_race.length == 0 || current_settings_rider == 0){
      alert("Settings have not been loaded correctly")
    }
    else{
      console.log("load settings from experiment")
      chosen_global_settings = current_settings_global;
      chosen_race_settings = current_settings_race;
      chosen_rider_settings = current_settings_rider;
    }
  }

  let input_teamOrder = $('#starting_order').val().split(",").map(a=>+a);
  if(input_teamOrder.length > 0){
    chosen_race_settings.start_order = input_teamOrder;
    //console.log("updated race.start_order " + race.start_order )
  }
  chosen_race_settings.drop_instruction = 0;
  chosen_race_settings.live_instructions = [];
  chosen_race_settings.race_instructions = [];
  chosen_race_settings.race_instructions_r = [];

  let instructions_t = [];
  let new_instructions = $('#instructions').val();
  if(new_instructions.length > 5){
    //instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
    instructions_t = JSON.parse(new_instructions);
  }
  if (instructions_t.length > 0){
    chosen_race_settings.race_instructions_r = instructions_t;
  }
  //create a web worker and send it the details for the race
  if (window.Worker){
    let singleRaceWorker = new Worker("race_function_no_vis.js");
    let start_time = 0;
    singleRaceWorker.onmessage = function(e) {
      let end_time = new Date().getTime();
      let result = e.data;
      console.log('Single race result = ' + result + ' at ' + end_time);
      //get rid of the thread
      $("#single_race_result").html("Race Time: <strong>" + result + "</strong>. Test Duration " + (end_time - start_time)/1000 + " seconds.");
      singleRaceWorker.terminate();
    }
    singleRaceWorker.postMessage(["run_single_race",chosen_global_settings,chosen_race_settings,chosen_rider_settings]);
    start_time =  new Date().getTime();
    console.log('Single race message posted to worker at ' + start_time);
  }
  else{
    console.log("Worker cannot be created, maybe not supported by this browser?");
  }
}

function run_ga(){
  let start_time = 0;

    console.log("Run GA");
    update_race_settings();
    $("#race_result").html("Running generations of races... wait for results...");
    $("#cogs").css({"visibility":"visible"})

    if (window.Worker){
      var gaWorker = new Worker("race_function_no_vis.js");
      gaWorker.onmessage = function(e) {
        let end_time = new Date().getTime();
        let result_data = e.data;
        $("#race_result_stats").html("Test Duration " + (end_time - start_time)/1000 + " seconds.");
        $("#race_result").html(result_data);
        $("#cogs").css({"visibility":"hidden"})
        //get rid of the thread
        gaWorker.terminate();
      }

      try {
        let current_settings_global = JSON.parse($("#global_settings").val());
        let current_settings_race = JSON.parse($("#race_settings").val());
        let current_settings_rider = JSON.parse($("#rider_settings").val());
        let current_settings_option = $("#experiment_names").val();

        if (current_settings_option != 0){
          //we are loading settings
          if (current_settings_global.length == 0 || current_settings_race.length == 0 || current_settings_rider == 0){
            alert("Settings have not been loaded correctly")
          }
          else{
            console.log("load settings from experiment")
            chosen_global_settings = current_settings_global;
            chosen_race_settings = current_settings_race;
            chosen_rider_settings = current_settings_rider;
          }


        gaWorker.postMessage(["run_ga",chosen_global_settings,chosen_race_settings,chosen_rider_settings]);
        start_time =  new Date().getTime();
        console.log('GA Message posted to worker');
      }
      else{
        console.log("Worker cannot be created, maybe not supported by this browser?");
      }
  }
  catch(err) {
    $("#race_result").html("Error trying to run GA: " + err.message);
    $("#cogs").css({"visibility":"hidden"})
    console.log(err.message)
  }
}
}

function run_robustness_check(){
  let start_time = 0;

    console.log("Run Robustness Check for given start order and instructions race");
    update_race_settings();
    $("#robustness_check_result").html("Running robustness check... wait...");

    //update settings
    let input_teamOrder = $('#starting_order').val().split(",").map(a=>+a);
    if(input_teamOrder.length > 0){
      chosen_race_settings.start_order = input_teamOrder;
      //console.log("updated race.start_order " + race.start_order )
    }
    chosen_race_settings.drop_instruction = 0;
    chosen_race_settings.live_instructions = [];
    chosen_race_settings.race_instructions = [];
    chosen_race_settings.race_instructions_r = [];

    let instructions_t = [];
    let new_instructions = $('#instructions').val();
    if(new_instructions.length > 5){
      //instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
      instructions_t = JSON.parse(new_instructions);
    }
    if (instructions_t.length > 0){
      chosen_race_settings.race_instructions_r = instructions_t;
    }

    if (window.Worker){
      var gaWorker = new Worker("race_function_no_vis.js");
      gaWorker.onmessage = function(e) {
        let end_time = new Date().getTime();
        let result_data = e.data;
        console.log("Robustness Test Duration " + (end_time - start_time)/1000 + " seconds.");
        $("#robustness_check_result").html(result_data);
        //get rid of the thread
        gaWorker.terminate();
      }
      gaWorker.postMessage(["run_robustness_check",chosen_global_settings,chosen_race_settings,chosen_rider_settings]);
      start_time =  new Date().getTime();
      console.log('Robustness Check Message posted to worker');
    }
    else{
      console.log("Worker cannot be created, maybe not supported by this browser?");
    }

}

function update_race_settings(){
  let input_race_length = parseInt($('#input_race_length').val());
  if(Number.isInteger(input_race_length)){
    race.distance = input_race_length;
  }
  //frontalArea (drag)
  let input_frontalArea = parseFloat($('#frontalArea').val());
  if(!Number.isNaN(input_frontalArea)){
    settings.frontalArea = input_frontalArea;
  }
  let input_ga_probability_of_instruction_per_timestep_lower = parseFloat($('#ga_probability_of_instruction_per_timestep_lower').val());
  if(!Number.isNaN(input_ga_probability_of_instruction_per_timestep_lower)){
  	settings.ga_probability_of_instruction_per_timestep_lower = input_ga_probability_of_instruction_per_timestep_lower;
  }

  let ga_probability_of_instruction_per_timestep_upper = parseFloat($('#ga_probability_of_instruction_per_timestep_upper').val());
  if(!Number.isNaN(ga_probability_of_instruction_per_timestep_upper)){
  	settings.ga_probability_of_instruction_per_timestep_upper = ga_probability_of_instruction_per_timestep_upper;
  }

  let ga_population_size = parseInt($('#ga_population_size').val());
  if(!Number.isNaN(ga_population_size)){
  	settings.ga_population_size = ga_population_size;
  }

  let ga_team_size = parseInt($('#ga_team_size').val());
  if(!Number.isNaN(ga_team_size)){
  	settings.ga_team_size = ga_team_size;
  }

  let ga_number_of_generations = parseInt($('#ga_number_of_generations').val());
  if(!Number.isNaN(ga_number_of_generations)){
  	settings.ga_number_of_generations = ga_number_of_generations;
  }

  let ga_p_shuffle_start = parseFloat($('#ga_p_shuffle_start').val());
  if(!Number.isNaN(ga_p_shuffle_start)){
  	settings.ga_p_shuffle_start = ga_p_shuffle_start;
  }

  let ga_p_add_instruction = parseFloat($('#ga_p_add_instruction').val());
  if(!Number.isNaN(ga_p_add_instruction)){
  	settings.ga_p_add_instruction = ga_p_add_instruction;
  }

  let ga_p_delete_instruction = parseFloat($('#ga_p_delete_instruction').val());
  if(!Number.isNaN(ga_p_delete_instruction)){
  	settings.ga_p_delete_instruction = ga_p_delete_instruction;
  }

  let ga_p_crossover = parseFloat($('#ga_p_crossover').val());
  if(!Number.isNaN(ga_p_crossover)){
  	settings.ga_p_crossover = ga_p_crossover;
  }

  let ga_p_change_effort = parseFloat($('#ga_p_change_effort').val());
  if(!Number.isNaN(ga_p_change_effort)){
  	settings.ga_p_change_effort = ga_p_change_effort;
  }

  let ga_p_change_drop = parseFloat($('#ga_p_change_drop').val());
  if(!Number.isNaN(ga_p_change_drop)){
  	settings.ga_p_change_drop = ga_p_change_drop;
  }

  let ga_p_move_instruction = parseFloat($('#ga_p_move_instruction').val());
  if(!Number.isNaN(ga_p_move_instruction)){
  	settings.ga_p_move_instruction = ga_p_move_instruction;
  }

  let ga_probability_of_drop_instruction = parseFloat($('#ga_probability_of_drop_instruction').val());
  if(!Number.isNaN(ga_probability_of_drop_instruction)){
  	settings.ga_probability_of_drop_instruction = ga_probability_of_drop_instruction;
  }

  let ga_range_to_move_instruction = parseInt($('#ga_range_to_move_instruction').val());
  if(!Number.isNaN(ga_range_to_move_instruction)){
  	settings.ga_range_to_move_instruction = ga_range_to_move_instruction;
  }

  let ga_range_to_change_effort = parseFloat($('#ga_range_to_change_effort').val());
  if(!Number.isNaN(ga_range_to_change_effort)){
  	settings.ga_range_to_change_effort = ga_range_to_change_effort;
  }

  let ga_log_each_step = parseInt($('#ga_log_each_step').val());
  if(!Number.isNaN(ga_log_each_step)){
  	settings.ga_log_each_step = ga_log_each_step;
  }

  let input_ga_max_timestep = parseInt($('#ga_max_timestep').val());
    if(!Number.isNaN(input_ga_max_timestep)){
      settings.ga_max_timestep = input_ga_max_timestep;
  }
}

const updateExperimentSettings = () => {

  //only update if there's a selected id
  if (selected_settings_id.length > 1){
    let serverURL = 'http://127.0.0.1:3003/update_race_settings/'+selected_settings_id;
      $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");
      let current_settings_global = $("#global_settings").val();
      let current_settings_race = $("#race_settings").val();
      let current_settings_rider = $("#rider_settings").val();
      let current_settings_option = $("#experiment_names").val();
      let dataToSend = {
              "global_settings":current_settings_global,
              "race_settings":current_settings_race,
              "rider_settings":current_settings_rider,
              "name":$("#new_settings_name").val()
            };
    let jsonToSendS = JSON.stringify(dataToSend);
    console.log("jsonToSendS ", jsonToSendS);
    fetch(serverURL,{
      method : 'post',
      headers: {
    'Content-Type': 'application/json',
      },
      mode : 'cors',
      body : jsonToSendS
    }).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
            throw Error(response.statusText);
      }
    }).then((data)=>{
      //console.log('data ' + JSON.stringify(data));


      $("#database_connection_label").text("setting updated")

    }).catch((error) => {
      console.log("Error updating settings on experiment server");
      $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
      console.log(error)
  });

  }
  else{

    alert("Invalid Settings ID, sols.")
  }

}

const addNewExperimentSettings = () => {

  //only update if there's a selected id

    let serverURL = 'http://127.0.0.1:3003/new_race_settings';
      $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

      let current_settings_global = $("#global_settings").val();
      let current_settings_race = $("#race_settings").val();
      let current_settings_rider = $("#rider_settings").val();
      let current_settings_option = $("#experiment_names").val();

      if (current_settings_global.length > 0 && current_settings_race.length > 0 && current_settings_rider.length > 0 && current_settings_option.length > 0){


      let dataToSend = {
              "global_settings":current_settings_global,
              "race_settings":current_settings_race,
              "rider_settings":current_settings_rider,
              "name":$("#new_settings_name").val()
            };
    let jsonToSendS = JSON.stringify(dataToSend);
    console.log("jsonToSendS ", jsonToSendS);
    fetch(serverURL,{
      method : 'post',
      headers: {
    'Content-Type': 'application/json',
      },
      mode : 'cors',
      body : jsonToSendS
    }).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
            throw Error(response.statusText);
      }
    }).then((data)=>{
      //console.log('data ' + JSON.stringify(data));


      $("#database_connection_label").text("setting updated")

    }).catch((error) => {
      console.log("Error updating settings on experiment server");
      $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
      console.log(error)
  });

}
else{
  alert("Cannot add new settings: check that values are provided")
}

}



$(document).ready(function() {
  //attach events
  $("#button_play_race").on("click", run_single_race);
  $("#button_evolve_instructions").on("click", run_ga);
  $("#button_check_race_robustness").on("click", run_robustness_check);
  $("#button_update_settings").on("click", updateExperimentSettings);
  $("#button_add_new_settings").on("click", addNewExperimentSettings);


  // populate fields from global settings
  $('#starting_order').val(race.start_order.map(a=>a).join(","));
  $('#input_race_length').val(race.distance);
  $('#frontalArea').val(settings.frontalArea);
  $('#ga_max_timestep').val(settings.ga_max_timestep);
  $('#ga_probability_of_instruction_per_timestep_lower').val(settings.ga_probability_of_instruction_per_timestep_lower);
  $('#ga_probability_of_instruction_per_timestep_upper').val(settings.ga_probability_of_instruction_per_timestep_upper);
  $('#ga_population_size').val(settings.ga_population_size);
  $('#ga_team_size').val(settings.ga_team_size);
  $('#ga_number_of_generations').val(settings.ga_number_of_generations);
  $('#ga_p_shuffle_start').val(settings.ga_p_shuffle_start);
  $('#ga_p_add_instruction').val(settings.ga_p_add_instruction);
  $('#ga_p_delete_instruction').val(settings.ga_p_delete_instruction);
  $('#ga_p_change_effort').val(settings.ga_p_change_effort);
  $('#ga_p_crossover').val(settings.ga_p_crossover);
  $('#ga_p_change_drop').val(settings.ga_p_change_drop);
  $('#ga_p_move_instruction').val(settings.ga_p_move_instruction);
  $('#ga_probability_of_drop_instruction').val(settings.ga_probability_of_drop_instruction);
  $('#ga_range_to_move_instruction').val(settings.ga_range_to_move_instruction);
  $('#ga_range_to_change_effort').val(settings.ga_range_to_change_effort);
  $('#ga_log_each_step').val(settings.ga_log_each_step);

  //try to load settings from the experiment server

  const populateNamesDropdown = (data) => {
      const namesDropDown = $("#experiment_names");
      data.forEach((experiment_names) => {
        namesDropDown.append($('<option>', {value : experiment_names._id}).text(experiment_names.name));
    });
    //add a click event to the dropdown
    namesDropDown.change(()=>{
      let optionSelected = $(this).find("option:selected");
      let valueSelected  = optionSelected.val();

      //make a call to get the settings
      fetch('http://127.0.0.1:3003/getExperimentSettingFromID/' + valueSelected,{method : 'get'}).then((response)=>{
        return response.json()
      }).then((data)=>{
      //  console.log('data ' + JSON.stringify(data));
        //console.log('data ' + JSON.stringify(data[0].global_settings) );
        console.log(data);
        $("#global_settings").val(data[0].global_settings);
        $("#race_settings").val(data[0].race_settings);
        $("#rider_settings").val(data[0].rider_settings);
        $("#database_connection_label").html("<strong>Loaded Settings "+data[0].name+"</strong>");
        $("#new_settings_name").val(data[0].name);
        //set the id (global)
        selected_settings_id = data[0]._id;
        //populateNamesDropdown(data);
      });
    }

      // alert(valueSelected);
    );
  }
  const getExperimentNames = () => {

    let serverURL = 'http://127.0.0.1:3003/getExperimentSettingNames/';
      $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>")

    fetch(serverURL,{method : 'get'}).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
            throw Error(response.statusText);
      }
    }).then((data)=>{
      //console.log('data ' + JSON.stringify(data));

      console.log("data.length " + data.length);
      populateNamesDropdown(data);
      $("#database_connection_label").text(data.length + " settings found.")

    }).catch((error) => {
      console.log("Error loading settings from experiment server");
      $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
      console.log(error)
});
  }
  getExperimentNames();

}
);
