let browser_client_id = "";
let chosen_global_settings = {};
let chosen_race_settings = {};
let chosen_rider_settings = {};
let selected_settings_id = 0;
let ga_results = {};

let sequences_mode = 0; //mode switch to run or not run sequences
let sequence_experiment_underway = 0;
let sequence_selected_seq_id = 0;
let sequence_selected_iteration = 0;
let sequence_iteration_variations = []; //used to apply variations to a sequence experiment

let rider_power_data = [];

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
      let end_time = getDateTime();
      let result = e.data;
      console.log('Single race result = ' + JSON.stringify(result) + ' at ' + end_time);

      //set the power so it can be graphed
      rider_power_data = result.power_output;

      //get rid of the thread

      $("#single_race_result").html("Race Time: <strong>" + result.time_taken + "</strong>. Test Duration " + (end_time - start_time)/1000 + " seconds.");
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

function run_ga(callback_func){
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

      //IF we are in sequence mode, we need to now automatically save the results, update the sequence details, and kick off the periodic check-for-sequence routine again
      if(sequences_mode == 1){
        console.log("@sequences_mode: experiment web worker returned, sequence mode running");
        console.log("@sequences_mode: browser_client_id " + browser_client_id+  " sequence_selected_seq_id " + sequence_selected_seq_id + " sequence_selected_iteration " + sequence_selected_iteration);
        if (browser_client_id && sequence_selected_seq_id && sequence_selected_iteration){

          console.log("@sequences_mode: save results");
          saveResults();
          //update the experiment details (again)
          console.log("@sequences_mode:update sequence info");
          serverURL = 'http://127.0.0.1:3003/update_sequence_iteration/'+sequence_selected_seq_id;

          $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

          let dataObject = {
            "client_id":browser_client_id,
            "iteration":sequence_selected_iteration
          };
          fetch(serverURL,{
            method : 'post',
            headers: {
              'Content-Type': 'application/json',
            },
            mode : 'cors',
            body : JSON.stringify(dataObject)
          }).then((response)=>{
            console.log(response);
            return response.json();
            if (!response.ok) {
              throw Error(response.statusText);
            }
          }).then((data)=>{
            console.log('@sequences_mode: updated sequence after running experiment, data ' + JSON.stringify(data));

            //finished running and it ran ok, can now look to do another experiment
            console.log("@sequences_mode: restart the check_for_sequences timer");
            sequence_experiment_underway = 0;
            setTimeout(check_for_sequences, 10.0*1000);

            $("#database_connection_label").html("<strong>Updated Settings "+data.value.name+"</strong> | _id | <span id = 'settings_id'>"+data.value._id + "</span>");

          }).catch((error) => {
            console.log("@sequences_mode: Error updating sequence after running experiment (on experiment server)");
            $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
            console.log(error);
          });
          //reset globals, should these be outside the fetches?
          sequence_selected_seq_id = 0;
          sequence_selected_iteration = 0;
        }
      }
    }
    try {
      //do nada if no settings are shown
      if($("#global_settings").val().length < 25){ //assuming that the instructions will be longer than 24 chars
        alert("No experiment selected");
        $("#cogs").css({"visibility":"hidden"})
      }
      else{
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

          console.log("****Rider settings before GA is run****");
          console.log(JSON.stringify(current_settings_rider));

          gaWorker.postMessage(["run_ga",chosen_global_settings,chosen_race_settings,chosen_rider_settings]);
          start_time =  new Date().getTime();
          console.log('GA Message posted to worker');
        }
        else{
          console.log("Worker cannot be created, maybe not supported by this browser?");
        }
      }
      }
      catch(err) {
        $("#race_result").html("Error trying to run GA: " + err.message);
        $("#cogs").css({"visibility":"hidden"})
        console.log(err);
      }
    }

    //if a callback funciton was sent, run it
    if(callback_func){
      //dk_2021 was sending a click event, need to run only if it is a function
      if (typeof callback_func === 'function') {
        console.log("## RUN CALLBACK FUNCTION ##");
        callback_func();
    }
  }
}

