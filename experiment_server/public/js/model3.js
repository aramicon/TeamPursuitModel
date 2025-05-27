
//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data

import {settings_template} from './global_settings_template.js';
import {race_template} from './race_settings_template.js';
import {riders_template} from './riders_template.js';

//dk23Aug allow for targeted debugging of a rider and a timestep
let targeted_debugging = 1;
let targeted_debugging_rider_no = 3;
let targeted_debugging_timestep_range_start = 198;
let targeted_debugging_timestep_range_end = 198;

let LOG_EACH_STEP_OVERRIDE = 0;

let DEFAULT_recovery_amount_required_after_fatigue = 12;

// switch test values on/off
let USE_TEST_recovery_amount_required_after_fatigue = 1;
let USE_TEST_fatigue_rate = 1;
let USE_TEST_recovery_rate = 1;
let USE_TEST_fatigue_failure_level = 1;
let USE_TEST_accumulated_fatigue_maximum = 1;

//set test values

let TEST_recovery_amount_required_after_fatigue = 80;
let TEST_fatigue_rate = 12;
let TEST_recovery_rate = 55;
let TEST_fatigue_failure_level =  300;
let TEST_accumulated_fatigue_maximum = 770;



//donalK25: april, add array to log for specific timesteps
let debug_log_specific_timesteps = [];

let power_application_include_acceleration = 1;

let settings = settings_template;
let race = race_template;
let riders = riders_template;
let selected_settings_id = 0; // unused?
let selected_results_id = 0; // unused?

let newton_lookup = []; //used to store newton() function calculations to avoid tons of needless calls

let c = {};
let ctx = {};
let race_state = 'stop';

let step_speed = 60;

let rider_power_data = []; //record power outpur of each rider to generate graph

let continue_racing = true; //false when race finishes

let use_lookup_velocity = false;


console.log("Track bend radius = 22m");
console.log("Track straight ((250-(2*Math.PI*22))/2) = " + (250-(2*Math.PI*22))/2 );

var range = $('.input-range');
range.val(10-(step_speed/60));

range.on('input', function(){
    step_speed =(10 - this.value) * 60;
    console.log("step_speed "+ step_speed);
});



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


