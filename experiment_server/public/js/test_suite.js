//donal kelly 2023, a test suite to ruun 'standard' GA functions and display stuff.
// will need to liase with the node backend and mongodg for storage and crud stuff
let selected_fitness_function_name = "";
let selected_fitness_function_code = "";
let selected_ga_settings = {};

let g_population = [];
let g_generations = [];


const populateFunctionNamesDropdown = (data) => {
  const functionsDropDown = $("#test_suite_function_names");
    //empty the list
  functionsDropDown.empty();
  functionsDropDown.append($('<option>', {value : 0}).text("-- SELECT --"));

  data.forEach((experiment_names) => {
    functionsDropDown.append($('<option>', {value : experiment_names._id}).text(experiment_names.name));
  });
  //add a click event to the dropdown
  functionsDropDown.change(()=>{
    let optionSelected = $("#test_suite_function_names").find("option:selected");
    let valueSelected  = optionSelected.val();

    console.log("slected test suite function " + valueSelected);

    //ignore if the id is 0
    if (valueSelected == 0){
      $("#new_test_suite_function_name").val("");
      $("#function_code").val("");
      $("#ga_settings").val("");

    }
    else{
    //make a call to get the settings
    fetch('http://127.0.0.1:3003/getTestSuiteFunctionFromID/' + valueSelected,{method : 'get'}).then((response)=>{
      return response.json()
    }).then((data)=>{
      //  console.log('data ' + JSON.stringify(data));
      //console.log('data ' + JSON.stringify(data[0].global_settings) );
      console.log("Got test suite function from mongo")
      console.log(data);
      selected_fitness_function_name = data[0].name;
      selected_fitness_function_code = data[0].function;
      selected_ga_settings = data[0].ga_settings;
      $("#new_test_suite_function_name").val(selected_fitness_function_name);
      $("#function_code").val(selected_fitness_function_code);
      $("#ga_settings").val(selected_ga_settings);
    });
  }
}
  // alert(valueSelected);
);
}
const getTestSuiteFunctionNames = () => {
console.log("try to load test suite fitness function list");
let serverURL = 'http://127.0.0.1:3003/getTestSuiteFunctionNames/';
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
  populateFunctionNamesDropdown(data);
  $("#database_connection_label").text(data.length + " functions found.")

}).catch((error) => {
  console.log("Error loading function names from experiment server");
  $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
  console.log(error);
});
}

const updateTestSuiteFunction = () => {

  //only update if there's a selected id
  let optionSelected = $("#test_suite_function_names").find("option:selected");
  let selected_settings_id  = optionSelected.val();
  console.log("update test suite function " + selected_settings_id);

  if (selected_settings_id.length > 1){
    let serverURL = 'http://127.0.0.1:3003/update_test_suite_function/'+selected_settings_id;
    $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");
    let function_code = $("#function_code").val();
    let ga_settings = $("#ga_settings").val();
    let function_name = $("#new_test_suite_function_name").val();
    let dataToSend = {
      "name":function_name,
      "function":function_code,
      "ga_settings":ga_settings
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
      getTestSuiteFunctionNames();
      $("#database_connection_label").html("<strong>Updated Test Suite "+data.value.name+"</strong> | _id | <span id = 'settings_id'>"+data.value._id + "</span>");

    }).catch((error) => {
      console.log("Error updating test suite function on experiment server");
      $("#database_connection_label").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
      console.log(error);
    });
  }
  else{
    alert("Invalid Test Suite Function ID, cannot save, sols.")
  }
}

const addNewTestSuiteFunction = () => {
  let serverURL = 'http://127.0.0.1:3003/new_test_suite_function';
  $("#database_connection_label").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

  let function_name = $("#new_test_suite_function_name").val();
  let function_code = $("#function_code").val();
  let ga_settings = $("#ga_settings").val();

  if (function_name.length > 0 && function_code.length > 0 ){

    let dataToSend = {
      "name":function_name,
      "function":function_code,
      "ga_settings": ga_settings
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
      console.log("saved as new test suite function with data " +  data.document._id);
      getTestSuiteFunctionNames();

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

const deleteTestSuiteFunction = () => {
  //delete the4 selected function


  let selectedIDs = [];
  let selectedId = $("#test_suite_function_names").val();
  console.log("delete selected test suite function selected id " + selectedId);

  if(selectedId){
    selectedIDs.push(selectedId);
  }

  let no_of_selected_ids = selectedIDs.length;

  if (no_of_selected_ids <= 0){
    alert("No function selected for deletion");
  }
  else{

    let serverURL = 'http://127.0.0.1:3003/deleteTestSuiteFunction/' + JSON.stringify(selectedIDs);
    $("#results_info_label").html("Attempting to connect to "+serverURL+" to delete selected test function.");
    fetch(serverURL,{method : 'post'}).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
        throw Error(response.statusText);
      }
    }).then((data)=>{
      console.log(" test function removed");
      console.log(data);
      let count = 0;
      if(data.deletedCount){
          count = data.deletedCount;
      }
        $("#results_info_label").text(count + " test function removed ");
        //refresh the main list
        getTestSuiteFunctionNames();

  }).catch((error) => {
    $("#results_info_label").text("ERROR CONNECTING TO SERVER (deleting test function) " + error);
    console.log("Error loading data from server (deleting test function)");
    console.log(error);
  });


}
}

function run_fitness_function(){
  console.log("run function...");
  // create a population
  let population = create_population();
  console.log("created a population size " + population.length + "\n\n" + population);



  //get the code
  let code_string = $("#function_code").val().trim();
  console.log("**** running fitness function ******");
  console.log(code_string);
  //create a function object from what is in the text area
  var wrap = s => "{ return " + code_string + " };"
  var func = new Function( wrap(code_string) );
  let result = func.call( null ).call( null, '110011'  );
  $("#function_output").val(result);

}

function create_population(){
//use settings of selected test function to generate a starting population
let ga_settings_string = $("#ga_settings").val();
let ga_settings = JSON.parse(ga_settings_string);
let population = [];
console.log("create a population using the settings " + ga_settings_string);
if(ga_settings){
  if(ga_settings.population_size){
    let pop_size = parseInt(ga_settings.population_size);
    if(pop_size > 0){
      //get the type of value (binary/real)
      let ga_format = "binary";
      if(ga_settings.format){
        ga_format = ga_settings.format;
      }

      if(ga_format == "binary"){
        let ga_agent_bits = 5;
        if(ga_settings.bits){
          ga_agent_bits = parseInt(ga_settings.bits);
        }

        console.log("create a binary population");
        for(let i = 0;i < pop_size; i++){
          let random_pop_agent = "";
          for (let k=0;k<ga_agent_bits;k++){
            random_pop_agent += Math.floor(Math.random() * Math.floor(2)); //adds a random 1 or 0 (string)
            }
            population.push(random_pop_agent);
        }
      }

    }
  }
}
return population;

}

$(document).ready(function() {

  d3.select("#run_fitness_function").on('click',run_fitness_function);
  $("#button_update_test_suite_function").on("click", updateTestSuiteFunction);
  $("#button_add_new_test_suite_function").on("click", addNewTestSuiteFunction);
  $("#button_delete_test_suite_function").on("click", deleteTestSuiteFunction);

  //try to load function names from the experiment server
  getTestSuiteFunctionNames();

});
