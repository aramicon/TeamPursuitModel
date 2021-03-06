//function to run the race and retuturn a finish TIME

//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data
let global_settings_tracker = "";
let global_race_tracker = "";
let global_riders_tracker = "";
let global_log_message = "";
let global_log_message_final = "";
let global_log_message_now = true;

let use_lookup_velocity = false;

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
    for (let i = array.length - 1; i >= 0; i--) { //changed i > 0 to i >= 0 cos i figured item at 0 will be less likely to be swapped?
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function mapEffortToPower(threshold_effort_level, rider_effort, rider_threshold, rider_max ){
  let power_from_effort = 0;

  if (rider_effort < threshold_effort_level){
    power_from_effort = rider_threshold*(rider_effort)/threshold_effort_level;
  }
  else if(rider_effort == threshold_effort_level){
    power_from_effort = rider_threshold;
  }
  else{
    power_from_effort = rider_threshold + (rider_max - rider_threshold) *((rider_effort-threshold_effort_level)/(9-threshold_effort_level));
  }
  //console.log("mapped effort " + rider_effort + " to power " + power_from_effort);
  return power_from_effort;
}
function mapPowerToEffort(threshold_effort_level, rider_power, rider_threshold, rider_max ){
  let effort_level = 0;
  if (rider_power < rider_threshold){
    effort_level = ((rider_power*threshold_effort_level)/rider_threshold);

  }
  else if(rider_power == rider_threshold){
    effort_level = threshold_effort_level;
  }
  else{ //power is over threshold
    if (rider_power >= rider_max ){
      effort_level = 9;
    }
    else{
      //reverse how power is worked out when over the threshold
      effort_level = ((rider_power - rider_threshold )*(9-threshold_effort_level))/(rider_max - rider_threshold) + threshold_effort_level;
    }
  }
  //console.log("mapped power " + rider_power + " to effort " + effort_level);
  return effort_level;
}

// performance failure functoions
function calculate_rider_performance_failure_probability(effort, effort_max, current_fatigue,current_fatigue_max, accumulated_fatigue,accumulated_fatigue_max, rider_performance_failure_rate,rider_performance_failure_rate_max, performance_failure_probability_exponent,performance_failure_effort_importance_multiplier){

  //work out a percentage that this rider is going to fail right now
    let rider_performance_failure_probability = ((((Math.pow(effort,performance_failure_probability_exponent)/Math.pow(effort_max,performance_failure_probability_exponent))*performance_failure_effort_importance_multiplier + (Math.pow(current_fatigue,performance_failure_probability_exponent)/Math.pow(current_fatigue_max,performance_failure_probability_exponent)) + (Math.pow(accumulated_fatigue,performance_failure_probability_exponent)/Math.pow(accumulated_fatigue_max,performance_failure_probability_exponent)))/(3+(performance_failure_effort_importance_multiplier-1)))*(rider_performance_failure_rate/rider_performance_failure_rate_max));
  // console.log("will this rider fail? probability calced to be " + rider_performance_failure_probability);
  return DecimalPrecision.round(rider_performance_failure_probability,4);
}

function calculate_rider_performance_failure_percentage_amount(effort, effort_max, current_fatigue, current_fatigue_max, accumulated_fatigue, accumulated_fatigue_max, rider_performance_failure_multiplier,rider_performance_failure_multiplier_max,  performance_failure_base_max_percentage,performance_failure_amount_exponent,performance_failure_effort_importance_multiplier ){

    //how much will the rider fail by?

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

    return DecimalPrecision.round(rider_performance_failure__percentage_amount,4);
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

  for(let i = 0;i<time_taken_old;i++){
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
            else if(new_effort > 9){
              new_effort = 9;
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
            if(new_location > time_taken_old){
              new_location = time_taken_old;
            }
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

  //now set up a population of mutants
  for(i=0;i<settings_r.robustness_check_population_size;i++){
    population.push(mutate_race(race_r,settings_r,1001));
  }

  let one_fifth = Math.floor(settings_r.robustness_check_population_size/5);
  let one_fifth_count = 0;

  //now run each race and store results
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

    //update best and worst if needs be
    if (load_race_properties.time_taken > unfittest_mutant_time_taken){
      unfittest_mutant_time_taken = load_race_properties.time_taken;
    }
    if (load_race_properties.time_taken < fittest_mutant_time_taken){
      fittest_mutant_time_taken = load_race_properties.time_taken;
    }

    if (i % one_fifth == 0){
      console.log(one_fifth_count*25 + "% done");
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
  robustness_result.message = "Robustness Check:  Original race time taken " + original_time_taken + ". Average time of " + population.length + " mutants = " + mutantMean + " std. Dev. " + mutantStdDev;

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


  let segment_size = 10; //just to log % of gens done
  let one_segment = Math.floor(number_of_generations/segment_size);
  let one_segment_count = 0;

  let race_tracker = {}; //store ids of every race run to try find cases where the times differ

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

    //print % progress every segment
    if (g % one_segment == 0){
      console.log(one_segment_count*(100/segment_size) + "% done");
      one_segment_count++;
    }


    for(let i = 0;i<population.length;i++){
      //reset any race properties

      race_r.drop_instruction = 0;
      race_r.live_instructions = [];
      race_r.race_instructions = [];
      race_r.race_instructions_r = [];

      let load_race_properties = population[i];
      race_r.race_instructions_r = [...load_race_properties.instructions];
      race_r.start_order = [...load_race_properties.start_order];

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

      let race_results = run_race(settings_r,race_r,riders_r);

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


      load_race_properties.time_taken = race_results.time_taken;
      stats_total_time += load_race_properties.time_taken;
      stats_total_number_of_instructions += load_race_properties.instructions.length;
      race_fitness_all.push(race_results.time_taken); //add all times to an arroar to be able to analyse laterz

      //update best race if a new best is found
        //console.log("race run, id " + population[i].variant_id + "_" + population[i].id_generation + "_" + population[i].id_type + "_" + population[i].id_mutant_counter + " " +population[i].time_taken + " seconds | start_order " +  population[i].start_order);

      if(population[i].time_taken < final_best_race_properties.time_taken){
        final_best_race_properties_index = i;
        final_best_race_properties = population[i];
        best_race_rider_power = race_results.power_output;
        best_race_distance_2nd_last_timestep = race_results.distance_2nd_last_timestep;
        best_race_distance_last_timestep = race_results.distance_last_timestep;

        best_race_instruction_noise_alterations = race_results.instruction_noise_alterations;
        best_race_performance_failures = race_results.performance_failures;

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
      }


      //console.log("race " + i + " time taken " + load_race_properties.time_taken + " instructions " + JSON.stringify(race_r.race_instructions_r));
    }

    if (global_log_message && g == (number_of_generations-1) ){
      console.log("***BEST RACE GENERATION " + g + " LOG START***");
      console.log(global_log_message_final);
    }

    stats_average_time = stats_total_time/population.length;
    stats_average_number_of_instructions = stats_total_number_of_instructions/population.length;

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

    console.log("final_worst_race_start_order" + JSON.stringify(final_worst_race_properties.start_order));
    console.log("final_worst_race_instructions" + JSON.stringify(final_worst_race_properties.instructions));
    console.log("worst_race_time" + JSON.stringify(final_worst_race_properties.time_taken));

    generation_results.worst_race_instruction_noise_alterations = worst_race_instruction_noise_alterations;

    generation_results.stats_average_time = stats_average_time;
    generation_results.stats_average_number_of_instructions = stats_average_number_of_instructions;
    generation_results.robustness_check_number_of_mutants = 0;
    generation_results.robustness_check_average_mutant_time_taken = 0;
    generation_results.robustness_check_best_mutant_time_taken = 0;
    generation_results.robustness_check_worst_mutant_time_taken = 0;
    generation_results.robustness_check_standard_dev = 0;
    generation_results.race_fitness_all = race_fitness_all;


    //get the power data of the best race
    generation_results.best_race_rider_power = best_race_rider_power;
    //get distances covered for last and 2nd last timesteps
    generation_results.best_race_distance_2nd_last_timestep = best_race_distance_2nd_last_timestep;
    //console.log(g + " generation_results.best_race_distance_2nd_last_timestep " + generation_results.best_race_distance_2nd_last_timestep)
    generation_results.best_race_distance_last_timestep = best_race_distance_last_timestep;

    generation_results.best_race_instruction_noise_alterations = best_race_instruction_noise_alterations;

    generation_results.best_race_performance_failures = best_race_performance_failures;
    generation_results.worst_race_performance_failures = worst_race_performance_failures;

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

      console.log("Run robustness check generation " + g + robustness_check_results.message);
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
    //make group_size copies of the winner and put them in the new population

    for(let k = 0;k<group_size;k++){
      let new_race = {};
      if((i+k) == best_time_index){
        //add self without mutations at all
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
      else{ //otherwise add a mutant Or a crossover child of the gorup winner

        new_race = current_population[best_time_index];
        //dk2020: add crossover effect
        if (Math.random() < settings_r.ga_p_crossover){
          //console.log("Generating CROSSOVER strategy");
          new_race = crossover(new_race,current_population[(i+k)],settings_r,generation,i+k);
          //also mutate if the mutate_crossover is set (again, probabilitsic)
          if (typeof(settings_r.crossover_apply_mutation_probability) != "undefined"){
            if (Math.random() < settings_r.crossover_apply_mutation_probability){
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
          new_race = mutate_race(new_race,settings_r,generation);
          stats.number_of_mutants_added_total++;
          settings_r.mutant_counter++; //dk2020 this may be doing something just like the line above :-(
        }
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
        new_race = mutate_race(new_race,settings_r,generation);
        number_of_direct_copies++;
      }
      else{
        if (Math.random() < settings_r.ga_p_crossover){
          new_race = crossover(current_population[parent_population[i]],current_population[parent_population[k]],settings_r,generation,i+k);
          if (typeof(settings_r.crossover_apply_mutation_probability) != "undefined"){
            if (Math.random() < settings_r.crossover_apply_mutation_probability){
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
  //set the time taken or the mutation resets the whole thing tp []
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
  let aero_A2_no_shelter = Math.round((0.5 * settings_r.frontalArea * new_leader.aero_density)*10000)/10000;
  //now work out the power needed for this new leader using that target velocity
  let target_power = power_from_velocity(aero_A2_no_shelter, settings_r.headwindv, new_leader.aero_tres, settings_r.transv, current_leader_velocity);
  //now work out the output level that will transalte to that power (which can take some time to reach)
  new_leader.output_level = mapPowerToEffort(settings_r.threshold_power_effort_level, target_power, new_leader.threshold_power, new_leader.max_power)


  if (new_leader.output_level < 0){
    console.log("new_leader.output_level < 0");
    debugger;
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

  //dk2020 oct. adding new array to store noise/failure alterations. will make this an object/dict for easy retrieval.
  race_r.instruction_noise_alterations = {};
  race_r.performance_failures = {};
  race_r.instruction_noise_delays = {};

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

    //dk2021 new rider property to add info to the log message
    load_rider.step_info = "";

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
    race_r.riders_r[i].aero_density = (1.293 - 0.00426 * settings_r.temperaturev) * Math.exp(-settings_r.elevationv / 7000.0);
    race_r.riders_r[i].aero_twt = Math.round((9.8 * (race_r.riders_r[i].weight + settings_r.bike_weight)*10))/10;  // total weight of rider + bike in newtons, rouded to 1 decimal place
    race_r.riders_r[i].aero_A2 = Math.round((0.5 * settings_r.frontalArea * race_r.riders_r[i].aero_density)*100)/100;   // full air resistance parameter
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
              //  console.log("NOISE 1: DELAY instruction NOW " + JSON.stringify(race_r.race_instructions_r[index_of_instruction]));
                //record the alteration instruction so that it can be played back later if needed
                race_r.instruction_noise_alterations[race_r.race_clock] = noise_alteration;

                  //console.log("NOISE 1: DELAY instruction " + JSON.stringify(new_instructions[i]) + " to " + JSON.stringify(noise_alteration) + " actual_timestep " + actual_timestep);
              }
            }

          else
          { // only add an instruciton that is not delayed
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
                    else if(effort_value > 9){
                      effort_value = 9;
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
        else if(instruction[1] > 9){
          instruction[1] = 9;
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
      race_rider.aero_A2 = Math.round((0.5 * settings_r.frontalArea * race_rider.aero_density)*10000)/10000;   // full air resistance parameter

        race_rider.step_info = ""; //dk2021 used to add logging info

      if (race_rider.current_aim =="lead"){
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
        //set the power level based on the effort instruction

        race_rider.current_power_effort = mapEffortToPower(settings_r.threshold_power_effort_level, race_rider.output_level, race_rider.threshold_power, race_rider.max_power );

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
              let performance_failure_percentage = calculate_rider_performance_failure_percentage_amount(race_rider.output_level, settings_r.maximum_effort_value,  race_rider.endurance_fatigue_level,settings_r.fatigue_failure_level,  race_rider.accumulated_fatigue, settings_r.accumulated_fatigue_maximum, race_rider.performance_failure_multiplier, settings_r.performance_failure_multiplier_max,  settings_r.performance_failure_base_max_percentage, settings_r.performance_failure_amount_exponent, settings_r.performance_failure_effort_importance_multiplier);
              //add an entry to performance_failures
              let timestep_rider = race_r.race_clock + "_" + race_r.current_order[i];
              race_r.performance_failures[timestep_rider] = performance_failure_percentage;

              //console.log("RIDER FAILURE (prob " + performance_failure_probability + ")" + performance_failure_percentage + " of target_power: updated from " + target_power + " to " + (target_power - (target_power*performance_failure_percentage)));

              target_power = target_power - (target_power*performance_failure_percentage);

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
        powerv = Math.round((powerv)*100)/100;

        //check the lookup table
        if (use_lookup_velocity)
        {
          let lookup_velocity = -1;
          if (newton_lookup[parseInt(race_rider.aero_twt*10)]){
            if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)]){
              lookup_velocity = newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)];
            }
          }
          if ( lookup_velocity === undefined || lookup_velocity === -1){
            //does not exist in the lookup so call the function and save it
            race_rider.velocity = newton(race_rider.aero_A2, settings_r.headwindv, race_rider.aero_tres, settings_r.transv, powerv);

            if(newton_lookup[parseInt(race_rider.aero_twt*10)]){
              if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)]){
                newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)] = race_rider.velocity;
              }
              else{
                newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)] = [];
                newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)] = race_rider.velocity;
              }
            }
            else{
              //add new array for total weight and A2 values
              newton_lookup[parseInt(race_rider.aero_twt*10)] = [];
              newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)] = [];
              newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)] = race_rider.velocity;
            }
          }
          else{
            race_rider.velocity = lookup_velocity;
          }
        }
        else {
          //use_lookup_velocity is turned off, so always call the newton function (slower)
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
        //work out the power needed for this velocity- remember we are drafting

        //if your velocity is very high and you are approaching the target rider you will speed past, so if within a certain distance and traveling quickly set your target speed to be that of the target rider or very close to it.
        if((race_rider.velocity - rider_to_follow.velocity > settings_r.velocity_difference_limit) &&  (distance_to_cover < settings_r.damping_visibility_distance)){
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
          //between 0 and three metres need to drop off - try a linear model
          level_of_shelter = (1-(level_of_shelter/settings_r.shelter_max_distance));
        }
        else if (race_rider.distance_from_rider_in_front == -1){
          //if you have no rider in front of you this distance is set to -1, so you have no shelter
          level_of_shelter = 0;
        }
        race_rider.aero_A2 = Math.round((race_rider.aero_A2 - race_rider.aero_A2*(shelter_effect_strength*level_of_shelter))*10000)/10000;
        let A2Eff = (tv > 0.0) ? race_rider.aero_A2 : -race_rider.aero_A2; // wind in face, must reverse effect
        let target_power = (target_velocity * race_rider.aero_tres + target_velocity * tv * tv * A2Eff) / settings_r.transv;

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
              let performance_failure_percentage = calculate_rider_performance_failure_percentage_amount(race_rider.output_level, settings_r.maximum_effort_value,  race_rider.endurance_fatigue_level,settings_r.fatigue_failure_level,  race_rider.accumulated_fatigue, settings_r.accumulated_fatigue_maximum, race_rider.performance_failure_multiplier, settings_r.performance_failure_multiplier_max,  settings_r.performance_failure_base_max_percentage, settings_r.performance_failure_amount_exponent, settings_r.performance_failure_effort_importance_multiplier);
              //add an entry to performance_failures
              let timestep_rider = race_r.race_clock + "_" + race_r.current_order[i];
              race_r.performance_failures[timestep_rider] = performance_failure_percentage;

              //console.log("RIDER FAILURE (prob " + performance_failure_probability + ")" + performance_failure_percentage + " of target_power: updated from " + target_power + " to " + (target_power - (target_power*performance_failure_percentage)));

             target_power = target_power - (target_power*performance_failure_percentage);

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
        powerv = Math.round((powerv)*100)/100;

        if(use_lookup_velocity){
          let lookup_velocity = -1;
          if (newton_lookup[parseInt(race_rider.aero_twt*10)]){
            if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)]){
              lookup_velocity = newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)];
            }
          }
          if ( lookup_velocity === undefined || lookup_velocity === -1){
            //does not exist in the lookup so call the function and save it
            race_rider.velocity = newton(race_rider.aero_A2, settings_r.headwindv, race_rider.aero_tres, settings_r.transv, powerv);
            if(newton_lookup[parseInt(race_rider.aero_twt*10)]){
              if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)]){
                newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)] = race_rider.velocity;
              }
              else{
                newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)] = [];
                newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)] = race_rider.velocity;
              }
            }
            else{
              //add new array for total weight and A2 values
              newton_lookup[parseInt(race_rider.aero_twt*10)] = [];
              newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)] = [];
              newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*100)][parseInt(powerv*100)] = race_rider.velocity;
            }
          }
          else{
            race_rider.velocity = lookup_velocity;
          }
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

      if(global_log_message_now || (settings_r.ga_log_each_step && settings_r.run_type == "single_race")){
        logMessage += " " + race_r.race_clock + " | " + display_rider.name + " " + display_rider.current_aim.toUpperCase() +  ((i==race_r.current_order.length-2)?' |F|':'') + " | " + Math.round(display_rider.distance_covered * 100)/100 + "m | "+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph | "+ Math.round(display_rider.power_out * 100)/100 + " / "  + display_rider.threshold_power + " / " + display_rider.max_power + " watts | "+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m | " + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) + " |||| " + display_rider.step_info;
      }
    }
      if(settings_r.ga_log_each_step && settings_r.run_type == "single_race"){
        console.log(logMessage);
      }
      else if (global_log_message_now){
        global_log_message += logMessage;
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
  //return the final finish time (seconds)

  return {time_taken: finish_time, power_output:rider_power, distance_2nd_last_timestep: distance_2nd_last_timestep, distance_last_timestep:distance_last_timestep, instruction_noise_alterations: race_r.instruction_noise_alterations, performance_failures:race_r.performance_failures};
}
