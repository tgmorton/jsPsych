import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

const info = <const>{
  name: "html-audio-response",
  parameters: {
    /** The HTML string to be displayed */
    stimulus: {
      type: ParameterType.HTML_STRING,
      default: undefined,
    },
    /** How long to show the stimulus. */
    stimulus_duration: {
      type: ParameterType.INT,
      default: null,
    },
    /** How long to show the trial. */
    recording_duration: {
      type: ParameterType.INT,
      default: 2000,
    },
    /** Whether or not to show a button to end the recording. If false, the recording_duration must be set. */
    show_done_button: {
      type: ParameterType.BOOL,
      default: true,
    },
    /** Label for the done (stop recording) button. Only used if show_done_button is true. */
    done_button_label: {
      type: ParameterType.STRING,
      default: "Continue",
    },
    /** Label for the record again button (only used if allow_playback is true). */
    record_again_button_label: {
      type: ParameterType.STRING,
      default: "Record again",
    },
    /** Label for the button to accept the audio recording (only used if allow_playback is true). */
    accept_button_label: {
      type: ParameterType.STRING,
      default: "Continue",
    },
    /** Whether or not to allow the participant to playback the recording and either accept or re-record. */
    allow_playback: {
      type: ParameterType.BOOL,
      default: false,
    },
    /** Whether or not to save the video URL to the trial data. */
    save_audio_url: {
      type: ParameterType.BOOL,
      default: false,
    },
    /** Whether or not to use the voice-key functionality. */
    use_voice_key: {
      type: ParameterType.BOOL,
      default: false,
    },
    /** The amplitude threshold for the voice-key. */
    amplitude_threshold: {
      type: ParameterType.FLOAT,
      default: 0.1,
    },
    /** The duration of the timer that starts when the amplitude threshold is surpassed. */
    timer_duration: {
      type: ParameterType.INT,
      default: 350,
    },
    alert_sound: {
      type: ParameterType.AUDIO,
      pretty_name: "alert_sound Sound",
      default: undefined,
    },
    alert_image: {
      type: ParameterType.IMAGE,
      pretty_name: "Alert Image",
      default: undefined,
    }
  },
};

type Info = typeof info;

/**
 * html-audio-response
 * jsPsych plugin for displaying a stimulus and recording an audio response through a microphone
 * @author Josh de Leeuw
 * @see {@link https://www.jspsych.org/plugins/jspsych-html-audio-response/ html-audio-response plugin documentation on jspsych.org}
 */
class HtmlAudioResponsePlugin implements JsPsychPlugin<Info> {
  static info = info;
  private stimulus_start_time;
  private recorder_start_time;
  private recorder: MediaRecorder;
  private audio_url;
  private response;
  private load_resolver;
  private rt: number = null;
  private start_event_handler;
  private stop_event_handler;
  private data_available_handler;
  private recorded_data_chunks = [];
  private analyzer: any; // Add this property to store the analyzer
  private dataArray: any; // Add this property to store the data array
  private bufferLength: any; // Add this property to store the buffer length
  private amplitudeThreshold: any; // Add this property to store the amplitude threshold
  private startTime: any; // Add this property to store the start time
  private timeout: any;
  private alert_sound;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    var startTime;

    var context = this.jsPsych.pluginAPI.audioContext();

    // load alert_sound file
    this.jsPsych.pluginAPI
      .getAudioBuffer(trial.alert_sound)
      .then((buffer) => {
        if (context !== null) {
          this.alert_sound = context.createBufferSource();
          this.alert_sound.buffer = buffer;
          this.alert_sound.connect(context.destination);
        } else {
          this.alert_sound = buffer;
          this.alert_sound.currentTime = 0;
        }
      })
      .catch((err) => {
        console.error(
          `Failed to load audio file "${trial.stimulus}". Try checking the file path. We recommend using the preload plugin to load audio files.`
        );
        console.error(err);
      });
    
    this.recorder = this.jsPsych.pluginAPI.getMicrophoneRecorder();

