//donal kelly 2023, a test suite to ruun 'standard' GA functions and display stuff.
// will need to liase with the node backend and mongodg for storage and crud stuff
let selected_fitness_function_name = "";
let selected_fitness_function_code = "";
let selected_ga_settings = {};

let g_population = [];
let g_generations = [];


const populateFunctionNamesDropdown = (data, set_value) => {
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

    console.log("selected test suite function " + valueSelected);

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
  // alert(valueSelected);
});
if(set_value){
  $('#test_suite_function_names').val(set_value);
}
}
const getTestSuiteFunctionNames = (set_value) => {
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
  populateFunctionNamesDropdown(data, set_value);
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

      getTestSuiteFunctionNames(selected_settings_id);
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

  console.log("created a population size " + population.length + "\n\n" + JSON.stringify(population));


  //get the code
  let code_string = $("#function_code").val().trim();
  //console.log("**** running fitness function ******");
  //console.log(code_string);
  //create a function object from what is in the text area
  var wrap = s => "{ return " + code_string + " };"
  var func = new Function( wrap(code_string) );
  //let result = func.call( null ).call( null, '110011'  );
  //$("#function_output").val(result);

  // run the generations
  let generations = 0;
  let ga_settings_string = $("#ga_settings").val();
  let ga_settings = JSON.parse(ga_settings_string);

  if (ga_settings.generations){
    generations = ga_settings.generations;
  }
  // empty the table of rows
  $("#genResults > tbody").empty();

  if (generations > 0){
    for(let g = 0; g < generations; g++){
        //console.log("Generation " + g + " begins");

        let sum_population_fitness = 0;
        let best_fitness_agent = {};
        let best_fitness_agent_location = 0;
        best_fitness_agent.fitness = (-Number.MAX_VALUE); //had this as 0 but this was a bug


        //FITNESS get the fitness for each agent in the population
        for (let i = 0; i < population.length; i++){
          let fitness = func.call( null ).call( null, population[i].genotype);
          sum_population_fitness += fitness;
          population[i].fitness = fitness;
          if(fitness > best_fitness_agent.fitness){
            best_fitness_agent = population[i];
            best_fitness_agent_location = i;
          }
        }

        //save stats for showing results later
        let population_size_before_selection = population.length;
        let average_fitness_before_selection = (sum_population_fitness/population.length);
        let crossover_count = 0;
        let mutation_count = 0;
        let mutation_max = population[0].genotype.length * population.length;

        //don't run selection for the final Generation
        if(g == (generations -1)){
          console.log("GA done. Final population ");
          console.log(JSON.stringify(population));
        }
        else{
          //SELECTION create the next generation population
          let selection_type = "roulette";
          if (ga_settings.selection){
            selection_type = ga_settings.selection;
          }

          if (selection_type == "roulette"){
            //use total sum of all fitnesses- generate random 0 -fitness, and select based on this.
            console.log("create a new population with roulette selection.");
            let new_population = [];
            for (let i = 0; i < population.length; i++){
              //if we are doing crossover select two parents then crossover points and create two childers
              let crossover = 0;
              if (ga_settings.crossover){
                crossover = ga_settings.crossover;
              }
              if(crossover){
                console.log("create a population using crossover");

                //need to check if there are any negaitive fitness values
                let fitness_adjustment = 0;
                let min_fitness_value = population[0].fitness;
                for(let t = 1; t < population.length; t++){
                  if (population[t].fitness < min_fitness_value){
                    min_fitness_value = population[t].fitness;
                  }
                }

                //add the min value on to the original fitness for the crossover roulette_position
                if (min_fitness_value < 0){
                  //adjust the sum_population_fitness
                  sum_population_fitness = 0;
                  for(let t = 0; t < population.length; t++){
                      population[t].adjusted_fitness = population[t].fitness + Math.abs(min_fitness_value);
                        sum_population_fitness+=population[t].adjusted_fitness;
                  }
                  console.log("found a negative fitness " + min_fitness_value + " new adjusted sum is "  + sum_population_fitness);

              }
              else{ // still need the adjusted_fitness property
                for(let t = 0; t < population.length; t++){
                  population[t].adjusted_fitness = population[t].fitness;
                }
              }

                let parent1_roulette_p = Math.random() * sum_population_fitness;
                let parent2_roulette_p = Math.random() * sum_population_fitness;
                //find parent positions in population
                let kp1 = -1;
                let kp2 = -1;


                //use the adjusted fitness for the roulette wheel selection
                let current_fitness_sum = 0;
                for (let k = 0; k < population.length; k++){
                    //find agent that maps to this number
                    current_fitness_sum += population[k].adjusted_fitness;
                    if (kp1 < 0 && current_fitness_sum >= parent1_roulette_p){
                      kp1=k;
                    }
                    if (kp2 < 0 && current_fitness_sum >= parent2_roulette_p){
                      kp2=k;
                    }
                  }

                  console.log("fitness sum  points " + parent1_roulette_p + " " + parent2_roulette_p + " parents " + kp1 + " " + kp2);
                  //go into the debugger if there is an undefined agent in the population
                  for(let t = 0; t< population.length; t++){
                    if (population[t]===undefined){
                      console.log("issue with undefined agent in population!");
                      debugger
                    }
                  }

                  //go through the bits
                  let parent1 = population[kp1];
                  let parent2 = population[kp2];
                  if (parent1===undefined){
                    console.log("issue with undefined parent1 in population!");
                    debugger
                  }
                  if (parent2===undefined){
                    console.log("issue with undefined parent2 in population!");
                    debugger
                  }

                //get the crossover type
                let crossover_type = "point";
                if (ga_settings.crossover_type){
                  crossover_type = ga_settings.crossover_type;
                }
                if(crossover_type == "point"){

                  let crossover_points_count = 1;
                  if (ga_settings.crossover_points){
                    crossover_points_count = ga_settings.crossover_points;
                  }
                  console.log(crossover_points_count + " point crossover");

                  //debugger
                    let child1bits = "";
                    let child2bits = "";
                    crossover_points = [];
                    //dont' always crossover, do it sometimes
                    let crossover_probability = 0;
                    if (ga_settings.crossover_probability){
                      crossover_probability = ga_settings.crossover_probability;
                    }
                    //if parents are the same, childers will be the same, so don't bother corssing over
                    if(parent1.genotype == parent2.genotype || Math.random() >= crossover_probability){

                      child1bits = parent1.genotype;
                      child2bits = parent1.genotype;

                      console.log("crossover skipped: identical parents " + parent1.genotype + " " + parent2.genotype);
                    }
                    else{
                    //make list of crossover points (must be ordered, min=1, max=bitlength-1)
                    crossover_points = [];
                    for(let m=0;m<crossover_points_count;m++){
                      let cp = Math.floor(1 + Math.random() * (parent1.genotype.length-1));
                      while (crossover_points.indexOf(cp) != -1 ){ //make sure it's not already there.
                        cp = Math.floor(1 + Math.random() * (parent1.genotype.length-1));
                      }
                      crossover_points.push(cp);
                    }
                    console.log("crossover points " + crossover_points);
                    let bit_c = 0;
                    let crossover_switch = 0; //toggles between 0 and 1
                    let current_crossover_point = 0;
                    while(child1bits.length < parent1.genotype.length){
                      //console.log("child1bits " + child1bits + " child2bits " + child2bits);
                      if (crossover_switch == 0){
                        child1bits+=parent1.genotype[bit_c];
                        child2bits+=parent2.genotype[bit_c];
                      }
                      else{
                        child2bits+=parent1.genotype[bit_c];
                        child1bits+=parent2.genotype[bit_c];
                      }
                      bit_c++;
                      if(current_crossover_point < crossover_points.length){
                        if(bit_c == crossover_points[current_crossover_point]){
                          //go to next crossover point
                          current_crossover_point++;
                          crossover_switch = (crossover_switch==0?1:0); //toggle between 1 and 0
                        }
                      }
                    }
                    crossover_count+=2; //shoudl be ok to count this here as we've just DONE the crossover
                  }

                    console.log("cross over " + parent1.genotype + " and " + parent2.genotype + " with crossover points " + crossover_points + " to make " + child1bits + " and " + child2bits );
                    //add these as TWO new entries to the new population
                    let new_agent1 = {};
                    new_agent1.genotype = child1bits;
                    new_agent1.fitness = 0;
                    let new_agent2 = {};
                    new_agent2.genotype = child2bits;
                    new_agent2.fitness = 0;
                    new_population.push(new_agent1);
                    new_population.push(new_agent2);
                    //skip forward one in the population as we should move in twos

                    i++;
                  }
                  else if (crossover_type == "pmx"){

                    //this crossover is used for permutation problems like the TSP
                    // if binary, need to know how many bits represents a value
                    let pmx_bits_per_value = 4;
                    if (ga_settings.pmx_bits_per_value){
                      pmx_bits_per_value = ga_settings.pmx_bits_per_value;
                    }
                    console.log(" pmx crossover pmx_bits_per_value " + pmx_bits_per_value);

                      //debugger
                      let child1_valuearray = [];
                      let child2_valuearray = [];

                      //create two arrays from the parents (easier to manage values)
                      let parent1_valuearray = [];
                      let parent2_valuearray = [];

                      let crossover_probability = 0;
                      if (ga_settings.crossover_probability){
                        crossover_probability = ga_settings.crossover_probability;
                      }
                      let child1bits = "";
                      let child2bits = "";
                      if(Math.random() < crossover_probability){

                        let valuesInGenotype = Math.floor(parent1.genotype.length/pmx_bits_per_value);
                        //choose two crossover points
                        let crossover_point1 = Math.floor(Math.random()*valuesInGenotype);
                        let crossover_point2 = Math.floor(Math.random()*valuesInGenotype);
                        while (crossover_point2 == crossover_point1){
                            crossover_point2 = Math.floor(Math.random()*valuesInGenotype);
                        }
                        //change order if needed
                        if(crossover_point1 > crossover_point2){
                          let temp = crossover_point1;
                          crossover_point1 = crossover_point2;
                          crossover_point2 = temp;
                        }

                        //make empty children with the right length as arrays
                        for(let pi = 0; pi < valuesInGenotype; pi++){
                          child1_valuearray.push("0");
                          child2_valuearray.push("0");
                          parent1_valuearray.push(parent1.genotype.substring(pi*pmx_bits_per_value, (pi*pmx_bits_per_value + pmx_bits_per_value)));
                          parent2_valuearray.push(parent2.genotype.substring(pi*pmx_bits_per_value, (pi*pmx_bits_per_value + pmx_bits_per_value)));
                        }


                        console.log("pmx crossover with points " + crossover_point1 + " " + crossover_point2 + " parents " + parent1_valuearray + " " + parent2_valuearray);

                        //need to create arrays of the parents and children to make it easier to do both
                        let childers = [];
                        let folks = [];
                        childers.push(child1_valuearray);
                        childers.push(child2_valuearray);
                        folks.push(parent1_valuearray);
                        folks.push(parent2_valuearray);

                        //add the parent1 section between the crossover points to the first child
                        for (let pii = 0; pii < 2; pii++){
                          let parent1 = 0;
                          let parent2 = 1;
                          let childi = 0;
                          if (pii == 1){
                            parent1 = 1;
                            parent2 = 0;
                            childi = 1;
                          }
                          for(let pi = crossover_point1; pi < crossover_point2; pi++){
                            childers[childi][pi] = folks[parent1][pi];
                          }
                          //go through the corresponding section in parent 2
                          for(let pi = crossover_point1; pi < crossover_point2; pi++){
                            let m_value =  folks[parent2][pi];
                            //check if m_value is in the child
                            if (childers[childi].indexOf(m_value) == -1){
                              // not in the child so need to add it but where?
                              //get corresponding element in child
                              let n_value = childers[childi][pi];
                              //find this value in parent 2
                              let n_value_loc =   folks[parent2].indexOf(n_value);
                              // while this value is occupied keep looking for a free location using that value
                              while(childers[childi][n_value_loc] != "0"){ //0 means it is unoccupied
                                n_value = childers[childi][n_value_loc];
                                n_value_loc = folks[parent2].indexOf(n_value);
                              }
                              //now should have an empty space in the childers for this value
                              childers[childi][n_value_loc] = m_value;
                            }
                          }
                          //now copy everything else from parent 2 into child 1
                          for(let pi = 0; pi < valuesInGenotype; pi++){
                            if(childers[childi][pi] == "0"){
                              childers[childi][pi] =   folks[parent2][pi];
                            }
                        }
                      }
                      console.log(" created child 1 from pmx crossover " + childers[0])
                      console.log(" created child 2 from pmx crossover " + childers[1])

                      for(let pi = 0; pi < valuesInGenotype; pi++){
                        child1bits +=  childers[0][pi];
                        child2bits +=  childers[1][pi];
                      }
                      crossover_count+=2; //shoudl be ok to count this here as we've just DONE the crossover
                    }
                    else{
                      child1bits = parent1.genotype;
                      child2bits = parent2.genotype;
                    }

                      let new_agent1 = {};
                      new_agent1.genotype = child1bits;
                      new_agent1.fitness = 0;
                      let new_agent2 = {};
                      new_agent2.genotype = child2bits;
                      new_agent2.fitness = 0;
                      new_population.push(new_agent1);
                      new_population.push(new_agent2);
                      //skip forward one in the population as we should move in twos
                      i++;

                  }
                  else{
                    console.log("unknown crossover type (e.g. 'point')!")
                  }
                }
                else{
                  //no crossover, just copy in an agent
              //   i++;
              // }
              //otherwise select a single parent and produce an offsprung
              let roulette_position = Math.random() * sum_population_fitness;
              current_fitness_sum = 0;
              for (let k = 0; k < population.length; k++){
                  //find agent that maps to this number
                  current_fitness_sum += population[k].fitness;
                  if (current_fitness_sum >= roulette_position){
                    // create new ga_agent
                    //console.log("New agent with genotype " + new_agent_bits);
                    let new_agent = {};
                    new_agent.genotype = population[k].genotype;
                    new_agent.fitness = 0;
                    new_population.push(new_agent);
                    break; //break out of the loop or it will keep adding new agents
                  }
            }
          }
        }
            population = new_population;
            //apply mutation (if requested)



            for(let i = 0; i < population.length; i++){
              let agent_bits = population[i].genotype;
              let mutation_rate = 0;
              if (ga_settings.mutation_rate){
                mutation_rate = ga_settings.mutation_rate;
              }

              //if crossover_type is pmx we need to swap values, not just flip bits, as it is a sequence

              let crossover_type = "point";
              let new_agent_bits = "";
              if (ga_settings.crossover_type){
                crossover_type = ga_settings.crossover_type;
              }
              if (crossover_type == "pmx"){
                // go through value segment by value segment and swap some
                //need the bits per value
                let pmx_bits_per_value = 4;
                if(ga_settings.pmx_bits_per_value){
                  pmx_bits_per_value = parseInt(ga_settings.pmx_bits_per_value);
                }
                for (let b = 0; b < agent_bits.length/pmx_bits_per_value; b++){
                  let mutate_p = Math.random();
                  if(mutate_p < mutation_rate){

                    //need to get two segments then rebuild the whole string
                    let current_segment = agent_bits.substring(b*pmx_bits_per_value,(b+1)*pmx_bits_per_value);
                    //need to find a different place to swap with
                    let swap_segment_loc = Math.floor(Math.random()*agent_bits.length/pmx_bits_per_value);
                    while(swap_segment_loc == b){
                      swap_segment_loc = Math.floor(Math.random()*agent_bits.length/pmx_bits_per_value);
                    }
                    let swap_segment = agent_bits.substring(swap_segment_loc*pmx_bits_per_value,(swap_segment_loc+1)*pmx_bits_per_value);
                    // rebuild the agent_bits string
                    agent_bits = agent_bits.substring(0,b*pmx_bits_per_value) + swap_segment + agent_bits.substring((b+1)*pmx_bits_per_value);
                    agent_bits = agent_bits.substring(0,swap_segment_loc*pmx_bits_per_value) + current_segment + agent_bits.substring((swap_segment_loc+1)*pmx_bits_per_value);
                    mutation_count+=pmx_bits_per_value;
                    }
                }
                new_agent_bits = agent_bits;

              }
              else{

              //go through bit by bit and flip some
              for (let b = 0; b < agent_bits.length; b++){
                let mutate_p = Math.random();
                if(mutate_p < mutation_rate){
                //  console.log("apply a mutation")
                  mutation_count++;
                  if(agent_bits[b] == "1"){
                    new_agent_bits += "0";
                  }
                  else{
                    new_agent_bits += "1";
                  }
                }
                else{
                  new_agent_bits += agent_bits[b];
                }
              }
            }
              if (new_agent_bits != population[i].genotype){
                console.log("mutation from " + population[i].genotype + " to " + new_agent_bits);
              }
              population[i].genotype = new_agent_bits;
            }
            //console.log("created a new population size " + population.length);
        }
        else{
          console.log(" unknown selection type " + selection_type + " population not changed.");
        }

        //mutation (run this before the elitism selection as we don't want the BEST of the BEST mutated )


        //console.log("Generation " + g + " complete ");
        //check for elitism, off by default
        //it will overwrite a random agent in the new population with the fittest agent from the last
        let elitism = 0;
        if (ga_settings.elitism){
          elitism = ga_settings.elitism;
        }
        if(elitism){
          let randPos = Math.floor(Math.random() * population.length);
          //console.log("elitism: overwriting agent at " + randPos + " with agent " + JSON.stringify(best_fitness_agent));
          population[randPos] = best_fitness_agent;
        }
      }
      let gen_message = "generation " + g + " of " + generations + " > average fitness " + (sum_population_fitness/population.length) + " best fitness " + best_fitness_agent.fitness + " genotype " + best_fitness_agent.genotype + " at position " + best_fitness_agent_location;
      //create a table row


      let generation_mutation_p = Math.round((mutation_count/mutation_max)*10000)/100;
      let generation_crossover_p = Math.round((crossover_count/population.length)*10000)/100;


      let results_row = "<tr>"+
        "<th scope='row'>"+ (g+1) + "</th>"+
        "<td>"+population_size_before_selection + "</td>"+
        "<td>"+average_fitness_before_selection +"</td>"+
        "<td>"+best_fitness_agent.fitness+"</td>"+
        "<td>"+best_fitness_agent.genotype+"</td>"+
        "<td>"+generation_mutation_p+"</td>"+
        "<td>"+generation_crossover_p+"</td>"+
      "</tr>";

      //$("#function_output").val($("#function_output").val() + "\n" + gen_message);
    //  $('#genResults tr:last').after(results_row);
      $("#genResults tbody").append(results_row);
      console.log(gen_message);
    }
  }

}