function build_results_table(ga_results){
  console.log("build results table");
  console.log("**ga_results**");
  console.log(ga_results);
  let results_html = "<div>Start time: "+ga_results.start_time + " End Time: " + ga_results.end_time +  "</div>";
  results_html += "<table class='results_table'><tr><th>GEN</th><th>AVG. TIME</th><th>AVG. # Instructions</th><th>RACE</th><th>TIME</th><th>START</th><th>INSTRUCTIONS</th><th>NOISE</th><th>VISUALISE</th><th># Crossovers</th> <th>AVG. Inst. ++</th><th>Avg. Inst. --</th><th>Avg. Inst. moved</th><th>Avg Effort changes</th><th>Avg. Drop changes.</th><th>Avg. Order shuffles.</th><th>Drop Inst/Total Inst</th><th># Variants</th> <th>Choke Under Pressure Noise</th><th>Overeagerness Noise</th></tr>";

  //for(g=0;g<ga_results.generations.length;g++){
  for(g=(ga_results.generations.length-1);g>=0;g--){

    results_html += "<tr><td style='background-color:#aaaaaa;' ondblclick=\"loadSingleRace('"+ ga_results.generations[g].final_best_race_start_order+"','"+ JSON.stringify(ga_results.generations[g].final_best_race_instructions).replace(/"/g, 'QQ') +"','"+g+": "+ga_results.generations[g].best_race_id+ "(" + ga_results.generations[g].best_race_time +")"+ "')\" onmouseover=\"showColName('Generation')\"><strong>" + g + "</strong></td><td onmouseover=\"showColName('Average Race Time')\"> " + ga_results.generations[g].stats_average_time + "</td><td onmouseover=\"showColName('Average Number of Instructions per race')\">" + ga_results.generations[g].stats_average_number_of_instructions + "</td><td onmouseover=\"showColName('Populaton index/ID')\">" + ga_results.generations[g].final_best_race_properties_index + "/" + ga_results.generations[g].best_race_id + "</td><td style='background-color:#aaffaa' onmouseover=\"showColName('Best Race Time (distance 2nd last/last timestep)')\">" + ga_results.generations[g].best_race_time + "(" + ga_results.generations[g].best_race_distance_2nd_last_timestep + "," +  ga_results.generations[g].best_race_distance_last_timestep  + ") </td><td onmouseover=\"showColName('Best race Start Order')\"> [" + ga_results.generations[g].final_best_race_start_order + "]</td><td onmouseover=\"showColName('Best Race Instructions')\">" + JSON.stringify(ga_results.generations[g].final_best_race_instructions) + "</td><td onmouseover=\"showColName('Noise alterations applied during race')\">" + JSON.stringify(ga_results.generations[g].best_race_instruction_noise_alterations) + "</td><td onmouseover=\"showColName('Run race in game model')\"><a  target='_blank' href = 'tpgame.html?source=ga&settings_id=" + selected_settings_id + "&startorder=" + encodeURI(ga_results.generations[g].final_best_race_start_order) + "&instructions=" + encodeURI(JSON.stringify(ga_results.generations[g].final_best_race_instructions)) + "'> Run </a></td>";

    //stats columns
    pop = ga_results.generations[g].population_size;

    results_html +="<td onmouseover=\"showColName('Total Number of Crossovers performed')\">" + ga_results.generations[g].number_of_crossovers_total + "/" + pop + "</td><td onmouseover=\"showColName('Average number of instructions added per race')\">" + (ga_results.generations[g].number_of_instructions_added_total/pop) + "</td><td onmouseover=\"showColName('Average number of instructions removed per race')\">" + ga_results.generations[g].number_of_instructions_removed_total/pop + "</td><td>" + ga_results.generations[g].number_of_instructions_moved_total/pop + "</td><td onmouseover=\"showColName('Average number of effort instruction values changed per race')\">" + ga_results.generations[g].number_of_effort_instructions_changed_total/pop + "</td><td onmouseover=\"showColName('Average number of drop instruction values changed per race')\">" + ga_results.generations[g].number_of_drop_instructions_changed_total/pop + "</td><td onmouseover=\"showColName('Number of start order shuffles')\">" + ga_results.generations[g].number_of_start_order_shuffles_total/pop  + "</td><td onmouseover=\"showColName('% of Drop instructions')\">" + ga_results.generations[g].number_of_drop_instructions_total + "/" + ga_results.generations[g].total_number_of_instructions + "</td><td onmouseover=\"showColName('Number of variants')\">" + ga_results.generations[g].variants_size+"</td>"+ "</td><td onmouseover=\"showColName('Choke under pressure noise')\">" + JSON.stringify(ga_results.generations[g].best_race_instruction_noise_choke_under_pressure)+"</td><td onmouseover=\"showColName('Overeagerness')\">" + JSON.stringify(ga_results.generations[g].best_race_instruction_noise_overeagerness);

    results_html += "</tr>";

  }
  results_html += "</table>";

  //console.log(results_html);

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
      console.log(error);
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
      console.log(error);
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
  let tags = "";

  if ($("#save_results_notes").val()){
    notes = $("#save_results_notes").val();
  }
  if ($("#save_results_tags").val()){
    tags = $("#save_results_tags").val();
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
      "tags": tags,
      "date_created": getDateTime()
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
      console.log(error);
    });

  }
  else{
    alert("Cannot add new experiment results: check that settings are loaded and GA run")
  }
}


