let c = document.getElementById("bikeCanvas");
// let info =  document.getElementById("race_info1");
// let riders_info =  document.getElementById("riders_info");
let ctx = c.getContext("2d");

let raceClicker = null;

let standardCost = 1;

let pause = false;

let settings={
  radius:100,
  fixed_test_distance:1,
  track_bend_radius:22,
  track_straight_length:55.88496162102456,//((250-(2*Math.PI*22))/2),
  vis_scale:5,
  track_centre_x:400,
  track_centre_y:200,
  race_bend_distance:0
}

let race = {
  distance:250,
  start_order:[0],
  riders: [],
  race_clock:0,
  race_instructions:[],
  current_distance_of_finish_rider:0,
  distance_covered:0,
  bend_centre_x:0,


}

let riders = [
  {name:'Chris',
  threshold_power:300,
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
  acceleration_this_step:0

  }
]

let theta = 0;

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
function startRace(){
  //set up the race using the riders given
  // use the given order
  race.riders = [];
  for(i = 0;i<race.start_order.length;i++){
    rider = riders[race.start_order[i]]
    rider.starting_position_x = settings.track_centre_x;
    rider.starting_position_y = settings.track_centre_y - (settings.track_bend_radius*settings.vis_scale);
    rider.current_position_x = rider.starting_position_x;
    rider.current_position_y = rider.starting_position_y;
    rider.current_track_position = 'start';
    race.riders.push(rider);
    //console.log("Start " + rider.name + " at position " + race.start_order[i]);
    addRiderDisplay();

  }
  let theta = 0;

  race.bend_centre_x = 0;
  rider.distance_this_step = 0;
  rider.acceleration_this_step = 0;
  settings.race_bend_distance = Math.PI * settings.track_bend_radius;

  let input_race_length = parseInt($('#input_race_length').val());
  if(Number.isInteger(input_race_length)){
    race.distance = input_race_length;
  }


  moveRace();

}

