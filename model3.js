
//code by Donal kelly donakello@gmail.com
//Model of team pursuit track cycle race




let c = {};
let ctx = {};
var race_state = 'stop';
let settings={
  radius:100,
  fixed_test_distance:1,
  track_bend_radius:22,
  track_straight_length:55.88496162102456,//((250-(2*Math.PI*22))/2),
  vis_scale:5,
  track_centre_x:400,
  track_centre_y:200,
  race_bend_distance:0,
  start_position_offset:2,
  drag_coefficent:0.32,
  air_density:1.225,
  draft_power_savings:0.33,
  drafting_effect_on_drag:0.4,
  temperaturev:22,
  elevationv:100,
  bike_weight:9,
  gradev:0, //obvs track is flat
  rollingRes:0.004,
  power_adjustment_step_size_up:20,//how many watts can a rider increase by
  power_adjustment_step_size_down:-40,//slowing down is quicker!
  transv:0.95,//transmission efficiency
  headwindv:0,//headwind, zero seems fair for an indoor track
  race_move_wait_time:100,//slows down the visualisation
  frontalArea:0.233,
  damping_visibility_distance:20,// # metres from which damping can start
  fatigue_failure_level:100, // when fatigue get here, riders have to rest

}
let race = {
  distance:4000,
  start_order:[0,1,2],
  current_order:[],
  riders: [],
  race_clock:0,
  race_instructions:[],
  current_distance_of_finish_rider:0
}
let riders = [
  {name:'Aardvark',
  threshold_power:400,
  current_power_effort:0,
  endurance:8,
  max_power:900,
  burst_endurance:2,
  starting_energy:100,
  current_energy:100,
  current_position_x:0,
  current_position_y:0,
  starting_position_x:0,
  starting_position_y:0,
  current_track_position:'',
  mass:75,
  weight:75,
  velocity:0,
  colour:'#ff0000',
  straight_distance_travelled:0,
  bend_distance_travelled :0,
  distance_this_step:0,
  acceleration_this_step:0,
  start_offset:0,
  distance_this_step_remaining:0,
  current_bend_angle:0,
  distance_covered:0,
  bend_centre_x:0,
  power_out:0,
  distance_from_rider_in_front:0,
  endurance_fatigue_level:0,
  burst_fatigue_level:0,
  fatigue_rate:2,
  recovery_rate:2,
  output_level:6,//6 is threshold
  },
  {name:'Bee Man',
  threshold_power:400,
  current_power_effort:0,
  endurance:8,
  max_power:1000,
  burst_endurance:2,
  starting_energy:100,
  current_energy:100,
  current_position_x:0,
  current_position_y:0,
  starting_position_x:0,
  starting_position_y:0,
  current_track_position:'',
  mass:75,
  weight:75,
  velocity:0,
  colour:'#ff00ff',
  straight_distance_travelled:0,
  bend_distance_travelled :0,
  distance_this_step:0,
  acceleration_this_step:0,
  start_offset:0,
  distance_this_step_remaining:0,
  current_bend_angle:0,
  distance_covered:0,
  bend_centre_x:0,
  power_out:0,
  distance_from_rider_in_front:0,
  endurance_fatigue_level:0,
  burst_fatigue_level:0,
  fatigue_rate:2,
  recovery_rate:1,
  output_level:6,//6 is threshold
},
{
  name:'CC 20',
  threshold_power:300,
  current_power_effort:0,
  endurance:8,
  max_power:700,
  burst_endurance:2,
  starting_energy:100,
  current_energy:100,
  current_position_x:0,
  current_position_y:0,
  starting_position_x:0,
  starting_position_y:0,
  current_track_position:'',
  current_aim:'',
  mass:75,
  weight:75,
  velocity:0,
  colour:'#a6a6a6',
  straight_distance_travelled:0,
  bend_distance_travelled :0,
  distance_this_step:0,
  acceleration_this_step:0,
  start_offset:0,
  distance_this_step_remaining:0,
  current_bend_angle:0,
  distance_covered:0,
  bend_centre_x:0,
  power_out:0,
  distance_from_rider_in_front:0,
  endurance_fatigue_level:0,
  burst_fatigue_level:0,
  fatigue_rate:4,
  recovery_rate:2,
  output_level:6,//6 is threshold
}
];