function draw_power_graph(){
  draw_line_graph("power_graph");

}


function draw_line_graph(graph_name_opt){

  let graph_name = graph_name_opt;

  switch(graph_name) {
    case "power_graph":

    let graph_title ="unknown";
    let graph_data_1 = {};
    let graph_data_2 = {};
    let graph_data_3 = {};
    let graph_data_4 = {};

    //set the data based on the selection
    if (graph_name=="power_graph"){

      graph_title = "Rider Power Output";
      graph_data_1 = {};

      graph_data_1.title = "Rider 1";

      graph_data_1.x_label = "Watts";
      graph_data_1.y_label = "Timestep";

      graph_data_1.x_scale_from = 0;

      //need to get the max power used by any rider
      let max_p = 0;
      for(let i = 0; i< rider_power_data.length;i++){
        let max_i = d3.max(rider_power_data[i]);
        if (max_i > max_p){
          max_p = max_i;
        }
      }

      if (typeof(rider_power_data[0]) == "undefined") {
        console.log("Error trying to draw power graph");
        console.log("rider_power_data  = " + rider_power_data);
      }

      graph_data_1.x_scale_to = rider_power_data[0].length;

      graph_data_1.y_scale_from = 0;
      graph_data_1.y_scale_to = max_p;

      graph_data_1.data = [];
      for (let i=0;i<rider_power_data[0].length;i++){
        graph_data_1.data.push({x:i, y:rider_power_data[0][i]});
      }

      graph_data_2 = {};
      graph_data_2.title = "Rider 2";
      graph_data_2.data = [];
      for (let i=0;i<rider_power_data[1].length;i++){
        graph_data_2.data.push({x:i, y:rider_power_data[1][i]});
      }

      graph_data_3 = {};
      graph_data_3.title = "Rider 3";
      graph_data_3.data = [];
      for (let i=0;i<rider_power_data[2].length;i++){
        graph_data_3.data.push({x:i, y:rider_power_data[2][i]});
      }

      graph_data_4 = {};
      graph_data_4.title = "Rider 4";
      graph_data_4.data = [];
      for (let i=0;i<rider_power_data[3].length;i++){
        graph_data_4.data.push({x:i, y:rider_power_data[3][i]});
      }
    }

    //D3
    // set the dimensions and margins of the graph
    let totalWidth = 900;
    let totalHeight = 440;
    let legendLeftIndent = 280;
    let bulletIndent = 20;

    var margin = {top: 30, right: legendLeftIndent, bottom: 30, left: 60},
    width = totalWidth - margin.left - margin.right,
    height = totalHeight - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#graph")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");
    //  data = selected_ga_results;

    // Add X axis --> it is a date format
    var x = d3.scaleLinear()
    .domain([graph_data_1.x_scale_from, graph_data_1.x_scale_to])
    .range([ 0, width ]);
    svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

    // Add Y axis
    var y = d3.scaleLinear()
    .domain([graph_data_1.y_scale_from, graph_data_1.y_scale_to])
    .range([ height, 0 ]);
    svg.append("g")
    .call(d3.axisLeft(y));

    // Add the line 1
    svg.append("path")
    .datum(graph_data_1.data)
    .attr("fill", "none")
    .attr("stroke", "#0000ff")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
    .x(function(d) { return x(d.x) })
    .y(function(d) { return y(d.y) })
  );

  if (!jQuery.isEmptyObject(graph_data_2)){
    //draw second line if data is given
    svg.append("path")
    .datum(graph_data_2.data)
    .attr("fill", "none")
    .attr("stroke", "#ff0000")
    .attr("stroke-width", 1.5)
    .attr("d", d3.line()
    .x(function(d) { return x(d.x) })
    .y(function(d) { return y(d.y) })
  );
}

if (!jQuery.isEmptyObject(graph_data_3)){
  //draw second line if data is given
  svg.append("path")
  .datum(graph_data_3.data)
  .attr("fill", "none")
  .attr("stroke", "#00ff00")
  .attr("stroke-width", 1.5)
  .attr("d", d3.line()
  .x(function(d) { return x(d.x) })
  .y(function(d) { return y(d.y) })
);
}
if (!jQuery.isEmptyObject(graph_data_4)){
  //draw second line if data is given
  svg.append("path")
  .datum(graph_data_4.data)
  .attr("fill", "none")
  .attr("stroke", "#000000")
  .attr("stroke-width", 1.5)
  .attr("d", d3.line()
  .x(function(d) { return x(d.x) })
  .y(function(d) { return y(d.y) })
);
}

// X and Y labels
svg.append("text")
.attr("class", "x label")
.attr("text-anchor", "end")
.attr("x", width)
.attr("y", height - 6)
.text(graph_data_1.x_label); // e.g. "GA Generation"

svg.append("text")
.attr("class", "y label")
.attr("text-anchor", "end")
.attr("x", -220)
.attr("y", 6)
.attr("dy", ".75em")
.attr("transform", "rotate(-90)")
.text(graph_data_1.y_label); // e.g. "Race Finish Time (s)"

//Colour Legend
svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",6).attr("r", 6).style("fill", "#0000ff");

svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 6).text(graph_data_1.title).style("font-size", "15px").attr("alignment-baseline","middle");

