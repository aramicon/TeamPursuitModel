
//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data

import {settings_template} from './global_settings_template.js';
import {race_template} from './race_settings_template.js';
import {riders_template} from './riders_template.js';

//dk23Aug allow for targeted debugging of a rider and a timestep
let targeted_debugging = 0;
let targeted_debugging_rider_no = 3;
let targeted_debugging_timestep_range_start = 198;
let targeted_debugging_timestep_range_end = 198;

const STATUS_LANE_POSITIONS = {};

const STATUS_LANE_POSITIONS_BASE_POSITION = 180;

STATUS_LANE_POSITIONS.LEAD = 0;
STATUS_LANE_POSITIONS.FOLLOW = 0;
STATUS_LANE_POSITIONS.DROP = 3;
STATUS_LANE_POSITIONS.ATTACK = 0;
STATUS_LANE_POSITIONS.SPRINT = 0;
STATUS_LANE_POSITIONS.SOLO = 0;
STATUS_LANE_POSITIONS.CHASE = -2;
STATUS_LANE_POSITIONS.CAUGHT = 1;

const STATUS_LANE_POSITIONS_LANE_WIDTH = 12;

const BREAKAWAY_SWITCH_TO_LEAD_GAP_SIZE = 5;
const BREAKAWAY_SWITCH_TO_FOLLOW_GAP_SIZE = 5;

let LOG_EACH_STEP_OVERRIDE = 0;

let DEFAULT_recovery_amount_required_after_fatigue = 12;

let DEFAULT_TEAM_ORDER = "0,1,2,3";
const DISPLAY_LENGTH = 4800; //this is the main vis canvas property
const DEFAULT_ZOOM_SEGMENT_SIZE = 1000;
let CURRENT_ZOOM_SEGMENT_SIZE = 1000; //set this to the race length
let CURRENT_ZOOM_SEGMENT_NO = 0;
let SEGMENT_DISTANCE_MARKERS_TO_DRAW = 20;

const DEFAULT_RIDER_CIRCLE_RADIUS = 4;
const ZOOM_RIDER_CIRCLE_RADIUS = 8;


const SEGMENT_INFO_TEXT_Y_POSITION = 20
const SEGMENT_CHASING_PELOTON_Y_POSITION = 30
const SEGMENT_INFO_TEXT_FONT = "14px Arial";
const SEGMENT_INFO_TEXT_COLOUR = "#afdaed";
const CANVAS_BACKGROUND_COLOUR ="#fcfcf7";

// switch test values on/off
let USE_TEST_recovery_amount_required_after_fatigue = 0;
let USE_TEST_fatigue_rate = 0;
let USE_TEST_recovery_rate = 0;
let USE_TEST_fatigue_failure_level = 0;
let USE_TEST_accumulated_fatigue_maximum = 0;

//set test values

let TEST_recovery_amount_required_after_fatigue = 80;
let TEST_fatigue_rate = 12;
let TEST_recovery_rate = 55;
let TEST_fatigue_failure_level =  300;
let TEST_accumulated_fatigue_maximum = 770;

const DEFAULT_BREAKAWAY_MAX_SPRINT_DISTANCE = 400;
const CHASE_RESPONSE_MAX_DISTANCE = 30;



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

let step_speed = 0; //donalK25, changed from 60 to 0

let rider_power_data = []; //record power outpur of each rider to generate graph

let continue_racing = true; //false when race finishes

let use_lookup_velocity = false;

const toggleZoomMode = (checkboxElem) => {
  if (checkboxElem) {

    let input_zoom_segment_size = parseInt($('#zoom_segment_size').val());
    if(Number.isInteger(input_zoom_segment_size)){
      CURRENT_ZOOM_SEGMENT_SIZE = parseInt(input_zoom_segment_size);
      console.log("Zooming in with segment size " + CURRENT_ZOOM_SEGMENT_SIZE);
    }
  } else {
    CURRENT_ZOOM_SEGMENT_SIZE = race.distance;
    console.log("Zoom mode deactivated");
  }
}

function convert_to_ordinal(number){
  let number_as_string = ''+number;
  let lastChar = number_as_string.substr(number_as_string.length - 1);
  if(lastChar == "1"){
    return number_as_string + "st";
  }
  else if(lastChar == "2"){
    return number_as_string + "nd";
  }
  else if(lastChar == "3"){
    return number_as_string + "rd";
  }
  else{
    return number_as_string + "th";
  }
}


