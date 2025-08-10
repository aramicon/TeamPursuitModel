// get and dispaly results from the DB for experiments run
let selected_ga_results = {};
let selected_id ="";
let selected_ga_settings_id = "";
let selected_settings_name = "";
let selected_notes = "";
let selected_tags = "";
let selected_short_title = "";
let selected_global_settings = {};
let selected_race_settings ={};
let selected_rider_settings = {};

let checkbox_toggle_state = true;

let raw_data = [];

let rider_colours = ['#648FFF','#785EF0','#DC267F','#FE6100','#FFB000','#222222','#FFC0CB'];
let rider_line_styles = ['1, 0','2, 1','5,3','12,3','18,4','20,5','22,6'];
let rider_line_stroke_width = [1,1.5,2,2.5,2.8,3,3.2];

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


const saveGraphAsPng = () => {

  console.log("try to save the graph as a PNG");

  //generate a useful name
  let d = new Date();

  let image_filename =  $("#select_graph").val() + "_" +  selected_id + "_" + d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate() + "_" + d.getHours() + "-" + d.getMinutes();

  // Get the d3js SVG element and save using saveSvgAsPng.js
  saveSvgAsPng(document.getElementsByTagName("svg")[0], image_filename, {scale: 2, backgroundColor: "#FFFFFF"});

}

const draw_power_graph = (generation) => {
  //just call draw_line_graph with the specified generation
  draw_line_graph("power_graph_generation_" + generation);

}
const show_power_data = (generation) => {
  //put the pwer data directly into the data display textarea
  raw_data = JSON.stringify(selected_ga_results.generations[generation].best_race_rider_power);

  //also display it in a vertical format with a line per generation
  let data_vertical = "";
  for(let i = 0; i < selected_ga_results.generations[generation].best_race_rider_power[0].length; i++){
    if (selected_ga_results.generations[generation].best_race_rider_power[0][i] && selected_ga_results.generations[generation].best_race_rider_power[1][i] && selected_ga_results.generations[generation].best_race_rider_power[2][i] && selected_ga_results.generations[generation].best_race_rider_power[3][i]){
      data_vertical += i + "\t" + selected_ga_results.generations[generation].best_race_rider_power[0][i].toString().padEnd(6) + "\t" + selected_ga_results.generations[generation].best_race_rider_power[1][i].toString().padEnd(6) + "\t" + selected_ga_results.generations[generation].best_race_rider_power[2][i].toString().padEnd(6) + "\t" + selected_ga_results.generations[generation].best_race_rider_power[3][i].toString().padEnd(6) + "\n";
    }
  }
  $('#data_display').val("Data for GA best race generation  " + generation + "\n\n" + raw_data + "\n\nGA: Vertical Format by Timestep\n" + data_vertical);

}
const draw_finish_times_graph = (generation) => {
  //just call draw_line_graph with the specified generation
  draw_line_graph("draw_finish_times_graph_" + generation);
}

const clearCanvas = () => {
  //clear the canvas
  console.log("Clear the canvas and raw data");
  d3.select('#graph').selectAll('*').remove();
  //also clear the raw data text input
  $("#data_display").val('');
}

