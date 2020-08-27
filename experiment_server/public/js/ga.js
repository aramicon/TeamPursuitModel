
let chosen_global_settings = {};
let chosen_race_settings = {};
let chosen_rider_settings = {};
let selected_settings_id = 0;
let ga_results = {};


function showColName(c_name){
  $("#race_result_col").html(c_name);
}

function loadSingleRace(start_order,instructions, id){
  instructions = instructions.replace(/QQ/g, '"');
  $("#starting_order").val(start_order);
  $("#instructions").val(instructions);
  $("#single_race_label").html("Selected best race generation " + id)
}


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
        ga_results = e.data;
        $("#race_result_stats").html("Test Duration " + (end_time - start_time)/1000 + " seconds.");


        console.log("**results**");
        console.log(ga_results);
        build_results_table(ga_results);

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

function build_results_table(ga_results){
  console.log("build results table");
  console.log("**ga_results**");
  console.log(ga_results);
  let results_html = "<div>Start time: "+ga_results.start_time + " End Time: " + ga_results.end_time +  "</div>";
  results_html += "<table class='results_table'><tr><th>GEN</th><th>AVG. TIME</th><th>AVG. # Instructions</th><th>RACE</th><th>TIME</th><th>START</th><th>INSTRUCTIONS</th><th>VISUALISE</th><th># Crossovers</th> <th>AVG. Inst. ++</th><th>Avg. Inst. --</th><th>Avg. Inst. moved</th><th>Avg Effort changes</th><th>Avg. Drop changes.</th><th>Avg. Order shuffles.</th><th>Drop Inst/Total Inst</th><th># Variants</th> </tr>";

  for(g=0;g<ga_results.generations.length;g++){

    results_html += "<tr><td style='background-color:#aaaaaa;' ondblclick=\"loadSingleRace('"+ ga_results.generations[g].final_best_race_start_order+"','"+ JSON.stringify(ga_results.generations[g].final_best_race_instructions).replace(/"/g, 'QQ') +"','"+g+": "+ga_results.generations[g].best_race_id+ "(" + ga_results.generations[g].best_race_time +")"+ "')\" onmouseover=\"showColName('Generation')\">" + g + "</td><td onmouseover=\"showColName('Average Race Time')\"> " + ga_results.generations[g].stats_average_time + "</td><td onmouseover=\"showColName('Average Number of Instructions per race')\">" + ga_results.generations[g].stats_average_number_of_instructions + "</td><td onmouseover=\"showColName('Populaton index/ID')\">" + ga_results.generations[g].final_best_race_properties_index + "/" + ga_results.generations[g].best_race_id + "</td><td style='background-color:#aaffaa' onmouseover=\"showColName('Best Race Time (distance 2nd last/last timestep)')\">" + ga_results.generations[g].best_race_time + "(" + ga_results.generations[g].best_race_distance_2nd_last_timestep + "," +  ga_results.generations[g].best_race_distance_last_timestep  + ") </td><td onmouseover=\"showColName('Best race Start Order')\"> [" + ga_results.generations[g].final_best_race_start_order + "]</td><td onmouseover=\"showColName('Best Race Instructions')\">" + JSON.stringify(ga_results.generations[g].final_best_race_instructions) + "</td><td onmouseover=\"showColName('Run race in game model')\"><a  target='_blank' href = 'tpgame.html?source=ga&settings_id=" + selected_settings_id + "&startorder=" + encodeURI(ga_results.generations[g].final_best_race_start_order) + "&instructions=" + encodeURI(JSON.stringify(ga_results.generations[g].final_best_race_instructions)) + "'> Run </a></td>";

    //stats columns
    pop = ga_results.generations[g].population_size;

    results_html +="<td onmouseover=\"showColName('Total Number of Crossovers performed')\">" + ga_results.generations[g].number_of_crossovers_total + "/" + pop + "</td><td onmouseover=\"showColName('Average number of instructions added per race')\">" + (ga_results.generations[g].number_of_instructions_added_total/pop) + "</td><td onmouseover=\"showColName('Average number of instructions removed per race')\">" + ga_results.generations[g].number_of_instructions_removed_total/pop + "</td><td>" + ga_results.generations[g].number_of_instructions_moved_total/pop + "</td><td onmouseover=\"showColName('Average number of effort instruction values changed per race')\">" + ga_results.generations[g].number_of_effort_instructions_changed_total/pop + "</td><td onmouseover=\"showColName('Average number of drop instruction values changed per race')\">" + ga_results.generations[g].number_of_drop_instructions_changed_total/pop + "</td><td onmouseover=\"showColName('Number of start order shuffles')\">" + ga_results.generations[g].number_of_start_order_shuffles_total/pop  + "</td><td onmouseover=\"showColName('% of Drop instructions')\">" + ga_results.generations[g].number_of_drop_instructions_total + "/" + ga_results.generations[g].total_number_of_instructions + "</td><td onmouseover=\"showColName('Number of variants')\">" + ga_results.generations[g].variants_size+"</td>";

    results_html += "</tr>";

  }
  results_html += "</table>";

  console.log(results_html);

  $("#race_result").html(results_html);

}

function run_robustness_check(){
  let start_time = 0;

    console.log("Run Robustness Check for given start order and instructions race");

    $("#robustness_check_result").html("Running robustness check... wait...");

    let current_settings_global = JSON.parse($("#global_settings").val());
    let current_settings_race = JSON.parse($("#race_settings").val());
    let current_settings_rider = JSON.parse($("#rider_settings").val());
    let current_settings_option = $("#experiment_names").val();
    chosen_global_settings = current_settings_global;
    chosen_race_settings = current_settings_race;
    chosen_rider_settings = current_settings_rider;

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
      var gaWorker = new Worker("js/race_function_no_vis.js");
      gaWorker.onmessage = function(e) {
        let end_time = new Date().getTime();
        let result_data = e.data;
        console.log("Robustness Test Duration " + (end_time - start_time)/1000 + " seconds.");
        $("#robustness_check_result").html(result_data);
        //get rid of the thread
        gaWorker.terminate();
      }
      console.log("robustness chosen_rider_settings " + JSON.stringify(chosen_rider_settings));

      gaWorker.postMessage(["run_robustness_check",chosen_global_settings,chosen_race_settings,chosen_rider_settings]);
      start_time =  new Date().getTime();
      console.log('Robustness Check Message posted to worker');
    }
    else{
      console.log("Worker cannot be created, maybe not supported by this browser?");
    }

}

