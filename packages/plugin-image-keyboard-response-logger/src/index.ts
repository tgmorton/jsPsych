import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

const info = <const>{
  name: "image-keyboard-response",
  parameters: {
    /** The image to be displayed */
    stimulus: {
      type: ParameterType.IMAGE,
      pretty_name: "Stimulus",
      default: undefined,
    },
    /** The image to be displayed post event */
    stimulus_post: {
      type: ParameterType.IMAGE,
      pretty_name: "Stimulus Post",
      default: undefined,
    },
    /** Set the image height in pixels */
    stimulus_height: {
      type: ParameterType.INT,
      pretty_name: "Image height",
      default: null,
    },
    /** Set the image width in pixels */
    stimulus_width: {
      type: ParameterType.INT,
      pretty_name: "Image width",
      default: null,
    },
    /** Maintain the aspect ratio after setting width or height */
    maintain_aspect_ratio: {
      type: ParameterType.BOOL,
      pretty_name: "Maintain aspect ratio",
      default: true,
    },
    /** Array containing the key(s) the subject is allowed to press to respond to the stimulus. */
    choices: {
      type: ParameterType.KEYS,
      pretty_name: "Choices",
      default: "ALL_KEYS",
    },
    /** Any content here will be displayed below the stimulus. */
    prompt: {
      type: ParameterType.HTML_STRING,
      pretty_name: "Prompt",
      default: null,
    },
    /** How long to show the stimulus. */
    stimulus_duration: {
      type: ParameterType.INT,
      pretty_name: "Stimulus duration",
      default: null,
    },
    /** How long to show trial before it ends */
    trial_duration: {
      type: ParameterType.INT,
      pretty_name: "Trial duration",
      default: null,
    },
    /** If true, trial will end when subject makes a response. */
    response_ends_trial: {
      type: ParameterType.BOOL,
      pretty_name: "Response ends trial",
      default: true,
    },
    /**
     * If true, the image will be drawn onto a canvas element (prevents blank screen between consecutive images in some browsers).
     * If false, the image will be shown via an img element.
     */
    // render_on_canvas: {
    //   type: ParameterType.BOOL,
    //   pretty_name: "Render on canvas",
    //   default: true,
    // },
    visual_feedback: {
      type: ParameterType.STRING,
      pretty_name: 'Whether to display something on the screen',
      options: ['no', 'word', 'whole', 'long'],
      default: 'whole',
      description: 'Determines the type of feedback displayed on the screen during typing'
    },
    /* trigger list object of type list with strings */
    trigger_list: {
      type: ParameterType.COMPLEX,
      pretty_name: 'Trigger list',
      default: [],
      description: 'List of triggers to be displayed on the screen during typing'
    },
    trigger_end: {
      type: ParameterType.BOOL,
      pretty_name: 'Trigger end',
      default: false,
      description: 'Whether to trigger the end of the trial'
    },
    space_allowed : {
      type: ParameterType.BOOL,
      pretty_name: 'Space allowed',
      default: true,
      description: 'Whether to allow space to be used for word separation'
    },
    correct_feedback: {
      type: ParameterType.BOOL,
      pretty_name: 'Correct feedback',
      default: false,
      description: 'Whether to give feedback on correct typing'
    },
    correction_delay: {
      type: ParameterType.INT,
      pretty_name: 'Correct delay',
      default: 750,
      description: 'How long to display correct feedback'
    },
    }
  },
};

type Info = typeof info;

/**
 * **image-keyboard-response-logger**
 *
 * jsPsych plugin for displaying an image stimulus and getting a keyboard response adapted from Josh de Leeuw's plugin
 *
 * @author Thomas Morton
 */

class ImageKeyboardResponsePlugin implements JsPsychPlugin<Info> {
  static info = info;

