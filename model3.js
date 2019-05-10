let c = document.getElementById("bikeCanvas");
// let info =  document.getElementById("race_info1");
// let riders_info =  document.getElementById("riders_info");
let ctx = c.getContext("2d");




let settings={
  radius:100,
  fixed_test_distance:1,
  track_bend_radius:22,
  track_straight_length:55.88496162102456,//((250-(2*Math.PI*22))/2),
  vis_scale:5,
  track_centre_x:400,
  track_centre_y:200,
  race_bend_distance:0,
  start_position_offset:20
}

let race = {
  distance:800,
  start_order:[0,1],
  riders: [],
  race_clock:0,
  race_instructions:[],
  current_distance_of_finish_rider:0,
  bend_centre_x:0
}

let riders = [
  {name:'Chris',
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
  distance_covered:0
  },
  {name:'Bob',
  threshold_power:200,
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
  distance_covered:0
}
]

  $('#input_race_length').val(race.distance);

for (k=0;k<360;k++){
  console.log()
}
console.log("Track bend radius = 22m");
console.log("Track straight ((250-(2*Math.PI*22))/2) = " + (250-(2*Math.PI*22))/2 );


function addRiderDisplay(){
  for(i=0;i<race.riders.length;i++){
    $("#riders_info" ).append("<span>Rider " + i + "</span><span id='rider_distance_"+i+"'></span>" );
  }
}