function run_consistency_check(){
  let start_time = 0;

    console.log("Run Consistency Check for given start order and instructions race");

    let current_settings_global = JSON.parse($("#global_settings").val());
    let current_settings_race = JSON.parse($("#race_settings").val());
    let current_settings_rider = JSON.parse($("#rider_settings").val());
    let current_settings_option = $("#experiment_names").val();
    chosen_global_settings = current_settings_global;
    chosen_race_settings = current_settings_race;
    chosen_rider_settings = current_settings_rider;

    $("#robustness_check_result").html("Running consistency check... wait...");

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
      var gaWorker = new Worker("js/race_function_no_vis.js");
      gaWorker.onmessage = function(e) {
        let end_time = new Date().getTime();
        let result_data = e.data;
        console.log("Consistency Test Duration " + (end_time - start_time)/1000 + " seconds.");
        $("#robustness_check_result").html(result_data);
        //get rid of the thread
        gaWorker.terminate();
      }
      gaWorker.postMessage(["run_consistency_check",chosen_global_settings,chosen_race_settings,chosen_rider_settings]);
      start_time =  new Date().getTime();
      console.log('Consistency Check Message posted to worker');
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
      console.log('data ' + JSON.stringify(data));


      //$("#database_connection_label").text("setting updated");
    $("#database_connection_label").html("<strong>Updated Settings "+data.value.name+"</strong> | _id | <span id = 'settings_id'>"+data.value._id + "</span>");

    }).catch((error) => {
      console.log("Error updating settings on experiment server");
      $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
      console.log(error)
  });
  }
  else{
    alert("Invalid Settings ID, cannot save, sols.")
  }
}




const addNewExperimentSettings = () => {

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

      $("#database_connection_label").text("setting updated");

      //need to make sure the correct ID (of the new settings) is updated
      console.log("saved as new settigns with data " +  data.document._id);
      selected_settings_id =data.document._id;

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

const  saveResults = () => {

  let serverURL = 'http://127.0.0.1:3003/new_experiment_results';
    $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

    let current_settings_global = $("#global_settings").val();
    let current_settings_race = $("#race_settings").val();
    let current_settings_rider = $("#rider_settings").val();
    let current_settings_option = $("#experiment_names").val();
      let notes = "";


      if ($("#save_results_notes").val()){
        notes = $("#save_results_notes").val();

      }


    if (ga_results.start_time && current_settings_global.length > 0 && current_settings_race.length > 0 && current_settings_rider.length > 0 && current_settings_option.length > 0){

      let dataToSend = {
              "ga_results":JSON.stringify(ga_results),
              "ga_settings_id":selected_settings_id,
              "global_settings":current_settings_global,
              "race_settings":current_settings_race,
              "rider_settings":current_settings_rider,
              "name":$("#new_settings_name").val(),
              "notes": notes,
              "date_created": new Date()
            };
    let jsonToSendS = JSON.stringify(dataToSend);

      $("#race_result_stats").html("Attempting to save results");
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
      console.log('data ' + JSON.stringify(data));

      $("#race_result_stats").html("results saved, id " + data.document._id);

    }).catch((error) => {
      console.log("Error savinf results on experiment server");
      $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
      console.log(error)
    });

  }
  else{
  alert("Cannot add new experiment results: check that settings are loaded and GA run")
  }
}




$(document).ready(function() {

  //attach events
  $("#button_play_race").on("click", run_single_race);
  $("#button_evolve_instructions").on("click", run_ga);
  $("#button_check_race_robustness").on("click", run_robustness_check);
  $("#button_check_race_consistency").on("click", run_consistency_check);
  $("#button_update_settings").on("click", updateExperimentSettings);
  $("#button_add_new_settings").on("click", addNewExperimentSettings);

  $("#button_save_results").on("click",saveResults);


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