  renderImageOnCanvas(trial, display_element, image_drawn = false) {
    // first clear the display element
    while (display_element.firstChild) {
      display_element.removeChild(display_element.firstChild);
    }
  
    // create canvas element and image
    var canvas = document.createElement("canvas");
    canvas.id = "jspsych-image-keyboard-response-stimulus";
    canvas.style.margin = "0";
    canvas.style.padding = "0";
    var ctx = canvas.getContext("2d");
    var img = new Image();
    var height, width;
  
    img.onload = () => {
      if (!image_drawn) {
        getHeightWidth();
        ctx.drawImage(img, 0, 0, width, height);
      }
    };
    img.src = trial.stimulus;
  
    const getHeightWidth = () => {
      if (trial.stimulus_height !== null) {
        height = trial.stimulus_height;
        if (trial.stimulus_width == null && trial.maintain_aspect_ratio) {
          width = img.naturalWidth * (trial.stimulus_height / img.naturalHeight);
        }
      } else {
        height = img.naturalHeight;
      }
      if (trial.stimulus_width !== null) {
        width = trial.stimulus_width;
        if (trial.stimulus_height == null && trial.maintain_aspect_ratio) {
          height = img.naturalHeight * (trial.stimulus_width / img.naturalWidth);
        }
      } else if (!(trial.stimulus_height !== null && trial.maintain_aspect_ratio)) {
        // if stimulus width is null, only use the image's natural width if the width value wasn't set
        // in the if statement above, based on a specified height and maintain_aspect_ratio = true
        width = img.naturalWidth;
      }
      canvas.height = height;
      canvas.width = width;
    };
  
    getHeightWidth();
  
    display_element.insertBefore(canvas, null);
    if (img.complete && Number.isFinite(width) && Number.isFinite(height)) {
      ctx.drawImage(img, 0, 0, width, height);
      image_drawn = true;
    }
  
    if (trial.prompt !== null) {
      display_element.insertAdjacentHTML("beforeend", trial.prompt);
    }

    return canvas;
  }

  changeImageOnCanvas(trial, canvas: HTMLCanvasElement, newImageSrc: string) {
    var ctx = canvas.getContext("2d");
    var img = new Image();
    var height, width;
  
    img.onload = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Draw the new image
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = newImageSrc;
  
    const updateDimensions = () => {
      // Update the canvas dimensions if necessary
      // This assumes that you have access to the same variables as in the original function
      // If not, you'll need to pass them as parameters
      if (trial.stimulus_height !== null) {
        height = trial.stimulus_height;
        if (trial.stimulus_width == null && trial.maintain_aspect_ratio) {
          width = img.naturalWidth * (trial.stimulus_height / img.naturalHeight);
        }
      } else {
        height = img.naturalHeight;
      }
      if (trial.stimulus_width !== null) {
        width = trial.stimulus_width;
        if (trial.stimulus_height == null && trial.maintain_aspect_ratio) {
          height = img.naturalHeight * (trial.stimulus_width / img.naturalWidth);
        }
      } else if (!(trial.stimulus_height !== null && trial.maintain_aspect_ratio)) {
        width = img.naturalWidth;
      }
      canvas.height = height;
      canvas.width = width;
    };
  
    updateDimensions();
  }

  // renderImageElement(trial, display_element) {
  //   // display stimulus as an image element
  //   var html = '<img src="' + trial.stimulus + '" id="jspsych-image-keyboard-response-stimulus">';
    
  //   // add prompt
  //   if (trial.prompt !== null) {
  //     html += trial.prompt;
  //   }
    
  //   // update the page content
  //   display_element.innerHTML = html;
  
  //   // set image dimensions after image has loaded (so that we have access to naturalHeight/naturalWidth)
  //   var img = display_element.querySelector(
  //     "#jspsych-image-keyboard-response-stimulus"
  //   ) as HTMLImageElement;
  //   var height, width;
    
