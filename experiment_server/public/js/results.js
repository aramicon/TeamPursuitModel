// get and dispaly results from the DB for experiments run
let selected_ga_results = {};
let selected_id ="";
let selected_ga_settings_id = "";
let selected_settings_name = "";
let selected_notes = "";
let selected_short_title = "";
let selected_global_settings = {};
let selected_race_settings ={};
let selected_rider_settings = {};

let rider_colours = ['#648FFF','#785EF0','#DC267F','#FE6100','#FFB000'];
let rider_line_styles = ['1, 0','2, 1','5,3','12,3','18,4'];
let rider_line_stroke_width = [1,1.5,2,2.5,2.8];

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
  let raw_data = JSON.stringify(selected_ga_results.generations[generation].best_race_rider_power);

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
  console.log("Clear the canvas");
  d3.select('#graph').selectAll('*').remove();
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

      let graph_title ="unknown";
      let graph_data_1 = {};
      let graph_data_2 = {};
      let graph_data_3 = {};
      let graph_data_4 = {};
      let graph_data_5 = {};

      //set the data based on the selection
      if (graph_name=="best_fitness_per_generation"){

        graph_title = "Fitness per Generation";
        graph_data_1 = {};

        graph_data_1.title = "Fastest Race";

        graph_data_1.x_label = "GA Generation";
        graph_data_1.y_label = "Race Finish Time (s)";

        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length;

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

        graph_title = "Best Fitness Robustness";
        graph_data_1 = {};
        graph_data_1.title = "Fastest Race";
        graph_data_1.x_label = "GA Generation";
        graph_data_1.y_label = "Race Finish Time (s)";
        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length;
        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = d3.max(selected_ga_results.generations, function(d) { return +d.robustness_check_worst_mutant_time_taken; });

        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].best_race_time});
        }

        graph_data_2 = {};
        graph_data_2.title = "Robustness Mutant Avg.";
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_2.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_check_average_mutant_time_taken});
        }

        graph_data_3 = {};
        graph_data_3.title = "Robustness Mutant Worst.";
        graph_data_3.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_3.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_check_worst_mutant_time_taken});
        }

        graph_data_4 = {};
        graph_data_4.title = "Robustness Mutant Best";
        graph_data_4.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_4.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_check_best_mutant_time_taken});
        }

        graph_data_5 = {};
        graph_data_5.title = "Std. Deviation";
        graph_data_5.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_5.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].robustness_check_standard_dev});
        }


      }
      else if (graph_name=="instructions_change_per_generation"){
        graph_title = "Changes in Instructions over Generations";
        graph_data_1 = {};
        graph_data_1.title = "Avg. Total";

        graph_data_1.x_label = "GA Generation"
        graph_data_1.y_label = "Number of Instructions"

        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length;

        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = d3.max(selected_ga_results.generations, function(d) { return +d.stats_average_number_of_instructions; });

        graph_data_1.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_1.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].stats_average_number_of_instructions});
        }

        graph_data_2 = {};
        graph_data_2.title = "Avg Added";
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_2.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].number_of_instructions_added_total/selected_ga_results.generations[i].population_size});
        }

        graph_data_3 = {};
        graph_data_3.title = "Avg Removed";
        graph_data_3.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_3.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].number_of_instructions_removed_total/selected_ga_results.generations[i].population_size});
        }

        graph_data_4 = {};
        graph_data_4.title = "Avg Drop";
        graph_data_4.data = [];
        for (i=0;i<selected_ga_results.generations.length;i++){
          graph_data_4.data.push({x:selected_ga_results.generations[i].generation_id, y:selected_ga_results.generations[i].number_of_drop_instructions_total/selected_ga_results.generations[i].population_size});
        }


      }
      else if (graph_name=="variants_per_generation"){

        graph_title = "Number of Variants per Generation";
        graph_data_1 = {};

        graph_data_1.title = "Ancestral Variants";

        graph_data_1.x_label = "GA Generation";
        graph_data_1.y_label = "Number of Variants";

        graph_data_1.x_scale_from = 0;

        graph_data_1.x_scale_to = selected_ga_results.generations.length;

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

        graph_data_1.x_scale_to = selected_ga_results.generations.length;

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

        graph_data_1.x_label = "Time";
        graph_data_1.y_label = "Watts";

        graph_data_1.x_scale_from = 0;

        //need to get the max power used by anu rider
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
        graph_data_2.data = [];
        for (i=0;i<selected_ga_results.generations[specified_generation].best_race_rider_power[1].length;i++){
          graph_data_2.data.push({x:i, y:selected_ga_results.generations[specified_generation].best_race_rider_power[1][i]});
        }

        graph_data_3 = {};
        graph_data_3.title = "Rider 3";
        graph_data_3.data = [];
        for (i=0;i<selected_ga_results.generations[specified_generation].best_race_rider_power[2].length;i++){
          graph_data_3.data.push({x:i, y:selected_ga_results.generations[specified_generation].best_race_rider_power[2][i]});
        }


        graph_data_4 = {};
        graph_data_4.title = "Rider 4";
        graph_data_4.data = [];
        for (i=0;i<selected_ga_results.generations[specified_generation].best_race_rider_power[3].length;i++){
          graph_data_4.data.push({x:i, y:selected_ga_results.generations[specified_generation].best_race_rider_power[3][i]});
        }



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

        graph_data_1.x_scale_to = finish_times.length;

        graph_data_1.y_scale_from = 0;
        graph_data_1.y_scale_to = d3.max(finish_times);

        graph_data_1.data = [];
        for (i=0;i<finish_times.length;i++){
          graph_data_1.data.push({x:i, y:finish_times[i]});
        }
      }

      //D3
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
let legend_label_offset = 50;
let legend_icon_gap = 12;
let legend_line_length = 60;
let legend_average_char_width = 10;
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



        switch(graph_name) {
          case "best_in_final_gen_tests":
            is_raw_data = true;

            console.log("Data for best in gen tests");
            //output into textarea
            $("#data_display").val(JSON.stringify(data));


          case "best_fitness_per_generation":

          //titles will be first element: take these OUT
          let short_titles = Array.from(data[0]);
          data = data.splice(1);
          is_raw_data = false;

          let graph_title ="unknown";
          let graph_data_1 = {};
          let graph_data_2 = {};
          let graph_data_3 = {};
          let graph_data_4 = {};
          let graph_data_5 = {};

          //set the data based on the selection
          if (graph_name=="best_fitness_per_generation"){
            graph_title = "Best Race Finish Time per Generation";
            graph_data_1 = {};
            graph_data_1.x_label = "GA Generation";
            graph_data_1.y_label = "Race Finish Time (s)";
            graph_data_1.x_scale_from = 0;
            graph_data_1.x_scale_to = data[0].length;
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
              for (i=0;i<data[0].length;i++){
                graph_data_1.data.push({x:i, y:data[0][i]});
              }
            }
            if(data[1]){
              graph_data_2.title =short_titles[1];
              graph_data_2.data = [];
              for (i=1;i<data[1].length;i++){
                graph_data_2.data.push({x:i, y:data[1][i]});
              }
            }
            if(data[2]){
              graph_data_3.title = short_titles[2];
              graph_data_3.data = [];
              for (i=1;i<data[2].length;i++){
                graph_data_3.data.push({x:i, y:data[2][i]});
              }
            }
            if(data[3]){
              graph_data_4.title = short_titles[3];
              graph_data_4.data = [];
              for (i=1;i<data[3].length;i++){
                graph_data_4.data.push({x:i, y:data[3][i]});
              }
            }
            if(data[4]){
              graph_data_5.title = short_titles[4];
              graph_data_5.data = [];
              for (i=1;i<data[4].length;i++){
                graph_data_5.data.push({x:i, y:data[4][i]});
              }
            }
          }
          //D3
          // set the dimensions and margins of the graph
          if(!is_raw_data){

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
  //add a title
  // svg.append("text")
  // .attr("x", (width / 2))
  // .attr("y", 0 - (margin.top / 2))
  // .attr("text-anchor", "middle")
  // .style("font-size", "16px")
  // .style("font-style", "italic")
  // .text(graph_title);
  break;

}

