// get and dispaly results from the DB for experiments run



const draw_table = (data) => {
  //draw the table of results
  if (data.length > 0){
    let tableHTML = "<table class='table table-striped table-bordered '>";
    tableHTML+="<thead class='thead-dark'><tr><th scope='col'>ID</th><th scope='col'>Settings Name</th><th scope='col'>Notes</th><th scope='col'>Date</th></tr></thead>"
    for(i=0;i<data.length;i++){
        tableHTML += "<tr><th scope='row'>" + data[i]._id+"</th><td>" + data[i].settings_name + "</td><td>" + data[i].notes + "</td><td>"+ data[i].date_created + "</td></tr>";
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

    $("#results_info_label").html("Attempting to connect to <a href='"+serverURL+"'>server to read results</a>")

    fetch(serverURL,{method : 'get'}).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
            throw Error(response.statusText);
      }
    }).then((data)=>{
      //console.log('data ' + JSON.stringify(data));

      console.log("***data***");
      console.log(data);
      console.log("***end_data***");

      draw_table(data);


      $("#results_info_label").text(data.length + " settings found.")

    }).catch((error) => {
      console.log("Error loading results from server");
      $("#results_info_label").text("ERROR CONNECTING TO SERVER " + error)
      console.log(error)
});
  }


$(document).ready(function() {
  getResults();

});
