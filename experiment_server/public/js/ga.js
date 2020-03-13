
let chosen_global_settings = {};
let chosen_race_settings = {};
let chosen_rider_settings = {};
let selected_settings_id = 0;

function run_single_race(){
  console.log("Run single race");

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
    let singleRaceWorker = new Worker("js/race_function_no_vis.js");
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

    $("#race_result").html("Running generations of races... wait for results...");
    $("#cogs").css({"visibility":"visible"})

    if (window.Worker){
      var gaWorker = new Worker("js/race_function_no_vis.js");
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
            chosen_global_settings._id = $("#settings_id").text();
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
        $("#database_connection_label").html("<strong>Loaded Settings "+data[0].name+"</strong> | _id | <span id = 'settings_id'>"+data[0]._id + "</span>");
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
