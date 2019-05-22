let c = {};

// let info =  document.getElementById("race_info1");
// let riders_info =  document.getElementById("riders_info");
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
  start_position_offset:3,
  drag_coefficent:0.32,
  air_density:1.225,
  draft_power_savings:0.33
}
let race = {
  distance:400,
  start_order:[0,1,2],
  current_order:[],
  riders: [],
  race_clock:0,
  race_instructions:[],
  current_distance_of_finish_rider:0
}
let riders = [
  {name:'Chris',
  threshold_power:100,
  endurance:8,
  burst_power:9,
  burst_endurance:2,
  starting_energy:100,
  current_energy:100,
  current_position_x:0,
  current_position_y:0,
  starting_position_x:0,
  starting_position_y:0,
  current_track_position:'',
  mass:75,
  velocity:0,
  color:'#ff0000',
  straight_distance_travelled:0,
  bend_distance_travelled :0,
  distance_this_step:0,
  acceleration_this_step:0,
  start_offset:0,
  distance_this_step_remaining:0,
  current_bend_angle:0,
  distance_covered:0,
  bend_centre_x:0,
  power_out:0
  },
  {name:'Bob',
  threshold_power:100,
  endurance:8,
  burst_power:9,
  burst_endurance:2,
  starting_energy:100,
  current_energy:100,
  current_position_x:0,
  current_position_y:0,
  starting_position_x:0,
  starting_position_y:0,
  current_track_position:'',
  mass:75,
  velocity:0,
  color:'#ff00ff',
  straight_distance_travelled:0,
  bend_distance_travelled :0,
  distance_this_step:0,
  acceleration_this_step:0,
  start_offset:0,
  distance_this_step_remaining:0,
  current_bend_angle:0,
  distance_covered:0,
  bend_centre_x:0,
  power_out:0
},
{name:'Laura',
threshold_power:120,
endurance:8,
burst_power:9,
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
velocity:0,
color:'#222222',
straight_distance_travelled:0,
bend_distance_travelled :0,
distance_this_step:0,
acceleration_this_step:0,
start_offset:0,
distance_this_step_remaining:0,
current_bend_angle:0,
distance_covered:0,
bend_centre_x:0,
power_out:0
}
];


  $('#input_race_length').val(race.distance);

for (k=0;k<360;k++){
  console.log()
}
console.log("Track bend radius = 22m");
console.log("Track straight ((250-(2*Math.PI*22))/2) = " + (250-(2*Math.PI*22))/2 );


function addRiderDisplay(){
  for(i=0;i<race.riders.length;i++){
      $("#riders_info" ).empty();
    $("#riders_info" ).append("<span>Rider " + i + "</span><span id='rider_distance_"+i+"'></span>" );
  }
}


function resetRace(){
  console.log("RESETTING RACE")
  load_race()
}

function moveRace(){

  race.race_clock++;
  $("#race_info_clock").text(race.race_clock);
  ctx.clearRect(0, 0, c.width, c.height);
  //console.log("race at " + race.race_clock + " seconds / " + race.distance);
  //move the riders and update the time
  for(i=0;i<race.current_order.length;i++){
    race_rider = race.riders[race.current_order[i]];
    //work out how far the rider can go in this time step
    //work out basic drag from current volocity = CdA*p*((velocity**2)/2)
    let drag_watts = 0;
    let usable_power = 0;
    if (race_rider.current_aim =="lead"){
      //push the pace at the front
      drag_watts = settings.drag_coefficent*settings.air_density*((Math.pow(race_rider.velocity,2))/2);
      usable_power = race_rider.threshold_power - drag_watts;
      race_rider.power_out = usable_power;
        race_rider.acceleration_this_step = Math.sqrt(usable_power/(2*race_rider.mass*race.race_clock));
    }
    else{
      //try to follow (travel the same distace as- apply the same power) the race_rider in front of you
      let rider_to_follow = {};
      if (i==0){
        rider_to_follow = race.riders[race.riders.length-1];
      }
      else{
        rider_to_follow = race.riders[i-1];
       }
      usable_power = rider_to_follow.power_out;
      // assume we are drafting and try to cover the same distance as the race_rider in front, which will take a certain amount of power
      rider_to_follow_distance = rider_to_follow.distance_covered -  race_rider.distance_covered;
      let new_power_req = Math.pow((rider_to_follow_distance - race_rider.velocity),2)*(2*race_rider.mass*race.race_clock);
      new_power_req -= new_power_req*settings.draft_power_savings;
      usable_power = race_rider.power_out + new_power_req;
      if (race_rider.threshold_power < usable_power){
        //oops, you can't keep up
        usable_power = race_rider.threshold_power;
        //assume no drafting once you can't keep up?
        race_rider.acceleration_this_step = Math.sqrt(usable_power/(2*race_rider.mass*race.race_clock));
      }
      else{
        race_rider.acceleration_this_step = (rider_to_follow_distance - race_rider.velocity);
      }
      race_rider.power_out = usable_power;
    }
    race_rider.velocity += race_rider.acceleration_this_step;
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
       $("#rider_distance_"+i).text(race_rider.distance_covered);
    }
    ctx.beginPath();
    ctx.arc(race_rider.current_position_x, race_rider.current_position_y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = race_rider.color;
    ctx.fill();
    //work out how much the race_rider can travel in this second
  }

  //work out the distance covered of the second last rider

  if (race.riders[race.current_order[race.current_order.length-1]].distance_covered < race.distance && (race_state == "play" || race_state == "resume" )){
    setTimeout(
      function(){
        moveRace();
    },100);
  }
  else{
    //stopRace();
    console.log("race complete");
    d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x");
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
  let input_race_length = parseInt($('#input_race_length').val());
  if(Number.isInteger(input_race_length)){
    race.distance = input_race_length;
  }
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
    if (i==0){
      load_rider.current_aim = "lead";
    }
    else{
      load_rider.current_aim = "follow";
    }
    race.current_order.push(race.start_order[i]);
    ctx.beginPath();
    ctx.arc(load_rider.current_position_x, load_rider.current_position_y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = load_rider.color;
    ctx.fill();
    race.riders.push(load_rider);
    console.log("loading rider " + load_rider.name + " at position " + race.start_order[i] + " with start offset of " + load_rider.start_offset);
  }

  addRiderDisplay();
}

$(document).ready(function() {
  c = document.getElementById("bikeCanvas");
  ctx =c.getContext("2d");
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
    resetRace();
}

function forwardStep() {
      if(race_state == "pause"){
        console.log("button forward invoked.");
        d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x fa-spin");
        setTimeout(function(){   d3.select("#current_activity i").attr('class', "fas fa-cog fa-2x "); }, 200);
        moveRace();
      }

}