const draw_line_graph = (graph_name_opt) =>{

  //quit if no results have been loaded
  if (selected_settings_name == ""){
    alert("No results data selected/loaded");
  }
  else
  {
    let graph_name = "";
    let specified_generation = 0; //used by some graphs

    if (graph_name_opt){
      graph_name = graph_name_opt;
      //to draw generation graph we need to split out the actual generation value (hackity hack)
      if (graph_name.indexOf("power_graph_generation_") >= 0) {
        specified_generation = parseInt(graph_name.substring(graph_name.indexOf("power_graph_generation_")+"power_graph_generation_".length));
        graph_name = "power_graph"; //strip off the reference to the generation
      }
      if (graph_name.indexOf("draw_finish_times_graph_") >= 0) {
        specified_generation = parseInt(graph_name.substring(graph_name.indexOf("draw_finish_times_graph_")+"draw_finish_times_graph_".length));
        graph_name = "finish_times_graph"; //strip off the reference to the generation
      }
    }
    else
    {
      graph_name = $("#select_graph").val();
    }

    switch(graph_name) {
      case "instructions_change_per_generation":
      case "variants_per_generation":
      case "generation_evolution_breakdown":
      case "best_fitness_robustness_check":
      case "best_fitness_per_generation":
      case "power_graph":
      case "finish_times_graph":
      case "robustness_instruction_variation_times":

      let graph_title ="unknown";
      let graph_data_1 = {};
      let graph_data_2 = {};
      let graph_data_3 = {};
      let graph_data_4 = {};
      let graph_data_5 = {};

      let graphYScaleMaxBuffer = 10;

      //set the data based on the selection
      if (graph_name=="best_fitness_per_generation"){

        graph_title = "Fitness per Generation";
        graph_data_1 = {};

        graph_data_1.title = "Fastest Race";

        graph_data_1.x_label = "GA Generation";
        graph_data_1.y_label = "Race Finish Time (s)";

        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length-1;

        graph_data_1.y_scale_from = 100;
        graph_data_1.y_scale_to = d3.max(selected_ga_results.generations, function(d) { return +d.stats_average_time; });

        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].best_race_time});
        }

        graph_data_2 = {};
        graph_data_2.title = "Average Race";
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_2.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].stats_average_time});
        }
      }
      else if (graph_name=="best_fitness_robustness_check"){

        graph_title = "Best Fitness Robustness per Generation";
        graph_data_1 = {};
        graph_data_1.title = "Avg. Gen.";
        graph_data_1.x_label = "GA Generation";
        graph_data_1.y_label = "Finish Time (s)";
        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length-1;
        graph_data_1.y_scale_from = 280;

        let yScaleMin = 1000;
        let yScaleMax = 0;

        // d3.max(selected_ga_results.generations, function(d) { return +(d.stats_average_time)}) + graphYScaleMaxBuffer;

        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
           graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].stats_average_time});
           if(selected_ga_results.generations[i].stats_average_time > yScaleMax ){
             yScaleMax = selected_ga_results.generations[i].stats_average_time;
           }
         }

        graph_data_2 = {};
        graph_data_2.title = "Best-in-Gen";
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_2.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].best_race_time});
          if(selected_ga_results.generations[i].best_race_time < yScaleMin ){
            yScaleMin = selected_ga_results.generations[i].best_race_time;
          }
          if(selected_ga_results.generations[i].best_race_time > yScaleMax ){
            yScaleMax = selected_ga_results.generations[i].best_race_time;
          }
        }

        graph_data_3 = {};
        graph_data_3.title = "Avg. R.M.";
        graph_data_3.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_3.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken});
          if(selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken > yScaleMax ){
            yScaleMax = selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken;
          }
        }

        graph_data_4 = {};
        graph_data_4.title = "Best R.M.";
        graph_data_4.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_4.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken});
          if(selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken < yScaleMin ){
            yScaleMin = selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken;
          }
          if(selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken > yScaleMax ){
            yScaleMax = selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken;
          }
        }

        // graph_data_5 = {};
        // graph_data_5.title = "Worst R.M.";
        // graph_data_5.data = [];
        // for (i=0;i<selected_ga_results.generations.length;i++){
        //   graph_data_5.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_mutation_results.worst_mutant_time_taken});
        //   if(selected_ga_results.generations[i].robustness_mutation_results.worst_mutant_time_taken > yScaleMax ){
        //     yScaleMax = selected_ga_results.generations[i].robustness_mutation_results.worst_mutant_time_taken;
        //   }
        // }


        graph_data_1.y_scale_from = yScaleMin - 10;
        graph_data_1.y_scale_to = yScaleMax + graphYScaleMaxBuffer;
      }

      else if (graph_name=="instructions_change_per_generation"){
        raw_data = []; //donalK22, output data so it can be used in Python graphing code

        graph_title = "Changes in Instructions over Generations";
        graph_data_1 = {};
        graph_data_1.title = "Avg. Total";

        graph_data_1.x_label = "GA Generation"
        graph_data_1.y_label = "Number of Instructions"

        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length-1;

        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = d3.max(selected_ga_results.generations, function(d) { return +d.stats_average_number_of_instructions; });

        let raw_data_stats_average_number_of_instructions = [];
        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].stats_average_number_of_instructions});
          if(selected_ga_results.generations[i].stats_average_number_of_instructions){
            raw_data_stats_average_number_of_instructions.push([selected_ga_results.generations[i].generation_id, selected_ga_results.generations[i].stats_average_number_of_instructions]);
          }
        }
        raw_data.push(raw_data_stats_average_number_of_instructions);

        let raw_data__average_new_instructions_added = [];
        graph_data_2 = {};
        //selected_ga_results.generations[i].stats_average_number_of_instructions
        graph_data_2.title = "Avg Added";
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          let average_added = selected_ga_results.generations[i].number_of_instructions_added_total/selected_ga_results.generations[i].population_size;
          graph_data_2.data.push({x:selected_ga_results.generations[i].generation_id, y:average_added});
          if(average_added){
            raw_data__average_new_instructions_added.push([selected_ga_results.generations[i].generation_id, average_added]);
          }
        }
        raw_data.push(raw_data__average_new_instructions_added);

        let raw_data_average_instructions_removed = [];
        graph_data_3 = {};
        graph_data_3.title = "Avg Removed";
        graph_data_3.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          let average_removed = selected_ga_results.generations[i].number_of_instructions_removed_total/selected_ga_results.generations[i].population_size;
          graph_data_3.data.push({x:selected_ga_results.generations[i].generation_id, y:average_removed});
          if(average_removed){
            raw_data_average_instructions_removed.push([selected_ga_results.generations[i].generation_id, average_removed]);
          }
        }
        raw_data.push(raw_data_average_instructions_removed);

        let raw_data_average_drop_instructions = [];
        graph_data_4 = {};
        graph_data_4.title = "Avg Drop";
        graph_data_4.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          let average_drop_instructions = selected_ga_results.generations[i].number_of_drop_instructions_total/selected_ga_results.generations[i].population_size;
          graph_data_4.data.push({x:selected_ga_results.generations[i].generation_id, y:average_drop_instructions});
          if(average_drop_instructions){
            raw_data_average_drop_instructions.push([selected_ga_results.generations[i].generation_id, average_drop_instructions]);
        }
        }
        raw_data.push(raw_data_average_drop_instructions);
      }
      else if (graph_name=="variants_per_generation"){
        graph_title = "Number of Variants per Generation";
        graph_data_1 = {};

        graph_data_1.title = "Ancestral Variants";

        graph_data_1.x_label = "GA Generation";
        graph_data_1.y_label = "Number of Variants";

        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length-1;

        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = d3.max(selected_ga_results.generations, function(d) { return +d.variants_size; });

        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].variants_size});
        }
      }
      else if (graph_name=="generation_evolution_breakdown"){
        graph_title = "Crossover/Mutants (% of population) added";
        graph_data_1 = {};

        graph_data_1.title = "Crossover entries added %";

        graph_data_1.x_label = "GA Generation";
        graph_data_1.y_label = "Number of Entries";

        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length-1;

        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = 100;

        let population_size = selected_ga_results.generations[0].population_size;
        console.log();

        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          //console.log("generation:" + i +  "population_size :" + population_size + " number_of_crossovers_total:" + selected_ga_results.generations[i].number_of_crossovers_total + " number_of_mutants_added_total:" + selected_ga_results.generations[i].number_of_mutants_added_total + " number_of_direct_copies:" + selected_ga_results.generations[i].number_of_direct_copies );
          graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:(selected_ga_results.generations[i].number_of_crossovers_total/population_size)*100});
        }

        graph_data_2 = {};
        graph_data_2.title = "Mutant Entries added %";
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_2.data.push({x:selected_ga_results.generations[i].generation_id, y:(selected_ga_results.generations[i].number_of_mutants_added_total/population_size)*100});
        }

        graph_data_3 = {};
        graph_data_3.title = "Direct Copies %";
        graph_data_3.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_3.data.push({x:selected_ga_results.generations[i].generation_id, y:(selected_ga_results.generations[i].number_of_direct_copies/population_size)*100});
        }

      }
      else if (graph_name=="power_graph"){

        graph_title = "Rider Power Output";
        graph_data_1 = {};

        graph_data_1.title = "Rider 1";
        //dk23aug try to get the name from the data
        if(selected_rider_settings){
          if(selected_rider_settings[0]){
            if(selected_rider_settings[0].name){
              graph_data_1.title = selected_rider_settings[0].name;
            }
            //and the colour
            if(selected_rider_settings[0].colour){
              rider_colours[0] = selected_rider_settings[0].colour;
            }
          }
        }

        graph_data_1.x_label = "Time";
        graph_data_1.y_label = "Watts";
        graph_data_1.x_scale_from = 0;
        //need to get the max power used by any rider
        let max_p = 0;
        for(i = 0; i< selected_ga_results.generations[specified_generation].best_race_rider_power.length;i++){
          let max_i = d3.max(selected_ga_results.generations[specified_generation].best_race_rider_power[i]);
          if (max_i > max_p){
            max_p = max_i;
          }
        }
        if (typeof(selected_ga_results.generations[specified_generation].best_race_rider_power[0]) == "undefined") {
          console.log("Error trying to draw power graph");
          console.log("specified generation " + specified_generation);
          console.log("sselected_ga_results.generations[specified_generation].best_race_rider_power  = " + selected_ga_results.generations[specified_generation].best_race_rider_power);
          console.log("sselected_ga_results.generations[specified_generation]  = " + JSON.stringify(selected_ga_results.generations[specified_generation]));
        }

        graph_data_1.x_scale_to = selected_ga_results.generations[specified_generation].best_race_rider_power[0].length;

        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = max_p;

        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations[specified_generation].best_race_rider_power[0].length;i++){
          graph_data_1.data.push({x:i, y:selected_ga_results.generations[specified_generation].best_race_rider_power[0][i]});
        }

        graph_data_2 = {};
        graph_data_2.title = "Rider 2";
        //dk23aug try to get the name from the data
        if(selected_rider_settings){
          if(selected_rider_settings[1]){
            if(selected_rider_settings[1].name){
              graph_data_2.title = selected_rider_settings[1].name;
            }
            if(selected_rider_settings[1].colour){
              rider_colours[1] = selected_rider_settings[1].colour;
            }
          }
        }
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations[specified_generation].best_race_rider_power[1].length;i++){
          graph_data_2.data.push({x:i, y:selected_ga_results.generations[specified_generation].best_race_rider_power[1][i]});
        }

        graph_data_3 = {};
        graph_data_3.title = "Rider 3";
        //dk23aug try to get the name from the data
        if(selected_rider_settings){
          if(selected_rider_settings[2]){
            if(selected_rider_settings[2].name){
              graph_data_3.title = selected_rider_settings[2].name;
            }
            if(selected_rider_settings[2].colour){
              rider_colours[2] = selected_rider_settings[2].colour;
            }
          }
        }
        graph_data_3.data = [];

        for (i=0;i<selected_ga_results.generations[specified_generation].best_race_rider_power[2].length;i++){
          graph_data_3.data.push({x:i, y:selected_ga_results.generations[specified_generation].best_race_rider_power[2][i]});
        }
        graph_data_4 = {};
        graph_data_4.title = "Rider 4";
        //dk23aug try to get the name from the data
        if(selected_rider_settings){
          if(selected_rider_settings[3]){
            if(selected_rider_settings[3].name){
              graph_data_4.title = selected_rider_settings[3].name;
            }
            if(selected_rider_settings[3].colour){
              rider_colours[3] = selected_rider_settings[3].colour;
            }
          }
        }
        graph_data_4.data = [];
        for (i=0;i<selected_ga_results.generations[specified_generation].best_race_rider_power[3].length;i++){
          graph_data_4.data.push({x:i, y:selected_ga_results.generations[specified_generation].best_race_rider_power[3][i]});
        }
      }
      //yyyyyy
        else if (graph_name=="robustness_instruction_variation_times"){

          graph_title = "Mutant Vs Instruction-variance Robustness per Generation";

          graph_data_1 = {};
          graph_data_1.title = "Best-in-Gen";
          graph_data_1.x_label = "GA Generation";
          graph_data_1.y_label = "Finish Time";
          graph_data_1.x_scale_from = 0;

          graph_data_1.x_scale_to = selected_ga_results.generations.length-1;
          graph_data_1.y_scale_from = 280;

          let yScaleMin = 1000;
          let yScaleMax = 0;

          graph_data_1.data = [];
          for (i=0;i<selected_ga_results.generations.length;i++){
            graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].best_race_time});
            if(selected_ga_results.generations[i].best_race_time < yScaleMin ){
              yScaleMin = selected_ga_results.generations[i].best_race_time;
            }
            if(selected_ga_results.generations[i].best_race_time > yScaleMax ){
              yScaleMax = selected_ga_results.generations[i].best_race_time;
            }
          }

          graph_data_2 = {};
          graph_data_2.title = "Best I.V.";
          graph_data_2.data = [];
          for (i=0;i<selected_ga_results.generations.length;i++){
            graph_data_2.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_variation_results.robustness_best_variation_time});
            if(selected_ga_results.generations[i].robustness_variation_results.robustness_best_variation_time < yScaleMin ){
              yScaleMin = selected_ga_results.generations[i].robustness_variation_results.robustness_best_variation_time;
            }
            if(selected_ga_results.generations[i].robustness_variation_results.robustness_best_variation_time > yScaleMax ){
              yScaleMax = selected_ga_results.generations[i].robustness_variation_results.robustness_best_variation_time;
            }
          }

          graph_data_3 = {};
          graph_data_3.title = "Avg. I.V.";
          graph_data_3.data = [];
          for (i=0;i<selected_ga_results.generations.length;i++){
            graph_data_3.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_variation_results.robustness_average_variation_time});
            if(selected_ga_results.generations[i].robustness_variation_results.robustness_average_variation_time < yScaleMin ){
              yScaleMin = selected_ga_results.generations[i].robustness_variation_results.robustness_average_variation_time;
            }
            if(selected_ga_results.generations[i].robustness_variation_results.robustness_average_variation_time > yScaleMax ){
              yScaleMax = selected_ga_results.generations[i].robustness_variation_results.robustness_average_variation_time;
            }
          }


           graph_data_4 = {};
           graph_data_4.title = "Best R.M.";
           graph_data_4.data = [];
           for (i=0;i<selected_ga_results.generations.length;i++){
              graph_data_4.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken});
              if(selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken < yScaleMin ){
                yScaleMin = selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken;
              }
              if(selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken > yScaleMax ){
                yScaleMax = selected_ga_results.generations[i].robustness_mutation_results.best_mutant_time_taken;
              }
            }

            graph_data_5 = {};
            graph_data_5.title = "Avg. R.M.";
            graph_data_5.data = [];
            for (i=0;i<selected_ga_results.generations.length;i++){
               graph_data_5.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken});
               if(selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken < yScaleMin ){
                 yScaleMin = selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken;
               }
               if(selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken > yScaleMax ){
                 yScaleMax = selected_ga_results.generations[i].robustness_mutation_results.average_mutant_time_taken;
               }
             }

          graph_data_1.y_scale_to = yScaleMax + graphYScaleMaxBuffer;
          graph_data_1.y_scale_from = yScaleMin - 10;


        // raw_data = []; //donalK24, output data of robustness test where each instruction is varied
        // for (i=0;i<selected_ga_results.generations.length;i++){
        //   let generation_result_array = [];
        //   //gen id
        //   generation_result_array.push(selected_ga_results.generations[i].generation_id);
        //   //original time
        //   generation_result_array.push(selected_ga_results.generations[i].best_race_time);
        //   //array of times after mutations
        //   generation_result_array.push(JSON.parse(selected_ga_results.generations[i].robustness_single_mutation_times));
        //   raw_data.push(generation_result_array);
        // }
        // $("#data_display").val(JSON.stringify(raw_data));







      //yyyyyyyyyy
    }
      else if (graph_name=="finish_times_graph"){

        graph_title = "Finish Times (quickest first)";
        graph_data_1 = {};

        graph_data_1.title = "Finish Times";

        graph_data_1.x_label = "(Ordered) Races";
        graph_data_1.y_label = "Finish Time";

        graph_data_1.x_scale_from = 0;

        let finish_times = selected_ga_results.generations[specified_generation].race_fitness_all;

        finish_times.sort(function(a, b){return a-b});  //we will show them sorted

        //donalK25; put them into the data display to use elsewhere
        raw_data = finish_times;

        graph_data_1.x_scale_to = finish_times.length;

        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = d3.max(finish_times);

        graph_data_1.data = [];
        for (i=0;i<finish_times.length;i++){
          graph_data_1.data.push({x:i, y:finish_times[i]});
        }
      }

      //spit out the raw data if it exists
      if(raw_data){
        $("#data_display").val(JSON.stringify(raw_data));
      }

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