  //   if (trial.stimulus_height !== null) {
  //     height = trial.stimulus_height;
  //     if (trial.stimulus_width == null && trial.maintain_aspect_ratio) {
  //       width = img.naturalWidth * (trial.stimulus_height / img.naturalHeight);
  //     }
  //   } else {
  //     height = img.naturalHeight;
  //   }
    
  //   if (trial.stimulus_width !== null) {
  //     width = trial.stimulus_width;
  //     if (trial.stimulus_height == null && trial.maintain_aspect_ratio) {
  //       height = img.naturalHeight * (trial.stimulus_width / img.naturalWidth);
  //     }
  //   } else if (!(trial.stimulus_height !== null && trial.maintain_aspect_ratio)) {
  //     // if stimulus width is null, only use the image's natural width if the width value wasn't set
  //     // in the if statement above, based on a specified height and maintain_aspect_ratio = true
  //     width = img.naturalWidth;
  //   }
    
  //   img.style.height = height.toString() + "px";
  //   img.style.width = width.toString() + "px";
  // }

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    let startTime = performance.now();
    let words = [];
    let buffer = '';
    let wholebuffer = '';
    let keypresses = '';
    let responses = [];
    let triggered = false;
    let eventTime;

    var canvas = this.renderImageOnCanvas(trial, display_element);

    // Get the existing canvas and its parent element
    let existingCanvas = display_element.querySelector('canvas');
    let parentElement = existingCanvas.parentElement;

    // Create a new canvas and get its context
    let newCanvas = document.createElement('canvas');
    let ctx = newCanvas.getContext('2d');

    // Append the new canvas to the parent element of the existing canvas
    parentElement.appendChild(newCanvas);

    // Set the size of the new canvas
    newCanvas.width = existingCanvas.width + 400; // Adjust as needed
    newCanvas.height = 200; // Adjust as needed

    // Center the new canvas
    newCanvas.style.display = 'block';
    newCanvas.style.margin = '0 auto';

    // Set the font size and style for the text
    ctx.font = '30px Arial'; // Adjust as needed
    if (trial.visual_feedback == 'word') {
      ctx.textAlign = 'center';
    }
    else if (trial.visual_feedback == 'whole') {
      ctx.textAlign = 'left';
    }
    else if (trial.visual_feedback == 'long') {
      ctx.textAlign = 'right';
    }
    ctx.textBaseline = 'middle';

    // function to end trial when it is time
    const end_trial = () => {
      // kill any remaining setTimeout handlers
      this.jsPsych.pluginAPI.clearAllTimeouts();

      // kill keyboard listeners
      if (typeof keyboardListener !== "undefined") {
        this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
      }

      words.push(buffer);

      // gather the data to store for the trial
      var trial_data = {
        responses,
        words,
        wholebuffer,
        eventTime
      };

      // clear the display
      display_element.innerHTML = "";

      // move on to the next trial
      this.jsPsych.finishTrial(trial_data);
    };