console.log("Track bend radius = 22m");
console.log("Track straight ((250-(2*Math.PI*22))/2) = " + (250-(2*Math.PI*22))/2 );

function addRiderDisplay(){
  $("#riders_info" ).empty();
  $("#riders_info" ).append("<div id='rider_values_header' class='info_row'><div class='info_column'>Rider</div><div class='info_column'>Dist. m</div><div class='info_column'>Vel. kph</div><div class='info_column'>Watts</div><div class='info_column'>Gap m</div><div class='info_column'>Fatigue</div></div>");
  for(i=0;i<race.riders.length;i++){
    $("#riders_info" ).append("<div id='rider_values_"+i+"' class='info_row'></div>" );
  }
}

function resetRace(){
  console.log("RESETTING RACE")
  load_race()
}

function newton(aero, hw, tr, tran, p) {        /* Newton's method */
  //from http://www.bikecalculator.com/
		var vel = 20;       // Initial guess
		var MAX = 10;       // maximum iterations
		var TOL = 0.05;     // tolerance
		for (i_n=1; i_n < MAX; i_n++) {
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

function setEffort(effort){
  //change the effort of the leading rider
  let leadingRider = race.riders[race.current_order[0]];
    leadingRider.output_level = effort+1;
  // let new_power = leadingRider.threshold_power*(effort+1)/10;
  // leadingRider.current_power_effort = new_power;
  $('#instruction_info').text("Change effort to " + effort + ": " + new_power + " watts");
}

function switchLead(positions_to_drop_back){
  //move the lead rider back a given number of spaces: positions_to_drop_back, 1-team_size - 1
  if (positions_to_drop_back >= (race.current_order.length-1)){
    positions_to_drop_back = (race.current_order.length-1);
  }

  let new_order = race.current_order.slice(1,positions_to_drop_back+1);
  new_order.push(race.current_order[0]);
  new_order.push(...race.current_order.slice(positions_to_drop_back+1,race.current_order.length));

  race.current_order = new_order;
  //change the rider roles
  race.riders[new_order[0]].current_aim = "lead";
  for(i=1;i<new_order.length;i++){
    race.riders[new_order[i]].current_aim = "follow";
    //reset their power level
      race.riders[new_order[i]].current_power_effort = race.riders[new_order[i]].threshold_power;
  }

  console.log("Move lead rider back " + positions_to_drop_back + " positions in order, new order " + new_order);
}


function moveRace(){
  race.race_clock++;
  $("#race_info_clock").text(race.race_clock);
  ctx.clearRect(0, 0, c.width, c.height);
  //console.log("race at " + race.race_clock + " seconds / " + race.distance);
  //move the riders and update the time

  for(i=0;i<race.current_order.length;i++){
    race_rider = race.riders[race.current_order[i]];
    //work out how far the race_rider can go in this time step
    //work out basic drag from current volocity = CdA*p*((velocity**2)/2)
    let drag_watts = 0;
    let usable_power = 0;
    let density = (1.293 - 0.00426 * settings.temperaturev) * Math.exp(-settings.elevationv / 7000.0);
    let twt = 9.8 * race_rider.weight + settings.bike_weight;  // total weight in newtons
    let A2 = 0.5 * settings.frontalArea * density;  // full air resistance parameter
    let tres = twt * (settings.gradev + settings.rollingRes); // gravity and rolling resistance
    if (race_rider.current_aim =="lead"){
      //push the pace at the front
      //what's the current effort?
      //consider fatigue
      if(race_rider.endurance_fatigue_level >= settings.fatigue_failure_level){
        race_rider.output_level = 5;
      }
      //set the power level based on the effort instruction
      if (race_rider.output_level < 6){
        race_rider.current_power_effort = race_rider.threshold_power*(race_rider.output_level)/10;
        //recover if going under the threshold
        if (race_rider.endurance_fatigue_level > 0){
          race_rider.endurance_fatigue_level -= race_rider.recovery_rate*( (race_rider.threshold_power- race_rider.current_power_effort)/race_rider.threshold_power)
        }
      }
      else if(race_rider.output_level == 6){
        race_rider.current_power_effort = race_rider.threshold_power;
      }
      else{
        race_rider.current_power_effort = race_rider.max_power*(race_rider.output_level)/10;
        //add fatigue if going harder than the threshold
        race_rider.endurance_fatigue_level += race_rider.fatigue_rate*( (race_rider.current_power_effort- race_rider.threshold_power)/race_rider.max_power);
      }


      // leadingRider.current_power_effort = new_power;
      let target_power = race_rider.current_power_effort; //try to get to this
      //work out the velocity from the power

      let powerv = race_rider.power_out, power_adjustment = 0;
      if (powerv > target_power){//slowing down
        if((powerv - target_power) > settings.power_adjustment_step_size_down){
          power_adjustment = settings.power_adjustment_step_size_down;
        }
        else{
          power_adjustment = (powerv - target_power);
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

      race_rider.velocity = newton(A2, settings.headwindv, tres, settings.transv, powerv);

      drag_watts = settings.drag_coefficent*settings.air_density*((Math.pow(race_rider.velocity,2))/2);
      usable_power = powerv; //race_rider.current_power_effort - drag_watts;
      race_rider.power_out = usable_power;
      //race_rider.acceleration_this_step = Math.sqrt(usable_power/(2*race_rider.mass*race.race_clock));
      race_rider.acceleration_this_step = 0;//disable old acceleration formula
    }
    else{
      //try to follow (travel the same distace as- apply the same power) the race_rider in front of you
      let rider_to_follow = {};
      if (i==0){
        rider_to_follow = race.riders[race.current_order[race.current_order.length-1]];
      }
      else{
        rider_to_follow = race.riders[race.current_order[i-1]];
       }
      usable_power = rider_to_follow.power_out;
      // assume we are drafting and try to cover the same distance as the race_rider in front, which will take a certain amount of power
      //need to factor in the original offset
      let distance_to_cover = (rider_to_follow.distance_covered - rider_to_follow.start_offset- settings.start_position_offset) -  (race_rider.distance_covered-race_rider.start_offset);
      //this is your target velocity, but it might not be possible. assuming 1 s - 1 step
      let target_velocity = distance_to_cover;
      //work out the power needed for this velocity- remember we are drafting
      let tv = target_velocity + settings.headwindv;
      //to work out the shelter, distance from the rider in front is needed

      let level_of_shelter = 1;//maximum shelter
      if (race_rider.distance_from_rider_in_front > 3){
        level_of_shelter = 0; //after 3m assume no shelter: this is a hardcoded guess
      }
      else if (race_rider.distance_from_rider_in_front > 0){
        //between 0 and three metres need to drop off - try a linear model
        level_of_shelter = (1-(level_of_shelter/3));
      }
      else if (race_rider.distance_from_rider_in_front == -1){
        //if you have no rider in front of you this distance is set to -1, so you have no shelter
        level_of_shelter = 0;
      }
      A2 -= A2*(settings.drafting_effect_on_drag*level_of_shelter);
      let A2Eff = (tv > 0.0) ? A2 : -A2; // wind in face, must reverse effect
      let target_power = (target_velocity * tres + target_velocity * tv * tv * A2Eff) / settings.transv;

      //What is the max power that this rider can do for now? Need to consider fatigue
      let current_max_power = race_rider.max_power;

      if(race_rider.endurance_fatigue_level >= settings.fatigue_failure_level){
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
        }
      }
      else{
        //add fatigue if going harder than the threshold
        race_rider.endurance_fatigue_level += race_rider.fatigue_rate*( (target_power - race_rider.threshold_power)/race_rider.max_power);
      }




      //BUT, can this power be achieved? we may have to accelerate, or decelerate, or it might be impossible
      let powerv = race_rider.power_out, power_adjustment = 0;

      //to stop radical slowing down/speeding up, need to reduce it as the target rider's velocity is approched
      let damping = 1;
      if (Math.abs(distance_to_cover) < settings.damping_visibility_distance){
        //damping = (Math.abs(distance_to_cover)/settings.damping_visibility_distance);
      }

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
      race_rider.velocity = newton(A2, settings.headwindv, tres, settings.transv, powerv);

      //drag_watts = settings.drag_coefficent*settings.air_density*((Math.pow(race_rider.velocity,2))/2);
      usable_power = powerv; //race_rider.current_power_effort - drag_watts;
      race_rider.power_out = usable_power;
      //race_rider.acceleration_this_step = Math.sqrt(usable_power/(2*race_rider.mass*race.race_clock));
      //race_rider.acceleration_this_step = 0;//disable old acceleration formula

      //let new_power_req = Math.pow((rider_to_follow_distance - race_rider.velocity),2)*(2*race_rider.mass*race.race_clock);
      //new_power_req -= new_power_req*settings.draft_power_savings;
      //usable_power = race_rider.power_out + new_power_req;
      //if (race_rider.current_power_effort < usable_power){
        //oops, you can't keep up
        //usable_power = race_rider.current_power_effort;
        //assume no drafting once you can't keep up?
        //race_rider.acceleration_this_step = Math.sqrt(usable_power/(2*race_rider.mass*race.race_clock));
    //  }
      //else{
      //  race_rider.acceleration_this_step = (rider_to_follow_distance - race_rider.velocity);
    //  }
      //race_rider.power_out = usable_power;
    }
    //race_rider.velocity += race_rider.acceleration_this_step;
    race_rider.distance_this_step = race_rider.velocity; //asssumes we are travelling for 1 second!
    console.log(race_rider.name + " " + race_rider.current_aim + " at " + race.race_clock + " power " + usable_power + " usable/" + drag_watts + "drag acceleration " + race_rider.acceleration_this_step + " new velocity " + race_rider.velocity);

    //if on a straight just keep going in that direction
    //may need to break a distance covered down into parts (e.g. going from bend to straight)
    race_rider.distance_this_step_remaining = race_rider.distance_this_step;

    while(race_rider.distance_this_step_remaining > 0){
      let distance_this_step_segment =   race_rider.distance_this_step_remaining;
      let current_distance =  race_rider.distance_covered;
      if (race_rider.current_track_position == 'start'){
        if (race_rider.straight_distance_travelled + distance_this_step_segment <= ((settings.track_straight_length/2) + race_rider.start_offset)){
          //can do full step on straight
          race_rider.straight_distance_travelled += distance_this_step_segment;
          race_rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
          race_rider.distance_covered+=distance_this_step_segment;
          race_rider.distance_this_step_remaining = 0;
          console.log(race.race_clock + ": " + race_rider.name + "straight 1 (start) full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining = " +   race_rider.distance_this_step_remaining  + " with start offset of " + race_rider.start_offset  )
        }
        else{
          distance_this_step_segment =  (settings.track_straight_length/2 + race_rider.start_offset) - race_rider.straight_distance_travelled;
          race_rider.straight_distance_travelled += distance_this_step_segment;
          race_rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
          race_rider.distance_covered+=distance_this_step_segment;
          race_rider.distance_this_step_remaining -= distance_this_step_segment;
          //rest of segment is on the bend
          race_rider.current_track_position = 'bend1';
          race_rider.bend_centre_x = race_rider.current_position_x
          //console.log("race_rider.bend_centre_x="+race_rider.bend_centre_x);
          console.log(race.race_clock + ": " + race_rider.name + " straight 1 (start) partial "+distance_this_step_segment+" of "+race_rider.distance_this_step+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining " +   race_rider.distance_this_step_remaining + " start offset " + race_rider.start_offset  )
          race_rider.current_bend_angle=90;
        }
      }
      else if (  race_rider.current_track_position == 'bend1') {
        console.log(race.race_clock + ": " + race_rider.name +  " race_rider.bend_distance_travelled = " + race_rider.bend_distance_travelled + " distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((race_rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          race_rider.bend_distance_travelled+=distance_this_step_segment;
          race_rider.current_bend_angle +=((distance_this_step_segment*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          race_rider.distance_covered+=distance_this_step_segment;
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          race_rider.distance_this_step_remaining = 0;
          console.log(race.race_clock + ": " + race_rider.name +  " bend 1 full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend_angle "  + race_rider.current_bend_angle  )
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - race_rider.bend_distance_travelled;

          race_rider.current_bend_angle +=((distance_on_bend*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
        //  rider.bend_distance_travelled+=distance_on_bend;
          race_rider.distance_covered+=distance_on_bend;
          race_rider.distance_this_step_remaining -= distance_on_bend;
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;

          console.log(race.race_clock + ": " + race_rider.name +  " bend 1 partial "+distance_on_bend+" of "+distance_this_step_segment + " to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend_angle " + race_rider.current_bend_angle  )

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
          race_rider.current_position_x += distance_this_step_segment*settings.vis_scale;
          race_rider.distance_covered+=distance_this_step_segment;
          race_rider.distance_this_step_remaining = 0;
          console.log(race.race_clock + ": " + race_rider.name + " straight 2 full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   travelled " + race_rider.straight_distance_travelled + " of " + settings.track_straight_length   )
        }
        else{
          distance_this_step_segment =  settings.track_straight_length - race_rider.straight_distance_travelled;
          race_rider.straight_distance_travelled += distance_this_step_segment;
          race_rider.current_position_x += distance_this_step_segment*settings.vis_scale;
          race_rider.distance_covered+=distance_this_step_segment;
          race_rider.distance_this_step_remaining -= distance_this_step_segment;
          console.log(race.race_clock + ": " +  race_rider.name + " straight 2 partial "+distance_this_step_segment+" of "+race_rider.distance_this_step+" to (" +race_rider.current_position_x + "," + race_rider.current_position_y + ")   travelled " + race_rider.straight_distance_travelled + " distance_this_step_remaining" +   race_rider.distance_this_step_remaining )
          //rest of segment goes on to bend 2

          race_rider.current_track_position = 'bend2';
          race_rider.bend_centre_x = race_rider.current_position_x
          //console.log("race_rider.bend_centre_x="+race_rider.bend_centre_x);
          race_rider.current_bend_angle=270;
        }
      }
      else if (race_rider.current_track_position == 'bend2') {
        console.log(race.race_clock + ": " + race_rider.name +  " bend 2 bend_distance_travelled = " + race_rider.bend_distance_travelled + "distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((race_rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          race_rider.bend_distance_travelled+=distance_this_step_segment;
          race_rider.current_bend_angle +=((distance_this_step_segment*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          race_rider.distance_covered+=distance_this_step_segment;
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          race_rider.distance_this_step_remaining = 0;
          console.log(race.race_clock + ": " + race_rider.name + " bend 2 full distance "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend angle " + race_rider.current_bend_angle )
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - race_rider.bend_distance_travelled;
          race_rider.current_bend_angle +=((distance_on_bend*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          race_rider.distance_covered+=distance_on_bend;
          race_rider.distance_this_step_remaining -= distance_on_bend;
          race_rider.current_position_x = race_rider.bend_centre_x + Math.cos((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          race_rider.current_position_y = settings.track_centre_y - Math.sin((race_rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          console.log(race.race_clock + ": " + race_rider.name +  " bend 2 partial "+distance_on_bend+" of "+distance_this_step_segment + " to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ") bend angle " + race_rider.current_bend_angle  );

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
            race_rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
            race_rider.distance_covered+=distance_this_step_segment;
            race_rider.distance_this_step_remaining = 0;
            console.log(race.race_clock + ": " + race_rider.name + " straight 1 full "+distance_this_step_segment+" to (" + race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining = " +   race_rider.distance_this_step_remaining   )
          }
          else{
            distance_this_step_segment =  settings.track_straight_length - race_rider.straight_distance_travelled;
            race_rider.straight_distance_travelled += distance_this_step_segment;
            race_rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
            race_rider.distance_covered+=distance_this_step_segment;
            race_rider.distance_this_step_remaining -= distance_this_step_segment;
            console.log(race.race_clock + ": " + race_rider.name + " straight 1 partial "+distance_this_step_segment+" of "+race_rider.distance_this_step+" to (" +race_rider.current_position_x + "," + race_rider.current_position_y + ")   race_rider.distance_this_step_remaining" +   race_rider.distance_this_step_remaining );

            //rest of segment goes on to bend 2
            race_rider.current_track_position = 'bend1';
            race_rider.bend_centre_x = race_rider.current_position_x
            //console.log("race_rider.bend_centre_x="+race_rider.bend_centre_x);
            race_rider.current_bend_angle=90;
          }
      }
    }
    ctx.beginPath();
    ctx.arc(race_rider.current_position_x, race_rider.current_position_y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = race_rider.colour;
    ctx.fill();
    //work out how much the race_rider can travel in this second
  }

  //update each rider's distance value for the rider in front of them (lead is zero)
    //race.riders[race.current_order[0]].distance_from_rider_in_front = 0;
    for(i=0;i<race.current_order.length;i++){
      let ri = race.current_order[i];
      let display_rider = race.riders[ri];
      //is there a rider in front, i.e. who has covered more distance? find the closest rider that is in front of you and use this gap to work out your shelter
      let rif = -1;
      let min_distance = -1;
      for(j=0;j<race.current_order.length;j++){
          if(i!==j){ //ignore distance to self
            let distance_to_rider = (race.riders[race.current_order[j]].distance_covered - race.riders[race.current_order[j]].start_offset ) - (display_rider.distance_covered - display_rider.start_offset);
            if(distance_to_rider >= 0){//ignore riders behind you, who will have negative distance
              if(min_distance==-1){
                min_distance = distance_to_rider;
              }
              else if (distance_to_rider <  min_distance){
                min_distance = distance_to_rider;
              }
            }
          }
      }
      //let rif = race.current_order[i-1]
      //display_rider.distance_from_rider_in_front = race.riders[rif].distance_covered - display_rider.distance_covered;
      display_rider.distance_from_rider_in_front = min_distance;
        // if  (Math.abs(display_rider.distance_from_rider_in_front) > 0.05){
        //   debugger
        // }


      //display the rider properties

       $("#rider_values_"+i).html("<div class='info_column' style='background-color:"+display_rider.colour+"' >" + display_rider.name + " " + display_rider.current_aim.toUpperCase() + " </div><div class='info_column'>"+Math.round(display_rider.distance_covered * 100)/100 + "m</div><div class='info_column'>"+ Math.round(display_rider.velocity * 3.6 * 100)/100 + " kph </div><div class='info_column'>"+ Math.round(display_rider.power_out * 100)/100 + " watts</div>" + "<div class='info_column'>"+ Math.round(display_rider.distance_from_rider_in_front * 100)/100 + " m</div>" + "<div class='info_column'>" + display_rider.endurance_fatigue_level + "</div");

    }

  //work out the distance covered of the second last rider
  if (race.riders[race.current_order[race.current_order.length-1]].distance_covered < race.distance && (race_state == "play" || race_state == "resume" )){
    setTimeout(
      function(){
        moveRace();
    },settings.race_move_wait_time);
  }
  else{
    //stopRace();
    console.log("race complete");
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

  console.log("race.start_order.length "+race.start_order.length)
  for(i = 0;i<race.start_order.length;i++){
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
    load_rider.acceleration_this_step = 0;
    load_rider.distance_covered = 0;
    load_rider.straight_distance_travelled=0;
    load_rider.bend_distance_travelled=0;
    load_rider.distance_this_step_remaining=0;
    load_rider.power_out=0;
    load_rider.velocity=0;
    load_rider.current_power_effort = load_rider.threshold_power;
    load_rider.endurance_fatigue_level = 0;
    load_rider.burst_fatigue_level = 0;
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
    race.riders.push(load_rider);
    console.log("loading rider " + load_rider.name + " at position " + race.start_order[i] + " with start offset of " + load_rider.start_offset);
  }

  addRiderDisplay();
}

$(document).ready(function() {
  c = document.getElementById("bikeCanvas");
  ctx =c.getContext("2d");
  $('#input_race_length').val(race.distance);
  $('#frontalArea').val(settings.frontalArea);
  $('#teamorder').val(race.start_order.map(a=>a).join(","));


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