default:
console.log("graph " + graph_name + " not found: nothing drawn");
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
  results_html += "<table class='results_table'><tr><th>GEN</th><th>AVG. TIME</th><th>AVG. # Instructions</th><th>BEST RACE</th><th>BEST TIME</th><th>BEST START ORDER</th><th>BEST INSTRUCTIONS</th><th>NOISE ALTERATONS</th><th>PERFORMANCE FAILURES</th><th>VISUALISE</th> <th>POWER GRAPH</th><th> FINISH TIMES GRAPH </th><th>WORST RACE</th><th>WORST TIME</th><th>WORST START ORDER</th><th>WORST INSTRUCTIONS</th><th>NOISE ALTERATONS</th><th>PERFORMANCE FAILURES</th><th>VISUALISE</th><th># Crossovers</th> <th>AVG. Inst. ++</th><th>Avg. Inst. --</th><th>Avg. Inst. moved</th><th>Avg Effort changes</th><th>Avg. Drop changes.</th><th>Avg. Order shuffles.</th><th>Drop Inst/Total Inst</th><th># Variants</th> </tr>";

  console.log(ga_results);
  console.log(ga_results.generations);

  for(g=0;g<ga_results.generations.length;g++){

    results_html += "<tr><td style='background-color:#aaaaaa;' onmouseover=\"showColName('Generation')\">" + g + "</td><td onmouseover=\"showColName('Average Race Time')\"> " + ga_results.generations[g].stats_average_time + "</td><td onmouseover=\"showColName('Average Number of Instructions per race')\">" + ga_results.generations[g].stats_average_number_of_instructions + "</td><td onmouseover=\"showColName('BEST Populaton index/ID')\">" + ga_results.generations[g].final_best_race_properties_index + "/" + ga_results.generations[g].best_race_id + "</td><td style='background-color:#aaffaa' onmouseover=\"showColName('Best Race Time')\">" + ga_results.generations[g].best_race_time+ " </td><td onmouseover=\"showColName('Best race Start Order')\"> [" + ga_results.generations[g].final_best_race_start_order + "]</td><td onmouseover=\"showColName('Best Race Instructions')\">" + JSON.stringify(ga_results.generations[g].final_best_race_instructions) + "</td><td onmouseover=\"showColName('Best Race Instruction Noise Alterations')\"> " + JSON.stringify(ga_results.generations[g].best_race_instruction_noise_alterations) + "</td><td onmouseover=\"showColName('Best Race Performance failures')\">" + JSON.stringify(ga_results.generations[g].best_race_performance_failures) + "</td> <td onmouseover=\"showColName('Run BEST race in game model')\"><a  target='_blank' href = 'tpgame.html?source=results&results_id=" + selected_id + "&startorder=" + encodeURI(ga_results.generations[g].final_best_race_start_order) + "&instructions=" + encodeURI(JSON.stringify(ga_results.generations[g].final_best_race_instructions)) + "&noise_alterations=" + encodeURI(JSON.stringify(ga_results.generations[g].best_race_instruction_noise_alterations))   + "&performance_failures=" +  encodeURI(JSON.stringify(ga_results.generations[g].best_race_performance_failures)) + "'> Run </a></td>";

    results_html += "<td> <button onclick = 'draw_power_graph("+g+")'>DRAW</button><button type='button' class='btn btn-info' onclick = 'show_power_data("+g+")'><i class='fas fa-info-circle'></i></button></td>";
    results_html += "<td> <button onclick = 'draw_finish_times_graph("+g+")'>DRAW</button>" + "</td>";

    results_html += "</td><td onmouseover=\"showColName('WORST Populaton index/ID')\">" + ga_results.generations[g].final_worst_race_properties_index + "/" + ga_results.generations[g].worst_race_id + "</td><td style='background-color:#aaffaa' onmouseover=\"showColName('Worst Race Time')\">" + ga_results.generations[g].worst_race_time+ " </td><td onmouseover=\"showColName('Best race Start Order')\"> [" + ga_results.generations[g].final_worst_race_start_order + "]</td><td onmouseover=\"showColName('WORST Race Instructions')\">" + JSON.stringify(ga_results.generations[g].final_worst_race_instructions) + "</td><td onmouseover=\"showColName('WORST Race Instruction Noise Alterations')\"> " + JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_alterations) + "</td><td onmouseover=\"showColName('Worst Race Performance failures')\">" + JSON.stringify(ga_results.generations[g].worst_race_performance_failures)  + " </td><td onmouseover=\"showColName('Run WORST race in game model')\"><a  target='_blank' href = 'tpgame.html?source=results&results_id=" + selected_id + "&startorder=" + encodeURI(ga_results.generations[g].final_worst_race_start_order) + "&instructions=" + encodeURI(JSON.stringify(ga_results.generations[g].final_worst_race_instructions)) + "&noise_alterations=" +  encodeURI(JSON.stringify(ga_results.generations[g].worst_race_instruction_noise_alterations))   + "&performance_failures=" +  encodeURI(JSON.stringify(ga_results.generations[g].worst_race_performance_failures)) + "'> Run </a></td>";

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

  console.log("draw results (table)");

  let results = data[0];
  console.log(results);

  selected_id = results._id;
  selected_ga_settings_id = results.ga_settings_id;
  selected_settings_name = results.settings_name;
  selected_notes = results.notes;
  selected_short_title = results.short_title;

  selected_global_settings = JSON.parse(results.global_settings);
  selected_race_settings = JSON.parse(results.race_settings);
  selected_rider_settings = JSON.parse(results.rider_settings);

  selected_ga_results =JSON.parse(results.ga_results);
  build_results_table();

}