//* function to check if an object is empty
// based on the information in this stackoverflow: https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
function isEmpty(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

//*******************
//set up the sim speed.

var range = $('.input-range');
range.val(10-(step_speed/60));

range.on('input', function(){

    step_speed =(10 - this.value) * 60;
    console.log("step_speed "+ step_speed);
});


function calculate_linear_space_value(value_list, probability_variables){
  // value list contains sets of 4, each set representing a paramter in the expression, which is built using a loop
  //v1 - multiplier / (weighting?)
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
    else if((i+1)%4==0 && value_list[i] == 0){
      console.log("!!! error in calculate_linear_space_value MAX value is 0 at position " + i + ", will result in NaN!!!");
      continue_check = false;
      debugger;
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

    //be careful not to divide by 0
    if(sum_multipliers <= 0){
      sum_components = 0;
    }
    else{
      sum_components = (sum_components/sum_multipliers);
    }

    for(let i = 0; i<probability_variables.length;i++ ){
      probability_modifier_total *= probability_variables[i];
    }
    result = sum_components * probability_modifier_total;

  }
  return result;


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


function addRiderDisplay(){
  $("#riders_info" ).empty();
  $("#riders_info" ).append("<div id='rider_values_header' class='info_row'><div class='info_column' style='height:50px'>Rider <i class='fas fa-biking'></i></div><div class='info_column'>Dist. m</div><div class='info_column'>Vel. kph (m/s)</div><div class='info_column'>Watts</div><div class='info_column'>Gap m</div><div class='info_column'>Fatigue</div><div class='info_column'>Time Leading Race/Group</div><div class='info_column'>Group</div><div class='info_column'>Target</div></div>");
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
  // would need to select a rider??
  race_rider.drop_instruction = positions_to_drop_back;
}

function switchLead(positions_to_drop_back, rider_no){

  //get position of the rider to drop back
  let current_leader = rider_no;
  let rider_position = 0;

  let my_group = race.breakaway_riders_groups[current_leader];
  //don't issue a DROp if there is nobody else in your group
  let count_of_group_members = 0;

  //also, record the position of this rider in the group
  for(let i = 0; i < race.current_order.length; i++){
    if(current_leader == race.current_order[i]){
      rider_position = i;
    }
    if(race.breakaway_riders_groups[race.current_order[i]] == my_group){
      count_of_group_members++;
    }
  }

  if(count_of_group_members <= 1){
    console.log(race.race_clock + "** DROP instruction for " + race.riders[rider_no].name + " cancelled since group " + my_group + " has only " + count_of_group_members + " member(s).");
  }
  else{

    if (positions_to_drop_back >= (race.current_order.length-1)){
      positions_to_drop_back = (race.current_order.length-1);
    }

    if (settings.limit_drop_to_contiguous_group == 1){

      //look at the rider's in this rider's group... if the gap is over some agreed preset value, then consider then dropped and don't drop past them.
      let undropped_riders_behind_me_in_group = 0;
      for(let i=rider_position;i<race.current_order.length-1;i++){
        if(race.breakaway_riders_groups[race.current_order[i]] == my_group){
          let gap_to_next_rider =(race.riders[race.current_order[i]].distance_covered - race.riders[race.current_order[i+1]].distance_covered);
          if(gap_to_next_rider < settings.contiguous_group_drop_distance ){
            undropped_riders_behind_me_in_group++;
          }
        }

      }
      // if ((positions_to_drop_back) > (race.contiguous_group_size-1)){
      //   //e.g. ig group size is 3 you can at most drop back 2 (lead rider is 1)
      //   console.log("**** rider trying to drop back " + positions_to_drop_back + " but contiguous_group_size is " + race.contiguous_group_size);
      //   positions_to_drop_back = (race.contiguous_group_size-1);
      // }
      if ((positions_to_drop_back) > undropped_riders_behind_me_in_group){
        //e.g. ig group size is 3 you can at most drop back 2 (lead rider is 1)
        console.log("**** rider trying to drop back " + positions_to_drop_back + " but undropped_riders_behind_me_in_group is " + undropped_riders_behind_me_in_group);
        positions_to_drop_back = undropped_riders_behind_me_in_group;
      }
    }

    $("#race_info").html("<strong>Leader Drops Back</strong> by "+  positions_to_drop_back + " places");

    if(race.riders[current_leader].current_aim == "LEAD"){
      race.riders[current_leader].number_of_turns++;
    }

    race.riders[current_leader].current_aim = "DROP"; //separate status whilst dropping back


    let current_leader_power = race.riders[current_leader].power_out; //try to get the new leader to match this power
    let current_leader_velocity = race.riders[current_leader].velocity;
    // //need to get the theoretical velocity of the current leader for this timestep and use that as the target
    // //donalK25 #accel ------------
    // let current_leader_theoretical_velocity = velocity_from_power_with_acceleration(current_leader_power, settings.rollingRes, (race.riders[current_leader].weight + settings.bike_weight), 9.8, race.riders[current_leader].air_density, settings.frontalArea, current_leader_velocity, settings.transv);
    // //donalK25 #accel ------------ ||

    //adjust positions_to_drop_back if it is too big
    if((rider_position + positions_to_drop_back) >= race.current_order.length){
      positions_to_drop_back = (race.current_order.length - (rider_position+1));
    }
    if(positions_to_drop_back < 0){
      positions_to_drop_back = 0;
    }

    if(positions_to_drop_back > 0){
      let new_order = race.current_order.slice(0,rider_position); //insert any unchanged initial riders.
      new_order.push(...race.current_order.slice((rider_position+1),(rider_position + 1 + positions_to_drop_back))); //insert the riders that will move ahead of the leader
      new_order.push(current_leader); //insert the leader again
      new_order.push(...race.current_order.slice((rider_position + 1 + positions_to_drop_back))); //anything else at the end
      let original_order = race.current_order;
      race.current_order = new_order;
      //change other rider roles to lead and follow
      //cannot make a rider in a different group the new leader, need to only look at riders in the current group

      let new_leader = {};
      // if(rider_position > 0){
      //   debugger;
      // }
      for(let i = 0; i < new_order.length; i++){
        if(race.breakaway_riders_groups[new_order[i]] == my_group){
          new_leader = race.riders[new_order[i]];
          break;
        }
      }

      if(!isEmpty(new_leader)){
        new_leader.current_aim = "LEAD";
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

        //if new leader has a cooperation effort level, set its effort to this
        if(typeof(new_leader.breakaway_cooperation_effort_level) != "undefined"){
          new_leader.output_level = new_leader.breakaway_cooperation_effort_level;
        }
        else{

          //donLK25: get the target_power using the old leader output level
          let power_from_output_level_old_leader = mapEffortToPower(settings.threshold_power_effort_level, race.riders[current_leader].output_level, race.riders[current_leader].threshold_power, race.riders[current_leader].max_power, settings.maximum_effort_value);

          new_leader.output_level = mapPowerToEffort(settings.threshold_power_effort_level, power_from_output_level_old_leader, new_leader.threshold_power, new_leader.max_power, settings.maximum_effort_value);
        }
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
    }
    //console.log("new_leader.output_level = "+ new_leader.output_level);
    //update other riders to follow, but only in the same group

    // for(let i=0;i<new_order.length;i++){
    //   if (new_order[i] != current_leader && race.breakaway_riders_groups[new_order[i]] == my_group){ //don't update the dropping back rider
    //     race.riders[new_order[i]].current_aim = "FOLLOW";
    //     //reset their power levels, though chasing riders will always try to follow
    //     race.riders[new_order[i]].current_power_effort = race.riders[new_order[i]].threshold_power;
    //   }
    // }
    console.log("||||||||||| DROP: original_order " + original_order + " move " + current_leader + " back " + positions_to_drop_back + " positions, new order " + new_order + " |||||||||||");
    }
}

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
    for(let i=0;i<new_instructions.length;i++){
      let inst = new_instructions[i][1].split("=");
      if (inst.length=2){
        if(inst[0]=="effort"){
          race.live_instructions.push(["effort",parseFloat(inst[1])]);
          console.log(race.race_clock + " **FOUND INSTRUCTION** EFFORT: " + parseFloat(inst[1]));
        }
        else if(inst[0]=="drop"){

          //update the RIDER drop instruciton
            let rider_no = new_instructions[i][2];
            if(typeof(rider_no) != "undefined"){
              race.riders[rider_no].drop_instruction = parseInt(inst[1]);
            }
            else{
                alert("CANNOT ADD DROP INSTRUCTION: NO RIDER SPECIFIED!");
            }

          console.log(race.race_clock + " **FOUND INSTRUCTION** DROP: " + parseInt(inst[1]) + " rider " + race.riders[rider_no].name);
        }
      }
    }
  }

  //carry out any live_instructions (they are queued)
  while (race.live_instructions.length > 0){
    let instruction = race.live_instructions.pop();

    if(instruction[0]=="effort"){
      let instruction_effort_level = instruction[1];

      //dk: check for invalid values
      if(instruction_effort_level < settings.minimum_power_output){
        console.log("WARNING! effort instruction < 1, updating to minimum 1");
        instruction_effort_level = settings.minimum_power_output;
      }
      else if(instruction_effort_level > settings.maximum_effort_value){
          console.log("WARNING!effort instruction > max value, updating to maximum from settings.maximum_effort_value");
        instruction_effort_level = settings.maximum_effort_value;
      }
      setEffort(instruction_effort_level);
      $("#instruction_info_text").text(race.race_clock + " - Effort updated to " + instruction_effort_level);
      //console.log(race.race_clock + " Effort instruction " + instruction[1] + " applied ")
    }
  }

  //************ update rider properties if entries exist that match their distance cocered ***************
  for(let i = 0;i<race.riders.length;i++){
    let distance_remaining = race.distance - race.riders[i].distance_covered;
    if(race.riders[i].in_race_updates_stack.length > 0){
        let next_change_element = race.riders[i].in_race_updates_stack[0];
        while(next_change_element && next_change_element[0] >= distance_remaining){
          //pop from array
          let change_element = race.riders[i].in_race_updates_stack.shift();
          let rider_prop_change = change_element[1].split("=");
          //does the rider have the property?
          if(typeof(race.riders[i][rider_prop_change[0]] != "undefined")){
            let dataType = typeof(race.riders[i][rider_prop_change[0]]);
              //if it's a number property, can cast it?
            if(dataType == "number"){
              race.riders[i][rider_prop_change[0]] = Number(rider_prop_change[1]);
              console.log("++++++++++++++++++++ +  +   +: "+ race.race_clock + " " +   race.riders[i].name + " updating " + rider_prop_change[0] + " to " + rider_prop_change[1] + " as NUMBER");
              }
            else{ //assume it's a string?
                race.riders[i][rider_prop_change[0]] = rider_prop_change[1];
                console.log("++++++++++++++++++++ +  +   +: "+ race.race_clock + " " +   race.riders[i].name + " updating " + rider_prop_change[0] + " to " + rider_prop_change[1] + " as STRING");
            }
          }
          next_change_element = race.riders[i].in_race_updates_stack[0];
        }
    }
  }

  //also look at the drop instruciton: unlike the track race there can be multiple drops, one per rider per timestep, and they are immediately carried out
  //unlike on the track, each rider can have their own drop instruction
  for(let i = 0;i<race.riders.length;i++){
    if(race.riders[i].drop_instruction > 0){
    //  console.log(race.race_clock + " drop instruction queued " + race.drop_instruction);
    //  if (race.riders.filter(a=>a.current_aim == "DROP").length == 0){   //if no  rider is currently dropping back
        //let lead_rider_distance_on_lap = race.riders[race.current_order[0]].distance_covered % settings.track_length;
        //let distance_travelled_last_step = race.riders[race.current_order[0]].velocity;
        //console.log(race.race_clock + " distance_travelled_last_step " + distance_travelled_last_step + " lead_rider_distance_on_lap " + lead_rider_distance_on_lap + ", race.bend1_switch_start_distance " + race.bend1_switch_start_distance + ", race.bend1_switch_end_distance" + race.bend1_switch_end_distance + ", race.bend2_switch_start_distance" + race.bend2_switch_start_distance + ", race.bend2_switch_end_distance " + race.bend2_switch_end_distance);

        // if ((lead_rider_distance_on_lap > race.bend1_switch_start_distance && lead_rider_distance_on_lap < race.bend1_switch_end_distance) || (lead_rider_distance_on_lap > race.bend1_switch_end_distance && (lead_rider_distance_on_lap-distance_travelled_last_step)<=race.bend1_switch_start_distance) || (lead_rider_distance_on_lap > race.bend2_switch_start_distance && lead_rider_distance_on_lap < race.bend2_switch_end_distance) || (lead_rider_distance_on_lap > race.bend2_switch_end_distance && (lead_rider_distance_on_lap-distance_travelled_last_step)<=race.bend2_switch_start_distance) ){
        //   //console.log(race.race_clock +  " OK TO DROP BACK: switchLead(race.drop_instruction) ");
        //   switchLead(race.drop_instruction);
        //   $("#instruction_info_text").text(race.race_clock + " - DROP back " + race.drop_instruction);
        //   race.drop_instruction = 0;
        // }
        //note that this function changes race.current_order!
        switchLead(race.riders[i].drop_instruction,i);
        $("#instruction_info_text").text(race.race_clock + " " + race.riders[i].name + " - DROP back " + race.riders[i].drop_instruction);
        race.riders[i].drop_instruction = 0;
      //}
    }
  }
  //race.contiguous_group_size = 1;

  //need to update the peloton position BEFORE updating rider positions and aims
  race.chasing_bunch_current_position += race.chasing_bunch_speed;

  // ************* draw a segment end line and a finish line START (but only if it will be visible on this segment)***********
  //set the canvas background colour
  ctx.fillStyle = CANVAS_BACKGROUND_COLOUR;
  ctx.fillRect(0, 0, c.width, c.height);

  //draw basic end of segment line

  let distance_end_of_segment = settings.track_centre_x + ((DISPLAY_LENGTH - settings.track_centre_x));

  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  let race_finish_point = distance_end_of_segment;
  ctx.moveTo(race_finish_point, 0);
  ctx.lineTo(race_finish_point, 200);
  ctx.strokeStyle = "#FFA500";
  ctx.stroke();

// draw distance markers
for(let ix = 0; ix < SEGMENT_DISTANCE_MARKERS_TO_DRAW; ix++){
  let distance_point = (ix/SEGMENT_DISTANCE_MARKERS_TO_DRAW);
  let distance_mapped_to_display = settings.track_centre_x + ((distance_point) * (DISPLAY_LENGTH - settings.track_centre_x));
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(distance_mapped_to_display, 0);
  ctx.lineTo(distance_mapped_to_display, 200);
  ctx.strokeStyle = "#cccccc";
  ctx.stroke();

  //draw text
  ctx.font = SEGMENT_INFO_TEXT_FONT;
  let metres_point = CURRENT_ZOOM_SEGMENT_NO*CURRENT_ZOOM_SEGMENT_SIZE + distance_point*CURRENT_ZOOM_SEGMENT_SIZE;
  ctx.fillStyle = SEGMENT_INFO_TEXT_COLOUR;
  ctx.strokeStyle = SEGMENT_INFO_TEXT_COLOUR;
  ctx.fillText(metres_point + "m",distance_mapped_to_display + 4,SEGMENT_INFO_TEXT_Y_POSITION);
}



  //is the finish line in the current segment?
  if(race.distance <= ((CURRENT_ZOOM_SEGMENT_NO*CURRENT_ZOOM_SEGMENT_SIZE)+CURRENT_ZOOM_SEGMENT_SIZE)){

    let distance_in_segment = race.distance - (CURRENT_ZOOM_SEGMENT_SIZE*CURRENT_ZOOM_SEGMENT_NO);
    let distance_mapped_to_display = settings.track_centre_x + ((distance_in_segment/CURRENT_ZOOM_SEGMENT_SIZE) * (DISPLAY_LENGTH - settings.track_centre_x));

    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    let race_finish_point = distance_mapped_to_display;
    ctx.moveTo(race_finish_point, 0);
    ctx.lineTo(race_finish_point, 200);
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ************* draw a finish line END ***********

  // ******** draw Chasing peloton START
    if(race.chasing_bunch_current_position > ((CURRENT_ZOOM_SEGMENT_NO*CURRENT_ZOOM_SEGMENT_SIZE))){

      let distance_in_segment = race.chasing_bunch_current_position - (CURRENT_ZOOM_SEGMENT_SIZE*CURRENT_ZOOM_SEGMENT_NO);
      let distance_mapped_to_display = settings.track_centre_x + ((distance_in_segment/CURRENT_ZOOM_SEGMENT_SIZE) * (DISPLAY_LENGTH - settings.track_centre_x));

      if (race.chasing_bunch_current_position > 0){
        ctx.beginPath();
        ctx.moveTo(settings.track_centre_x, SEGMENT_CHASING_PELOTON_Y_POSITION);
        ctx.lineTo(distance_mapped_to_display, SEGMENT_CHASING_PELOTON_Y_POSITION);
        ctx.strokeStyle = "green";
        ctx.lineWidth = 10;
        ctx.stroke();
      }
    }
  // ******** drawing end *******************


  for(let i=0;i<race.current_order.length;i++){
    let race_rider = race.riders[race.current_order[i]];
    //work out how far the race_rider can go in this time step
    //work out basic drag from current volocity = CdA*p*((velocity**2)/2)

    race_rider.rider_to_follow = {}; //reset this every timestep (following)

    //log the rider's current aim
    race_rider.current_aim_history.push(race_rider.current_aim);

    let accumulated_effect = 1; // for accumulated fatigue effect on rider. 1 means no effect, 0 means total effect, so no more non-sustainable effort is possible
    race_rider.aero_A2 = Math.round((0.5 * settings.frontalArea * race_rider.air_density)*10000)/10000;   // full air resistance parameter
    race_rider.step_info = ""; //dk2021 used to add logging info

    //rider organization changes a lot for a breakaway.

    //if sprinting you just go go go at a very high level (max?) until the race ends.
    if(race_rider.current_aim == "SPRINT"){
      race_rider.output_level = race_rider.breakaway_sprint_effort_level;
      if(race_rider.output_level > settings.maximum_effort_value){
        race_rider.output_level = settings.maximum_effort_value;
      }
    }
    else if(race_rider.current_aim == "ATTACK" && race_rider.breakaway_attack_duration_elapsed == 0){
      //check if the rider is starting an attack. if so, need to set an effort level.
      race_rider.output_level += race_rider.breakaway_attack_effort_level_increase;
      if(race_rider.output_level > settings.maximum_effort_value){
        race_rider.output_level = settings.maximum_effort_value;
      }
      console.log(race_rider.name + " starting ATTACK with output level " + race_rider.output_level);
    }
    else if(race_rider.current_aim =="ATTACK" && race_rider.breakaway_attack_duration_elapsed >= race_rider.breakaway_attack_duration){
      //attack finishes and the rider needs to transition to "SOLO" mode IF they 'have a gap'
      race_rider.current_aim = "SOLO";
      race_rider.output_level = race_rider.breakaway_solo_effort_level;
      console.log(race_rider.name + " finishing ATTACK and goign SOLO with output level " + race_rider.output_level);
    }

    //********************* LEAD rider. do what yer told! *********************
    //*************************************************************************
    if (race_rider.current_aim =="LEAD" || race_rider.current_aim =="SPRINT" || race_rider.current_aim =="ATTACK" || race_rider.current_aim =="SOLO"){

      if(race_rider.current_aim =="ATTACK"){
        race_rider.breakaway_attack_duration_elapsed += 1;
      }

      // if(race_rider.current_aim =="SPRINT"){
      //   debugger;
      // }
      //dk23UG targetted debugging
      if(targeted_debugging && race.race_clock >= targeted_debugging_timestep_range_start && race.race_clock <= targeted_debugging_timestep_range_end &&  race.current_order[i] == targeted_debugging_rider_no){
        console.log("targeted debugging rider " + race.current_order[i] + " timestep " + race.race_clock + " LEAD ");
        debugger;
      }
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

      race_rider.current_power_effort = mapEffortToPower(settings.threshold_power_effort_level, race_rider.output_level, race_rider.threshold_power, race_rider.max_power, settings.maximum_effort_value);

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


      // **** cooperation effort check START **** LEADING rider only
      if(race_rider.current_aim == "LEAD"){
        race_rider.time_leading_group++;
        if(race_rider.time_leading_group > race_rider.breakaway_cooperation_time){

          let new_drop_instruction = [race.race_clock+1,"drop=" + (race.current_order.length-1),race.current_order[i]];
          console.log("||||||||||||| added drop instruction " + new_drop_instruction + " |||||||||||||");
          race.race_instructions_r.push(new_drop_instruction); //what if there's an instruction in there already?
          race_rider.time_leading_group = 0;
        }
      }
      // **** cooperation effort check END ****

    } //end of lead rider block
    else if (race_rider.current_aim == "FOLLOW" || race_rider.current_aim == "DROP" || race_rider.current_aim == "CHASE"){
      //*********************************************************************************************************
      //********************* FOLLOW rider. always chase the designated leader of the group *********************
      //*********************************************************************************************************
     //rider may be following or dropping back. Either way they will be basing velocity on that of another rider- normally just following the rider in front of you

     //debugger if we are dropping and there's nobody else in our group
     let my_group = race.breakaway_riders_groups[race.current_order[i]];
     let count_of_group_members = 0;
     for(let iip = 0; iip < race.current_order.length; iip++){
       if(race.breakaway_riders_groups[race.current_order[iip]] == my_group){
         count_of_group_members++;
        }
      }

     if(race_rider.current_aim == "DROP" && count_of_group_members <= 1){
       debugger;
     }


     if(race_rider.current_aim == "CHASE"){
       race_rider.chase_period_time_elapsed++;
     }
      if(targeted_debugging && race.race_clock >= targeted_debugging_timestep_range_start && race.race_clock <= targeted_debugging_timestep_range_end &&  race.current_order[i] == targeted_debugging_rider_no){
        console.log("targeted debugging rider " + race.current_order[i] + " timestep " + race.race_clock + " CHASE ");
        debugger
      }

      let rider_to_follow = {};
      //shouldn't follow a rider that is attacking? can only follow a rider that is in 'your group'
      //find the first rider in front of you that is in either LEAD or FOLLOW states?

      //donalk25, if we are chasing we should already have picked a rider to chase
      if(race_rider.current_aim == "CHASE"){
        rider_to_follow = race.riders[race_rider.breakaway_chase_target_rider];
      }
      else{
        let check_rider = i-1;
        let my_group = race.breakaway_riders_groups[race.current_order[i]];
        while(check_rider >= 0){
          if(race.breakaway_riders_groups[race.current_order[check_rider]] == my_group){
              rider_to_follow = race.riders[race.current_order[check_rider]];
              break;
          }
          check_rider -= 1;
        }
        if(isEmpty(rider_to_follow)){
          //debugger;
          if (i==0){
            //not sure if this actually occurs- can happen after a leader drops back?
            rider_to_follow = race.riders[race.current_order[race.current_order.length-1]];
          }

        }
      }

      // if (i==0){
      //   debugger; //not sure if this actually occurs
      //   rider_to_follow = race.riders[race.current_order[race.current_order.length-1]];
      // }
      // else{
      //   rider_to_follow = race.riders[race.current_order[i-1]];
      //  }

      // assume we are drafting and try to cover the same distance as the race_rider in front, which will take a certain amount of power
      //need to factor in the original offset
      //let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset- settings.start_position_offset) -  (race_rider.distance_covered-race_rider.start_offset);

      // if(race.current_order[i] == 1 && race.race_clock >= 150 && race_rider.current_aim == "DROP"){
      //   debugger;
      // }

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
      if(rider_to_follow.current_aim == "DROP"){
        //who is actually in front of you?

        let closest_rider = 0;
        let min_distance = race.distance*2;

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

      //assign the ride_to_follow value
      race_rider.rider_to_follow = rider_to_follow;

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
      if((rider_to_follow.current_aim != "DROP") && ((race_rider.velocity - rider_to_follow.velocity) > settings.velocity_difference_limit) &&  (distance_to_cover < settings.damping_visibility_distance) ){
      //if(((race_rider.velocity - rider_to_follow.velocity) > settings.velocity_difference_limit) &&  (distance_to_cover < settings.damping_visibility_distance) ){
        target_velocity =  rider_to_follow.velocity;//assumption that by the time taken to adjust to the same velocity you will have caught them
      }
      else if((race_rider.velocity > target_velocity) && (distance_to_cover < settings.damping_visibility_distance)){
        //dropping back if slowing down and target velocity is low but you are close to the target rider, then only slow a little (dropping back)
          //need to weight the adjustment so that it goes closer to zero as they get closer and closer
        //IF dropping we apply a different idea, where the dropping rider tries to match the speed of the target rider and not just slow until beind them, otherwise they will then have to sprint back on
        if (race_rider.current_aim == "DROP") {
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

      if (race_rider.distance_from_rider_in_front > shelter_max_distance || race_rider.current_aim == "DROP"){
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
      if(race_rider.current_aim =="DROP"){ //once you are behind the rider_to_follow, you 'follow' again
        //donalK25: could add target_rider_gap here so that we drop back until behind the target rider, not until alongside them?
         if((race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= (rider_to_follow.distance_covered-rider_to_follow.start_offset))
        //if((race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= (rider_to_follow.distance_covered-rider_to_follow.start_offset-0.3))
         {
          //idea is that you are dropping back so long as you are in front of the rider you should be behind
          race_rider.current_aim = "FOLLOW";
        }
      }

      //count the size of the current contiguous group: may affect drop/switchLead() instructions
      //dk25: need a new way to count this... the idea is to prevent dropping back behind non-dropped riders... so, count the non-dropped members of you group... and there are now multiple groups, not one,
      // if((race.contiguous_group_size == i) && ((rider_to_follow.distance_covered-rider_to_follow.start_offset) - (race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= settings.contiguous_group_drop_distance)){
      //   race.contiguous_group_size++;
      // }

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

    } //*** end of follow rider block
    else if(race_rider.current_aim == "CAUGHT"){
      //rider is caught... do nothing??
      race_rider.velocity = 0;
        rider_power_data[race.current_order[i]].push(0);
    }
    else{
      console.log("############# Problemo: rider aim '"+ race_rider.current_aim + "' not accounted for. #############");
    }

    race_rider.distance_this_step = race_rider.velocity; //asssumes we are travelling for 1 second: this is the total distance to be travelled on the track
    //console.log(race_rider.name + " " + race_rider.current_aim + " at " + race.race_clock  +  " new velocity " + race_rider.velocity);

    //if on a straight just keep going in that direction
    //may need to break a distance covered down into parts (e.g. going from bend to straight)
    race_rider.distance_this_step_remaining = race_rider.distance_this_step;
    let scale_amount = settings.vis_scale;

    //Move the rider along on the track (VISUALS)
    //1 'segment' in each rider's distance since this race is now one straight line
    while(race_rider.distance_this_step_remaining > 0){
          let distance_this_step_segment =   race_rider.distance_this_step_remaining;
          race_rider.straight_distance_travelled += distance_this_step_segment;

          //zoom effect. if the zoom mode is enabled, go through the distance piece by damping_deceleration_distance
          //CURRENT_ZOOM_SEGMENT_SIZE
          //what segment are we on?
          let current_segment = Math.floor(race_rider.straight_distance_travelled/CURRENT_ZOOM_SEGMENT_SIZE);
          CURRENT_ZOOM_SEGMENT_NO = current_segment;
          let distance_in_segment = race_rider.straight_distance_travelled - (CURRENT_ZOOM_SEGMENT_SIZE*current_segment);
          let distance_mapped_to_display = settings.track_centre_x + ((distance_in_segment/CURRENT_ZOOM_SEGMENT_SIZE) * (DISPLAY_LENGTH - settings.track_centre_x));

          race_rider.current_position_x = distance_mapped_to_display;
          race_rider.distance_this_step_remaining = 0;
          //console.log(race.race_clock + ": " + race_rider.name + "straight 1 (start) full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining = " +   race_rider.distance_this_step_remaining  + " with start offset of " + race_rider.start_offset  )

    }
    race_rider.distance_covered+=race_rider.velocity;
    //draw the rider's circle

    //update the 'lane' of the rider, a visual aid to show their status

    //***** start of test code; need to check if this code runs at all when all riders have crossed the finish line
    // let rider_not_finished = 0;
    // for(let rider_i = 0; rider_i<race.current_order.length;rider_i++){
    //   if(race.riders[rider_i].distance_covered < race.distance){
    //     rider_not_finished = 1;
    //     break;
    //   }
    // }
    // if(rider_not_finished == 0){
    //   debugger;
    // }
    //***** end of test code

    let rider_y_position = STATUS_LANE_POSITIONS_BASE_POSITION - (race.breakaway_riders_groups[race.current_order[i]]*STATUS_LANE_POSITIONS_LANE_WIDTH) + STATUS_LANE_POSITIONS[race_rider.current_aim];
    race_rider.current_position_y = rider_y_position;
    //race_rider.current_position_y = STATUS_LANE_POSITIONS[race_rider.current_aim];
    // for a sprint, we can try to give each sprinter a different lane
    // if(race_rider.current_aim == "SPRINT"){
    //     race_rider.current_position_y = STATUS_LANE_POSITIONS[race_rider.current_aim] - (race.breakaway_riders_groups[race.current_order[i]]*STATUS_LANE_POSITIONS_LANE_WIDTH);
    // }

    let  circle_radius = DEFAULT_RIDER_CIRCLE_RADIUS;
    if(CURRENT_ZOOM_SEGMENT_SIZE < race.distance){
      circle_radius = ZOOM_RIDER_CIRCLE_RADIUS;
    }

    ctx.beginPath();
    ctx.globalAlpha = 0.8;
    ctx.arc(race_rider.current_position_x, race_rider.current_position_y, circle_radius, 0, 2 * Math.PI);
    ctx.fillStyle = race_rider.colour;
    if (race_rider.current_aim == "DROP"){
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  } // main rider loop


  for(let i = 0; i < race.current_order.length;i++)
  {
    let race_rider = race.riders[race.current_order[i]];

    // RIDER DECISION-MAKING: CHOOSE YOUR ADVENTURE ---- START -- **************
    //**************************************************************************
    //**************************************************************************
    //**************************************************************************

    //first off, if you are cought by the bunch, update this
    //allow only one decision/positive choice/change. use a  bool to count
    let choice_made = 0;
    if(race_rider.current_aim != "CAUGHT" && race_rider.distance_covered < race.chasing_bunch_current_position){
      race_rider.current_aim = "CAUGHT";
      //set the group to -1
      race.breakaway_riders_groups[race.current_order[i]] = -1;
      //debugger;
      choice_made = 1;
    }
    if (choice_made == 0 && race_rider.current_aim != "SPRINT" && race_rider.current_aim != "CAUGHT"){
      //decide if you will SPRINT
      let breakaway_max_sprint_distance = DEFAULT_BREAKAWAY_MAX_SPRINT_DISTANCE;
      if (typeof(settings.breakaway_max_sprint_distance) != 'undefined'){
        breakaway_max_sprint_distance = settings.breakaway_max_sprint_distance;
      }
      let sprint_probability = 0;
      //can sprint from any other status that is not sprint.
      if((race.distance-race_rider.distance_covered) < breakaway_max_sprint_distance && race_rider.breakaway_sprint_eagerness > 0){
        //work out a sprint  probability. This will be affected by a number of tune-able factors
        let value_list = [];
        let probability_variables = [];
        probability_variables.push(race_rider.breakaway_sprint_eagerness/settings.breakaway_sprint_eagerness_maximum);

        //need quartet of values for remainign distance factor
        //[weight multiplier, value, exponent, max value]
        let inverse_remaining_distance_weight = settings.breakaway_sprint_inverse_remaining_distance_weight;
        let inverse_remaining_distance_value = (breakaway_max_sprint_distance - (race.distance-race_rider.distance_covered));
        let inverse_remaining_distance_exponent = settings.breakaway_sprint_inverse_remaining_distance_exponent;
        let inverse_remaining_distance_max_value = breakaway_max_sprint_distance;
        value_list.push(inverse_remaining_distance_weight,inverse_remaining_distance_value,inverse_remaining_distance_exponent,inverse_remaining_distance_max_value);
        sprint_probability = calculate_linear_space_value(value_list, probability_variables);
        console.log(race_rider.name + " >>>S>P>R>I>N>T>>>> sprint_probability " + sprint_probability + " inverse_remaining_distance_value " + inverse_remaining_distance_value);
      }
      let sprint_choice = 0;
      let sprint_choice_random_value = Math.random();
      if(sprint_choice_random_value < sprint_probability){
        sprint_choice = 1;
      }

      if(sprint_choice == 1){
        let original_aim = race_rider.current_aim;
        let original_group = race.breakaway_riders_groups[race.current_order[i]];

        if(race_rider.current_aim == "LEAD"){
          race_rider.number_of_turns++;
        }
        race_rider.current_aim = "SPRINT";
        choice_made = 1;
        // also give them their OWN LANE
        let lowest_avilable_lane = 0;
        while(race.breakaway_riders_groups.includes(lowest_avilable_lane)){
          lowest_avilable_lane++;
        }
        race.breakaway_riders_groups[race.current_order[i]] = lowest_avilable_lane;

        //if they were leading their group, need to set a new leader now
        if(original_aim == "LEAD"){
          //find the follower from this group with the highest distance_covered.
          let highest_follower_distance_covered = 0;
          let farthest_follower = -1;
          for(let iik = 0;iik<race.riders.length;iik++){
            if(race.current_order[i] != iik && race.breakaway_riders_groups[iik] == original_group && race.riders[iik].current_aim == "FOLLOW" && race.riders[iik].distance_covered > highest_follower_distance_covered){
              highest_follower_distance_covered = race.riders[iik].distance_covered;
              farthest_follower = iik;
            }
          }
          //if one was found, update its current aim
          if(farthest_follower >= 0){
            race.riders[farthest_follower].current_aim = "LEAD";
          }

          //update number of turns
          race_rider.number_of_turns++;
        }

        console.log(race_rider.name + " changing to SPRINT, lane " + lowest_avilable_lane + " sprint_probability " + sprint_probability);

      }
    } //end of else for sprint
    if(choice_made == 0 && race_rider.current_aim == "FOLLOW" && race.race_clock >= settings.breakaway_timestep_to_enable_attacks && race_rider.breakaway_attacking_probability > 0){
      //donalK25: choose if you will ATTACK (in the next timestep)

      let value_list = [];
       let probability_variables = [];
       probability_variables.push(race_rider.breakaway_attacking_probability/settings.breakaway_attacking_probability_max);

       //need quartet of values for remainign distance factor
       //[weight multiplier, value, exponent, max value]

       //1: group cooperation. find the least cooperative rider
       let least_cooperative_rider = -1;
       let least_cooperative_rider_average_turn_length = race.race_clock+1; //can't be more than the amount of time passed?
       let sum_of_average_turn_length = 0;
       let count_of_non_zero_riders = 0;
       for(let ix=0;ix<race.riders.length;ix++){
         if(ix !== race.current_order[i] && race.riders[ix].number_of_turns > 0){
           let num_turns = race.riders[ix].number_of_turns;
           if(race.riders[ix].current_aim == "LEAD"){
             num_turns+=0.5; //so, if the rider is currently leading, it will on average be halfway through a new turn.
           }
           let average_turn_length =  (race.riders[ix].time_on_front_of_group / num_turns);
           sum_of_average_turn_length += average_turn_length;
           count_of_non_zero_riders++;
           if(average_turn_length < least_cooperative_rider_average_turn_length){
             least_cooperative_rider_average_turn_length = average_turn_length;
             least_cooperative_rider = ix;
           }
         }
       }
       let average_turn_length_all_riders = 0;
       if(count_of_non_zero_riders > 0){
         average_turn_length_all_riders =sum_of_average_turn_length/count_of_non_zero_riders;
       }
       let worst_rider_compared_to_average = 0;
       if(least_cooperative_rider_average_turn_length < 0 || least_cooperative_rider_average_turn_length >= average_turn_length_all_riders){
         worst_rider_compared_to_average = 0;
       }
       else{
         worst_rider_compared_to_average = (((average_turn_length_all_riders - least_cooperative_rider_average_turn_length)/average_turn_length_all_riders));
       }

       let attack_lack_of_cohesion_weight = settings.attack_lack_of_cohesion_weight;
       let attack_lack_of_cohesion_value = worst_rider_compared_to_average;
       let attack_lack_of_cohesion_exponent = settings.attack_lack_of_cohesion_exponent;
       let attack_lack_of_cohesion_max_value = settings.attack_lack_of_cohesion_max_value;
       value_list.push(attack_lack_of_cohesion_weight,attack_lack_of_cohesion_value,attack_lack_of_cohesion_exponent,attack_lack_of_cohesion_max_value);

       //2: fatigue, same factor as used in chase?
       let current_fatigue_level = race_rider.endurance_fatigue_level;
       let current_accumulated_fatigue = race_rider.accumulated_fatigue;
       if(current_accumulated_fatigue > settings.accumulated_fatigue_maximum){
         current_accumulated_fatigue = settings.accumulated_fatigue_maximum;
       }
       if (current_fatigue_level > race_rider.rider_fatigue_failure_level){
         current_fatigue_level = race_rider.rider_fatigue_failure_level;
       }

       let attack_inverse_fatigue_weight = settings.attack_inverse_fatigue_weight;
       //average the effects of both current and accumulated fatigue.

       let attack_inverse_fatigue_value = ((1 - (current_fatigue_level/race_rider.rider_fatigue_failure_level)) + (settings.accumulated_fatigue_effect_weight *(1 - (current_accumulated_fatigue/settings.accumulated_fatigue_maximum))))/(1+settings.accumulated_fatigue_effect_weight);
       if (isNaN(attack_inverse_fatigue_value)){
         attack_inverse_fatigue_value = 0; //can happen if rider_fatigue_failure_level goes to 0
       }
       let attack_inverse_fatigue_exponent = settings.attack_inverse_fatigue_exponent;
       let attack_inverse_fatigue_max_value = 1;
       value_list.push(attack_inverse_fatigue_weight,attack_inverse_fatigue_value,attack_inverse_fatigue_exponent,attack_inverse_fatigue_max_value);

       //3 - a factor for the expectation of getting caught
       let attack_expectation_of_getting_caught_value = 0
       let peleton_time_to_finish = ((race.distance-race.chasing_bunch_current_position)/race.chasing_bunch_speed);
       if(peleton_time_to_finish < 0){
         peleton_time_to_finish = 0;
       }
       let rider_time_to_finish = ((race.distance - race_rider.distance_covered)/race_rider.velocity);
       if(rider_time_to_finish < 0){
         rider_time_to_finish = 0;
       }

       //work out the distance the rider will get before being caught
       if(race.chasing_bunch_current_position < race_rider.distance_covered && race.chasing_bunch_speed > race_rider.velocity && rider_time_to_finish > peleton_time_to_finish){
         let velocity_difference = race.chasing_bunch_speed - race_rider.velocity;
         let gap_from_bunch_to_rider = race_rider.distance_covered - race.chasing_bunch_current_position;
         let time_to_catch = gap_from_bunch_to_rider/velocity_difference;
         let distance_reached = time_to_catch*race_rider.velocity;
         let distance_remaining = race.distance - race_rider.distance_covered;
         if((distance_reached + race_rider.distance_covered) > race.distance){
           attack_expectation_of_getting_caught_value = 0;
         }
         else{
           attack_expectation_of_getting_caught_value = (1-(distance_reached/distance_remaining)); //distance when you are caught should be a fraction of the distance remaining
         }

       }

       let attack_expectation_of_getting_caught_weight = settings.attack_expectation_of_getting_caught_weight;
       //let attack_expectation_of_getting_caught_value = XXXXXX;
       let attack_expectation_of_getting_caught_exponent = settings.attack_expectation_of_getting_caught_exponent;
       let attack_expectation_of_getting_caught_max_value = 1;
       value_list.push(attack_expectation_of_getting_caught_weight,attack_expectation_of_getting_caught_value,attack_expectation_of_getting_caught_exponent,attack_expectation_of_getting_caught_max_value);

       let attack_probability = calculate_linear_space_value(value_list, probability_variables);

      let attack_choice = Math.random();
       if(attack_choice < attack_probability){
        console.log("*********** timestep " + race.race_clock + " STATUS CHANGE rider " + race_rider.name + " from " +  race_rider.current_aim + " to ATTACK");
        if(race_rider.current_aim == "LEAD"){
          race_rider.number_of_turns++;
        }
        race_rider.current_aim = "ATTACK";
        race_rider.breakaway_attack_duration_elapsed = 0;
        //create a new group for this rider
        let new_group = Math.max(...race.breakaway_riders_groups) + 1;

        race.breakaway_riders_groups[race.current_order[i]] = new_group;
        choice_made = 1;
      }
    }
    if(choice_made == 0 && race_rider.current_aim != "CAUGHT" && race_rider.current_aim != "SPRINT" && race_rider.current_aim != "CHASE" && race_rider.current_aim != "ATTACK") {
      //make a choice about CHASING.
      //first, need to figure out if there is a rider or riders ahead.
      let number_of_riders_ahead = 0;
      let closest_rider_ahead = -1;
      let closest_rider_distance = race.distance*2; //just a starting point since they cannot be more than the race distance ahead. Well, they can actually go past that line

      // loop through the (other) riders and count who is ahead and 'not in your lane'
      // also mark the one that is the closest - if you chase, you chase this rider?
      let my_group = race.breakaway_riders_groups[race.current_order[i]];
      for(let iik = 0; iik < race.current_order.length; iik++){
        if (iik != i){
          if(race.riders[race.current_order[iik]].distance_covered > race_rider.distance_covered && race.breakaway_riders_groups[race.current_order[iik]] != my_group){
            number_of_riders_ahead++;
            if ((race.riders[race.current_order[iik]].distance_covered - race_rider.distance_covered) <  closest_rider_distance){
              closest_rider_ahead = race.current_order[iik];
              closest_rider_distance = (race.riders[race.current_order[iik]].distance_covered - race_rider.distance_covered);
            }
          }
        }
      }

      if(number_of_riders_ahead > 0){
        //console.log("***** There is a rider "+ race_rider.name +" might chase::: number_of_riders_ahead " + number_of_riders_ahead + " closest_rider_ahead " + race.riders[closest_rider_ahead].name + " closest_rider_distance " + closest_rider_distance);

        //Do I chase then?
        //factors: number of riders ahead, inverse distance to rider up to some fixed point, and 'freshness'
        let value_list = [];
        let probability_variables = [];
        probability_variables.push(race_rider.breakaway_chase_eagerness/settings.breakaway_chase_eagerness_maximum);

        //need quartet of values for remainign distance factor
        //[weight multiplier, value, exponent, max value]
        let chase_distance_amount = closest_rider_distance;
        if(chase_distance_amount > CHASE_RESPONSE_MAX_DISTANCE){
          chase_distance_amount = CHASE_RESPONSE_MAX_DISTANCE;
        }
        let inverse_chase_distance_weight = settings.breakaway_chase_inverse_distance_weight;
        let inverse_chase_distance_value = chase_distance_amount;
        let inverse_chase_distance_exponent = settings.breakaway_chase_inverse_distance_exponent;
        let inverse_chase_distance_max_value = CHASE_RESPONSE_MAX_DISTANCE;
        value_list.push(inverse_chase_distance_weight,inverse_chase_distance_value,inverse_chase_distance_exponent,inverse_chase_distance_max_value);

        let chase_number_of_riders_ahead_weight = settings.breakaway_chase_inverse_distance_weight;
        let chase_number_of_riders_ahead = number_of_riders_ahead;
        let chase_number_of_riders_ahead_exponent = settings.chase_number_of_riders_ahead_exponent;
        let chase_number_of_riders_ahead_max_value = race.current_order.length;
        value_list.push(chase_number_of_riders_ahead_weight,chase_number_of_riders_ahead,chase_number_of_riders_ahead_exponent,chase_number_of_riders_ahead_max_value);

        //also create a measure of freshness, i.e. the inverse of fatgiue as a 0-1 value
        let current_fatigue_level = race_rider.endurance_fatigue_level;
        if (current_fatigue_level > race_rider.rider_fatigue_failure_level){
          current_fatigue_level = race_rider.rider_fatigue_failure_level;
        }

        let current_accumulated_fatigue = race_rider.accumulated_fatigue;
        if(current_accumulated_fatigue > settings.accumulated_fatigue_maximum){
          current_accumulated_fatigue = settings.accumulated_fatigue_maximum;
        }

        let chase_inverse_fatigue_weight = settings.chase_inverse_fatigue_weight;
        //let chase_inverse_fatigue_value = (1 - (current_fatigue_level/race_rider.rider_fatigue_failure_level));
        //combine both current and accumulated fatigue.
        let chase_inverse_fatigue_value = ((1 - (current_fatigue_level/race_rider.rider_fatigue_failure_level)) + (settings.accumulated_fatigue_effect_weight *(1 - (current_accumulated_fatigue/settings.accumulated_fatigue_maximum))))/(1+settings.accumulated_fatigue_effect_weight);

        if (isNaN(chase_inverse_fatigue_value)){
          chase_inverse_fatigue_value = 0; //can happen if rider_fatigue_failure_level goes to 0
        }
        let chase_inverse_fatigue_exponent = settings.chase_inverse_fatigue_exponent;
        let chase_inverse_fatigue_max_value = 1;
        value_list.push(chase_inverse_fatigue_weight,chase_inverse_fatigue_value,chase_inverse_fatigue_exponent,chase_inverse_fatigue_max_value);

        let chase_probability = calculate_linear_space_value(value_list, probability_variables);
        let chase_choice = Math.random();
        if(chase_choice < chase_probability && closest_rider_ahead != -1){
          //assign a target rider to chase
          race_rider.breakaway_chase_target_rider = closest_rider_ahead;
          let original_aim = race_rider.current_aim;

          race_rider.current_aim = "CHASE";
          race_rider.chase_period_time_elapsed = 0;
          choice_made =1;
          //put this rider in the same group as the target.
          let my_group = race.breakaway_riders_groups[race.current_order[i]];
          let chase_target_rider_group = race.breakaway_riders_groups[closest_rider_ahead];
          //update the group to that of the chasee
          race.breakaway_riders_groups[race.current_order[i]] = race.breakaway_riders_groups[closest_rider_ahead];

          //if race_rider is LEADing a group, a new leader may need to be assigned.
          if(original_aim == "LEAD"){
            //find the follower from this group with the highest distance_covered.
            let highest_follower_distance_covered = 0;
            let farthest_follower = -1;
            for(let iik = 0;iik<race.riders.length;iik++){
              if(race.current_order[i] != iik && race.breakaway_riders_groups[iik] == my_group && race.riders[iik].current_aim == "FOLLOW" && race.riders[iik].distance_covered > highest_follower_distance_covered){
                highest_follower_distance_covered = race.riders[iik].distance_covered;
                farthest_follower = iik;
              }
            }
            //if one was found, update its current aim
            if(farthest_follower >= 0){
              race.riders[farthest_follower].current_aim = "LEAD";
            }

            race_rider.number_of_turns++;

          }

          console.log(race_rider.name + " ||||C|H|A|S|E||||| " + race_rider.name + " - chase " + race.riders[closest_rider_ahead].name + " - chase_probability " + chase_probability + " inverse_chase_distance_value " + inverse_chase_distance_value + " chase_number_of_riders_ahead " + chase_number_of_riders_ahead + " chase_inverse_fatigue_value " + chase_inverse_fatigue_value + ". Going from group " + my_group + " to " + chase_target_rider_group);
        }
      } //if there are riders ahead block
    } //end of CHASE block
    if(choice_made == 0 && race_rider.current_aim == "SOLO") {
      // if SOLO, should you change to LEAD, if there's at least one rider close behind you (start workign with them)
      //how close is the nearest rider behind you?
      let closest_behind_distance_covered = 0;
      let closest_behind_rider_group = -1;
      let closest_rider_behind = -1;
      let closest_ahead_distance_covered = race.distance*2;
      let closest_ahead_rider_group = -1;
      let closest_rider_ahead = -1;
      for(let iim = 0; iim < race.riders.length;iim++){
        if(iim != race.current_order[i] && race.riders[iim].distance_covered < race_rider.distance_covered){
          if(race.riders[iim].distance_covered > closest_behind_distance_covered){
            closest_behind_distance_covered = race.riders[iim].distance_covered;
            closest_behind_rider_group = race.breakaway_riders_groups[iim];
            closest_rider_behind = iim;
          }
        }
          if(iim != race.current_order[i] && race.riders[iim].distance_covered > race_rider.distance_covered){
            if(race.riders[iim].distance_covered < closest_ahead_distance_covered){
              closest_ahead_distance_covered = race.riders[iim].distance_covered;
              closest_ahead_rider_group = race.breakaway_riders_groups[iim];
              closest_rider_ahead = iim;
            }
        }
      }
      let gap_to_rider_behind = (race_rider.distance_covered - closest_behind_distance_covered);
      let gap_to_rider_ahead = (closest_ahead_distance_covered - race_rider.distance_covered);
      if(closest_rider_ahead >= 0 && gap_to_rider_ahead < BREAKAWAY_SWITCH_TO_FOLLOW_GAP_SIZE){
        // not sure about this - if you meet a much slower rider, you won't pass them. better if they try to follow you?
        ///but what if one solo rider passes another?
        race_rider.current_aim = "FOLLOW";
        race.breakaway_riders_groups[race.current_order[i]] = closest_ahead_rider_group;
        choice_made = 1;
      }
      else if(closest_rider_behind >= 0 && gap_to_rider_behind < BREAKAWAY_SWITCH_TO_LEAD_GAP_SIZE && race.riders[closest_rider_behind].velocity > race_rider.velocity){
        //join this group but DROP back - only if going SLOWER than it.
        //race_rider.current_aim = "DROP"; //try to lead a group rather than going solo
        race.breakaway_riders_groups[race.current_order[i]] = closest_behind_rider_group;
        //try and go to end of group
        let group_count = 0;
        for(let iim = 0;iim<race.breakaway_riders_groups.length;iim++){
          if(race.breakaway_riders_groups[iim] == closest_behind_rider_group){
            group_count++;
          }
        }
        switchLead(group_count-1, race.current_order[i]);
        choice_made = 1;
        console.log(race.race_clock + ", " + race_rider.name + " changing to group " + closest_behind_rider_group + " and DROP role.");

      }
    }
    if(choice_made == 0 && (race_rider.current_aim == "CHASE")) {
      // should you switch to following? if you are catching up to a rider, can join their group. what if this group is goign very slowly??

      //apply a preset period length whereby you do not revert to following the group you are chasing out of.
      let chase_original_target_period = settings.chase_original_target_period;
      //do not consider the positions of other riders until this period has elapsed (chase only that original target)
      let in_initial_chase_period = 0;
      if(race_rider.chase_period_time_elapsed < chase_original_target_period ){
        in_initial_chase_period = 1; //only consider the original target rider if this is 1.
      }
      let closest_ahead_distance_covered = race.distance*2;
      let closest_ahead_rider_group = -1;

      if(in_initial_chase_period){
        if(race.riders[race_rider.breakaway_chase_target_rider].distance_covered > race_rider.distance_covered){
          closest_ahead_distance_covered = race.riders[race_rider.breakaway_chase_target_rider].distance_covered;
          closest_ahead_rider_group = race.breakaway_riders_groups[race_rider.breakaway_chase_target_rider];
        }
      }
      else{
        for(let iim = 0; iim < race.riders.length;iim++){
            if(iim != race.current_order[i] && race.riders[iim].distance_covered > race_rider.distance_covered){
              if(race.riders[iim].distance_covered < closest_ahead_distance_covered){
                closest_ahead_distance_covered = race.riders[iim].distance_covered;
                closest_ahead_rider_group = race.breakaway_riders_groups[iim];
              }
          }
        }
      }
      //transition to FOLLOW if close enough
      let gap_to_rider_in_front = (closest_ahead_distance_covered - race_rider.distance_covered);
      if(closest_ahead_rider_group > -1 && gap_to_rider_in_front < BREAKAWAY_SWITCH_TO_FOLLOW_GAP_SIZE){
        race_rider.current_aim = "FOLLOW";
        race.breakaway_riders_groups[race.current_order[i]] = closest_ahead_rider_group;
        choice_made = 1;
      }
    }
    if(choice_made == 0 && (race_rider.current_aim == "DROP")) {
      //if you are dropping and there is nobody else in your group, change to SOLO
      let my_group = race.breakaway_riders_groups[race.current_order[i]];
      let count_of_group_members = 0;
      for(let iip = 0; iip < race.current_order.length; iip++){
        if(race.breakaway_riders_groups[race.current_order[iip]] == my_group){
          count_of_group_members++;
         }
       }
       if(count_of_group_members <= 1){
         //change to SOLO
         race_rider.current_aim = "SOLO";
         choice_made = 1;
       }
    }
    // RIDER DECISION-MAKING: CHOOSE YOUR ADVENTURE ---- END -- **************
    //**************************************************************************
    //**************************************************************************
    //**************************************************************************
  }


  // After all riders have moved
  // Update each rider's distance value for the rider in front of them (lead is zero)
  let logMessage = "";

  //need a loop to assign any finish times and positions
  //check to see if any riders have finished
  let finished_this_timestep = [];
  for(let i=0;i<race.current_order.length;i++){
    let ri = race.current_order[i];
    let display_rider = race.riders[ri];
    if (display_rider.finish_time == -1 && display_rider.distance_covered > race.distance){
      let extra_distance_covered = display_rider.distance_covered - race.distance;
      display_rider.finish_time = DecimalPrecision.round(((race.race_clock) - (extra_distance_covered/display_rider.velocity)),3);
      finished_this_timestep.push(display_rider.finish_time);
    }
}

//if there were finishers, order them by time ascending and assign a finish time
if(finished_this_timestep.length > 0){
  //sort ascending
  finished_this_timestep.sort();
  for(let i=0;i<finished_this_timestep.length;i++){
      for(let ik=0;ik<race.current_order.length;ik++){
        let ri = race.current_order[ik];
        let display_rider = race.riders[ri];
        if(display_rider.finish_position == -1 && display_rider.finish_time == finished_this_timestep[i]){
            race.riders_finished++;
            display_rider.finish_position = race.riders_finished;
        }
      }
  }
}

//dksep24: increment time_on_front of leading rider

//dKelly25, ignore the first timestep as they are all starting off together
//donalK25 - for breakway need to find the rider on the front using their distance_covered property
let max_distance_covered = -1;
let leading_rider = -1;
for(let i_r = 0;i_r < race.riders.length; i_r++){
  if(race.riders[i_r].distance_covered > max_distance_covered){
    max_distance_covered = race.riders[i_r].distance_covered;
    leading_rider = i_r;
  }
}
if(race.race_clock > 1 && leading_rider > -1){
  race.riders[leading_rider].time_on_front++;
}

//also, want to add the time leading each group
//need to go through the distinct groups
let distinct_groups = [];
for(let i_r = 0;i_r < race.breakaway_riders_groups.length; i_r++){
  if(!(distinct_groups.includes(race.breakaway_riders_groups[i_r]))){
    distinct_groups.push(i_r);
  }
}
//for each group, find the leader and increment their time_on_front_of_group property value
for(let k_r = 0;k_r < distinct_groups.length; k_r++){
  let max_distance_covered = -1;
  let leading_rider = -1;
  for(let i_r = 0;i_r < race.riders.length; i_r++){
    if(race.breakaway_riders_groups[i_r] == k_r && race.riders[i_r].distance_covered > max_distance_covered){
      max_distance_covered = race.riders[i_r].distance_covered;
      leading_rider = i_r;
    }
  }
  if(race.race_clock > 1 && leading_rider > -1){
    race.riders[leading_rider].time_on_front_of_group++;
  }
}
//end of leading property value updates


//can now draw the rider info for this timestep
    for(let i=0;i<race.current_order.length;i++){
      let ri = race.current_order[i];
      let display_rider = race.riders[ri];
      //is there a rider in front, i.e. who has covered more distance? find the closest rider that is in front of you and use this gap to work out your shelter

      //donalK25: updating this to factor in the group- only consider riders in your own group (a group is like a separate lane)

      let rif = -1;
      let min_distance = -1;
      let number_of_riders_in_front = 0;
      let my_group = race.breakaway_riders_groups[race.current_order[i]];
      // if(race.race_clock >= 300 && race.current_order[i]==2){
      //   debugger;
      // }
      for(let j=0;j<race.current_order.length;j++){
          if(i!==j && my_group==race.breakaway_riders_groups[race.current_order[j]]){ //ignore ayone not in your own group
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

      let finish_info ="";
      if(display_rider.finish_time != -1){
        finish_info = convert_to_ordinal(display_rider.finish_position) + " (" + display_rider.finish_time + ")";
      }

      //display the rider properties
      let target_rider = " --- "
      if(typeof(display_rider.rider_to_follow.name) != "undefined"){
        target_rider = display_rider.rider_to_follow.name;
      }

       $("#rider_values_"+i).html("<div class='info_column ic_header'><div class='circle' style='background-color:"+display_rider.colour+"'> </div>" + display_rider.name + "<span class = 'rider_aim'>" + display_rider.current_aim.toUpperCase() +  ((display_rider.finish_position!=-1)?' <i class="fas fa-flag-checkered"></i>'+finish_info : '') + "</span></div><div class='info_column'>"+Math.round(display_rider.distance_covered * 100)/100 + "m</div><div class='info_column'>"+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph ("+DecimalPrecision.round(display_rider.velocity,4)+" m/s) </div><div class='info_column'>"+ Math.round(display_rider.power_out * 100)/100 + " / "  +display_rider.threshold_power + " / " + display_rider.max_power + " watts</div>" + "<div class='info_column'>"+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m</div>" + "<div class='info_column'>" + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) + "(" + Math.round(display_rider.rider_fatigue_failure_level) +  ")</div><div class='info_column'>" + display_rider.time_on_front + " ( " + DecimalPrecision.round((display_rider.time_on_front / race.race_clock)*100,2) + " %) / " + display_rider.time_on_front_of_group + " ( " + DecimalPrecision.round((display_rider.time_on_front_of_group / race.race_clock)*100,2) + " % / " + display_rider.number_of_turns +  " turns (avg. " + DecimalPrecision.round(display_rider.time_on_front_of_group/display_rider.number_of_turns,1) + "))</div><div class='info_column'>"+race.breakaway_riders_groups[ri]+"</div><div class='info_column'>" + target_rider + "</div");

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
    riders_to_sort[i_r] = {rider: race.current_order[i_r], finish_time: race.riders[race.current_order[i_r]].finish_time, distance_covered: race.riders[race.current_order[i_r]].distance_covered,current_aim:race.riders[race.current_order[i_r]].current_aim,group:race.breakaway_riders_groups[race.current_order[i_r]]};
  }
  //console.log("£££  riders_to_sort before sorting £££" + JSON.stringify(riders_to_sort));

  //sort based on finish_time
  riders_to_sort.sort((a, b) => (a.finish_time > b.finish_time) ? 1 : -1);

  //console.log("£££  riders_to_sort after sorting  £££" + JSON.stringify(riders_to_sort));

  //race is over if the bunch catches ALL of the UNFINISHED riders or ALL riders have crossed the line (though there is but one winner)

  //let last_rider = race.riders[riders_to_sort[riders_to_sort.length-1].rider];

  continue_racing = false;

  //check if the bunch has overtaken ALL riders, so continue if ANY are ahead
  //keep racing if any rider is still ahead of the peloton and not yet finished the distance

  for (let x = 0; x < race.riders.length; x++ ){
    if(race.riders[x].distance_covered > race.chasing_bunch_current_position && race.riders[x].distance_covered < race.distance){
      continue_racing = true;
      break;
    }
  }


// if(continue_racing){ //now check if they have crossed the finish line
//   if (last_rider.distance_covered > race.distance ){
//
//     //all riders ahead of the second_last_rider in the current order must be ahead on the track- otherwise the race goes on... (ignore the last rider)
//     let all_riders_ahead = true;
//     for (let x = 0; x < riders_to_sort.length-1; x++ ){
//       // also need to use distance-based ordering here
//       // if(race.riders[race.current_order[x]].distance_covered < second_last_rider.distance_covered && race.riders[race.current_order[x]].distance_covered <= race.distance){
//       if(race.riders[riders_to_sort[x].rider].distance_covered < last_rider.distance_covered && race.riders[riders_to_sort[x].rider].distance_covered <= race.distance){
//         all_riders_ahead = false;
//       }
//     }
//
//     if(all_riders_ahead){ //race is finished right? you have done the distance and the others are still in front
//       continue_racing = false;
//     }
//   }
// }
if(!continue_racing){ //no uncaught rider left on the course
  // dk20sep15: work out the finish time (to 3 digits) note i use the DecimalPrecision.round() function to do the rounding.
  //need to sort the riders based on distance
  //1 are all the riders caught?
  let all_riders_caught = 1;
  let fastest_finisher = -1;
  let uncaught_finishers_count = 0
  let uncaught_finishers_check = 0;
  for(let iim = 0; iim < riders_to_sort.length; iim++){
    if(riders_to_sort[iim].current_aim != "CAUGHT"){
      all_riders_caught = 0;
      fastest_finisher =riders_to_sort[iim].rider; //non-caught rider with lowest time is the winner
      uncaught_finishers_check = iim;
      break;
    };
  }
  uncaught_finishers_count = riders_to_sort.length - uncaught_finishers_check;

  let peleton_finish_position = (race.chasing_bunch_current_position - race.chasing_bunch_starting_gap);

  let finish_time = -1;
  if(all_riders_caught){
    finish_time = (race.race_clock-1); //could make this a little more complex but not sure if it is worth the work
      $("#race_info").html("<strong>Race finished: </strong>"+ finish_time + " seconds. Peloton has caught ALL riders!");
  }
  else{
    finish_time = race.riders[fastest_finisher].finish_time;
      $("#race_info").html("<strong>Race finished: </strong>"+ finish_time + " seconds. " + uncaught_finishers_count + " finished, winner is " + race.riders[fastest_finisher].name);
  }


  console.log("################################# RIDER CURRENT AIM HISTORY ######################");
  for(let i=0;i<race.current_order.length;i++){
    console.log("### rider " + race.riders[race.current_order[i]].name + " :: " + race.riders[race.current_order[i]].current_aim_history);
  }
  console.log("##################################################################################");

}
//show the remaining distance of the leader?
//show distance remaining
max_distance_covered = 0;
for(let iim = 0; iim < race.riders.length;iim++){
  if(race.riders[iim].distance_covered > max_distance_covered){
    max_distance_covered = race.riders[iim].distance_covered;
  }
}

$("#race_info_lap").text(DecimalPrecision.round(max_distance_covered,4));



  //resort the race.current_order array if needed
  // put riders of each group together, move non-follow riders to the 'front'
  let current_current_order = [...race.current_order];
  let current_order_groups = {};
  let current_groups_list = [];
  let new_order = [];
  for(let i = 0;i < current_current_order.length;i++){
    let i_group = race.breakaway_riders_groups[current_current_order[i]];
    if(current_order_groups[i_group]){
      current_order_groups[i_group].push(current_current_order[i]);
    }
    else{
      current_order_groups[i_group] = [current_current_order[i]];
      current_groups_list.push(i_group);
    }
  }
  current_groups_list.sort();
  current_groups_list.reverse(); //put bigger number groups first
  //console.log("current_order_groups " + JSON.stringify(current_order_groups) + " current_groups_list " + current_groups_list);

  for(let i = 0; i < current_groups_list.length; i++){
    if(current_order_groups[current_groups_list[i]]){
      let new_list = [];
      for(let k = 0; k < current_order_groups[current_groups_list[i]].length; k++){
        let r_aim = race.riders[current_order_groups[current_groups_list[i]][k]].current_aim;
        if( r_aim != "FOLLOW" && r_aim != "DROP"){
          new_list.push(current_order_groups[current_groups_list[i]][k]);
        }
      }
      for(let k = 0; k < current_order_groups[current_groups_list[i]].length; k++){
        let r_aim = race.riders[current_order_groups[current_groups_list[i]][k]].current_aim;
        if(r_aim == "FOLLOW" || r_aim == "DROP"){
          new_list.push(current_order_groups[current_groups_list[i]][k]);
        }
    }
    new_order.push(...new_list);
  }
}
    //console.log("old order " + race.current_order + " current_order_groups " + JSON.stringify(current_order_groups) + " current_groups_list " + current_groups_list + " new_order " + new_order);
    race.current_order = new_order;


    if (continue_racing && (race_state == "play" || race_state == "resume" )){
        setTimeout(
          function(){
            moveRace(); //recursive call to moveRace() to run the next timestep
        },step_speed);
    }
    else{
      //stopRace();
      console.log("Race Complete/paused");
      d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x");
    }


} //** end of moverace()

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
  ctx.fillStyle = CANVAS_BACKGROUND_COLOUR;
  ctx.fillRect(0, 0, c.width, c.height);

  race.riders = [];
  race.current_order = [];
  race.race_clock = 0;
  race.instructions = [];
  race.instructions_t = [];
  race.live_instructions = [];
  race.race_instructions = [];
  race.race_instructions_r = [];

  race.riders_finished = 0; //new setting to count how many have finished and issue positions

  //donalK25: set the new global for the acceleration calculations (default to OFF/0)
  if (typeof(settings.power_application_include_acceleration) != 'undefined'){
    power_application_include_acceleration = settings.power_application_include_acceleration;
  }

  // Update total number of laps
  $("#race_info_no_of_laps").text(race.distance);

  console.log("race.start_order.length "+race.start_order.length)

  //Reset rider properties that change during the race
  for(let i = 0;i<race.start_order.length;i++){

    //set a default group 0 to all riders (all start in the same group)
    race.breakaway_riders_groups[i] = 0;

    let load_rider = riders[race.start_order[i]];

    //donalK25July chokeunderpressure, need to reset the power values IF the rider choked and we are re-running a race
    if (typeof(load_rider.original_threshold_power) != 'undefined'){
      load_rider.threshold_power = load_rider.original_threshold_power;
    }
    if (typeof(load_rider.original_max_power) != 'undefined'){
      load_rider.max_power = load_rider.original_max_power;
    }
    //*****************************

    load_rider.start_offset = i*settings.start_position_offset;
    load_rider.starting_position_x = settings.track_centre_x + (load_rider.start_offset)*settings.vis_scale ;
    load_rider.starting_position_y = settings.track_centre_y;
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
      load_rider.current_aim = "LEAD";
    }
    else{
      load_rider.current_aim = "FOLLOW";
    }

    //add a prop to store how long the rider has been on the front.
    load_rider.time_leading_group = 0;
    load_rider.breakaway_chase_target_rider = -1;
    load_rider.rider_to_follow = {};
    load_rider.chase_period_time_elapsed = 0;
    load_rider.number_of_turns = 0;

    //add an array to track their status
    load_rider.current_aim_history = [];

    race.current_order.push(race.start_order[i]);
    ctx.beginPath();
    let circle_radius = DEFAULT_RIDER_CIRCLE_RADIUS;
    if(CURRENT_ZOOM_SEGMENT_SIZE < race.distance){
      circle_radius = ZOOM_RIDER_CIRCLE_RADIUS;
    }
    ctx.arc(load_rider.current_position_x, load_rider.current_position_y, circle_radius, 0, 2 * Math.PI);
    ctx.fillStyle = load_rider.colour;
    ctx.fill();

    console.log("loading rider " + load_rider.name + " at position " + race.start_order[i] + " with start offset of " + load_rider.start_offset);

    load_rider.time_on_front = 0; //dksep24: want to track how much time each rider spends at the front.
    load_rider.time_on_front_of_group = 0; //dk_oct_25: also want to track the leading of groups
    load_rider.breakaway_attack_duration_elapsed = 0; //dksep25: check attack duration.
    load_rider.finish_time = -1; //dksep25: check attack duration.
    load_rider.finish_position = -1; //dksep25: check attack duration.

    //have moved the drop instruction prop to the rider
    load_rider.drop_instruction = 0;


    //dk2021 new rider property to add info to the log message
    load_rider.step_info = "";

    //initialize the recovery props
    load_rider.recovery_mode = 0;
    load_rider.recovery_mode_recovery_so_far = 0;

    //new array to update props based on distance remaining... create a copy, ordered by distance_remaining, from which we pop entries
    //do we assume it is ordered correctly?
    let updates_list = [...load_rider.in_race_updates];
    updates_list.sort((a, b) => (a[0] < b[0]) ? 1 : -1); //sorted by distance descending
    load_rider.in_race_updates_stack = updates_list;


    // ************* draw a finish line START ***********
    // ************* draw a finish line START ***********
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    let race_finish_point = DISPLAY_LENGTH;
    ctx.moveTo(race_finish_point, 0);
    ctx.lineTo(race_finish_point, 200);
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.setLineDash([]);
    // ************* draw a finish line END ***********
    // ************* draw a finish line END ***********

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

  race.riders = riders;
  addRiderDisplay();
  rider_power_data = []; //reset power data for graph
  for(let i = 0;i<race.start_order.length;i++){
    rider_power_data.push([]); //add an empty array for each rider, so that we can store the power outputs (watts) for each rider/timestep
  }
  // set up props to manage the peloton and its gap
  race.chasing_bunch_current_position = 0-race.chasing_bunch_starting_gap; //relative to the starting line
}

$(document).ready(function() {
  c = document.getElementById("bikeCanvas");


  $('#zoom_segment_size').val(DEFAULT_ZOOM_SEGMENT_SIZE);
  $('#zoom_mode').change(function() {
    toggleZoomMode($(this).prop('checked'))
  })

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

  //console.log("load details from URL");
  //load_details_from_url();
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
        race = {};
        settings = {};
        riders = {};
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
        race = JSON.parse(data[0].race_settings);
        settings = JSON.parse(data[0].global_settings);
        riders = JSON.parse(data[0].rider_settings);

        CURRENT_ZOOM_SEGMENT_SIZE = race.distance;

        load_race();
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
      //update_race_settings();
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
    //update_race_settings();
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

          if(start_order_from_url.length > 0){
            console.log("loaded start_order from URL: " + start_order_from_url);
            $("#teamorder").val(start_order_from_url);
          }
          if(instructions_from_url.length > 0){
            console.log("loaded instructions from URL: " + instructions_from_url);
            $("#instructions_textarea").val(instructions_from_url);
          }

          //need to make sure the race is loaded AFTER we get the settings
          //update_race_settings();
          load_race();
      })}
      else{
        $("#database_connection_label").html("<strong>No Settings loaded</strong>, will use template file settings.");

        //update_race_settings();
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

          //need to make sure the race is loaded AFTER we get the settings
          //update_race_settings();
          load_race();
      })}
      else{
        $("#database_connection_label").html("<strong>No Settings loaded</strong>, will use template file settings.");

        //update_race_settings();
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