    this.setupRecordingEvents(display_element, trial);

    this.startRecording(trial);
  }

  private showDisplay(display_element, trial) {
    const ro = new ResizeObserver((entries, observer) => {
      this.stimulus_start_time = performance.now();
      observer.unobserve(display_element);
      //observer.disconnect();
    });

    ro.observe(display_element);

    let html = `<div id="jspsych-html-audio-response-stimulus">${trial.stimulus}</div>`;
    html += `<div id="alert-image" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0; ">
                <img src="${trial.alert_image}" style="width: 250px;">
             </div>`;
    
    if (trial.show_done_button) {
      html += `<p><button class="jspsych-btn" id="finish-trial">${trial.done_button_label}</button></p>`;
    }

    display_element.innerHTML = html;
  }

  private hideStimulus(display_element: HTMLElement) {
    const el: HTMLElement = display_element.querySelector("#jspsych-html-audio-response-stimulus");
    if (el) {
      el.style.visibility = "hidden";
    }
    const alertImage: HTMLElement = document.getElementById("alert-image");
    if (alertImage) {
      alertImage.style.opacity = "0";
    }
  }

  private showAlertImage() {
    const alertImage: HTMLElement = document.getElementById("alert-image");
    if (alertImage) {
      alertImage.style.opacity = "1";
    }
  }

  private changeDisplay(display_element: HTMLElement, newContent: string) {
    display_element.innerHTML = newContent;
  }

  private addButtonEvent(display_element, trial) {
    const btn = display_element.querySelector("#finish-trial");
    if (btn) {
      btn.addEventListener("click", () => {
        const end_time = performance.now();
        this.rt = Math.round(end_time - this.stimulus_start_time);
        this.stopRecording().then(() => {
          if (trial.allow_playback) {
            this.showPlaybackControls(display_element, trial);
          } else {
            this.endTrial(display_element, trial);
          }
        });
      });
    }
  }

  private setupRecordingEvents(display_element, trial) {
    this.data_available_handler = (e) => {
      if (e.data.size > 0) {
        this.recorded_data_chunks.push(e.data);
      }
    };

    this.stop_event_handler = () => {
      const data = new Blob(this.recorded_data_chunks, { type: "audio/webm" });
      this.audio_url = URL.createObjectURL(data);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const base64 = (reader.result as string).split(",")[1];
        this.response = base64;
        this.load_resolver();
      });
      reader.readAsDataURL(data);
    };

    this.start_event_handler = (e) => {
      // resets the recorded data
      this.recorded_data_chunks.length = 0;

      this.recorder_start_time = e.timeStamp;
      this.showDisplay(display_element, trial);
      this.addButtonEvent(display_element, trial);

      // setup timer for hiding the stimulus
      if (trial.stimulus_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          this.hideStimulus(display_element);
        }, trial.stimulus_duration);
      }

      // setup timer for ending the trial
      if (trial.recording_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          // this check is necessary for cases where the
          // done_button is clicked before the timer expires
          if (this.recorder.state !== "inactive") {
            this.stopRecording().then(() => {
              if (trial.allow_playback) {
                this.showPlaybackControls(display_element, trial);
              } else {
                this.endTrial(display_element, trial);
              }
            });
          }
        }, trial.recording_duration);
      }
    };

    this.recorder.addEventListener("dataavailable", this.data_available_handler);

    this.recorder.addEventListener("stop", this.stop_event_handler);

    this.recorder.addEventListener("start", this.start_event_handler);
  }

  private injectInvertColorsCSS() {
    const style = document.createElement('style');
    style.textContent = `
      body {
        filter: invert(1);
      }
    `;
    document.head.append(style);
  }

  private logAmplitudeUntilThresholdReached(trial) {
    return new Promise((resolve, reject) => {
      const logAmplitude = () => {
        // Get the audio data from the analyzer
        this.analyzer.getByteTimeDomainData(this.dataArray);
  
        // Calculate the amplitude
        let sum = 0;
        for (let i = 0; i < this.bufferLength; i++) {
          const value = (this.dataArray[i] - 128) / 128;
          sum += value * value;
        }
        const amplitude = Math.sqrt(sum / this.bufferLength);
        //console.log(trial.amplitude_threshold);
  
        // If the amplitude exceeds the threshold, resolve the promise
        if (amplitude > trial.amplitude_threshold) {
          const endTime = performance.now(); // Store the end time
          console.log(`Time from start to amplitude log: ${endTime - this.startTime} ms`);
          resolve('Amplitude threshold reached');
          return;
        }
  
        // If the timeout has been reached, reject the promise
        if (Date.now() - this.startTime > this.timeout) {
          reject('Timeout reached');
          return;
        }
  
        // Schedule the next log
        this.jsPsych.pluginAPI.setTimeout(logAmplitude, 5); // Adjust the time interval as needed (in milliseconds)
      };
  
      logAmplitude();
    });
  }

  private playAlertSound() {
    if (this.alert_sound) {
      if (this.alert_sound instanceof AudioBufferSourceNode) {
        this.alert_sound.start();
      } else {
        this.alert_sound.play();
      }
    }
  }

  private startRecording(trial) {
    // Initialize the analyzer
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(this.recorder.stream);
    this.analyzer = audioContext.createAnalyser();
    source.connect(this.analyzer);
    this.bufferLength = this.analyzer.frequencyBinCount
    this.dataArray = new Uint8Array(this.bufferLength);
    
    this.recorder.start();
    this.startTime = performance.now(); // Store the start time
    this.logAmplitudeUntilThresholdReached(trial)
      .then(
        message => {
          console.log(message);
          var triggerTime = performance.now()
          console.log(triggerTime - this.startTime)
          this.jsPsych.pluginAPI.setTimeout(() => {
            this.showAlertImage();
            this.playAlertSound();
            var triggerLatency = performance.now() - triggerTime
            console.log(triggerLatency)
          }, trial.timer_duration);
        }
        )
      .catch(error => console.error(error));
  }

  private stopRecording() {
    this.recorder.stop();
    return new Promise((resolve) => {
      this.load_resolver = resolve;
    });
  }

  private showPlaybackControls(display_element, trial) {
    display_element.innerHTML = `
      <p><audio id="playback" src="${this.audio_url}" controls></audio></p>
      <button id="record-again" class="jspsych-btn">${trial.record_again_button_label}</button>
      <button id="continue" class="jspsych-btn">${trial.accept_button_label}</button>
    `;

    display_element.querySelector("#record-again").addEventListener("click", () => {
      // release object url to save memory
      URL.revokeObjectURL(this.audio_url);
      this.startRecording(trial);
    });
    display_element.querySelector("#continue").addEventListener("click", () => {
      this.endTrial(display_element, trial);
    });

    // const audio = display_element.querySelector('#playback');
    // audio.src =
  }

  private endTrial(display_element, trial) {
    // clear recordering event handler

    this.recorder.removeEventListener("dataavailable", this.data_available_handler);
    this.recorder.removeEventListener("start", this.start_event_handler);
    this.recorder.removeEventListener("stop", this.stop_event_handler);

    // kill any remaining setTimeout handlers
    this.jsPsych.pluginAPI.clearAllTimeouts();

    // gather the data to store for the trial
    var trial_data: any = {
      rt: this.rt,
      stimulus: trial.stimulus,
      response: this.response,
      estimated_stimulus_onset: Math.round(this.stimulus_start_time - this.recorder_start_time),
    };

    if (trial.save_audio_url) {
      trial_data.audio_url = this.audio_url;
    } else {
      URL.revokeObjectURL(this.audio_url);
    }

    // clear the display
    display_element.innerHTML = "";

    // move on to the next trial
    this.jsPsych.finishTrial(trial_data);
  }
}

export default HtmlAudioResponsePlugin;