if (!jQuery.isEmptyObject(graph_data_2)){
  svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",40).attr("r", 6).style("fill", "#ff0000");
  svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 40).text(graph_data_2.title).style("font-size", "15px").attr("alignment-baseline","middle");
}
if (!jQuery.isEmptyObject(graph_data_3)){
  svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",60).attr("r", 6).style("fill", "#00ff00");
  svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 60).text(graph_data_3.title).style("font-size", "15px").attr("alignment-baseline","middle");
}
if (!jQuery.isEmptyObject(graph_data_4)){
  svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",80).attr("r", 6).style("fill", "#000000");
  svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 80).text(graph_data_4.title).style("font-size", "15px").attr("alignment-baseline","middle");
}

//add a title
svg.append("text")
.attr("x", (width / 2))
.attr("y", 0 - (margin.top / 2))
.attr("text-anchor", "middle")
.style("font-size", "16px")
.style("font-style", "italic")
.text(graph_title);
break;

default:
console.log("graph " + graph_name + " not found: nothing drawn");
}


}

const saveGraphAsPng = () => {

  console.log("try to save the graph as a PNG");

  //generate a useful name

  let image_filename =  "power_graph_sim_" + getDateTime("nospace");

  // Get the d3js SVG element and save using saveSvgAsPng.js
  saveSvgAsPng(document.getElementsByTagName("svg")[0], image_filename, {scale: 2, backgroundColor: "#FFFFFF"});

}

const clearCanvas = () => {
  //clear the canvas
  console.log("Clear the canvas");
  d3.select('#graph').selectAll('*').remove();
}

