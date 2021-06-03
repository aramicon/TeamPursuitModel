//Load and edit sequences, DK 2021
console.log("laod list of sequences");

let selected_id ="";
let selected_seq_name = "";
let selected_seq_results = {};

$(document).ready(function() {
  getSequences();
  getSettingNames();
});


const getSequences = () => {
    let serverURL = 'http://127.0.0.1:3003/getSequences/';
    $("#sequences_info_label").html("Attempting to connect to <a href='"+serverURL+"'>server to read sequences</a>");
    fetch(serverURL,{method : 'get'}).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
            throw Error(response.statusText);
      }
    }).then((data)=>{
      draw_table(data);
      $("#sequences_info_label").text(data.length + " sequences found.");
    }).catch((error) => {
      console.log("Error loading sequences from server");
      $("#sequences_info_label").text("ERROR CONNECTING TO SERVER " + error)
      console.log(error)
});
  }


  const draw_table = (data) => {
    //draw the table of results
    console.log("**data**");
    console.log(data)
    if (data.length > 0){
      let tableHTML = "<table class='table table-striped table-bordered table-dark '>";
      tableHTML+="<thead class='thead-dark'><tr><th scope='col'>Select</th><th scope='col'>ID (click to load)</th><th scope='col'>Sequence Description</th><th scope='col'>Settings ID</th><th scope='col'>Settings Title</th><th scope='col'>Date</th></tr></thead>"
      for(i=0;i<data.length;i++){
          tableHTML += "<tr><th scope='row'><div class='form-check'><input class='form-check-input resultsCheckbox' type='checkbox' id='results_checkbox_" + i + "' name='results_checkbox' value='" + data[i]._id + "'></div></th><th scope='row'><button type='button' class='btn btn-dark' onclick = 'load_results(\""+ data[i]._id+"\")'>"+ data[i]._id+"</button></th><td>" + data[i].sequence_name + "</td><td>" + data[i].settings_id + "</td><td>" + data[i].notes + "</td><td>"+ data[i].date_updated + "</td></tr>";
      }

      tableHTML += "</table>";

      $("#sequences_list").html(tableHTML);
    }
    else{
      $("#rsequences_info_label").html("No sequences returned!");
    }
  }

  const load_results = (id) =>{

    let serverURL = 'http://127.0.0.1:3003/getSequence/'+id;
    console.log("get sequence data from " + serverURL);
    $("#sequences_info_label").html("Connect to <a href='"+serverURL+"'>server to read single sequence details</a>");
    fetch(serverURL,{method : 'get'}).then((response)=>{
      //console.log(response);
      return response.json();
      if (!response.ok) {
            throw Error(response.statusText);
      }
    }).then((data)=>{
      //draw_results(data);
      let results = data[0];
      console.log(results);

      selected_id = results._id
      selected_seq_name = results.sequence_name;
      selected_seq_results = results;
      //let s_options = results.sequence_options;
      let s_options = JSON.stringify(results.sequence_options);

      $("#sequences_info_label").text(data.length + " sequences found.");

      $("#sequence_result_message_info").html("Loaded Sequence " + selected_id + " | <strong>" + selected_seq_name + "</strong>" + "<ul><li>Run Date: " + selected_seq_results.date_updated + "</li><li>Settings Id: " + selected_seq_results.settings_id + "</li></ul>" );

      $("#sequence_form_notes").val((selected_seq_results.notes?selected_seq_results.notes:''));

      $("#sequence_form_shortTitle").val((selected_seq_name?selected_seq_name:''));

      $("#sequence_form_options").val((s_options?s_options:''));

    //  $("#experiment_names select").val(selected_seq_results.settings_id);
    //  $('.#experiment_names option[value='+selected_seq_results.settings_id+']').attr('selected','selected');

      $("#experiment_names").val(selected_seq_results.settings_id).change();

    }).catch((error) => {
      console.log("Error loading results from server");
      $("#results_info_label").text("ERROR CONNECTING TO SERVER " + error)
      console.log(error)
  });

  }

  const updateSequence = () => {
    //save the sequence name and notes to the db

    let serverURL = 'http://127.0.0.1:3003/update_sequence/'+selected_id;
     $("#sequence_result_col").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

     let validProps = true; //boolean to check if data is ok

     let new_sequence_name = $("#sequence_form_shortTitle").val();
     let new_sequence_notes = $("#sequence_form_notes").val();
     let new_sequence_options = "";
     let optionsObject ={};
     try {
       optionsObject = JSON.parse($("#sequence_form_options").val());
       //new_sequence_options = JSON.stringify(optionsObject);
       //had been saving a strign but need to save a JSON object
      } catch (error) {
        alert("ERROR parsing sequence settings \n\n" + error);
        console.log(error);
        validProps = false;
      }

     let selected_settings_id = $('#experiment_names').val();

     if(new_sequence_name.length <= 0){
        alert("Sequence name cannot be empty");
     }
     if(new_sequence_notes.length <= 0){
        alert("Sequence notes cannot be empty");
     }
     if(!selected_settings_id){
        alert("Experiment settings must be set");
     }

     if (new_sequence_name.length > 0 && new_sequence_notes.length > 0 && validProps && selected_settings_id){
       let t = new Date();
     dateString = t.getFullYear() + "-" + (t.getUTCMonth()+1) + "-" + t.getUTCDate() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds();

     let dataToSend = {
           "sequence_name":new_sequence_name,
           "notes":new_sequence_notes,
           "settings_id":selected_settings_id,
           "sequence_options":optionsObject,
           "date_updated":dateString
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
       $("#sequence_result_col").html("Seq. Details Updated");
     });
   }
   else{
      $("#sequence_result_col").html("Invalid Seq. Details, cannot Update");
   }
  }

  const addSequence = () => {

        let serverURL = 'http://127.0.0.1:3003/add_sequence';
        $("#sequence_result_col").html("Attempting to connect to <a href='"+serverURL+"'>server</a>");

        let new_sequence_name = $("#sequence_form_shortTitle").val();
        let new_sequence_notes = $("#sequence_form_notes").val();
        let new_sequence_options = JSON.stringify($("#sequence_form_options").val());
        let selected_settings_id = $('#experiment_names').val();


        if (new_sequence_name.length > 0 && new_sequence_notes.length > 0 && new_sequence_options.length > 0){
          let t = new Date();
        dateString = t.getFullYear() + "-" + (t.getUTCMonth()+1) + "-" + t.getUTCDate() + " " + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds();
        let dataToSend = {
                "sequence_name":new_sequence_name,
                "notes":new_sequence_notes,
                "settings_id":selected_settings_id,
                "sequence_options":new_sequence_options,
                "date_created":dateString,
                "date_updated":dateString
              };
      let jsonToSendS = JSON.stringify(dataToSend);
      console.log("jsonToSendS ", jsonToSendS);
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
        //console.log('data ' + JSON.stringify(data));

        $("#sequence_result_col").text("setting updated");

        //need to make sure the correct ID (of the new settings) is updated
        console.log("saved as new sequence with data " +  data.document._id);
        selected_sequence_id =data.document._id;

      }).catch((error) => {
        console.log("Error updating sequence on experiment server");
        $("#sequence_result_col").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
        console.log(error)
    });

  }
  else{
    alert("Cannot add new sequence: check that values are provided")
  }

  }

  const populateNamesDropdown = (data) => {
      const namesDropDown = $("#experiment_names");
      data.forEach((experiment_names) => {
        namesDropDown.append($('<option>', {value : experiment_names._id}).text(experiment_names.name));
    });
  }

  const getSettingNames = () => {

    let serverURL = 'http://127.0.0.1:3003/getExperimentSettingNames/';
      $("#sequence_result_col").html("Attempting to connect to <a href='"+serverURL+"'>server</a>")

    fetch(serverURL,{method : 'get'}).then((response)=>{
      console.log(response);
      return response.json();
      if (!response.ok) {
            throw Error(response.statusText);
      }
    }).then((data)=>{
      //console.log('data ' + JSON.stringify(data));

      console.log("data.length " + data.length);
      populateNamesDropdown(data);
      $("#sequence_result_col").text(data.length + " settings found.")

    }).catch((error) => {
      console.log("Error loading settings from experiment server");
      $("#sequence_result_col").text("ERROR CONNECTING TO EXPERIMENT SERVER " + error)
      console.log(error)
  });
  }