function moveRace(){
  let x = 0;
  let y = 0;


  race.race_clock++;
  $("#race_info_clock").text(race.race_clock);

  ctx.clearRect(0, 0, c.width, c.height);
  //console.log("race at " + race.race_clock + " seconds / " + race.distance);
  //move the riders and update the time
  for(i=0;i<race.riders.length;i++){
    rider = race.riders[i];
    ctx.beginPath();

    //work out how far the rider can go in this time step

    rider.acceleration_this_step = Math.sqrt(rider.threshold_power/(2*rider.mass*race.race_clock));
    rider.velocity += rider.acceleration_this_step;
    rider.distance_this_step = rider.velocity;

    console.log("acceleration at time " + race.race_clock + " seconds  =  " + rider.acceleration_this_step + " new velocity is " + rider.velocity);



    //if on a straight just keep going in that direction
    //may need to break a distance covered down into parts (e.g. going from bend to straight)
    let distance_this_step_remaining = rider.distance_this_step;

    while(distance_this_step_remaining > 0){
      let distance_this_step_segment = distance_this_step_remaining;
      let current_distance =  race.distance_covered;
      if (rider.current_track_position == 'start'){
        if (rider.straight_distance_travelled + distance_this_step_segment <= (settings.track_straight_length/2)){
          //can do full step on straight
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
          race.distance_covered+=distance_this_step_segment;
          distance_this_step_remaining = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on start straight to (" + rider.current_position_x + "," + rider.current_position_y + ") distance_this_step_remaining = " + distance_this_step_remaining   )
        }
        else{
          distance_this_step_segment =  (settings.track_straight_length/2) - rider.straight_distance_travelled;
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
          race.distance_covered+=distance_this_step_segment;
          distance_this_step_remaining -= distance_this_step_segment;
          //rest of segment is on the bend
          rider.current_track_position = 'bend1';
          race.bend_centre_x = rider.current_position_x
          //console.log("race.bend_centre_x="+race.bend_centre_x);
            console.log("Travel partial distance, "+distance_this_step_segment+" of "+rider.distance_this_step+" on start straight to (" + rider.current_position_x + "," + rider.current_position_y + ") distance_this_step_remaining" +distance_this_step_remaining )
          theta=90;
        }

          //console.log("On start straight (" + rider.current_position_x + "," + rider.current_position_y + ")"  )

      }
      else if (  rider.current_track_position == 'bend1') {
        console.log("rider.bend_distance_travelled = " + rider.bend_distance_travelled + "distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          rider.bend_distance_travelled+=distance_this_step_segment;
          theta +=((distance_this_step_segment*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          race.distance_covered+=distance_this_step_segment;
          rider.current_position_x = race.bend_centre_x + Math.cos((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          distance_this_step_remaining = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on bend 1 to (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - rider.bend_distance_travelled;

          theta +=((distance_on_bend*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          rider.bend_distance_travelled+=distance_on_bend;
          race.distance_covered+=distance_on_bend;
          distance_this_step_remaining -= distance_on_bend;
          rider.current_position_x = race.bend_centre_x + Math.cos((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;

          //rider is now on straight2
          theta = 0;
          rider.current_track_position = 'straight2';
          rider.straight_distance_travelled = 0;
          rider.bend_distance_travelled = 0;
          console.log("Travel partial distance, "+distance_on_bend+" of "+distance_this_step_segment + " on bend 1 to (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
        }
      }
      else if (rider.current_track_position == 'straight2') {

        if (rider.straight_distance_travelled + distance_this_step_segment <= (settings.track_straight_length)){
          //can do full step on straight
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x += distance_this_step_segment*settings.vis_scale;
          race.distance_covered+=distance_this_step_segment;
          distance_this_step_remaining = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on  straight 2 to (" + rider.current_position_x + "," + rider.current_position_y + ") distance_this_step_remaining = " + distance_this_step_remaining   )
        }
        else{
          distance_this_step_segment =  settings.track_straight_length - rider.straight_distance_travelled;
          rider.straight_distance_travelled += distance_this_step_segment;
          rider.current_position_x += distance_this_step_segment*settings.vis_scale;
          race.distance_covered+=distance_this_step_segment;
          distance_this_step_remaining -= distance_this_step_segment;
          //rest of segment goes on to bend 2
          rider.current_track_position = 'bend2';
          race.bend_centre_x = rider.current_position_x
          //console.log("race.bend_centre_x="+race.bend_centre_x);
          console.log("Travel partial distance, "+distance_this_step_segment+" of "+rider.distance_this_step+" on straight 2 to (" +rider.current_position_x + "," + rider.current_position_y + ") distance_this_step_remaining" +distance_this_step_remaining )
          theta=270;
        }
      }
      else if (rider.current_track_position == 'bend2') {
        console.log("bend 2 rider.bend_distance_travelled = " + rider.bend_distance_travelled + "distance_this_step_segment = " + distance_this_step_segment + " settings.race_bend_distance = " + settings.race_bend_distance);
        if ((rider.bend_distance_travelled + distance_this_step_segment) <= settings.race_bend_distance){
          //can do whole segment on bend
          rider.bend_distance_travelled+=distance_this_step_segment;
          theta +=((distance_this_step_segment*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          race.distance_covered+=distance_this_step_segment;
          rider.current_position_x = race.bend_centre_x + Math.cos((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          distance_this_step_remaining = 0;
          rider.bend_distance_travelled = 0;
          console.log("Travel full distance "+distance_this_step_segment+" on bend 2 to (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
        }
        else{
          // some distance on the bend then 0 or more on the straight
          let distance_on_bend = settings.race_bend_distance - rider.bend_distance_travelled;

          theta +=((distance_on_bend*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
          rider.bend_distance_travelled+=distance_on_bend;
          race.distance_covered+=distance_on_bend;
          distance_this_step_remaining -= distance_on_bend;

          rider.current_position_x = race.bend_centre_x + Math.cos((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
          rider.current_position_y = settings.track_centre_y - Math.sin((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;

          //rider is now on straight2
          theta = 0;
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
            race.distance_covered+=distance_this_step_segment;
            distance_this_step_remaining = 0;
            console.log("Travel full distance "+distance_this_step_segment+" on  straight 1 to (" + rider.current_position_x + "," + rider.current_position_y + ") distance_this_step_remaining = " + distance_this_step_remaining   )
          }
          else{
            distance_this_step_segment =  settings.track_straight_length - rider.straight_distance_travelled;
            rider.straight_distance_travelled += distance_this_step_segment;
            rider.current_position_x -= distance_this_step_segment*settings.vis_scale;
            race.distance_covered+=distance_this_step_segment;
            distance_this_step_remaining -= distance_this_step_segment;
            //rest of segment goes on to bend 2
            rider.current_track_position = 'bend1';
            race.bend_centre_x = rider.current_position_x
            //console.log("race.bend_centre_x="+race.bend_centre_x);
            console.log("Travel partial distance, "+distance_this_step_segment+" of "+rider.distance_this_step+" on straight 1 to (" +rider.current_position_x + "," + rider.current_position_y + ") distance_this_step_remaining" +distance_this_step_remaining )
            theta=90;
          }
      }
       $("#rider_distance_"+i).text(race.distance_covered);
    }



    ctx.arc(rider.current_position_x, rider.current_position_y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = rider.color;
    ctx.fill();
    //work out how much the rider can travel in this second
  }


  if (race.distance_covered < race.distance && pause == false){
    setTimeout(
      function(){
        moveRace();
    },100);
  }



}

function stopRace(){
//  clearInterval(raceClicker);
  if(pause==false){
    pause = true;
  }

}

function resetRace(){
  console.log("RESETTING RACE")
  race.race_clock = 0;
  race.distance_covered = 0;
    for(j = 0; j < race.riders.length;j++){
      rider = race.riders[j];
      rider.current_position_x = rider.starting_position_x;
      rider.current_position_y = rider.starting_position_y;
      rider.current_track_position = 'start';
      rider.acceleration_this_step = 0;
      rider.velocity = 0;
      rider.distance_this_step = 0;
      rider.bend_distance_travelled = 0;
      rider.straight_distance_travelled
     }
     pause = false;
    //race.currentPosition = 0;
    ctx.clearRect(0, 0, c.width, c.height);
    //startRace();
}