const load_results = (id) =>{

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

    $("#race_result_message").html("Loaded Results " + id + " | <strong>" + selected_settings_name + "</strong>" + "<ul><li>Run Date: " + selected_ga_results.start_time + "</li><li>Generations: " + selected_ga_results.generations.length + "</li><li>Population: " +  selected_ga_results.generations[0].population_size + "</li></ul><div class='form-group'>    <label for='notes'>Notes</label><textarea class='form-control' id='notes' rows='2'>" + (selected_notes?selected_notes:'') + "</textarea></div><div class='form-group'><label for='shortTitle'>Short Title (shown on graphs)</label><input type='text' class='form-control' id='shortTitle' value = '" + (selected_short_title?selected_short_title:'') +"'></div><button class='btn btn-primary' onClick='updateResults()' >Update</button>" );

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
    tableHTML+="<thead class='thead-dark'><tr><th scope='col'>Select</th><th scope='col'>ID (click to load)</th><th scope='col'>Settings Name</th><th scope='col'>S.Title</th><th scope='col'>Notes</th><th scope='col'>Date</th></tr></thead>"
    for(i=0;i<data.length;i++){
      tableHTML += "<tr><th scope='row'><div class='form-check'><input class='form-check-input resultsCheckbox' type='checkbox' id='results_checkbox_" + i + "' name='results_checkbox' value='" + data[i]._id + "'></div></th><th scope='row'><button type='button' class='btn btn-light' onclick = 'load_results(\""+ data[i]._id+"\")'>"+ data[i]._id+"</button></th><td>" + data[i].settings_name + "</td><td>" + data[i].short_title + "</td><td>" + data[i].notes + "</td><td>"+ data[i].date_created + "</td></tr>";
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

const updateResults = () => {
  //save the short_title and notes to the db
  let short_title = $("#shortTitle").val();
  let notes = $("#notes").val();

  let serverURL = 'http://127.0.0.1:3003/update_results/'+selected_id;
  $("#race_result_col").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

  let dataToSend = {
    "short_title":short_title,
    "notes":notes
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
  getResults();

});
