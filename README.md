This project provides a JavaScript-based simulation of two interesting scenarios found in the sport of competitive cycling:

**1:** a team pursuit track cycling race.

**2:** an end-of-race breakaway/chase scenario.

This readme explains the architecture of this project, how it may be run, and some of the details of its model's mechanisms.

For full reproducibility, a MongoDB dataset containing the configurations and results of multiple experiments may be downloaded via Zenodo.

The basic architecture is as follows:
+ A JavaScript-based simulator developed to model the core mechanisms of cycling, such as the mapping of power to acceleration and velocity, the effects of drag and sheltering, and the impacts of fatigue and failure.
+ A genetic algorithm that uses this simulator as its fitness function, and can discover solutions for any provided configuration of team riders and race conditions.
+ A visual JavaScript/CSS/HTML front-end to allow easy running and saving of configurations and experiments. This front-end UI is served up by a Node.JS server.
+ A MongoDB data storage layer that stores both experiment configurations (every starting parameter) and results, for experiments that are run.

**Project File Structure**

The following is a tree view of key files, including notes on their purpose. Files such as Node modules have been removed.

```text
+---experiment_server
|   |   app.js [main file handling requests from the browser, returning pages and data ]
|   |   db.js [connects to MongoDB database; config goes here]
|   +---node_modules (not shown)
|   +---... 
|   |---...           
|   \---public
|       |   about.html [some info about the project]
|       |   ga.html [main page for setting up congifurations and running (once-off) experiments
|       |   index.html [basic homepage explaining some of the project]
|       |   results.html [main results page for searching results, showing graphs, obtaining raw data]
|       |   sequence.html [page for setting up sequences of experiments to automatically run]
|       |   tests.html [page built for some algorithm tests]
|       |   test_suite.html [further page built for some algorithm tests]
|       |   tpgame.html [game visualiser to replay (or play) a team pursuit race]
|       |   tpgamebreakaway.html [game visualiser to replay (or play) a breakawayt race]
|       |   
|       +---css
|       |       model3.css [contains some CSS for the (bootstrap-based) pages]
|       |       
|       +---images [contains a small number of images used on the pages]
|       |       cycling-track-markings.png
|       |      ...
|       |      ... 
|       \---js [this is where the 'real' work is done]
|               ga.js [code to manage the GA page interface, ]
|               jquery.min.js [some jquery is used for the front-end]
|               model3.js [team pursuit race visualiser code]
|               model3breakaway.js [breakaway race visualiser code]
|               race_function_no_vis.js [main simulator code that runs the GA and the simulations via web workers. BIGGEST CODE FILE! ]
|               results.js [code to search for, display, and return results, including some d3.js graphing and data]
|               Sequence.js [code for sequences page; to show, create, search for, delete, etc. the sequences are run in race_function_no_vis]
|               test_functions.js [some test algorithm implementations]
|               test_suite.js [manages the testing page requests and UI]
|
\---python_graphing (contains a number of python files that create graphs for data returned from the results page and/or saved into files).
        breakaway_cooperation_instruction_histogram.py
        ...
        ...
                  
```

**Importing the MongoDB file**

The MongoDb collection is available on the open Zenodo repository, operated by CERN (The European Organization for Nuclear Research, based in Geneva).

