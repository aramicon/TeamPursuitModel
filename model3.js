let c = document.getElementById("bikeCanvas");
let info =  document.getElementById("race_info1");
let riders_info =  document.getElementById("riders_info");
let ctx = c.getContext("2d");

let raceClicker = null;

let standardCost = 1;

let settings={
  radius:100,
  fixed_test_distance:1,
  track_bend_radius:22,
  track_straight_length:55.88496162102456,//((250-(2*Math.PI*22))/2),
  vis_scale:5,
  track_centre_x:400,
  track_centre_y:200
}

let race = {
  distance:4000,
  start_order:[0],
  riders: [],
  race_clock:0,
  race_instructions:[],
  current_distance_of_finish_rider:0,
  distance_covered:0

}

let riders = [
  {name:'Chris',
  threshold_power:6,
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
  color:'#ff0000'}
]

let theta = 0;

for (k=0;k<360;k++){
  console.log()
}
console.log("Track bend radius = 22m");
console.log("Track straight ((250-(2*Math.PI*22))/2) = " + (250-(2*Math.PI*22))/2 );

function startRace(){
  //set up the race using the riders given
  // use the given order
  race.riders = [];
  for(i = 0;i<race.start_order.length;i++){
    rider = riders[race.start_order[i]]
    rider.startPosition_x = settings.track_centre_x;
    rider.startPosition_y = settings.track_centre_y - (settings.track_bend_radius*settings.vis_scale);
    rider.current_position_x = rider.startPosition_x;
    rider.current_position_y = rider.startPosition_y;
    rider.current_track_position = 'start';
    race.riders.push(rider);
    //console.log("Start " + rider.name + " at position " + race.start_order[i]);

  }
  let theta = 0;
  let straight_distance_travelled = 0;
  let bend_centre_x = 0;
  moveRace();

}

function moveRace(){
  let x = 0;
  let y = 0;


  race.race_clock++;
  ctx.clearRect(0, 0, c.width, c.height);
  //console.log("race at " + race.race_clock + " seconds / " + race.distance);
  //move the riders and update the time
  for(i=0;i<race.riders.length;i++){
    rider = race.riders[i];
    ctx.beginPath();
    //if on a straight just keep going in that direction
    if (rider.current_track_position == 'start'){
      rider.current_position_x -= settings.fixed_test_distance*settings.vis_scale;
      race.distance_covered+=settings.fixed_test_distance;
        //console.log("On start straight (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
      if ((rider.startPosition_x - rider.current_position_x) >= (settings.track_straight_length/2)*settings.vis_scale){
        rider.current_track_position = 'bend1';
        bend_centre_x = rider.current_position_x
        console.log("bend_centre_x="+bend_centre_x);
        theta=90;
      }
    }
    else if (  rider.current_track_position == 'bend1') {
      theta+=((settings.fixed_test_distance*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
      race.distance_covered+=settings.fixed_test_distance;
      rider.current_position_x = bend_centre_x + Math.cos((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
      rider.current_position_y = settings.track_centre_y - Math.sin((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
      console.log("On bend 1 theta = "+theta + " (" + rider.current_position_x + "," + rider.current_position_y + ")"  )

      if (theta >= 270){
        theta = 0;
        rider.current_track_position = 'straight2';
        straight_distance_travelled = 0;
      }
    }
    else if (rider.current_track_position == 'straight2') {
      straight_distance_travelled += settings.fixed_test_distance;
      race.distance_covered+=settings.fixed_test_distance;
      rider.current_position_x += settings.fixed_test_distance*settings.vis_scale;
      console.log("On straight 2 straight_distance_travelled = "+straight_distance_travelled + " (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
      if (straight_distance_travelled >= settings.track_straight_length){
         rider.current_track_position = 'bend2';
         bend_centre_x = rider.current_position_x
         theta=270;
      }
    }
    else if (rider.current_track_position == 'bend2') {
      theta+=((settings.fixed_test_distance*settings.vis_scale*360)/(2*Math.PI*settings.track_bend_radius*settings.vis_scale));
      race.distance_covered+=settings.fixed_test_distance;
      rider.current_position_x = bend_centre_x + Math.cos((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
      rider.current_position_y = settings.track_centre_y - Math.sin((theta*Math.PI)/180)*settings.track_bend_radius*settings.vis_scale;
        console.log("On bend 2 theta = "+theta + " (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
      if (theta >= 450){
        theta = 0;
        rider.current_track_position = 'straight1';
        straight_distance_travelled = 0;
      }
    }
    else if (rider.current_track_position == 'straight1') {
      straight_distance_travelled += settings.fixed_test_distance;
      race.distance_covered+=settings.fixed_test_distance;
      rider.current_position_x -= settings.fixed_test_distance*settings.vis_scale;
        console.log("On straight 1 straight_distance_travelled = "+straight_distance_travelled + " (" + rider.current_position_x + "," + rider.current_position_y + ")"  )
      if (straight_distance_travelled >= settings.track_straight_length){
        rider.current_track_position = 'bend1';
        bend_centre_x = rider.current_position_x
        console.log("bend_centre_x="+bend_centre_x);
        theta=90;
      }
    }



    ctx.arc(rider.current_position_x, rider.current_position_y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = rider.color;
    ctx.fill();
    //work out how much the rider can travel in this second
  }


  if (race.distance_covered < race.distance){
    setTimeout(
      function(){
        moveRace();
    },1);
  }



}

function stopRace(){
//  clearInterval(raceClicker);
race.race_clock = 100000;
}

function resetRace(){
  race.race_clock = 0;
  race.distance_covered = 0;
    // for(j = 0; j < race.riders.length;j++){
    //   rider = race.riders[j];
    //   rider.currentPosition = rider.startPosition;
    //   rider.currentEnergy = rider.startingEnergy;
    // }
    //race.currentPosition = 0;
    ctx.clearRect(0, 0, c.width, c.height);
    //startRace();
}