//try to dynamically space out the legend labels using their widths
let legend_label_offset = 100;
let legend_icon_gap = 12;
let legend_line_length = 60;
let legend_average_char_width = 14;
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

case "generation_instructions_info":
  console.log("[][][][] generation_instructions_info [][][][]");
  //need to loop through the generations and if we find entries with generation_instructions_info, we stuff that into the raw database
  let raw_data_string = "";

  for (i=0;i<selected_ga_results.generations.length;i++){

    if (selected_ga_results.generations[i].generation_instructions_info){
      if (selected_ga_results.generations[i].generation_instructions_info.effort){
        raw_data_string += "# Generation " + i + " EFFORT\n";
        raw_data_string += JSON.stringify(selected_ga_results.generations[i].generation_instructions_info.effort);
        raw_data_string += "\n";
      }
      if (selected_ga_results.generations[i].generation_instructions_info.drop){
        raw_data_string += "# Generation " + i + " DROP\n";
        raw_data_string += JSON.stringify(selected_ga_results.generations[i].generation_instructions_info.drop);
        raw_data_string += "\n"
        }
    }
    if(raw_data_string){
     $("#data_display").val(raw_data_string);
 }
}
  break;

default:
console.log("graph " + graph_name + " not found: nothing drawn");
}
}
}