const getBrowserType = () => {

  //dk2021, from https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
  // seems buggy tbh

  var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

  // Firefox 1.0+
  var isFirefox = typeof InstallTrigger !== 'undefined';

  // Safari 3.0+ "[object HTMLElementConstructor]"
  var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));

  // Internet Explorer 6-11
  var isIE = /*@cc_on!@*/false || !!document.documentMode;

  // Edge 20+
  var isEdge = !isIE && !!window.StyleMedia;

  // Chrome 1 - 79
  var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

  // Edge (based on chromium) detection
  var isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1);

  // Blink engine detection
  var isBlink = (isChrome || isOpera) && !!window.CSS;


  var output = 'Detecting browsers by ducktyping:<hr>';
  output += 'isFirefox: ' + isFirefox + '<br>';
  output += 'isChrome: ' + isChrome + '<br>';
  output += 'isSafari: ' + isSafari + '<br>';
  output += 'isOpera: ' + isOpera + '<br>';
  output += 'isIE: ' + isIE + '<br>';
  output += 'isEdge: ' + isEdge + '<br>';
  output += 'isEdgeChromium: ' + isEdgeChromium + '<br>';
  output += 'isBlink: ' + isBlink + '<br>';
  console.log(output);
  let result = "None";
  if(isFirefox){
    result = "Firefox";
  }
  else if(isChrome){
    result = "Chrome";
  }
  else if(isSafari){
    result = "Safari";
  }
  else if(isOpera){
    result = "Opera";
  }
  else if(isIE){
    result = "IE_yikes";
  }
  else if(isEdge){
    result = "Edge";
  }
  else if(isEdgeChromium){
    result = "EdgeChromium";
  }
  else if(isBlink){
    result = "Blink";
  }

  return result

}

const setClientID = () => {
  //for testing remove the sessionmstorage item
  //sessionStorage.removeItem('client_id');
  console.log("Set a client ID if it does not exist");
  //check if one is already stored in local storage
  let stored_client_id = sessionStorage.getItem('client_id');
  if(stored_client_id){
    console.log("found client id " + stored_client_id + " in session storage");
    browser_client_id = stored_client_id;
  }
  else{
    console.log("client id not found, generate a new one from IP and browser");
    $.getJSON('http://www.geoplugin.net/json.gp', function(data) {
      console.log("calling gd.geobytes.com to get IP address")
      console.log(JSON.stringify(data, null, 2));

      let dstring = getDateTime();
      let new_id = data['geoplugin_request'] + "_" + data['geoplugin_city'] + "_" + data['geoplugin_countryCode'] + "_" + getBrowserType() + "_" + dstring;
      console.log('new id is ' + new_id);
      //save to sessionStorage
      sessionStorage.setItem('client_id', new_id);
      // dk22jan need to update browser_client_id as it will not be read back form the session storage here?
      browser_client_id = new_id;
    });
  }
  //if still empty set a default
  if(!browser_client_id){
    browser_client_id = "NO_ID_"
  }
}

