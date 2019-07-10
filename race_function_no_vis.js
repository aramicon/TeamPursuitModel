//function to run the race and retuturn a finish TIME

//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data


import {settings} from './global_settings.js';
import {race} from './race_settings.js';
import {riders} from './riders.js';

let newton_lookup = []; //used to store newton() function calculations to avoid tons of needless calls

settings.stats.crossover_instruction_sizes = [];

function run_track_race(){

  //update settings
  let input_teamOrder = $('#starting_order').val().split(",").map(a=>+a);
  if(input_teamOrder.length > 0){
    race.start_order = input_teamOrder;
    //console.log("updated race.start_order " + race.start_order )
  }

  race.drop_instruction = 0;
  race.live_instructions = [];
  race.race_instructions = [];
  race.race_instructions_r = [];

  let instructions_t = [];
  let new_instructions = $('#instructions').val();
  if(new_instructions.length > 5){
    //instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
    instructions_t = JSON.parse(new_instructions);
    console.log(instructions_t);
  }
  console.log(instructions_t);
  if (instructions_t.length > 0){
    race.race_instructions_r = instructions_t;
    console.log(race.race_instructions_r)
  }
  let time_taken = run_race(settings,race,riders);

  console.log(time_taken);
  $("#race_result").text('Finish Time = ' + time_taken);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function mutate_race(r){
  let new_race = {};

  const p_shuffle_start = settings.ga_p_shuffle_start;
  const p_add_instruction = settings.ga_p_add_instruction;
  const p_delete_instruction = settings.ga_p_delete_instruction;
  const p_change_effort = settings.ga_p_change_effort;
  const p_change_drop = settings.ga_p_change_drop;
  const p_move_instruction = settings.ga_p_move_instruction;
  const range_to_move_instruction = settings.ga_range_to_move_instruction;
  const range_to_change_effort = settings.ga_range_to_change_effort;
  let time_taken_old = r.time_taken;

  new_race.start_order = r.start_order;
  new_race.instructions = [];
  new_race.time_taken = 0;

  if(Math.random() < p_shuffle_start){
    shuffleArray(new_race.start_order);
  }

  for(let i = 0;i<time_taken_old;i++){
    if((r.instructions.filter(a => a[0] == i).length == 0)){
      //no instruction here- add a new one?
      if (Math.random() < p_add_instruction){
        new_race.instructions.push(new_random_instruction(i));
      }
    }
    else{
      //there is an instruction here. assume only 1 per timestep
      let current_instruction = [...r.instructions.filter(a => a[0] == i)[0]];
      if(Math.random() > p_delete_instruction){//if deleting, just ignore it
        if((current_instruction[1].indexOf("effort") != -1)){
          if((Math.random() < p_change_effort)){

          let current_effort = parseFloat(current_instruction[1].split("=")[1]);
          let new_effort = Math.floor((current_effort + ((range_to_change_effort*-1) + (Math.random()*(range_to_change_effort*2))))*100)/100;
          if(new_effort < settings.minimum_power_output){
            new_effort = settings.minimum_power_output;
          }
          else if(new_effort > 9){
            new_effort = 9;
          }
          current_instruction[1] = "effort=" + new_effort;
          }
        }
        else if((Math.random() < p_change_drop)){
            current_instruction[1] = "drop=" + (1 + Math.floor(Math.random()*(settings.ga_team_size-1)))
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
            }
        }
        new_race.instructions.push(current_instruction)
      }
    }
  }
  return new_race;
}

function new_random_instruction(timestep){
  let probability_of_effort_instruction = 0.8;
  let new_instruction = [];
  new_instruction[0] = timestep;
  let rand2 = Math.random();
  if(rand2 <= probability_of_effort_instruction){
    //add an effort instruction. but what level?
    let rand_effort = settings.minimum_power_output + (Math.round(Math.random()*(10-settings.minimum_power_output)*100)/100);
    new_instruction[1] = "effort="+rand_effort;
  }else{
    new_instruction[1] = "drop="+(1 + Math.floor(Math.random()*(settings.ga_team_size-1)));
  }
  return new_instruction;
}

