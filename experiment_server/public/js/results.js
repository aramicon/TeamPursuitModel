// get and dispaly results from the DB for experiments run
let selected_ga_results = {};
let selected_id ="";
let selected_ga_settings_id = "";
let selected_settings_name = "";
let selected_notes = "";
let selected_global_settings = {};
let selected_race_settings ={};
let selected_rider_settings = {};

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

      let graph_title ="unknown";
      let graph_data_1 = {};
      let graph_data_2 = {};
      let graph_data_3 = {};
      let graph_data_4 = {};

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
        graph_data_1.y_scale_from = 100;
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

        graph_data_1.x_label = "Watts";
        graph_data_1.y_label = "Timestep";

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

      //D3
      // set the dimensions and margins of the graph
        let totalWidth = 900;
        let totalHeight = 440;
        let legendLeftIndent = 280;
        let bulletIndent = 20;

          var margin = {top: 30, right: legendLeftIndent, bottom: 30, left: 60},
              width = totalWidth - margin.left - margin.right,
              height = totalHeight - margin.top - margin.bottom;

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
              var x = d3.scaleLinear()
                .domain([graph_data_1.x_scale_from, graph_data_1.x_scale_to])
                .range([ 0, width ]);
              svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

              // Add Y axis
              var y = d3.scaleLinear()
                .domain([graph_data_1.y_scale_from, graph_data_1.y_scale_to])
                .range([ height, 0 ]);
              svg.append("g")
                .call(d3.axisLeft(y));

              // Add the line 1
              svg.append("path")
                .datum(graph_data_1.data)
                .attr("fill", "none")
                .attr("stroke", "#0000ff")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                  .x(function(d) { return x(d.x) })
                  .y(function(d) { return y(d.y) })
                );

                if (!jQuery.isEmptyObject(graph_data_2)){
                  //draw second line if data is given
                  svg.append("path")
                    .datum(graph_data_2.data)
                    .attr("fill", "none")
                    .attr("stroke", "#ff0000")
                    .attr("stroke-width", 1.5)
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
                    .attr("stroke", "#00ff00")
                    .attr("stroke-width", 1.5)
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
                    .attr("stroke", "#000000")
                    .attr("stroke-width", 1.5)
                    .attr("d", d3.line()
                      .x(function(d) { return x(d.x) })
                      .y(function(d) { return y(d.y) })
                    );
                }

                  // X and Y labels
                  svg.append("text")
                  .attr("class", "x label")
                  .attr("text-anchor", "end")
                  .attr("x", width)
                  .attr("y", height - 6)
                  .text(graph_data_1.x_label); // e.g. "GA Generation"

                  svg.append("text")
                  .attr("class", "y label")
                  .attr("text-anchor", "end")
                    .attr("x", -220)
                  .attr("y", 6)
                  .attr("dy", ".75em")
                  .attr("transform", "rotate(-90)")
                  .text(graph_data_1.y_label); // e.g. "Race Finish Time (s)"

                  //Colour Legend
                  svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",6).attr("r", 6).style("fill", "#0000ff");

                  svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 6).text(graph_data_1.title).style("font-size", "15px").attr("alignment-baseline","middle");

                  if (!jQuery.isEmptyObject(graph_data_2)){
                      svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",40).attr("r", 6).style("fill", "#ff0000");
                      svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 40).text(graph_data_2.title).style("font-size", "15px").attr("alignment-baseline","middle");
                  }
                  if (!jQuery.isEmptyObject(graph_data_3)){
                      svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",60).attr("r", 6).style("fill", "#00ff00");
                      svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 60).text(graph_data_3.title).style("font-size", "15px").attr("alignment-baseline","middle");
                  }
                  if (!jQuery.isEmptyObject(graph_data_4)){
                      svg.append("circle").attr("cx",totalWidth - legendLeftIndent).attr("cy",80).attr("r", 6).style("fill", "#000000");
                      svg.append("text").attr("x", totalWidth - (legendLeftIndent - bulletIndent)).attr("y", 80).text(graph_data_4.title).style("font-size", "15px").attr("alignment-baseline","middle");
                  }

                  //add a title
                  svg.append("text")
                  .attr("x", (width / 2))
                  .attr("y", 0 - (margin.top / 2))
                  .attr("text-anchor", "middle")
                  .style("font-size", "16px")
                  .style("font-style", "italic")
                  .text(selected_settings_name + ": " + graph_title);
      break;

    default:
    console.log("graph " + graph_name + " not found: nothing drawn");
  }
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
  results_html += "<table class='results_table'><tr><th>GEN</th><th>AVG. TIME</th><th>AVG. # Instructions</th><th>RACE</th><th>TIME</th><th>START</th><th>INSTRUCTIONS</th><th>VISUALISE</th> <th>POWER GRAPH</th> <th># Crossovers</th> <th>AVG. Inst. ++</th><th>Avg. Inst. --</th><th>Avg. Inst. moved</th><th>Avg Effort changes</th><th>Avg. Drop changes.</th><th>Avg. Order shuffles.</th><th>Drop Inst/Total Inst</th><th># Variants</th> </tr>";

  console.log(ga_results);
  console.log(ga_results.generations);

  for(g=0;g<ga_results.generations.length;g++){

    results_html += "<tr><td style='background-color:#aaaaaa;' onmouseover=\"showColName('Generation')\">" + g + "</td><td onmouseover=\"showColName('Average Race Time')\"> " + ga_results.generations[g].stats_average_time + "</td><td onmouseover=\"showColName('Average Number of Instructions per race')\">" + ga_results.generations[g].stats_average_number_of_instructions + "</td><td onmouseover=\"showColName('Populaton index/ID')\">" + ga_results.generations[g].final_best_race_properties_index + "/" + ga_results.generations[g].best_race_id + "</td><td style='background-color:#aaffaa' onmouseover=\"showColName('Best Race Time')\">" + ga_results.generations[g].best_race_time+ " </td><td onmouseover=\"showColName('Best race Start Order')\"> [" + ga_results.generations[g].final_best_race_start_order + "]</td><td onmouseover=\"showColName('Best Race Instructions')\">" + JSON.stringify(ga_results.generations[g].final_best_race_instructions) + "</td><td onmouseover=\"showColName('Run race in game model')\"><a  target='_blank' href = 'tpgame.html?settings_id=" + selected_ga_settings_id + "&startorder=" + encodeURI(ga_results.generations[g].final_best_race_start_order) + "&instructions=" + encodeURI(JSON.stringify(ga_results.generations[g].final_best_race_instructions)) + "'> Run </a></td>";

    results_html += "<td> <button onclick = 'draw_power_graph("+g+")'>DRAW</button>" + "</td>";

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

    $("#results_info_label").text(data.length + " settings found.");



    $("#race_result_message").html("Loaded Results " + id + " | <strong>" + selected_settings_name + "</strong>" + "<ul><li>Run Date: " + selected_ga_results.start_time + "</li><li>Generations: " + selected_ga_results.generations.length + "</li><li>Population: " +  selected_ga_results.generations[0].population_size + "</li></ul>" );

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
    tableHTML+="<thead class='thead-dark'><tr><th scope='col'>ID (click to load)</th><th scope='col'>Settings Name</th><th scope='col'>Notes</th><th scope='col'>Date</th></tr></thead>"
    for(i=0;i<data.length;i++){
        tableHTML += "<tr><th scope='row'><button type='button' class='btn btn-light' onclick = 'load_results(\""+ data[i]._id+"\")'>"+ data[i]._id+"</button></th><td>" + data[i].settings_name + "</td><td>" + data[i].notes + "</td><td>"+ data[i].date_created + "</td></tr>";
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

$(document).ready(function() {
  getResults();
  d3.select("#saveGraphAsPng").on('click',saveGraphAsPng);
  d3.select("#clearCanvas").on('click',clearCanvas);

});