const draw_multi_line_graph = (graph_name_opt) =>{
  //draws a graph based on selected results (can put data from multiple results on one graph)
  let graph_name = $("#select_graph_multi").val();
  if (graph_name == "0")
  {
    $("#select_graph_info").html(" ");
  }
  else
  {
    //check what rows been selected -- need to have something checked

    let selectedIDs = [];

    $("input:checkbox[name=results_checkbox]:checked").each(function(){
      selectedIDs.push($(this).val());
    });

    let no_of_selected_ids = selectedIDs.length;

    if (no_of_selected_ids <= 0){
      $("#select_graph_info").html("No results selected (click 1+ checkboxes)");
    }
    else{
      // go get data then draw graph

      let loaded_graph_data = [];

      let serverURL = 'http://127.0.0.1:3003/'+graph_name+'/' + JSON.stringify(selectedIDs);
      //the best_in_gen_robustness_test_times graph also takes an optional generation... send -1 to indicate a default of the LAST gen
      if( graph_name == "best_in_gen_robustness_test_times" || graph_name == "cup_noise_events" ){
        let selectedGeneration = parseInt($('#selected_generation').val());
        if (isNaN(selectedGeneration)){
          selectedGeneration = -1;
        }
        serverURL += "/" + selectedGeneration;
      }
      $("#select_graph_info").html("Attempting to connect to <a href='"+serverURL+"'>server to load data</a>");
      fetch(serverURL,{method : 'get'}).then((response)=>{
        console.log(response);
        return response.json();
        if (!response.ok) {
          throw Error(response.statusText);
        }
      }).then((data)=>{
        console.log(" multi-id data");
        console.log(data);

        let is_raw_data = false;

        let graph_title ="unknown";
        let graph_data_1 = {};
        let graph_data_2 = {};
        let graph_data_3 = {};
        let graph_data_4 = {};
        let graph_data_5 = {};

        //donalK25 add two more lines
        let graph_data_6 = {};
        let graph_data_7 = {};
        switch(graph_name) {
          case "best_in_final_gen_tests":{
            is_raw_data = true;

            console.log("|||||||||||| Data for best in gen tests ||||||||||||");
            console.log(data);

            //try to parse the data
            best_in_final_gen_tests_dataset = [];
            let total_data_object =data;
            for(let i = 0; i<total_data_object.length; i++){

              let best_in_final_gen_noise_value = total_data_object[i].best_in_final_gen_noise_value;
              let best_in_final_gen_tests_results = JSON.parse(total_data_object[i].data_rows);

              //example entry: {"variation":[{"type":"global","property":"noise_1_probability_instruction_misheard","value":1}],"reps":10,"test_result":328.5271}
              //very arbitrary, need to know exactly where the fields are packed
              for(let jk = 0; jk < best_in_final_gen_tests_results.length; jk++){
                let new_row = [];
                new_row.push(best_in_final_gen_noise_value);
                new_row.push(best_in_final_gen_tests_results[jk].variation[0].value); //adds noise_1_probability_instruction_misheard problem
                new_row.push(DecimalPrecision.round(best_in_final_gen_tests_results[jk].test_result,4));
                best_in_final_gen_tests_dataset.push(new_row);
              }
            }
            console.log("best_in_final_gen_tests_dataset " + JSON.stringify(best_in_final_gen_tests_dataset));


            //output into textarea
            $("#data_display").val(JSON.stringify(best_in_final_gen_tests_dataset));
            break;
          }
          case "best_in_gen_robustness_test_times":{
            is_raw_data = true;

            console.log("|||||||||||| Data for robustness tests for a selected (or final) generation ||||||||||||");

            //output into textarea
            $("#data_display").val(JSON.stringify(data));
            break;
          }
          case "cup_noise_events":{
            is_raw_data = true;

            console.log("|||||||||||| Data for CUP event data for a selected (or final by default) generation ||||||||||||");

            //output into textarea
            $("#data_display").val(JSON.stringify(data));
            break;
          }

          case "best_fitness_per_generation":{
          console.log("best_fitness_per_generation graph")
          //titles will be first element: take these OUT
          let short_titles = Array.from(data[0]);
          data = data.splice(1);
          is_raw_data = false;

          //set the data based on the selection
          if (graph_name=="best_fitness_per_generation"){
            graph_title = "Best Race Finish Time per Generation";
            graph_data_1 = {};
            graph_data_1.x_label = "GA Generation";
            graph_data_1.y_label = "Race Finish Time (s)";
            graph_data_1.x_scale_from = 0;
            graph_data_1.x_scale_to = data[0].length;

            //add raw data to another object so it can be done in python, too
            raw_data = [];
            //ned to work out the scale from the data (max)
            var max_all_data = d3.max(data, function(array) {
              return d3.max(array);
            });
            graph_data_1.y_scale_to = max_all_data+5;

            var min_all_data = d3.min(data, function(array) {
              return d3.min(array);
            });
            // y axis scale from min of data
            graph_data_1.y_scale_from = min_all_data-5;


            if(data[0]){
              graph_data_1.title = short_titles[0];
              graph_data_1.data = [];
              raw_data_row = [];
              for (i=0;i<data[0].length;i++){
                graph_data_1.data.push({x:i, y:data[0][i]});
                raw_data_row.push([i,data[0][i]]);
              }
              raw_data.push(raw_data_row);
            }
            if(data[1]){
              graph_data_2.title =short_titles[1];
              graph_data_2.data = [];
              raw_data_row = [];
              for (i=0;i<data[1].length;i++){
                graph_data_2.data.push({x:i, y:data[1][i]});
                raw_data_row.push([i,data[1][i]]);
              }
                raw_data.push(raw_data_row);
            }
            if(data[2]){
              graph_data_3.title = short_titles[2];
              graph_data_3.data = [];
              raw_data_row = [];
              for (i=0;i<data[2].length;i++){
                graph_data_3.data.push({x:i, y:data[2][i]});
                raw_data_row.push([i,data[2][i]]);
              }
                raw_data.push(raw_data_row);
            }
            if(data[3]){
              graph_data_4.title = short_titles[3];
              graph_data_4.data = [];
              raw_data_row = [];
              for (i=0;i<data[3].length;i++){
                graph_data_4.data.push({x:i, y:data[3][i]});
                raw_data_row.push([i,data[3][i]]);
              }
                raw_data.push(raw_data_row);
            }
            if(data[4]){
              graph_data_5.title = short_titles[4];
              graph_data_5.data = [];
              raw_data_row = [];
              for (i=0;i<data[4].length;i++){
                graph_data_5.data.push({x:i, y:data[4][i]});
                raw_data_row.push([i,data[4][i]]);
              }
                raw_data.push(raw_data_row);
            }
            if(data[5]){
              graph_data_6.title = short_titles[5];
              graph_data_6.data = [];
              raw_data_row = [];
              for (i=0;i<data[5].length;i++){
                graph_data_6.data.push({x:i, y:data[5][i]});
                raw_data_row.push([i,data[5][i]]);
              }
                raw_data.push(raw_data_row);
            }
            if(data[6]){
              graph_data_7.title = short_titles[6];
              graph_data_7.data = [];
              raw_data_row = [];
              for (i=0;i<data[6].length;i++){
                graph_data_7.data.push({x:i, y:data[6][i]});
                raw_data_row.push([i,data[6][i]]);
              }
                raw_data.push(raw_data_row);
            }
          }
          break;
        }
        default: {
          console.log("&&&& INVALID MULTI-DATA GRAPH NAME &&&&");
        }
      }
          //D3
          // set the dimensions and margins of the graph
          if(is_raw_data == false){
            console.log("ODD:: is_raw_data = false")

            let totalWidth = 1000;
            let totalHeight = 450;
            let legendLeftIndent = 20;
            let bulletIndent = 20;

            var margin = {top: 30, right: legendLeftIndent, bottom: 40, left: 60},
            width = totalWidth - margin.left - margin.right,
            height = totalHeight - margin.top - margin.bottom;


            const INNER_WIDTH  = totalWidth - margin.left - margin.right;
            const INNER_HEIGHT = totalHeight - margin.top - margin.bottom;

            var svg = d3.select("#graph")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");
            //  data = selected_ga_results;

            // Add X axis --> it is a date format
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

            const xAxis = d3.axisBottom(x).ticks(10);
            const yAxis = d3.axisLeft(y).ticks(10);
            const xAxisGrid = d3.axisBottom(x).tickSize(-INNER_HEIGHT).tickFormat('').ticks(10);
            const yAxisGrid = d3.axisLeft(y).tickSize(-INNER_WIDTH).tickFormat('').ticks(10);


            svg.append('g')
              .attr('class', 'x axis')
              .attr('transform', 'translate(0,' + INNER_HEIGHT + ')')
              .call(xAxis);
            svg.append('g')
              .attr('class', 'y axis')
              .call(yAxis);


            // Add the line 1
            svg.append("path")
            .datum(graph_data_1.data)
            .attr("fill", "none")
            .attr("stroke", rider_colours[0])
            .style("stroke-dasharray", rider_line_styles[0])
            .attr("stroke-width", rider_line_stroke_width[0])
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
            .style("stroke-dasharray", rider_line_styles[1])
            .attr("stroke-width", rider_line_stroke_width[1])
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
          .style("stroke-dasharray", rider_line_styles[2])
          .attr("stroke-width", rider_line_stroke_width[2])
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
        .style("stroke-dasharray", rider_line_styles[3])
        .attr("stroke-width", rider_line_stroke_width[3])
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
      .style("stroke-dasharray", rider_line_styles[4])
      .attr("stroke-width", rider_line_stroke_width[4])
      .attr("d", d3.line()
      .x(function(d) { return x(d.x) })
      .y(function(d) { return y(d.y) })
    );
  }
  if (!jQuery.isEmptyObject(graph_data_6)){
    //draw second line if data is given
    svg.append("path")
    .datum(graph_data_6.data)
    .attr("fill", "none")
    .attr("stroke", rider_colours[5])
    .style("stroke-dasharray", rider_line_styles[5])
    .attr("stroke-width", rider_line_stroke_width[5])
    .attr("d", d3.line()
    .x(function(d) { return x(d.x) })
    .y(function(d) { return y(d.y) })
  );
}
if (!jQuery.isEmptyObject(graph_data_7)){
  //draw second line if data is given
  svg.append("path")
  .datum(graph_data_7.data)
  .attr("fill", "none")
  .attr("stroke", rider_colours[6])
  .style("stroke-dasharray", rider_line_styles[6])
  .attr("stroke-width", rider_line_stroke_width[6])
  .attr("d", d3.line()
  .x(function(d) { return x(d.x) })
  .y(function(d) { return y(d.y) })
);
}
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


  let legend_label_offset = 50;
  let legend_icon_gap = 12;
  let legend_line_length = 60;
  let legend_average_char_width = 10;
  let legend_gap_length = 40;

  svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[0]);
  svg.append("line")//making a line for legend
        .attr("x1", legend_label_offset)
        .attr("x2", legend_label_offset+legend_line_length)
        .attr("y1", 4)
        .attr("y2", 4)
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
          .attr("y1", 4)
          .attr("y2", 4)
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
          .attr("y1", 4)
          .attr("y2", 4)
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
          .attr("y1", 4)
          .attr("y2", 4)
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
          .attr("y1", 4)
          .attr("y2", 4)
          .attr("stroke-width", rider_line_stroke_width[4])
          .style("stroke-dasharray",rider_line_styles[4])
          .style("stroke", rider_colours[4]);

    svg.append("text").attr("x",legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_5.title).style("font-size", "15px").attr("alignment-baseline","middle");
  }
  if (!jQuery.isEmptyObject(graph_data_6)){
    legend_label_offset += (graph_data_5.title.length * legend_average_char_width) + legend_gap_length;

    svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[5]);

    svg.append("line")//making a line for legend
          .attr("x1", legend_label_offset)
          .attr("x2", legend_label_offset+legend_line_length)
          .attr("y1", 4)
          .attr("y2", 4)
          .attr("stroke-width", rider_line_stroke_width[5])
          .style("stroke-dasharray",rider_line_styles[5])
          .style("stroke", rider_colours[5]);

    svg.append("text").attr("x",legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_6.title).style("font-size", "15px").attr("alignment-baseline","middle");
  }
  if (!jQuery.isEmptyObject(graph_data_7)){
    legend_label_offset += (graph_data_6.title.length * legend_average_char_width) + legend_gap_length;

    svg.append("circle").attr("cx",legend_label_offset).attr("cy",-10).attr("r", 6).style("fill", rider_colours[6]);

    svg.append("line")//making a line for legend
          .attr("x1", legend_label_offset)
          .attr("x2", legend_label_offset+legend_line_length)
          .attr("y1", 4)
          .attr("y2", 4)
          .attr("stroke-width", rider_line_stroke_width[6])
          .style("stroke-dasharray",rider_line_styles[6])
          .style("stroke", rider_colours[6]);

    svg.append("text").attr("x",legend_label_offset+legend_icon_gap).attr("y", -10).text(graph_data_7.title).style("font-size", "15px").attr("alignment-baseline","middle");
  }
  //add a title
  // svg.append("text")
  // .attr("x", (width / 2))
  // .attr("y", 0 - (margin.top / 2))
  // .attr("text-anchor", "middle")
  // .style("font-size", "16px")
  // .style("font-style", "italic")
  // .text(graph_title);

  // also put in the raw data if it is there
  if(raw_data){
      $("#data_display").val(JSON.stringify(raw_data));
  }


}

}).catch((error) => {
  console.log("Error loading data from server");
  $("#select_graph_info").text("ERROR CONNECTING TO SERVER " + error)
  console.log(error)
});
}


}
}

