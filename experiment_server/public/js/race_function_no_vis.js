//function to run the race and retuturn a finish TIME

//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data
let global_settings_tracker = "";
let global_race_tracker = "";
let global_riders_tracker = "";
let global_log_message = "";
let global_log_message_final = "";
let global_log_message_now = false;
let GLOBAL_LOG_MESSAGE_LIMIT = 400000;
let longest_LOG_MESSAGE_found = 0;
let generation_best_time = Infinity;

let count_of_choke_under_pressure_loggings = 0;

let debug_log_specific_timesteps = [114,115,116,117,118,119];

let power_application_include_acceleration = 1;

//store the sequence of normal_distribution_output_inflation_percentage values to check them
//let normal_distribution_output_inflation_percentage_array = [];

// ** var to check the max performance failure
let max_performance_failure_percentage = 0;
let max_fatigue_rise = 0;
let max_endurance_fatigue_level = 0;
//let max_endurance_fatigue_level_instructions = []; //save these to be able to re-run odd results
//let max_endurance_fatigue_level_start_order = [];

//temp counter to see if we get a lot of zero cals for cup
let zero_cup_count = 0;
onmessage = function(e) {
  console.log('Message received from main script ');
  let messageType = (e.data[0]);
  let result = "";
  console.log('Type ' + messageType);
  if(messageType == "run_single_race"){
    //run a single race and return the time taken
    result = run_track_race(e.data[1], e.data[2], e.data[3]);
  }
  else if(messageType == "run_ga"){
    result = run_track_race_ga(e.data[1], e.data[2], e.data[3]);
  }
  else if(messageType == "run_robustness_check"){
    robustnessresult = run_robustness_check(e.data[1], e.data[2], e.data[3]);
    result = robustnessresult.message;
  }
  else if(messageType == "run_consistency_check"){
    consistencyresult = run_consistency_check(e.data[1], e.data[2], e.data[3]);
    result = consistencyresult.message;
  }
  else{
    console.log("Unknown request type " + messageType);
  }

  postMessage(result);
}


let newton_lookup = []; //used to store newton() function calculations to avoid tons of needless calls

//settings_r.stats.crossover_instruction_sizes = [];