function shuffleArray(array) {
  // based on Durstenfeld shuffle, from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  //shuffles IN place
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
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

      //if using pmx we will need to create a population of valid ranges of bits
      if(ga_format == "binary_range_values"){
        console.log("create population with binary_range_values");

        let ga_agent_bits = 5;
        if(ga_settings.bits){
          ga_agent_bits = parseInt(ga_settings.bits);
        }
        let pmx_bits_per_value = 4;
        if(ga_settings.pmx_bits_per_value){
          pmx_bits_per_value = parseInt(ga_settings.pmx_bits_per_value);
        }
        let num_values = Math.floor(ga_agent_bits/pmx_bits_per_value);
        for(let i = 0;i < pop_size; i++){
          let seq_int = [];
          for(let k = 0; k< num_values; k++){
            seq_int.push(Math.floor(k*(Math.pow(2,pmx_bits_per_value)/num_values)));
          }
          //need to shuffle
          shuffleArray(seq_int);
          //create string, converting to binary format (need right number of bits)

          let binary_string = "";
          for(let k = 0; k < seq_int.length; k++){
            let binary_val = seq_int[k].toString(2); //binary string but may not be 4 digits
            if (binary_val.length > 4){
              binary_val = binary_val.substring(binary_val.length-4);
            }
            if(binary_val.length < 4){
              //prepend with 0s
              while(binary_val.length < 4){
                binary_val = "0" + binary_val;
              }
            }
            console.log("binary pmx converted int " + seq_int[k] + " to " + binary_val);

            binary_string += binary_val;
          }
          let agent = {};
          agent.genotype = binary_string;
          agent.fitness = 0;
          population.push(agent);
        }
      }
      else if(ga_format == "binary"){
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
            let agent = {};
            agent.genotype = random_pop_agent;
            agent.fitness = 0;
            population.push(agent);
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