//funciton to check if a sequence is ready to run
const check_for_sequences = () => {
  console.log("Check for active sequence");
  //make a call to find an active sequence
  fetch('http://127.0.0.1:3003/getOldestActiveSequenceDetails' ,{method : 'get'}).then((response)=>{
    return response.json()
  }).then((data)=>{
    console.log(data);
    //console.log('active sequence data ' + JSON.stringify(data));

    //need to find out if there are unrun experiments in any sequence
    //if there is no active sequence we wait and check again later
    if (data.length == 0){
      if(sequences_mode==1 && sequence_experiment_underway==0){ //check again after some time period
      setTimeout(check_for_sequences, 10.0*1000);
      }
    }
    else{
      //should be only 1 sequence returned
      console.log("@sequences " + data.length + " active sequences returned");
      for(let i = 0;i< data.length; i++){
        let seq_details = data[i];
        let seq_id = seq_details._id;
        let seq_settings_id = seq_details.settings_id
        let seq_name = seq_details.sequence_name;
        let seq_notes = seq_details.notes;
        let seq_tags = seq_details.tags;
        console.log("**Check active sequence " + seq_id);
        let found_experiment_to_run = 0;

        if(seq_details.sequence_options){
          if (seq_details.sequence_options.iterations){ //how many should be run?
            let total_iterations = seq_details.sequence_options.iterations;
            console.log("found active sequence with " +  total_iterations + " iterations");

            let iterations_run_or_running = 0;
            let selected_iteration = total_iterations;

            if(seq_details.sequence_options.experiments){
              iterations_run_or_running = seq_details.sequence_options.experiments.length;
            }
            //is there an iteration left to run?
            console.log(iterations_run_or_running + " iterations are run or running, out of total " + total_iterations);
            if(iterations_run_or_running < total_iterations){
              //there is at least one left to run
              //go through what is already run and select the highest undone iteration

              //don't want the timer to run again until this iteration is run and saved
              sequence_experiment_underway = 1;

              // create an empty list
              let all_iterations = [];
              for (let i = 0; i< total_iterations; i++){
                all_iterations.push(0);
              }
              //now go through the run ones
              if(seq_details.sequence_options.experiments){
                for (let i = 0; i < seq_details.sequence_options.experiments.length; i++){
                  if(seq_details.sequence_options.experiments[i].iteration){
                    let iteration_run = seq_details.sequence_options.experiments[i].iteration;
                    console.log("found iteration " + iteration_run);
                    all_iterations[iteration_run-1] = 1;
                  }
                }
                console.log("all iterations after checking experiments run " + all_iterations);
                //find the highest unrun iteration
                for (let i = (total_iterations-1); i >= 0; i--){
                  if (all_iterations[i] == 0){
                    selected_iteration =i+1;
                    break;
                  }
                }
              }
              //selected_iteration = (total_iterations-iterations_run_or_running);
              console.log(" run iteration " + selected_iteration);

              //now need to check for any variations that apply to this iteration
              sequence_iteration_variations = [];
              if(seq_details.sequence_options.variations){
                let variations = seq_details.sequence_options.variations;
                console.log("variations found " + JSON.stringify(variations));
                //this shuld contain an array
                if (variations.length){
                  if (variations.length > 0){
                    for(let i = 0; i < variations.length; i++){
                      if(variations[i].iterations){
                        if (variations[i].iterations.indexOf){
                          let found_iteration_position = variations[i].iterations.indexOf(selected_iteration)
                          if(found_iteration_position >= 0){
                            console.log("This iteration contains a variation that must be sent to the GA at position " + found_iteration_position);
                            console.log(JSON.stringify(variations[i]));
                            let variation_to_send = {};
                            if(variations[i].type && variations[i].property && variations[i].values){
                              variation_to_send.type = variations[i].type;
                              variation_to_send.property = variations[i].property;
                              //console.log("variation of type " + variation_to_send.type + " property " + variation_to_send.property );
                              if (variations[i].type == "rider"){
                                variation_to_send.rider_no = variations[i].rider_no;
                              }
                              if(found_iteration_position >= 0 && found_iteration_position < variations[i].values.length){
                                variation_to_send.value = variations[i].values[found_iteration_position];
                                sequence_iteration_variations.push(variation_to_send);
                              }
                            }
                            else{
                              console.log("Variation is missing type, property, or values");
                            }
                          }
                        }
                        else{
                          console.log("Variation iterations has NO indexOf property, ");
                        }
                      }
                    }
                  }
                  else{
                    console.log("VARIATIONS ARRAY EMPTY");
                  }
                }
                else{
                  console.log("VARIATIONS WRONG FORMAT?");
                }
              } //end of variation checking
              if(sequence_iteration_variations.length > 0){
                console.log("Variations to send**");
                console.log(sequence_iteration_variations);
              }
              else{
                console.log("No variations for this iteration")
              }


              //update the sequence settings
              let serverURL = 'http://127.0.0.1:3003/assign_sequence_iteration/'+seq_id;

              $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

              let experiment_iteration = {
                "client_id":browser_client_id,
                "iteration":selected_iteration,
                "status":"active"
              };
              //need to add this to the experiments object
              let experiments = []
              if (iterations_run_or_running > 0){
                experiments = seq_details.sequence_options.experiments;
              }
              experiments.push(experiment_iteration);

              fetch(serverURL,{
                method : 'post',
                headers: {
                  'Content-Type': 'application/json',
                },
                mode : 'cors',
                body : JSON.stringify(experiments)
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

                //run the actual experiment now
                //first need to get the settings
                //make a call to get the settings
                serverURL = 'http://127.0.0.1:3003/getExperimentSettingFromID/' + seq_settings_id;
                console.log("run experiment, get settings, fetch from " + serverURL);

                fetch(serverURL,{method : 'get'}).then((response)=>{
                  return response.json()
                }).then((data)=>{
                  //console.log('get experiment settings, data ' + JSON.stringify(data));
                  //console.log('data ' + JSON.stringify(data[0].global_settings) );


                  //need to apply any variations if they exist
                  let sequence_variations_info = "";
                  console.log('Variation: Check for variations');
                  if(sequence_iteration_variations.length > 0){

                    //data[0].rider_settings and data[0].global_settings are STRINGs, so need to convert it to an object, modify it as needed, then change it back to a string

                    let globalSettingsObject = JSON.parse(data[0].global_settings);
                    let riderSettingsObject = JSON.parse(data[0].rider_settings);

                    for(let i = 0; i < sequence_iteration_variations.length; i++){
                      console.log('Variation: Process variation ' + (i+1) + " of " + sequence_iteration_variations.length );

                      let v_details = sequence_iteration_variations[i];
                      console.log(JSON.stringify(v_details));

                      if(v_details.type == "global"){
                        //adjust a global setting to the given value
                        console.log("Variation: update global property " + v_details.property + " to " + v_details.value);

                        try {
                        globalSettingsObject[v_details.property] = v_details.value;
                          sequence_variations_info += "Global variation: " + v_details.property + " = " + v_details.value + "||";
                        }
                        catch(err) {
                          alert("Variation:error applying global variation " + JSON.stringify(v_details) + "  ---  " + err.message);
                        }
                      }
                      else if (v_details.type == "rider"){
                        //this is a rider prop so need to specify the actual rider
                        if(v_details.rider_no >= 0){
                          console.log("Variation: update rider " + v_details.rider_no + " property " + v_details.property + " to " + v_details.value);
                          try {
                          riderSettingsObject[v_details.rider_no][v_details.property] = v_details.value;
                            sequence_variations_info += "Rider " + v_details.rider_no + " variation: " + v_details.property + " = " + v_details.value + "||";
                            console.log("#### riderSettingsObject["+v_details.rider_no+"]['"+v_details.property+"'] = " + v_details.value);
                          }
                          catch(err) {
                            alert("Variation:error applying rider variation " + JSON.stringify(v_details) + "  ---  " + err.message);
                          }
                        }
                        else{
                          console.log("Variation: error, rider variation has no number");
                        }
                      }
                      else{
                        console.log("Variation: invalid variation type " + v_details.type);
                      }
                    }
                    //empty the global variations array
                    sequence_iteration_variations = [];
                    data[0].global_settings = JSON.stringify(globalSettingsObject);
                    data[0].rider_settings = JSON.stringify(riderSettingsObject);

                  }
                  else{
                    console.log("Variation: No variations to run")
                  }
                  console.log('Run experiment: load settings');
                  //console.log("#### rider settings before applying");
                  //console.log(JSON.stringify(data[0].rider_settings));

                  let global_settings_object = data[0].global_settings;

                  //***dk22: run besy-in-final-gen tests if needed ***//
                    if(seq_details.sequence_options){
                      if (seq_details.sequence_options.best_in_final_gen_tests){
                        console.log("<><><><><><> BEST IN FINAL GEN TESTS  <><><><><><>");
                        console.log(JSON.stringify(seq_details.sequence_options.best_in_final_gen_tests));
                        //set the global settings property to this objects

                        let global_settings_object_parse = JSON.parse(global_settings_object);
                        global_settings_object_parse['best_in_final_gen_tests'] = [];
                        global_settings_object_parse['best_in_final_gen_tests'] = seq_details.sequence_options.best_in_final_gen_tests;
                        global_settings_object = JSON.stringify(global_settings_object_parse);
                      }
                  }


                  $("#global_settings").val(global_settings_object);
                  $("#race_settings").val(data[0].race_settings);
                  $("#rider_settings").val(data[0].rider_settings);
                  $("#database_connection_label").html("<strong>Loaded Settings "+data[0].name+"</strong> | _id | <span id = 'settings_id'>"+data[0]._id + "</span>");
                  $("#new_settings_name").val(data[0].name);
                  //set the id (global)
                  selected_settings_id = data[0]._id;
                  //populateNamesDropdown(data);

                  //need to select the settings value in the dropdown box
                  //weird mix of UI and other stuff here, yikes
                  let element = document.getElementById("experiment_names"); //is this actually used?
                  element.value = seq_settings_id;

                  $("#save_results_notes").val("Experiment interval " + selected_iteration + "/" + total_iterations + " sequence " + seq_id + " " + seq_name + " " + seq_notes + "||" + sequence_variations_info);
                  $("#save_results_tags").val(seq_tags);
                  //run the ga, try to send the rest of the code as a callback
                  //need to set variables to be able to update/save after running the GAS (asynchronous as heck)
                  sequence_selected_seq_id = seq_id;
                  sequence_selected_iteration = selected_iteration;
                  run_ga();
                  //note the GA uses web workers, and when this returns you need to triger it to save results automatically and update the sequence info

                });

              }).catch((error) => {
                console.log("Error updating settings on experiment server");
                $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
                console.log(error);
              });

            }
            else{
              //no iteration left to do found, update this sequence to active=0, wait and check again later for a different sequence


              serverURL = 'http://127.0.0.1:3003/deactivate_sequence/'+seq_id;

              console.log("@sequences_mode:deactivate sequence url " + serverURL);

              $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

              fetch(serverURL,{
                method : 'post',
                headers: {
                  'Content-Type': 'application/json',
                },
                mode : 'cors',
                body : ''
              }).then((response)=>{
                console.log(response);
                return response.json();
                if (!response.ok) {
                  throw Error(response.statusText);
                }
              }).then((data)=>{
                console.log('@sequences_mode: deactivated sequence after finding no iteration to run, data ' + JSON.stringify(data));

              }).catch((error) => {
                console.log("@sequences_mode: Error deactivating sequence");
                $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error);
                console.log(error);
              });

              //check again after a wait period
              if(sequences_mode==1 && sequence_experiment_underway==0){ //check again after some time period
                setTimeout(check_for_sequences, 10.0*1000);
              }
            }
          }
          else{
            console.log("sequence has no iterations specified");
          }
        }
        else{
          console.log("sequence has no sequence_options specified");
        }

      }//end of sequences loop
    }




  });


}