function shuffleArray(array) {
  // this is a version of the Fisher-Yates/knuth shuffle https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm

  for (let i = array.length - 1; i >= 0; i--) { //changed i > 0 to i >= 0 cos i figured item at 0 will be less likely to be swapped?
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function mapEffortToPower(threshold_effort_level, rider_effort, rider_threshold, rider_max, maximum_effort_value ){
  //donalK25: changing refs to constant 9 to maximum_effort_value var
  let power_from_effort = 0;

  if (rider_effort < threshold_effort_level){
    power_from_effort = rider_threshold*(rider_effort)/threshold_effort_level;
  }
  else if(rider_effort == threshold_effort_level){
    power_from_effort = rider_threshold;
  }
  else{
    power_from_effort = rider_threshold + (rider_max - rider_threshold) *((rider_effort-threshold_effort_level)/(maximum_effort_value-threshold_effort_level));
  }
  //console.log("mapped effort " + rider_effort + " to power " + power_from_effort);
  return power_from_effort;
}
function mapPowerToEffort(threshold_effort_level, rider_power, rider_threshold, rider_max, maximum_effort_value ){
  let effort_level = 0;
  if (rider_power < rider_threshold){
    effort_level = ((rider_power*threshold_effort_level)/rider_threshold);

  }
  else if(rider_power == rider_threshold){
    effort_level = threshold_effort_level;
  }
  else{ //power is over threshold
    if (rider_power >= rider_max ){
      effort_level = maximum_effort_value;
    }
    else{
      //reverse how power is worked out when over the threshold
      effort_level = ((rider_power - rider_threshold )*(maximum_effort_value-threshold_effort_level))/(rider_max - rider_threshold) + threshold_effort_level;
    }
  }
  //console.log("mapped power " + rider_power + " to effort " + effort_level);
  return effort_level;
}

//convert a uniform distribution 0-1 random number to a normal one
//taken from https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
function randn_bm() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return randn_bm() // resample between 0 and 1
    return num
  }


  // performance failure functoions
  function calculate_rider_performance_failure_probability(effort, effort_max, current_fatigue,current_fatigue_max, accumulated_fatigue,accumulated_fatigue_max, rider_performance_failure_rate,rider_performance_failure_rate_max, performance_failure_probability_exponent,performance_failure_effort_importance_multiplier){

    //work out a percentage that this rider is going to fail right now
    let rider_performance_failure_probability = ((((Math.pow(effort,performance_failure_probability_exponent)/Math.pow(effort_max,performance_failure_probability_exponent))*performance_failure_effort_importance_multiplier + (Math.pow(current_fatigue,performance_failure_probability_exponent)/Math.pow(current_fatigue_max,performance_failure_probability_exponent)) + (Math.pow(accumulated_fatigue,performance_failure_probability_exponent)/Math.pow(accumulated_fatigue_max,performance_failure_probability_exponent)))/(3+(performance_failure_effort_importance_multiplier-1)))*(rider_performance_failure_rate/rider_performance_failure_rate_max));
    // console.log("will this rider fail? probability calced to be " + rider_performance_failure_probability);
    return DecimalPrecision.round(rider_performance_failure_probability,4);
  }

  function calculate_rider_performance_failure_percentage_amount(effort, effort_max, current_fatigue, current_fatigue_max, accumulated_fatigue, accumulated_fatigue_max, rider_performance_failure_multiplier,rider_performance_failure_multiplier_max,  performance_failure_base_max_percentage,performance_failure_amount_exponent,performance_failure_effort_importance_multiplier,failure_type ){

    //how much will the rider fail by?
    // dk feb 22; adding a new version of this where the % of failure amount is more random

    //dk22 found issue where current_fatigue > current_fatigue_max sometimes... can happen 'legally'
    //set the upper bound to be current_fatigue_max and just limit current_fatigue
    if (current_fatigue > current_fatigue_max){
      current_fatigue_max = current_fatigue; //current_fatigue/current_fatigue_max will now max out at 1
    }

    let rider_performance_failure__percentage_amount = (
      (
        (
          (Math.pow(effort,performance_failure_amount_exponent)/Math.pow(effort_max,performance_failure_amount_exponent))*performance_failure_effort_importance_multiplier +
          (Math.pow(current_fatigue,performance_failure_amount_exponent)/Math.pow(current_fatigue_max,performance_failure_amount_exponent)) +
          (Math.pow(accumulated_fatigue,performance_failure_amount_exponent)/Math.pow(accumulated_fatigue_max,performance_failure_amount_exponent))
        )/(3+(performance_failure_effort_importance_multiplier-1))

      )
      * (rider_performance_failure_multiplier/rider_performance_failure_multiplier_max)
    );
    //console.log("rider_performance_failure__percentage_amount =  " + rider_performance_failure__percentage_amount + " * " + performance_failure_base_max_percentage + " = " + (rider_performance_failure__percentage_amount*performance_failure_base_max_percentage));
    rider_performance_failure__percentage_amount  = rider_performance_failure__percentage_amount*performance_failure_base_max_percentage;

    //check the type to applying#
    let version = 1;
    if(failure_type){
      version = failure_type;
    }

    if(version == 2){
      // make it a probabilitsic range from 0 to the original amount
      let p1 = Math.random();
      let amount1 = (rider_performance_failure__percentage_amount*p1);

      if (amount1 > max_performance_failure_percentage){
        max_performance_failure_percentage = amount1;
        //log info if this is really high
        console.log("####****max_performance_failure_percentage breached****####");
        console.log("max_performance_failure_percentage " + max_performance_failure_percentage
        + " effort " + effort + " effort_max " + effort_max
        + " current_fatigue " + current_fatigue + " current_fatigue_max " + current_fatigue_max
        + "\n accumulated_fatigue " +  accumulated_fatigue
        + "\n accumulated_fatigue_max " +  accumulated_fatigue_max
        + " rider_performance_failure_multiplier " + rider_performance_failure_multiplier
        + " rider_performance_failure_multiplier_max " + rider_performance_failure_multiplier_max
        + "\n performance_failure_base_max_percentage " + performance_failure_base_max_percentage
        + " performance_failure_amount_exponent " + performance_failure_amount_exponent
        + "\n performance_failure_effort_importance_multiplier " + performance_failure_effort_importance_multiplier
        + " failure_type " + failure_type);

      }
      //console.log("Performance failure, adjusting from deterministic " + rider_performance_failure__percentage_amount + "to randomised " + amount1);
      return DecimalPrecision.round(amount1,4);

    }
    else // assume version == 1, i.e. the standard
    {
      return DecimalPrecision.round(rider_performance_failure__percentage_amount,4);
    }
  }

  //test mapPowerToEffort() and mapEffortToPower()
  // console.log("************TEST mapEffortToPower and back via mapPowerToEffort************")
  // for(let i = 0;i <= 18;i++){
  //   let powerFromEffort =  mapEffortToPower(6, i/2, 400, 1000 );
  //   console.log("mapEffortToPower(6," + i/2 + ",400,1000) = " + powerFromEffort);
  //   let effortFromPower =   mapPowerToEffort(6,powerFromEffort,400,1000);
  //   console.log("mapPowerToEffort(6," + powerFromEffort + ",400,1000) = " + effortFromPower);
  // }

  function mutate_race(r, settings_r,gen){
    let new_race = {};

    const p_shuffle_start = settings_r.ga_p_shuffle_start;
    const p_add_instruction = settings_r.ga_p_add_instruction;
    const p_delete_instruction = settings_r.ga_p_delete_instruction;
    const p_change_effort = settings_r.ga_p_change_effort;
    const p_change_drop = settings_r.ga_p_change_drop;
    const p_move_instruction = settings_r.ga_p_move_instruction;
    const range_to_move_instruction = settings_r.ga_range_to_move_instruction;
    const range_to_change_effort = settings_r.ga_range_to_change_effort;

    let time_taken_old = r.time_taken;

    //DonalK25: if the global ga_mutation_switch is set to anything other than 1, quit.
    // this is a new setting so set the default to 1 if the setting is not found
    let ga_mutation_switch = 1;
    if (typeof(settings_r.ga_mutation_switch) != "undefined"){
      ga_mutation_switch = settings_r.ga_mutation_switch;
    }

    if(ga_mutation_switch !== 1){
      //console.log("************ ga_mutation_switch is OFF, no mutation! ************");
      // going to make a copy of r and return that instead of using it as is?
        let r_clone = JSON.parse(JSON.stringify(r)); //clone of object, no mutations
        r_clone.time_taken = 0;
        r_clone.stats = {};
        r_clone.stats.number_of_instructions_added = 0;
        r_clone.stats.number_of_instructions_removed = 0;
        r_clone.stats.number_of_instructions_moved = 0;
        r_clone.stats.number_of_effort_instructions_changed = 0;
        r_clone.stats.number_of_drop_instructions_changed = 0;
        r_clone.stats.number_of_start_order_shuffles = 0;
        r_clone.stats.number_of_drop_instructions = 0;
      return r_clone;
    }


    new_race.start_order = [...r.start_order];
    new_race.variant_id = r.variant_id;
    //also set a geenration, type, and counter
    new_race.id_generation = gen;
    new_race.id_type = 1;
    new_race.id_mutant_counter = settings_r.mutant_counter;
    //should now be able to id a mutant even if it gets moved around/shuffled

    new_race.instructions = [];
    new_race.time_taken = 0;
    new_race.stats = {};
    new_race.stats.number_of_instructions_added = 0;
    new_race.stats.number_of_instructions_removed = 0;
    new_race.stats.number_of_instructions_moved = 0;
    new_race.stats.number_of_effort_instructions_changed = 0;
    new_race.stats.number_of_drop_instructions_changed = 0;
    new_race.stats.number_of_start_order_shuffles = 0;
    new_race.stats.number_of_drop_instructions = 0;

    if(Math.random() < p_shuffle_start){
      //note that shuffling in place may cause bugs
      shuffleArray(new_race.start_order);
      new_race.stats.number_of_start_order_shuffles++;
    }

    //for(let i = 0;i<time_taken_old;i++){
    for(let i = 0;i<r.instructions.length;i++){
      if(r.instructions.filter(a => a[0] == i).length == 0){
        //no instruction here- add a new one?
        if (Math.random() < p_add_instruction){
          let new_instruction = new_random_instruction(i,settings_r);
          new_race.instructions.push(new_instruction);
          new_race.stats.number_of_instructions_added++;
          if(new_instruction[1].indexOf("drop") >=0){
            new_race.stats.number_of_drop_instructions++;
          }
        }
      }
      else{
        //there is an instruction here. assume only 1 per timestep
        let current_instruction = [...r.instructions.filter(a => a[0] == i)[0]];
        let is_effort_instruction = current_instruction[1].indexOf("effort");

        if(Math.random() > p_delete_instruction){//if deleting, just ignore it
          if(is_effort_instruction != -1){
            if((Math.random() < p_change_effort)){
              let current_effort = parseFloat(current_instruction[1].split("=")[1]);
              let new_effort = Math.floor((current_effort + ((range_to_change_effort*-1) + (Math.random()*(range_to_change_effort*2))))*100)/100;
              if(new_effort < settings_r.minimum_power_output){
                new_effort = settings_r.minimum_power_output;
              }
              else if(new_effort > settings_r.maximum_effort_value){
                new_effort = settings_r.maximum_effort_value;
              }
              current_instruction[1] = "effort=" + new_effort;
              new_race.stats.number_of_effort_instructions_changed++;
            }
          }
          else{
            new_race.stats.number_of_drop_instructions++;
            if((Math.random() < p_change_drop)){
              current_instruction[1] = "drop=" + (1 + Math.floor(Math.random()*(settings_r.ga_team_size-1)));
              new_race.stats.number_of_drop_instructions_changed++;
            }
          }
          //also might move the timestep a bit
          if(Math.random() < p_move_instruction){
            let new_location = current_instruction[0] + Math.floor((range_to_move_instruction*-1) + (Math.random()*(range_to_move_instruction*2)));
            if(new_location < 0){
              new_location = 0;
            }
            //DonalK25 april: could remove this? i.e. let it be slower, and just trim it out if it is not used? otherwise it will have a higher chance of putting instructions right at the last step?
            /*
            if(new_location > time_taken_old){
              new_location = time_taken_old;
            }
            */
            //only move it there is NOT an instruciton already there
            if(r.instructions.filter(a => a[0] == new_location).length==0 && new_race.instructions.filter(a => a[0] == new_location).length==0){
              current_instruction[0] = new_location;
              new_race.stats.number_of_instructions_moved++;
            }
          }
          new_race.instructions.push(current_instruction)
        }
        else{
          new_race.stats.number_of_instructions_removed++;
        }
      }
    }

    return new_race;
  }

  function mutate_instruction(settings_r, race_r, instruction){
    //tweak an instruction a little and return it
    //move the time position?
    //console.log("*>*>*> robustness instruction mutation BEGIN *<*<*<");
    //console.log("original " + instruction);
    let time_position_prob = 0.3;

    if (settings_r.hasOwnProperty("robustness_mutate_inst_time_position_prob")){
      time_position_prob = settings_r.robustness_mutate_inst_time_position_prob;
    }
    let range_to_move_instruction = 2;
    if (settings_r.hasOwnProperty("robustness_mutate_inst_range_to_move_instruction")){
      range_to_move_instruction = settings_r.robustness_mutate_inst_range_to_move_instruction;
    }
    let range_to_change_effort = 1;
    if (settings_r.hasOwnProperty("robustness_mutate_inst_range_to_change_effort")){
      range_to_change_effort = settings_r.robustness_mutate_inst_range_to_change_effort;
    }

    //robustness_mutate_inst_range_to_change_effort

    let time_taken_old = race_r.time_taken;
    let new_instruction=[...instruction]; //new instruction, copy of old one

    if (Math.random() < time_position_prob){
      debugger
        //move, don't adjust value
        let new_location = instruction[0] + Math.floor((range_to_move_instruction*-1) + (Math.random()*(range_to_move_instruction*2)));
            if(new_location < 0){
              new_location = 0;
            }
            //don't go over the old time
            //DonalK25 april: let it go over anf then have it trimmed out it new_instructions_reduced
            /*
            if(new_location > time_taken_old){
              new_location = Math.floor(time_taken_old);
            }
            */
            //only move it there is NOT an instruction already there
            //only need to check the original (changing one at a time)
            if(race_r.instructions.filter(a => a[0] == new_location).length==0){
              new_instruction[0] = new_location;
            }
    }
    else{
      //tweak the effort or drop value
      let is_effort_instruction = instruction[1].indexOf("effort");

      if(is_effort_instruction != -1){
        //effort
        let current_effort = parseFloat(instruction[1].split("=")[1]);
        let new_effort = Math.floor((current_effort + ((range_to_change_effort*-1) + (Math.random()*(range_to_change_effort*2))))*100)/100;
        if(new_effort < settings_r.minimum_power_output){
        	new_effort = settings_r.minimum_power_output;
        }
        else if(new_effort > settings_r.maximum_effort_value){
        	new_effort = settings_r.maximum_effort_value;
        }
        new_instruction[1] = "effort=" + new_effort;
        //console.log("*>*>*> robustness instruction mutation END *<*<*<");
      }
      else{
        //drop
        //don't allow the same value
        let current_drop_value = parseInt(instruction[1].split("=")[1]);
        let random_to_add = (1 + Math.floor(Math.random()*(settings_r.ga_team_size-2)));
        //note the -2 above, as otherwise we can hit the same value again.
        let new_drop_position = 1+((current_drop_value + (random_to_add-1)) % (settings_r.ga_team_size-1));
        new_instruction[1] = "drop=" + new_drop_position;
      }
    }
    //console.log("new " + new_instruction);
    return new_instruction;
  }

  function new_random_instruction(timestep, settings_r){
    let probability_of_drop_instruction = settings_r.ga_probability_of_drop_instruction;
    let new_instruction = [];
    new_instruction[0] = timestep;
    let rand2 = Math.random();
    if(rand2 > probability_of_drop_instruction){
      //add an effort instruction. but what level?
      let rand_effort = settings_r.minimum_power_output + (Math.round(Math.random()*(10-settings_r.minimum_power_output)*100)/100);
      new_instruction[1] = "effort="+rand_effort;
    }else{
      new_instruction[1] = "drop="+(1 + Math.floor(Math.random()*(settings_r.ga_team_size-1)));
    }
    return new_instruction;
  }

  function run_track_race(settings_r, race_r, riders_r){
    //include a run type to know how this race is being run
    settings_r.run_type = "single_race";
    let race_results = run_race(settings_r,race_r,riders_r);
    return race_results;

    //$("#race_result").text('Finish Time = ' + time_taken);
  }

  function run_robustness_check(settings_r, race_r, riders_r){

    //create a population of mutations and measure how much they vary
    let population = [];

    //get the time of the original
    settings_r.run_type = "robustness_check";
    let race_results = run_race(settings_r,race_r,riders_r);
    race_r.time_taken = race_results.time_taken;
    let original_time_taken = race_r.time_taken;



    // running the race clears the instruction[] array but it is needed for the mutation function
    race_r.instructions = [...race_r.race_instructions_r]; // added Jan 24, was not creating mutants because race_r.instrucitons was [] :-(

    let original_instructions = [...race_r.instructions];
    let original_start_order = [...race_r.start_order];

    //now set up a population of mutants
    //debugger
    //console.log("Creating mutant clones for " + race_r.instructions);
    for(i=0;i<settings_r.robustness_check_population_size;i++){
      if(race_r.start_order == undefined ){
        debugger;
      }
      let new_mutated_clone = mutate_race(race_r,settings_r,1001);
      //console.log("mutant clone " + i + " " + new_mutated_clone.instructions);
      population.push(new_mutated_clone);
    }

    let one_fifth = Math.floor(settings_r.robustness_check_population_size/5);
    let one_fifth_count = 0;

    //now run each race and store the results
    let population_stats = [];
    let race_result = 0;
    let fittest_mutant_time_taken = 100000;
    let unfittest_mutant_time_taken = 0;

    for(i=0;i<population.length;i++){
      let load_race_properties = population[i];
      race_r.race_instructions_r = [...load_race_properties.instructions];
      race_r.start_order = [...load_race_properties.start_order];
      settings_r.run_type = "robustness_check";

      let race_results = run_race(settings_r,race_r,riders_r);
      load_race_properties.time_taken = race_results.time_taken;
      population_stats.push(load_race_properties.time_taken);

      if (load_race_properties.time_taken < original_time_taken ){
        //we've found a better solution, so log it?
        console.log("Robustness check found better solution");
        console.log("Start Order " + race_r.start_order);
        console.log("Instructions " + load_race_properties.instructions);
      }

      //update best and worst if needs be
      if (load_race_properties.time_taken > unfittest_mutant_time_taken){
        unfittest_mutant_time_taken = load_race_properties.time_taken;
      }
      if (load_race_properties.time_taken < fittest_mutant_time_taken){
        fittest_mutant_time_taken = load_race_properties.time_taken;
      }

      if (i % one_fifth == 0){
        console.log("robustness check " + one_fifth_count*25 + "% done");
        one_fifth_count++;
      }
    }

    //return the stats
    //work out the average
    let sumOfMutantRaceTimes = 0;
    for(i=0;i<population_stats.length;i++){
      sumOfMutantRaceTimes+=population_stats[i]; //summing the finish times
    }

    let mutantMean =  (sumOfMutantRaceTimes/population_stats.length);

    robustness_result={};

    robustness_result.original_time_taken = original_time_taken;
    robustness_result.average_mutant_time_taken = mutantMean;
    robustness_result.unfittest_mutant_time_taken = unfittest_mutant_time_taken;
    robustness_result.fittest_mutant_time_taken = fittest_mutant_time_taken;

    //loop through again knowing the mean to work out the standard deviation
    let mutantStdDev = 0;
    let mutantVariance = 0;
    let totalDeviation = 0;
    for(i=0;i<population_stats.length;i++){
      totalDeviation+=Math.pow((population_stats[i] - mutantMean),2); //summing the finish times
    }

    mutantVariance = totalDeviation/population_stats.length;
    mutantStdDev = Math.sqrt(mutantVariance);

    robustness_result.robustness_check_standard_dev = mutantStdDev;
    //add a message
    robustness_result.message = "Robustness Check:  Original race time taken " + original_time_taken + "<br> Average time of " + population.length + " mutants = " + mutantMean + ", std. Dev. " + mutantStdDev;

    //debugger
    //donalK24: new robustness measure, mutate each instruction a fixed number of times and measure the effect of each
    let ga_robustness_check_mutation_per_instruction = 0;
    if (settings_r.ga_robustness_check_mutation_per_instruction){
      ga_robustness_check_mutation_per_instruction = settings_r.ga_robustness_check_mutation_per_instruction;
    }
    if(ga_robustness_check_mutation_per_instruction > 0){
        let robustness_single_mutation_times = [];
        let robustness_single_mutation_mutations = [];
        //get back to the original version of the race (unmutated)
        race_r.race_instructions_r = [...original_instructions];
        race_r.instrutions = [...original_instructions];
        race_r.start_order = [...original_start_order];
        settings_r.run_type = "robustness_check";
        race_r.time_taken = original_time_taken;

        //go through each instruction
        for(let ii = 0; ii<race_r.race_instructions_r.length;ii++){
          //do it a number of times
          //we don't want to add any duplicates (run identical races)
          let already_run = {};
          let original_instruction = race_r.race_instructions_r[ii];
          already_run[JSON.stringify(original_instruction)] = 1;

          for(let ix = 0; ix < ga_robustness_check_mutation_per_instruction; ix++){
            //need to reset the instructions each time
            //race_r.instrutions_r = [...original_instructions];
            let mutated_instruction = mutate_instruction(settings_r,race_r,race_r.race_instructions_r[ii]);
            //check if the timestep contains a decimal point
            if(String(mutated_instruction[0]).indexOf(".") >= 0){
              debugger
            }
            //run  if NOT already run
            if(JSON.stringify(mutated_instruction) in already_run){
              //console.log("robustness variation already ran " + JSON.stringify(mutated_instruction));
            }
            else{
              already_run[JSON.stringify(mutated_instruction)] = 1;
              race_r.race_instructions_r[ii] = mutated_instruction;
              let race_results = run_race(settings_r,race_r,riders_r);
              robustness_single_mutation_times.push(race_results.time_taken);
              robustness_single_mutation_mutations.push(JSON.stringify(original_instruction) + " -> " + JSON.stringify(mutated_instruction));
              //reset to the original instruction
              race_r.race_instructions_r[ii] =   original_instruction;
            }
          }
        }

      let average_single_mutation = 0;
      let sum_mutation_times = 0;
      let sum_percentage_time_worsens_total = 0;
      //note that the number of actual mutations tried will vary as there may be duplicates (mostly with DROPs)
      for(let iy = 0;iy<robustness_single_mutation_times.length;iy++){
        sum_mutation_times += robustness_single_mutation_times[iy];
        let time_worsens = robustness_single_mutation_times[iy]-original_time_taken;
        let time_worsens_p = 0;
        if(time_worsens < 0){
          time_worsens = 0;
        }
        sum_percentage_time_worsens_total += (robustness_single_mutation_times[iy]/original_time_taken);
      }
      console.log("!!  Robustness robustness_single_mutation_times !!");
      console.log(robustness_single_mutation_times);
      console.log(robustness_single_mutation_mutations);

      average_single_mutation = DecimalPrecision.round(sum_mutation_times / robustness_single_mutation_times.length,2);
      let average_percentage_time_worsens_total = DecimalPrecision.round(sum_percentage_time_worsens_total / robustness_single_mutation_times.length,2);
      robustness_result.robustness_single_mutation_qty = robustness_single_mutation_times.length;
      robustness_result.robustness_single_mutation_average = average_single_mutation;
      robustness_result.robustness_single_mutation_worsening_effect_multiplier = average_percentage_time_worsens_total;
      robustness_result.robustness_single_mutation_times = JSON.stringify(robustness_single_mutation_times);

      //append to the message (displays if you run it from the GA page)
      robustness_result.message += "<br>Instruction Mutation tests";
      robustness_result.message += "<br>Total variations run: " + robustness_result.robustness_single_mutation_qty;
      robustness_result.message += "<br>Average race time: " + robustness_result.robustness_single_mutation_average;
      robustness_result.message += "<br>Average % that times worsens: " + robustness_result.robustness_single_mutation_worsening_effect_multiplier;
      robustness_result.message += "<br>Times: " + robustness_result.robustness_single_mutation_times;
    }
    console.log("!!robustness_result!!");
    console.log(robustness_result);
    return robustness_result;
  }
  function run_consistency_check(settings_r, race_r, riders_r){
    //get the time of the original
    settings_r.run_type = "consistency_check";
    //repeatedly run the same race to check if it always returns the same time
    let consistency_check_population_size_used = 1000;
    if (settings_r.consistency_check_population_size){
      consistency_check_population_size_used = settings_r.consistency_check_population_size
    }

    let race_results_all = [];

    for(i=0;i<consistency_check_population_size_used;i++){
      race_r.drop_instruction = 0;
      race_r.live_instructions = [];
      race_r.race_instructions = [];

      let race_results = run_race(settings_r,race_r,riders_r);
      race_results_all.push(race_results.time_taken);
    }

    console.log("race_results_all" + race_results_all);
    //return the stats
    consistency_result={};
    consistency_result_dict = {};
    for(i=0;i<race_results_all.length;i++){
      if (race_results_all[i] in consistency_result_dict){
        consistency_result_dict[race_results_all[i]]++;
      }
      else{
        consistency_result_dict[race_results_all[i]] = 1;
      }
    }

    consistency_result.message = "Consistency Check: Ran race " + consistency_check_population_size_used + " times. Race times " + JSON.stringify(consistency_result_dict);
    consistency_result.result = consistency_result_dict;

    return consistency_result;
  }

  function run_track_race_ga(settings_r, race_r, riders_r){
    //generate a set of instructions
    const max_timestep = settings_r.ga_max_timestep;
    const probability_of_instruction_per_timestep_lower = settings_r.ga_probability_of_instruction_per_timestep_lower;
    const probability_of_instruction_per_timestep_upper =settings_r.ga_probability_of_instruction_per_timestep_upper;
    const population_size = settings_r.ga_population_size;
    const ga_population_size_first_generation = settings_r.ga_population_size_first_generation;
    const settings_id = settings_r._id;

    let ga_results = {}; //results object
    ga_results.start_time = new Date();
    ga_results.generations = [];

    //warn user if the population_size is not an even square
    //dk2020: commenting this out as it is relevant only for the original perfect squares populaiton generation
    // if(!Number.isInteger(Math.sqrt(population_size))){
    //   alert("Warning: ga_population_size of " + population_size + " should be a product of an integer squared, e.g. 9,25,36,3600")
    // }
    const team_size = settings_r.ga_team_size;
    const number_of_generations = settings_r.ga_number_of_generations;

    let population = [];

    //create a starting population: use ga_population_size_first_generation so that a larger set can be used to create the initial set: this will not work with tournament selection!
    for (let p=0;p<settings_r.ga_population_size;p++){
      //create a random starting order
      let new_race = {};
      let start_order = [];
      let probability_of_instruction_per_timestep = probability_of_instruction_per_timestep_lower + Math.random()*(probability_of_instruction_per_timestep_upper-probability_of_instruction_per_timestep_lower);

      for(let i = 0;i<team_size;i++){
        start_order.push(i);
      }
      shuffleArray(start_order);
      new_race.start_order =[...start_order];
      let instructions = [];
      //create a set of random instructions
      for(let i=0;i<max_timestep;i++){
        //add a new instruction, maybe
        let rand = Math.random();
        if(rand <= probability_of_instruction_per_timestep){
          //add an insruction, but whaich type?
          instructions.push(new_random_instruction(i,settings_r));
        }
      }
      new_race.instructions = instructions;
      new_race.variant_id = p;
      new_race.id_generation = 0;
      new_race.id_type = 0;
      new_race.id_mutant_counter = 0;
      population.push(new_race);
    }

    let segment_size = 20; //just to log % of gens done
    let one_segment = Math.floor(number_of_generations/segment_size);
    let one_segment_count = 0;

    let race_tracker = {}; //store ids of every race run to try find cases where the times differ

    max_performance_failure_percentage = 0;
    max_fatigue_rise = 0;
    max_endurance_fatigue_level = 0;

    best_race_time_found_thus_far = -1; //-1 as a default to ignore (1st gen)

    for(let g=0;g<number_of_generations;g++){

      if (g==(number_of_generations-1)){
        global_log_message_now = true;
      }
      //run each race and track the scores.
      //console.log("Generation " + g + " before racing ");
      //console.log(population);

      let stats_total_time = 0;
      let stats_average_time = 0;
      let stats_total_number_of_instructions = 0;
      let race_fitness_all = [];
      let stats_average_number_of_instructions = 0;
      let stats_std_dev_number_of_instructions = 0;
      //need to find the best solution from the whole population
      let final_best_race_properties_index = 0;
      let final_best_race_properties = population[0];
      let best_race_rider_power = [];
      let best_race_distance_2nd_last_timestep = 0;
      let best_race_distance_last_timestep = 0;

      let final_worst_race_properties_index = 0;
      let final_worst_race_properties = population[0];
      let worst_race_rider_power = [];

      let best_race_instruction_noise_alterations = {};
      let worst_race_instruction_noise_alterations = {};

      let best_race_performance_failures = {};
      let worst_race_performance_failures = {};

      let best_race_instruction_noise_choke_under_pressure = {};
      let worst_race_instruction_noise_choke_under_pressure = {};

      let best_race_instruction_noise_overeagerness = {};
      let worst_race_instruction_noise_overeagerness = {};

      //new structs to store generation instructions info, if asked for
      let generation_instructions_info = {effort:{},drop:{}};

      //dk23 reset the generation_best_time
      generation_best_time = Infinity;

      let log_generation_instructions_info = false;
      if(settings_r.log_generation_instructions_info){
        if (settings_r.log_generation_instructions_info.includes(g)){
          //should log the data for this generation
          log_generation_instructions_info = true;
          // console.log("[[[[[[[[ Log log_generation_instructions_info ]]]]]]]]");
          //     //set up the generation_instructions_info structs with empty values
          //     for(let i = 0;i<settings_r.ga_max_timestep;i++){
          //       generation_instructions_info.effort[i] = [];
          //
          //
          //     }
          //
          //     console.log(JSON.stringify(generation_instructions_info));

        }
      }

      //print % progress every segment
      if (g % one_segment == 0){
        console.log(one_segment_count*(100/segment_size) + "% done, max_performance_failure_percentage found " + max_performance_failure_percentage);
        one_segment_count++;
      }
      //d22: we want to send the best race time of the last gen to each race?

      for(let i = 0;i<population.length;i++){
        //reset any race properties

        race_r.drop_instruction = 0;
        race_r.live_instructions = [];
        race_r.race_instructions = [];
        race_r.race_instructions_r = [];

        let load_race_properties = population[i];
        race_r.race_instructions_r = [...load_race_properties.instructions];
        race_r.start_order = [...load_race_properties.start_order];

        if(log_generation_instructions_info){
          //add data to the structure for saving instruciton info
          //will need to go through each instruciton for each citizen
          for (let ii = 0; ii < race_r.race_instructions_r.length; ii++){
            let timestep_ii =  parseInt(race_r.race_instructions_r[ii][0]);
            //split the actual instruction
            let inst = race_r.race_instructions_r[ii][1].split("=");
            if (inst.length=2){
              if(inst[0]=="effort"){
                let effort_value = parseFloat(inst[1]);
                //add to dict
                //create the object if it does not exist (sparser dict)
                if(!generation_instructions_info.effort[timestep_ii]){
                  generation_instructions_info.effort[timestep_ii] = [];
                }
                generation_instructions_info.effort[timestep_ii].push(effort_value);

              }
              else if(inst[0]=="drop"){
                let drop_value  = parseInt(inst[1]);
                //seems that the drop value can be bigger than the team size, shite :-( )
                if (drop_value > (settings_r.ga_team_size-1)){
                  drop_value = settings_r.ga_team_size-1;
                }
                // ah wait, we have to  map drop 1 to array element 0 and so on, so subtract 1
                drop_value--;
                if(!generation_instructions_info.drop[timestep_ii]){
                  //need ar array of team_size-1 for each generation, all set to 0
                  let team_size_array = [];
                  for (let ts = 0; ts< settings_r.ga_team_size - 1; ts++){
                    team_size_array.push(0);
                  }
                  generation_instructions_info.drop[timestep_ii] = team_size_array; //may have a shallow/deep copy issue?
                }
                generation_instructions_info.drop[timestep_ii][drop_value]++;
              }
            }
          }
        }

        // let race_tracker_id = JSON.stringify(  race_r.start_order) +  (JSON.stringify(  race_r.race_instructions_r));
        // race_tracker_id = race_tracker_id.replace(/\W/g, ''); //remove any non-aplhanumeric values
        // race_tracker_id = race_tracker_id.replace(/effort/g,'e');
        // race_tracker_id = race_tracker_id.replace(/drop/g,'d');

        //run the actual race, i.e. the fitness function, returning just a time taken
        settings_r.run_type = "ga";
        //console.log("riders " + JSON.stringify(riders_r));

        //create a copy of the 3 arguments to monitor changes (may be slow)
        let settings_r_copy = (JSON.stringify(settings_r));
        let race_r_copy = (JSON.stringify(race_r));
        let riders_r_copy = (JSON.stringify(riders_r));

        //donalK22: average the results if needed (to handle effects of noise)
        let number_of_races_to_average = 1;
        if (settings_r.number_of_races_to_average){
          number_of_races_to_average = settings_r.number_of_races_to_average;
        }

        let race_results = {};
        let total_time_taken = 0;
        let average_time_taken = 0;

        if (number_of_races_to_average > 1){
          //run them all and average the finish time
          // note that the other aspects of the results will have to come from the final race?
          total_finish_time = 0;
          //console.log("====== Average Multiple Race Times ======");
          for(let a_i = 0; a_i < number_of_races_to_average; a_i++){
            //dk22: pressure noise, send best_race_time_found_thus_far
            settings_r.best_race_time_found_thus_far = best_race_time_found_thus_far;
            race_results = run_race(settings_r,race_r,riders_r);
            //console.log("====== Race " + a_i + " " + race_results.time_taken + " ======");
            total_time_taken += race_results.time_taken;
          }
          average_time_taken = (total_time_taken/number_of_races_to_average);
          //console.log("====== average_time_taken " + average_time_taken + " ======");

        }
        else{
          settings_r.best_race_time_found_thus_far = best_race_time_found_thus_far;
          race_results = run_race(settings_r,race_r,riders_r);
          average_time_taken = race_results.time_taken;
        }


        //now check if the exact race was already run and if so if the time is different. if it is log information.

        // commented out to save on processing

        // if(race_tracker.hasOwnProperty(race_tracker_id)){
        //   //this exact race was run before
        // //  console.log("Race ran before");
        // //  console.log("Race ID " + race_tracker_id );
        //   let last_run_time = race_tracker[race_tracker_id]; //should be the finish time
        //   if (race_results.time_taken != last_run_time){
        //       // run times differ
        //       console.log("RUN TIMES for same race differ from " + last_run_time + " to " + race_results.time_taken);
        //       // console.log("Race ID " + race_tracker_id );
        //       console.log("START SETTINGS");
        //       console.log(settings_r_copy)
        //       console.log(race_r_copy);
        //       console.log(riders_r_copy);
        //   }
        // }
        // else{
        //   race_tracker[race_tracker_id] = race_results.time_taken;
        // }

        //let's check the 3 arguments to see if anything is changing as the ga loops through the population

        //load_race_properties.time_taken = race_results.time_taken;
        load_race_properties.time_taken = average_time_taken;
        stats_total_time += load_race_properties.time_taken;
        stats_total_number_of_instructions += load_race_properties.instructions.length;
        race_fitness_all.push(average_time_taken); //add all times to an array to be able to analyse laterz

        //donalK25: log the number of instructions that happen AFTER the race finishes.
        // find any instructions with timestamps greater than load_race_properties.time_taken

        //try and trim the unused instructions, if the setting is on
        let ga_trim_unused_late_instructions = 0;
        if (typeof(settings_r.ga_trim_unused_late_instructions) != "undefined"){
          ga_trim_unused_late_instructions = settings_r.ga_trim_unused_late_instructions;
        }

        let check_inst = load_race_properties.instructions.length-1;
        while(check_inst >= 0 && load_race_properties.instructions[check_inst][0] > load_race_properties.time_taken){
          check_inst--;
        }
        if(check_inst < load_race_properties.instructions.length-1){
          //console.log("^^^^^^^^^^ " + (load_race_properties.instructions.length-1 - check_inst) + " instructions past the race end time " + load_race_properties.time_taken + " ^^^^^^^^^^");
        //  console.log("^^^^^^^^^^ race end time " + load_race_properties.time_taken + " ^^^^^^^^^^");
          //console.log("^^^^^^^^^^ instructions " + JSON.stringify(load_race_properties.instructions) + " ^^^^^^^^^^");

          if(ga_trim_unused_late_instructions == 1){
            //create a new array up to the trim point and assign this to the original
            let trim_array = [];
            let i_trim = 0;
            while(i_trim < load_race_properties.instructions.length){
              if(load_race_properties.instructions[i_trim]){
                if(load_race_properties.instructions[i_trim][0]){
                  if(load_race_properties.instructions[i_trim][0] <= Math.floor(load_race_properties.time_taken)){
                    trim_array.push(load_race_properties.instructions[i_trim]);
                  }
                }
              }
               i_trim++;
            }

            //console.log("^^^^^^^^^^ Replace " + JSON.stringify(load_race_properties.instructions) + " with " + JSON.stringify(trim_array) + " ^^^^^^^^^^");
            load_race_properties.instructions = trim_array;
          }

        }

        //update best race if a new best is found
        //console.log("race run, id " + population[i].variant_id + "_" + population[i].id_generation + "_" + population[i].id_type + "_" + population[i].id_mutant_counter + " " +population[i].time_taken + " seconds | start_order " +  population[i].start_order);

        //are population[i] and  load_race_properties the same actual object?
        // yup yup, seems thus
        if(population[i].time_taken < final_best_race_properties.time_taken){
          final_best_race_properties_index = i;
          final_best_race_properties = population[i];
          best_race_rider_power = race_results.power_output;
          best_race_distance_2nd_last_timestep = race_results.distance_2nd_last_timestep;
          best_race_distance_last_timestep = race_results.distance_last_timestep;

          best_race_instruction_noise_alterations = race_results.instruction_noise_alterations;
          best_race_performance_failures = race_results.performance_failures;
          best_race_instruction_noise_choke_under_pressure = race_results.instruction_noise_choke_under_pressure;
          best_race_instruction_noise_overeagerness = race_results.instruction_noise_overeagerness;

          best_race_time_found_thus_far = final_best_race_properties.time_taken;

          // let's now log the settings for this best race for the LAST generation
          if (global_log_message ){
            //console.log("***BEST RACE LOG START***");
            global_log_message_final = global_log_message;
            //  console.log(global_settings_tracker);
            //  console.log(global_race_tracker);
            //  console.log(global_riders_tracker);
          }
        }

        //DonalK2020 june 25: also track the WORST race to see what kind of instructions it is using
        if(population[i].time_taken > final_worst_race_properties.time_taken){
          final_worst_race_properties_index = i;
          final_worst_race_properties = population[i];
          worst_race_rider_power = race_results.power_output;

          worst_race_instruction_noise_alterations = race_results.instruction_noise_alterations;
          worst_race_performance_failures = race_results.performance_failures;

          worst_race_instruction_noise_choke_under_pressure = race_results.instruction_noise_choke_under_pressure;
          worst_race_instruction_noise_overeagerness = race_results.instruction_noise_overeagerness;
        }
        //console.log("race " + i + " time taken " + load_race_properties.time_taken + " instructions " + JSON.stringify(race_r.race_instructions_r));
      } //end of population loop
      if(log_generation_instructions_info){
        console.log("[[[[[[[[ Log log_generation_instructions_info after updates ]]]]]]]]");
        console.log(JSON.stringify(generation_instructions_info));
      }

      if (global_log_message && g == (number_of_generations-1) ){
        console.log("***BEST RACE GENERATION " + g + " LOG START***");
        //console.log(global_log_message_final);
      }

      stats_average_time = stats_total_time/population.length;
      stats_average_number_of_instructions = stats_total_number_of_instructions/population.length;
      //donalK25: work out the standard deviation for the  number of instructions
      let variance_total = 0;
      for(let i = 0;i<population.length;i++){
        variance_total += Math.pow((population[i].instructions.length - stats_average_number_of_instructions),2);
      }
      //variance is the mean of the total variance
      let variance = (variance_total/population.length);

      //the root of this is the standard deviation
      let std_deviation = Math.sqrt(variance);
      stats_std_dev_number_of_instructions = DecimalPrecision.round(std_deviation,2);

      //find the best instructions

      //first, display the best time from this generation

      let best_race_id = final_best_race_properties.variant_id+"_"+final_best_race_properties.id_generation+"_"+final_best_race_properties.id_type+"_"+final_best_race_properties.id_mutant_counter;
      let worst_race_id = final_worst_race_properties.variant_id+"_"+final_worst_race_properties.id_generation+"_"+final_worst_race_properties.id_type+"_"+final_worst_race_properties.id_mutant_counter;

      //console.log("FASTEST RACE generation  " + g + " was race " + final_best_race_properties_index + " id "+final_best_race_properties.variant_id+"_"+final_best_race_properties.id_generation
      //+"_"+final_best_race_properties.id_type+"_"+final_best_race_properties.id_mutant_counter
      //+ " time taken " + final_best_race_properties.time_taken);

      //console.log("SLOWEST RACE generation  " + g + " was race " + final_worst_race_properties_index + " id "+final_worst_race_properties.variant_id+"_"+final_worst_race_properties.id_generation
      //+"_"+final_worst_race_properties.id_type+"_"+final_worst_race_properties.id_mutant_counter
      //  + " time taken " + final_worst_race_properties.time_taken);


      generation_results = {};
      generation_results.generation_id = g;
      generation_results.best_race_id = best_race_id;
      generation_results.final_best_race_properties_index = final_best_race_properties_index;
      generation_results.final_best_race_start_order = final_best_race_properties.start_order;
      generation_results.final_best_race_instructions = final_best_race_properties.instructions;
      generation_results.best_race_time = final_best_race_properties.time_taken;

      generation_results.worst_race_id = worst_race_id;
      generation_results.final_worst_race_properties_index = final_worst_race_properties_index;
      generation_results.final_worst_race_start_order = final_worst_race_properties.start_order;
      generation_results.final_worst_race_instructions = final_worst_race_properties.instructions;
      generation_results.worst_race_time = final_worst_race_properties.time_taken;

      //console.log("final_worst_race_start_order" + JSON.stringify(final_worst_race_properties.start_order));
      //console.log("final_worst_race_instructions" + JSON.stringify(final_worst_race_properties.instructions));
      //console.log("worst_race_time" + JSON.stringify(final_worst_race_properties.time_taken));

      generation_results.worst_race_instruction_noise_alterations = worst_race_instruction_noise_alterations;

      generation_results.stats_average_time = stats_average_time;
      generation_results.stats_average_number_of_instructions = stats_average_number_of_instructions;
      generation_results.stats_std_dev_number_of_instructions = stats_std_dev_number_of_instructions;
      generation_results.robustness_check_number_of_mutants = 0;
      generation_results.robustness_check_average_mutant_time_taken = 0;
      generation_results.robustness_check_best_mutant_time_taken = 0;
      generation_results.robustness_check_worst_mutant_time_taken = 0;
      generation_results.robustness_check_standard_dev = 0;
      generation_results.race_fitness_all = race_fitness_all;

      generation_results.robustness_single_mutation_qty = 0;
      generation_results.robustness_single_mutation_average = 0;
      generation_results.robustness_single_mutation_times = [];

      //get the power data of the best race
      generation_results.best_race_rider_power = best_race_rider_power;
      //get distances covered for last and 2nd last timesteps
      generation_results.best_race_distance_2nd_last_timestep = best_race_distance_2nd_last_timestep;
      //console.log(g + " generation_results.best_race_distance_2nd_last_timestep " + generation_results.best_race_distance_2nd_last_timestep)
      generation_results.best_race_distance_last_timestep = best_race_distance_last_timestep;

      generation_results.best_race_instruction_noise_alterations = best_race_instruction_noise_alterations;

      generation_results.best_race_performance_failures = best_race_performance_failures;
      generation_results.worst_race_performance_failures = worst_race_performance_failures;

      //dk23
      generation_results.best_race_instruction_noise_choke_under_pressure = best_race_instruction_noise_choke_under_pressure;
      generation_results.worst_race_instruction_noise_choke_under_pressure = worst_race_instruction_noise_choke_under_pressure;
      //dk23 august
      generation_results.best_race_instruction_noise_overeagerness = best_race_instruction_noise_overeagerness;
      generation_results.worst_race_instruction_noise_overeagerness = worst_race_instruction_noise_overeagerness;

      //before looking at next generation can work out the robustness check of the current BEST strategy, IF required
      if(settings_r.ga_run_robustness_check==1){

        race_r.drop_instruction = 0;
        race_r.live_instructions = [];
        race_r.race_instructions = [];
        race_r.race_instructions_r = [];

        let load_race_properties = population[final_best_race_properties_index];
        race_r.race_instructions_r = [...load_race_properties.instructions];
        race_r.start_order = [...load_race_properties.start_order];

        let robustness_check_results = run_robustness_check(settings_r, race_r, riders_r);

        generation_results.robustness_check_number_of_mutants = settings_r.robustness_check_population_size;
        generation_results.robustness_check_average_mutant_time_taken = robustness_check_results.average_mutant_time_taken;
        generation_results.robustness_check_standard_dev = robustness_check_results.robustness_check_standard_dev;
        generation_results.robustness_check_best_mutant_time_taken = robustness_check_results.fittest_mutant_time_taken;
        generation_results.robustness_check_worst_mutant_time_taken = robustness_check_results.unfittest_mutant_time_taken;

        generation_results.robustness_single_mutation_qty = robustness_result.robustness_single_mutation_qty;
        generation_results.robustness_single_mutation_average = robustness_result.robustness_single_mutation_average;
        generation_results.robustness_single_mutation_times = robustness_result.robustness_single_mutation_times;

        console.log("Run robustness check generation " + g + robustness_check_results.message);
      }

      //log the log_generation_instructions_info if requested
      if(log_generation_instructions_info){
        generation_results.generation_instructions_info = generation_instructions_info;
      }



      // create a new population based on the fitness

      if(g<(number_of_generations-1)){ //don't create a new population for the last generation
        // find the squre root of the total popualtion, so that a new population can be generated from these
        let number_of_instructions_added_total = 0;
        let number_of_instructions_removed_total = 0;
        let number_of_instructions_moved_total = 0;
        let number_of_effort_instructions_changed_total = 0;
        let number_of_drop_instructions_changed_total = 0;
        let number_of_start_order_shuffles_total = 0;
        let number_of_drop_instructions_total = 0;
        let total_number_of_instructions = 0;
        let variants = [];
        let stats = {};
        stats.number_of_crossovers_total = 0; //crossovers done in the generation/evolution
        stats.number_of_mutants_added_total = 0;
        stats.number_of_direct_copies = 0;

        // population = new_population_best_squares(settings_r,population, stats,g);
        settings_r.mutant_counter = 0
        population = new_population_tournament_selection(settings_r,population, stats,g+1);

        for(let j = 0; j< population.length;j++){
          number_of_instructions_added_total += population[j].stats.number_of_instructions_added;
          number_of_instructions_removed_total += population[j].stats.number_of_instructions_removed;
          number_of_instructions_moved_total += population[j].stats.number_of_instructions_moved;
          number_of_effort_instructions_changed_total += population[j].stats.number_of_effort_instructions_changed;
          number_of_drop_instructions_changed_total += population[j].stats.number_of_drop_instructions_changed;
          number_of_start_order_shuffles_total += population[j].stats.number_of_start_order_shuffles;
          number_of_drop_instructions_total += population[j].stats.number_of_drop_instructions;
          total_number_of_instructions += population[j].instructions.length;

          if(variants.indexOf(""+population[j].variant_id) == -1){
            //  debugger;
            variants.push(""+population[j].variant_id);
          }
        }

        generation_results.population_size = population.length;
        generation_results.variants_size = variants.length;
        generation_results.number_of_instructions_added_total = number_of_instructions_added_total;
        generation_results.number_of_instructions_removed_total = number_of_instructions_removed_total;
        generation_results.number_of_instructions_moved_total = number_of_instructions_moved_total;
        generation_results.number_of_effort_instructions_changed_total = number_of_effort_instructions_changed_total;
        generation_results.number_of_drop_instructions_changed_total = number_of_drop_instructions_changed_total;
        generation_results.number_of_start_order_shuffles_total = number_of_start_order_shuffles_total;
        generation_results.number_of_start_order_shuffles_total = number_of_start_order_shuffles_total;
        generation_results.number_of_drop_instructions_total = number_of_drop_instructions_total;
        generation_results.total_number_of_instructions = total_number_of_instructions;
        generation_results.number_of_crossovers_total = stats.number_of_crossovers_total;
        generation_results.number_of_direct_copies = stats.number_of_direct_copies;
        generation_results.number_of_mutants_added_total = stats.number_of_mutants_added_total;
        //  console.log("Generation " + g + " after mutations ");
        //  console.log(population);

        ga_results.generations.push(generation_results);
      }
      else if(g==(number_of_generations-1)){
        // last gen doesn't produce new population
        //last gen might also need to run best_in_final_gen_tests
        if (settings_r.best_in_final_gen_tests){
          // There may be more than one so we need a list of em
          // not sure if I need a deep clone operation here but should just in cases
          let test_settings_r = JSON.parse(JSON.stringify(settings_r));
          let test_race_r = JSON.parse(JSON.stringify(race_r));
          let test_riders_r = JSON.parse(JSON.stringify(riders_r));

          if (settings_r.best_in_final_gen_tests[0]){
            let best_in_gen_tests_results = [];
            for(let i_t = 0; i_t< settings_r.best_in_final_gen_tests.length;i_t++ ){
              console.log("--------> found set of best_in_final_gen_tests to run");

              let tests = settings_r.best_in_final_gen_tests[i_t];
              console.log(JSON.stringify(tests));
              // go through iterations (if they exist)
              if(tests.iterations){

                for(let current_iteration = 0; current_iteration <   tests.iterations; current_iteration++){

                  //might repeat the test and average the results
                  let repeat_each = 1;
                  if (tests.repeat_each){
                    repeat_each = tests.repeat_each;
                  }
                  //look for any variation to add to this iteration
                  let best_in_gen_test_result = {};
                  best_in_gen_test_result.variation = [];
                  best_in_gen_test_result.reps = repeat_each;
                  best_in_gen_test_result.test_result = -1;

                  if(tests.variations){
                    let test_variations_info = "";
                    let test_iteration_variations = tests.variations;
                    for(let i = 0; i < test_iteration_variations.length; i++){
                      console.log('---best_in_final_gen_tests---> Variation: Process variation ' + (i+1) + " of " + test_iteration_variations.length );

                      let v_details = test_iteration_variations[i];
                      console.log(JSON.stringify(v_details));
                      //if this variation has a value for this iteration, need to add it
                      if(v_details.values){
                        if(typeof v_details.values[current_iteration] !== 'undefined'){
                          let v_detail_value = v_details.values[current_iteration];

                          if(v_details.type == "global"){
                            //adjust a global setting to the given value
                            console.log("---best_in_final_gen_tests---> Variation: update global property " + v_details.property + " to " + v_detail_value);

                            try {
                              test_settings_r[v_details.property] = v_detail_value;
                              test_variations_info += "---best_in_final_gen_tests---> Global variation: " + v_details.property + " = " + v_detail_value + "||";
                              best_in_gen_test_result.variation.push({"type":"global","property":v_details.property,"value":v_detail_value} );
                            }
                            catch(err) {
                              console.log("ERROR!!!---best_in_final_gen_tests---> Variation:error applying global variation " + JSON.stringify(v_details) + "  ---  " + err.message);
                            }
                          }
                          else if (v_details.type == "rider"){
                            //this is a rider prop so need to specify the actual rider
                            if(v_details.rider_no >= 0){
                              console.log("---best_in_final_gen_tests---> Variation: update rider " + v_details.rider_no + " property " + v_details.property + " to " + v_detail_value);
                              try {
                                test_riders_r[v_details.rider_no][v_details.property] = v_detail_value;
                                test_variations_info += "Rider " + v_details.rider_no + " variation: " + v_details.property + " = " + v_detail_value + "||";
                                console.log("---best_in_final_gen_tests---> #### riderSettingsObject["+v_details.rider_no+"]['"+v_details.property+"'] = " + v_detail_value);
                                best_in_gen_test_result.variation.push({"type":"rider","rider":v_details.rider_no,"property":v_details.property,"value":v_detail_value} );

                              }
                              catch(err) {
                                console.log("---best_in_final_gen_tests---> Variation:error applying rider variation " + JSON.stringify(v_details) + "  ---  " + err.message);
                              }
                            }
                            else{
                              console.log("---best_in_final_gen_tests---> Variation: error, rider variation has no number");
                            }
                          }
                          else{
                            console.log("---best_in_final_gen_tests---> Variation: invalid variation type " + v_details.type);
                          }

                        }
                      }

                    }
                  }
                  // run the darn race and collect the result. may need to run more than once
                  let total_test_time = 0;
                  //generation_results.number_of_mutants_added_total = stats.number_of_mutants_added_total;

                  for(let test_race = 0; test_race < repeat_each; test_race++){
                    test_race_r.drop_instruction = 0;
                    test_race_r.live_instructions = [];
                    test_race_r.race_instructions = [];
                    test_race_r.race_instructions_r = [];

                    //need to apply the best race instructions from the generation
                    test_race_r.race_instructions_r = [...final_best_race_properties.instructions];
                    test_race_r.start_order = [...final_best_race_properties.start_order];

                    console.log("-----best_in_final_gen_tests--> best race instructions " + JSON.stringify(test_race_r.race_instructions_r));

                    //run the actual race, i.e. the fitness function, returning just a time taken
                    test_settings_r.run_type = "ga";

                    let test_race_results = run_race(test_settings_r,test_race_r,test_riders_r);
                    total_test_time += test_race_results.time_taken;
                  }

                  let test_result = (total_test_time/repeat_each);
                  best_in_gen_test_result.test_result = test_result;
                  //add to the results for this test
                  //need to include variation info
                  best_in_gen_tests_results.push(best_in_gen_test_result);
                }
              }
            }
            generation_results.best_in_gen_tests_results = JSON.stringify(best_in_gen_tests_results);
          }



        }
        generation_results.population_size = 0;
        generation_results.variants_size =0;
        generation_results.number_of_instructions_added_total = 0;
        generation_results.number_of_instructions_removed_total = 0;
        generation_results.number_of_instructions_moved_total = 0;
        generation_results.number_of_effort_instructions_changed_total = 0;
        generation_results.number_of_drop_instructions_changed_total = 0;
        generation_results.number_of_start_order_shuffles_total = 0;
        generation_results.number_of_start_order_shuffles_total = 0;
        generation_results.number_of_drop_instructions_total = 0;
        generation_results.total_number_of_instructions = 0;
        generation_results.number_of_crossovers_total = 0;
        generation_results.number_of_direct_copies = 0;
        generation_results.number_of_mutants_added_total = 0;

        ga_results.generations.push(generation_results);
      }
    }

    // console.log(JSON.stringify(race_tracker));



    //also add the variant_ids of the final generation
    // table_text_info += "<div class = 'variants'>";
    // for(let i = 0;i< population.length;i++){
    //   table_text_info +=i + ": <strong>" + population[i].variant_id + "</strong> ("+population[i].time_taken+"), "
    // }
    // table_text_info += "</div>";
    //console.log("********ga_results BEGIN*********");
    //console.log(ga_results);
    //console.log("********ga_results END*********");

    //return table_text_info;

    // dk23aug log the array of normal probs.
    //console.log("|---------- normal_distribution_output_inflation_percentage_array ----------|");
    //console.log(JSON.stringify(normal_distribution_output_inflation_percentage_array));

    ga_results.end_time = new Date();
    return ga_results;
    // if(settings_r.stats.crossover_instruction_sizes.length > 0){
    //   let stats_text = "settings_r.stats.crossover_instruction_sizes " + settings_r.stats.crossover_instruction_sizes.length + " " + settings_r.stats.crossover_instruction_sizes.reduce((a, b) => parseInt(a) + parseInt(b))/settings_r.stats.crossover_instruction_sizes.length + " " + JSON.stringify(settings_r.stats.crossover_instruction_sizes);
    //   $("#race_result_stats").html(stats_text);
    //}

  }

  function new_population_tournament_selection(settings_r,current_population, stats,generation){
    let new_population = [];
    // split the popualtion into a set of groups; there may be a remainder
    let group_size = settings_r.ga_tournament_selection_group_size;
    let remainder = (current_population.length % group_size);


    //debugger;
    //return a new population based on mini-tournaments in current population.
    for(let i = 0;i< (current_population.length-remainder);i+=group_size){
      //get the best race from the group

      //check to see if we need to handle the remainder
      if ((i + group_size + remainder) >= current_population.length){
        group_size += remainder;
      }
      let best_time = current_population[i].time_taken;
      let best_time_index = i;
      let best_time_player=current_population[i];

      for(let k = 1;k<group_size;k++){
        if (current_population[(i+k)].time_taken < best_time){
          best_time = current_population[(i+k)].time_taken;
          best_time_index = (i+k);
          best_time_player=current_population[i+k];
        }
      }
      //make group_size copies of the winner as is, or crossed over, or mutated and put them in the new population

      //work out the proportional fitnesses for roulette selection
      //work out the sum of race times
      let sum_of_race_times = 0;
      for(let k2 = 0;k2<group_size;k2++){
        sum_of_race_times += current_population[(i+k2)].time_taken;
      }
      //now get the current fitness proportion with 1-(time/sum_times)
      let sum_tournament_proportional_fitness = 0;

      //get the exponent to apply to the fitness proportion amount
      let ga_tournament_roulette_exponent_group_size_divisor = 4;
      if (typeof(settings_r.ga_tournament_roulette_exponent_group_size_divisor) != "undefined"){
        ga_tournament_roulette_exponent_group_size_divisor = settings_r.ga_tournament_roulette_exponent_group_size_divisor;
      }
      //dynamic version, divide it by 4, store that 4 as a global constant?
      let ga_selection_fitness_pressure_exponent = (group_size/ga_tournament_roulette_exponent_group_size_divisor);

      //donalK25: set a constant for an adjustment amount to add to the differences between each time and the slowest
      //otherwise the slowest time has a diff and therefore a fitness of zero
      //note, after some tests, I replaced this with a simple dynamic version where we simply divide 1/group_size and use that

    //  let ga_roulette_p_of_diff_sum_to_add = 0.02;
    //  if (typeof(settings_r.ga_roulette_p_of_diff_sum_to_add) != "undefined"){
    //    ga_roulette_p_of_diff_sum_to_add = settings_r.ga_roulette_p_of_diff_sum_to_add;
    //  }

      //dynamic version, based on group size
        let ga_roulette_p_of_diff_sum_to_add = (1/group_size);

      //remember that SMALLER is better, i.e., the fastest solution is the fittest
      //debugger;
    //  let minimum_percentage = 0.01; //percentage of the roulette wheel that the slowest value takes up
      //get the slowest time
      let slowest_race_time = current_population[i].time_taken;
      for(let k2 = 1;k2<group_size;k2++){
        if (current_population[(i+k2)].time_taken > slowest_race_time){
          slowest_race_time = current_population[(i+k2)].time_taken;
        }
      }
      //now, need the sum of the differences between each time and the slowest (to normalise)
      let sum_distance_from_slowest_time = 0;
      let sum_distance_from_slowest_time_with_exponent = 0;

      for(let k2 = 0;k2<group_size;k2++){
          sum_distance_from_slowest_time += (slowest_race_time - current_population[(i+k2)].time_taken);
          //sum_distance_from_slowest_time_with_exponent += Math.pow((slowest_race_time - current_population[(i+k2)].time_taken),ga_selection_fitness_pressure_exponent);
      }
      //get adjustment to add
      let adjustment_to_add_to_all_diffs = sum_distance_from_slowest_time * ga_roulette_p_of_diff_sum_to_add;
      //if all times are the same, this will be zero, a special case where we can assign an arbitrary fixed value.
      if(adjustment_to_add_to_all_diffs == 0){
        adjustment_to_add_to_all_diffs = 1;
      }

      //get sum of adjusted diffs with exponent applied
      let sum_adjusted_diff_with_exponent = 0;
      for(let k2 = 0;k2<group_size;k2++){
        sum_adjusted_diff_with_exponent += Math.pow((slowest_race_time - current_population[(i+k2)].time_taken + adjustment_to_add_to_all_diffs),ga_selection_fitness_pressure_exponent);
      }
      //now we can normalise these as a proportional fitness- a slice of the roulette wheel

      //now get amount_to_add, (sum_distance_from_slowest_time_with_exponent*minimum_percentage)/(1 + N*minimum_percentage)
      //let additional_min_amount = (sum_distance_from_slowest_time_with_exponent * minimum_percentage)/(1 + (group_size * minimum_percentage));

      //console.log(" >>>>>>>>>> Roulette wheel times and fitness probabilities. ga_selection_fitness_pressure_exponent " + ga_selection_fitness_pressure_exponent + " ga_roulette_p_of_diff_sum_to_add " + ga_roulette_p_of_diff_sum_to_add + " slowest_race_time " + slowest_race_time + " sum_distance_from_slowest_time " + sum_distance_from_slowest_time + " adjustment_to_add_to_all_diffs " + adjustment_to_add_to_all_diffs + " sum_adjusted_diff_with_exponent " + sum_adjusted_diff_with_exponent);

      //console.log("i \t race_time \t tournament_proportional_fitness");

      for(let k2 = 0;k2<group_size;k2++){
        let proportional_improvement_over_slowest = (Math.pow((adjustment_to_add_to_all_diffs + (slowest_race_time - current_population[(i+k2)].time_taken)),ga_selection_fitness_pressure_exponent)/sum_adjusted_diff_with_exponent);

        current_population[(i+k2)].tournament_proportional_fitness = proportional_improvement_over_slowest;
        if(isNaN(current_population[(i+k2)].tournament_proportional_fitness)){
          debugger;
        }
        sum_tournament_proportional_fitness += proportional_improvement_over_slowest;
        //console.log((i+k2) + "\t" + current_population[(i+k2)].time_taken + "\t" + current_population[(i+k2)].tournament_proportional_fitness);
      }
      // tournament_proportional_fitness should sum to 1 - but does it?
      //console.log(" >>>>>>>>>> sum of " + group_size + " values of tournament_proportional_fitness " + sum_tournament_proportional_fitness);

      for(let k = 0;k<group_size;k++){
        let new_race = {};

        //donalK25: added a new switch to use random selections from each group (with replacement)
        let ga_selection_type = "tournament_elitist_winner_takes_all";
        if (typeof(settings_r.ga_selection_type) != "undefined"){
          ga_selection_type = settings_r.ga_selection_type;
        }

        if (ga_selection_type == "tournament_random_with_replacement"){
            //generate a rando number between i and k
            //console.log("****** tournament_random_with_replacement ******");
            let rand1 = Math.floor(i + Math.random()*(k-i));

            new_race = current_population[rand1];
            new_race.stats = {};
            new_race.stats.number_of_instructions_added = 0;
            new_race.stats.number_of_instructions_removed = 0;
            new_race.stats.number_of_instructions_moved = 0;
            new_race.stats.number_of_effort_instructions_changed = 0;
            new_race.stats.number_of_drop_instructions_changed = 0;
            new_race.stats.number_of_start_order_shuffles = 0;
            new_race.stats.number_of_drop_instructions = 0;
            stats.number_of_direct_copies++;
        }
        else if(ga_selection_type == "tournament_elitist_roulette"){
          //console.log("----------------- ga_selection_type tournament_elitist_roulette -----------------")
          if((i+k) == best_time_index){
            //add self without mutations at all - this is elitism at work
            new_race = current_population[(i+k)];
            new_race.stats = {};
            new_race.stats.number_of_instructions_added = 0;
            new_race.stats.number_of_instructions_removed = 0;
            new_race.stats.number_of_instructions_moved = 0;
            new_race.stats.number_of_effort_instructions_changed = 0;
            new_race.stats.number_of_drop_instructions_changed = 0;
            new_race.stats.number_of_start_order_shuffles = 0;
            new_race.stats.number_of_drop_instructions = 0;

            stats.number_of_direct_copies++;
            //note: make sure the starting order of this race doesn not change!
          }
          else{ //otherwise, add a mutant or a crossover child of the group winner
            //console.log("choose two crossover parents using roulette")

            let parent1 = {};
            parent1.stats = {};
            parent1.stats.number_of_instructions_added = 0;
            parent1.stats.number_of_instructions_removed = 0;
            parent1.stats.number_of_instructions_moved = 0;
            parent1.stats.number_of_effort_instructions_changed = 0;
            parent1.stats.number_of_drop_instructions_changed = 0;
            parent1.stats.number_of_start_order_shuffles = 0;
            parent1.stats.number_of_drop_instructions = 0;

            let parent2 = {};
            parent2.stats = {};
            parent2.stats.number_of_instructions_added = 0;
            parent2.stats.number_of_instructions_removed = 0;
            parent2.stats.number_of_instructions_moved = 0;
            parent2.stats.number_of_effort_instructions_changed = 0;
            parent2.stats.number_of_drop_instructions_changed = 0;
            parent2.stats.number_of_start_order_shuffles = 0;
            parent2.stats.number_of_drop_instructions = 0;

            let parent1_id = -1;
            let parent2_id = -1;
            let p_roulette1 = 0;
            let p_roulette2 = 0;

            // we don't want the two parents to be the same...
            // maybe if the torunament size is 1 this might cause an infinite loop?
            let max_tries = 10;
            while(parent1_id == parent2_id && max_tries > 0) //repeat if they are identical
            {
              parent1_id = -1; //reset each time, otherwise we exit the loop
              parent2_id = -1;
              max_tries -= 1;
              p_roulette1 = Math.random();
              p_roulette2 = Math.random();
              let sum_fitness = 0;

              //debugger;
              //make sure a parent is actually assigned?
              let parent_1_assigned = 0;
              let parent_2_assigned = 0;

              for(let k2 = 0;k2<group_size;k2++){
                sum_fitness += current_population[(i+k2)].tournament_proportional_fitness;
                if(isNaN(sum_fitness)){
                  debugger;
                }

                if (parent1_id < 0 && p_roulette1 <  sum_fitness){
                  parent1_id = i+k2;
                  parent1 = current_population[(i+k2)];
                  parent_1_assigned = 1;
                }
                if (parent2_id < 0 && p_roulette2 <  sum_fitness){
                  parent2_id = i+k2;
                  parent2 = current_population[(i+k2)];
                  parent_2_assigned = 1;
                }
                if(parent1_id >= 0 && parent2_id >= 0){
                  break;
                }
              }
              if (parent_1_assigned == 0 || parent_2_assigned == 0){
                debugger;
              }
            }
            //dk2020: add crossover effect
            if (Math.random() < settings_r.ga_p_crossover){
              //select two parents based on proportional fitnesses
              //fitness is lowet stime
              //console.log("Generating CROSSOVER strategy");
              new_race = crossover(parent1,parent2,settings_r,generation,i+k);
              //also mutate if the mutate_crossover is set (again, probabilitsic)
              if (typeof(settings_r.crossover_apply_mutation_probability) != "undefined"){
                if (Math.random() < settings_r.crossover_apply_mutation_probability){
                  //donalK25: bug where mutate_race crashes due to undefined props
                  if(new_race.start_order == undefined ){
                    debugger;
                  }

                  new_race = mutate_race(new_race,settings_r,generation);
                  //console.log("****MUTATING CROSSOVER****");
                }
              }
              stats.number_of_crossovers_total++;
              //need to make sure that the stats properties exist and are set to zero, unlike in a mutation
              new_race.stats = {};
              new_race.stats.number_of_instructions_added = 0;
              new_race.stats.number_of_instructions_removed = 0;
              new_race.stats.number_of_instructions_moved = 0;
              new_race.stats.number_of_effort_instructions_changed = 0;
              new_race.stats.number_of_drop_instructions_changed = 0;
              new_race.stats.number_of_start_order_shuffles = 0;
              new_race.stats.number_of_drop_instructions = 0;

            }
            else{
              //can use either parent 1 or 2, apply mutation
              //donalK25: bug where mutate_race crashes due to undefined props
              if(parent1.start_order == undefined ){
                debugger;
              }
              new_race = mutate_race(parent1,settings_r,generation);
              stats.number_of_mutants_added_total++;
              settings_r.mutant_counter++; //dk2020 this may be doing something just like the line above :-(
              }
            }
        }
        else if(ga_selection_type == "tournament_elitist_winner_takes_all"){

        if((i+k) == best_time_index){
          //add self without mutations at all - this is elitism at work
          new_race = current_population[(i+k)];
          new_race.stats = {};
          new_race.stats.number_of_instructions_added = 0;
          new_race.stats.number_of_instructions_removed = 0;
          new_race.stats.number_of_instructions_moved = 0;
          new_race.stats.number_of_effort_instructions_changed = 0;
          new_race.stats.number_of_drop_instructions_changed = 0;
          new_race.stats.number_of_start_order_shuffles = 0;
          new_race.stats.number_of_drop_instructions = 0;

          stats.number_of_direct_copies++;
          //note: make sure the starting order of this race doesn not change!
        }
        else{ //otherwise, add a mutant or a crossover child of the group winner

          new_race = current_population[best_time_index];
          //dk2020: add crossover effect
          if (Math.random() < settings_r.ga_p_crossover){
            //console.log("Generating CROSSOVER strategy");
            new_race = crossover(new_race,current_population[(i+k)],settings_r,generation,i+k);
            //also mutate if the mutate_crossover is set (again, probabilitsic)
            if (typeof(settings_r.crossover_apply_mutation_probability) != "undefined"){
              if (Math.random() < settings_r.crossover_apply_mutation_probability){
                if(new_race.start_order == undefined ){
                  debugger;
                }
                new_race = mutate_race(new_race,settings_r,generation);
                //console.log("****MUTATING CROSSOVER****");
              }
            }
            stats.number_of_crossovers_total++;
            //need to make sure that the stats properties exist and are set to zero, unlike in a mutation
            new_race.stats = {};
            new_race.stats.number_of_instructions_added = 0;
            new_race.stats.number_of_instructions_removed = 0;
            new_race.stats.number_of_instructions_moved = 0;
            new_race.stats.number_of_effort_instructions_changed = 0;
            new_race.stats.number_of_drop_instructions_changed = 0;
            new_race.stats.number_of_start_order_shuffles = 0;
            new_race.stats.number_of_drop_instructions = 0;

          }
          else{
            if(new_race.start_order == undefined ){
              debugger;
            }
            new_race = mutate_race(new_race,settings_r,generation);
            stats.number_of_mutants_added_total++;
            settings_r.mutant_counter++; //dk2020 this may be doing something just like the line above :-(
            }
          }
        }//end of loop for selection type for elitist
        else {
          console.log("******************** WARNING! ISSUE WITH SELECTION TYPE " + ga_selection_type); + " ********************";
          }
          //console.log("New pop race id group " + i + " (of size "+ group_size + ") best race in group ("+best_time_player.variant_id + "_" + best_time_player.id_generation + "_" + best_time_player.id_type + "_" + best_time_player.id_mutant_counter+") " + new_race.variant_id + "_" + new_race.id_generation + "_" + new_race.id_type + "_" + new_race.id_mutant_counter);
          new_population.push(new_race);
        }
      }

      //shuffle the array to stop the same groups from simply repeating

      shuffleArray(new_population);
      return new_population;
    }

    function new_population_best_squares(settings_r,current_population, stats,generation){
      //get the max time to use as an imitial comparison
      let population_size = current_population.length;
      let max_time_index = 0;
      let max_time_properties = {};
      let max_time = 0;
      let parent_population = [];
      let pop_square_root = Math.floor(Math.sqrt(population_size));

      //let stats.number_of_crossovers_total = 0;

      for(let i = 0; i< population_size;i++){
        if(current_population[i].time_taken > max_time){
          max_time = current_population[i].time_taken;
          max_time_index = i;
          max_time_properties = current_population[i];
        }
      }

      //get the top square root races from the current population
      for(let i = 0; i< pop_square_root;i++){
        let best_race_properties_index = max_time_index;
        let best_race_properties = max_time_properties;

        for(let i = 0; i< population_size;i++){
          if(current_population[i].time_taken < best_race_properties.time_taken){
            //if this has NOT already been added use it
            if(parent_population.indexOf(i)==-1){
              best_race_properties_index = i;
              best_race_properties = current_population[i];
            }
          }
        }
        parent_population.push(best_race_properties_index);
      }

      //make a new population using these best-performing races

      let new_population = [];
      for(let i = 0;i < parent_population.length;i++){
        for(let k = 0;k < parent_population.length;k++){
          //create a new set of instructions
          //merge two parent instructions sets, choose a starting order, then mutate it
          let new_race = {};
          if(i==k){
            new_race = current_population[parent_population[i]];

            if(new_race.start_order == undefined ){
              debugger;
            }

            new_race = mutate_race(new_race,settings_r,generation);
            number_of_direct_copies++;
          }
          else{
            if (Math.random() < settings_r.ga_p_crossover){
              new_race = crossover(current_population[parent_population[i]],current_population[parent_population[k]],settings_r,generation,i+k);
              if (typeof(settings_r.crossover_apply_mutation_probability) != "undefined"){
                if (Math.random() < settings_r.crossover_apply_mutation_probability){
                  if(new_race.start_order == undefined ){
                    debugger;
                  }
                  new_race = mutate_race(new_race,settings_r,generation);
                  //console.log("****MUTATING CROSSOVER 2****");
                }
              }
              stats.number_of_crossovers_total++;
              new_race.stats = {};
              new_race.stats.number_of_instructions_added = 0;
              new_race.stats.number_of_instructions_removed = 0;
              new_race.stats.number_of_instructions_moved = 0;
              new_race.stats.number_of_effort_instructions_changed = 0;
              new_race.stats.number_of_drop_instructions_changed = 0;
              new_race.stats.number_of_start_order_shuffles = 0;
              new_race.stats.number_of_drop_instructions = 0;
            }
            else{
              new_race = current_population[parent_population[i]];
              if(new_race.start_order == undefined ){
                debugger;
              }
              new_race = mutate_race(new_race,settings_r,generation);
              number_of_mutants_added_total++;
            }
          }
          new_population.push(new_race);
          // if (new_race.instructions.length != new_race.stats.number_of_drop_instructions){
          //   debugger;
          // }
        }
      }
      return new_population;

    }

    function crossover(parent1,parent2,settings_r,generation,population_index){

      let new_race_details = {};
      new_race_details.start_order = [...parent1.start_order];
      if(Math.random() > 0.5){
        new_race_details.start_order = [...parent2.start_order];
      }
      //set the variant id
      //dk202: this gets too long as crossover kids will combine with crossover kids as generations slog by
      //check if the parent is a crossover kid
      new_race_details.variant_id = "";
      parent_1_variant = "";
      parent_2_variant = "";

      if (parent1.variant_id.toString().includes("||")){
        //strip out everything up to and including the || part, we don't want ever-elongating ids
        parent_1_variant = parent1.variant_id.substring(parent1.variant_id.indexOf("||")+2);
      }
      else{
        parent_1_variant = parent1.variant_id;
      }

      if (parent2.variant_id.toString().includes("||")){
        //strip out everything up to and including the || part, we don't want ever-elongating ids
        parent_2_variant = parent2.variant_id.substring(parent2.variant_id.indexOf("||")+2);
      }
      else{
        parent_2_variant = parent2.variant_id;
      }

      new_race_details.variant_id += parent_1_variant + "|" + parent_2_variant;

      //append a unique child identifier based on the current generation and population index
      new_race_details.variant_id += "||" + "G"+generation+"I"+population_index;
      new_race_details.id_generation = generation;
      new_race_details.id_type = 2;
      new_race_details.id_mutant_counter = 0;

      //let instruction_1_locations = parent1.instructions.map(a=>a[0]);
      //  let instruction_2_locations = parent2.instructions.map(a=>a[0]);
      //make sure these are sorted
      parent1.instructions.sort((a,b)=>a[0]-b[0]);
      parent2.instructions.sort((a,b)=>a[0]-b[0]);

      let inst_1_counter = 0;
      let inst_2_counter = 0;

      let new_instructions = [];

      //handle if the instructions are empty in a parent
      if(parent1.instructions.length == 0){
        new_instructions = parent2.instructions;
      }
      else if(parent2.instructions.length == 0){
        new_instructions = parent1.instructions;
      }
      else{
        while((inst_1_counter < (parent1.instructions.length)) || (inst_2_counter < (parent2.instructions.length))){
          if(inst_1_counter == (parent1.instructions.length)){
            new_instructions.push(parent2.instructions[inst_2_counter]);
            //console.log("inst 1 done adding inst 2 " + parent2.instructions[inst_2_counter][0] + " " + parent2.instructions[inst_2_counter][1]);
            inst_2_counter++;
          }
          else if(inst_2_counter == (parent2.instructions.length)){
            new_instructions.push(parent1.instructions[inst_1_counter])
            //console.log("inst 2 done adding inst 1 " + parent1.instructions[inst_1_counter][0] + " " + parent1.instructions[inst_1_counter][1]);
            inst_1_counter++;
          }
          else{
              //if(inst_1_counter ){
              //  debugger;
              //}
            if(parent1.instructions[inst_1_counter][0] < parent2.instructions[inst_2_counter][0]){
              new_instructions.push(parent1.instructions[inst_1_counter]);
              //console.log("inst 1 smaller " + parent1.instructions[inst_1_counter][0] + " " + parent1.instructions[inst_1_counter][1]);
              inst_1_counter++;
            }
            else if (parent1.instructions[inst_1_counter][0] > parent2.instructions[inst_2_counter][0]){
              new_instructions.push(parent2.instructions[inst_2_counter]);
              //console.log("inst 2 smaller " + parent2.instructions[inst_2_counter][0] + " " + parent2.instructions[inst_2_counter][1]);
              inst_2_counter++;
            }
            else{
              //they are ont he same timestep, so randomly choose one and ignore d'other
              if(Math.random() < 0.5){
                new_instructions.push(parent1.instructions[inst_1_counter]);
                //  console.log("inst 1 duplicate selection " + parent1.instructions[inst_1_counter][0] + " " + parent1.instructions[inst_1_counter][1]);
              }
              else{
                new_instructions.push(parent2.instructions[inst_2_counter]);
                //console.log("inst 2 duplicate selection " + parent2.instructions[inst_2_counter][0] + " " + parent2.instructions[inst_2_counter][1]);
              }
              inst_1_counter++;
              inst_2_counter++;
            }
          }
        }
        //console.log("new_instructions " + JSON.stringify(new_instructions));

        //need to reduce the number of instructions
        let total_size_of_arrays = (parent1.instructions.length + parent2.instructions.length);
        if(total_size_of_arrays > 1){
          let random_array = [];
          for(let i=0;i<new_instructions.length;i++){
            random_array.push(i);
          }
          shuffleArray(random_array);
          //console.log("random array " + random_array);

          //donalK2020: we don't want to just HALVE the instructions, we want to use some lenght between that of the parents Plus/minus some possible (small) deviation either side.

          let new_instruction_set_size = 0;
          let smaller_length = parent1.instructions.length;
          let larger_length = parent2.instructions.length;
          if (larger_length < smaller_length){
            let temp_length = smaller_length;
            smaller_length = larger_length;
            larger_length = temp_length;
          }
          new_instruction_set_size = smaller_length + Math.floor(Math.random()*(larger_length+1-smaller_length));
          let random_adjustment = 0; //for some probability introduce a length change
          let max_adjustment_size = 3;
          //we want adjustments of 1 to be much more likely so will put the adjustment in a loop to control the probability

          let crossover_length_adjustment_probability = 0.5;
          if (typeof(settings_r.ga_crossover_length_adjustment_probability) != "undefined"){
            crossover_length_adjustment_probability = settings_r.ga_crossover_length_adjustment_probability;
          }
          //console.log("***************SETTINGS R START***********");
          //  console.log(JSON.stringify(settings_r));
          //  console.log("***************SETTINGS R END***********");

          for (let i = 0; i<max_adjustment_size; i++){
            if (Math.random() < crossover_length_adjustment_probability){
              random_adjustment += 1;
            }
            else{
              break;
            }

          }
          //now give it a negative sign half the time
          if (Math.random() >= 0.5){
            random_adjustment =random_adjustment*-1;
          }
          //console.log("****CROSSOVER LENGTH CALCULATION*****");
          //console.log("smaller parent size " + smaller_length + " larger parent size " + larger_length + " new length random size " + new_instruction_set_size + " random adjustment " + random_adjustment);
          if (new_instruction_set_size + random_adjustment > 1){
            new_instruction_set_size += random_adjustment;
          }


          let random_array_ordered_and_halved = random_array.slice(0,new_instruction_set_size).sort((a,b)=>a-b);
          //settings_r.stats.crossover_instruction_sizes.push(random_array_ordered_and_halved.length);
          //console.log("random_array_ordered_and_halved " + random_array_ordered_and_halved);

          let new_instructions_reduced = [];
          for(let i =0;i<random_array_ordered_and_halved.length;i++){
            new_instructions_reduced.push(new_instructions[random_array_ordered_and_halved[i]])
          }
          //console.log("new_instructions_reduced from crossover " +JSON.stringify(new_instructions_reduced));
          new_instructions = new_instructions_reduced;
        }

      }
      new_race_details.instructions = new_instructions;
      //set the time taken or the mutation resets the whole thing to []
      if(new_race_details.instructions.length > 0){
        new_race_details.time_taken = parseInt(new_race_details.instructions[new_race_details.instructions.length-1][0]) + 10 //10 is arbitrary;
      }
      else{
        new_race_details.time_taken = settings_r.ga_max_timestep;
      }

      //console.log("time taken " + new_race_details.time_taken);
      return new_race_details;
    }

    function newton(aero, hw, tr, tran, p) {        /* Newton's method, original is from bikecalculator.com */
    //from http://www.bikecalculator.com/
    //aero = ath.round((0.5 * settings_r.frontalArea * new_leader.air_density)*10000)/10000; - i.e. 1/2*p*CdA
    //hw = headwind
    //tr = total resistance  = load_rider.aero_twt * (settings.gradev + settings.rollingRes); - mass*gravity*grade*coefficient_of_rolling_resistance
    //tran = drivetrain (transmission) efficiency 0.95
    //p = power!

    let vel = 20;       // Initial guess
    let MAX = 10;       // maximum iterations
    let TOL = 0.05;     // tolerance
    for(let i_n=1; i_n < MAX; i_n++) {
      let tv = vel + hw;
      let aeroEff = (tv > 0.0) ? aero : -aero; // wind in face, must reverse effect
      let f = vel * (aeroEff * tv * tv + tr) - tran * p; // the function
      let fp = aeroEff * (3.0 * vel + hw) * tv + tr;     // the derivative
      let vNew = vel - f / fp;
      if (Math.abs(vNew - vel) < TOL) return vNew;  // success
      vel = vNew;
    }
    return 0.0;  // failed to converge
  }

  function power_from_velocity(aero, headwind, total_resistance, transv, target_velocity){
    // returns a power in watts needed to produce a certain velocity for the given rider
    //target_velocity needs to be in m/s
    //let velocity_ms = target_velocity / 3.6;  // converted to m/s; (this is already done)
    let total_velocity = target_velocity + headwind;
    let aeroEff = (total_velocity > 0.0) ? aero : -aero; // wind in face; reverse effect
    let powerv = (target_velocity * total_resistance + target_velocity * total_velocity * total_velocity * aeroEff) / transv;
    return powerv;
  }

  //power_from_velocity_with_acceleration(aero, headwind, total_resistance, transv, target_velocity,current_velocity, mass)

  function power_from_velocity_with_acceleration(target_velocity, C_rr, mass, gravity_force, p_air_density, coefficient_of_drag_x_frontal_area, current_velocity, drivetrain_efficiency){

    let time = 1; //assumption that this is for ONE second!

    //1: get energy needed for the acceleration
    let acceleration_energy = 0.5 * mass * (target_velocity**2 - current_velocity**2);

    //2: get the average velocity
    let average_velocity = (current_velocity + target_velocity)/2;

    //3: rolling resistance using average speed
    let rolling_resistance_energy = C_rr * mass * gravity_force * average_velocity * time;

    //4: get the aero energy needed for that average velocity
    let drag_energy = 0.5 * p_air_density * coefficient_of_drag_x_frontal_area * (average_velocity**3) * time;

    //5: total_energy_needed
    let total_energy_needed = acceleration_energy + rolling_resistance_energy + drag_energy;

    //6: now get the required power (note that we are using a timestep of 1 second)
    let total_power_needed = total_energy_needed/time;

    //7: factor in the  drivetrain loss
    let total_power_needed_in_pedals = total_power_needed/drivetrain_efficiency;

    return total_power_needed_in_pedals;
  }

  function velocity_from_power_with_acceleration(power_total, C_rr, mass, gravity_force, p_air_density, coefficient_of_drag_x_frontal_area, current_velocity, drivetrain_efficiency){
    //assumption: no gradient(hills)!
    //assumption: 1 second of time!

    let time = 1;

    //debugger;
      let new_velocity = current_velocity;  //this will change, inshallah
      //use a loop to get more accurate drag values (refinement)
      let velocity_start = current_velocity;
      //let velocity_end_estimate = velocity_start;    //need to estimate the final speed

      let power_after_drivetrain_loss =power_total*drivetrain_efficiency; //factor in the drivetrain loss here
      //make a conservative estimate of the end velocity
      let conservative_estimate_of_final_velocity = Math.sqrt((velocity_start**2)+(2*power_after_drivetrain_loss/mass));
      let velocity_end_estimate = conservative_estimate_of_final_velocity;
      let minimum_error = 0.01;
      let max_iterations = 20;

      for(let i=0;i<max_iterations;i++){

        //0: estimate the velocity using an average of start and finish
        let velocity_average_estimate = (velocity_start+velocity_end_estimate)/2;

        //1: get rolling resistance
        let rolling_resistance = mass * C_rr * gravity_force * velocity_average_estimate * time;

        //2: estimate aero drag work
        let drag_force_estimate = 0.5*p_air_density*coefficient_of_drag_x_frontal_area*(velocity_average_estimate**3) * time;

        //3: estimate acceleration energy
        let acceleration_energy = 0.5*mass*(velocity_end_estimate**2-velocity_start**2);

        //need SLOPE, so get derivatives of each

        //4: rolling resistance
        let derivative_rolling_resistance = mass * C_rr * gravity_force * 0.5 * time;

        //5: aero drag work
        let derivative_drag_force_estimate = (3/4)*p_air_density*coefficient_of_drag_x_frontal_area*(velocity_average_estimate**2) * time;

        //6: estimate acceleration energy
        let derivative_acceleration_energy = mass*velocity_end_estimate;

        //7: now get the ERROR and the SLOPE
        let error = (rolling_resistance + drag_force_estimate + acceleration_energy) - power_after_drivetrain_loss;
        let slope = derivative_rolling_resistance + derivative_drag_force_estimate + derivative_acceleration_energy;

        //8: and update if needs be
        if (Math.abs(error) < minimum_error){
          //we have a good enough estimate, so quit
          break;
        }
        else{
          //update the velocity using the error divided by the slope, hallmark of Newton Raphson method
          velocity_end_estimate -= error/slope;
          //console.log(i + " DERIVATIVE velocity_end_estimate " + velocity_end_estimate + " error " + error + " slope " + slope);
        }
      }
      new_velocity = velocity_end_estimate;
    // return this new velocity

    return new_velocity;
  }


  var DecimalPrecision = (function() {
    if (Math.sign === undefined) {
      Math.sign = function(x) {
        return ((x > 0) - (x < 0)) || +x;
      };
    }
    if (Math.trunc === undefined) {
      Math.trunc = function(v) {
        return v < 0 ? Math.ceil(v) : Math.floor(v);
      };
    }
    var toPrecision = function(num, significantDigits) {
      // Return early for ±0, NaN and Infinity.
      if (!num || !Number.isFinite(num))
      return num;
      // Compute the base 10 exponent (signed).
      var e = Math.floor(Math.log10(Math.abs(num)));
      var d = significantDigits - 1 - e;
      var p = Math.pow(10, Math.abs(d));
      // Round to sf-1 fractional digits of normalized mantissa x.dddd
      return d > 0 ? Math.round(num * p) / p : Math.round(num / p) * p;
    };
    // Eliminate binary floating-point inaccuracies.
    var stripError = function(num) {
      if (Number.isInteger(num))
      return num;
      return toPrecision(num, 15);
    };
    var decimalAdjust = function(type, num, decimalPlaces) {
      var n = type === 'round' ? Math.abs(num) : num;
      var p = Math.pow(10, decimalPlaces || 0);
      var m = stripError(n * p)
      var r = Math[type](m) / p;
      return type === 'round' ? Math.sign(num) * r : r;
    };
    return {
      // Decimal round (half away from zero)
      round: function(num, decimalPlaces) {
        return decimalAdjust('round', num, decimalPlaces);
      },
      // Decimal ceil
      ceil: function(num, decimalPlaces) {
        return decimalAdjust('ceil', num, decimalPlaces);
      },
      // Decimal floor
      floor: function(num, decimalPlaces) {
        return decimalAdjust('floor', num, decimalPlaces);
      },
      // Decimal trunc
      trunc: function(num, decimalPlaces) {
        return decimalAdjust('trunc', num, decimalPlaces);
      },
      // Format using fixed-point notation
      toFixed: function(num, decimalPlaces) {
        return decimalAdjust('round', num, decimalPlaces).toFixed(decimalPlaces);
      }
    };
  })();


  // cup22 choke_under_pressure function to derive a probability
  function calculate_linear_space_value(value_list, probability_variables){
    // value list contains sets of 4, each set representing a paramter in the expression, which is built using a loop
    //v1 - multiplier
    //v2 - value
    //v3 - exponent
    //v4 - max value
    // probability_variables is just a list of straightforward probabilities (0-1)
    //return a 0-1 value
    let sum_components = 0;
    let sum_multipliers = 0;
    let result = -1;
    let continue_check = true;
    let probability_modifier_total = 1;
    if(value_list.length % 4 != 0){
      console.log("!!! error in calculate_linear_space_value !!!");
      continue_check = false;
    }
    //check that the values are all numberic
    for(let i = 0; i<value_list.length;i++ ){
      if(isNaN(value_list[i])){
        console.log("!!! error in calculate_linear_space_value NON NUMBER " + value_list[i] + " IN  value_list[" + i + "] !!!");
        continue_check = false;
        break;
      }
    }
    for(let i = 0; i<probability_variables.length;i++ ){
      if(isNaN(probability_variables[i])){
        console.log("!!! error in calculate_linear_space_value NON NUMBER " + probability_variables[i] + " IN  probability_variables[" + i + "] !!!");
        continue_check = false;
        break;
      }
      else if(probability_variables[i] < 0 || probability_variables[i] > 1){
        console.log("!!! error in calculate_linear_space_value INVALID VALUE " + probability_variables[i] + " IN  probability_variables[" + i + "] !!!");
        continue_check = false;
        break;
      }
    }

    if(continue_check){
      sum_components = 0;
      sum_multipliers = 0;

      for(let i = 0; i<value_list.length;i+=4 ){
        sum_components += value_list[i]*(Math.pow(value_list[i+1],value_list[i+2])/(Math.pow(value_list[i+3],value_list[i+2])));
        sum_multipliers += value_list[i];
      }

      sum_components = (sum_components/sum_multipliers);

      for(let i = 0; i<probability_variables.length;i++ ){
        probability_modifier_total *= probability_variables[i];
      }
      result = sum_components * probability_modifier_total;

    }
    return result;


  }
  function setEffort(settings_r, race_r,riders_r, effort){ //actually update the effort level
    let leadingRider = race_r.riders_r[race_r.current_order[0]];
    leadingRider.output_level = effort;
    //console.log("Effort updated to " + effort);
  }

  function switchLead(settings_r, race_r,riders_r, positions_to_drop_back){
    if (positions_to_drop_back >= (race_r.current_order.length-1)){
      positions_to_drop_back = (race_r.current_order.length-1);
    }
    //if limit_drop_to_contiguous_group is 1/ON, check the current group size
    if (settings_r.limit_drop_to_contiguous_group == 1){
      if ((positions_to_drop_back) > (race_r.contiguous_group_size-1)){
        //e.g. ig group size is 3 you can at most drop back 2 (lead rider is 1)
        //  console.log("**** rider trying to drop back " + positions_to_drop_back + " but contiguous_group_size is " + race_r.contiguous_group_size);
        positions_to_drop_back = (race_r.contiguous_group_size-1);
      }
    }

    let current_leader = race_r.current_order[0];
    race_r.riders_r[current_leader].current_aim = "drop"; //separate status whilst dropping back
    let current_leader_power = race_r.riders_r[current_leader].power_out; //try to get the new leader to match this velocity
    let current_leader_velocity = race_r.riders_r[current_leader].velocity;

    let new_order = race_r.current_order.slice(1,positions_to_drop_back+1);
    new_order.push(race_r.current_order[0]);
    new_order.push(...race_r.current_order.slice(positions_to_drop_back+1,race_r.current_order.length));

    race_r.current_order = new_order;
    //change other rider roles to lead and follow
    let new_leader = race_r.riders_r[new_order[0]];

    new_leader.current_aim = "lead";
    new_leader.current_power_effort = settings_r.threshold_power_effort_level;

    //update this rider's power Effort
    new_leader.current_power_effort = current_leader_power;
    let current_threshold = new_leader.threshold_power;

    //note: The version of this in the model3 code has more comments and logging.
    //Changed from using leader power as a target direclty and instead work out what power the new leader will need to produce the same velocity (with no shelter)
    // should aim for power to produce the target speed WITHOUT SHELTER so need to make sure the correct aero_A2 value is used
    let aero_A2_no_shelter = Math.round((0.5 * settings_r.frontalArea * new_leader.air_density)*10000)/10000;
    //now work out the power needed for this new leader using that target velocity
    let target_power = 0;

    //donalK25: apply constant-speed drag calc or acceleration-based calc

    if(power_application_include_acceleration){
      //target_power = power_from_velocity_with_acceleration(aero_A2_no_shelter, settings_r.headwindv, new_leader.aero_tres, settings_r.transv, current_leader_velocity, new_leader.velocity, (new_leader.weight + settings_r.bike_weight));

      target_power = power_from_velocity_with_acceleration(current_leader_velocity, settings_r.rollingRes, (new_leader.weight + settings_r.bike_weight), 9.8, new_leader.air_density, settings_r.frontalArea, new_leader.velocity, settings_r.transv);

      // console.log("switch lead ACCEL method, CHASING rider " + race_rider.name + " from " +  current_velocity + " to race_rider.velocity " + race_rider.velocity + " target_power: " + target_power);
    }
    else{
      target_power = power_from_velocity(aero_A2_no_shelter, settings_r.headwindv, new_leader.aero_tres, settings_r.transv, current_leader_velocity);
    }


    //now work out the output level that will transalte to that power (which can take some time to reach)
    new_leader.output_level = mapPowerToEffort(settings_r.threshold_power_effort_level, target_power, new_leader.threshold_power, new_leader.max_power, settings_r.maximum_effort_value)


    if (new_leader.output_level < 0){
      console.log("switching lead... new_leader.output_level < 0");
      //debugger;
    }

    for(let i=1;i<new_order.length;i++){
      if (new_order[i] != current_leader){ //don't update the dropping back rider
        race_r.riders_r[new_order[i]].current_aim = "follow";
        //reset their power levels, though chasing riders will always try to follow
        race_r.riders_r[new_order[i]].current_power_effort = race_r.riders_r[new_order[i]].threshold_power;
      }
    }
    //console.log("Move lead rider back " + positions_to_drop_back + " positions in order, new order " + new_order);
  }

  function run_race(settings_r,race_r,riders_r){
    //run the race and return the finish time
    race_r.riders = [];
    race_r.riders_r = [];
    race_r.current_order = [];
    race_r.race_clock = 0;
    settings_r.race_bend_distance = Math.PI * settings_r.track_bend_radius;
    race_r.instructions = [];
    race_r.instructions_t = [];

    //donalK25: set the new global for the acceleration calculations (default to OFF/0)
    if (typeof(settings_r.power_application_include_acceleration) != 'undefined'){
      power_application_include_acceleration = settings_r.power_application_include_acceleration;
    }

    //dk22: if this is not the first generation, print the best last gen finish timeout
    let enable_pressure_noise = 0;
    if(settings_r.enable_pressure_noise){
      enable_pressure_noise = settings_r.enable_pressure_noise;
    }
    if(enable_pressure_noise){
      if(settings_r.best_race_time_found_thus_far){
        //console.log("((((((((( Best Race Time Last Generation " + settings_r.best_race_time_found_thus_far + ")))))))))");
      }
    }

    //dk2020 oct. adding new array to store noise/failure alterations. will make this an object/dict for easy retrieval.
    race_r.instruction_noise_alterations = {};
    race_r.performance_failures = {};
    race_r.instruction_noise_delays = {};
    //donalk23 choke_under_pressure, need to store these alterations to power, too
    race_r.instruction_noise_choke_under_pressure = {}
    race_r.instruction_noise_overeagerness = {}

    //prepare to record the power output for each rider at each timestep
    rider_power = [];  //added 2020May26 to start trackign rider power output
    for(let i = 0;i<race_r.start_order.length;i++){
      rider_power.push([]); //add an empty array for each rider, so that we can store the power outputs (watts) for each rider/timestep
    }

    // Set up the switch range points: this is where riders can start to drop back
    // I added settings_r.switch_prebend_start_addition to allow the swithc to start before the bend proper (speed up switches)
    race_r.bend1_switch_start_distance = settings_r.track_straight_length/2 - settings_r.switch_prebend_start_addition;
    race_r.bend1_switch_end_distance = race_r.bend1_switch_start_distance + settings_r.race_bend_distance*(settings_r.bend_switch_range_angle/180) ;
    race_r.bend2_switch_start_distance = (settings_r.track_straight_length*1.5) + settings_r.race_bend_distance - settings_r.switch_prebend_start_addition; //start of second bend
    race_r.bend2_switch_end_distance = race_r.bend2_switch_start_distance + settings_r.race_bend_distance*(settings_r.bend_switch_range_angle/180) ;

    //console.log("race_r.start_order.length "+race_r.start_order.length)

    let distance_2nd_last_timestep = 0;
    let distance_last_timestep = 0;

    //Reset rider properties that change during the race
    for(let i = 0;i<race_r.start_order.length;i++){
      let load_rider = riders_r[race_r.start_order[i]];
      load_rider.start_offset = i*settings_r.start_position_offset;
      load_rider.starting_position_x = settings_r.track_centre_x + (load_rider.start_offset)*settings_r.vis_scale ;
      load_rider.starting_position_y = settings_r.track_centre_y - (settings_r.track_bend_radius*settings_r.vis_scale);
      load_rider.current_position_x = load_rider.starting_position_x;
      load_rider.current_position_y = load_rider.starting_position_y;
      load_rider.current_track_position = 'start';
      load_rider.current_bend_angle=0;
      load_rider.bend_centre_x = 0;
      load_rider.distance_this_step = 0;
      load_rider.distance_covered = 0;
      load_rider.straight_distance_travelled=0;
      load_rider.bend_distance_travelled=0;
      load_rider.distance_this_step_remaining=0;
      load_rider.power_out=0;
      load_rider.velocity=0;
      load_rider.current_power_effort = load_rider.threshold_power;
      load_rider.endurance_fatigue_level = 0;
      load_rider.burst_fatigue_level = 0;
      load_rider.accumulated_fatigue = 0;
      load_rider.output_level=settings_r.threshold_power_effort_level;

      load_rider.distance_from_rider_in_front=0;
      load_rider.number_of_riders_in_front=0;

      load_rider.output_level=load_rider.start_output_level; //new addition to try address bug
      // might be better to auto set this to the theshold level? DonalK25

      //dk2021 new rider property to add info to the log message
      load_rider.step_info = "";

      //dk23: choke_under_pressure reset the cup state to 0
      load_rider.choke_under_pressure_state = 0;

      //dk23 choke_under_pressure: need to reset the threshold and max power if they are affected during a race
      load_rider.original_threshold_power = load_rider.threshold_power;
      load_rider.original_max_power = load_rider.max_power;

      if (i==0){
        load_rider.current_aim = "lead";
      }
      else{
        load_rider.current_aim = "follow";
      }
      race_r.current_order.push(race_r.start_order[i]);
      //console.log("loading rider " + load_rider.name + " at position " + race_r.start_order[i] + " with start offset of " + load_rider.start_offset);
    }
    //race will siply refer to the set of riders
    race_r.riders_r =  riders_r;

    //set up the aero properties so they don't have to be recalculated
    for(let i=0;i< race_r.riders_r.length;i++){
      race_r.riders_r[i].air_density = (1.293 - 0.00426 * settings_r.temperaturev) * Math.exp(-settings_r.elevationv / 7000.0);
      race_r.riders_r[i].aero_twt = Math.round((9.8 * (race_r.riders_r[i].weight + settings_r.bike_weight)*10))/10;  // total weight of rider + bike in newtons, rouded to 1 decimal place
      race_r.riders_r[i].aero_A2 = Math.round((0.5 * settings_r.frontalArea * race_r.riders_r[i].air_density)*100)/100;   // full air resistance parameter
      //twt = total weight
      //tres = total total resistance

      race_r.riders_r[i].aero_tres = race_r.riders_r[i].aero_twt * (settings_r.gradev + settings_r.rollingRes);
    }

    let continue_racing = true;
    global_settings_tracker = JSON.stringify(settings_r);
    global_race_tracker = JSON.stringify(race_r);
    global_riders_tracker = JSON.stringify(riders_r);
    if(settings_r.run_type == "single_race"){ //print them if running a single race (error checking)
      console.log("**SETTINGS BEFORE RACE BEGINS**");
      console.log(global_settings_tracker);
      console.log(global_race_tracker);
      console.log(global_riders_tracker);
    }

    global_log_message = "";
    let finish_time = 0;
    //now the race begins
    while(continue_racing){
      //update the race clock, check for instructions, then move the riders based on the current order

      //add any new instructions if found
      //dkOct2020: add 'noise' if this is switched on. this represents a small chance that an instruciton is misheard by randomly changing its value

      let enable_instruction_noise_1_random = 0;
      let noise_1_probability_instruction_misheard = 0;
      let noise_1_probability_instruction_delayed = 0;
      let noise_1_probability_instruction_delay_range = 0;
      let noise_1_probability_instruction_effort_range = 0;
      let noise_1_probability_instruction_drop_range = 0;

      let instruction_alteration = {};

      //use the global settings but default them to 0 (i.e. do not use) if they do not exist there
      if (typeof(settings_r.enable_instruction_noise_1_random) != 'undefined'){
        enable_instruction_noise_1_random = settings_r.enable_instruction_noise_1_random;
      }
      if (typeof(settings_r.noise_1_probability_instruction_misheard) != 'undefined'){
        noise_1_probability_instruction_misheard = settings_r.noise_1_probability_instruction_misheard;
      }
      if (typeof(settings_r.noise_1_probability_instruction_delayed) != 'undefined'){
        noise_1_probability_instruction_delayed = settings_r.noise_1_probability_instruction_delayed;
      }
      if (typeof(settings_r.noise_1_probability_instruction_delay_range) != 'undefined'){
        noise_1_probability_instruction_delay_range = settings_r.noise_1_probability_instruction_delay_range;
      }
      if (typeof(settings_r.noise_1_probability_instruction_effort_range) != 'undefined'){
        noise_1_probability_instruction_effort_range = settings_r.noise_1_probability_instruction_effort_range;
      }
      if (typeof(settings_r.noise_1_probability_instruction_drop_range) != 'undefined'){
        noise_1_probability_instruction_drop_range = settings_r.noise_1_probability_instruction_drop_range;
      }
      let alteration_selection_sample = -1;
      let noise_alteration = {};
      if(enable_instruction_noise_1_random == 1){
        let alteration_application_sample = Math.random();
        if ( alteration_application_sample < noise_1_probability_instruction_misheard){
          alteration_selection_sample = Math.random(); //this will be used to choose what kind of alteration is applied
        }
      }
      let new_instructions = race_r.race_instructions_r.filter(a=>parseInt(a[0]) == race_r.race_clock);
      //delay the instruction if this 'noise' is chosen

      if(new_instructions.length > 0){
        for(let i=0;i<new_instructions.length;i++){ //technically there should only be ONE instruction per timestep but it remains packaged in a just-in-case loop

          if (alteration_selection_sample >= 0 && alteration_selection_sample < noise_1_probability_instruction_delayed){
            let target_delay =  Math.floor(Math.random() * (noise_1_probability_instruction_delay_range) + 1) ; //should provide a value in range (1 - noise_1_probability_instruction_delay_range)
            //adjust the instruction BUT only if there is NO existing instruciton in that timestep
            //donalK2021: new mechanism to find free timestep (or zero if none is found!)
            let target_timestep = (race_r.race_clock + target_delay);
            let actual_timestep = 0;
            let check_timestep = race_r.race_instructions_r.filter(a=>parseInt(a[0]) == (target_timestep));
            if(check_timestep.length == 0){
              actual_timestep = target_timestep;
            }
            else{
              //console.log("Oops, there is already an instruction at " + target_timestep + " so we cannot delay " + race_r.race_clock + " to then")
              let min_step = race_r.race_clock + 1;
              let max_step = (race_r.race_clock + noise_1_probability_instruction_delay_range);
              let min_counter = target_timestep;
              let max_counter = target_timestep
              while(actual_timestep == 0 && (min_counter > min_step || max_counter < max_step)){
                //console.log("BEFORE: actual_timestep " + actual_timestep + " min_counter " + min_counter + " min_step " + min_step + " max_counter " + max_counter + " max_step " + max_step);
                //go 'up' one step first
                if (max_counter < max_step){
                  max_counter++;
                  check_timestep = race_r.race_instructions_r.filter(a=>parseInt(a[0]) == (max_counter));
                  if(check_timestep.length == 0){
                    actual_timestep = max_counter;
                  }
                }
                if (actual_timestep == 0){ //if still not found go 'down' one step
                  if (min_counter > min_step){
                    min_counter--;
                    check_timestep = race_r.race_instructions_r.filter(a=>parseInt(a[0]) == (min_counter));
                    if(check_timestep.length == 0){
                      actual_timestep = min_counter;
                    }
                  }
                }
                //console.log("AFTER: actual_timestep " + actual_timestep + " min_counter " + min_counter + " min_step " + min_step + " max_counter " + max_counter + " max_step " + max_step);
              }
            }
            //can only delay if actual_timestep was found
            if (actual_timestep > 0){
              noise_alteration["original_instruction"] = new_instructions[i].slice();
              noise_alteration["altered_instruction"] = new_instructions[i].slice();
              noise_alteration["altered_instruction"][0] = actual_timestep;  //actually set the delay
              noise_alteration["type"] = "random_delay";

              //race_r.race_instructions_r[index_of_instruction] = new_instructions[i];
              race_r.instruction_noise_delays[actual_timestep] = race_r.race_clock;
              //console.log("NOISE 1: DELAY instruction NOW " + JSON.stringify(race_r.race_instructions_r[index_of_instruction]));
              //record the alteration instruction so that it can be played back later if needed
              race_r.instruction_noise_alterations[race_r.race_clock] = noise_alteration;
              //console.log("NOISE 1: DELAY instruction " + JSON.stringify(new_instructions[i]) + " to " + JSON.stringify(noise_alteration) + " actual_timestep " + actual_timestep);
            }
          }
          else
          { // only add an instruction that is not delayed
            let inst = new_instructions[i][1].split("=");
            if (inst.length=2){
              if(inst[0]=="effort"){
                let effort_value = parseFloat(inst[1]);
                if (alteration_selection_sample >= 0 && alteration_selection_sample >= noise_1_probability_instruction_delayed){
                  //create a random adjustment
                  let effort_adjustment = Math.random() * (noise_1_probability_instruction_effort_range*2) + (0- noise_1_probability_instruction_effort_range);
                  //make sure the adjustment is in the allowed range! 0 - 9
                  //console.log("NOISE 1: make effort adjustment of " + effort_adjustment + " on to old value of " + effort_value);
                  noise_alteration["original_instruction"] = [race_r.race_clock, "effort=" + effort_value];
                  effort_value  += effort_adjustment;
                  if (effort_value <  settings_r.minimum_power_output){
                    effort_value =  settings_r.minimum_power_output;
                    //console.log("NOISE 1: settign effort to  settings_r.minimum_power_output " +  settings_r.minimum_power_output);
                  }
                  else if(effort_value > settings_r.maximum_effort_value){
                    effort_value = settings_r.maximum_effort_value;
                    //console.log("NOISE 1: settign effort to 9");
                  }
                  noise_alteration["altered_instruction"] = [race_r.race_clock, "effort=" + effort_value];
                  noise_alteration["type"] = "random_effort";

                  race_r.instruction_noise_alterations[race_r.race_clock] = noise_alteration;
                }
                race_r.live_instructions.push(["effort",effort_value]);
              }
              else if(inst[0]=="drop"){
                let drop_value  = parseInt(inst[1]);
                if (alteration_selection_sample >= 0 && alteration_selection_sample >= noise_1_probability_instruction_delayed){
                  let  random_other_drop_value =  Math.floor(Math.random() * ((settings_r.ga_team_size-1) - 1) + 1);
                  if (random_other_drop_value >= drop_value){
                    random_other_drop_value++; // we don't want to ever get the current value, we want a different one
                  }
                  //console.log("NOISE 1: make DROP adjustment, new value " + random_other_drop_value + ", old value wuz " + drop_value);
                  noise_alteration["original_instruction"] = [race_r.race_clock, "drop=" + drop_value];

                  drop_value = random_other_drop_value;

                  //make sure it has not gone overboard
                  if(drop_value < 1){
                    drop_value = 1;
                    //console.log("NOISE 1: settign drop value to 1");
                  }
                  else if (drop_value > (settings_r.ga_team_size-1)){
                    drop_value = (settings_r.ga_team_size-1);
                    //console.log("NOISE 1: settign drop value to " + (settings_r.ga_team_size-1));
                  }
                  noise_alteration["altered_instruction"] = [race_r.race_clock, "drop=" + drop_value];
                  noise_alteration["type"] = "random_drop";
                  race_r.instruction_noise_alterations[race_r.race_clock] = noise_alteration;
                }
                race_r.drop_instruction = drop_value;
              }
            }
          }
        }
      } // loop for found instrucitons

      //****DK20201JAN: also need to check the delay queue and add the instruction there (if there is one)
      if(race_r.instruction_noise_delays[race_r.race_clock]){
        //get the original instruction; it should be run now with NO attempt to add further noise
        let original_instruction_timestep = race_r.instruction_noise_delays[race_r.race_clock];
        //console.log("***DELAY***" + race_r.race_clock + ": delay found, original_instruction_timestep " + original_instruction_timestep);
        //assume that there is just ONE instruction at that timestep
        let delayed_instructions = race_r.race_instructions_r.filter(a=>parseInt(a[0]) == original_instruction_timestep);
        //  console.log("***DELAY***" + race_r.race_clock + ": delayed_instructions " + JSON.stringify(delayed_instructions));
        if(delayed_instructions.length > 0){
          let instruction_to_load = delayed_instructions[0];
          //console.log("adding delayed instruction " + JSON.stringify(delayed_instructions) + "instruction_to_load " + JSON.stringify(instruction_to_load));

          if (instruction_to_load.length==2){
            let inst = instruction_to_load[1].split("=");
            if (inst.length == 2){
              if(inst[0]=="effort"){
                let effort_value = parseFloat(inst[1]);
                race_r.live_instructions.push(["effort",effort_value]);
                //console.log("Added delayed EFFORT instruction " + effort_value);
              }
              else if(inst[0]=="drop"){
                let drop_value  = parseInt(inst[1]);
                race_r.drop_instruction = drop_value;
                //console.log("Set delayed drop_instruction " + drop_value);
              }
            }
          }
        }
      }   //****DK20201JAN:

      //carry out any live_instructions (they are queued)
      while (race_r.live_instructions.length > 0){
        let instruction = race_r.live_instructions.pop();
        if(instruction[0]=="effort"){
          //dk2021: adding these IFs to limit the range of instructions in case they go over 9 or under 1 (arbitrary max/min)
          if(instruction[1] < settings_r.minimum_power_output){
            instruction[1] = 1;
          }
          else if(instruction[1] > settings_r.maximum_effort_value){
            instruction[1] = settings_r.maximum_effort_value;
          }
          setEffort(settings_r, race_r,riders_r, instruction[1]);
        }
      }

      //also look at the drop instruciton: this can only be done at the beginnings of bends where the track is banked
      if(race_r.drop_instruction > 0){
        if (race_r.riders_r.filter(a=>a.current_aim == "drop").length == 0){   //if no  rider is dropping back
          let lead_rider_distance_on_lap = race_r.riders_r[race_r.current_order[0]].distance_covered % settings_r.track_length;
          let distance_travelled_last_step = race_r.riders_r[race_r.current_order[0]].velocity; //dk2020 need to watch for cases where the switch gap is skipped due to high speed
          //if ((lead_rider_distance_on_lap > race_r.bend1_switch_start_distance && lead_rider_distance_on_lap < race_r.bend1_switch_end_distance) || (lead_rider_distance_on_lap > race_r.bend2_switch_start_distance && lead_rider_distance_on_lap < race_r.bend2_switch_end_distance))
          if ((lead_rider_distance_on_lap > race_r.bend1_switch_start_distance && lead_rider_distance_on_lap < race_r.bend1_switch_end_distance) || (lead_rider_distance_on_lap > race_r.bend1_switch_end_distance && (lead_rider_distance_on_lap-distance_travelled_last_step)<=race_r.bend1_switch_start_distance) || (lead_rider_distance_on_lap > race_r.bend2_switch_start_distance && lead_rider_distance_on_lap < race_r.bend2_switch_end_distance) || (lead_rider_distance_on_lap > race_r.bend2_switch_end_distance && (lead_rider_distance_on_lap-distance_travelled_last_step)<=race_r.bend2_switch_start_distance) )
          {
            switchLead(settings_r, race_r,riders_r, race_r.drop_instruction);
            race_r.drop_instruction = 0;
          }
        }
      }
      race_r.contiguous_group_size = 1; //count the riders in the coniguous group at the front: riders may be dropped

      for(let i=0;i<race_r.current_order.length;i++){
        let race_rider = race_r.riders_r[race_r.current_order[i]];

        //work out how far the race_rider can go in this time step
        //work out basic drag from current volocity = CdA*p*((velocity**2)/2)

        let accumulated_effect = 1; // for accumulated fatigue effect on rider. 1 means no effect, 0 means total effect, so no more non-sustainable effort is possible
        race_rider.aero_A2 = Math.round((0.5 * settings_r.frontalArea * race_rider.air_density)*10000)/10000;   // full air resistance parameter

        race_rider.step_info = ""; //dk2021 used to add logging info

        if (race_rider.current_aim =="lead"){

          //LEAD rider: take instructions, and the wind
          //push the pace at the front
          //what's the current effort?
          //consider fatigue
          //update the accumulated fatigue. as this rises, the failure rate lowers.

          if (race_rider.accumulated_fatigue > settings_r.accumulated_fatigue_maximum ){
            accumulated_effect = 0;
          }
          else{
            accumulated_effect = (settings_r.accumulated_fatigue_maximum - race_rider.accumulated_fatigue)/settings_r.accumulated_fatigue_maximum;
          }
          let failure_level = settings_r.fatigue_failure_level*accumulated_effect;

          if(race_rider.endurance_fatigue_level >= failure_level){
            race_rider.output_level = (settings_r.threshold_power_effort_level-settings_r.recovery_effort_level_reduction);
          }

          //dk22: if presssure noise is enabled work out if it happens
          if (enable_pressure_noise){
            if(!(race_rider.under_pressure)){ //rider is not currently under pressure failure
              let pressure_of_fast_race_factor = 0;
              //get the distance travelled
              let speed_this_race_thus_far = (race_rider.distance_covered/race_r.race_clock);
              let min_pressure_of_fast_race_factor = 1;
              let speed_of_best_race_found_thus_far = (race_r.distance/best_race_time_found_thus_far);
              if(settings_r.min_pressure_of_fast_race_factor){
                min_pressure_of_fast_race_factor = settings_r.min_pressure_of_fast_race_factor;
              }
              let max_pressure_of_fast_race_factor = 3;
              let pressure_of_fast_race_factor_level = 0;
              if(settings_r.max_pressure_of_fast_race_factor){
                max_pressure_of_fast_race_factor = settings_r.max_pressure_of_fast_race_factor;
              }
              let pressure_probability_per_timestep = 0;
              if(race_rider.pressure_probability_per_timestep){
                pressure_probability_per_timestep = race_rider.pressure_probability_per_timestep;
              }
              if(best_race_time_found_thus_far < 0){
                pressure_of_fast_race_factor = 1;
              }
              else{
                pressure_of_fast_race_factor_level = (((Math.pow(speed_this_race_thus_far,2)/Math.pow(speed_of_best_race_found_thus_far,2)) + (Math.pow(race_r.race_clock,2)/Math.pow(best_race_time_found_thus_far,2)))/2);
                pressure_of_fast_race_factor = min_pressure_of_fast_race_factor + ((max_pressure_of_fast_race_factor-min_pressure_of_fast_race_factor)*pressure_of_fast_race_factor_level);
              }
              let pressure_prob = (pressure_probability_per_timestep * pressure_of_fast_race_factor);

              let p232 = Math.random();
              if (p232 < pressure_prob){
                console.log("((((((((((((  pressure calculation p232 " + p232 + "  ))))))))))))");
                console.log(" pressure_of_fast_race_factor_level " + pressure_of_fast_race_factor_level + " pressure_prob " + pressure_prob + " pressure_of_fast_race_factor" + pressure_of_fast_race_factor + " pressure_probability_per_timestep " + pressure_probability_per_timestep + " max_pressure_of_fast_race_factor " + max_pressure_of_fast_race_factor + " min_pressure_of_fast_race_factor " + min_pressure_of_fast_race_factor + " speed_of_best_race_found_thus_far " + speed_of_best_race_found_thus_far + " speed_this_race_thus_far " + speed_this_race_thus_far + "race_r.race_clock " + race_r.race_clock + " race_rider.distance_covered" + race_rider.distance_covered  );
                //apply the pressure_failure_amount
                if (race_rider.pressure_failure_amount){
                  console.log("OLD threshold_power " + race_rider.threshold_power + " max_power " + race_rider.max_power);
                  race_rider.threshold_power = race_rider.threshold_power - (race_rider.threshold_power*race_rider.pressure_failure_amount);
                  race_rider.max_power = race_rider.max_power - (race_rider.max_power*race_rider.pressure_failure_amount);
                  race_rider.under_pressure = 1;
                  console.log("UPDATED threshold_power " + race_rider.threshold_power + " max_power " + race_rider.max_power);
                }
              }
            }
          }
          //dk2023 overeagerness noise
          let overeagerness_switch = 0;
          if (typeof(settings_r.overeagerness_switch) != "undefined"){
            overeagerness_switch = settings_r.overeagerness_switch;
          }
          if (overeagerness_switch==1){
            // prevent overeagerness if the rider is recovering from fatigue
            if(race_rider.endurance_fatigue_level < failure_level){
              //get the rider property and the global amount property
              let normal_distribution_output_inflation_percentage = 0;
              let overeagerness_effort_inflation_min_amount = 0;
              if (typeof(settings_r.overeagerness_effort_inflation_min_amount) != "undefined"){
                overeagerness_effort_inflation_min_amount = settings_r.overeagerness_effort_inflation_min_amount;
              }
              let overeagerness_effort_inflation_max_amount = 0;
              if (typeof(settings_r.overeagerness_effort_inflation_max_amount) != "undefined"){
                overeagerness_effort_inflation_max_amount = settings_r.overeagerness_effort_inflation_max_amount;
              }
              let rider_overeagerness_tendency = 0;

              if (typeof(race_rider.overeagerness_tendency) != "undefined"){
                rider_overeagerness_tendency = race_rider.overeagerness_tendency;
              }

              //we also need the distance that the overeagerness extends to, e.g. for the first half of the race
              let overeagerness_race_distance_end_point = 0.5;
              if (typeof(settings_r.overeagerness_race_distance_end_point) != "undefined"){
                overeagerness_race_distance_end_point = settings_r.overeagerness_race_distance_end_point;
              }
              //also of course, an exponent
              let overeagerness_exponent = 1;
              if (typeof(settings_r.overeagerness_exponent) != "undefined"){
                overeagerness_exponent = settings_r.overeagerness_exponent;
              }
              //need the distance remaining and the race distance
              let race_percentage_remaining = (race_r.distance-race_rider.distance_covered)/race_r.distance;
              //work out the liklihood of an overeagerness response
              let probability_of_overeagerness = 0;
              let maximum_race_remaining = 1;
              let race_distance_factor = 0;
              if (race_percentage_remaining > overeagerness_race_distance_end_point){
                race_distance_factor = ((Math.pow(((race_percentage_remaining-overeagerness_race_distance_end_point)/(maximum_race_remaining-overeagerness_race_distance_end_point)),overeagerness_exponent))/(Math.pow(maximum_race_remaining,overeagerness_exponent)));
                probability_of_overeagerness = (race_distance_factor * rider_overeagerness_tendency);
              }
              //now get a random and do the actual check
              if (Math.random() < probability_of_overeagerness){
                //adjust the rider's output level.
                let original_output_level = race_rider.output_level;
                normal_distribution_output_inflation_percentage = (overeagerness_effort_inflation_min_amount + (randn_bm()*(overeagerness_effort_inflation_max_amount-overeagerness_effort_inflation_min_amount)));
                //round it to two places.
                normal_distribution_output_inflation_percentage = DecimalPrecision.round(normal_distribution_output_inflation_percentage,2)
                race_rider.output_level = race_rider.output_level + (race_rider.output_level*normal_distribution_output_inflation_percentage);
                //normal_distribution_output_inflation_percentage_array.push(normal_distribution_output_inflation_percentage);
                // console.log("^^^ * OVEREAGERNESS DETECTED * ^^^ ");
                // console.log("^^^ probability_of_overeagerness " + probability_of_overeagerness);
                // console.log("^^^ race_percentage_remaining " + race_percentage_remaining + " ^^^");
                // console.log("^^^ overeagerness_race_distance_end_point " + overeagerness_race_distance_end_point + " ^^^");
                // console.log("^^^ maximum_race_remaining " + maximum_race_remaining + " ^^^");
                // console.log("^^^ overeagerness_exponent " + overeagerness_exponent + " ^^^");
                // console.log("^^^ rider_overeagerness_tendency " + rider_overeagerness_tendency + " ^^^");
                // console.log("^^^ original_output_level " + original_output_level + " ^^^");
                // console.log("^^^ race_rider.output_level " + race_rider.output_level + " ^^^");
                // console.log("^^^ race_distance_factor " + race_distance_factor + " ^^^");
                if(race_rider.output_level > settings_r.maximum_effort_value){
                  race_rider.output_level = settings_r.maximum_effort_value;
                  //console.log("^^^ OVEREAGERNESS set output level too high! ^^^");
                }
                //also need to LOG this
                race_r.instruction_noise_overeagerness[race_r.race_clock] = normal_distribution_output_inflation_percentage;
              }

            }
            else{
              //console.log("Skipped overeagerness as rider is fatgiued.")
            }
          }
          //set the power level based on the effort instruction

          race_rider.current_power_effort = mapEffortToPower(settings_r.threshold_power_effort_level, race_rider.output_level, race_rider.threshold_power, race_rider.max_power, settings_r.maximum_effort_value );

          let target_power = race_rider.current_power_effort; //try to get to this
          //work out the velocity from the power
          if (target_power <= 0){
            target_power = 0;
          }

          let powerv = race_rider.power_out, power_adjustment = 0;

          //donalK2020: performance failure
          if (settings_r.performance_failure_enabled == 1){
            //will the rider fail this time?
            let performance_failure_probability = calculate_rider_performance_failure_probability(race_rider.output_level, settings_r.maximum_effort_value, race_rider.endurance_fatigue_level, settings_r.fatigue_failure_level, race_rider.accumulated_fatigue, settings_r.accumulated_fatigue_maximum, race_rider.performance_failure_rate, settings_r.rider_performance_failure_rate_max, settings_r.performance_failure_probability_exponent, settings_r.performance_failure_effort_importance_multiplier);
            if (Math.random() < performance_failure_probability){
              //rider fails to perform target power, but by how much?
              //check if new type setting exists #
              let performance_failure_effect_type = 1; //default to 1, the olden deterministic one
              if (settings_r.hasOwnProperty('performance_failure_effect_type')){
                performance_failure_effect_type = settings_r.performance_failure_effect_type;
              }
              let performance_failure_percentage = calculate_rider_performance_failure_percentage_amount(race_rider.output_level, settings_r.maximum_effort_value,  race_rider.endurance_fatigue_level,settings_r.fatigue_failure_level,  race_rider.accumulated_fatigue, settings_r.accumulated_fatigue_maximum, race_rider.performance_failure_multiplier, settings_r.performance_failure_multiplier_max,  settings_r.performance_failure_base_max_percentage, settings_r.performance_failure_amount_exponent, settings_r.performance_failure_effort_importance_multiplier,performance_failure_effect_type);
              //add an entry to performance_failures
              let timestep_rider = race_r.race_clock + "_" + race_r.current_order[i];
              race_r.performance_failures[timestep_rider] = performance_failure_percentage;

              //console.log("RIDER FAILURE (prob " + performance_failure_probability + ")" + performance_failure_percentage + " of target_power: updated from " + target_power + " to " + (target_power - (target_power*performance_failure_percentage)));

              target_power = target_power - (target_power*performance_failure_percentage);

            }
          }

          //DonalK22 also check for choke-under-pressure noise LEAD
          //  debugger
          if (settings_r.hasOwnProperty('choke_under_pressure_switch')){
            if (settings_r.choke_under_pressure_switch == 1){ // 1 is ON, 0 is OFF
              //rides need the property to reflect their 'tendency' to fail in this way
              //also this should never be appled to a rider twice to once enabled the application should then be ignored
              if(race_rider.hasOwnProperty("choke_under_pressure_state")){
                if(race_rider.choke_under_pressure_state == 0){ // 0 = not set, so can check
                  rider_choke_under_pressure_tendency = 0;
                  if (race_rider.hasOwnProperty('choke_under_pressure_tendency')){
                    rider_choke_under_pressure_tendency = race_rider.choke_under_pressure_tendency;
                  }
                  //dumb version, choke purely based on the rider's "temperment"
                  //maybe update the rider's characteristice to have an effect on their next turn
                  //otherwise will need to move this up the chain of happenings
                  // [multiplier, value, exponent, max value]

                  let prob_choke_under_pressure = 0;
                  let choke_under_pressure_value_list = [1, rider_choke_under_pressure_tendency,1,10]; //guessing the values here really
                  let choke_under_pressure_probability_variables = [];

                  // want to make failure more likely if the race is near the end and only possible if the current average is better than the best time average
                  let best_time_speed = (race_r.distance/generation_best_time);
                  let current_speed = (race_rider.distance_covered/race_r.race_clock);
                  let speed_higher_than_best = ((current_speed > best_time_speed)?1:0);
                  //the idea here is that IF the race looks like it will be a new PB and we are approachign the end, choking becomes way more likely!
                  let end_race_better_time_factor = speed_higher_than_best*(race_rider.distance_covered/race_r.distance);
                  // note that ridersd CAN go beyond the race distance, i.e. if one slow one is way behind, soooo need to limit it to a max of 1
                  if(end_race_better_time_factor > 1){
                    end_race_better_time_factor = 1;
                  }
                  choke_under_pressure_probability_variables.push(end_race_better_time_factor);
                  // if the rider is going to fail then reduce their capacities

                  prob_choke_under_pressure = calculate_linear_space_value(choke_under_pressure_value_list,choke_under_pressure_probability_variables);


                  if (speed_higher_than_best == 0){
                    zero_cup_count++;
                  }

                  //console.log("** choke under pressure prob " + prob_choke_under_pressure + " " + zero_cup_count + " cup count " + count_of_choke_under_pressure_loggings);

                  let cup_r = Math.random()
                  if (cup_r < prob_choke_under_pressure){
                    let choke_under_pressure_amount = 0;

                    if (settings_r.hasOwnProperty('choke_under_pressure_amount_percentage')){
                      choke_under_pressure_amount = settings_r.choke_under_pressure_amount_percentage;
                    }
                    count_of_choke_under_pressure_loggings++;
                    // console.log("************ CHOKE UNDER PRESSURE HAPPENING (lead rider)! [[ " + count_of_choke_under_pressure_loggings + "]]************" );
                    // console.log("race_rider.velocity " + race_rider.velocity);
                    // console.log("prob_choke_under_pressure " + prob_choke_under_pressure + " cup_r " + cup_r);
                    // console.log("rider_choke_under_pressure_tendency " + rider_choke_under_pressure_tendency);
                    // console.log("end_race_better_time_factor " + end_race_better_time_factor);
                    // console.log("race_rider.distance_covered / race_r.race_clock " + race_rider.distance_covered + " / " + race_r.race_clock);
                    // console.log("updating threshold power from " + race_rider.threshold_power + " to " + (race_rider.threshold_power - (race_rider.threshold_power*choke_under_pressure_amount)));
                    // console.log("updating max power from " + race_rider.max_power + " to " + (race_rider.max_power - (race_rider.max_power*choke_under_pressure_amount)));
                    race_rider.threshold_power -= (race_rider.threshold_power*choke_under_pressure_amount);
                    race_rider.max_power -= (race_rider.max_power*choke_under_pressure_amount);
                    race_rider.choke_under_pressure_state = 1; //shouldn't be checked again for the remainder of the race
                    //store to be replayed/observed in results
                    if (race_r.instruction_noise_choke_under_pressure.hasOwnProperty(race_r.race_clock)){
                      race_r.instruction_noise_choke_under_pressure[race_r.race_clock].push(race_r.current_order[i]);
                      race_r.instruction_noise_choke_under_pressure[race_r.race_clock].push(choke_under_pressure_amount);

                    }
                    else{
                      race_r.instruction_noise_choke_under_pressure[race_r.race_clock] = [race_r.current_order[i],choke_under_pressure_amount];
                    }

                  }
                }
              }
            }
          }

          //compare power required to previous power and look at how it can increase or decrease
          if (powerv > target_power){ //slowing down
            if((powerv - target_power) > Math.abs(settings_r.power_adjustment_step_size_down)){
              power_adjustment = settings_r.power_adjustment_step_size_down;
            }
            else{
              power_adjustment = (target_power - powerv);
            }
          }
          else if(powerv < target_power){ //speeding up
            if((target_power - powerv) > settings_r.power_adjustment_step_size_up){
              power_adjustment = settings_r.power_adjustment_step_size_up;
            }
            else{
              power_adjustment = (target_power - powerv);
            }
          }

          if((powerv+power_adjustment) < 0){
            console.log("crap! powerv 1 = " + powerv, " power_adjustment = " + power_adjustment);
            debugger;
          }

          powerv+=power_adjustment;

          //round power output to 2 decimal places
          //donalK25 #accel --------------------
          //powerv = Math.round((powerv)*100)/100;
          //donalK25 #accel --------------------||

            let current_velocity = race_rider.velocity;
            debugger;
            //donalK25: apply constant-speed drag calc or acceleration-based calc
            //send it transv, the drivetrain efficiency, too.
            if(power_application_include_acceleration){
              race_rider.velocity = velocity_from_power_with_acceleration(powerv, settings_r.rollingRes, (race_rider.weight + settings_r.bike_weight), 9.8, race_rider.air_density, settings_r.frontalArea, current_velocity, settings_r.transv);

              console.log("Leading rider " + race_r.current_order[i] + " velocity_from_power_with_acceleration() power " + powerv + " Crr " + settings_r.rollingRes + " total weight " +  (race_rider.weight + settings_r.bike_weight) + " gravity " + 9.8 + " air density " + race_rider.air_density + " frontal area " + settings_r.frontalArea + " current velocity " + current_velocity + " drivetrain efficiency " + settings_r.transv + " NEW VELOCITY " + race_rider.velocity);


              //console.log("ACCELL method, LEAD rider " + race_rider.name + " from " +  current_velocity + " to race_rider.velocity " + race_rider.velocity);
            }
            else{
                race_rider.velocity = newton(race_rider.aero_A2, settings_r.headwindv, race_rider.aero_tres, settings_r.transv, powerv);
            }

          if(powerv < 0){
            console.log("crap! powerv 2 = " + powerv);
            debugger;
          }
          race_rider.power_out = powerv;

          //can now save this power
          rider_power[race_r.current_order[i]].push(powerv);

          //dk2021 set the log info
          race_rider.step_info = "(" + target_power + "|" + powerv + "|" + race_rider.aero_A2 + "|" + race_rider.accumulated_fatigue + "|" + race_rider.endurance_fatigue_level + "|" + race_rider.output_level + ")";

          //add fatigue if going harder than the threshold or recover if going under it
          //recover if going under the threshold

          if (race_rider.power_out < race_rider.threshold_power){
            if (race_rider.endurance_fatigue_level > 0){

              let recovery_power_rate = 1;
              if (settings_r.recovery_power_rate){
                recovery_power_rate = settings_r.recovery_power_rate;
              }

              race_rider.endurance_fatigue_level -= race_rider.recovery_rate * Math.pow(( (race_rider.threshold_power - race_rider.power_out)/race_rider.threshold_power),recovery_power_rate);
              //race_rider.endurance_fatigue_level -= race_rider.recovery_rate * ( (race_rider.threshold_power - race_rider.power_out)/race_rider.threshold_power);

              if (  race_rider.endurance_fatigue_level < 0){ race_rider.endurance_fatigue_level = 0;}; //just in case it goes below zero
            }
          }
          else if(race_rider.power_out > race_rider.threshold_power){
            //let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/race_rider.max_power),settings_r.fatigue_power_rate);
            //dk2020: updated this formula as it seems to apply exponent poorly and NOT behave as expected
            let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/(race_rider.max_power-race_rider.threshold_power)),settings_r.fatigue_power_rate);
            race_rider.endurance_fatigue_level += fatigue_rise;
            race_rider.accumulated_fatigue += fatigue_rise;
            // print info if the maximum is exceeded

            if (  race_rider.endurance_fatigue_level > max_endurance_fatigue_level){
              max_endurance_fatigue_level =   race_rider.endurance_fatigue_level;
              // console.log("#####****New max_endurance_fatigue_level****#####");
              // console.log("max_endurance_fatigue_level " + max_endurance_fatigue_level
              //     + " fatigue_rise " + fatigue_rise
              //     + " race_rider.fatigue_rate " + race_rider.fatigue_rate
              //     + " race_rider.power_out " + race_rider.power_out
              //     + " race_rider.threshold_power " + race_rider.threshold_power
              //     + " race_rider.max_power " + race_rider.max_power
              //     + " settings_r.fatigue_power_rate " + settings_r.fatigue_power_rate
              //     + " Start Order " + JSON.stringify(race_r.start_order)
              //     + " Instructions " + JSON.stringify(race_r.race_instructions_r));

            }
            if (fatigue_rise > max_fatigue_rise){
              max_fatigue_rise = fatigue_rise;
              // console.log("#####~~~~New max_fatigue_rise~~~~#####");
              // console.log("max_endurance_fatigue_level " + max_endurance_fatigue_level
              //     + " fatigue_rise " + fatigue_rise
              //     + " race_rider.fatigue_rate " + race_rider.fatigue_rate
              //     + " race_rider.power_out " + race_rider.power_out
              //     + " race_rider.threshold_power " + race_rider.threshold_power
              //     + " race_rider.max_power " + race_rider.max_power
              //     + " settings_r.fatigue_power_rate " + settings_r.fatigue_power_rate
              //     + " Start Order " + JSON.stringify(race_r.start_order)
              //     + " Instructions " + JSON.stringify(race_r.race_instructions_r));
            }
          }

        }
        else{ //CHASING rider
          //rider may be following or dropping back or dropped. Either way they will be basing velocity on that of another rider- normally just following the rider in front of them

          let rider_to_follow = {};
          if (i==0){
            rider_to_follow = race_r.riders_r[race_r.current_order[race_r.current_order.length-1]];
          }
          else{
            rider_to_follow = race_r.riders_r[race_r.current_order[i-1]];
          }

          // assume we are drafting and try to cover the same distance as the race_rider in front, which will take a certain amount of power
          //need to factor in the original offset
          //let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset- settings_r.start_position_offset) -  (race_rider.distance_covered-race_rider.start_offset);

          let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset - settings_r.target_rider_gap) -  (race_rider.distance_covered - race_rider.start_offset);
          //this is your target velocity, but it might not be possible. assuming 1 s - 1 step
          let target_velocity = distance_to_cover;

          //donalK25 #accel --------------------
          if (target_velocity < 0){
            target_velocity = 0;
          }
          //donalK25 #accel -------------------- ||

        //work out the power needed for this velocity- remember we are drafting

          //if your velocity is very high and you are approaching the target rider you will speed past, so if within a certain distance and traveling quickly set your target speed to be that of the target rider or very close to it.
          //dk23AUG issue with rider at back applying the following logic when the front rider drops back 2 spaces.
          //disable this if the rider_to_follow is dropping back.
          //if((race_rider.velocity - rider_to_follow.velocity > settings_r.velocity_difference_limit) &&  (distance_to_cover < settings_r.damping_visibility_distance)){
          if((rider_to_follow.current_aim != "drop") && (race_rider.velocity - rider_to_follow.velocity > settings_r.velocity_difference_limit) &&  (distance_to_cover < settings_r.damping_visibility_distance)){
            target_velocity =  rider_to_follow.velocity;//assumption that by the time taken to adjust to the same velocity you will have caught them

          }
          else if((race_rider.velocity - target_velocity > 0) && (distance_to_cover < settings_r.damping_visibility_distance)){ //if slowing down and target velocity is low but you are close to the target rider, then only slow a little (dropping back)
            //need to weight the adjustment so that it goes closer to zero as they get closer and closer
            let rider_to_follow_proximity_weighting = 1;
            let current_distance_from_target = Math.abs((race_rider.distance_covered-race_rider.start_offset) - (rider_to_follow.distance_covered-rider_to_follow.velocity-rider_to_follow.start_offset-settings_r.target_rider_gap));
            if (current_distance_from_target < settings_r.damping_deceleration_distance){
              rider_to_follow_proximity_weighting = (current_distance_from_target/settings_r.damping_deceleration_distance);
            }
            target_velocity =  (rider_to_follow.velocity - (settings_r.velocity_adjustment_dropping_back*rider_to_follow_proximity_weighting));      }

            let tv = target_velocity + settings_r.headwindv;
            //to work out the shelter, distance from the rider in front is needed

            let level_of_shelter = 1;//maximum shelter
            let shelter_effect_strength = settings_r.drafting_effect_on_drag;
            if (race_rider.number_of_riders_in_front == 2){
              shelter_effect_strength += settings_r.two_riders_in_front_extra_shelter;
            }
            else if (race_rider.number_of_riders_in_front > 2){
              shelter_effect_strength += settings_r.more_than_two_riders_in_front_extra_shelter;
            }

            if (race_rider.distance_from_rider_in_front > settings_r.shelter_max_distance){
              level_of_shelter = 0; //after 3m assume no shelter: this is a hardcoded guess
            }
            else if (race_rider.distance_from_rider_in_front > 0){
              //between 0 and shelter_max_distance metres need to drop off - try a linear model
              //donalK25: seeing a major issue with   level_of_shelter = (1-(level_of_shelter/settings_r.shelter_max_distance));
              // why is the distance_from_rider_in_front not in there?
              //debugger;
              //level_of_shelter = (1-(level_of_shelter/settings_r.shelter_max_distance));
              //new version march 2025
              if (race_rider.distance_from_rider_in_front < settings_r.target_rider_gap) { //provide no benefit if too close
                level_of_shelter = 1;
              }
              else{
                // what spot in the gap between min and max shelter are we at? (e.g., 2m to 5m)
                level_of_shelter = (1-((race_rider.distance_from_rider_in_front-settings_r.target_rider_gap)/(settings_r.shelter_max_distance-settings_r.target_rider_gap)));
              }
            }
            else if (race_rider.distance_from_rider_in_front == -1){
              //if you have no rider in front of you this distance is set to -1, so you have no shelter
              level_of_shelter = 0;
            }
            //console.log(">> a e r o >>  settings_r.target_rider_gap "+settings_r.target_rider_gap+" settings_r.shelter_max_distance "+settings_r.shelter_max_distance+" distance_from_rider_in_front  " + race_rider.distance_from_rider_in_front + "  level_of_shelter  " + level_of_shelter + " *shelter_effect_strength " + shelter_effect_strength + " " + shelter_effect_strength*level_of_shelter);

            let target_power = 0;
            let shelter_effect = (shelter_effect_strength*level_of_shelter);
            race_rider.aero_A2 = Math.round((race_rider.aero_A2 - race_rider.aero_A2*shelter_effect)*10000)/10000;
            let A2Eff = (tv > 0.0) ? race_rider.aero_A2 : -race_rider.aero_A2; // wind in face, must reverse effect
            let current_velocity = race_rider.velocity;

            let frontal_area_adjusted_for_shelter = Math.round((settings_r.frontalArea - settings_r.frontalArea*shelter_effect)*10000)/10000;

            //debugger;
            if(power_application_include_acceleration){
              //target_power = power_from_velocity_with_acceleration(race_rider.aero_A2, settings_r.headwindv, race_rider.aero_tres, settings_r.transv, target_velocity, race_rider.velocity, (race_rider.weight + settings_r.bike_weight));
              target_power = power_from_velocity_with_acceleration(target_velocity, settings_r.rollingRes, (race_rider.weight + settings_r.bike_weight), 9.8, race_rider.air_density, frontal_area_adjusted_for_shelter, race_rider.velocity, settings_r.transv);

              console.log("Chasing rider " + race_r.current_order[i] + " power_from_velocity_with_acceleration() " + " target velocity " + target_velocity + " Crr " + settings_r.rollingRes + " total weight " + (race_rider.weight + settings_r.bike_weight) + " gravity " + 9.8 + " air density " + race_rider.air_density + " frontal area " + frontal_area_adjusted_for_shelter + " current velocity " + race_rider.velocity + " drivetrain efficiency " + settings_r.transv + " TARGET POWER " + target_power);

              // console.log("ACCEL method, CHASING rider " + race_rider.name + " from " +  current_velocity + " to race_rider.velocity " + race_rider.velocity + " target_power: " + target_power);
            }
            else{
              let target_power = (target_velocity * race_rider.aero_tres + target_velocity * tv * tv * A2Eff) / settings_r.transv;
            }
            let original_target_power = target_power;

            //target power cannot be <= 0; riders do not stop; need a predefined lowest limit?
            if (target_power <= 0){
              target_power = 0;
            }
            //What is the max power that this rider can do for now? Need to consider fatigue
            let current_max_power = race_rider.max_power;
            if (race_rider.accumulated_fatigue > settings_r.accumulated_fatigue_maximum ){
              accumulated_effect = 0;
            }
            else{
              accumulated_effect = (settings_r.accumulated_fatigue_maximum - race_rider.accumulated_fatigue)/settings_r.accumulated_fatigue_maximum;
            }
            let failure_level = settings_r.fatigue_failure_level*accumulated_effect;
            if(race_rider.endurance_fatigue_level >= failure_level){
              current_max_power = (race_rider.threshold_power*((settings_r.threshold_power_effort_level-settings_r.recovery_effort_level_reduction)/10));
            }
            //can't go over the max power
            if (target_power > current_max_power){
              target_power = current_max_power; //can't go over this (for now)
            }

            //BUT, can this power be achieved? we may have to accelerate, or decelerate, or it might be impossible
            let powerv = race_rider.power_out, power_adjustment = 0;

            //donalK2020: performance failure
            if (settings_r.performance_failure_enabled == 1){
              //will the rider fail this time?
              let performance_failure_probability = calculate_rider_performance_failure_probability(race_rider.output_level, settings_r.maximum_effort_value, race_rider.endurance_fatigue_level, settings_r.fatigue_failure_level, race_rider.accumulated_fatigue, settings_r.accumulated_fatigue_maximum, race_rider.performance_failure_rate, settings_r.rider_performance_failure_rate_max, settings_r.performance_failure_probability_exponent, settings_r.performance_failure_effort_importance_multiplier);
              if (Math.random() < performance_failure_probability){
                //rider fails to perform target power, but by how much?
                let performance_failure_effect_type = 1; //default to 1, the olden deterministic one
                if (settings_r.hasOwnProperty('performance_failure_effect_type')){
                  performance_failure_effect_type = settings_r.performance_failure_effect_type;
                }
                let performance_failure_percentage = calculate_rider_performance_failure_percentage_amount(race_rider.output_level, settings_r.maximum_effort_value,  race_rider.endurance_fatigue_level,settings_r.fatigue_failure_level,  race_rider.accumulated_fatigue, settings_r.accumulated_fatigue_maximum, race_rider.performance_failure_multiplier, settings_r.performance_failure_multiplier_max,  settings_r.performance_failure_base_max_percentage, settings_r.performance_failure_amount_exponent, performance_failure_effect_type);
                //add an entry to performance_failures
                let timestep_rider = race_r.race_clock + "_" + race_r.current_order[i];
                race_r.performance_failures[timestep_rider] = performance_failure_percentage;

                //console.log("RIDER FAILURE (prob " + performance_failure_probability + ")" + performance_failure_percentage + " of target_power: updated from " + target_power + " to " + (target_power - (target_power*performance_failure_percentage)));

                target_power = target_power - (target_power*performance_failure_percentage);

              }
            }

            //DonalK22 also check for choke-under-pressure noise (chaser)
            if (settings_r.hasOwnProperty('choke_under_pressure_switch')){
              if (settings_r.choke_under_pressure_switch == 1){
                //rides need the property to reflect their 'tendency' to fail in this way
                //also this should never be appled to a rider twice to once enabled the application should then be ignored
                if(race_rider.hasOwnProperty("choke_under_pressure_state")){
                  if(race_rider.choke_under_pressure_state == 0){
                    rider_choke_under_pressure_tendency = 0;
                    if (race_rider.hasOwnProperty('choke_under_pressure_tendency')){
                      rider_choke_under_pressure_tendency = race_rider.choke_under_pressure_tendency;
                    }
                    //dumb version, choke purely based on the rider's "temperment"
                    //maybe update the rider's characteristice to have an effect on their next turn
                    //otherwise will need to move this up the chain of happenings
                    // [multiplier, value, exponent, max value]

                    let prob_choke_under_pressure = 0;
                    let choke_under_pressure_value_list = [1, rider_choke_under_pressure_tendency,1,10]; //guessing the values here really
                    let choke_under_pressure_probability_variables = [];

                    // want to make failure more likely if the race is near the end and only possible if the current average is better than the best time average
                    let best_time_speed = (race_r.distance/generation_best_time);
                    let current_speed = (race_rider.distance_covered/race_r.race_clock);
                    let speed_higher_than_best = ((current_speed > best_time_speed)?1:0);
                    //the idea here is that IF the race looks like it will be a new PB and we are approachign the end, choking becomes way more likely!
                    let end_race_better_time_factor = speed_higher_than_best*(race_rider.distance_covered/race_r.distance);
                    if(end_race_better_time_factor > 1){ //riders could go beyond the distance of the race while others finish
                      end_race_better_time_factor = 1;
                    }
                    choke_under_pressure_probability_variables.push(end_race_better_time_factor);
                    // if the rider is going to fail then reduce their capacities

                    prob_choke_under_pressure = calculate_linear_space_value(choke_under_pressure_value_list,choke_under_pressure_probability_variables);
                    if (speed_higher_than_best == 0){
                      zero_cup_count++;
                    }

                    //console.log("** choke under pressure prob " + prob_choke_under_pressure + " " + zero_cup_count + " cup count " + count_of_choke_under_pressure_loggings);

                    // if the rider is going to fail then reduce their capacities
                    let cup_r = Math.random();
                    if (cup_r < prob_choke_under_pressure){
                      let choke_under_pressure_amount = 0;

                      if (settings_r.hasOwnProperty('choke_under_pressure_amount_percentage')){
                        choke_under_pressure_amount = settings_r.choke_under_pressure_amount_percentage;
                      }
                      //console.log("************ CHOKE UNDER PRESSURE HAPPENING (chase rider)! [[ " + count_of_choke_under_pressure_loggings + "]]************" );
                      //console.log("race_rider.velocity " + race_rider.velocity);
                      //console.log("prob_choke_under_pressure " + prob_choke_under_pressure + " cup_r " + cup_r);
                      //console.log("rider_choke_under_pressure_tendency " + rider_choke_under_pressure_tendency);
                      //console.log("end_race_better_time_factor " + end_race_better_time_factor);
                      //console.log("race_rider.distance_covered / race_r.race_clock " + race_rider.distance_covered + " / " + race_r.race_clock);
                      //console.log("updating threshold power from " + race_rider.threshold_power + " to " + (race_rider.threshold_power - (race_rider.threshold_power*choke_under_pressure_amount)));
                      //console.log("updating max power from " + race_rider.max_power + " to " + (race_rider.max_power - (race_rider.max_power*choke_under_pressure_amount)));
                      race_rider.threshold_power -= (race_rider.threshold_power*choke_under_pressure_amount);
                      race_rider.max_power -= (race_rider.max_power*choke_under_pressure_amount);
                      race_rider.choke_under_pressure_state = 1; //shouldn't be checked again for the remainder of the race

                      if (race_r.instruction_noise_choke_under_pressure.hasOwnProperty(race_r.race_clock)){
                        race_r.instruction_noise_choke_under_pressure[race_r.race_clock].push(race_r.current_order[i]);
                        race_r.instruction_noise_choke_under_pressure[race_r.race_clock].push(choke_under_pressure_amount);

                      }
                      else{
                        race_r.instruction_noise_choke_under_pressure[race_r.race_clock] = [race_r.current_order[i],choke_under_pressure_amount];
                      }
                    }
                  }
                }
              }
            }


            //to stop radical slowing down/speeding up, need to reduce it as the target rider's velocity is approched
            let damping = 1;
            if (powerv > target_power){//slowing down
              if((powerv - target_power) > Math.abs(settings_r.power_adjustment_step_size_down)){
                power_adjustment = settings_r.power_adjustment_step_size_down * damping;
              }
              else{
                power_adjustment = (target_power - powerv);
              }
            }
            else if(powerv < target_power){//speeding up
              if((target_power - powerv) > settings_r.power_adjustment_step_size_up){
                power_adjustment = settings_r.power_adjustment_step_size_up;
              }
              else{
                power_adjustment = (target_power - powerv);
              }
            }

            let old_velocity = race_rider.velocity; //use to check if rider slows down or speeds up for this step

            //as with the lead rider, need to check the lookup table to avoid lots of duplicate newton() calls

            powerv+=power_adjustment;
            //round power output to 2 decimal places
            //powerv = Math.round((powerv)*100)/100; //donalK25: removing this for now to increase accuracy

            if(power_application_include_acceleration){

              race_rider.velocity = velocity_from_power_with_acceleration(powerv, settings_r.rollingRes, race_rider.weight + settings_r.bike_weight, 9.8, race_rider.air_density, frontal_area_adjusted_for_shelter, current_velocity, settings_r.transv);
              console.log("Chasing rider " + race_r.current_order[i] + " velocity_from_power_with_acceleration() power " + powerv + " Crr " + settings_r.rollingRes + " total weight " +  (race_rider.weight + settings_r.bike_weight) + " gravity " + 9.8 + " air density " + race_rider.air_density + " frontal area " + frontal_area_adjusted_for_shelter + " current velocity " + current_velocity + " drivetrain efficiency " + settings_r.transv + " NEW VELOCITY " + race_rider.velocity);
              //console.log(" target_velocity " + target_velocity + " original_target_power " + original_target_power + " powerv " + powerv + " new velocity " + race_rider.velocity);
              // console.log("ACCELL method, CHASING rider " + race_rider.name + " from " +  current_velocity + " to race_rider.velocity " + race_rider.velocity);
            }
            else{
                race_rider.velocity = newton(race_rider.aero_A2, settings_r.headwindv, race_rider.aero_tres, settings_r.transv, powerv);
            }

            //if you are dropping back and get back to the rider in front, go back to a follow state
            if(race_rider.current_aim =="drop"){ //once you are behind the rider_to_follow, you 'follow' again
              if((race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= (rider_to_follow.distance_covered-rider_to_follow.start_offset)){ //idea is that you are dropping back so long as you are goign slower than the rider you want to follow
                race_rider.current_aim = "follow";
              }
            }

            //dksep20 if you are still a long ways behind the rider_to_follow you are dropped
            //if you are within a set distance you are NOT dropped

            //count the size of the current contiguous group: may affect drop/switchLead() instructions
            if((race_r.contiguous_group_size == i) && ((rider_to_follow.distance_covered-rider_to_follow.start_offset) - (race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= settings_r.contiguous_group_drop_distance)){
              race_r.contiguous_group_size++;
            }
            race_rider.power_out = powerv;

            //can now save this power
            rider_power[race_r.current_order[i]].push(powerv);

            //dk2021 set the log info
            race_rider.step_info = "(" + target_power + "|" + powerv + "|" + race_rider.aero_A2 + "|" + race_rider.accumulated_fatigue + "|" + race_rider.endurance_fatigue_level + "|" + race_rider.output_level + ")";

            if(race_rider.power_out < 0){
              console.log("crap! race_rider.power_out = " + race_rider.power_out);
              debugger;
            }

            //fatigue if over the threshold, recover if under
            if (race_rider.power_out < race_rider.threshold_power ){
              //recover if going under the threshold
              if (race_rider.endurance_fatigue_level > 0){

                let recovery_power_rate = 1;

                if (settings_r.recovery_power_rate){
                  recovery_power_rate = settings_r.recovery_power_rate;
                }

                race_rider.endurance_fatigue_level -= race_rider.recovery_rate * Math.pow(((race_rider.threshold_power - race_rider.power_out)/race_rider.threshold_power),recovery_power_rate);
                //  race_rider.endurance_fatigue_level -= race_rider.recovery_rate * ((race_rider.threshold_power - race_rider.power_out)/race_rider.threshold_power);

                if ( race_rider.endurance_fatigue_level < 0){
                  race_rider.endurance_fatigue_level = 0;
                }
              }
            }
            else{
              //add fatigue if going harder than the threshold
              //let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/race_rider.max_power),settings_r.fatigue_power_rate);
              //dk2020:updated
              let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/(race_rider.max_power-race_rider.threshold_power)),settings_r.fatigue_power_rate);
              race_rider.endurance_fatigue_level += fatigue_rise;
              race_rider.accumulated_fatigue += fatigue_rise;
              if (fatigue_rise > max_fatigue_rise){
                max_fatigue_rise = fatigue_rise;
                // console.log("#####~~~~New max_fatigue_rise~~~~#####");
                // console.log("fatigue_rise " + fatigue_rise
                //     + " race_rider.fatigue_rate " + race_rider.fatigue_rate
                //     + " race_rider.power_out " + race_rider.power_out
                //     + " race_rider.threshold_power " + race_rider.threshold_power
                //     + " race_rider.max_power " + race_rider.max_power
                //     + " settings_r.fatigue_power_rate " + settings_r.fatigue_power_rate);
              }
            }
          }
          race_rider.distance_covered+=race_rider.velocity;
        }
        // After all riders have moved

        // console.log("race_r.contiguous_group_size " + race_r.contiguous_group_size);

        // Update each rider's distance value for the rider in front of them (lead is zero)
        let logMessage = "";
        for(let i=0;i<race_r.current_order.length;i++){
          let ri = race_r.current_order[i];
          let display_rider = race_r.riders_r[ri];
          //is there a rider in front, i.e. who has covered more distance? find the closest rider that is in front of you and use this gap to work out your shelter
          let rif = -1;
          let min_distance = -1;
          let number_of_riders_in_front = 0;

          for(let j=0;j<race_r.current_order.length;j++){
            if(i!==j){ //ignore distance to self
              let distance_to_rider = (race_r.riders_r[race_r.current_order[j]].distance_covered - race_r.riders_r[race_r.current_order[j]].start_offset ) - (display_rider.distance_covered - display_rider.start_offset);
              if(distance_to_rider >= 0){//ignore riders behind you, who will have negative distance
                number_of_riders_in_front++;
                if(min_distance==-1){
                  min_distance = distance_to_rider;
                }
                else if (distance_to_rider <  min_distance){
                  min_distance = distance_to_rider;
                }
              }
            }
          }
          display_rider.distance_from_rider_in_front = min_distance;
          display_rider.number_of_riders_in_front = number_of_riders_in_front;

          if(global_log_message_now || ((settings_r.ga_log_each_step || debug_log_specific_timesteps.includes(race_r.race_clock)) && settings_r.run_type == "single_race")){
            logMessage += " " + race_r.race_clock + " | " + display_rider.name + " " + display_rider.current_aim.toUpperCase() +  ((i==race_r.current_order.length-2)?' |F|':'') + " | " + Math.round(display_rider.distance_covered * 100)/100 + "m | "+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph | "+ Math.round(display_rider.power_out * 100)/100 + " / "  + display_rider.threshold_power + " / " + display_rider.max_power + " watts | "+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m | " + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) + " |||| " + display_rider.step_info;
          }
        }
        if((settings_r.ga_log_each_step || debug_log_specific_timesteps.includes(race_r.race_clock)) && settings_r.run_type == "single_race"){
          console.log(logMessage);
        }
        else if (global_log_message_now){
          //dk23 note this can sometimes throw an error "caught RangeError: Invalid string length"
          // so i might arbitrarily limit the length of the stringify

          if (global_log_message.length > longest_LOG_MESSAGE_found){
            longest_LOG_MESSAGE_found = global_log_message.length;
            //console.log("====== longest_LOG_MESSAGE_found " + longest_LOG_MESSAGE_found);
          }
          if (global_log_message.length < GLOBAL_LOG_MESSAGE_LIMIT){

            global_log_message += logMessage;
          }
          else{
            //debugger
            console.log(">>>>>>>>>>> very long string being created in global_log_message <<<<<<<<<<");
          }

        }

        //work out the distance covered by the second last rider
        //get the 2nd last rider (whose time is the one that counts)
        //dksep20: as with game version, need to change this to look at distance rather than team ordering let second_last_rider = race_r.riders_r[race_r.current_order[race_r.current_order.length-2]];

        let riders_to_sort = [];
        for(let i_r = 0;i_r < race_r.riders_r.length; i_r++){
          riders_to_sort[i_r] = {rider: race_r.current_order[i_r],distance_covered: race_r.riders_r[race_r.current_order[i_r]].distance_covered};
        }

        //sort based on distance_covered
        riders_to_sort.sort((a, b) => (a.distance_covered < b.distance_covered) ? 1 : -1);

        //set the second_last_rider using this distance based ordering
        let second_last_rider = race_r.riders_r[riders_to_sort[riders_to_sort.length-2].rider];

        //DK2020 adding an extra check to avoid edge cases where all riders have done > distance but some are still BEHIND the second-to-last rider in the formal ordering.
        //Just get the minimum distance covered from all riders
        let min_distance_travelled = race_r.riders_r[0].distance_covered;
        for (let xi = 1; xi<race_r.riders_r.length;xi++){
          if(race_r.riders_r[xi].distance_covered < min_distance_travelled){
            min_distance_travelled = race_r.riders_r[xi].distance_covered;
          }
        }

        let over_travelled_maximum = 2000; //want to catch any race that seems to be going rogue and not finishing.

        distance_2nd_last_timestep = distance_last_timestep; //recording this to test exact distances being covered, have offByOne error in some cases
        distance_last_timestep = second_last_rider.distance_covered;

        if (second_last_rider.distance_covered > race_r.distance ){
          //all riders ahead of the second_last_rider in the current order must be ahead on the track- otherwise the race goes on... assumming some riders have not finished yet

          let all_riders_ahead = true;



          //dk2020sep15: update to return a more exact finish time adjusted to remove the excess distance travelled over the line in that second
          let extra_distance_covered = second_last_rider.distance_covered - race_r.distance;

          //console.log("** race finish time adjustment *** race_clock " + race_r.race_clock + " second_last_rider.distance_covered " + second_last_rider.distance_covered + " race_r.distance " + race_r.distance + " second_last_rider.velocity " + second_last_rider.velocity);

          finish_time = DecimalPrecision.round(((race_r.race_clock) - (extra_distance_covered/second_last_rider.velocity)),3);

          if (min_distance_travelled > (race_r.distance + over_travelled_maximum)){ //if some rider has yet to finish despite the second-to-last being done
            //weird, shouldn't happen, so log some info
            console.log("###### warning: min_distance_travelled " + min_distance_travelled + " ######");
            console.log("Start order " + JSON.stringify(race_r.start_order));
            console.log("Instructions " + JSON.stringify(race_r.race_instructions_r));

          }
          else{
            for (let x = 0;x<riders_to_sort.length-2;x++ ){ //check that the riders that should be in front of second-to-last ARE
              if(race_r.riders_r[riders_to_sort[x].rider].distance_covered < second_last_rider.distance_covered && race_r.riders_r[riders_to_sort[x].rider].distance_covered <= race_r.distance){
                all_riders_ahead = false;
              }
            }
          }

          if(all_riders_ahead){
            continue_racing = false;
          }
        }

        //only increment the clock if the race goes on
        if(continue_racing){
          race_r.race_clock++;
        }

      }

      //update the generation best time if needs be
      if (finish_time < generation_best_time){
        generation_best_time = finish_time;
      }

      //dk23 choke_under_pressure: reset the rider power (doesn't actually check to see if they failed)
      for(let i = 0;i<race_r.start_order.length;i++){
        let load_rider = riders_r[race_r.start_order[i]];
        load_rider.threshold_power = load_rider.original_threshold_power;
        load_rider.max_power = load_rider.original_max_power;
      }
      //return the final finish time (seconds)


      return {time_taken: finish_time, power_output:rider_power, distance_2nd_last_timestep: distance_2nd_last_timestep, distance_last_timestep:distance_last_timestep, instruction_noise_alterations: race_r.instruction_noise_alterations, performance_failures:race_r.performance_failures, instruction_noise_choke_under_pressure:race_r.instruction_noise_choke_under_pressure,instruction_noise_overeagerness:race_r.instruction_noise_overeagerness};
    }
