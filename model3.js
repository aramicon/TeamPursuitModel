
//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race

//import global, race, and rider setting data

import {settings} from './global_settings.js';
import {race} from './race_settings.js';
import {riders} from './riders.js';

let c = {};
let ctx = {};
var race_state = 'stop';

console.log("Track bend radius = 22m");
console.log("Track straight ((250-(2*Math.PI*22))/2) = " + (250-(2*Math.PI*22))/2 );

function addRiderDisplay(){
  $("#riders_info" ).empty();
  $("#riders_info" ).append("<div id='rider_values_header' class='info_row'><div class='info_column'>Rider</div><div class='info_column'>Dist. m</div><div class='info_column'>Vel. kph</div><div class='info_column'>Watts</div><div class='info_column'>Gap m</div><div class='info_column'>Fatigue</div></div>");
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

function setEffortInstruction(){
  //add instruction to change the effort of the leading rider
  let effort = parseInt(event.target.id.replace("set_effort_",""));
  race.live_instructions.push(["effort",effort+1]);
}

function setEffort(effort){ //actually update the effort level
  let leadingRider = race.riders[race.current_order[0]];
  leadingRider.output_level = effort;
  $('#instruction_info').text("Change effort to " + effort);
  console.log("Effort updated to " + effort);
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

  let current_leader = race.current_order[0];
  race.riders[current_leader].current_aim = "drop"; //separate status whilst dropping back
  let current_leader_power = race.riders[current_leader].power_out; //try to get the new leader to match this velocity

  let new_order = race.current_order.slice(1,positions_to_drop_back+1);
  new_order.push(race.current_order[0]);
  new_order.push(...race.current_order.slice(positions_to_drop_back+1,race.current_order.length));

  race.current_order = new_order;
  //change other rider roles to lead and follow
  let new_leader = race.riders[new_order[0]];

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
      race.riders[new_order[i]].current_aim = "follow";
      //reset their power levels, though chasing riders will always try to follow
      race.riders[new_order[i]].current_power_effort = race.riders[new_order[i]].threshold_power;
    }
  }
  console.log("Move lead rider back " + positions_to_drop_back + " positions in order, new order " + new_order);
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
        }
        else if(inst[0]=="drop"){
          race.drop_instruction = parseInt(inst[1]);
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
    }
  }

  //also look at the drop instruciton: this can only be done at the beginnings of bends where the track is banked
  if(race.drop_instruction > 0){
    if (race.riders.filter(a=>a.current_aim == "drop").length == 0){   //if no  rider is dropping back
      let lead_rider_distance_on_lap = race.riders[race.current_order[0]].distance_covered % settings.track_length;
      if ((lead_rider_distance_on_lap > race.bend1_switch_start_distance && lead_rider_distance_on_lap < race.bend1_switch_end_distance) || (lead_rider_distance_on_lap > race.bend2_switch_start_distance && lead_rider_distance_on_lap < race.bend2_switch_end_distance)){
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

    let density = (1.293 - 0.00426 * settings.temperaturev) * Math.exp(-settings.elevationv / 7000.0);
    let twt = 9.8 * (race_rider.weight + settings.bike_weight);  // total weight of rider + bike in newtons
    let A2 = 0.5 * settings.frontalArea * density;  // full air resistance parameter
    let tres = twt * (settings.gradev + settings.rollingRes); // total resistance = gravity/grade and rolling resistance

    let accumulated_effect = 1; // for accumulated fatigue effect on rider. 1 means no effect, 0 means total effect, so no more non-sustainable effort is possible

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
        let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (race_rider.current_power_effort- race_rider.threshold_power)/race_rider.max_power),settings.fatigue_power_rate);
        race_rider.endurance_fatigue_level += fatigue_rise;
        race_rider.accumulated_fatigue += fatigue_rise;
      }

      let target_power = race_rider.current_power_effort; //try to get to this
      //work out the velocity from the power

      let powerv = race_rider.power_out, power_adjustment = 0;
      //compare power required to previous power and look at how it can increase or decrease
      if (powerv > target_power){ //slowing down
        if((powerv - target_power) > settings.power_adjustment_step_size_down){
          power_adjustment = settings.power_adjustment_step_size_down;
        }
        else{
          power_adjustment = (powerv - target_power);
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
      race_rider.velocity = newton(A2, settings.headwindv, tres, settings.transv, powerv);
      race_rider.power_out = powerv;
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
      A2 -= A2*(shelter_effect_strength*level_of_shelter);
      let A2Eff = (tv > 0.0) ? A2 : -A2; // wind in face, must reverse effect
      let target_power = (target_velocity * tres + target_velocity * tv * tv * A2Eff) / settings.transv;

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
        let fatigue_rise = race_rider.fatigue_rate*Math.pow(( (target_power- race_rider.threshold_power)/race_rider.max_power),settings.fatigue_power_rate);
        race_rider.endurance_fatigue_level += fatigue_rise
        race_rider.accumulated_fatigue += fatigue_rise;
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
      powerv+=power_adjustment;
      let old_velocity = race_rider.velocity; //use to check if rider slows down or speeds up for this step
      race_rider.velocity = newton(A2, settings.headwindv, tres, settings.transv, powerv);

      //if you are dropping back and get back to the rider in front, go back to a follow state
      if(race_rider.current_aim =="drop"){ //once you are behind the rider_to_follow, you 'follow' again
         if((race_rider.velocity+race_rider.distance_covered-race_rider.start_offset) <= (rider_to_follow.distance_covered-rider_to_follow.start_offset)){ //idea is that you are dropping back so long as you are goign slower than the rider you want to follow
          race_rider.current_aim = "follow";
        }
      }
      race_rider.power_out = powerv;
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
       $("#rider_values_"+i).html("<div class='info_column' style='background-color:"+display_rider.colour+"' >" + display_rider.name + display_rider.current_aim.toUpperCase() +  ((i==race.current_order.length-2)?' |F|':'') + " </div><div class='info_column'>"+Math.round(display_rider.distance_covered * 100)/100 + "m</div><div class='info_column'>"+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph </div><div class='info_column'>"+ Math.round(display_rider.power_out * 100)/100 + " / "  +display_rider.threshold_power + " / " + display_rider.max_power + " watts</div>" + "<div class='info_column'>"+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m</div>" + "<div class='info_column'>" + Math.round(display_rider.endurance_fatigue_level) + "/" + Math.round(display_rider.accumulated_fatigue) +  "</div");

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

  if (second_last_rider.distance_covered > race.distance ){
    //all riders ahead of the second_last_rider in the current order must be ahead on the track- otherwise the race goes on...
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
      },settings.race_move_wait_time);

  }
  else{
    //stopRace();
    console.log("Race Complete");
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
    load_rider.output_level=6;
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

  load_details_from_url();

  update_race_settings();

  load_race();
}
);

