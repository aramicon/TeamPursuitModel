
//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data

import {settings_template} from './global_settings_template.js';
import {race_template} from './race_settings_template.js';
import {riders_template} from './riders_template.js';

let settings = settings_template;
let race = race_template;
let riders = riders_template;
let selected_settings_id = 0; // unused?
let selected_results_id = 0; // unused?

let newton_lookup = []; //used to store newton() function calculations to avoid tons of needless calls

let c = {};
let ctx = {};
let race_state = 'stop';

let step_speed = 120;

let rider_power_data = []; //record power outpur of each rider to generate graph


console.log("Track bend radius = 22m");
console.log("Track straight ((250-(2*Math.PI*22))/2) = " + (250-(2*Math.PI*22))/2 );

var range = $('.input-range');
range.val(10-(step_speed/60));

range.on('input', function(){
    step_speed =(10 - this.value) * 60;
    console.log("step_speed "+ step_speed);
});



function dddd(){
  console.log("hi");
}



function addRiderDisplay(){
  $("#riders_info" ).empty();
  $("#riders_info" ).append("<div id='rider_values_header' class='info_row'><div class='info_column'>Rider <i class='fas fa-biking'></i></div><div class='info_column'>Dist. m</div><div class='info_column'>Vel. kph</div><div class='info_column'>Watts</div><div class='info_column'>Gap m</div><div class='info_column'>Fatigue</div></div>");
  for(let i=0;i<race.riders.length;i++){
    $("#riders_info" ).append("<div id='rider_values_"+i+"' class='info_row'></div>" );
  }
}

function resetRace(){ //reset the race; can be triggered by hitting the STOP button
  console.log("RESETTING RACE")
  load_race()
}