function run_track_race_ga(){
  //generate a set of instructions
  $("#race_result").html("");
  update_race_settings();


  const max_timestep = settings.ga_max_timestep;
  const probability_of_instruction_per_timestep_lower = settings.ga_probability_of_instruction_per_timestep_lower;
  const probability_of_instruction_per_timestep_upper =settings.ga_probability_of_instruction_per_timestep_upper;
  const population_size = settings.ga_population_size;
  //warn user if the population_size is not an even square
  if(!Number.isInteger(Math.sqrt(population_size))){
    alert("Warning: ga_population_size of " + population_size + " should be a product of an integer squared, e.g. 9,25,36,3600")
  }
  const team_size = settings.ga_team_size;
  const number_of_generations = settings.ga_number_of_generations;

  let population = [];

  //create a starting population
  for (let p=0;p<population_size;p++){
    //create a random starting order
    let new_race = {};
    let start_order = [];
    let probability_of_instruction_per_timestep = probability_of_instruction_per_timestep_lower + Math.random()*(probability_of_instruction_per_timestep_upper-probability_of_instruction_per_timestep_lower);

    for(let i = 0;i<team_size;i++){
      start_order.push(i);
    }
     shuffleArray(start_order);
    new_race.start_order =start_order;
    let instructions = [];
    //create a set of random instructions
    for(let i=0;i<max_timestep;i++){
      //add a new instruction, maybe
      let rand = Math.random();
      if(rand <= probability_of_instruction_per_timestep){
        //add an insruction, but whaich type?

        instructions.push(new_random_instruction(i));
      }
    }
    new_race.instructions = instructions;
    population.push(new_race);
  }

  let table_text_info = "<table class='results_table'><tr><th>GEN</th><th>RACE</th><th>TIME</th><th>START</th><th>INSTRUCTIONS</th><th>VISUALISE</th></tr>";
  for(let g=0;g<number_of_generations;g++){
    //run each race and track the scores.
    //console.log("Generation " + g + " before racing ");
    //console.log(population);

    for(let i = 0;i<population_size;i++){
      //reset any race properties

      race.drop_instruction = 0;
      race.live_instructions = [];
      race.race_instructions = [];
      race.race_instructions_r = [];

      let load_race_properties = population[i];
      race.race_instructions_r = [...load_race_properties.instructions];
      race.start_order = [...load_race_properties.start_order];
      load_race_properties.time_taken = run_race(settings,race,riders);
      //console.log("race " + i + " time taken " + load_race_properties.time_taken + " instructions " + JSON.stringify(race.race_instructions_r));
    }

    //find the best instructions

    //first, display the best time from this generation
    let final_best_race_properties_index = 0;
    let final_best_race_properties = population[0];

    for(let i = 0; i< population_size;i++){
      if(population[i].time_taken < final_best_race_properties.time_taken){
        final_best_race_properties_index = i;
        final_best_race_properties = population[i];
      }
    }
      //console.log("FASTEST RACE generation  " + g + " was race " + final_best_race_properties_index + " time taken " + final_best_race_properties.time_taken);

    table_text_info += "<tr><td>" + g + "</td><td> " + final_best_race_properties_index + "</td><td>" + final_best_race_properties.time_taken+ " </td><td> [" + final_best_race_properties.start_order + "]</td><td>" + JSON.stringify(final_best_race_properties.instructions) + "</td><td><a  target='_blank' href = 'model3.html?startorder=" + encodeURI(final_best_race_properties.start_order) + "&instructions=" + encodeURI(JSON.stringify(final_best_race_properties.instructions)) + "'> Run </a></td></tr>"


    if(g<(number_of_generations-1)){ //don't create a new population for the last generation
      // find the squre root of the total popualtion, so that a new population can be generated from these
      let parent_population = [];
      let pop_square_root = Math.floor(Math.sqrt(population_size));
      //get the max time to use as an imitial comparison
      let max_time_index = 0;
      let max_time_properties = {};
      let max_time = 0;
      for(let i = 0; i< population_size;i++){
        if(population[i].time_taken > max_time){
          max_time = population[i].time_taken;
          max_time_index = i;
          max_time_properties = population[i];
        }
      }

      for(let i = 0; i< pop_square_root;i++){
        let best_race_properties_index = max_time_index;
        let best_race_properties = max_time_properties;

        for(let i = 0; i< population_size;i++){
          if(population[i].time_taken < best_race_properties.time_taken){
            //if this has NOT already been added use it
            if(parent_population.indexOf(i)==-1){
              best_race_properties_index = i;
              best_race_properties = population[i];
            }
          }
        }
        parent_population.push(best_race_properties_index);
      }

      //make a new population using the best of the last generation
      let new_population = [];
      for(let i = 0;i < parent_population.length;i++){
        for(let k = 0;k < parent_population.length;k++){
          //create a new set of instructions
          //merge two parent instructions sets, choose a starting order, then mutate it
          if(i==k){
            new_population.push(mutate_race(population[parent_population[i]]));
          }
          else{
            if (Math.random() < settings.ga_p_crossover){
              let new_race_details = crossover(population[parent_population[i]],population[parent_population[k]]);
              new_population.push(mutate_race(new_race_details));
            }
            else{
              new_population.push(mutate_race(population[parent_population[i]]));
            }


          }

        }
      }
      population = new_population;
    //  console.log("Generation " + g + " after mutations ");
    //  console.log(population);

    }
  }
  //draw results
  d3.select("#current_activity").html('class', "fas fa-cog fa-2x ");
  table_text_info += "</table>";
  $("#race_result").html(table_text_info);


  if(settings.stats.crossover_instruction_sizes.length > 0){
    let stats_text = "settings.stats.crossover_instruction_sizes " + settings.stats.crossover_instruction_sizes.length + " " + settings.stats.crossover_instruction_sizes.reduce((a, b) => parseInt(a) + parseInt(b))/settings.stats.crossover_instruction_sizes.length + " " + JSON.stringify(settings.stats.crossover_instruction_sizes);
    $("#race_result_stats").html(stats_text);

  }


}