    // function to handle responses by the subject
    var after_response = (info) => {
      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      // Calculate the reaction time
      let rt = performance.now() - startTime;
      let key = info.key;
      
      if (key == 'enter') {
        if (trial.trigger_end) {
          if (triggered) {
            ctx.fillStyle = 'green';
            this.jsPsych.pluginAPI.setTimeout(() => {
              end_trial();
            }, trial.correction_delay);
          }
          else {
            ctx.fillStyle = 'red';
            this.jsPsych.pluginAPI.setTimeout(() => {
              ctx.fillStyle = 'black';
            }, trial.correction_delay);
          }
        }
        else {
          end_trial();
        } 
      }

      // If the key is a backspace, remove the last character from the buffer
      if (key == 'shift' || key == 'meta' || key == 'enter') {
        // Do nothing
      }
      else if (key == '\\' || key == 'backspace') {
        buffer = buffer.slice(0, -1);
        wholebuffer = wholebuffer.slice(0, -1);
      }
      // If the key is a space, add the buffer to the words array and clear it
      else if (key === ' ') {
        if (trial.space_allowed) {
          words.push(buffer);
          buffer = "";
          if (triggered) {
            this.changeImageOnCanvas(trial, canvas, trial.stimulus_post);
            eventTime = startTime - performance.now();
          }
        }
        else { 
          buffer += ' ';
        }
        wholebuffer += ' ';
      }
      // Otherwise, add the key to the buffer
      else {
        buffer += info.key;
        wholebuffer += info.key;
      }

      // Store the key and reaction time
      responses.push({
        key: info.key,
        rt: rt
      });

      if (trial.trigger_list.includes(buffer)) {
        // If the buffer is a trigger, change the image
        triggered = true;
      }

      if (trial.visual_feedback == 'word') {
        // Update the typed text element with the current buffer
        ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
        // Update the canvas with the current buffer
        ctx.fillText(buffer, newCanvas.width / 2, newCanvas.height / 2); // Adjust the coordinates as needed
      }

      if (trial.visual_feedback == 'whole') {
        // Update the typed text element with the current buffer
        ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
        // Update the canvas with the current buffer
        ctx.fillText(wholebuffer, 0, newCanvas.height / 2); // Adjust the coordinates as needed
      }

      if (trial.visual_feedback == 'long'){
        // Update the typed text element with the current buffer
        ctx.clearRect(0, 0, newCanvas.width, newCanvas.height);
        // Update the canvas with the current buffer
        ctx.fillText(wholebuffer, newCanvas.width, newCanvas.height / 2); // Adjust the coordinates as needed
      }
    };

    // start the response listener
    if (trial.choices != "NO_KEYS") {
      var keyboardListener = this.jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: after_response,
        valid_responses: trial.choices,
        rt_method: 'performance',
        persist: true,
        allow_held_key: false,
      });
    }

    // hide stimulus if stimulus_duration is set
    if (trial.stimulus_duration !== null) {
      this.jsPsych.pluginAPI.setTimeout(() => {
        display_element.querySelector<HTMLElement>(
          "#jspsych-image-keyboard-response-stimulus"
        ).style.visibility = "hidden";
      }, trial.stimulus_duration);
    }

    // end trial if trial_duration is set
    if (trial.trial_duration !== null) {
      this.jsPsych.pluginAPI.setTimeout(() => {
        end_trial();
      }, trial.trial_duration);
    } else if (trial.response_ends_trial === false) {
      console.warn(
        "The experiment may be deadlocked. Try setting a trial duration or set response_ends_trial to true."
      );
    }
  }

  simulate(
    trial: TrialType<Info>,
    simulation_mode,
    simulation_options: any,
    load_callback: () => void
  ) {
    if (simulation_mode == "data-only") {
      load_callback();
      this.simulate_data_only(trial, simulation_options);
    }
    if (simulation_mode == "visual") {
      this.simulate_visual(trial, simulation_options, load_callback);
    }
  }

  private simulate_data_only(trial: TrialType<Info>, simulation_options) {
    const data = this.create_simulation_data(trial, simulation_options);

    this.jsPsych.finishTrial(data);
  }

  private simulate_visual(trial: TrialType<Info>, simulation_options, load_callback: () => void) {
    const data = this.create_simulation_data(trial, simulation_options);

    const display_element = this.jsPsych.getDisplayElement();

    this.trial(display_element, trial);
    load_callback();

    if (data.rt !== null) {
      this.jsPsych.pluginAPI.pressKey(data.response, data.rt);
    }
  }

  private create_simulation_data(trial: TrialType<Info>, simulation_options) {
    const default_data = {
      stimulus: trial.stimulus,
      rt: this.jsPsych.randomization.sampleExGaussian(500, 50, 1 / 150, true),
      response: this.jsPsych.pluginAPI.getValidKey(trial.choices),
    };

    const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);

    this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);

    return data;
  }
}

export default ImageKeyboardResponsePlugin;
