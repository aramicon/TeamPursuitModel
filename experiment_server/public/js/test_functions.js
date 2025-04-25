//functions_test

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

  //debugger;
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

function call_velocity_from_power_with_acceleration(){
  //debugger;
  let total_power = parseFloat($("#total_power").val());
  let rolling_resistance_coefficient = parseFloat($("#rolling_resistance_coefficient").val());
  let rider_and_bike_mass = parseFloat($("#rider_and_bike_mass").val());
  let gravity_accel =  parseFloat($("#gravity_accel").val());
  let air_density = parseFloat($("#air_density").val());
  let drag_coeffic_times_frontal_area =  parseFloat($("#drag_coeffic_times_frontal_area").val());
  let current_velocity =  parseFloat($("#current_velocity").val());
  let drivetrain_efficiency =  parseFloat($("#drivetrain_efficiency").val());

  var currentdate = new Date();
  var datetime = currentdate.getFullYear() + "/"
                + (currentdate.getMonth()+1) + "/"
                + currentdate.getDate()  + " @ "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();

  let result = "TEST call_velocity_from_power_with_acceleration: " + datetime + "<br />";
  result += "total_power: " + total_power + "<br />";
  result += "rolling_resistance_coefficient: " + rolling_resistance_coefficient + "<br />";
  result += "rider_and_bike_mass: " + rider_and_bike_mass + "<br />";
  result += "gravity_accel: " + gravity_accel + "<br />";
  result += "air_density: " + air_density + "<br />";
  result += "drag_coeffic_times_frontal_area: " + drag_coeffic_times_frontal_area + "<br />";
  result += "drivetrain_efficiency: " + drivetrain_efficiency + "<br />";
  result += "<br />velocity after power applied (1 second): " + current_velocity;


  let new_velocity = velocity_from_power_with_acceleration(total_power, rolling_resistance_coefficient, rider_and_bike_mass, gravity_accel, air_density, drag_coeffic_times_frontal_area, current_velocity,drivetrain_efficiency);

  result += "<BR /><BR />new_velocity: " + new_velocity;


  $("#result_velocity_from_power_with_acceleration").html(result);
}

function call_power_from_velocity_with_acceleration(){
  //debugger;
  let current_velocity =  parseFloat($("#current_velocity").val());
  let target_velocity =  parseFloat($("#target_velocity").val());
  let rolling_resistance_coefficient = parseFloat($("#rolling_resistance_coefficient").val());
  let rider_and_bike_mass = parseFloat($("#rider_and_bike_mass").val());
  let gravity_accel =  parseFloat($("#gravity_accel").val());
  let air_density = parseFloat($("#air_density").val());
  let drag_coeffic_times_frontal_area =  parseFloat($("#drag_coeffic_times_frontal_area").val());

  let drivetrain_efficiency =  parseFloat($("#drivetrain_efficiency").val());

  var currentdate = new Date();
  var datetime = currentdate.getFullYear() + "/"
                + (currentdate.getMonth()+1) + "/"
                + currentdate.getDate()  + " @ "
                + currentdate.getHours() + ":"
                + currentdate.getMinutes() + ":"
                + currentdate.getSeconds();

  let result = "TEST call_velocity_from_power_with_acceleration: " + datetime + "<br />";
  result += "target_velocity: " + total_power + "<br />";
  result += "rolling_resistance_coefficient: " + rolling_resistance_coefficient + "<br />";
  result += "rider_and_bike_mass: " + rider_and_bike_mass + "<br />";
  result += "gravity_accel: " + gravity_accel + "<br />";
  result += "air_density: " + air_density + "<br />";
  result += "drag_coeffic_times_frontal_area: " + drag_coeffic_times_frontal_area + "<br />";
  result += "drivetrain_efficiency: " + drivetrain_efficiency + "<br />";
  result += "<br />velocity after power applied (1 second): " + current_velocity;

  //power_from_velocity_with_acceleration(aero, headwind, total_resistance, transv, target_velocity,current_velocity, mass)
  let power_needed = power_from_velocity_with_acceleration(target_velocity, rolling_resistance_coefficient, rider_and_bike_mass, gravity_accel, air_density, drag_coeffic_times_frontal_area, current_velocity, drivetrain_efficiency);

  result += "<BR /><BR />power_needed: " + power_needed;

  $("#result_power_from_velocity_with_acceleration").html(result);
}

$(document).ready(function() {
  $("#velocity_from_power_with_acceleration").on("click",call_velocity_from_power_with_acceleration);
  $("#power_from_velocity_with_acceleration").on("click",call_power_from_velocity_with_acceleration);
}
);