function newton(aero, hw, tr, tran, p) {        /* Newton's method, original is from bikecalculator.com */
  //from http://www.bikecalculator.com/
		let vel = 20;       // Initial guess
		let MAX = 10;       // maximum iterations
		let TOL = 0.05;     // tolerance
		for(let i_n=1; i_n < MAX; i_n++) {
			let tv = vel + hw;
			let aeroEff = (tv > 0.0) ? aero : -aero; // wind in face, so reverse effect
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

function setEffortInstruction(){
  //add instruction to change the effort of the leading rider
  let effort = parseInt(event.target.id.replace("set_effort_",""));
  race.live_instructions.push(["effort",effort]);
}

function setEffort(effort){ //actually update the effort level
  let leadingRider = race.riders[race.current_order[0]];
  leadingRider.output_level = effort;
  $('#instruction_info').text("Change effort to " + effort);
  console.log("Effort updated to " + effort);
  $("#race_info").html("<strong>Effort Updated</strong>: "+  effort);
}

function switchLeadInstruction(){
  //add an instruction to change the lead
  let positions_to_drop_back = parseInt(event.target.id.replace("switch_lead_",""));
  race.drop_instruction = positions_to_drop_back;

}

function switchLead(positions_to_drop_back){
  if (positions_to_drop_back >= (race.current_order.length-1)){
    positions_to_drop_back = (race.current_order.length-1);
  }

    $("#race_info").html("<strong>Leader Drops Back</strong> by "+  positions_to_drop_back + " places");

  let current_leader = race.current_order[0];
  race.riders[current_leader].current_aim = "drop"; //separate status whilst dropping back
  let current_leader_power = race.riders[current_leader].power_out; //try to get the new leader to match this power
  let current_leader_velocity = race.riders[current_leader].velocity;

  let new_order = race.current_order.slice(1,positions_to_drop_back+1);
  new_order.push(race.current_order[0]);
  new_order.push(...race.current_order.slice(positions_to_drop_back+1,race.current_order.length));

  race.current_order = new_order;
  //change other rider roles to lead and follow
  let new_leader = race.riders[new_order[0]];

  new_leader.current_aim = "lead";
  new_leader.current_power_effort = settings.threshold_power_effort_level;

  //update this rider's power Effort
  new_leader.current_power_effort = current_leader_power;
  let current_threshold = new_leader.threshold_power;

  //originally we tried to set the new leader's effort to match the POWER of the former leader... BUT we really should be working it out based on the VELOCITY, i.e. that unless another instruciton is given, the rider will try to go at the same speed.

  //console.log("************ WORK OUT POWER REQUIRED TO MAINTAIN SPEED AFTER SWITCH **********");
  //console.log("Target Velocity = " + current_leader_velocity + " (" + current_leader_velocity*3.6 + ") new_leader.aero_A2 " + new_leader.aero_A2 + " settings.headwindv " + settings.headwindv + " new_leader.aero_tres " + new_leader.aero_tres + " settings.transv " + settings.transv);

  // should aim for power to produce the target speed WITHOUT SHELTER so need to make sure the correct aero_A2 value is used
  let aero_A2_no_shelter = Math.round((0.5 * settings.frontalArea * new_leader.aero_density)*10000)/10000;

  let target_power = power_from_velocity(aero_A2_no_shelter, settings.headwindv, new_leader.aero_tres, settings.transv, current_leader_velocity);
  //console.log("power_from_velocity returns " + target_power + " watts");

  //now figure out what effort level will equate to this power, and aim for that
  new_leader.output_level = mapPowerToEffort(settings.threshold_power_effort_level, target_power, new_leader.threshold_power, new_leader.max_power);
  //console.log("Maps to output_level " + new_leader.output_level);

  //test: map this output level back to power and see what velocity it produces
  //let power_from_effort = mapEffortToPower(settings.threshold_power_effort_level, new_leader.output_level, new_leader.threshold_power, new_leader.max_power );
  //console.log("power_from_effort " + power_from_effort);

  //let velocity_from_power = newton(aero_A2_no_shelter, settings.headwindv, new_leader.aero_tres, settings.transv, power_from_effort);
  //console.log("velocity_from_power " + velocity_from_power + " ("+ velocity_from_power*3.6 +  ")");
  //console.log("************");


  if (new_leader.output_level < 0){
    console.log("new_leader.output_level < 0");
    debugger;
  }

  //console.log("new_leader.output_level = "+ new_leader.output_level);

  for(let i=1;i<new_order.length;i++){
    if (new_order[i] != current_leader){ //don't update the dropping back rider
      race.riders[new_order[i]].current_aim = "follow";
      //reset their power levels, though chasing riders will always try to follow
      race.riders[new_order[i]].current_power_effort = race.riders[new_order[i]].threshold_power;
    }
  }
  //console.log("Move lead rider back " + positions_to_drop_back + " positions in order, new order " + new_order);
}

function moveRace(){
  //update the race clock, check for instructions, then move the riders based on the current order

  $("#race_info_clock").text(race.race_clock);


  ctx.clearRect(0, 0, c.width, c.height);

  //add any stored instructions if found
  let new_instructions = race.race_instructions_r.filter(a=>parseInt(a[0]) == race.race_clock);
  if(new_instructions.length > 0){

    for(let i=0;i<new_instructions.length;i++){
      let inst = new_instructions[i][1].split("=");
      if (inst.length=2){
        if(inst[0]=="effort"){
          race.live_instructions.push(["effort",parseFloat(inst[1])]);
          //console.log(race.race_clock + " **FOUND INSTRUCTION** EFFORT: " + parseFloat(inst[1]));
        }
        else if(inst[0]=="drop"){
          race.drop_instruction = parseInt(inst[1]);
          //console.log(race.race_clock + " **FOUND INSTRUCTION** EFFORT: " + parseFloat(inst[1]));
        }
      }
    }
  }


  //carry out any live_instructions (they are queued)
  while (race.live_instructions.length > 0){
    let instruction = race.live_instructions.pop();
    if(instruction[0]=="effort"){
      setEffort(instruction[1]);
      $("#instruction_info_text").text(race.race_clock + " - Effort updated to " + instruction[1]);
      //console.log(race.race_clock + " Effort instruction " + instruction[1] + " applied ")
    }
  }

  //also look at the drop instruciton: this can only be done at the beginnings of bends where the track is banked
  if(race.drop_instruction > 0){
  //  console.log(race.race_clock + " drop instruction queued " + race.drop_instruction);
    if (race.riders.filter(a=>a.current_aim == "drop").length == 0){   //if no  rider is currently dropping back
      let lead_rider_distance_on_lap = race.riders[race.current_order[0]].distance_covered % settings.track_length;
      let distance_travelled_last_step = race.riders[race.current_order[0]].velocity;
      //console.log(race.race_clock + " distance_travelled_last_step " + distance_travelled_last_step + " lead_rider_distance_on_lap " + lead_rider_distance_on_lap + ", race.bend1_switch_start_distance " + race.bend1_switch_start_distance + ", race.bend1_switch_end_distance" + race.bend1_switch_end_distance + ", race.bend2_switch_start_distance" + race.bend2_switch_start_distance + ", race.bend2_switch_end_distance " + race.bend2_switch_end_distance);

      if ((lead_rider_distance_on_lap > race.bend1_switch_start_distance && lead_rider_distance_on_lap < race.bend1_switch_end_distance) || (lead_rider_distance_on_lap > race.bend1_switch_end_distance && (lead_rider_distance_on_lap-distance_travelled_last_step)<=race.bend1_switch_start_distance) || (lead_rider_distance_on_lap > race.bend2_switch_start_distance && lead_rider_distance_on_lap < race.bend2_switch_end_distance) || (lead_rider_distance_on_lap > race.bend2_switch_end_distance && (lead_rider_distance_on_lap-distance_travelled_last_step)<=race.bend2_switch_start_distance) ){
        //console.log(race.race_clock +  " OK TO DROP BACK: switchLead(race.drop_instruction) ");
        switchLead(race.drop_instruction);
        $("#instruction_info_text").text(race.race_clock + " - DROP back " + race.drop_instruction);
        race.drop_instruction = 0;
      }
    }
  }

  for(let i=0;i<race.current_order.length;i++){
    let race_rider = race.riders[race.current_order[i]];
    //work out how far the race_rider can go in this time step
    //work out basic drag from current volocity = CdA*p*((velocity**2)/2)


    let accumulated_effect = 1; // for accumulated fatigue effect on rider. 1 means no effect, 0 means total effect, so no more non-sustainable effort is possible
    race_rider.aero_A2 = Math.round((0.5 * settings.frontalArea * race_rider.aero_density)*10000)/10000;   // full air resistance parameter

    if (race_rider.current_aim =="lead"){
      //push the pace at the front
      //what's the current effort?
      //consider fatigue
      //update the accumulated fatigue. as this rises, the failure rate lowers.

      if (race_rider.accumulated_fatigue > settings.accumulated_fatigue_maximum ){
        accumulated_effect = 0;
      }
      else{
        accumulated_effect = (settings.accumulated_fatigue_maximum - race_rider.accumulated_fatigue)/settings.accumulated_fatigue_maximum;
      }
        let failure_level = settings.fatigue_failure_level*accumulated_effect;

      if(race_rider.endurance_fatigue_level >= failure_level){
        race_rider.output_level = (settings.threshold_power_effort_level-settings.recovery_effort_level_reduction);
      }
      //set the power level based on the effort instruction

      race_rider.current_power_effort = mapEffortToPower(settings.threshold_power_effort_level, race_rider.output_level, race_rider.threshold_power, race_rider.max_power );

      let target_power = race_rider.current_power_effort; //try to get to this
      //work out the velocity from the power
      //target power cannot be <= 0; riders do not stop; need a predefined lowest limit?
      if (target_power < 0){
        target_power = 0;
      }

      let powerv = race_rider.power_out, power_adjustment = 0;
      //compare power required to previous power and look at how it can increase or decrease
      if (powerv > target_power){ //slowing down
        if((powerv - target_power) > Math.abs(settings.power_adjustment_step_size_down)){
          power_adjustment = settings.power_adjustment_step_size_down;
        }
        else{
          power_adjustment = (target_power - powerv);
        }
      }
      else if(powerv < target_power){ //speeding up
        if((target_power - powerv) > settings.power_adjustment_step_size_up){
          power_adjustment = settings.power_adjustment_step_size_up;
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
        if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)]){
          lookup_velocity = newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)];
        }
      }
      if ( lookup_velocity === undefined || lookup_velocity === -1){
        //does not exist in the lookup so call the function and save it
        race_rider.velocity = newton(race_rider.aero_A2, settings.headwindv, race_rider.aero_tres, settings.transv, powerv);
        if(newton_lookup[parseInt(race_rider.aero_twt*10)]){
          if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)]){
            newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)] = race_rider.velocity;
          }
          else{
            newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)] = [];
            newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)] = race_rider.velocity;
          }
        }
        else{
          //add new array for total weight and A2 values
          newton_lookup[parseInt(race_rider.aero_twt*10)] = [];
          newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)] = [];
          newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)] = race_rider.velocity;
        }
      }
      else{
        race_rider.velocity = lookup_velocity;
      }
      race_rider.power_out = powerv;

      //can now save this power
      rider_power_data[race.current_order[i]].push(powerv);

      //add fatigue if going harder than the threshold or recover if going under it
      //recover if going under the threshold

      if (race_rider.power_out < race_rider.threshold_power){
        if (race_rider.endurance_fatigue_level > 0){
          let recovery_power_rate = 1;
          if (settings.recovery_power_rate){
            recovery_power_rate = settings.recovery_power_rate;
          }

          race_rider.endurance_fatigue_level -= race_rider.recovery_rate* Math.pow(( (race_rider.threshold_power- race_rider.power_out)/race_rider.threshold_power),recovery_power_rate);
          if (  race_rider.endurance_fatigue_level < 0){ race_rider.endurance_fatigue_level = 0;}; //just in case it goes below zero
        }
      }
      else if(race_rider.power_out > race_rider.threshold_power){
        //let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/race_rider.max_power),settings.fatigue_power_rate);
          let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/(race_rider.max_power-race_rider.threshold_power)),settings.fatigue_power_rate);
        race_rider.endurance_fatigue_level += fatigue_rise;
        race_rider.accumulated_fatigue += fatigue_rise;
      }

    }
    else{
      //rider may be following or dropping back. Either way they will be basing velocity on that of another rider- normally just following the rider in front of you

      let rider_to_follow = {};
      if (i==0){
        rider_to_follow = race.riders[race.current_order[race.current_order.length-1]];
      }
      else{
        rider_to_follow = race.riders[race.current_order[i-1]];
       }

      // assume we are drafting and try to cover the same distance as the race_rider in front, which will take a certain amount of power
      //need to factor in the original offset
      //let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset- settings.start_position_offset) -  (race_rider.distance_covered-race_rider.start_offset);
      let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset- settings.target_rider_gap) -  (race_rider.distance_covered-race_rider.start_offset);
      //this is your target velocity, but it might not be possible. assuming 1 s - 1 step
      let target_velocity = distance_to_cover;
      //work out the power needed for this velocity- remember we are drafting

      //if your velocity is very high and you are approaching the target rider you will speed past, so if within a certain distance and traveling quickly set your target speed to be that of the target rider or very close to it.
      if((race_rider.velocity - rider_to_follow.velocity > settings.velocity_difference_limit) &&  (distance_to_cover < settings.damping_visibility_distance)){
        target_velocity =  rider_to_follow.velocity;//assumption that by the time taken to adjust to the same velocity you will have caught them
      }
      else if((race_rider.velocity - target_velocity > 0) && (distance_to_cover < settings.damping_visibility_distance)){ //if slowing down and target velocity is low but you are close to the target rider, then only slow a little (dropping back)
          //need to weight the adjustment so that it goes closer to zero as they get closer and closer
          let rider_to_follow_proximity_weighting = 1;
          let current_distance_from_target = Math.abs((race_rider.distance_covered-race_rider.start_offset) - (rider_to_follow.distance_covered-rider_to_follow.velocity-rider_to_follow.start_offset-settings.target_rider_gap));
          if (current_distance_from_target < settings.damping_deceleration_distance){
            rider_to_follow_proximity_weighting = (current_distance_from_target/settings.damping_deceleration_distance);
          }
          target_velocity =  (rider_to_follow.velocity - (settings.velocity_adjustment_dropping_back*rider_to_follow_proximity_weighting));      }

      let tv = target_velocity + settings.headwindv;
      //to work out the shelter, distance from the rider in front is needed

      let level_of_shelter = 1;//maximum shelte
      let shelter_effect_strength = settings.drafting_effect_on_drag;
      if (race_rider.number_of_riders_in_front == 2){
        shelter_effect_strength += settings.two_riders_in_front_extra_shelter;
      }
      else if (race_rider.number_of_riders_in_front > 2){
        shelter_effect_strength += settings.more_than_two_riders_in_front_extra_shelter;
      }

      if (race_rider.distance_from_rider_in_front > settings.shelter_max_distance){
        level_of_shelter = 0; //after 3m assume no shelter: this is a hardcoded guess
      }
      else if (race_rider.distance_from_rider_in_front > 0){
        //between 0 and three metres need to drop off - try a linear model
        level_of_shelter = (1-(level_of_shelter/settings.shelter_max_distance));
      }
      else if (race_rider.distance_from_rider_in_front == -1){
        //if you have no rider in front of you this distance is set to -1, so you have no shelter
        level_of_shelter = 0;
      }
      race_rider.aero_A2 = Math.round((race_rider.aero_A2 - race_rider.aero_A2*(shelter_effect_strength*level_of_shelter))*10000)/10000;
      let A2Eff = (tv > 0.0) ? race_rider.aero_A2 : -race_rider.aero_A2; // wind in face, must reverse effect
      let target_power = (target_velocity * race_rider.aero_tres + target_velocity * tv * tv * A2Eff) / settings.transv;

      //can't go below zero : otherwise riders can go backwards!
      if (target_power < 0){
        target_power = 0;
      }

      //What is the max power that this rider can do for now? Need to consider fatigue
      let current_max_power = race_rider.max_power;
      if (race_rider.accumulated_fatigue > settings.accumulated_fatigue_maximum ){
        accumulated_effect = 0;
      }
      else{
        accumulated_effect = (settings.accumulated_fatigue_maximum - race_rider.accumulated_fatigue)/settings.accumulated_fatigue_maximum;
      }
      let failure_level = settings.fatigue_failure_level*accumulated_effect;
      if(race_rider.endurance_fatigue_level >= failure_level){
        current_max_power = (race_rider.threshold_power*((settings.threshold_power_effort_level-settings.recovery_effort_level_reduction)/10));
      }
      //can't go over the max power
      if (target_power > current_max_power){
        target_power = current_max_power; //can't go over this (for now)
      }


      //BUT, can this power be achieved? we may have to accelerate, or decelerate, or it might be impossible
      let powerv = race_rider.power_out, power_adjustment = 0;

      //to stop radical slowing down/speeding up, need to reduce it as the target rider's velocity is approched
      let damping = 1;
      if (powerv > target_power){//slowing down
        if((powerv - target_power) > Math.abs(settings.power_adjustment_step_size_down)){
          power_adjustment = settings.power_adjustment_step_size_down * damping;
        }
        else{
          power_adjustment = (target_power - powerv);
        }
      }
      else if(powerv < target_power){//speeding up
        if((target_power - powerv) > settings.power_adjustment_step_size_up){
          power_adjustment = settings.power_adjustment_step_size_up;
        }
        else{
          power_adjustment = (target_power - powerv);
        }
      }

      let old_velocity = race_rider.velocity; //use to check if rider slows down or speeds up for this step

      powerv+=power_adjustment;
      powerv = Math.round((powerv)*100)/100;

      let lookup_velocity = -1;
      if (newton_lookup[parseInt(race_rider.aero_twt*10)]){
        if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)]){
          lookup_velocity = newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)];
        }
      }
      if ( lookup_velocity === undefined || lookup_velocity === -1){
        //does not exist in the lookup so call the function and save it
        race_rider.velocity = newton(race_rider.aero_A2, settings.headwindv, race_rider.aero_tres, settings.transv, powerv);
        if(newton_lookup[parseInt(race_rider.aero_twt*10)]){
          if(newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)]){
            newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)] = race_rider.velocity;
          }
          else{
            newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)] = [];
            newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)] = race_rider.velocity;
          }
        }
        else{
          //add new array for total weight and A2 values
          newton_lookup[parseInt(race_rider.aero_twt*10)] = [];
          newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)] = [];
          newton_lookup[parseInt(race_rider.aero_twt*10)][parseInt(race_rider.aero_A2*10000)][parseInt(powerv*100)] = race_rider.velocity;
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

      //can now save this power
      rider_power_data[race.current_order[i]].push(powerv);

      //fatigue if over the threshold, recover if under
      if (race_rider.power_out < race_rider.threshold_power ){
        //recover if going under the threshold
        if (race_rider.endurance_fatigue_level > 0){
          let recovery_power_rate = 1;
          if (settings.recovery_power_rate){
            recovery_power_rate = settings.recovery_power_rate;
          }

          race_rider.endurance_fatigue_level -= race_rider.recovery_rate* Math.pow(( (race_rider.threshold_power- race_rider.power_out)/race_rider.threshold_power),recovery_power_rate);
          if (  race_rider.endurance_fatigue_level < 0){ race_rider.endurance_fatigue_level = 0;};
        }
      }
      else{
        //add fatigue if going harder than the threshold
      //  let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/race_rider.max_power),settings.fatigue_power_rate);
        let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/(race_rider.max_power-race_rider.threshold_power)),settings.fatigue_power_rate);
        race_rider.endurance_fatigue_level += fatigue_rise
        race_rider.accumulated_fatigue += fatigue_rise;
      }
    }

    race_rider.distance_this_step = race_rider.velocity; //asssumes we are travelling for 1 second: this is the total distance to be travelled on the track
    //console.log(race_rider.name + " " + race_rider.current_aim + " at " + race.race_clock  +  " new velocity " + race_rider.velocity);

    //if on a straight just keep going in that direction
    //may need to break a distance covered down into parts (e.g. going from bend to straight)
    race_rider.distance_this_step_remaining = race_rider.distance_this_step;
    let scale_amount = settings.vis_scale;

    //Move the rider along on the track (VISUALS)
    while(race_rider.distance_this_step_remaining > 0){
      let distance_this_step_segment =   race_rider.distance_this_step_remaining;
      if (race_rider.current_track_position == 'start'){
        if (race_rider.straight_distance_travelled + distance_this_step_segment <= ((settings.track_straight_length/2) + race_rider.start_offset)){
          //can do full step on straight
          race_rider.straight_distance_travelled += distance_this_step_segment;
          race_rider.current_position_x -= distance_this_step_segment*scale_amount;
          race_rider.distance_this_step_remaining = 0;
          //console.log(race.race_clock + ": " + race_rider.name + "straight 1 (start) full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining = " +   race_rider.distance_this_step_remaining  + " with start offset of " + race_rider.start_offset  )
        }
        else{
          distance_this_step_segment =  (settings.track_straight_length/2 + race_rider.start_offset) - race_rider.straight_distance_travelled;
          race_rider.straight_distance_travelled += distance_this_step_segment;
          race_rider.current_position_x -= distance_this_step_segment*scale_amount;
          race_rider.distance_this_step_remaining -= distance_this_step_segment;
          //rest of segment is on the bend
          race_rider.current_track_position = 'bend1';
          race_rider.bend_centre_x = race_rider.current_position_x;
          //console.log(race.race_clock + ": " + race_rider.name + " straight 1 (start) partial "+distance_this_step_segment+" of "+race_rider.distance_this_step+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining " +   race_rider.distance_this_step_remaining + " start offset " + race_rider.start_offset  )
          race_rider.current_bend_angle=90;
        }
      }
      else if (  race_rider.current_track_position == 'bend1') {
        //console.log(race.race_clock + ": " + race_rider.name +  " race_rider.bend_distance_travelled = " + race_rider.bend_distance_travelled + " distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((race_rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          race_rider.bend_distance_travelled+=distance_this_step_segment;
          race_rider.current_bend_angle +=((distance_this_step_segment*scale_amount*360)/(2*Math.PI*settings.track_bend_radius*scale_amount));
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          race_rider.distance_this_step_remaining = 0;
          //console.log(race.race_clock + ": " + race_rider.name +  " bend 1 full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend_angle "  + race_rider.current_bend_angle  );
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - race_rider.bend_distance_travelled;
          race_rider.current_bend_angle +=((distance_on_bend*scale_amount*360)/(2*Math.PI*settings.track_bend_radius*scale_amount));
          race_rider.distance_this_step_remaining -= distance_on_bend;
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          //console.log(race.race_clock + ": " + race_rider.name +  " bend 1 partial "+distance_on_bend+" of "+distance_this_step_segment + " to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend_angle " + race_rider.current_bend_angle  );
          //rider is now on straight2
          race_rider.current_bend_angle = 0;
          race_rider.current_track_position = 'straight2';
          race_rider.straight_distance_travelled = 0;
          race_rider.bend_distance_travelled = 0;
        }
      }
      else if (race_rider.current_track_position == 'straight2') {
        if (race_rider.straight_distance_travelled + distance_this_step_segment <= (settings.track_straight_length)){
          //can do full step on straight
          race_rider.straight_distance_travelled += distance_this_step_segment;
          race_rider.current_position_x += distance_this_step_segment*scale_amount;
          race_rider.distance_this_step_remaining = 0;
          //console.log(race.race_clock + ": " + race_rider.name + " straight 2 full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   travelled " + race_rider.straight_distance_travelled + " of " + settings.track_straight_length   )
        }
        else{
          distance_this_step_segment =  settings.track_straight_length - race_rider.straight_distance_travelled;
          race_rider.straight_distance_travelled += distance_this_step_segment;
          race_rider.current_position_x += distance_this_step_segment*scale_amount;
          race_rider.distance_this_step_remaining -= distance_this_step_segment;
          //console.log(race.race_clock + ": " +  race_rider.name + " straight 2 partial "+distance_this_step_segment+" of "+race_rider.distance_this_step+" to (" +race_rider.current_position_x + "," + race_rider.current_position_y + ")   travelled " + race_rider.straight_distance_travelled + " distance_this_step_remaining" +   race_rider.distance_this_step_remaining )
          //rest of segment goes on to bend 2
          race_rider.current_track_position = 'bend2';
          race_rider.bend_centre_x = race_rider.current_position_x;
          race_rider.current_bend_angle=270;
        }
      }
      else if (race_rider.current_track_position == 'bend2') {
        //console.log(race.race_clock + ": " + race_rider.name +  " bend 2 bend_distance_travelled = " + race_rider.bend_distance_travelled + "distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((race_rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          race_rider.bend_distance_travelled+=distance_this_step_segment;
          race_rider.current_bend_angle +=((distance_this_step_segment*scale_amount*360)/(2*Math.PI*settings.track_bend_radius*scale_amount));
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          race_rider.distance_this_step_remaining = 0;
          //console.log(race.race_clock + ": " + race_rider.name + " bend 2 full distance "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend angle " + race_rider.current_bend_angle );
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - race_rider.bend_distance_travelled;
          race_rider.current_bend_angle +=((distance_on_bend*scale_amount*360)/(2*Math.PI*settings.track_bend_radius*scale_amount));
          race_rider.distance_this_step_remaining -= distance_on_bend;
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*scale_amount;
          //console.log(race.race_clock + ": " + race_rider.name +  " bend 2 partial "+distance_on_bend+" of "+distance_this_step_segment + " to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend angle " + race_rider.current_bend_angle  );
          //race_rider is now on straight2
          race_rider.current_bend_angle = 0;
          race_rider.bend_distance_travelled= 0;
          race_rider.current_track_position = 'straight1';
          race_rider.straight_distance_travelled = 0;
        }
      }
      else if (race_rider.current_track_position == 'straight1') {
            if (race_rider.straight_distance_travelled + distance_this_step_segment <= (settings.track_straight_length)){
            //can do full step on straight
            race_rider.straight_distance_travelled += distance_this_step_segment;
            race_rider.current_position_x -= distance_this_step_segment*scale_amount;
            race_rider.distance_this_step_remaining = 0;
            //console.log(race.race_clock + ": " + race_rider.name + " straight 1 full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining = " +   race_rider.distance_this_step_remaining   )
          }
          else{
            distance_this_step_segment =  settings.track_straight_length - race_rider.straight_distance_travelled;
            race_rider.straight_distance_travelled += distance_this_step_segment;
            race_rider.current_position_x -= distance_this_step_segment*scale_amount;
            race_rider.distance_this_step_remaining -= distance_this_step_segment;
            //console.log(race.race_clock + ": " + race_rider.name + " straight 1 partial "+distance_this_step_segment+" of "+race_rider.distance_this_step+" to (" +race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining" +   race_rider.distance_this_step_remaining );
            //rest of segment goes on to bend 2
            race_rider.current_track_position = 'bend1';
            race_rider.bend_centre_x = race_rider.current_position_x;
            race_rider.current_bend_angle=90;
          }
      }
    }
    race_rider.distance_covered+=race_rider.velocity;
    //draw the rider's circle
    ctx.beginPath();
    ctx.arc(race_rider.current_position_x, race_rider.current_position_y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = race_rider.colour;
    if (race_rider.current_aim == "drop"){
      ctx.strokeStyle = "#000000";
      ctx.stroke();
    }
    ctx.fill();
  }
  // After all riders have moved
  // Update each rider's distance value for the rider in front of them (lead is zero)
  let logMessage = "";

    for(let i=0;i<race.current_order.length;i++){
      let ri = race.current_order[i];
      let display_rider = race.riders[ri];
      //is there a rider in front, i.e. who has covered more distance? find the closest rider that is in front of you and use this gap to work out your shelter
      let rif = -1;
      let min_distance = -1;
      let number_of_riders_in_front = 0;
      for(let j=0;j<race.current_order.length;j++){
          if(i!==j){ //ignore distance to self
            let distance_to_rider = (race.riders[race.current_order[j]].distance_covered - race.riders[race.current_order[j]].start_offset ) - (display_rider.distance_covered - display_rider.start_offset);
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
      //display the rider properties
       $("#rider_values_"+i).html("<div class='info_column' style='background-color:"+display_rider.colour+"' >" + display_rider.name + "<span class = 'rider_aim'>" + display_rider.current_aim.toUpperCase() +  ((i==race.current_order.length-2)?' <i class="fas fa-flag-checkered"></i>':'') + " </span></div><div class='info_column'>"+Math.round(display_rider.distance_covered * 100)/100 + "m</div><div class='info_column'>"+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph </div><div class='info_column'>"+ Math.round(display_rider.power_out * 100)/100 + " / "  +display_rider.threshold_power + " / " + display_rider.max_power + " watts</div>" + "<div class='info_column'>"+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m</div>" + "<div class='info_column'>" + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) +  "</div");

      if(settings.log_each_step){
        logMessage += " " + race.race_clock + " | " + display_rider.name + " " + display_rider.current_aim.toUpperCase() +  ((i==race.current_order.length-2)?' |F|':'') + " | " + Math.round(display_rider.distance_covered * 100)/100 + "m | "+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph | "+ Math.round(display_rider.power_out * 100)/100 + " / "  + display_rider.threshold_power + " / " + display_rider.max_power + " watts | "+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m | " + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) + " |||| ";
      }
    }
    if(settings.log_each_step){
      console.log(logMessage);
    }

    race.race_clock++;
  //work out the distance covered of the second last rider
  //get the 2nd last rider (whose time is the one that counts)
  let second_last_rider = race.riders[race.current_order[race.current_order.length-2]];

  let continue_racing = true;

    //console.log("FINISH RACE? second_last_rider.distance_covered " + second_last_rider.distance_covered);

  if (second_last_rider.distance_covered > race.distance ){

    //all riders ahead of the second_last_rider in the current order must be ahead on the track- otherwise the race goes on... (ignore the last rider)
    let all_riders_ahead = true;

    for (let x = 0;x<race.current_order.length-2;x++ ){
      if(race.riders[race.current_order[x]].distance_covered < second_last_rider.distance_covered){
        all_riders_ahead = false;
      }
    }

    if(all_riders_ahead){ //race is finished right? you have done the distance and the others are still in front
      continue_racing = false;
    }
  }
  if (continue_racing && (race_state == "play" || race_state == "resume" )){
    //update the lap coun
    $("#race_info_lap").text(Math.floor(second_last_rider.distance_covered/settings.track_length)+1);
      setTimeout(
        function(){
          moveRace();
      },step_speed);
  }
  else{
    //stopRace();
    console.log("Race Complete/paused");
    d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x");
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
    console.log("updated settings.frontalArea to " + settings.frontalArea )
  }
  let input_teamOrder = $('#teamorder').val().split(",").map(a=>+a);
  if(input_teamOrder.length > 0){
    race.start_order = input_teamOrder;
    console.log("updated race.start_order " + race.start_order )
  }
}