//function to handle sequence mode toggling
const toggleSequenceMode = (checkboxElem) =>{
  if (checkboxElem.checked) {
    console.log("Sequence mode activated");
    sequences_mode = 1;
    check_for_sequences();
  } else {
    console.log("Sequence mode deactivated");
    sequences_mode = 0;
  }
}

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


$(document).ready(function() {

  //attach events
  $("#button_play_race").on("click", run_single_race);
  $("#button_evolve_instructions").on("click", run_ga);
  $("#button_check_race_robustness").on("click", run_robustness_check);
  $("#button_check_race_consistency").on("click", run_consistency_check);
  $("#button_update_settings").on("click", updateExperimentSettings);
  $("#button_add_new_settings").on("click", addNewExperimentSettings);

  $("#button_save_results").on("click",saveResults);

  //add power graph
  $("#draw_power").on("click",draw_power_graph);
  $("#saveGraphAsPng").on('click',saveGraphAsPng);
  $("#clearCanvas").on('click',clearCanvas);

  const populateNamesDropdown = (data) => {
    const namesDropDown = $("#experiment_names");
    namesDropDown.empty();
    namesDropDown.append($('<option>', {value : 0}).text("-- SELECT --"));
    data.forEach((experiment_names) => {
      namesDropDown.append($('<option>', {value : experiment_names._id}).text(experiment_names.name));
    });
    //add a click event to the dropdown
    namesDropDown.change(()=>{
      let optionSelected = $(this).find("option:selected");
      let valueSelected  = optionSelected.val();

      //ignore if the id is 0
      if (valueSelected == 0){
        $("#global_settings").val("");
        $("#race_settings").val("");
        $("#rider_settings").val("");
        $("#database_connection_label").html("No experiemnt selected");
        $("#new_settings_name").val("");
        selected_settings_id = 0; //global id value
      }
      else{
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
    console.log(error);
  });
}
//try to load settings from the experiment server
getExperimentNames();
//set or get a client id
setClientID();
}
);