function playRace() {
    if(race_state=='stop'){
      race_state='play';
      var button = d3.select("#button_play").classed('btn-success', true);
      button.select("i").attr('class', "fa fa-pause fa-3x");
      d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x fa-spin");
    }
    else if(race_state=='play' || race_state=='resume'){
      race_state = 'pause';
      update_race_settings();
      d3.select("#button_play i").attr('class', "fa fa-play fa-3x");
      d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x ");
    }
    else if(race_state=='pause'){
      race_state = 'resume';
          d3.select("#button_play i").attr('class', "fa fa-pause fa-3x");
      d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x fa-spin");
    }
      moveRace();
    console.log("button play pressed, play was "+race_state);
}

function stopRace(){
    race_state = 'stop';
    var button = d3.select("#button_play").classed('btn-success', false);
    button.select("i").attr('class', "fa fa-play fa-3x");
    d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x");
    console.log("button stop invoked.");
    update_race_settings();
    resetRace();
}

function forwardStep() {
      if(race_state == "pause"){
        console.log("button forward invoked.");
        d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x fa-spin");
        setTimeout(function(){  d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x "); }, 200);
        moveRace();
      }
}

function load_details_from_url(){
  let url = new URL(window.location);
  if(url.search.length > 0){
    let start_order = url.searchParams.get("startorder");
    let instructions = url.searchParams.get("instructions");
    if(start_order.length > 0){
      console.log(start_order);
      $("#teamorder").val(start_order);
    }
    if(instructions.length > 0){
      console.log(instructions);
      $("#instructions").val(instructions);
    }
  }



}