function load_race(){
  //set up the race using the riders given
  // use the given order
  ctx.clearRect(0, 0, c.width, c.height);
  race.riders = [];
  race.current_order = [];
  race.race_clock = 0;
  settings.race_bend_distance = Math.PI * settings.track_bend_radius;
  race.instructions = [];
  race.instructions_t = [];
  race.drop_instruction = 0;
  race.live_instructions = [];
  race.race_instructions = [];
  race.race_instructions_r = [];

  // Set up the switch range points: this is where riders can start to drop back
  // I added settings.switch_prebend_start_addition to allow the swithc to start before the bend proper (speed up switches)
  race.bend1_switch_start_distance = settings.track_straight_length/2 - settings.switch_prebend_start_addition;
  race.bend1_switch_end_distance = race.bend1_switch_start_distance + settings.race_bend_distance*(settings.bend_switch_range_angle/180) ;
  race.bend2_switch_start_distance = (settings.track_straight_length*1.5) + settings.race_bend_distance - settings.switch_prebend_start_addition; //start of second bend
  race.bend2_switch_end_distance = race.bend2_switch_start_distance + settings.race_bend_distance*(settings.bend_switch_range_angle/180) ;

  // Update total number of laps
  $("#race_info_no_of_laps").text(Math.floor(race.distance/settings.track_length));

  console.log("race.start_order.length "+race.start_order.length)

  //Reset rider properties that change during the race
  for(let i = 0;i<race.start_order.length;i++){
    let load_rider = riders[race.start_order[i]];
    load_rider.start_offset = i*settings.start_position_offset;
    load_rider.starting_position_x = settings.track_centre_x + (load_rider.start_offset)*settings.vis_scale ;
    load_rider.starting_position_y = settings.track_centre_y - (settings.track_bend_radius*settings.vis_scale);
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
    load_rider.output_level=settings.threshold_power_effort_level;

    //set up the aero properties so they don't have to be recalculated
    load_rider.aero_density = (1.293 - 0.00426 * settings.temperaturev) * Math.exp(-settings.elevationv / 7000.0);
    load_rider.aero_twt = Math.round((9.8 * (load_rider.weight + settings.bike_weight)*10))/10;  // total weight of rider + bike in newtons, rouded to 1 decimal place
    load_rider.aero_tres = load_rider.aero_twt * (settings.gradev + settings.rollingRes);

    if (i==0){
      load_rider.current_aim = "lead";
    }
    else{
      load_rider.current_aim = "follow";
    }
    race.current_order.push(race.start_order[i]);
    ctx.beginPath();
    ctx.arc(load_rider.current_position_x, load_rider.current_position_y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = load_rider.colour;
    ctx.fill();

    console.log("loading rider " + load_rider.name + " at position " + race.start_order[i] + " with start offset of " + load_rider.start_offset);

    let instructions_t = [];
    let new_instructions = $('#instructions').val();
    if(new_instructions.length > 5){
      //instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
      instructions_t = JSON.parse(new_instructions);
    }
    if (instructions_t.length > 0){
      race.race_instructions_r = instructions_t;
    }

  }

  race.riders = riders;

  addRiderDisplay();

  rider_power_data = []; //reset power data for graph
  for(let i = 0;i<race.start_order.length;i++){
    rider_power_data.push([]); //add an empty array for each rider, so that we can store the power outputs (watts) for each rider/timestep
  }
}

$(document).ready(function() {
  c = document.getElementById("bikeCanvas");
  ctx =c.getContext("2d");
  $('#input_race_length').val(race.distance);
  $('#frontalArea').val(settings.frontalArea);
  $('#teamorder').val(race.start_order.map(a=>a).join(","));
  //attach events
  $("#button_play").on("click", playRace);
  $("#button_stop").on("click", stopRace);
  $("#button_fw").on("click", forwardStep);
  $(".set_effort").on("click", setEffortInstruction);
  $(".switch_lead").on("click", switchLeadInstruction);

  $("#draw_power").on("click",draw_power_graph);
  $("#saveGraphAsPng").on('click',saveGraphAsPng);
  $("#clearCanvas").on('click',clearCanvas);

  load_details_from_url();

}
);

function playRace() {
    if(race_state=='stop'){
      race_state='play';
      var button = d3.select("#button_play").classed('btn-success', true);
      button.select("i").attr('class', "fa fa-pause fa-2x");
      d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x fa-spin");
    }
    else if(race_state=='play' || race_state=='resume'){
      race_state = 'pause';
      update_race_settings();
      d3.select("#button_play i").attr('class', "fa fa-play fa-2x");
      d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x ");
    }
    else if(race_state=='pause'){
      race_state = 'resume';
          d3.select("#button_play i").attr('class', "fa fa-pause fa-2x");
      d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x fa-spin");
    }
      moveRace();
    console.log("button play pressed, play was "+race_state);
}

function stopRace(){
    race_state = 'stop';
    var button = d3.select("#button_play").classed('btn-success', false);
    button.select("i").attr('class', "fa fa-play fa-2x");
    d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x");
    console.log("button stop invoked.");
    update_race_settings();
    resetRace();
}

function forwardStep() {
      if(race_state == "pause"){
        console.log("button forward invoked.");
        d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x fa-spin");
        setTimeout(function(){  d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x "); }, step_speed);
        moveRace();
      }
}

function load_details_from_url(){
  //should get the info needed to run the test: may also get an id, if it does, needs to load the settings from the db

  //note that we load settigns differently if we run from ga/results pages
  let url = new URL(window.location);
  if(url.search.length > 0){
    let source = url.searchParams.get("source");
    if(source == "ga"){
      //load settings from settings id
      let settings_id = url.searchParams.get("settings_id");
      console.log("settings_id " + settings_id);
      //if we get a settigns id we should try to load the settings from the db
      if (settings_id){
        //make a call to get the settings
        fetch('http://127.0.0.1:3003/getExperimentSettingFromID/' + settings_id,{method : 'get'}).then((response)=>{
          return response.json()
        }).then((data)=>{
        //  console.log('data ' + JSON.stringify(data));
          //console.log('data ' + JSON.stringify(data[0].global_settings) );
          console.log(data);
          race = JSON.parse(data[0].race_settings);
          settings = JSON.parse(data[0].global_settings);
          riders = JSON.parse(data[0].rider_settings);

          $("#database_connection_label").html("<strong>Loaded Settings "+data[0].name+"</strong> | _id | <span id = 'settings_id'>"+data[0]._id);
          $("#new_settings_name").val(data[0].name);

          //set the id (global)
          selected_settings_id = data[0]._id;


          //set the start order and instructions
          let start_order = url.searchParams.get("startorder");
          let instructions = url.searchParams.get("instructions");
          if(start_order.length > 0){
            console.log("loaded start_order from URL: " + start_order);
            $("#teamorder").val(start_order);
          }
          if(instructions.length > 0){
            console.log("loaded instructions from URL: " + instructions);
            $("#instructions").val(instructions);
          }

          //need to make sure the race is loaded AFTER we get the settings
          update_race_settings();
          load_race();
      })}
      else{
        $("#database_connection_label").html("<strong>No Settings loaded</strong>, will use template file settings.");

        update_race_settings();
        load_race();
      }


    }
    else if (source=="results") {
      //load settigns from the results as the original settings may have been changed since
      let results_id = url.searchParams.get("results_id");
      console.log("results_id " + results_id);
      //if we get a settings id we should try to load the settings from the db
      if (results_id){
        //make a call to get the settings FROM THE RESULTS
        let serverURL = 'http://127.0.0.1:3003/getResult/'+results_id;
        fetch(serverURL,{method : 'get'}).then((response)=>{
          return response.json()
        }).then((data)=>{
        //  console.log('data ' + JSON.stringify(data));
          //console.log('data ' + JSON.stringify(data[0].global_settings) );
          console.log(data);
          race = JSON.parse(data[0].race_settings);
          settings = JSON.parse(data[0].global_settings);
          riders = JSON.parse(data[0].rider_settings);

          $("#database_connection_label").html("<strong>Loaded Settings From Results"+data[0].settings_name+"</strong> + [ "+ data[0].notes +" ] | _id | <span id = 'settings_id'>"+data[0]._id);
          $("#new_settings_name").val(data[0].settings_name);

          //set the id (global)
          selected_results_id = data[0]._id;


          //set the start order and instructions
          let start_order = url.searchParams.get("startorder");
          let instructions = url.searchParams.get("instructions");
          if(start_order.length > 0){
            console.log("loaded start_order from URL: " + start_order);
            $("#teamorder").val(start_order);
          }
          if(instructions.length > 0){
            console.log("loaded instructions from URL: " + instructions);
            $("#instructions").val(instructions);
          }

          //need to make sure the race is loaded AFTER we get the settings
          update_race_settings();
          load_race();
      })}
      else{
        $("#database_connection_label").html("<strong>No Settings loaded</strong>, will use template file settings.");

        update_race_settings();
        load_race();
      }

    }
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
  let d = new Date();

  let image_filename =  "power_graph_sim_" +  d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate() + "_" + d.getHours() + "-" + d.getMinutes();

  // Get the d3js SVG element and save using saveSvgAsPng.js
  saveSvgAsPng(document.getElementsByTagName("svg")[0], image_filename, {scale: 2, backgroundColor: "#FFFFFF"});

}

const clearCanvas = () => {
  //clear the canvas
  console.log("Clear the canvas");
  d3.select('#graph').selectAll('*').remove();
}