function load_race(){
  //set up the race using the riders given
  // use the given order
  ctx.clearRect(0, 0, c.width, c.height);
  race.riders = [];
  console.log("race.start_order.length "+race.start_order.length)
  for(i = 0;i<race.start_order.length;i++){
    console.log("rider position " + i  )

    rider = riders[race.start_order[i]]
    rider.start_offset = i*settings.start_position_offset;
    rider.starting_position_x = settings.track_centre_x + (rider.start_offset)*settings.vis_scale ;
    rider.starting_position_y = settings.track_centre_y - (settings.track_bend_radius*settings.vis_scale);
    rider.current_position_x = rider.starting_position_x;
    rider.current_position_y = rider.starting_position_y;
    rider.current_track_position = 'start';
    rider.current_bend_angle=0;

    ctx.arc(rider.current_position_x, rider.current_position_y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = rider.color;
    ctx.fill();

    race.riders.push(rider);
    console.log("Start " + rider.name + " at position " + race.start_order[i] + " with start offset of " + rider.start_offset);




  }
  addRiderDisplay();

  race.bend_centre_x = 0;
  rider.distance_this_step = 0;
  rider.acceleration_this_step = 0;
  settings.race_bend_distance = Math.PI * settings.track_bend_radius;

  let input_race_length = parseInt($('#input_race_length').val());
  if(Number.isInteger(input_race_length)){
    race.distance = input_race_length;
  }

}
function startRace(){
  pause = false;
  moveRace();
}

function moveRace(){

  race.race_clock++;
  $("#race_info_clock").text(race.race_clock);

  ctx.clearRect(0, 0, c.width, c.height);
  //console.log("race at " + race.race_clock + " seconds / " + race.distance);
  //move the riders and update the time
  for(i=0;i<race.riders.length;i++){
    rider = race.riders[i];
    //work out how far the rider can go in this time step

    rider.acceleration_this_step = Math.sqrt(rider.threshold_power/(2*rider.mass*race.race_clock));
    rider.velocity += rider.acceleration_this_step;
    rider.distance_this_step = rider.velocity;

    console.log("Rider "+ rider.name + " acceleration at time " + race.race_clock + " seconds  =  " + rider.acceleration_this_step + " new velocity is " + rider.velocity);

    //if on a straight just keep going in that direction
    //may need to break a distance covered down into parts (e.g. going from bend to straight)
    rider.distance_this_step_remaining = rider.distance_this_step;

    while(rider.distance_this_step_remaining > 0){
      let distance_this_step_segment =   rider.distance_this_step_remaining;
      let current_distance =  rider.distance_covered;
      if (rider.current_track_position == 'start'){
        if (rider.straight_distance_travelled + distance_this_step_segment <= ((settings.track_straight_length/2) + rider.start_offset)){
          //can do full step on straight
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
          rider.distance_covered+=distance_this_step_segment;
          rider.distance_this_step_remaining = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on start straight to (" + rider.current_position_x + "," + rider.current_position_y + ")   rider.distance_this_step_remaining = " +   rider.distance_this_step_remaining  + " with start offset of " + rider.start_offset  )
        }
        else{
          distance_this_step_segment =  (settings.track_straight_length/2 + rider.start_offset) - rider.straight_distance_travelled;
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
          rider.distance_covered+=distance_this_step_segment;
          rider.distance_this_step_remaining -= distance_this_step_segment;
          //rest of segment is on the bend
          rider.current_track_position = 'bend1';
          race.bend_centre_x = rider.current_position_x
          //console.log("race.bend_centre_x="+race.bend_centre_x);
          console.log("Travel partial distance, "+distance_this_step_segment+" of "+rider.distance_this_step+" on start straight to (" + rider.current_position_x + "," + rider.current_position_y + ")   rider.distance_this_step_remaining " +   rider.distance_this_step_remaining + " with start offset of " + rider.start_offset  )
          rider.current_bend_angle=90;
        }

      }
      else if (  rider.current_track_position == 'bend1') {
        console.log("rider.bend_distance_travelled = " + rider.bend_distance_travelled + "distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          rider.bend_distance_travelled+=distance_this_step_segment;
          rider.current_bend_angle +=((distance_this_step_segment*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          rider.distance_covered+=distance_this_step_segment;
          rider.current_position_x = race.bend_centre_x + Math.cos((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.distance_this_step_remaining = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on bend 1 to (" + rider.current_position_x + "," + rider.current_position_y + ") rider.current_bend_angle angle "  + rider.current_bend_angle  )
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - rider.bend_distance_travelled;

          rider.current_bend_angle +=((distance_on_bend*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
        //  rider.bend_distance_travelled+=distance_on_bend;
          rider.distance_covered+=distance_on_bend;
          rider.distance_this_step_remaining -= distance_on_bend;
          rider.current_position_x = race.bend_centre_x + Math.cos((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          //rider is now on straight2
          rider.current_bend_angle = 0;
          rider.current_track_position = 'straight2';
          rider.straight_distance_travelled = 0;
          rider.bend_distance_travelled = 0;
          console.log("Travel partial distance, "+distance_on_bend+" of "+distance_this_step_segment + " on bend 1 to (" + rider.current_position_x + "," + rider.current_position_y + ") rider.current_bend_angle angle " + rider.current_bend_angle  )
        }
      }
      else if (rider.current_track_position == 'straight2') {

        if (rider.straight_distance_travelled + distance_this_step_segment <= (settings.track_straight_length)){
          //can do full step on straight
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x += distance_this_step_segment*settings.vis_scale;
          rider.distance_covered+=distance_this_step_segment;
          rider.distance_this_step_remaining = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on  straight 2 to (" + rider.current_position_x + "," + rider.current_position_y + ")   rider.distance_this_step_remaining = " +   rider.distance_this_step_remaining   )
        }
        else{
          distance_this_step_segment =  settings.track_straight_length - rider.straight_distance_travelled;
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x += distance_this_step_segment*settings.vis_scale;
          rider.distance_covered+=distance_this_step_segment;
          rider.distance_this_step_remaining -= distance_this_step_segment;
          //rest of segment goes on to bend 2
          rider.current_track_position = 'bend2';
          race.bend_centre_x = rider.current_position_x
          //console.log("race.bend_centre_x="+race.bend_centre_x);
          console.log("Travel partial distance, "+distance_this_step_segment+" of "+rider.distance_this_step+" on straight 2 to (" +rider.current_position_x + "," + rider.current_position_y + ")   rider.distance_this_step_remaining" +   rider.distance_this_step_remaining )
          rider.current_bend_angle=270;
        }
      }
      else if (rider.current_track_position == 'bend2') {
        console.log("bend 2 rider.bend_distance_travelled = " + rider.bend_distance_travelled + "distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          rider.bend_distance_travelled+=distance_this_step_segment;
          rider.current_bend_angle +=((distance_this_step_segment*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          rider.distance_covered+=distance_this_step_segment;
          rider.current_position_x = race.bend_centre_x + Math.cos((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.distance_this_step_remaining = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on bend 2 to (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - rider.bend_distance_travelled;
          rider.current_bend_angle +=((distance_on_bend*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          rider.distance_covered+=distance_on_bend;
          rider.distance_this_step_remaining -= distance_on_bend;
          rider.current_position_x = race.bend_centre_x + Math.cos((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((rider.current_bend_angle*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;

          //rider is now on straight2
          rider.current_bend_angle = 0;
          rider.bend_distance_travelled= 0;
          rider.current_track_position = 'straight1';
          rider.straight_distance_travelled = 0;
          console.log("Travel partial distance, "+distance_on_bend+" of "+distance_this_step_segment + " on bend 2 to (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
        }
      }
      else if (rider.current_track_position == 'straight1') {
            if (rider.straight_distance_travelled + distance_this_step_segment <= (settings.track_straight_length)){
            //can do full step on straight
            rider.straight_distance_travelled += distance_this_step_segment;
            rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
            rider.distance_covered+=distance_this_step_segment;
            rider.distance_this_step_remaining = 0;
            console.log("Travel full distance "+distance_this_step_segment+" on  straight 1 to (" + rider.current_position_x + "," + rider.current_position_y + ")   rider.distance_this_step_remaining = " +   rider.distance_this_step_remaining   )
          }
          else{
            distance_this_step_segment =  settings.track_straight_length - rider.straight_distance_travelled;
            rider.straight_distance_travelled += distance_this_step_segment;
            rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
            rider.distance_covered+=distance_this_step_segment;
            rider.distance_this_step_remaining -= distance_this_step_segment;
            //rest of segment goes on to bend 2
            rider.current_track_position = 'bend1';
            race.bend_centre_x = rider.current_position_x
            //console.log("race.bend_centre_x="+race.bend_centre_x);
            console.log("Travel partial distance, "+distance_this_step_segment+" of "+rider.distance_this_step+" on straight 1 to (" +rider.current_position_x + "," + rider.current_position_y + ")   rider.distance_this_step_remaining" +   rider.distance_this_step_remaining )
            rider.current_bend_angle=90;
          }
      }
       $("#rider_distance_"+i).text(rider.distance_covered);
    }
    ctx.beginPath();
    ctx.arc(rider.current_position_x, rider.current_position_y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = rider.color;
    ctx.fill();
    //work out how much the rider can travel in this second
  }


  if (rider.distance_covered < race.distance && pause == false){
    setTimeout(
      function(){
        moveRace();
    },100);
  }



}

function stopRace(){
  if(pause==false){
    pause = true;
  }

}

function resetRace(){
  console.log("RESETTING RACE")
  load_race()
}

load_race();