const deleteSelectedResults = () => {
  //does exactly what it sez on the tin
  //check what rows been selected -- need to have something checked
  console.log("delete selected results");
  let selectedIDs = [];

  $("input:checkbox[name=results_checkbox]:checked").each(function(){
    selectedIDs.push($(this).val());
  });

  let no_of_selected_ids = selectedIDs.length;

  if (no_of_selected_ids <= 0){
    $("#select_graph_info").html("No results selected (click 1+ checkboxes)");
  }
  else{

    let serverURL = 'http://127.0.0.1:3003/deleteSelectedResults/' + JSON.stringify(selectedIDs);
    $("#select_graph_info").html("Attempting to connect to <a href='"+serverURL+"'>server to delete selected results</a>");
    fetch(serverURL,{method : 'post'}).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
        throw Error(response.statusText);
      }
    }).then((data)=>{
      console.log(" results removed");
      console.log(data);
      let count = 0;
      if(data.deletedCount){
          count = data.deletedCount;
      }
        $("#select_graph_info").text(count + " results removed ");
        //refresh the main list
        getResults();

  }).catch((error) => {
    console.log("Error loading data from server (deleting results)");
    $("#select_graph_info").text("ERROR CONNECTING TO SERVER " + error)
    console.log(error)
  });


}
}
const showColName = (c_name) =>{
  $("#race_result_col").html(c_name);
}



