//function to run the race and retuturn a finish TIME

//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data


import {settings} from './global_settings.js';
import {race} from './race_settings.js';
import {riders} from './riders.js';


function run_track_race(){

  //update settings
  let input_teamOrder = $('#starting_order').val().split(",").map(a=>+a);
  if(input_teamOrder.length > 0){
    race.start_order = input_teamOrder;
    console.log("updated race.start_order " + race.start_order )
  }
  let instructions_t = [];
  let new_instructions = $('#instructions').val();
  if(new_instructions.length > 5){
    instructions_t = new_instructions.split(",").map(a=>a.replace(/\"/g,"").split(":"));
  }
  console.log(instructions_t);
  if (instructions_t.length > 0){
    race.race_instructions_r = instructions_t;
  }
  let time_taken = run_race(settings,race,riders);

  console.log(time_taken);
  $("#race_result").text('Finish Time = ' + time_taken);
}

function newton(aero, hw, tr, tran, p) {        /* Newton's method, original is from bikecalculator.com */
  //from http://www.bikecalculator.com/
		var vel = 20;       // Initial guess
		var MAX = 10;       // maximum iterations
		var TOL = 0.05;     // tolerance
		for(let i_n=1; i_n < MAX; i_n++) {
			var tv = vel + hw;
			var aeroEff = (tv > 0.0) ? aero : -aero; // wind in face, must reverse effect
			var f = vel * (aeroEff * tv * tv + tr) - tran * p; // the function
			var fp = aeroEff * (3.0 * vel + hw) * tv + tr;     // the derivative
			var vNew = vel - f / fp;
			if (Math.abs(vNew - vel) < TOL) return vNew;  // success
			vel = vNew;
		}
		return 0.0;  // failed to converge
}


function setEffort(settings_r, race_r,riders_r, effort){ //actually update the effort level
  let leadingRider = race_r.riders_r[race_r.current_order[0]];
  leadingRider.output_level = effort+1;
  console.log("Effort updated to " + effort);
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
    console.log("new_leader.output_level = "+ new_leader.output_level);
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
  console.log("Move lead rider back " + positions_to_drop_back + " positions in order, new order " + new_order);
}

function run_race(settings_r,race_r,riders_r){
  //run the race and return the finish time
  race_r.riders = [];
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

  console.log("race_r.start_order.length "+race_r.start_order.length)

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
    race_r.riders_r.push(load_rider);
    console.log("loading rider " + load_rider.name + " at position " + race_r.start_order[i] + " with start offset of " + load_rider.start_offset);
  }

  let continue_racing = true;
  while(continue_racing){
    //update the race clock, check for instructions, then move the riders based on the current order
    race_r.race_clock++;

    //add any new instructions if found
    let new_instructions = race.race_instructions_r.filter(a=>parseInt(a[0]) == race_r.race_clock);
    if(new_instructions.length > 0){
      for(let i=0;i<new_instructions.length;i++){
        let inst = new_instructions[i][1].split("=");
        if (inst.length=2){
          if(inst[0]=="effort"){
            race.live_instructions.push(["effort",parseInt(inst[1])]);
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

      let density = (1.293 - 0.00426 * settings_r.temperaturev) * Math.exp(-settings_r.elevationv / 7000.0);
      let twt = 9.8 * (race_rider.weight + settings_r.bike_weight);  // total weight of rider + bike in newtons
      let A2 = 0.5 * settings_r.frontalArea * density;  // full air resistance parameter
      let tres = twt * (settings_r.gradev + settings_r.rollingRes); // total resistance = gravity/grade and rolling resistance

      let accumulated_effect = 1; // for accumulated fatigue effect on rider. 1 means no effect, 0 means total effect, so no more non-sustainable effort is possible

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
        race_rider.velocity = newton(A2, settings_r.headwindv, tres, settings_r.transv, powerv);
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
        A2 -= A2*(shelter_effect_strength*level_of_shelter);
        let A2Eff = (tv > 0.0) ? A2 : -A2; // wind in face, must reverse effect
        let target_power = (target_velocity * tres + target_velocity * tv * tv * A2Eff) / settings_r.transv;

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
            if (  race_rider.endurance_fatigue_level < 0){ race_rider.endurance_fatigue_level = 0;};
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
        powerv+=power_adjustment;
        let old_velocity = race_rider.velocity; //use to check if rider slows down or speeds up for this step
        race_rider.velocity = newton(A2, settings_r.headwindv, tres, settings_r.transv, powerv);

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
    }

    //work out the distance covered of the second last rider
    //get the 2nd last rider (whose time is the one that counts)
    let second_last_rider = race_r.riders_r[race_r.current_order[race_r.current_order.length-1]];

    if (second_last_rider.distance_covered > race_r.distance ){
      continue_racing = false;
    }
  }
  //return the final finish time (seconds)
  return race_r.race_clock;
}

$(document).ready(function() {


  //attach events
  $("#button_play_race").on("click", run_track_race);
  $('#starting_order').val(race.start_order.map(a=>a).join(","));

}
);