function crossover(parent1,parent2){
  let new_race_details = {};
  new_race_details.start_order = parent1.start_order;
  if(Math.random() > 0.5){
    new_race_details.start_order = parent2.start_order;
  }
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

      let random_array_ordered_and_halved = random_array.slice(0,Math.round(total_size_of_arrays/2)).sort((a,b)=>a-b);
      //settings.stats.crossover_instruction_sizes.push(random_array_ordered_and_halved.length);
      //console.log("random_array_ordered_and_halved " + random_array_ordered_and_halved);

      let new_instructions_reduced = [];
      for(let i =0;i<random_array_ordered_and_halved.length;i++){
        new_instructions_reduced.push(new_instructions[random_array_ordered_and_halved[i]])
      }
      //console.log("new_instructions_reduced " +JSON.stringify(new_instructions_reduced));
      new_instructions = new_instructions_reduced;
    }

  }
  new_race_details.instructions = new_instructions;
  //set the time taken or the mutation resets the whole thing tp []
  if(new_race_details.instructions.length > 0){
      new_race_details.time_taken = parseInt(new_race_details.instructions[new_race_details.instructions.length-1][0]) + 10 //10 is arbitrary;
  }
  else{
    new_race_details.time_taken = settings.ga_max_timestep;
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


function setEffort(settings_r, race_r,riders_r, effort){ //actually update the effort level
  let leadingRider = race_r.riders_r[race_r.current_order[0]];
  leadingRider.output_level = effort;
  //console.log("Effort updated to " + effort);
}

function switchLead(settings_r, race_r,riders_r, positions_to_drop_back){
  if (positions_to_drop_back >= (race_r.current_order.length-1)){
    positions_to_drop_back = (race_r.current_order.length-1);
  }

  let current_leader = race_r.current_order[0];
  race_r.riders_r[current_leader].current_aim = "drop"; //separate status whilst dropping back
  let current_leader_power = race_r.riders_r[current_leader].power_out; //try to get the new leader to match this velocity

  let new_order = race_r.current_order.slice(1,positions_to_drop_back+1);
  new_order.push(race_r.current_order[0]);
  new_order.push(...race_r.current_order.slice(positions_to_drop_back+1,race_r.current_order.length));

  race_r.current_order = new_order;
  //change other rider roles to lead and follow
  let new_leader = race_r.riders_r[new_order[0]];

  new_leader.current_aim = "lead";
  new_leader.current_power_effort = 5;

  //update this rider's power Effort
  new_leader.current_power_effort = current_leader_power;
  let current_threshold = new_leader.threshold_power;

  if (current_leader_power < current_threshold){
    new_leader.output_level = (current_leader_power/current_threshold)*10;
    //console.log("new_leader.output_level = "+ new_leader.output_level);
  }
  else if(current_leader_power == current_threshold){
    new_leader.current_power_effort = 5;
  }
  else{ //power is over threshold
    if (current_leader_power >= new_leader.max_power ){
      new_leader.output_level = 9;
    }
    else{
        new_leader.output_level = (current_leader_power/new_leader.max_power)*10;
    }

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

  // Set up the switch range points: this is where riders can start to drop back
  // I added settings_r.switch_prebend_start_addition to allow the swithc to start before the bend proper (speed up switches)
  race_r.bend1_switch_start_distance = settings_r.track_straight_length/2 - settings_r.switch_prebend_start_addition;
  race_r.bend1_switch_end_distance = race_r.bend1_switch_start_distance + settings_r.race_bend_distance*(settings_r.bend_switch_range_angle/180) ;
  race_r.bend2_switch_start_distance = (settings_r.track_straight_length*1.5) + settings_r.race_bend_distance - settings_r.switch_prebend_start_addition; //start of second bend
  race_r.bend2_switch_end_distance = race_r.bend2_switch_start_distance + settings_r.race_bend_distance*(settings_r.bend_switch_range_angle/180) ;

  //console.log("race_r.start_order.length "+race_r.start_order.length)

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
    load_rider.output_level=6;
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
  while(continue_racing){
    //update the race clock, check for instructions, then move the riders based on the current order

    //add any new instructions if found
    let new_instructions = race.race_instructions_r.filter(a=>parseInt(a[0]) == race_r.race_clock);
    if(new_instructions.length > 0){
      for(let i=0;i<new_instructions.length;i++){
        let inst = new_instructions[i][1].split("=");
        if (inst.length=2){
          if(inst[0]=="effort"){
            race.live_instructions.push(["effort",parseFloat(inst[1])]);
          }
          else if(inst[0]=="drop"){
            race.drop_instruction = parseInt(inst[1]);
          }
        }
      }
    }

    //carry out any live_instructions (they are queued)
    while (race_r.live_instructions.length > 0){
      let instruction = race_r.live_instructions.pop();
      if(instruction[0]=="effort"){
        setEffort(settings_r, race_r,riders_r, instruction[1]);
      }
    }

    //also look at the drop instruciton: this can only be done at the beginnings of bends where the track is banked
    if(race_r.drop_instruction > 0){
      if (race_r.riders_r.filter(a=>a.current_aim == "drop").length == 0){   //if no  rider is dropping back
        let lead_rider_distance_on_lap = race_r.riders_r[race_r.current_order[0]].distance_covered % settings_r.track_length;
        if ((lead_rider_distance_on_lap > race_r.bend1_switch_start_distance && lead_rider_distance_on_lap < race_r.bend1_switch_end_distance) || (lead_rider_distance_on_lap > race_r.bend2_switch_start_distance && lead_rider_distance_on_lap < race_r.bend2_switch_end_distance)){
          switchLead(settings_r, race_r,riders_r, race_r.drop_instruction);
          race_r.drop_instruction = 0;
        }
      }
    }

    for(let i=0;i<race_r.current_order.length;i++){
      let race_rider = race_r.riders_r[race_r.current_order[i]];
      //work out how far the race_rider can go in this time step
      //work out basic drag from current volocity = CdA*p*((velocity**2)/2)

      let accumulated_effect = 1; // for accumulated fatigue effect on rider. 1 means no effect, 0 means total effect, so no more non-sustainable effort is possible
      race_rider.aero_A2 = Math.round((0.5 * settings.frontalArea * race_rider.aero_density)*10000)/10000;   // full air resistance parameter

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
          race_rider.output_level = 5;
        }
        //set the power level based on the effort instruction

        if (race_rider.output_level < 6){
          race_rider.current_power_effort = race_rider.threshold_power*(race_rider.output_level)/10;
          //recover if going under the threshold
          if (race_rider.endurance_fatigue_level > 0){
            race_rider.endurance_fatigue_level -= race_rider.recovery_rate*( (race_rider.threshold_power- race_rider.current_power_effort)/race_rider.threshold_power)
            if (  race_rider.endurance_fatigue_level < 0){ race_rider.endurance_fatigue_level = 0;}; //just in case it goes below zero
          }
        }
        else if(race_rider.output_level == 6){
          race_rider.current_power_effort = race_rider.threshold_power;
        }
        else{
          race_rider.current_power_effort = race_rider.max_power*(race_rider.output_level)/10;
          //add fatigue if going harder than the threshold
          let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.current_power_effort- race_rider.threshold_power)/race_rider.max_power),settings_r.fatigue_power_rate);
          race_rider.endurance_fatigue_level += fatigue_rise;
          race_rider.accumulated_fatigue += fatigue_rise;
        }

        let target_power = race_rider.current_power_effort; //try to get to this
        //work out the velocity from the power

        let powerv = race_rider.power_out, power_adjustment = 0;
        //compare power required to previous power and look at how it can increase or decrease
        if (powerv > target_power){ //slowing down
          if((powerv - target_power) > settings_r.power_adjustment_step_size_down){
            power_adjustment = settings_r.power_adjustment_step_size_down;
          }
          else{
            power_adjustment = (powerv - target_power);
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
        powerv+=power_adjustment;

        //round power output to 2 decimal places
        powerv = Math.round((powerv)*100)/100;

        //check the lookup table
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
        race_rider.power_out = powerv;
      }
      else{
        //rider may be following or dropping back. Either way they will be basing velocity on that of another rider- normally just following the rider in front of you

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
        let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset- settings_r.target_rider_gap) -  (race_rider.distance_covered-race_rider.start_offset);
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

        let level_of_shelter = 1;//maximum shelte
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
        race_rider.aero_A2 = Math.round((race_rider.aero_A2 - race_rider.aero_A2*(shelter_effect_strength*level_of_shelter))*100)/100;
        let A2Eff = (tv > 0.0) ? race_rider.aero_A2 : -race_rider.aero_A2; // wind in face, must reverse effect
        let target_power = (target_velocity * race_rider.aero_tres + target_velocity * tv * tv * A2Eff) / settings_r.transv;

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
          current_max_power = (race_rider.threshold_power*(5/10));
        }
        //can't go over the max power
        if (target_power > current_max_power){
          target_power = current_max_power; //can't go over this (for now)
        }
        //fatigue if over the threshold, recover if under
        if (target_power < race_rider.threshold_power ){
          //recover if going under the threshold
          if (race_rider.endurance_fatigue_level > 0){
            race_rider.endurance_fatigue_level -= race_rider.recovery_rate*( (race_rider.threshold_power- target_power)/race_rider.threshold_power)
            if ( race_rider.endurance_fatigue_level < 0){ race_rider.endurance_fatigue_level = 0;};
          }
        }
        else{
          //add fatigue if going harder than the threshold
          let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (target_power- race_rider.threshold_power)/race_rider.max_power),settings_r.fatigue_power_rate);
          race_rider.endurance_fatigue_level += fatigue_rise
          race_rider.accumulated_fatigue += fatigue_rise;
        }

        //BUT, can this power be achieved? we may have to accelerate, or decelerate, or it might be impossible
        let powerv = race_rider.power_out, power_adjustment = 0;

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

        //if you are dropping back and get back to the rider in front, go back to a follow state
        if(race_rider.current_aim =="drop"){ //once you are behind the rider_to_follow, you 'follow' again
           if((race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= (rider_to_follow.distance_covered-rider_to_follow.start_offset)){ //idea is that you are dropping back so long as you are goign slower than the rider you want to follow
            race_rider.current_aim = "follow";
          }
        }
        race_rider.power_out = powerv;
      }

      race_rider.distance_covered+=race_rider.velocity;
    }
    // After all riders have moved

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

      if(settings.ga_log_each_step){
        logMessage += " " + race.race_clock + " | " + display_rider.name + " " + display_rider.current_aim.toUpperCase() +  ((i==race.current_order.length-2)?' |F|':'') + " | " + Math.round(display_rider.distance_covered * 100)/100 + "m | "+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph | "+ Math.round(display_rider.power_out * 100)/100 + " / "  + display_rider.threshold_power + " / " + display_rider.max_power + " watts | "+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m | " + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) + " |||| ";
      }
    }
      if(settings.ga_log_each_step){console.log(logMessage);}

    race_r.race_clock++;
    //work out the distance covered of the second last rider
    //get the 2nd last rider (whose time is the one that counts)
    let second_last_rider = race_r.riders_r[race_r.current_order[race_r.current_order.length-2]];
    if (second_last_rider.distance_covered > race_r.distance ){
      //all riders ahead of the second_last_rider in the current order must be ahead on the track- otherwise the race goes on...
      let all_riders_ahead = true;
      for (let x = 0;x<race_r.current_order.length-2;x++ ){
        if(race_r.riders_r[race_r.current_order[x]].distance_covered < second_last_rider.distance_covered){
          all_riders_ahead = false;
        }
      }
      if(all_riders_ahead){
        continue_racing = false;
      }
    }

  }
  //return the final finish time (seconds)
  return race_r.race_clock;
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
    console.log("updated settings.frontalArea to " + settings.frontalArea )
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

$(document).ready(function() {
  //attach events
  $("#button_play_race").on("click", run_track_race);
  $("#button_evolve_instructions").on("click", run_track_race_ga);


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
  $('#ga_range_to_move_instruction').val(settings.ga_range_to_move_instruction);
  $('#ga_range_to_change_effort').val(settings.ga_range_to_change_effort);
  $('#ga_log_each_step').val(settings.ga_log_each_step);

}
);