const  build_results_table = () =>{


  console.log("build results table");
  console.log("**selected_ga_results**");

  let ga_results = selected_ga_results;

  let results_html = "<div>Start time: "+ga_results.start_time + " End Time: " + ga_results.end_time +  "</div>";
  results_html += "<table class='results_table'><tr><th>GEN</th><th>AVG. TIME</th><th>AVG. # Instructions</th><th>Std. Dev.# Instructions</th><th>BEST RACE</th><th>BEST TIME</th><th>BEST START ORDER</th><th>BEST INSTRUCTIONS</th><th>NOISE ALTERATONS</th><th>PERFORMANCE FAILURES</th><th>CHOKE UNDER PRESSURE NOISE</th><th>C.U.P %</th><th>C.U.P AVG. TIMESTEP</th><th>OVEREAGERNESS</th><th>VISUALISE</th> <th>POWER GRAPH</th><th> FINISH TIMES GRAPH </th><th>WORST RACE</th><th>WORST TIME</th><th>WORST START ORDER</th><th>WORST INSTRUCTIONS</th><th>NOISE ALTERATONS</th><th>PERFORMANCE FAILURES</th><th>CHOKE UNDER PRESSURE NOISE</th><th>OVEREAGERNESS</th><th>VISUALISE</th><th># Crossovers</th> <th>AVG. Inst. ++</th><th>Avg. Inst. --</th><th>Avg. Inst. moved</th><th>Avg Effort changes</th><th>Avg. Drop changes.</th><th>Avg. Order shuffles.</th><th>Drop Inst/Total Inst</th><th># Variants</th> </tr>";

  console.log(ga_results);
  console.log(ga_results.generations);

  //for(g=0;g<ga_results.generations.length;g++){
  for(g=(ga_results.generations.length-1);g>=0;g--){

    results_html += "<tr><td style='background-color:#aaaaaa;' onmouseover=\"showColName('Generation')\"><strong>" + g + "</strong></td><td onmouseover=\"showColName('Average Race Time')\"> " + ga_results.generations[g].stats_average_time + "</td><td onmouseover=\"showColName('Average Number of Instructions per race')\">" + ga_results.generations[g].stats_average_number_of_instructions + "</td><td onmouseover=\"showColName('Standard Deviation of Number of Instructions per race')\">" + ga_results.generations[g].stats_std_dev_number_of_instructions + "</td><td onmouseover=\"showColName('BEST Populaton index/ID')\">" + ga_results.generations[g].final_best_race_properties_index + "/" + ga_results.generations[g].best_race_id + "</td><td style='background-color:#aaffaa' onmouseover=\"showColName('Best Race Time')\">" + ga_results.generations[g].best_race_time+ " </td><td onmouseover=\"showColName('Best race Start Order')\"> [" + ga_results.generations[g].final_best_race_start_order + "]</td><td onmouseover=\"showColName('Best Race Instructions')\">" + JSON.stringify(ga_results.generations[g].final_best_race_instructions) + "</td><td onmouseover=\"showColName('Best Race Instruction Noise Alterations')\"> " + JSON.stringify(ga_results.generations[g].best_race_instruction_noise_alterations) + "</td>" +
    "<td onmouseover=\"showColName('Best Race Performance failures')\">" + JSON.stringify(ga_results.generations[g].best_race_performance_failures) + "</td>" +
    "<td onmouseover=\"showColName('Best Race Choke Under Pressure failures')\">" + JSON.stringify(ga_results.generations[g].best_race_instruction_noise_choke_under_pressure) + "</td>" +
    "<td onmouseover=\"showColName('Generation Choke Under Pressure % of Riders that Experience a choke event')\">" + JSON.stringify(ga_results.generations[g].percentage_of_riders_that_choke) + "</td>" +
    "<td onmouseover=\"showColName('Generation average timestep of Choke Under Pressure event.')\">" + JSON.stringify(ga_results.generations[g].average_timestep_of_choke_event) + "</td>" +


    "<td onmouseover=\"showColName('Best Race overeagerness noise')\">" + JSON.stringify(ga_results.generations[g].best_race_instruction_noise_overeagerness) + "</td>" +
    "<td onmouseover=\"showColName('Run BEST race in game model')\"><a  target='_blank' href = 'tpgame.html?source=results&results_id=" + selected_id + "&startorder=" + encodeURI(ga_results.generations[g].final_best_race_start_order) + "&instructions=" + encodeURI(JSON.stringify(ga_results.generations[g].final_best_race_instructions)) +
     "&noise_alterations=" + encodeURI(JSON.stringify(ga_results.generations[g].best_race_instruction_noise_alterations))   +
     "&performance_failures=" +  encodeURI(JSON.stringify(ga_results.generations[g].best_race_performance_failures)) +
     "&instruction_noise_choke_under_pressure=" +  encodeURI(JSON.stringify(ga_results.generations[g].best_race_instruction_noise_choke_under_pressure)) +
     "&instruction_noise_overeagerness=" +  encodeURI(JSON.stringify(ga_results.generations[g].best_race_instruction_noise_overeagerness)) +
     "'> Run </a></td>";

    results_html += "<td> <button onclick = 'draw_power_graph("+g+")'>DRAW</button><button type='button' class='btn btn-info' onclick = 'show_power_data("+g+")'><i class='fas fa-info-circle'></i></button></td>";
    results_html += "<td> <button onclick = 'draw_finish_times_graph("+g+")'>DRAW</button>" + "</td>";

    results_html += "</td><td onmouseover=\"showColName('WORST Populaton index/ID')\">" + ga_results.generations[g].final_worst_race_properties_index + "/" + ga_results.generations[g].worst_race_id + "</td><td style='background-color:#aaffaa' onmouseover=\"showColName('Worst Race Time')\">" + ga_results.generations[g].worst_race_time+ " </td><td onmouseover=\"showColName('Best race Start Order')\"> [" + ga_results.generations[g].final_worst_race_start_order + "]</td><td onmouseover=\"showColName('WORST Race Instructions')\">" + JSON.stringify(ga_results.generations[g].final_worst_race_instructions) + "</td><td onmouseover=\"showColName('WORST Race Instruction Noise Alterations')\"> " + JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_alterations) +
    "</td><td onmouseover=\"showColName('Worst Race Performance failures')\">" + JSON.stringify(ga_results.generations[g].worst_race_performance_failures)  +
    "<td onmouseover=\"showColName('Worst Race Choke Under Pressure failures')\">" + JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_choke_under_pressure) + "</td>" +
    "<td onmouseover=\"showColName('Worst Race overeagerness noise')\">" + JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_overeagerness) + "</td>" +
    "</td><td onmouseover=\"showColName('Run WORST race in game model')\"><a  target='_blank' href = 'tpgame.html?source=results&results_id=" + selected_id + "&startorder=" + encodeURI(ga_results.generations[g].final_worst_race_start_order) + "&instructions=" + encodeURI(JSON.stringify(ga_results.generations[g].final_worst_race_instructions)) + "&noise_alterations=" +  encodeURI(JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_alterations))   + "&performance_failures=" +  encodeURI(JSON.stringify(ga_results.generations[g].worst_race_performance_failures)) +
    "&instruction_noise_choke_under_pressure=" +  encodeURI(JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_choke_under_pressure)) +
    "&instruction_noise_overeagerness=" +  encodeURI(JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_overeagerness)) +
    "'> Run </a></td>";

    //stats columns
    pop = ga_results.generations[g].population_size;

    results_html +="<td onmouseover=\"showColName('Total Number of Crossovers performed')\">" + ga_results.generations[g].number_of_crossovers_total + "/" + pop + "</td><td onmouseover=\"showColName('Average number of instructions added per race')\">" + (ga_results.generations[g].number_of_instructions_added_total/pop) + "</td><td onmouseover=\"showColName('Average number of instructions removed per race')\">" + ga_results.generations[g].number_of_instructions_removed_total/pop + "</td><td>" + ga_results.generations[g].number_of_instructions_moved_total/pop + "</td><td onmouseover=\"showColName('Average number of effort instruction values changed per race')\">" + ga_results.generations[g].number_of_effort_instructions_changed_total/pop + "</td><td onmouseover=\"showColName('Average number of drop instruction values changed per race')\">" + ga_results.generations[g].number_of_drop_instructions_changed_total/pop + "</td><td onmouseover=\"showColName('Number of start order shuffles')\">" + ga_results.generations[g].number_of_start_order_shuffles_total/pop  + "</td><td onmouseover=\"showColName('% of Drop instructions')\">" + ga_results.generations[g].number_of_drop_instructions_total + "/" + ga_results.generations[g].total_number_of_instructions + "</td><td onmouseover=\"showColName('Number of variants')\">" + ga_results.generations[g].variants_size+"</td>";

    results_html += "</tr>";

  }
  results_html += "</table>";

  console.log(results_html);

  $("#race_result").html(results_html);

}