- **Link to settings/results dataset (Zenodo)**: [https://zenodo.org/records/22649724](https://zenodo.org/records/22649724)
- **DOI**: 10.5281/zenodo.22649724 (version 1.0, containing experiments up to Sep 7th, 2026)

**Connecting the Node.JS application to the MongoDB data collection**

Once the data has been imported, the simulator application can be connected to it in order to load both experiment settings (for running them) and previous experiment results. The data connection properties must be set in the DB.js file directly inside the experiment_server folder.
```javascript
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const dbname = "crud_mongodb"; //Put your data collection name here (this is the original name).
const url = "mongodb://localhost:27017"; //Put your own server IP and port here.
const mongoOptions = {useNewUrlParser: true};
```

**Setting up and running an experiment.**

If the Node/js application is running as expected, the following interface should be presented at the base URL/port (I have used 3003, and thus http://127.0.0.1:3003/ga to avoid a conflict with another service).

Starting page from which a GA experiment may be run
<img src="https://github.com/aramicon/TeamPursuitModel/blob/main/docs/images/ga_page.png" width="500">

To run an experiment, load an instance of settings from the drop-down menu in the top-right (note here that 154 different instances have been loaded from the database), and press the "Run GA" button a the bottom. This will begin the GA, where a population of randomised solutions is created, and generations of simulations, fitness-biased selection, and variance-affected replication/reproduction start to run. Depending on the settings, this may take some time: while some feedback is shown in the main UI, further console logging and overall progress may be viewed by showing the JavaScript console of the browser (e.g., by hitting F12 in Windows for Chrome).

From this screen, new settings may be created and saved, or existing ones updated. Results from a run may also be saved.

There are a large number of settings that may be enabled/changed when running an experiment; these set everything from the team rider properties to the size of the population and the number of generations that will run. The following section includes an example of settings for a specific experiment.

**Complete set of starting parameters for a particular Experiment**

There are three sets of parameters for an experiment, which is essentially an execution of the genetic algorithm for a given team and race setting. Despite the large number, many of these are not varied for testing, and many are linked such that they only have an effect in certain combinations. For example, some settings are specific to the track cycling simulations, and others to the breakaway simulations.

The following settings are designed to run an experiment that evolves a 'simple sprinter' for the breakaway scenario.

- The "race_type" property is set to "BREAKAWAY"
- The "ga_properties_to_evolve" contains details for a single "breakaway_sprint_eagerness" setting. This is the only component of the genotype, and the only thing that will evolve for the evolving rider.

Click on each section of settings to view the entire JSON for each.

<details>
  <summary>Settings 1: **Global parameters** Controls most of the simulator behaviour, and all of the GA parameters</summary>
  
```javascript
{
    "update_group_to_chase_target_if_they_change": 1,
    "do_not_chase_rider_with_follower": 1,
    "do_not_chase_rider_with_follower_distance": 3,
    "drop_rules_contiguous_group_quit_if_gap": 1,
    "allow_dropping_rider_to_take_lead_after_sprint": 1,
    "leader_distance_ahead_that_prevents_turn_drops": 5,
    "shuffle_race_start_order_every_race": 1,
    "use_updated_failure_drop_code_rules": 1,
    "breakaway_strategy_win_ratio_test_quantity": 100,
    "linear_rank_fitness_selective_pressure": 1.5,
    "breakaway_max_time_ahead_from_next_finisher": 10,
    "breakaway_fitness_max_average_speed": 20,
    "mutation_prob_of_adding_new_update_for_rider_prop": 0.001,
    "mutation_range_for_distance_update": 250,
    "p_change_breakaway_update_value": 0.008,
    "p_change_breakaway_update_distance": 0.008,
    "ga_properties_to_evolve":
    [{
            "name": "breakaway_sprint_eagerness",
            "min": 0,
            "max": 10,
            "distribution": "linear",
            "initial_value": "random",
            "update_probability_value": 0.02,
            "update_probability_distance": 0.02,
            "add_new_probability": 0.002,
            "probability_of_instruction_per_timestep_lower": 0,
            "probability_of_instruction_per_timestep_upper": 0.005,
            "probability_delete_instruction": 0.2,
            "mutation_range": 1
        }
    ],
    "breakaway_race_number_of_race_update_distance_slots": 100,
    "race_type": "BREAKAWAY",
    "accumulated_fatigue_effect_weight": 2,
    "attack_minimum_duration": 8,
    "attack_expectation_of_getting_caught_weight": 1,
    "attack_expectation_of_getting_caught_exponent": 1,
    "attack_inverse_fatigue_weight": 1,
    "attack_inverse_fatigue_exponent": 1,
    "attack_lack_of_cohesion_weight": 1,
    "attack_lack_of_cohesion_exponent": 0.5,
    "attack_lack_of_cohesion_max_value": 1,
    "breakaway_attacking_probability_max": 10,
    "chase_inverse_power_output_weight": 1,
    "chase_inverse_power_output_exponent": 1,
    "chase_original_target_period": 10,
    "chase_inverse_fatigue_weight": 0,
    "chase_inverse_fatigue_exponent": 1,
    "chase_number_of_riders_ahead_weight": 0,
    "chase_number_of_riders_ahead_exponent": 1,
    "breakaway_chase_inverse_distance_weight": 1,
    "breakaway_chase_inverse_distance_exponent": 0.2,
    "breakaway_chase_eagerness_maximum": 10,
    "breakaway_sprint_eagerness_maximum": 10,
    "breakaway_sprint_inverse_remaining_distance_weight": 1,
    "breakaway_sprint_inverse_remaining_distance_exponent": 1,
    "breakaway_max_sprint_distance": 400,
    "breakaway_timestep_to_enable_attacks": 50,
    "power_application_include_acceleration": 1,
    "start_steps_to_reach_target_rider_gap": 8,
    "include_timestep_zero_starting_effort_instruction": 1,
    "default_starting_effort_level": 5,
    "braking_power_allowed": 0,
    "threshold_power_effort_level": 5,
    "recovery_effort_level_reduction": 2,
    "radius": 100,
    "track_length": 250,
    "fixed_test_distance": 1,
    "track_bend_radius": 22,
    "track_straight_length": 55.88496162102456,
    "vis_scale": 5,
    "track_centre_x": 10,
    "track_centre_y": 180,
    "race_bend_distance": 0,
    "start_position_offset": 0,
    "target_rider_gap": 2,
    "drag_coefficent": 0.32,
    "air_density": 1.225,
    "draft_power_savings": 0.33,
    "drafting_effect_on_drag": 0.4,
    "shelter_max_distance": 5,
    "two_riders_in_front_extra_shelter": 0.1,
    "more_than_two_riders_in_front_extra_shelter": 0.12,
    "temperaturev": 25,
    "elevationv": 100,
    "bike_weight": 9,
    "gradev": 0,
    "rollingRes": 0.004,
    "frontalArea": 0.233,
    "transv": 0.95,
    "headwindv": 0,
    "minimum_power_output": 1,
    "maximum_effort_value": 10,
    "minimum_power_output_limit": 0,
    "power_adjustment_step_size_up": 400,
    "power_adjustment_step_size_down": -100,
    "race_move_wait_time": 100,
    "damping_visibility_distance": 50,
    "fatigue_failure_level": 300,
    "accumulated_fatigue_maximum": 770,
    "fatigue_power_rate": 1,
    "recovery_power_rate": 1,
    "velocity_difference_limit": 1,
    "damping_deceleration_distance": 10,
    "velocity_adjustment_dropping_back": 2,
    "bend_switch_range_angle": 30,
    "switch_prebend_start_addition": 5,
    "log_each_step": 0,
    "ga_percentage_of_random_new_strategies_to_inject_each_gen": 0,
    "ga_trim_unused_late_instructions": 1,
    "ga_log_each_step": 1,
    "ga_population_size": 1000,
    "ga_population_size_first_generation": 1000,
    "ga_number_of_generations": 50,
    "ga_max_timestep": 800,
    "ga_probability_of_instruction_per_timestep_lower": 0.02,
    "ga_probability_of_instruction_per_timestep_upper": 0.07,
    "ga_probability_of_drop_instruction": 0.6,
    "ga_selection_type": "tournament_breakaway_linear_rank_selection",
    "ga_tournament_selection_group_size": 5,
    "ga_tournament_roulette_exponent_group_size_divisor": 5,
    "ga_p_crossover": 0.3,
    "crossover_apply_mutation_probability": 0.3,
    "ga_mutation_switch": 1,
    "ga_crossover_length_adjustment_probability": 0.5,
    "ga_team_size": 4,
    "ga_p_shuffle_start": 0.008,
    "ga_p_add_instruction": 0.001,
    "ga_p_delete_instruction": 0.4,
    "ga_p_change_effort": 0.008,
    "ga_p_change_drop": 0.008,
    "ga_p_move_instruction": 0.008,
    "ga_range_to_move_instruction": 3,
    "ga_range_to_change_effort": 1,
    "stats": {
        "crossover_instruction_sizes": []
    },
    "consistency_check_population_size": 5000,
    "ga_run_robustness_check": 0,
    "ga_robustness_check_mutation_per_instruction_random": 0,
    "robustness_mutate_inst_time_position_prob": 0,
    "robustness_mutate_inst_range_to_move_instruction": 2,
    "robustness_mutate_inst_range_to_change_effort": 0.3,
    "ga_robustness_check_mutation_per_instruction_systematic": 0,
    "systematic_effort_values": [-5, -4, -3, -2, -1.5, -1, -0.75, -0.5, 0.4, -0.25, -0.125, 0, 0.125, 0.25, 0.4, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5],
    "systematic_drop_values": [0, 1, 2, 3],
    "systematic_timestep_values": [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "robustness_check_population_size": 2000,
    "limit_drop_to_contiguous_group": 1,
    "contiguous_group_drop_distance": 10,
    "enable_instruction_noise_1_random": 0,
    "noise_1_probability_instruction_misheard": 0,
    "noise_1_probability_instruction_delayed": 0.3,
    "noise_1_probability_instruction_delay_range": 5,
    "noise_1_probability_instruction_effort_range": 2.5,
    "noise_1_probability_instruction_drop_range": 3,
    "performance_failure_enabled": 0,
    "performance_failure_effect_type": 2,
    "performance_failure_race_state_weight": 0.5,
    "performance_failure_probability_exponent": 1,
    "performance_failure_effort_weight": 2,
    "performance_failure_effort_exponent": 1,
    "performance_failure_current_fatigue_weight": 2,
    "performance_failure_current_fatigue_exponent": 2,
    "performance_failure_accumulated_fatigue_weight": 1,
    "performance_failure_accumulated_fatigue_exponent": 2,
    "performance_failure_accumulated_random_factor_weight": 1,
    "performance_failure_base_max_percentage": 0.8,
    "performance_failure_amount_min": 0,
    "performance_failure_amount_max": 1,
    "rider_performance_failure_rate_max": 10,
    "performance_failure_multiplier_max": 10,
    "choke_under_pressure_switch": 0,
    "choke_under_pressure_amount_percentage": 0.5,
    "choke_under_pressure_rider_tendancy_weight": 1,
    "choke_under_pressure_rider_tendancy_exponent": 1,
    "max_rider_choke_under_pressure_tendency": 10,
    "choke_under_pressure_new_best_speed_pressure_weight": 1,
    "choke_under_pressure_new_best_speed_pressure_max": 1,
    "choke_under_pressure_new_best_speed_pressure_exponent": 1,
    "overeagerness_switch": 0,
    "overeagerness_race_distance_end_point": 0.3,
    "overeagerness_effort_inflation_min_amount": 0.1,
    "overeagerness_effort_inflation_max_amount": 0.4,
    "overeagerness_exponent": 1,
    "log_generation_instructions_info": [0, 4, 19, 99],
    "number_of_races_to_average": 1
}
```

</details>

<details>
  <summary>Settings 2: **Race parameters** Sets some race-specific properties such as its distance</summary>

```javascript
{
  "rider_updates_genotype":[],
  "chasing_bunch_starting_gap":200,
  "chasing_bunch_speed":12,
  "riders_finished":0,
  "breakaway_riders_groups":[],
  "distance":5000,
  "start_order":[1,2,3,0],
  "current_order":[],
  "riders": [],
  "riders_r": [],
  "race_clock":0,
  "race_instructions":[],
  "race_instructions_r":[],
  "current_distance_of_finish_rider":0,
  "live_instructions":[],
  "drop_instruction":0,
  "bend1_switch_start_distance":0,
  "bend1_switch_end_distance":0,
  "bend2_switch_start_distance":0,
  "bend2_switch_end_distance":0,
  "contiguous_group_size":1
}
```

</details>


<details>
  <summary>Settings 3: **Riders** This sets up the team of riders; each has its own set of properties. The first rider here is the evolving rider. A team/group size of 4 has been used for most of the research experimentation, though it may be varied.
</summary>

```javascript
[{
        "name": "EVOLVE 1",
        "race_choices": [],
        "evolve_this_rider": 1,
        "in_race_updates": [],
        "threshold_power": 325,
        "max_power": 1000,
        "finish_position": -1,
        "finish_time": -1,
        "breakaway_chase_target_rider": -1,
        "breakaway_chase_eagerness": 0,
        "breakaway_sprint_effort_level": 10,
        "breakaway_sprint_eagerness": 0,
        "breakaway_solo_effort_level": 6,
        "breakaway_attack_duration": 12,
        "breakaway_attack_effort_level_increase": 1.5,
        "breakaway_cooperation_time": 12,
        "breakaway_cooperation_effort_level": 6,
        "breakaway_attacking_probability": 0,
        "colour": "#648FFF",
        "current_power_effort": 0,
        "weight": 75,
        "fatigue_rate": 20,
        "recovery_rate": 10,
        "recovery_amount_required_after_fatigue": 80,
        "current_position_x": 0,
        "current_position_y": 0,
        "starting_position_x": 0,
        "starting_position_y": 0,
        "current_track_position": "",
        "velocity": 0,
        "straight_distance_travelled": 0,
        "bend_distance_travelled": 0,
        "distance_this_step": 0,
        "acceleration_this_step": 0,
        "start_offset": 0,
        "distance_this_step_remaining": 0,
        "current_bend_angle": 0,
        "distance_covered": 0,
        "bend_centre_x": 0,
        "power_out": 0,
        "distance_from_rider_in_front": 0,
        "number_of_riders_in_front": 0,
        "endurance_fatigue_level": 0,
        "accumulated_fatigue": 0,
        "output_level": 5,
        "start_output_level": 5,
        "performance_failure_rate": 10,
        "performance_failure_multiplier": 10,
        "choke_under_pressure_tendency": 0,
        "choke_under_pressure_state": 0,
        "overeagerness_tendency": 1
    }, {
        "name": " Rider 2",
        "race_choices": [],
        "evolve_this_rider": 0,
        "in_race_updates": [],
        "threshold_power": 400,
        "max_power": 1000,
        "finish_position": -1,
        "finish_time": -1,
        "breakaway_chase_target_rider": -1,
        "breakaway_chase_eagerness": 0,
        "breakaway_sprint_effort_level": 10,
        "breakaway_sprint_eagerness": 0,
        "breakaway_solo_effort_level": 6.5,
        "breakaway_attack_duration": 10,
        "breakaway_attack_effort_level_increase": 1.5,
        "breakaway_cooperation_time": 12,
        "breakaway_cooperation_effort_level": 6,
        "breakaway_attacking_probability": 0,
        "colour": "#785EF0",
        "current_power_effort": 0,
        "weight": 75,
        "fatigue_rate": 20,
        "recovery_rate": 10,
        "recovery_amount_required_after_fatigue": 80,
        "current_position_x": 0,
        "current_position_y": 0,
        "starting_position_x": 0,
        "starting_position_y": 0,
        "current_track_position": "",
        "velocity": 0,
        "straight_distance_travelled": 0,
        "bend_distance_travelled": 0,
        "distance_this_step": 0,
        "acceleration_this_step": 0,
        "start_offset": 0,
        "distance_this_step_remaining": 0,
        "current_bend_angle": 0,
        "distance_covered": 0,
        "bend_centre_x": 0,
        "power_out": 0,
        "distance_from_rider_in_front": 0,
        "number_of_riders_in_front": 0,
        "endurance_fatigue_level": 0,
        "accumulated_fatigue": 0,
        "output_level": 5,
        "start_output_level": 5,
        "performance_failure_rate": 10,
        "performance_failure_multiplier": 10,
        "choke_under_pressure_tendency": 0,
        "choke_under_pressure_state": 0,
        "overeagerness_tendency": 1
    }, {
        "name": "Rider 3",
        "race_choices": [],
        "evolve_this_rider": 0,
        "in_race_updates": [],
        "threshold_power": 400,
        "max_power": 1000,
        "finish_position": -1,
        "finish_time": -1,
        "breakaway_chase_target_rider": -1,
        "breakaway_chase_eagerness": 0,
        "breakaway_sprint_effort_level": 10,
        "breakaway_sprint_eagerness": 0,
        "breakaway_solo_effort_level": 6.5,
        "breakaway_attack_duration": 10,
        "breakaway_attack_effort_level_increase": 1.5,
        "breakaway_cooperation_time": 12,
        "breakaway_cooperation_effort_level": 6,
        "breakaway_attacking_probability": 0,
        "colour": "#DC267F",
        "current_power_effort": 0,
        "weight": 75,
        "fatigue_rate": 20,
        "recovery_rate": 10,
        "recovery_amount_required_after_fatigue": 80,
        "current_position_x": 0,
        "current_position_y": 0,
        "starting_position_x": 0,
        "starting_position_y": 0,
        "current_track_position": "",
        "velocity": 0,
        "straight_distance_travelled": 0,
        "bend_distance_travelled": 0,
        "distance_this_step": 0,
        "acceleration_this_step": 0,
        "start_offset": 0,
        "distance_this_step_remaining": 0,
        "current_bend_angle": 0,
        "distance_covered": 0,
        "bend_centre_x": 0,
        "power_out": 0,
        "distance_from_rider_in_front": 0,
        "number_of_riders_in_front": 0,
        "endurance_fatigue_level": 0,
        "accumulated_fatigue": 0,
        "output_level": 5,
        "start_output_level": 5,
        "performance_failure_rate": 10,
        "performance_failure_multiplier": 10,
        "choke_under_pressure_tendency": 0,
        "choke_under_pressure_state": 0,
        "overeagerness_tendency": 1
    }, {
        "name": "Sprinter 4",
        "race_choices": [],
        "evolve_this_rider": 0,
        "in_race_updates": [],
        "threshold_power": 400,
        "max_power": 1000,
        "finish_position": -1,
        "finish_time": -1,
        "breakaway_chase_target_rider": -1,
        "breakaway_chase_eagerness": 0,
        "breakaway_sprint_effort_level": 10,
        "breakaway_sprint_eagerness": 0,
        "breakaway_solo_effort_level": 6,
        "breakaway_attack_duration": 10,
        "breakaway_attack_effort_level_increase": 1.5,
        "breakaway_cooperation_time": 8,
        "breakaway_cooperation_effort_level": 5.5,
        "breakaway_attacking_probability": 0,
        "colour": "#FE6100",
        "current_power_effort": 0,
        "weight": 75,
        "fatigue_rate": 20,
        "recovery_rate": 10,
        "recovery_amount_required_after_fatigue": 80,
        "current_position_x": 0,
        "current_position_y": 0,
        "starting_position_x": 0,
        "starting_position_y": 0,
        "current_track_position": "",
        "velocity": 0,
        "straight_distance_travelled": 0,
        "bend_distance_travelled": 0,
        "distance_this_step": 0,
        "acceleration_this_step": 0,
        "start_offset": 0,
        "distance_this_step_remaining": 0,
        "current_bend_angle": 0,
        "distance_covered": 0,
        "bend_centre_x": 0,
        "power_out": 0,
        "distance_from_rider_in_front": 0,
        "number_of_riders_in_front": 0,
        "endurance_fatigue_level": 0,
        "accumulated_fatigue": 0,
        "output_level": 5,
        "start_output_level": 5,
        "performance_failure_rate": 10,
        "performance_failure_multiplier": 10,
        "choke_under_pressure_tendency": 0,
        "choke_under_pressure_state": 0,
        "overeagerness_tendency": 1
    }
]
```

</details>


**Saving, viewing, and searching results**

When a GA has run from the "GA" page, results may be saved easily to the database by pressing the "Save" button that is shown below the GA, after the experiment has finished. fields for "Notes and "Tags" may be filled to record meta-data: these fields are searchable. A brief list of generation-by-generation results is shown on this GA page; a more comprehensive list is shown in the "Results" page, accessible from the top menu. 

Main results page:
<img src="https://github.com/aramicon/TeamPursuitModel/blob/main/docs/images/screenshot_results_screen.png" width="500">

Each experiment stored is shown here as a single line in the table, including its unique identifier. The name of the settings configuration used, the "notes" and "tags", and the date and time the experiment was run, are also included. Notes and Tags may be used to search for specific results. If the ID of any result is clicked, those results are loaded. Tags and Notes, and a Short Title - used for some graphs - may be updated. 

Crucially, here, when an experiment has been selected, the "Show Loaded Results" button may be pressed to display a second table, this one containing generation by generation details of the experiment. An example is the following:

<img src="https://github.com/aramicon/TeamPursuitModel/blob/main/docs/images/screenshot_show_loaded_results.png" width="500">

These results contain many details for each generation of an experiment, such as details about the best-in-generation solution (it's time, genotype, etc), and population-level statistics. Depending on the type of simulation, a track race or a breakaway, a slightly different list is shown.

**Run an instance of a race from results**

For any generation of any experiment, the best-in-generation solution may be run to examine its turn-by-turn behaviour. This is done via a separate UI, and uses a matched but distinct code file from the non-visual version that is used by the core simulations. Precise behaviour and finish times between the two may be compared if necessary using logging that may be enabled.

To run a specific solution as a visual race, press the "Run" button in the "Visualise" column, as shown circled in red here:
<img src="https://github.com/aramicon/TeamPursuitModel/blob/main/docs/images/screenshot_run_specific_race.png" width="500">

This will open a new tab, a race UI that uses information from the URI provided to load the correct experiment and prepare it for running. If the black "Play" triangle is pressed, the race begins. In an example here, a breakaway race has been played, and the evolving rider has just launched its finish sprint and is about to cross the finish line in the leading position at 5000 m.
<img src="https://github.com/aramicon/TeamPursuitModel/blob/main/docs/images/screenshot_example_race_running.png" width="500">

**Generating Graphs and Obtaining Data**
The UI provides two pathways to some useful grpahs and data:
- 1) directly from the UI using the D3.js library.
  2) by providing raw data that may then be used with another language, e.g., Python and libraries like  matplotlib.

** Setting up and running a sequence of experiments **

One experiment does not an insight make: it often takes many instances of an experiment and an examination of their results as an aggregate to really understand underlying effects and behaviour. To enable this, a higher level concept of a 'sequence' was introduced, which allows a series of experiments to be set up, which will then automatically run and have their results stored, with minimal user intervention. This might be as simple as repeating an identically-configured experiment a number of times, or have some setting(s) vary along the way. For example, we might run a test where one rider's power is gradually increased, and for each value run a number of GA searches.




- 