function addRiderDisplay(){
  $("#riders_info" ).empty();
  $("#riders_info" ).append("<div id='rider_values_header' class='info_row'><div class='info_column' style='height:50px'>Rider <i class='fas fa-biking'></i></div><div class='info_column'>Dist. m</div><div class='info_column'>Vel. kph (m/s)</div><div class='info_column'>Watts</div><div class='info_column'>Gap m</div><div class='info_column'>Fatigue</div><div class='info_column'>Time On Front</div></div>");
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
  //note that the target velocity might be an AVERAGE rather than a continuous/constant value
  let total_velocity = target_velocity + headwind;
  let aeroEff = (total_velocity > 0.0) ? aero : -aero; // wind in face; reverse effect
  let powerv = (target_velocity * total_resistance + target_velocity * total_velocity * total_velocity * aeroEff) / transv;
  return powerv;
}

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
  //assumption: no gradient!
  //assumption: 1 second of time!
  let time = 1;

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
function mapEffortToPower(threshold_effort_level, rider_effort, rider_threshold, rider_max, maximum_effort_value ){
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

  if (settings.limit_drop_to_contiguous_group == 1){
    if ((positions_to_drop_back) > (race.contiguous_group_size-1)){
      //e.g. ig group size is 3 you can at most drop back 2 (lead rider is 1)
      console.log("**** rider trying to drop back " + positions_to_drop_back + " but contiguous_group_size is " + race.contiguous_group_size);
      positions_to_drop_back = (race.contiguous_group_size-1);
    }
  }

  $("#race_info").html("<strong>Leader Drops Back</strong> by "+  positions_to_drop_back + " places");

  let current_leader = race.current_order[0];
  race.riders[current_leader].current_aim = "drop"; //separate status whilst dropping back
  let current_leader_power = race.riders[current_leader].power_out; //try to get the new leader to match this power
  let current_leader_velocity = race.riders[current_leader].velocity;
  // //need to get the theoretical velocity of the current leader for this timestep and use that as the target
  // //donalK25 #accel ------------
  // let current_leader_theoretical_velocity = velocity_from_power_with_acceleration(current_leader_power, settings.rollingRes, (race.riders[current_leader].weight + settings.bike_weight), 9.8, race.riders[current_leader].air_density, settings.frontalArea, current_leader_velocity, settings.transv);
  // //donalK25 #accel ------------ ||

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
  let aero_A2_no_shelter = Math.round((0.5 * settings.frontalArea * new_leader.air_density)*10000)/10000;
  let target_power = 0;
  //console.log("power_from_velocity returns " + target_power + " watts");
  //donalK25: apply constant-speed drag calc or acceleration-based calc

  //donLK25: get the target_power using the old leader output level
  let power_from_output_level_old_leader = mapEffortToPower(settings.threshold_power_effort_level, race.riders[current_leader].output_level, race.riders[current_leader].threshold_power, race.riders[current_leader].max_power, settings.maximum_effort_value);

  new_leader.output_level = mapPowerToEffort(settings.threshold_power_effort_level, power_from_output_level_old_leader, new_leader.threshold_power, new_leader.max_power, settings.maximum_effort_value);

  //now take that power and map it to an output for the ne_leader

  // if(power_application_include_acceleration){
  //   target_power = power_from_velocity_with_acceleration(current_leader_theoretical_velocity, settings.rollingRes, (new_leader.weight + settings.bike_weight), 9.8, new_leader.air_density, settings.frontalArea, new_leader.velocity, settings.transv);
  //
  //     //console.log("Change Lead rider " + race.current_order[i] + " power_from_velocity_with_acceleration() " + " target velocity " + current_leader_velocity + " Crr " + settings.rollingRes + " total weight " + (new_leader.weight + settings.bike_weight) + " gravity " + 9.8 + " air density " + new_leader.air_density + " frontal area " + frontal_area_adjusted_for_shelter + " current velocity " + new_leader.velocity + " drivetrain efficiency " + settings.transv + " TARGET POWER " + target_power);
  //
  // }
  // else{
  //   target_power = power_from_velocity(aero_A2_no_shelter, settings.headwindv, new_leader.aero_tres, settings.transv, current_leader_velocity);
  // }


  //now figure out what effort level will equate to this power, and aim for that


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

//debugging problem discrep april 25
//if (race.race_clock == 115){
//  debugger
//}
  ctx.clearRect(0, 0, c.width, c.height);

  //add any stored instructions if found
  let new_instructions_a = race.race_instructions_r.filter(a=>parseInt(a[0]) == race.race_clock);
   //dk2021Jan: added slice()
  //need to make sure this is a deep copy operation
  // ref: https://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript
  let new_instructions = JSON.parse(JSON.stringify(new_instructions_a));

  if(new_instructions.length > 0){
    //also check for any alterations due to noise
    let instruction_noise_alterations = race.instruction_noise_alterations_r[race.race_clock];
    if (instruction_noise_alterations !== undefined && !(Object.keys(instruction_noise_alterations).length === 0 && instruction_noise_alterations.constructor === Object)){
      console.log("Instruction alterations found: " + JSON.stringify(instruction_noise_alterations) + " new_instructions " + JSON.stringify(new_instructions));
      //Is this a delay?
      if(instruction_noise_alterations["type"]=="random_delay"){
        console.log("random delay alteration");
        //change the timestep of the original; we need to NOT run it now.
        //need to make sure we update the correct instruction
        //loop through race.race_instructions_r until you find the one to change
        for(let i_s=0;i_s<race.race_instructions_r.length;i_s++){
          if(race.race_instructions_r[i_s][0] == instruction_noise_alterations["original_instruction"][0] && race.race_instructions_r[i_s][1] == instruction_noise_alterations["original_instruction"][1]){
            console.log("found instruction to delay instruction " + i_s + " from " + race.race_instructions_r[i_s][0] + " to " + instruction_noise_alterations["altered_instruction"][0]);
              if ( instruction_noise_alterations["altered_instruction"][0] >  race.race_instructions_r[i_s][0]){ //only change things id the delay is actually for a future timestep
                console.log("new_instructions BEFORE update to race_instructions_r " + JSON.stringify(new_instructions));
                race.race_instructions_r[i_s][0] = instruction_noise_alterations["altered_instruction"][0]; //this SHOULD update it
                  console.log("new_instructions AFTER update to race_instructions_r " + JSON.stringify(new_instructions));
                //search the new_instructions for this same instruction and remove it (if delay is > 0)
                for(let i_i=0;i_i<new_instructions.length;i_i++){
                    //need the loop in case there are > 1 instructions (for the same timestep)
                    console.log("Remove existing delayed instruction (" + JSON.stringify(instruction_noise_alterations) + ") from new_instructions " + JSON.stringify(new_instructions) );
                    if(new_instructions[i_i][0] == instruction_noise_alterations["original_instruction"][0] && new_instructions[i_i][1] == instruction_noise_alterations["original_instruction"][1]){
                      //remove that element in the array
                      new_instructions.splice(i_i,1);
                      i_i--; //need to hold the index counter as array elements wil be shifted left
                      console.log("delay instruction: current timestep instruciton removed from array! new_instructions  " + JSON.stringify(new_instructions));
                    }
                }
              }
            break;
          }
        }
      }
      else if(instruction_noise_alterations["type"]=="random_drop" || instruction_noise_alterations["type"]=="random_effort"){
        //search new_instructions for the instruction_noise_alterations entry and update it if found
        for(let i_i=0;i_i<new_instructions.length;i_i++){
            //need the loop in case there are > 1 instructions (for the same timestep)
            if(new_instructions[i_i][0] == instruction_noise_alterations["original_instruction"][0] && new_instructions[i_i][1] == instruction_noise_alterations["original_instruction"][1]){              //remove that element in the array
              new_instructions[i_i][1] = instruction_noise_alterations["altered_instruction"][1]; //sets the new value
              console.log(instruction_noise_alterations["type"] + " instruction alteration : current timestep instruction updated!");
            }
        }
      }
      else{
        console.log("Unknown alteration type " + instruction_noise_alterations["type"] + "\n\n\n" + JSON.stringify(instruction_noise_alterations));
      }
    }

    for(let i=0;i<new_instructions.length;i++){
      let inst = new_instructions[i][1].split("=");
      if (inst.length=2){
        if(inst[0]=="effort"){
          race.live_instructions.push(["effort",parseFloat(inst[1])]);
          console.log(race.race_clock + " **FOUND INSTRUCTION** EFFORT: " + parseFloat(inst[1]));
        }
        else if(inst[0]=="drop"){
          race.drop_instruction = parseInt(inst[1]);
          console.log(race.race_clock + " **FOUND INSTRUCTION** DROP: " + parseInt(inst[1]));

        }
      }
    }
  }


  //carry out any live_instructions (they are queued)
  while (race.live_instructions.length > 0){
    let instruction = race.live_instructions.pop();
    if(instruction[0]=="effort"){

      //dk: check for invalid values
      if(instruction[1] < settings.minimum_power_output){
        console.log("WARNING! effort instruction < 1, updating to minimum 1");
        instruction[1] = 1;
      }
      else if(instruction[1] > settings.maximum_effort_value){
          console.log("WARNING!effort instruction > max value, updating to maximum from settings.maximum_effort_value");
        instruction[1] = settings.maximum_effort_value;
      }
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

  race.contiguous_group_size = 1;

  for(let i=0;i<race.current_order.length;i++){
    let race_rider = race.riders[race.current_order[i]];
    //work out how far the race_rider can go in this time step
    //work out basic drag from current volocity = CdA*p*((velocity**2)/2)


    let accumulated_effect = 1; // for accumulated fatigue effect on rider. 1 means no effect, 0 means total effect, so no more non-sustainable effort is possible
    race_rider.aero_A2 = Math.round((0.5 * settings.frontalArea * race_rider.air_density)*10000)/10000;   // full air resistance parameter

    race_rider.step_info = ""; //dk2021 used to add logging info

    if (race_rider.current_aim =="lead"){

      //dk23UG targetted debugging

      if(targeted_debugging && race.race_clock >= targeted_debugging_timestep_range_start && race.race_clock <= targeted_debugging_timestep_range_end &&  race.current_order[i] == targeted_debugging_rider_no){
        console.log("targeted debugging rider " + race.current_order[i] + " timestep " + race.race_clock + " LEAD ");
        debugger;
      }
      //LEAD rider. do what yer told!
      //push the pace at the front as instructed
      //what's the current effort?
      //consider fatigue
      //update the accumulated fatigue. as this rises, the failure rate lowers.

      //make sure the race rider has a rider_fatigue_failure_level; it shoudl begin at settings.fatigue_failure_level

      let fatigue_failure_level_to_use = settings.fatigue_failure_level;
      if(USE_TEST_fatigue_failure_level == 1){
        fatigue_failure_level_to_use = TEST_fatigue_failure_level;
      }

      if (typeof(race_rider.rider_fatigue_failure_level) == 'undefined'){
        race_rider.rider_fatigue_failure_level = fatigue_failure_level_to_use;
      }

      if(race_rider.endurance_fatigue_level >= race_rider.rider_fatigue_failure_level || race_rider.recovery_mode == 1){
        //turn on recovery mode it's not already on
        if(race_rider.endurance_fatigue_level >= race_rider.rider_fatigue_failure_level && race_rider.recovery_mode == 0){
          race_rider.recovery_mode = 1;
          race_rider.recovery_mode_recovery_so_far = 0; //this counts the recovering done, needed to exit this mode

          //donalK25- May 19 - reset the rider's failure point (at the point of failure)
          let accumulated_effect_on_fatigue = 1;
          let accumulated_fatigue_maximum_to_use = settings.accumulated_fatigue_maximum;
          if(USE_TEST_accumulated_fatigue_maximum == 1){
            accumulated_fatigue_maximum_to_use = TEST_accumulated_fatigue_maximum;
          }

          if (race_rider.accumulated_fatigue > accumulated_fatigue_maximum_to_use ){
            accumulated_effect_on_fatigue = 0; //permanent fail mode
          }
          else{
            accumulated_effect_on_fatigue = (accumulated_fatigue_maximum_to_use - race_rider.accumulated_fatigue)/accumulated_fatigue_maximum_to_use;
          }
          let failure_level = fatigue_failure_level_to_use*accumulated_effect_on_fatigue;
          race_rider.rider_fatigue_failure_level = failure_level;

        }

        race_rider.output_level = (settings.threshold_power_effort_level-settings.recovery_effort_level_reduction);
      }
      //set the power level based on the effort instruction

      //dk23Aug apply overeagerness noise here if it exists
      let original_output_level = 0;
        if (race.instruction_noise_overeagerness_r[race.race_clock]){
          let overeagerness_amount = race.instruction_noise_overeagerness_r[race.race_clock];
          console.log("^^^ overeagerness to apply, amount " + overeagerness_amount + " ^^^");
          original_output_level = race_rider.output_level;
          race_rider.output_level = race_rider.output_level + (race_rider.output_level * overeagerness_amount);
          //make sure we don't exceed the maximum
          if(race_rider.output_level > settings.maximum_effort_value){
            race_rider.output_level = settings.maximum_effort_value;
            console.log("^^^ OVEREAGERNESS set output level too high! ^^^");
          }
          console.log("^^^ output changed from " + original_output_level + " to " + race_rider.output_level);
          $("#race_info").html("Leader <strong>overeager </strong> "+ original_output_level + " to " + race_rider.output_level);
        }

      race_rider.current_power_effort = mapEffortToPower(settings.threshold_power_effort_level, race_rider.output_level, race_rider.threshold_power, race_rider.max_power, settings.maximum_effort_value);

      let target_power = race_rider.current_power_effort; //try to get to this
      //work out the velocity from the power
      //target power cannot be <= 0; riders do not stop; need a predefined lowest limit?
      if (target_power < 0){
        target_power = 0;
      }

      let powerv = race_rider.power_out, power_adjustment = 0;

      //donalK2020: check if there is a performance failure
      let pf_id = race.race_clock + "_" + race.current_order[i];

      if (race.performance_failures_r[pf_id]){
        //reduce the target power by this %
        let failure_p = race.performance_failures_r[pf_id];
        console.log("Performance failure " + pf_id + " of " + failure_p + " reducing power from " + target_power + " to " + (target_power - (target_power * failure_p)));
        target_power = target_power - (target_power * failure_p);
      }


      //compare power required to previous power and look at how it can increase or decrease
      if (powerv > target_power){ //slowing down
        if((powerv - target_power) > Math.abs(settings.power_adjustment_step_size_down)){
          //DonalK25 #accel
            if(power_application_include_acceleration){ //note the NOT
              power_adjustment = (target_power - powerv);
            }
            else{
                power_adjustment = settings.power_adjustment_step_size_down;
            }
        //DonalK25 #accel ||

        }
        else{
            power_adjustment = (target_power - powerv);
        }
      }
      else if(powerv < target_power){ //speeding up
        let power_adjustment_step_size_up = 400;
        if (typeof(settings.power_adjustment_step_size_up) != 'undefined'){
          power_adjustment_step_size_up = settings.power_adjustment_step_size_up;
        }
        if((target_power - powerv) > power_adjustment_step_size_up){
          power_adjustment = power_adjustment_step_size_up;
        }
        else{
          power_adjustment = (target_power - powerv);
        }
      }
      powerv+=power_adjustment;

      //round power output to 2 decimal places
      //donalK25 #accel --------------------
      //powerv = Math.round((powerv)*100)/100;
      //donalK25 #accel -------------------- ||

      //console.log("***:: " + race.race_clock + " race_rider.accumulated_fatigue " +  race_rider.accumulated_fatigue + " settings.accumulated_fatigue_maximum " + settings.accumulated_fatigue_maximum + " accumulated_effect " + accumulated_effect + " failure_level " + failure_level + " race_rider.endurance_fatigue_level " + race_rider.endurance_fatigue_level + " race_rider.output_level " + race_rider.output_level + " race_rider.current_power_effort " + race_rider.current_power_effort + " power_adjustment " + power_adjustment + " powerv " + powerv + "   ::***");

      let current_velocity = race_rider.velocity;
      //donalK25: apply constant-speed drag calc or acceleration-based calc
      if(power_application_include_acceleration){

        race_rider.velocity = velocity_from_power_with_acceleration(powerv, settings.rollingRes, (race_rider.weight + settings.bike_weight), 9.8, race_rider.air_density, settings.frontalArea, current_velocity, settings.transv);

          //console.log("Leading rider " + race.current_order[i] + " velocity_from_power_with_acceleration() power " + powerv + " Crr " + settings.rollingRes + " total weight " +  (race_rider.weight + settings.bike_weight) + " gravity " + 9.8 + " air density " + race_rider.air_density + " frontal area " + settings.frontalArea + " current velocity " + current_velocity + " drivetrain efficiency " + settings.transv + " NEW VELOCITY " + race_rider.velocity);

        //console.log("ACCELL method, LEAD rider " + race_rider.name + " from " +  current_velocity + " to race_rider.velocity " + race_rider.velocity);
      }
      else{
          race_rider.velocity = newton(race_rider.aero_A2, settings.headwindv, race_rider.aero_tres, settings.transv, powerv);
      }

    if(powerv < 0){
      console.log("oh crap! powerv 2 = " + powerv);
      debugger;
    }
      race_rider.power_out = powerv;

      //can now save this power
      rider_power_data[race.current_order[i]].push(powerv);

      //dk2021 set the log info
      race_rider.step_info = "(" + target_power + "|" + powerv + "|" + race_rider.aero_A2 + "|" + race_rider.accumulated_fatigue + "|" + race_rider.endurance_fatigue_level + "|" + race_rider.output_level + ")";

      //add fatigue if going harder than the threshold or recover if going under it
      //recover if going under the threshold

      if (race_rider.power_out < race_rider.threshold_power){

        if (race_rider.endurance_fatigue_level > 0){
          let recovery_power_rate = 1;
          if (settings.recovery_power_rate){
            recovery_power_rate = settings.recovery_power_rate;
          }

          let recovery_rate_to_use = race_rider.recovery_rate;
          if(USE_TEST_recovery_rate == 1){
            recovery_rate_to_use = TEST_recovery_rate;
          }

          let recovery_amount = recovery_rate_to_use*Math.pow(((race_rider.threshold_power- race_rider.power_out)/race_rider.threshold_power),recovery_power_rate);

          race_rider.endurance_fatigue_level -= recovery_amount;
          //donalK25: update the recovery_mode_recovery_so_far amount

          let recovery_amount_required_after_fatigue = DEFAULT_recovery_amount_required_after_fatigue;
          if (typeof(race_rider.recovery_amount_required_after_fatigue) != 'undefined'){
            recovery_amount_required_after_fatigue =  race_rider.recovery_amount_required_after_fatigue;
          }

          let recovery_amount_required_after_fatigue_to_use = recovery_amount_required_after_fatigue;
          if(USE_TEST_recovery_amount_required_after_fatigue == 1){
            recovery_amount_required_after_fatigue_to_use = TEST_recovery_amount_required_after_fatigue;
          }

          race_rider.recovery_mode_recovery_so_far += recovery_amount;
          if(race_rider.recovery_mode_recovery_so_far >= recovery_amount_required_after_fatigue_to_use || race_rider.endurance_fatigue_level <= 0){
            race_rider.recovery_mode = 0; //should exit the fatigue cycle
            race_rider.recovery_mode_recovery_so_far = 0;
          }


          if (race_rider.endurance_fatigue_level < 0){
            race_rider.endurance_fatigue_level = 0;
          }; //just in case it goes below zero
        }
      }
      else if(race_rider.power_out > race_rider.threshold_power){
        //let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/race_rider.max_power),settings.fatigue_power_rate);
        let fatigue_rate_to_use = race_rider.fatigue_rate;
        if(USE_TEST_fatigue_rate == 1){
          fatigue_rate_to_use = TEST_fatigue_rate;
        }

        let fatigue_rise = fatigue_rate_to_use*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/(race_rider.max_power-race_rider.threshold_power)),settings.fatigue_power_rate);

        race_rider.endurance_fatigue_level += fatigue_rise;
        race_rider.accumulated_fatigue += fatigue_rise;
      }

      //dk23 check for choke_under_pressure failure
      //note this will apply in the  next step

      if (race.instruction_noise_choke_under_pressure_r[race.race_clock]){
        //is this the correct rider?

        let rider = -1;
        let changes = race.instruction_noise_choke_under_pressure_r[race.race_clock];
        for(let cup = 0; cup < changes.length;cup+=2){
          if (changes[cup+1]){
            if (changes[cup] == race.current_order[i]){ //this is the rider to target

              console.log(" >*>*>*>*>*>*>*>*> Choke Under Pressure Noise failure lead rider " + race.current_order[i] + " : race_rider.threshold_power changed from " + race_rider.threshold_power + " to " + (race_rider.threshold_power-(race_rider.threshold_power * changes[cup+1])) + " race_rider.max_power changed from " +race_rider.max_power + " to " + (race_rider.max_power - (race_rider.max_power * changes[cup+1])));
              race_rider.threshold_power -= (race_rider.threshold_power * changes[cup+1]);
              race_rider.max_power -= (race_rider.max_power * changes[cup+1]);
            }
          }
        }
        //target_power = target_power - (target_power * failure_p);
      }
    }
    else{
      //CHASING RIDER "follow"
      //rider may be following or dropping back. Either way they will be basing velocity on that of another rider- normally just following the rider in front of you

      if(targeted_debugging && race.race_clock >= targeted_debugging_timestep_range_start && race.race_clock <= targeted_debugging_timestep_range_end &&  race.current_order[i] == targeted_debugging_rider_no){
        console.log("targeted debugging rider " + race.current_order[i] + " timestep " + race.race_clock + " CHASE ");
        debugger
      }
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

      //donalK25 #accel. -------- need to gradually increase the target_rider_gap from 0 to 2m over a number of steps
      let start_steps_to_reach_target_rider_gap = 0;
      if(power_application_include_acceleration){
        start_steps_to_reach_target_rider_gap = 8;
        if (typeof(settings.start_steps_to_reach_target_rider_gap) != 'undefined'){
            start_steps_to_reach_target_rider_gap = settings.start_steps_to_reach_target_rider_gap;
        }
      }

      let adjusted_target_rider_gap = settings.target_rider_gap;
      if(race.race_clock<=start_steps_to_reach_target_rider_gap){
        adjusted_target_rider_gap = 0+(adjusted_target_rider_gap*(race.race_clock/start_steps_to_reach_target_rider_gap));
      }

      //donalK25: follow the rider in front if the rider to follow is dropping back and isn't ready to slot in yet.
      if(rider_to_follow.current_aim == "drop"){
        //who is actually in front of you?

        let closest_rider = 0;
        let min_distance = 100000;

        for(let i_check = 0; i_check < race.current_order.length; i_check++){
          if (i_check != i && race.riders[race.current_order[i_check]].distance_covered < min_distance && (race.riders[race.current_order[i_check]].distance_covered > race_rider.distance_covered) ){
            min_distance = race.riders[race.current_order[i_check]].distance_covered;
            closest_rider = race.riders[race.current_order[i_check]];
          }
        }

        //if a rider is closer than the rider dropping that, stay following them for now.
        if(closest_rider != rider_to_follow){
          rider_to_follow = closest_rider;
        }

      }

      let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset - adjusted_target_rider_gap) -  (race_rider.distance_covered - race_rider.start_offset);
      //donalK25 #accel. -------- ||
      //this is your target velocity, but it might not be possible. assuming 1 s - 1 step
      let target_velocity = distance_to_cover;

      //donalK25 accel --------------------
      if (target_velocity < 0){
        target_velocity = 0;
      }
      //donalK25 accel -------------------- ||

      //work out the power needed for this velocity- remember we are drafting

      //if your velocity is very high and you are approaching the target rider you will speed past, so if within a certain distance and traveling quickly set your target speed to be that of the target rider or very close to it.
      //dk23AUG adding clause to prevent this from affecting the last rider when the lead is changing
      if((rider_to_follow.current_aim != "drop") && ((race_rider.velocity - rider_to_follow.velocity) > settings.velocity_difference_limit) &&  (distance_to_cover < settings.damping_visibility_distance) ){
      //if(((race_rider.velocity - rider_to_follow.velocity) > settings.velocity_difference_limit) &&  (distance_to_cover < settings.damping_visibility_distance) ){
        target_velocity =  rider_to_follow.velocity;//assumption that by the time taken to adjust to the same velocity you will have caught them
      }
      else if((race_rider.velocity > target_velocity) && (distance_to_cover < settings.damping_visibility_distance)){
        //dropping back if slowing down and target velocity is low but you are close to the target rider, then only slow a little (dropping back)
          //need to weight the adjustment so that it goes closer to zero as they get closer and closer
        //IF dropping we apply a different idea, where the dropping rider tries to match the speed of the target rider and not just slow until beind them, otherwise they will then have to sprint back on
        if (race_rider.current_aim == "drop") {
          //if our velocity is higher than the target, just coast, i.e. zero power... we have to get below their velocity
          if(race_rider.velocity >= rider_to_follow.velocity ){
              target_velocity = velocity_from_power_with_acceleration(0, settings.rollingRes, (race_rider.weight + settings.bike_weight), 9.8, race_rider.air_density, settings.frontalArea, race_rider.velocity, settings.transv);

              //console.log(race.race_clock + " rider " + race_rider.name + " dopping back (coast!!):: " + " rider_to_follow.velocity " + " distance_to_cover " + distance_to_cover + " rider_to_follow.velocity "+ rider_to_follow.velocity + " target_velocity " + target_velocity);
          }
          else{
            //otherwise, at some point we need to accelerate to try and ideally match the target rider velocity right as we reach 2m behind them
            //if we accelerate now until we reach the target rider's velocity, and we estimate that we will still be more than 2m behind them by then, then accelerate!
            let timestep_count = 0;
            let power_step_up = settings.power_adjustment_step_size_up;
            let estimated_velocity = race_rider.velocity;
            let estimated_distance_after_accel = race_rider.distance_covered;
            let target_rider_estimated_velocity = rider_to_follow.velocity; //can also estimate their accel, but how do we know their shelter??
            let target_rider_estimated_distance_after_accel = rider_to_follow.distance_covered;
            let target_power_dr = race_rider.threshold_power + race_rider.threshold_power*0.1; //key value, have tried many variants here
            let current_power_est_dr = race_rider.power_out;
            let tries_limit = 20;
            while(estimated_velocity < target_rider_estimated_velocity && timestep_count < tries_limit ){
              if ((target_power_dr - current_power_est_dr) > settings.power_adjustment_step_size_up ){
                current_power_est_dr += settings.power_adjustment_step_size_up;
              }
              else {
                current_power_est_dr = target_power_dr;
              }
                estimated_velocity =  velocity_from_power_with_acceleration(current_power_est_dr, settings.rollingRes, (race_rider.weight + settings.bike_weight), 9.8, race_rider.air_density, settings.frontalArea, estimated_velocity, settings.transv);
                estimated_distance_after_accel +=  estimated_velocity;
                //also estimate the progress and velocity change of the target rider (with constant current power)
                if(typeof(rider_to_follow.frontal_area_adjusted_for_shelter) == "undefined"){
                  rider_to_follow.frontal_area_adjusted_for_shelter =  settings.frontalArea;
                }
                if(timestep_count > 0){
                  target_rider_estimated_velocity = velocity_from_power_with_acceleration(rider_to_follow.power_out, settings.rollingRes, (rider_to_follow.weight + settings.bike_weight), 9.8, rider_to_follow.air_density, rider_to_follow.frontal_area_adjusted_for_shelter, target_rider_estimated_velocity, settings.transv);
                  target_rider_estimated_distance_after_accel += target_rider_estimated_velocity;
                }
                  timestep_count++;
            }
            //let target_rider_estimate_distance = rider_to_follow.distance_covered + rider_to_follow.velocity*(timestep_count-1) ;
            if (estimated_distance_after_accel < (target_rider_estimated_distance_after_accel + 1.5)){
              //accelerate now
              if ((target_power_dr - race_rider.power_out) > settings.power_adjustment_step_size_up ){
                target_power_dr = settings.power_adjustment_step_size_up;
              }
              target_velocity = velocity_from_power_with_acceleration(target_power_dr, settings.rollingRes, (race_rider.weight + settings.bike_weight), 9.8, race_rider.air_density, settings.frontalArea, race_rider.velocity, settings.transv);

              //if this target velocity is >= rider_to_follow.velocity, then we should reduce it, as we can get stuck in a loop here
              if(target_velocity >= rider_to_follow.velocity){
                target_velocity = rider_to_follow.velocity-0.3; //a fixed value to stop it from going past the rider again.
              }
            }
            else{
              //if we accelerate now we think we will still be ahead of them when we get up to their speed, so chill the beans for now.
              target_velocity = velocity_from_power_with_acceleration(0, settings.rollingRes, (race_rider.weight + settings.bike_weight), 9.8, race_rider.air_density, settings.frontalArea, race_rider.velocity, settings.transv);
            }
        }
      }
        else{
          //idea 2 (old version), we aim to match the target rider's speed more and more as we get close to it.
          let rider_to_follow_proximity_weighting = 1;
          let current_distance_from_target = Math.abs((race_rider.distance_covered-race_rider.start_offset) - (rider_to_follow.distance_covered-rider_to_follow.velocity-rider_to_follow.start_offset-settings.target_rider_gap));

           let velocity_adjustment_dropping_back = 2;
           if (typeof(settings.velocity_adjustment_dropping_back) != 'undefined'){
             velocity_adjustment_dropping_back = settings.velocity_adjustment_dropping_back;
           }
           //if the target velocity is too far from the current velocity we need to dampen, otherwise we can aim for the exact distance to cover.
           let damping_deceleration_distance = 10;

           if (current_distance_from_target < damping_deceleration_distance){
             let damping_exponent = 0.8; //hardcoded a value here
             rider_to_follow_proximity_weighting = ((current_distance_from_target**damping_exponent)/(damping_deceleration_distance**damping_exponent));
           }
          target_velocity =  (rider_to_follow.velocity - (velocity_adjustment_dropping_back*rider_to_follow_proximity_weighting));

          //console.log(race.race_clock + " rider " + race_rider.name + " dopping back :: " + " rider_to_follow.velocity " + rider_to_follow.velocity + " current_distance_from_target " + current_distance_from_target + " rider_to_follow_proximity_weighting " + rider_to_follow_proximity_weighting + " target_velocity " + target_velocity);
        }
      }

      let tv = target_velocity + settings.headwindv;
      //to work out the shelter, distance from the rider in front is needed

      let level_of_shelter = 1;//maximum shelter
      let shelter_max_distance = 5;
      if (typeof(settings.shelter_max_distance) != 'undefined'){
        shelter_max_distance = settings.shelter_max_distance;
      }

      let shelter_effect_strength = settings.drafting_effect_on_drag;
      if (race_rider.number_of_riders_in_front == 2){
        shelter_effect_strength += settings.two_riders_in_front_extra_shelter;
      }
      else if (race_rider.number_of_riders_in_front > 2){
        shelter_effect_strength += settings.more_than_two_riders_in_front_extra_shelter;
      }

      if (race_rider.distance_from_rider_in_front > shelter_max_distance || race_rider.current_aim == "drop"){
        level_of_shelter = 0; //after the limit OR if the rider is dropping back, assume no shelter: this is a hardcoded guess
      }
      else if (race_rider.distance_from_rider_in_front > 0){
        //between 0 and shelter_max_distance metres need to drop off - try a linear model
        //donalK25: seeing a major issue with   level_of_shelter = (1-(level_of_shelter/settings.shelter_max_distance));
        // why is the distance_from_rider_in_front not in there?

        //level_of_shelter = (1-(level_of_shelter/settings.shelter_max_distance));
        //new version march 2025
        if (race_rider.distance_from_rider_in_front < settings.target_rider_gap) { //provide no benefit if too close
          level_of_shelter = 1;
        }
        else{
          // what spot in the gap between min and max shelter are we at? (e.g., 2m to 5m)
          level_of_shelter = (1-((race_rider.distance_from_rider_in_front-settings.target_rider_gap)/(shelter_max_distance-settings.target_rider_gap)));
        }
      }
      else if (race_rider.distance_from_rider_in_front == -1){
        //if you have no rider in front of you this distance is set to -1, so you have no shelter
        level_of_shelter = 0;
      }

        let target_power = 0;
        let shelter_effect = (shelter_effect_strength*level_of_shelter);
        let current_velocity = race_rider.velocity;
        race_rider.aero_A2 = Math.round((race_rider.aero_A2 - race_rider.aero_A2*shelter_effect)*10000)/10000;
        let A2Eff = (tv > 0.0) ? race_rider.aero_A2 : -race_rider.aero_A2; // wind in face, must reverse effect

        let frontal_area_adjusted_for_shelter = Math.round((settings.frontalArea - settings.frontalArea*shelter_effect)*10000)/10000;

        //donalK25: storing this to use in dropping back calculations
        race_rider.frontal_area_adjusted_for_shelter = frontal_area_adjusted_for_shelter;

        if(power_application_include_acceleration){
          target_power = power_from_velocity_with_acceleration(target_velocity, settings.rollingRes, (race_rider.weight + settings.bike_weight), 9.8, race_rider.air_density, frontal_area_adjusted_for_shelter, race_rider.velocity, settings.transv);

          //console.log("Chasing rider " + race.current_order[i] + " power_from_velocity_with_acceleration() " + " target velocity " + target_velocity + " Crr " + settings.rollingRes + " total weight " + (race_rider.weight + settings.bike_weight) + " gravity " + 9.8 + " air density " + race_rider.air_density + " frontal area " + frontal_area_adjusted_for_shelter + " current velocity " + race_rider.velocity + " drivetrain efficiency " + settings.transv + " TARGET POWER " + target_power);

          // console.log("ACCEL method, CHASING rider " + race_rider.name + " from " +  current_velocity + " to race_rider.velocity " + race_rider.velocity + " target_power: " + target_power);
        }
        else{
        target_power = (target_velocity * race_rider.aero_tres + target_velocity * tv * tv * A2Eff) / settings.transv;
        }

      //donalK -- accel can't go below zero? : or allow some braking??
      if (target_power < 0){
          if(power_application_include_acceleration){
            let braking_power_allowed = 0; // 0 means no braking
            if (typeof(settings.braking_power_allowed) != 'undefined'){
              braking_power_allowed  = settings.braking_power_allowed;
            }
            if (Math.abs(target_power) > braking_power_allowed ){
              //console.log("||----- Timestep " + race.race_clock + " Drop rider braking, target_power target_power " + target_power + " braking_power_allowed " + braking_power_allowed);
                target_power = -braking_power_allowed;
            }
          }
          else{
              target_power = 0;
          }
      }

      //fail if over the failure level, and remain there while in failure mode
      //fail mode limits the rider's max power
      let current_max_power = race_rider.max_power;

      //ensure the rider has a failure level (adjusted for accumulated fatigue)

      let fatigue_failure_level_to_use = settings.fatigue_failure_level;
      if(USE_TEST_fatigue_failure_level == 1){
        fatigue_failure_level_to_use = TEST_fatigue_failure_level;
      }

      if (typeof(race_rider.rider_fatigue_failure_level) == 'undefined'){
        race_rider.rider_fatigue_failure_level = fatigue_failure_level_to_use;
      }

      if(race_rider.endurance_fatigue_level >= race_rider.rider_fatigue_failure_level || race_rider.recovery_mode == 1 ){

        //turn on recovery mode it's not already on
        if(race_rider.endurance_fatigue_level >= race_rider.rider_fatigue_failure_level && race_rider.recovery_mode == 0){
          race_rider.recovery_mode = 1;
          race_rider.recovery_mode_recovery_so_far = 0; //this counts the recovering done, needed to exit this mode

          //donalK25- May 19 - reset the rider's failure point (at the point of failure)
          let accumulated_effect_on_fatigue = 1;

          let accumulated_fatigue_maximum_to_use = settings.accumulated_fatigue_maximum;
          if(USE_TEST_accumulated_fatigue_maximum == 1){
            accumulated_fatigue_maximum_to_use = TEST_accumulated_fatigue_maximum;
          }

          if (race_rider.accumulated_fatigue > accumulated_fatigue_maximum_to_use ){
            accumulated_effect_on_fatigue = 0; //permanent fail mode
          }
          else{
            accumulated_effect_on_fatigue = (accumulated_fatigue_maximum_to_use - race_rider.accumulated_fatigue)/accumulated_fatigue_maximum_to_use;
          }
          let failure_level = fatigue_failure_level_to_use*accumulated_effect_on_fatigue;
          race_rider.rider_fatigue_failure_level = failure_level;

        }
        //donalK25: align this with the mapping-effort level-to-power used by the leader
        let recovery_output_level = (settings.threshold_power_effort_level-settings.recovery_effort_level_reduction);
        current_max_power = mapEffortToPower(settings.threshold_power_effort_level, recovery_output_level, race_rider.threshold_power, race_rider.max_power, settings.maximum_effort_value);

        //current_max_power = (race_rider.threshold_power*((settings.threshold_power_effort_level-settings.recovery_effort_level_reduction)/10));
      }
      //can't go over the max power
      if (target_power > current_max_power){
        target_power = current_max_power; //can't go over this (for now)
      }

      //donalK2020: check if there is a performance failure
      let pf_id = race.race_clock + "_" + race.current_order[i];
      if (race.performance_failures_r[pf_id]){
        //reduce the target power by this %
        let failure_p = race.performance_failures_r[pf_id];
        console.log("Performance failure " + pf_id + " of " + failure_p + " reducing power from " + target_power + " to " + (target_power - (target_power * failure_p)));
        target_power = target_power - (target_power * failure_p);
      }

      //BUT, can this power be achieved? we may have to accelerate, or decelerate, or it might be impossible
      let powerv = race_rider.power_out, power_adjustment = 0;

      //to stop radical slowing down/speeding up, need to reduce it as the target rider's velocity is approched
      let damping = 1;
      if (powerv > target_power){//slowing down
        if((powerv - target_power) > Math.abs(settings.power_adjustment_step_size_down)){
          //DonalK25 #accel

            if(power_application_include_acceleration){ //note the NOT
                power_adjustment = (target_power - powerv);
            }
            else{
              power_adjustment = settings.power_adjustment_step_size_down * damping;
            }
        //DonalK25 #accel ||
        }
        else{
          power_adjustment = (target_power - powerv);
        }
      }
      else if(powerv < target_power){//speeding up
        let power_adjustment_step_size_up = 400;
        if (typeof(settings.power_adjustment_step_size_up) != 'undefined'){
          power_adjustment_step_size_up = settings.power_adjustment_step_size_up;
        }
        if((target_power - powerv) > power_adjustment_step_size_up){
          power_adjustment = power_adjustment_step_size_up;
        }
        else{
          power_adjustment = (target_power - powerv);
        }
      }

      let old_velocity = race_rider.velocity; //use to check if rider slows down or speeds up for this step

      powerv+=power_adjustment;
      //donalK25 #accel --------------------
      //powerv = Math.round((powerv)*100)/100;
      //donalK25 #accel -------------------- ||



      if(power_application_include_acceleration){

        race_rider.velocity = velocity_from_power_with_acceleration(powerv, settings.rollingRes, (race_rider.weight + settings.bike_weight), 9.8, race_rider.air_density, frontal_area_adjusted_for_shelter, current_velocity, settings.transv);

        //console.log("Chasing rider " + race.current_order[i] + " velocity_from_power_with_acceleration() power " + powerv + " Crr " + settings.rollingRes + " total weight " +  (race_rider.weight + settings.bike_weight) + " gravity " + 9.8 + " air density " + race_rider.air_density + " frontal area " + frontal_area_adjusted_for_shelter + " current velocity " + current_velocity + " drivetrain efficiency " + settings.transv + " NEW VELOCITY " + race_rider.velocity);

        // console.log("ACCELL method, LEAD rider " + race_rider.name + " from " +  current_velocity + " to race_rider.velocity " + race_rider.velocity);
      }
      else{
          race_rider.velocity = newton(race_rider.aero_A2, settings.headwindv, race_rider.aero_tres, settings.transv, powerv);
      }

      //if you are dropping back and get back to the rider in front, go back to a follow state
      if(race_rider.current_aim =="drop"){ //once you are behind the rider_to_follow, you 'follow' again
        //donalK25: could add target_rider_gap here so that we drop back until behind the target rider, not until alongside them?
         if((race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= (rider_to_follow.distance_covered-rider_to_follow.start_offset))
        //if((race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= (rider_to_follow.distance_covered-rider_to_follow.start_offset-0.3))
         {
          //idea is that you are dropping back so long as you are in front of the rider you should be behind
          race_rider.current_aim = "follow";
        }
      }

      //count the size of the current contiguous group: may affect drop/switchLead() instructions
      if((race.contiguous_group_size == i) && ((rider_to_follow.distance_covered-rider_to_follow.start_offset) - (race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= settings.contiguous_group_drop_distance)){
        race.contiguous_group_size++;
      }

      race_rider.power_out = powerv;

      //can now save this power
      rider_power_data[race.current_order[i]].push(powerv);

      //dk2021 set the log info
      race_rider.step_info = "(" + target_power + "|" + powerv + "|" + race_rider.aero_A2 + "|" + race_rider.accumulated_fatigue + "|" + race_rider.endurance_fatigue_level + "|" + race_rider.output_level + ")";

      //fatigue if over the threshold, recover if under
      if (race_rider.power_out < race_rider.threshold_power ){
        //recover if going under the threshold
        if (race_rider.endurance_fatigue_level > 0){
          let recovery_power_rate = 1;
          if (settings.recovery_power_rate){
            recovery_power_rate = settings.recovery_power_rate;
          }
          let recovery_rate_to_use = race_rider.recovery_rate;
          if(USE_TEST_recovery_rate == 1){
            recovery_rate_to_use = TEST_recovery_rate;
          }
          let recovery_amount = recovery_rate_to_use* Math.pow(( (race_rider.threshold_power- race_rider.power_out)/race_rider.threshold_power),recovery_power_rate);

           race_rider.endurance_fatigue_level -= recovery_amount
          //donalK25: update the recovery_mode_recovery_so_far amount
          let recovery_amount_required_after_fatigue = DEFAULT_recovery_amount_required_after_fatigue; //default
          if (typeof(race_rider.recovery_amount_required_after_fatigue) != 'undefined'){
            recovery_amount_required_after_fatigue =  race_rider.recovery_amount_required_after_fatigue;
          }

          let recovery_amount_required_after_fatigue_to_use = recovery_amount_required_after_fatigue;
          if(USE_TEST_recovery_amount_required_after_fatigue == 1){
            recovery_amount_required_after_fatigue_to_use = TEST_recovery_amount_required_after_fatigue;
          }

          race_rider.recovery_mode_recovery_so_far += recovery_amount;
          if(race_rider.recovery_mode_recovery_so_far >= recovery_amount_required_after_fatigue_to_use  || race_rider.endurance_fatigue_level <= 0){
            race_rider.recovery_mode = 0; //should exit the fatigue cycle
            race_rider.recovery_mode_recovery_so_far = 0;
          }
          if (race_rider.endurance_fatigue_level < 0){ race_rider.endurance_fatigue_level = 0;};
        }
      }
      else{
        //add fatigue if going harder than the threshold
      //  let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/race_rider.max_power),settings.fatigue_power_rate);
        let fatigue_rate_to_use = race_rider.fatigue_rate;
        if(USE_TEST_fatigue_rate == 1){
          fatigue_rate_to_use = TEST_fatigue_rate;
        }

        let fatigue_rise = fatigue_rate_to_use*Math.pow(( (race_rider.power_out- race_rider.threshold_power)/(race_rider.max_power-race_rider.threshold_power)),settings.fatigue_power_rate);

        race_rider.endurance_fatigue_level += fatigue_rise
        race_rider.accumulated_fatigue += fatigue_rise;
      }

      //dk23 check for choke_under_pressure failure
      //note this will apply in the  next step
      if (race.instruction_noise_choke_under_pressure_r[race.race_clock]){
        //is this the correct rider?
        let rider = -1;
        let changes = race.instruction_noise_choke_under_pressure_r[race.race_clock];
        for(let cup = 0; cup < changes.length;cup+=2){
          if (changes[cup+1]){
            if (changes[cup] == race.current_order[i]){ //this is the rider to target

              console.log(" >*>*>*>*>*>*>*>*> Choke Under Pressure Noise failure chasing rider " + race.current_order[i] + " : race_rider.threshold_power changed from " + race_rider.threshold_power + " to " + (race_rider.threshold_power-(race_rider.threshold_power * changes[cup+1])) + " race_rider.max_power changed from " + race_rider.max_power + " to " + (race_rider.max_power - (race_rider.max_power * changes[cup+1])));
              race_rider.threshold_power -= (race_rider.threshold_power * changes[cup+1]);
              race_rider.max_power -= (race_rider.max_power * changes[cup+1]);
            }
          }
        }
        //target_power = target_power - (target_power * failure_p);
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

       $("#rider_values_"+i).html("<div class='info_column ic_header'><div class='circle' style='background-color:"+display_rider.colour+"'> </div>" + display_rider.name + "<span class = 'rider_aim'>" + display_rider.current_aim.toUpperCase() +  ((i==race.current_order.length-2)?' <i class="fas fa-flag-checkered"></i>':'') + "</span></div><div class='info_column'>"+Math.round(display_rider.distance_covered * 100)/100 + "m</div><div class='info_column'>"+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph ("+display_rider.velocity+" m/s) </div><div class='info_column'>"+ Math.round(display_rider.power_out * 100)/100 + " / "  +display_rider.threshold_power + " / " + display_rider.max_power + " watts</div>" + "<div class='info_column'>"+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m</div>" + "<div class='info_column'>" + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) + "(" + Math.round(display_rider.rider_fatigue_failure_level) +  ")</div><div class='info_column'>" + display_rider.time_on_front + " ( " + DecimalPrecision.round((display_rider.time_on_front / race.race_clock)*100,2) + " %) </div>");

      if(settings.log_each_step || debug_log_specific_timesteps.includes(race.race_clock)){
        logMessage += " " + race.race_clock + " | " + display_rider.name + " " + display_rider.current_aim.toUpperCase() +  ((i==race.current_order.length-2)?' |F|':'') + " | " + Math.round(display_rider.distance_covered * 100)/100 + "m | "+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph | "+ Math.round(display_rider.power_out * 100)/100 + " / "  + display_rider.threshold_power + " / " + display_rider.max_power + " watts | "+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m | " + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) + "(" + Math.round(display_rider.rider_fatigue_failure_level) + ") |||| " + display_rider.step_info;
      }
    }
    if(settings.log_each_step || debug_log_specific_timesteps.includes(race.race_clock)){
      console.log(logMessage);
    }

    race.race_clock++;
  //work out the distance covered of the second last rider
  //get the 2nd last rider (whose time is the one that counts)

  //dk: change this from:  let second_last_rider = race.riders[race.current_order[race.current_order.length-2]];
  // set the second_last_rider based on the actual distance covered.
  //create a separate array to do the sorting, and fill it with simple objects
  let riders_to_sort = [];
  for(let i_r = 0;i_r < race.riders.length; i_r++){
    riders_to_sort[i_r] = {rider: race.current_order[i_r],distance_covered: race.riders[race.current_order[i_r]].distance_covered};
  }
  //console.log("£££  riders_to_sort before sorting £££" + JSON.stringify(riders_to_sort));

  //sort based on distance_covered
  riders_to_sort.sort((a, b) => (a.distance_covered < b.distance_covered) ? 1 : -1);

  //console.log("£££  riders_to_sort after sorting  £££" + JSON.stringify(riders_to_sort));

  //dksep24: increment time_on_front of leading rider
  race.riders[riders_to_sort[0].rider].time_on_front++;

  //set the second_last_rider using this distance based ordering
  let second_last_rider = race.riders[riders_to_sort[riders_to_sort.length-2].rider];

  continue_racing = true;

    //console.log("FINISH RACE? second_last_rider.distance_covered " + second_last_rider.distance_covered);

  if (second_last_rider.distance_covered > race.distance ){

    //all riders ahead of the second_last_rider in the current order must be ahead on the track- otherwise the race goes on... (ignore the last rider)
    let all_riders_ahead = true;

    for (let x = 0; x < riders_to_sort.length-2; x++ ){
      // also need to use distance-based ordering here
      // if(race.riders[race.current_order[x]].distance_covered < second_last_rider.distance_covered && race.riders[race.current_order[x]].distance_covered <= race.distance){
      if(race.riders[riders_to_sort[x].rider].distance_covered < second_last_rider.distance_covered && race.riders[riders_to_sort[x].rider].distance_covered <= race.distance){
        all_riders_ahead = false;
      }
    }

    if(all_riders_ahead){ //race is finished right? you have done the distance and the others are still in front
      continue_racing = false;

      // dk20sep15: work out the finish time (to 3 digits) note i use the DecimalPrecision.round() function to do the rounding.
      let extra_distance_covered = second_last_rider.distance_covered - race.distance;

      console.log("** race finish time adjustment *** race_clock " + race.race_clock + " second_last_rider.distance_covered " + second_last_rider.distance_covered + " race.distance " + race.distance + " second_last_rider.velocity " + second_last_rider.velocity);

      let finish_time = DecimalPrecision.round(((race.race_clock-1) - (extra_distance_covered/second_last_rider.velocity)),3);

      $("#race_info").html("<strong>Race finished: </strong>"+ finish_time + " seconds, (" + second_last_rider.distance_covered + "m after " + (race.race_clock-1) + " seconds");
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

  race.instruction_noise_alterations_r = {};

  //donalK25: set the new global for the acceleration calculations (default to OFF/0)
  if (typeof(settings.power_application_include_acceleration) != 'undefined'){
    power_application_include_acceleration = settings.power_application_include_acceleration;
  }


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
    //donalK25: set the failure ceiling, May 25
    load_rider.rider_fatigue_failure_level = settings.fatigue_failure_level;
    if(USE_TEST_fatigue_failure_level == 1){
      load_rider.rider_fatigue_failure_level = TEST_fatigue_failure_level;
    }

    if (typeof(settings.default_starting_effort_level) != 'undefined'){
      load_rider.output_level = settings.default_starting_effort_level;
    }

    load_rider.recovery_mode = 0;

    //set up the aero properties so they don't have to be recalculated
    load_rider.air_density = (1.293 - 0.00426 * settings.temperaturev) * Math.exp(-settings.elevationv / 7000.0);
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

    load_rider.time_on_front = 0; //dksep24: want to track how much time each rider spends at the front.

    //dk2021 new rider property to add info to the log message
    load_rider.step_info = "";

    //initializt ehr recovery props
    load_rider.recovery_mode = 0;
    load_rider.recovery_mode_recovery_so_far = 0;

  }

  //load instrucitons from textarea
  race.race_instructions_r =[];
  let instructions_t = [];
  let new_instructions = $('#instructions_textarea').val();
  if(new_instructions.length > 5){
    //instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
    instructions_t = JSON.parse(new_instructions);
    console.log("load instructions");
  }
  if (instructions_t.length > 0){
    race.race_instructions_r = instructions_t;
}

  //load instruction noise from textarea
  race.instruction_noise_alterations_r = {};
  let instruction_noise_alterations = {};
  let instruction_noise_alterations_string = $('#instruction_noise_alterations_textarea').val();

  if(instruction_noise_alterations_string.length > 5){
    //instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
    instruction_noise_alterations = JSON.parse(instruction_noise_alterations_string);
  }
  if (!(Object.keys(instruction_noise_alterations).length === 0 && instruction_noise_alterations.constructor === Object)){ //i.e. if it is a non-empty object
    race.instruction_noise_alterations_r = instruction_noise_alterations;
    console.log("loaded noise alterations from textarea: " + JSON.stringify(race.instruction_noise_alterations_r) );
  }

  //load performance failures from textarea
  race.performance_failures_r = {};
  let performance_failures_t = {};
  let performance_failures_string = $('#performance_failures_textarea').val();
  if(performance_failures_string.length > 5){
    //instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
    performance_failures_t = JSON.parse(performance_failures_string);
  }
  if (!(Object.keys(performance_failures_t).length === 0 && performance_failures_t.constructor === Object)){ //i.e. if it is a non-empty object
    race.performance_failures_r = performance_failures_t;
    console.log("loaded performance failures from textarea: " + JSON.stringify(race.performance_failures_r) );
  }

  //load choke under pressure failures from textarea
  race.instruction_noise_choke_under_pressure_r = {};
  let instruction_noise_choke_under_pressure_t = {};
  let instruction_noise_choke_under_pressure_string = $('#instruction_noise_choke_under_pressure_textarea').val();
  if(instruction_noise_choke_under_pressure_string.length > 3){
      instruction_noise_choke_under_pressure_t = JSON.parse(instruction_noise_choke_under_pressure_string);
  }
  if (!(Object.keys(instruction_noise_choke_under_pressure_t).length === 0 && instruction_noise_choke_under_pressure_t.constructor === Object)){ //i.e. if it is a non-empty object
    race.instruction_noise_choke_under_pressure_r = instruction_noise_choke_under_pressure_t;
    console.log("loaded choke under pressure failures/noise from textarea: " + JSON.stringify(race.instruction_noise_choke_under_pressure_r) );
  }

  //load overeagerness
  race.instruction_noise_overeagerness_r = {};
  let instruction_noise_overeagerness_t = {};
  let instruction_noise_overeagerness_string = $('#instruction_noise_overeagerness_textarea').val();
  if(instruction_noise_overeagerness_string.length > 3){
      instruction_noise_overeagerness_t = JSON.parse(instruction_noise_overeagerness_string);
  }
  if (!(Object.keys(instruction_noise_overeagerness_t).length === 0 && instruction_noise_overeagerness_t.constructor === Object)){ //i.e. if it is a non-empty object
    race.instruction_noise_overeagerness_r = instruction_noise_overeagerness_t;
    console.log("loaded overeagerness failures/noise from textarea: " + JSON.stringify(race.instruction_noise_choke_under_pressure_r) );
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
  $("#show_power_data").on("click",show_power_data);
  $("#saveGraphAsPng").on('click',saveGraphAsPng);
  $("#clearCanvas").on('click',clearCanvas);

  console.log("load details from URL");

  load_details_from_url();
  if(LOG_EACH_STEP_OVERRIDE){
    settings.log_each_step = LOG_EACH_STEP_OVERRIDE;
  }


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

      if(continue_racing && race_state == "pause"){
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

          $("#global_settings").val(data[0].global_settings);
          $("#race_settings").val(data[0].race_settings);
          $("#rider_settings").val(data[0].rider_settings);

          $("#database_connection_label").html("<strong>Loaded Settings "+data[0].name+"</strong> | _id | <span id = 'settings_id'>"+data[0]._id);
          $("#new_settings_name").val(data[0].name);

          //set the id (global)
          selected_settings_id = data[0]._id;


          //set the start order and instructions
          let start_order_from_url = url.searchParams.get("startorder");
          let instructions_from_url = url.searchParams.get("instructions");
          let instruction_noise_alterations_from_url = url.searchParams.get('noise_alterations');
          let performance_failures_from_url = url.searchParams.get('performance_failures');
          //dk23 choke_under_pressure new noise type
          let instruction_noise_choke_under_pressure_from_url = url.searchParams.get('instruction_noise_choke_under_pressure');
          let instruction_noise_overeagerness_from_url = url.searchParams.get('instruction_noise_overeagerness');

          if(start_order_from_url.length > 0){
            console.log("loaded start_order from URL: " + start_order_from_url);
            $("#teamorder").val(start_order_from_url);
          }
          if(instructions_from_url.length > 0){
            console.log("loaded instructions from URL: " + instructions_from_url);
            $("#instructions_textarea").val(instructions_from_url);
          }


          //donalK25: check if this objet exists first
          if(instruction_noise_alterations_from_url){
          if(!(Object.keys(instruction_noise_alterations_from_url).length === 0 && instruction_noise_alterations_from_url.constructor === Object)){
            console.log("loaded instruction_noise_alterations from URL: " + JSON.stringify(instruction_noise_alterations_from_url));
            $("#instruction_noise_alterations").val(instruction_noise_alterations_from_url);
          }
        }

          if(performance_failures_from_url){
          if(!(Object.keys(performance_failures_from_url).length === 0 && performance_failures_from_url.constructor === Object)){
            console.log("loaded performance_failures from URL: " + JSON.stringify(performance_failures_from_url));
            $("#performance_failures_textarea").val(performance_failures_from_url);
          }
        }

        if(instruction_noise_choke_under_pressure_from_url){
          if(!(Object.keys(instruction_noise_choke_under_pressure_from_url).length === 0 && instruction_noise_choke_under_pressure_from_url.constructor === Object)){
            console.log("loaded instruction_noise_choke_under_pressure_from_url from URL: " + JSON.stringify(instruction_noise_choke_under_pressure_from_url));
            $("#instruction_noise_choke_under_pressure_textarea").val(instruction_noise_choke_under_pressure_from_url);
          }
        }
        if(instruction_noise_overeagerness_from_url){
          if(!(Object.keys(instruction_noise_overeagerness_from_url).length === 0 && instruction_noise_overeagerness_from_url.constructor === Object)){
            console.log("loaded instruction_noise_overeagerness_from_url from URL: " + JSON.stringify(instruction_noise_overeagerness_from_url));
            $("#instruction_noise_overeagerness_textarea").val(instruction_noise_overeagerness_from_url);
          }
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
          settings = JSON.parse(data[0].global_settings);
          race = JSON.parse(data[0].race_settings);
          riders = JSON.parse(data[0].rider_settings);

          $("#global_settings").val(data[0].global_settings);
          $("#race_settings").val(data[0].race_settings);
          $("#rider_settings").val(data[0].rider_settings);

          $("#database_connection_label").html("<strong>Loaded Settings From Results"+data[0].settings_name+"</strong> + [ "+ data[0].notes +" ] | _id | <span id = 'settings_id'>"+data[0]._id);
          $("#new_settings_name").val(data[0].settings_name);

          //set the id (global)
          selected_results_id = data[0]._id;


          //set the start order and instructions
          let start_order_from_url = url.searchParams.get("startorder");
          let instructions_from_url = url.searchParams.get("instructions");
          let instruction_noise_alterations_from_url = url.searchParams.get('noise_alterations');
          let performance_failures_from_url = url.searchParams.get('performance_failures');
          //dk23 choke_under_pressure new noise type
          let instruction_noise_choke_under_pressure_from_url = url.searchParams.get('instruction_noise_choke_under_pressure');
          //dk23Aug overeagerness as noise
          let instruction_noise_overeagerness_from_url = url.searchParams.get('instruction_noise_overeagerness');

          if(LOG_EACH_STEP_OVERRIDE){
            settings.log_each_step = LOG_EACH_STEP_OVERRIDE;
          }


          if(start_order_from_url.length > 0){
            console.log("loaded start_order from URL: " + start_order_from_url);
            $("#teamorder").val(start_order_from_url);
          }
          if(instructions_from_url.length > 0){
            console.log("loaded instructions from URL: " + instructions_from_url);
            $("#instructions_textarea").val(instructions_from_url);
          }
          if(!(Object.keys(instruction_noise_alterations_from_url).length === 0 && instruction_noise_alterations_from_url.constructor === Object)){
            console.log("loaded instruction_noise_alterations from URL: " + JSON.stringify(instruction_noise_alterations_from_url));
            $("#instruction_noise_alterations_textarea").val(instruction_noise_alterations_from_url);
          }
          if(!(Object.keys(performance_failures_from_url).length === 0 && performance_failures_from_url.constructor === Object)){
            console.log("loaded performance_failures from URL: " + JSON.stringify(performance_failures_from_url));
            $("#performance_failures_textarea").val(performance_failures_from_url);
          }
          if(!(Object.keys(instruction_noise_choke_under_pressure_from_url).length === 0 && instruction_noise_choke_under_pressure_from_url.constructor === Object)){
            console.log("loaded instruction_noise_choke_under_pressure_from_url from URL: " + JSON.stringify(instruction_noise_choke_under_pressure_from_url));
            $("#instruction_noise_choke_under_pressure_textarea").val(instruction_noise_choke_under_pressure_from_url);
          }
          if(!(Object.keys(instruction_noise_overeagerness_from_url).length === 0 && instruction_noise_overeagerness_from_url.constructor === Object)){
            console.log("loaded instruction_noise_overeagerness_from_url from URL: " + JSON.stringify(instruction_noise_overeagerness_from_url));
            $("#instruction_noise_overeagerness_textarea").val(instruction_noise_overeagerness_from_url);
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

function show_power_data(){
  let raw_data = JSON.stringify(rider_power_data);

  //also display it in a vertical format with a line per generation
  let data_vertical = "";
  for(let i = 0; i < rider_power_data[0].length; i++){
    if (rider_power_data[0][i] && rider_power_data[1][i] && rider_power_data[2][i] && rider_power_data[3][i]){
      data_vertical += i + "\t" + rider_power_data[0][i].toString().padEnd(6) + "\t" + rider_power_data[1][i].toString().padEnd(6) + "\t" + rider_power_data[2][i].toString().padEnd(6) + "\t" + rider_power_data[3][i].toString().padEnd(6) + "\n";
    }
  }
  $('#data_display').val("Data for GAME race  \n\n" + raw_data + "\n\nGAME: Vertical Format by Timestep\n" + data_vertical);
}


function draw_line_graph(graph_name_opt){

    let graph_name = graph_name_opt;

    let rider_colours = ['#648FFF','#785EF0','#DC267F','#FE6100','#FFB000'];
    let rider_line_styles = ['1, 0','2, 1','5,3','12,3','18,4'];
    let rider_line_stroke_width = [1,1.5,2,2.5,2.8];


    switch(graph_name) {
    case "power_graph":

      let graph_title ="unknown";
      let graph_data_1 = {};
      let graph_data_2 = {};
      let graph_data_3 = {};
      let graph_data_4 = {};
      let graph_data_5 = {};
      let raw_data = [];

      //set the data based on the selection
      if (graph_name=="power_graph"){

        graph_title = "Rider Power Output";
        graph_data_1 = {};

        graph_data_1.title = "Rider 1";

        //dk23aug get the rider title from data
        if(race.riders){
          if(race.riders[0]){
            if(race.riders[0].name){
              graph_data_1.title = race.riders[0].name;
            }
            if(race.riders[0].colour){
              rider_colours[0] = race.riders[0].colour;
            }
          }
        }
        graph_data_1.x_label = "Timestep";
        graph_data_1.y_label = "Power (Watts)";

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
        if(race.riders){
          if(race.riders[1]){
            if(race.riders[1].name){
              graph_data_2.title = race.riders[1].name;
            }
            if(race.riders[1].colour){
              rider_colours[1] = race.riders[1].colour;
            }
          }
        }
        graph_data_2.data = [];
        for (let i=0;i<rider_power_data[1].length;i++){
          graph_data_2.data.push({x:i, y:rider_power_data[1][i]});
        }

        graph_data_3 = {};
        graph_data_3.title = "Rider 3";
        if(race.riders){
          if(race.riders[2]){
            if(race.riders[2].name){
              graph_data_3.title = race.riders[2].name;
            }
            if(race.riders[2].colour){
              rider_colours[2] = race.riders[2].colour;
            }
          }
        }
        graph_data_3.data = [];
        for (let i=0;i<rider_power_data[2].length;i++){
          graph_data_3.data.push({x:i, y:rider_power_data[2][i]});
        }

        graph_data_4 = {};
        graph_data_4.title = "Rider 4";
        if(race.riders){
          if(race.riders[3]){
            if(race.riders[3].name){
              graph_data_4.title = race.riders[3].name;
            }
            if(race.riders[3].colour){
              rider_colours[3] = race.riders[3].colour;
            }
          }
        }
        graph_data_4.data = [];
        for (let i=0;i<rider_power_data[3].length;i++){
          graph_data_4.data.push({x:i, y:rider_power_data[3][i]});
        }
      }

      //add data to a raw data output arrayFilters
      raw_data.push(graph_data_1.data);
      raw_data.push(graph_data_2.data);
      raw_data.push(graph_data_3.data);
      raw_data.push(graph_data_4.data);

      //display the raw data
      $('#data_display').val(JSON.stringify(raw_data));


      // ************** D3 BEGIN **************
      // set the dimensions and margins of the graph
      let totalWidth = `1000`;
      let totalHeight = 450;
      let legendLeftIndent = 20;
      let bulletIndent = 20;

      var margin = {top: 30, right: legendLeftIndent, bottom: 40, left: 60},
      width = totalWidth - margin.left - margin.right,
      height = totalHeight - margin.top - margin.bottom;
      const INNER_WIDTH  = totalWidth - margin.left - margin.right;
      const INNER_HEIGHT = totalHeight - margin.top - margin.bottom;
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
      console.log("width: " + width);
      var x = d3.scaleLinear()
      .domain([graph_data_1.x_scale_from, graph_data_1.x_scale_to])
      .range([ 0, width ]);
      // svg.append("g")
      // .attr("transform", "translate(0," + height + ")")
      // .call(d3.axisBottom(x));
      // Add Y axis
      var y = d3.scaleLinear()
      .domain([graph_data_1.y_scale_from, graph_data_1.y_scale_to])
      .range([ height, 0 ]);
      // svg.append("g")
      // .call(d3.axisLeft(y));
      // try to add grid lines
      const xAxis     = d3.axisBottom(x).ticks(10);
      const yAxis     = d3.axisLeft(y).ticks(10);
      const xAxisGrid = d3.axisBottom(x).tickSize(-INNER_HEIGHT).tickFormat('').ticks(10);
      const yAxisGrid = d3.axisLeft(y).tickSize(-INNER_WIDTH).tickFormat('').ticks(10);

      //add grids
      // svg.append('g')
      //   .attr('class', 'x axis-grid')
      //   .attr('transform', 'translate(0,' + INNER_HEIGHT + ')')
      //   .call(xAxisGrid);
      //  svg.append('g')
      //    .attr('class', 'y axis-grid')
      //    .call(yAxisGrid);
      // Create axes.
      svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + INNER_HEIGHT + ')')
        .call(xAxis);
      svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
        //end add grids

      // Add the line 1
      svg.append("path")
      .datum(graph_data_1.data)
      .attr("fill", "none")
      .attr("stroke", rider_colours[0])
      .attr("stroke-width", rider_line_stroke_width[0])
      .style("stroke-dasharray", rider_line_styles[0]) //dash for line disambiguation
      .attr("d", d3.line()
      .x(function(d) { return x(d.x) })
      .y(function(d) { return y(d.y) })
      );

      if (!jQuery.isEmptyObject(graph_data_2)){
      //draw second line if data is given
      svg.append("path")
      .datum(graph_data_2.data)
      .attr("fill", "none")
      .attr("stroke", rider_colours[1])
      .attr("stroke-width", rider_line_stroke_width[1])
      .style("stroke-dasharray", rider_line_styles[1])
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
      .attr("stroke", rider_colours[2])
      .attr("stroke-width", rider_line_stroke_width[2])
      .style("stroke-dasharray", rider_line_styles[2])
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
      .attr("stroke", rider_colours[3])
      .attr("stroke-width", rider_line_stroke_width[3])
      .style("stroke-dasharray", rider_line_styles[3])
      .attr("d", d3.line()
      .x(function(d) { return x(d.x) })
      .y(function(d) { return y(d.y) })
      );
      }
      if (!jQuery.isEmptyObject(graph_data_5)){
      //draw second line if data is given
      svg.append("path")
      .datum(graph_data_5.data)
      .attr("fill", "none")
      .attr("stroke", rider_colours[4])
      .attr("stroke-width", rider_line_stroke_width[4])
      .style("stroke-dasharray", rider_line_styles[4])
      .attr("d", d3.line()
      .x(function(d) { return x(d.x) })
      .y(function(d) { return y(d.y) })
      );}

      // X and Y labels
      svg.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .attr("x", width/2)
      .attr("y", height + 35)
      .text(graph_data_1.x_label); // e.g. "GA Generation"

      svg.append("text")
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("x", -150)
      .attr("y", -50)
      .attr("dy", ".75em")
      .attr("transform", "rotate(-90)")
      .text(graph_data_1.y_label); // e.g. "Race Finish Time (s)"

      //Colour Legend
      // svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",6).attr("r", 6).style("fill", "#0000ff");
      // svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 6).text(graph_data_1.title).style("font-size", "15px").attr("alignment-baseline","middle");
      //
      // if (!jQuery.isEmptyObject(graph_data_2)){
      //   svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",40).attr("r", 6).style("fill", "#ff0000");
      //   svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 40).text(graph_data_2.title).style("font-size", "15px").attr("alignment-baseline","middle");
      // }
      // if (!jQuery.isEmptyObject(graph_data_3)){
      //   svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",60).attr("r", 6).style("fill", "#00ff00");
      //   svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 60).text(graph_data_3.title).style("font-size", "15px").attr("alignment-baseline","middle");
      // }
      // if (!jQuery.isEmptyObject(graph_data_4)){
      //   svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",80).attr("r", 6).style("fill", "#000000");
      //   svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 80).text(graph_data_4.title).style("font-size", "15px").attr("alignment-baseline","middle");
      // }
      // if (!jQuery.isEmptyObject(graph_data_5)){
      //   svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",100).attr("r", 6).style("fill", "#00ffff");
      //   svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 100).text(graph_data_5.title).style("font-size", "15px").attr("alignment-baseline","middle");
      // }

      //try to dynamically sapce out the legend labels using their widths
      let legend_label_offset = 100;
      let legend_icon_gap = 12;
      let legend_line_length = 60;
      let legend_average_char_width = 16;
      let legend_gap_length = 10;
      let legend_line_segment_y = -22;

      svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[0]);
      svg.append("line")//making a line for legend
      .attr("x1", legend_label_offset)
      .attr("x2", legend_label_offset+legend_line_length)
      .attr("y1", legend_line_segment_y)
      .attr("y2", legend_line_segment_y)
      .attr("stroke-width", rider_line_stroke_width[0])
      .style("stroke-dasharray",rider_line_styles[0])//dashed array for line
      .style("stroke", rider_colours[0]);


      svg.append("text").attr("x", legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_1.title).style("font-size", "15px").attr("alignment-baseline","middle");

      if (!jQuery.isEmptyObject(graph_data_2)){
      legend_label_offset += (graph_data_1.title.length * legend_average_char_width) + legend_gap_length;

      svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[1]);

      svg.append("line")//making a line for legend
        .attr("x1", legend_label_offset)
        .attr("x2", legend_label_offset+legend_line_length)
        .attr("y1", legend_line_segment_y)
        .attr("y2", legend_line_segment_y)
        .attr("stroke-width", rider_line_stroke_width[1])
        .style("stroke-dasharray",rider_line_styles[1])
        .style("stroke", rider_colours[1]);

      svg.append("text").attr("x",legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_2.title).style("font-size", "15px").attr("alignment-baseline","middle");
      }
      if (!jQuery.isEmptyObject(graph_data_3)){
      legend_label_offset += (graph_data_2.title.length * legend_average_char_width) + legend_gap_length;

      svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[2]);

      svg.append("line")//making a line for legend
        .attr("x1", legend_label_offset)
        .attr("x2", legend_label_offset+legend_line_length)
        .attr("y1", legend_line_segment_y)
        .attr("y2", legend_line_segment_y)
        .attr("stroke-width", rider_line_stroke_width[2])
        .style("stroke-dasharray",rider_line_styles[2])
        .style("stroke", rider_colours[2]);

      svg.append("text").attr("x",legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_3.title).style("font-size", "15px").attr("alignment-baseline","middle");
      }
      if (!jQuery.isEmptyObject(graph_data_4)){
      legend_label_offset += (graph_data_3.title.length * legend_average_char_width) + legend_gap_length;

      svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[3]);

      svg.append("line")//making a line for legend
        .attr("x1", legend_label_offset)
        .attr("x2", legend_label_offset+legend_line_length)
        .attr("y1", legend_line_segment_y)
        .attr("y2", legend_line_segment_y)
        .attr("stroke-width", rider_line_stroke_width[3])
        .style("stroke-dasharray",rider_line_styles[3])
        .style("stroke", rider_colours[3]);

      svg.append("text").attr("x",legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_4.title).style("font-size", "15px").attr("alignment-baseline","middle");
      }
      if (!jQuery.isEmptyObject(graph_data_5)){
      legend_label_offset += (graph_data_4.title.length * legend_average_char_width) + legend_gap_length;

      svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[4]);

      svg.append("line")//making a line for legend
        .attr("x1", legend_label_offset)
        .attr("x2", legend_label_offset+legend_line_length)
        .attr("y1", legend_line_segment_y)
        .attr("y2", legend_line_segment_y)
        .attr("stroke-width", rider_line_stroke_width[4])
        .style("stroke-dasharray",rider_line_styles[4])
        .style("stroke", rider_colours[4]);

      svg.append("text").attr("x",legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_5.title).style("font-size", "15px").attr("alignment-baseline","middle");
      }
      //add a title
      // svg.append("text")
      // .attr("x", (width / 2))
      // .attr("y", 0 - (margin.top / 2))
      // .attr("text-anchor", "middle")
      // .style("font-size", "16px")
      // .style("font-style", "italic")
      // .text(selected_settings_name + ": " + graph_title);

      // ************** D3 END **************

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