const draw_results = (data) => {

  //console.log("draw results (table)");

  let results = data[0];
  //console.log(results);

  selected_id = results._id;
  selected_ga_settings_id = results.ga_settings_id;
  selected_settings_name = results.settings_name;
  selected_notes = results.notes;
  selected_tags = results.tags;
  selected_short_title = results.short_title;

  selected_global_settings = JSON.parse(results.global_settings);
  selected_race_settings = JSON.parse(results.race_settings);
  selected_rider_settings = JSON.parse(results.rider_settings);

  $("#global_settings").val(data[0].global_settings);
  $("#race_settings").val(data[0].race_settings);
  $("#rider_settings").val(data[0].rider_settings);

  selected_ga_results =JSON.parse(results.ga_results);
  build_results_table();

}

const load_results = (id) =>{

  //highlight the selected row
  //first need to un-highlight every row..
  $(".results_row").css( "border", "none" );

  let row_id = "#row_" + id;
  $(row_id).css( "border", "6px solid green" );

  let serverURL = 'http://127.0.0.1:3003/getResult/'+id;
  console.log("get result data from " + serverURL);
  $("#results_info_label").html("Connect to <a href='"+serverURL+"'>server to read single result details</a>");
  fetch(serverURL,{method : 'get'}).then((response)=>{
    //console.log(response);
    return response.json();
    if (!response.ok) {
      throw Error(response.statusText);
    }
  }).then((data)=>{
    draw_results(data);

    $("#results_info_label").text(data.length + " results found.");

    $("#race_result_message").html("Loaded Results " + id + " | <strong>" + selected_settings_name + "</strong>" + "<ul><li>Run Date: " + selected_ga_results.start_time + "</li><li>Generations: " + selected_ga_results.generations.length + "</li><li>Population: " +  selected_ga_results.generations[0].population_size + "</li></ul><div class='form-group'>    <label for='notes'>Notes</label><textarea class='form-control' id='notes' rows='2'>" + (selected_notes?selected_notes:'') + "</textarea></div><div class='form-group'><label for='shortTitle'>Short Title (shown on graphs)</label><input type='text' class='form-control' id='shortTitle' value = '" + (selected_short_title?selected_short_title:'') +"'></div><div class='form-group'><label for='resultTags'>Tags</label><input type='text' class='form-control' id='resultTags' value = '" + (selected_tags?selected_tags:'') +"'></div><button class='btn btn-primary' onClick='updateResults()' >Update</button>" );

  }).catch((error) => {
    console.log("Error loading results from server");
    $("#results_info_label").text("ERROR CONNECTING TO SERVER " + error)
    console.log(error)
  });

}

const draw_table = (data) => {
  //draw the table of results
  if (data.length > 0){
    let tableHTML = "<table class='table table-striped table-bordered '>";
    tableHTML+="<thead class='thead-dark'><tr><th scope='col'>Select</th><th scope='col'>ID (click to load)</th><th scope='col'>GA Settings Name</th><th scope='col'>Tags</th><th scope='col'>S.Title</th><th scope='col'>Notes</th><th scope='col'>Date</th></tr></thead>"
    for(i=0;i<data.length;i++){
      tableHTML += "<tr id = 'row_" + data[i]._id + "' class='results_row'><th scope='row'><div class='form-check'><input class='form-check-input resultsCheckbox' type='checkbox' id='results_checkbox_" + i + "' name='results_checkbox' value='" + data[i]._id + "'></div></th><th scope='row'><button type='button' class='btn btn-light' onclick = 'load_results(\""+ data[i]._id+"\")'>"+ data[i]._id+"</button></th><td>" + data[i].settings_name + "</td><td>" + (data[i].tags?data[i].tags:'') + "</td><td>" + (data[i].short_title?data[i].short_title:'') + "</td><td>" + data[i].notes + "</td><td>"+ data[i].date_created + "</td></tr>";
    }

    tableHTML += "</table>";

    $("#results_list").html(tableHTML);
  }
  else{
    $("#results_info_label").html("No results returned!");
  }
}

const getResults = () => {
  let serverURL = 'http://127.0.0.1:3003/getResults/';
  $("#results_info_label").html("Attempting to connect to <a href='"+serverURL+"'>server to read results</a>");
  fetch(serverURL,{method : 'get'}).then((response)=>{
    console.log(response);
    return response.json();
    if (!response.ok) {
      throw Error(response.statusText);
    }
  }).then((data)=>{
    draw_table(data);
    $("#results_info_label").text(data.length + " settings found.");
  }).catch((error) => {
    console.log("Error loading results from server");
    $("#results_info_label").text("ERROR CONNECTING TO SERVER " + error)
    console.log(error)
  });
}

const searchResults = () => {
  let searchTerm = $("#searchTerm").val().trim();
  console.log("search results with tag " + searchTerm);
  if(searchTerm.length > 0){
  let serverURL = 'http://127.0.0.1:3003/searchResults/' + searchTerm;
  $("#results_info_label").html("Attempting to connect to <a href='"+serverURL+"'>server to search results</a>");
  fetch(serverURL,{method : 'get'}).then((response)=>{
    console.log(response);
    return response.json();
    if (!response.ok) {
      throw Error(response.statusText);
    }
  }).then((data)=>{
    draw_table(data);
    $("#results_info_label").text(data.length + " results found.");
  }).catch((error) => {
    console.log("Error loading search results from server");
    $("#results_info_label").text("ERROR CONNECTING TO SERVER " + error)
    console.log(error)
  });
}
else{
  //no term given so just show em all
  getResults();
}
}

const selectAll = () => {
  console.log("select all results shown");
  let cbs = document.getElementsByTagName('input');
  for(let i=0; i < cbs.length; i++) {
    if(cbs[i].type == 'checkbox') {
      cbs[i].checked = checkbox_toggle_state;
    }
  }
  checkbox_toggle_state = !checkbox_toggle_state;
}

const updateResults = () => {
  //save the short_title and notes to the db
  let short_title = $("#shortTitle").val();
  let notes = $("#notes").val();
  let tags = $("#resultTags").val();

  let serverURL = 'http://127.0.0.1:3003/update_results/'+selected_id;
  $("#race_result_col").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

  let dataToSend = {
    "short_title":short_title,
    "notes":notes,
    "tags":tags
  };
  let jsonToSendS = JSON.stringify(dataToSend);

  fetch(serverURL,{
    method : 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    mode : 'cors',
    body : jsonToSendS
  }).then((response)=>{
    console.log(response);
    return response.json();
    if (!response.ok) {
      throw Error(response.statusText);
    }
  }).then((data)=>{
    console.log('data ' + JSON.stringify(data));
    $("#race_result_col").html("Details Updated");
  });
}

$(document).ready(function() {

  d3.select("#saveGraphAsPng").on('click',saveGraphAsPng);
  d3.select("#clearCanvas").on('click',clearCanvas);
  d3.select("#deleteSelectedResults").on('click',deleteSelectedResults);
  d3.select("#searchResults").on('click',searchResults);
  //also allow search via enter key click
    $("#searchTerm").on("keydown", function (e) {
      if (e.keyCode === 13) {  //checks whether the pressed key is "Enter"
          searchResults();
      }
  });
  d3.select("#showAll").on('click',getResults);
  d3.select("#selectAll").on('click',selectAll);
  getResults();

});
