let eyeTrackingData = []; // array to store eye tracking data
let fixationData = []; // array to store fixation data
let previousGaze = null;
let surveyAnswer = {}; // variable to store the survey answers
let calibrationAccuracy = 0; // variable to store calibration accuracy
let PointCalibrate = 0;
let CalibrationPoints = {};
let lastEyeCheckTime_ms = Date.now();
let clickCounter = 0;
let isEyePositionCorrect = false
const eyeCheckDelay_ms = 500; // Check every 500ms 
const sufficientMeasurementAccuracy = 70;  // sufficient percentage of accuracy
const userId = generateUniqueUserId();  // unique user ID

// modals
let info_modal = document.getElementById("research-info-modal");
let info_modal_btn = info_modal.querySelector('button');

let stay_still_modal = document.getElementById("stay-still-modal");
let stay_still_modal_btn = stay_still_modal.querySelector('button');

let camera_model = document.getElementById("camera-modal");
let camera_model_btn = camera_model.querySelector('button');

let face_check_modal = document.getElementById("face-check-modal");

let train_task_modal = document.getElementById("training-task-modal");
let train_task_modal_btn = document.querySelector("#training-task-modal .modal-button"); // Unique button selector for the first modal

let eye_tracking_msg_modal = document.getElementById("eye-tracking-message-modal");
let eye_tracking_msg_modal_btn = document.querySelector("#eye-tracking-message-modal .modal-button");

let train_task_modal_2 = document.getElementById("training-task-modal_2");
let train_task_modal_btn_2 = document.querySelector("#training-task-modal_2 .modal-button"); // Unique button selector for the second modal

let eye_tracking_msg_modal_2 = document.getElementById("eye-tracking-message-modal_2");
let eye_tracking_msg_modal_btn_2 = document.querySelector("#eye-tracking-message-modal_2 .modal-button");

let train_task_modal_3 = document.getElementById("training-task-modal_3");
let train_task_modal_btn_3 = document.querySelector("#training-task-modal_3 .modal-button"); // Unique button selector for the third modal

let eye_tracking_msg_modal_3 = document.getElementById("eye-tracking-message-modal_3");
let eye_tracking_msg_modal_btn_3 = document.querySelector("#eye-tracking-message-modal_3 .modal-button");

let main_task_modal = document.getElementById("main-task-modal");
let main_task_modal_btn = document.querySelector("#main-task-modal .modal-button"); // Unique button selector for the first modal

let main_task_modal_2 = document.getElementById("main-task-modal_2");
let main_task_modal_btn_2 = document.querySelector("#main-task-modal_2 .modal-button"); // Unique button selector for the second modal

let main_task_modal_3 = document.getElementById("main-task-modal_3");
let main_task_modal_btn_3 = document.querySelector("#main-task-modal_3 .modal-button"); // Unique button selector for the third modal

info_modal_btn.onclick = () => {
    hide_element(info_modal);
    show_element(stay_still_modal);
};

stay_still_modal_btn.onclick = () => {
    hide_element(stay_still_modal);
    show_element(camera_model);
};

camera_model_btn.onclick = () => {
    testCameraAccess();
    setTimeout(() => {}, 2000); // wait till camera video appears on page
    hide_element(camera_model);
    stopCameraFeed();
    show_element(face_check_modal);
    // button of face_check_modal calls 'startCalibration' function
};

console.log(`>>> user ID = ${userId}`);

//==================================================
// Function to show the research info modal and the notice
function showResearchInfoModal() {
  document.getElementById("notice").style.display = "block"; // Show the notice
  document.getElementById("research-info-modal").style.display = "block"; // Show the modal
}

// Hide the notice and show the next modal when clicking "Next"
document.getElementById("research-info-modal-button").addEventListener("click", function() {
  document.getElementById("notice").style.display = "none"; // Hide the notice
  document.getElementById("research-info-modal").style.display = "none"; // Hide the current modal
  document.getElementById("stay-still-modal").style.display = "block"; // Show the next modal
});

// Call the function to show the first modal ( trigger this when the page loads)
showResearchInfoModal();
//==================================================

// sleep function <http://stackoverflow.com/q/951021>
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// show or hide HTML elements
function show_element(element) {
    if (element) {
        element.style.display = 'block';
    }
}

function hide_element(element) {
    if (element) {
        element.style.display = 'none';
    }
}

// request camera access
function testCameraAccess() {
    console.log("Requesting camera access...");
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            const videoElement = document.getElementById('camera-feed');
            videoElement.srcObject = stream;
            videoElement.play();
            document.getElementById('camera-allow-btn').disabled = true;
        })
        .catch((error) => {
            console.error('Camera access denied', error);
            alert('Camera access is required for this study.');
        });
}

function retryCamera() {
    hide_element(face_check_modal);
    document.getElementById('camera-allow-btn').disabled = false;
    show_element(camera_model);
}

/*
 * stop the camera feed
 */
function stopCameraFeed() {
    const videoElement = document.getElementById('camera-feed');
    if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop()); // stop each track
        videoElement.srcObject = null;        // disconnect the stream from the video element
    }

    console.log('Camera stopped.');
}

//=== USER ID ===
async function getIP() {
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        return data.ip
    } catch (error) {
        console.error("Error fetching IP address:", error);
        return undefined;
    }
}

// function to generate a unique user ID
function generateUniqueUserId() {
    // current timestamp
    const timestamp = Date.now();

    // random number between 0 and 9999
    const randomNum = Math.floor(Math.random() * 10000);

    // combine timestamp and random number to create a unique ID
    const uniqueId = `user-${timestamp}-${randomNum.toString().padStart(4, '0')}`;

    return uniqueId;
}

//=== WEBGAZER ===========================

// WebGazer listener
function WebGazerListener(data, elapsedTime, checkEyePosition) {
    if (data) {
        const xprediction = data.x;
        const yprediction = data.y;
        const timestamp_ms = Date.now();

        // verify the correct eye position
        if (checkEyePosition) {
            const timeSinceLastGaze = timestamp_ms - lastEyeCheckTime_ms;
            if (timeSinceLastGaze >= eyeCheckDelay_ms) {
                lastEyeCheckTime_ms = timestamp_ms;
                const videoElement = document.getElementById('webgazerVideoFeed');
                const checkEyes = checkEyesInValidationBox(videoElement, data.eyeFeatures);
                console.log(`checkEyesInValidationBox = ${checkEyes}`);
                updateValidationBoxColor(checkEyes);
                if (checkEyes === 1) {
                    if (!isEyePositionCorrect) {
                        isEyePositionCorrect = true;
                        setTimeout(() => {
                            if (isEyePositionCorrect) {
                                webgazer.showVideo(false);
                                webgazer.showFaceFeedbackBox(false);
                            }
                        }, 1000); // Hide video after 1 second of correct position
                    }
                } else {
                    isEyePositionCorrect = false;
                    webgazer.showVideo(true);
                    webgazer.showFaceFeedbackBox(true);
                    if (checkEyes === -1) {
                        showAlert('Please keep your head in front of your webcam.');
                    }
                }
            }
        }

        // calculate the saccade amplitude if there's previous gaze data
        let saccadeAmplitude = 0;
        if (previousGaze) {
            const distance = Math.sqrt(Math.pow(xprediction - previousGaze.x, 2)
                + Math.pow(yprediction - previousGaze.y, 2));
            saccadeAmplitude = distance / window.innerWidth * 100; // percentage relative to screen width

            if (distance < 20) { // threshold for fixation detection
                if (fixationData.length > 0) {
                    const lastFixation = fixationData[fixationData.length - 1];
                    lastFixation.fixation_ends_at_ms = timestamp_ms;
                    lastFixation.fixation_duration_ms = timestamp_ms - lastFixation.fixation_starts_at_ms;
                } else {
                    fixationData.push({
                        fixation_point_x: xprediction,
                        fixation_point_y: yprediction,
                        fixation_starts_at_ms: timestamp_ms,
                        fixation_ends_at_ms: null,
                        fixation_duration_ms: null
                    });
                }
            }
        }

        // store eye tracking and saccade data
        eyeTrackingData.push({
            gaze_x_percent: (xprediction / window.innerWidth) * 100,
            gaze_y_percent: (yprediction / window.innerHeight) * 100,
            gaze_timestamp_ms: timestamp_ms,
            saccade_amplitude_percent: saccadeAmplitude
        });

        previousGaze = { x: xprediction, y: yprediction };
    }
}

function updateValidationBoxColor(checkEyes) {
    const faceFeedbackBox = document.querySelector('.faceFeedbackBox');
    if (faceFeedbackBox) {
        switch(checkEyes) {
            case 1:
                faceFeedbackBox.style.border = '2px solid green';
                break;
            case -1:
                faceFeedbackBox.style.border = '2px solid red';
                break;
            default:
                faceFeedbackBox.style.border = '2px solid black';
        }
    }
}

function showAlert(message) {
    const alertDiv = document.getElementById('eyeTrackingAlert') || createAlertDiv();
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
    setTimeout(() => { alertDiv.style.display = 'none'; }, 3000); // Hide after 3 seconds
}

function createAlertDiv() {
    const div = document.createElement('div');
    div.id = 'eyeTrackingAlert';
    div.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background-color: #ffcccc; padding: 10px; border-radius: 5px; z-index: 9999;';
    document.body.appendChild(div);
    return div;
}


function initWebGazer() {
    // initialize WebGazer and start eye tracking
    console.log('Initializing WebGazer...');
    // ensure WebGazer is properly configured
    webgazer.params.showVideo = true; // or true, depending on your needs
    webgazer.params.showFaceOverlay = false; // hide the face overlay
    webgazer.params.showFaceFeedbackBox = true; // hide the face feedback box
    webgazer.params.saveDataAcrossSessions = false;
    webgazer.setRegression('ridge'); // currently must set regression and tracker
    webgazer.showVideoPreview(true) // shows all video previews
      .showPredictionPoints(true) // shows a square every 100 milliseconds where current prediction is
      .applyKalmanFilter(true); // Kalman filter

    let previewWidth = webgazer.params.videoViewerWidth;
    let previewHeight = webgazer.params.videoViewerHeight;

    lastEyeCheckTime_ms = Date.now();
    const eyeCheckDelay_ms = 500; // time interval to check the eye position

    // set WebGazer listener to acquire the data
    webgazer.setGazeListener(function (data, elapsedTime)
                             { WebGazerListener(data, elapsedTime, false); });

    // start WebGazer
    webgazer.begin();
    // start calibration process
    showCalibrationInitMessage();
}

// Check eyes in the validation box using WebGazer's built-in logic
function checkEyesInValidationBox(videoElement, eyeFeatures) {
    if (eyeFeatures && videoElement) {
        var w = videoElement.videoWidth;
        var h = videoElement.videoHeight;

        // find the size of the box.
        // pick the smaller of the two video preview sizes
        var smaller = Math.min(w, h);
        var boxSize = smaller * webgazer.params.faceFeedbackBoxRatio;

        // set the boundaries of the face overlay validation box based on the preview
        var topBound = (h - boxSize) / 2;
        var leftBound = (w - boxSize) / 2;
        var rightBound = leftBound + boxSize;
        var bottomBound = topBound + boxSize;

        //get the x and y positions of the left and right eyes
        var eyeLX = eyeFeatures.left.imagex;
        var eyeLY = eyeFeatures.left.imagey;
        var eyeRX = eyeFeatures.right.imagex;
        var eyeRY = eyeFeatures.right.imagey;

        var xPositions = false;
        var yPositions = false;

         // check if the x values for the left and right eye are within the validation box
        // add the width when comparing against the rightBound (which is the left edge on the preview)
        if (eyeLX > leftBound && eyeLX + eyeFeatures.left.width < rightBound) {
            if (eyeRX > leftBound && eyeRX + eyeFeatures.right.width < rightBound) {
                xPositions = true;
            }
        }

        // check if the y values for the left and right eye are within the validation box
        if (eyeLY > topBound && eyeLY + eyeFeatures.left.height < bottomBound) {
            if (eyeRY > topBound && eyeRY + eyeFeatures.right.height < bottomBound) {
                yPositions = true;
            }
        }


        // if the x and y values for both the left and right eye are within
        // the validation box then the box border turns green, otherwise if
        // the eyes are outside of the box the colour is red
        if (xPositions && yPositions){
			console.log(xPositions && yPositions); // Log the result to console
            return 1; // Inside the box, green border
        } else {
            return -1;// Outside the box, red border
        }
    } else
        return 0;// Return  black border if no valid eyeFeatures or videoElement
}

function collectResults(eyeTrackingData, fixationData, surveyAnswer) {
    // function to collect all results
    let eye_tracking_data = [];
    eyeTrackingData.forEach((data, index) => {
        eye_tracking_data.push({'index': index,
            'x': data.gaze_x_percent, 'y': data.gaze_y_percent,
            'timestamp_ms': data.gaze_timestamp_ms,
            'saccade_amplitude_percent': data.saccade_amplitude_percent});
    });

    let fixation_data = [];
    fixationData.forEach((data, index) => {
        fixation_data.push({'index': index,
            'fixation_point_x': data.fixation_point_x,
            'fixation_point_y': data.fixation_point_y,
            'fixation_duration_ms': data.fixation_duration_ms,
            'fixation_end_at_ms': data.fixation_ends_at_ms});
    });

    let results = {'calibration_accuracy': calibrationAccuracy ,'user_id': userId,'eye_tracking_data': eye_tracking_data,
        'fixation_data': fixation_data,
        'survey_answer': surveyAnswer};
    return results;
}

function resetWebGazerData() {
    eyeTrackingData = []; // array to store eye tracking data
    fixationData = []; // array to store fixation data
}
//========================================

//=== CALIBRATION ===

// show the calibration initial instructions
function showCalibrationInitMessage() {
    const modal_ = document.getElementById("calibration-init-message");
    let modal_btn = modal_.querySelector('button');

    modal_btn.onclick = () => {
        hide_element(modal_);
        loadCalibrationCanvas();
    };

    show_element(modal_);
}

function startCalibration() {
    console.log('Starting calibration...');
    hide_element(document.getElementById('notice'));
    hide_element(face_check_modal);
    console.log('initialize WebGazer...');
    initWebGazer(); // initialize WebGazer
}

/*
 * load this function when the calibration starts.
 * This function listens for button clicks on the html page
 * checks that all buttons have been clicked 5 times each,
 * and then goes on to measuring the precision
*/
function loadCalibrationCanvas() {
    console.log("Loading calibration canvas...");
    showCalibrationCanvas();

    // click event on the calibration buttons
    document.querySelectorAll('.calibration-point').forEach((button) => {
        button.addEventListener('click', () => {
            calPointClick(button);
        });
    });
}
function calPointClick(calib_node) {
    const node_id = calib_node.id;

    // Initialize the calibration points if not done
    if (!CalibrationPoints[node_id]) {
        CalibrationPoints[node_id] = 0;
    }

    CalibrationPoints[node_id]++; // Increment the click count

    // Change color and disable button after 5 clicks
    if (CalibrationPoints[node_id] === 5) {
        calib_node.style.setProperty('background-color', 'yellow');
        calib_node.setAttribute('disabled', 'disabled');
        PointCalibrate++;
    } else if (CalibrationPoints[node_id] < 5) {
        // Gradually increase the opacity of calibration points on click
        const opacity = 0.2 * CalibrationPoints[node_id] + 0.2;
        calib_node.style.setProperty('opacity', opacity);
    }

    // Show the middle calibration point after all other points have been clicked
    if (PointCalibrate === 8) {
        document.getElementById('Pt5').style.setProperty('display', 'block');
    }

    if (PointCalibrate >= 9) { // Last point is calibrated
        // Hide all elements in calibration class except the middle point
        document.querySelectorAll('.calibration-point').forEach((button) => {
            button.style.setProperty('display', 'none');
        });

        // Clear the canvas
        const canvas = document.getElementById("plotting_canvas");
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        // Show the middle point again for the final focus
        document.getElementById('Pt5').style.setProperty('display', 'block');
        
        // Hide WebGazer red dot
        webgazer.showPredictionPoints(false);

        // Delay showing the modal notification for the measurement process by 1 second
        setTimeout(() => {
            let calibration_accuracy_elm = document.getElementById("calibration-accuracy");
            calibration_accuracy_elm.querySelector('button').onclick = () => {
                // Calculate accuracy
                hide_element(calibration_accuracy_elm);
                webgazer.showPredictionPoints(true);
                calcAccuracy();
            };

            show_element(calibration_accuracy_elm);
        }, 500); // 500 milliseconds = 0.5 second
    }
}

function calibrationAccuracyModal(accuracy) {
    // main div element
    const modal = document.createElement('div');
    modal.id = 'calibration-low-accuracy';
    modal.className = 'modal';

    // modal-content div
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // paragraph element
    const paragraph = document.createElement('p');
    paragraph.textContent = `Measurement accuracy is ${accuracy}%.`;

     // button
    const button = document.createElement('button');
    button.className = 'modal-button';

    const isAccuracySufficient = accuracy > sufficientMeasurementAccuracy;
    if (!isAccuracySufficient) {
        paragraph.textContent += " Low accuracy detected!";
        button.textContent = 'Recalibrate';
    } else {
        button.textContent = 'Continue';
    };

    // append elements to build the structure
    modalContent.appendChild(paragraph);
    modalContent.appendChild(button);
    modal.appendChild(modalContent);
    modal.style.display = 'none';

    // add the modal to the body of the document
    return [modal, isAccuracySufficient];
}

function calcAccuracy() {
    // start storing the WebGazer prediction points for 5 seconds
    webgazer.params.storingPoints = true;

    sleep(5000).then(() => {
        // stop storing the prediction points
        webgazer.params.storingPoints = false;
        webgazer.pause();

        clearCanvas();
        webgazer.showPredictionPoints(false); // hide WebGazer points

        var past50 = webgazer.getStoredPoints(); // retrieve the stored points
        var precision_measurement = calculatePrecision(past50);
		calibrationAccuracy = precision_measurement;  // <-- Store the accuracy here
        let [accuracy_precision_modal, isAccuracySufficient] =
            calibrationAccuracyModal(precision_measurement);

        console.log(`Measurement accuracy = ${precision_measurement}, isAccuracySufficient = ${isAccuracySufficient}`);

        document.body.appendChild(accuracy_precision_modal);

        // check if accuracy is acceptable
        if (!isAccuracySufficient) {
            accuracy_precision_modal.querySelector('button').onclick = () => {
                hide_element(accuracy_precision_modal);
                console.log(`Recalibrate due to low accuracy (${precision_measurement}%)...`);
                // redo calibration
                recalibrate();
            };
        } else {
            accuracy_precision_modal.querySelector('button').onclick = () => {
                hide_element(accuracy_precision_modal);
                // clear the calibration & hide the last middle button
                endCalibration();
            };
        };

        show_element(accuracy_precision_modal);
    });
}


// show calibration points
function showCalibrationCanvas() {
    let calibration_elm = document.getElementById("calibration-container");
    show_element(calibration_elm);

    document.querySelectorAll('.calibration-point').forEach((button) => {
        button.style.setProperty('background-color', 'red');
        button.style.setProperty('opacity', '0.2');
        button.style.display = 'block';
    });

    // initially hides the middle button
    document.getElementById('Pt5').style.setProperty('display', 'none');
}

/*
 * This function clears the calibration buttons memory
 */
function clearCalibration() {
  // clear data from WebGazer

  document.querySelectorAll('.calibration-point').forEach((button) => {
    button.style.setProperty('background-color', 'red');
    button.style.setProperty('opacity', '0.2');
    button.removeAttribute('disabled');
  });

  CalibrationPoints = {};
  PointCalibrate = 0;
}

/*
 * Clear the canvas and hide calibration points after calibration.
 */
function clearCanvas() {
    // hide all calibration points
    document.querySelectorAll('.calibration-point').forEach((button) => {
        button.style.display = 'none'; // ensure calibration points are hidden
    });

    // clear the canvas
    var canvas = document.getElementById("plotting_canvas");
    if (canvas) {
        var context = canvas.getContext('2d');  // get the canvas 2D context
        context.clearRect(0, 0, canvas.width, canvas.height);  // clear the canvas
        context.fillStyle = "white";  // set fill style to white
        context.fillRect(0, 0, canvas.width, canvas.height);  // fill the canvas with white
    }
}

function recalibrate() {
    // clear stored data in WebGazer
    webgazer.clearData();  // Clear all stored gaze data
    clearCalibration();
    clearCanvas();

    // reset WebGazer configuration to ensure it can start again correctly
    webgazer.resume();  // Ensure WebGazer is running and ready to collect data again
    webgazer.params.storingPoints = false;  // Disable storing points until calibration starts

    // call the function to show the calibration canvas
    showCalibrationCanvas();
}

/*
 * This function calculates a measurement for how precise
 * the eye tracker currently is which is displayed to the user
 */
function calculatePrecision(past50Array) {
    var windowHeight = window.innerHeight;
    var windowWidth = window.innerWidth;

    // retrieve the last 50 gaze prediction points
    var x50 = past50Array[0];
    var y50 = past50Array[1];

    // calculate the position of the point the user is staring at
    var staringPointX = windowWidth / 2;
    var staringPointY = windowHeight / 2;

    var precisionPercentages = new Array(50);
    calculatePrecisionPercentages(precisionPercentages, windowHeight,
                                  x50, y50, staringPointX, staringPointY);

    // calculate average
    var precision = 0;
    for (x = 0; x < 50; x++) {
        precision += precisionPercentages[x];
    }

    precision = precision / 50;

    // return the precision measurement as a rounded percentage
    return Math.round(precision);
}

/*
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 */
function calculatePrecisionPercentages(precisionPercentages, windowHeight,
                                       x50, y50, staringPointX, staringPointY) {
    for (x = 0; x < 50; x++) {
        // calculate distance between each prediction and staring point
        var xDiff = staringPointX - x50[x];
        var yDiff = staringPointY - y50[x];
        var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

        // calculate precision percentage
        var halfWindowHeight = windowHeight / 2;
        var precision = 0;
        if (distance <= halfWindowHeight && distance > -1) {
            precision = 100 - (distance / halfWindowHeight * 100);
        } else if (distance > halfWindowHeight) {
            precision = 0;
        } else if (distance > -1) {
            precision = 100;
        }

        // store the precision
        precisionPercentages[x] = precision;
    }
}

function endCalibration() {
    console.log('Stopping Calibration...');
    webgazer.pause(); // pause WebGazer

    // hide calibration Points and Clear Canvas
    clearCalibrationCanvas();

    // hide WebGazer dot
    webgazer.showPredictionPoints(false); // hide WebGazer points

    // show the training modal
    showTrainingModal();
}

/*
 * clear the canvas and hide calibration points after calibration.
 */
function clearCalibrationCanvas() {
    // hide all calibration points
    document.querySelectorAll('.calibration-point').forEach((button) => {
        button.style.display = 'none'; // ensure calibration points are hidden
    });

    // clear the canvas
    var canvas = document.getElementById("plotting_canvas");
    var context = canvas.getContext('2d');  // get the canvas 2D context
    context.clearRect(0, 0, canvas.width, canvas.height);  // clear the canvas
    context.fillStyle = "white";  // set fill style to white
    context.fillRect(0, 0, canvas.width, canvas.height);  // fill the canvas with white

    document.getElementById('calibration-container').style.display = 'none';
}

//=== TRAINING MODAL ===

// function to show the Training Task 1 Modal
function showTrainingModal() {
    console.log("Show training modal...");
	
    // ensure WebGazer video and overlays are turned off
    webgazer.showVideo(false);
    webgazer.showFaceOverlay(false);
    webgazer.showFaceFeedbackBox(false);

    // show the training task modal
    show_element(train_task_modal);
	
    webgazer.setGazeListener(function(data, elapsedTime) {
        WebGazerListener(data, elapsedTime, true);
    });
    // add click event for the button inside train_task_modal
    if (train_task_modal_btn) {
        train_task_modal_btn.onclick = function() {
            hide_element(train_task_modal);
            // display the eye-tracking message modal
            show_element(eye_tracking_msg_modal);
            // add click event for the button inside eye_tracking_msg_modal
            const eye_tracking_msg_modal_btn = document.getElementById('eye-tracking-message-btn');
            if (eye_tracking_msg_modal_btn) {
                eye_tracking_msg_modal_btn.onclick = function() {
                    hide_element(eye_tracking_msg_modal);
                    // training task
                    const figure_id = "map_0";
                    const delay_ms = 7000;
                    const survey_modal_id = "survey-modal-0";
                    const next_task = showMainModal;

                    showTask(figure_id, survey_modal_id, delay_ms, next_task);
                };
            };
        };
    }
}


// function to show the Training Task 2 Modal
function showTrainingModal_2() {
    console.log("Show training modal 2...");
	
    // ensure WebGazer video and overlays are turned off
    webgazer.showVideo(false);
    webgazer.showFaceOverlay(false);
    webgazer.showFaceFeedbackBox(false);

    // show the training task modal
    show_element(train_task_modal_2);
	
    webgazer.setGazeListener(function(data, elapsedTime) {
        WebGazerListener(data, elapsedTime, true);
    });
    
    // add click event for the button inside train_task_modal_2
    if (train_task_modal_btn_2) {
        train_task_modal_btn_2.onclick = function() {
            hide_element(train_task_modal_2);
            // display the eye-tracking message modal
            show_element(eye_tracking_msg_modal_2);
            // add click event for the button inside eye_tracking_msg_modal_2
            const eye_tracking_msg_modal_btn_2 = document.getElementById('eye-tracking-message-btn_2');
            if (eye_tracking_msg_modal_btn_2) {
                eye_tracking_msg_modal_btn_2.onclick = function() {
                    hide_element(eye_tracking_msg_modal_2);
                    // training task_2
                    const figure_id =  "map2_0";
                    const delay_ms = 7000;
                    const survey_modal_id = "survey-modal2-0";
                    const next_task = showMainModal_2;
                    showTask(figure_id, survey_modal_id, delay_ms, next_task);
                };
            };
        };
    }
}



// function to show the Training Task 3 Modal
function showTrainingModal_3() {
    console.log("Show training modal 3...");
	
    // ensure WebGazer video and overlays are turned off
    webgazer.showVideo(false);
    webgazer.showFaceOverlay(false);
    webgazer.showFaceFeedbackBox(false);

    // show the training task modal
    show_element(train_task_modal_3);
	
    webgazer.setGazeListener(function(data, elapsedTime) {
        WebGazerListener(data, elapsedTime, true);
    });
    
    // add click event for the button inside train_task_modal_2
    if (train_task_modal_btn_3) {
        train_task_modal_btn_3.onclick = function() {
            hide_element(train_task_modal_3);
            // display the eye-tracking message modal
            show_element(eye_tracking_msg_modal_3);
            // add click event for the button inside eye_tracking_msg_modal_3
            const eye_tracking_msg_modal_btn_3 = document.getElementById('eye-tracking-message-btn_3');
            if (eye_tracking_msg_modal_btn_3) {
                eye_tracking_msg_modal_btn_3.onclick = function() {
                    hide_element(eye_tracking_msg_modal_3);
                    // training task_3
                    const figure_id =  "map3_0";
                    const delay_ms = 7000;
                    const survey_modal_id = "survey-modal3-0";
                    const next_task = showMainModal_3;

                    showTask(figure_id, survey_modal_id, delay_ms, next_task);
                };
            };
        };
    }
}



//=== Main MODAL ===

// Function to show the main modal
function showMainModal() {
    console.log('Showing main modal...');
	
    // Get the main task modal element
    let main_task_modal = document.getElementById("main-task-modal");
    if (main_task_modal) {
        show_element(main_task_modal);
    } else {
        console.error("Main task modal element not found");
        return; // Exit if modal is not found
    }
	 webgazer.setGazeListener(function(data, elapsedTime) {
        WebGazerListener(data, elapsedTime, true);
    });
    // Ensure webgazer video and overlays are turned off
    webgazer.params.showVideo = false;
    webgazer.params.showFaceOverlay = false;
    webgazer.params.showFaceFeedbackBox = false;
	
	
   
    // Show the main Task modal
    show_element(main_task_modal);

    // Get the button inside the main task modal
    const main_task_modal_btn = document.getElementById('main_task_modal_btn');
    if (main_task_modal_btn) {
        main_task_modal_btn.onclick = function() {
            hide_element(main_task_modal);
            show_element(document.getElementById('map_1')); 
            
            // Main task setup
            const figure_id = "map_1";
            const delay_ms = 7000;
            const survey_modal_id = "survey-modal-1";
            const next_task = task_2;

            // Start the task
            showTask(figure_id, survey_modal_id, delay_ms, next_task);
        };
    } else {
        console.error("Main task modal button not found");
    }
}

// Function to show the main modal for the second set of tasks
function showMainModal_2() {
    console.log('Showing main modal 2...');
	
    // Get the main task modal element for the second task set
    let main_task_modal_2 = document.getElementById("main-task-modal_2");
    if (main_task_modal_2) {
        show_element(main_task_modal_2);
    } else {
        console.error("Main task modal 2 element not found");
        return; // Exit if modal is not found
    }
	
    webgazer.setGazeListener(function(data, elapsedTime) {
        WebGazerListener(data, elapsedTime, true);
    });

    // Ensure webgazer video and overlays are turned off
    webgazer.params.showVideo = false;
    webgazer.params.showFaceOverlay = false;
    webgazer.params.showFaceFeedbackBox = false;

    // Get the button inside the main task modal 2
    const main_task_modal_btn_2 = document.getElementById('main_task_modal_btn_2');
    if (main_task_modal_btn_2) {
        main_task_modal_btn_2.onclick = function() {
            hide_element(main_task_modal_2);
            show_element(document.getElementById('map2_1')); 
            
            // Main task setup
            const figure_id = "map2_1";
            const delay_ms = 7000;
            const survey_modal_id = "survey-modal2-1";
            const next_task = task2_2;

            // Start the task
            showTask(figure_id, survey_modal_id, delay_ms, next_task);
        };
    } else {
        console.error("Main task modal button 2 not found");
    }
}

 
// Function to show the main modal for the third set of tasks
function showMainModal_3() {
    console.log('Showing main modal 3...');
	
    // Get the main task modal element for the third task set
    let main_task_modal_3 = document.getElementById("main-task-modal_3");
    if (main_task_modal_3) {
        show_element(main_task_modal_3);
    } else {
        console.error("Main task modal 3 element not found");
        return; // Exit if modal is not found
    }
	
    webgazer.setGazeListener(function(data, elapsedTime) {
        WebGazerListener(data, elapsedTime, true);
    });

    // Ensure webgazer video and overlays are turned off
    webgazer.params.showVideo = false;
    webgazer.params.showFaceOverlay = false;
    webgazer.params.showFaceFeedbackBox = false;

    // Get the button inside the main task modal 3
    const main_task_modal_btn_3 = document.getElementById('main_task_modal_btn_3');
    if (main_task_modal_btn_3) {
        main_task_modal_btn_3.onclick = function() {
            hide_element(main_task_modal_3);
            show_element(document.getElementById('map3_1')); 
            
            // Main task setup
            const figure_id = "map3_1";
            const delay_ms = 7000;
            const survey_modal_id = "survey-modal3-1";
            const next_task = task3_2;

            // Start the task
            showTask(figure_id, survey_modal_id, delay_ms, next_task);
        };
    } else {
        console.error("Main task modal button 3 not found");
    }
}
 
/// generic task
function showTask(figure_id, survey_modal_id, delay_ms, next_task) {
    console.log('Begin showTask...');
    
    const survey_modal = document.getElementById(survey_modal_id);
	console.log(`Trying to display element with ID: ${figure_id}`);

    // connect buttons of the survey modal to `submitAnswer` function
    const modalButtons = survey_modal.querySelectorAll('.modal-button');
    modalButtons.forEach(button => {
        // Avoid adding multiple event listeners by first removing any existing one
        button.removeEventListener('click', handleButtonClick);
        button.addEventListener('click', handleButtonClick);
    });

    function handleButtonClick(event) {
        const button = event.target;
        surveyAnswer = button.id;
        hide_element(survey_modal);
        // Submit survey answer
        console.log(`Selected Answer for '${survey_modal_id}': ${surveyAnswer}`);
        
        // Collect the data
        let results = {};
        results[survey_modal_id] = collectResults( eyeTrackingData, fixationData, surveyAnswer);

        // Submit results to the web app
        submitResultsToCloud(results);
        resetWebGazerData(); // Reset eye tracking data for next task

        // Perform the next task
        next_task();
    }

    // Show the map and initialize eye tracking
    show_element(document.getElementById(figure_id));
    console.log(`Display figure ${figure_id}`);
    
    // Start WebGazer to collect data
    webgazer.resume();

    // Stop eye tracking after the delay
    setTimeout(() => {
        console.log('Pause eye tracking...');
        webgazer.pause(); // Pause WebGazer

        // Hide the figure
        hide_element(document.getElementById(figure_id));

        // Display the survey
        console.log(`Show ${survey_modal_id}...`);
        show_element(survey_modal);

        // Next task will be performed when a survey button is pressed
    }, delay_ms);

    console.log('End of showTask...');
}

//========== MAIN TASK DEFINITIONS ==========
 // Task 1  
function task_1() {
    console.log("Begin Task 1");
    const figure_id = "map_1";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal-1";
    const next_task = task_2;

    showTask(figure_id, survey_modal_id, delay_ms, next_task);
}

function task_2() {
    console.log("Begin Task 2");
    const figure_id = "map_2";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal-2";
    const next_task = task_3;

    showTask(figure_id, survey_modal_id, delay_ms, next_task);
}

function task_3() {
    console.log("Begin Task 3");
    const figure_id = "map_3";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal-3";
    const next_task = task_4;

    showTask(figure_id, survey_modal_id, delay_ms, next_task); 
}


function task_4() {
    console.log("Begin Task 4");
    const figure_id = "map_4";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal-4";
    // Show Task 2-4 and after the survey is submitted, start the training task for task2_1
    showTask(figure_id, survey_modal_id, delay_ms, function() {
        // Show training task modal before starting task 2-1
        showTrainingModal_2(task2_1);
    });
}
 // Task 2 
function task2_1() {
    console.log("Begin Task2_1");
    const figure_id = "map2_1";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal2-1";
    const next_task = task2_2;

    showTask(figure_id, survey_modal_id, delay_ms, next_task);
}

function task2_2() {
    console.log("Begin Task 2_2");
    const figure_id = "map2_2";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal2-2";
    const next_task = task2_3;

    showTask(figure_id, survey_modal_id, delay_ms, next_task);
}

function task2_3() {
    console.log("Begin Task 2_3");
    const figure_id = "map2_3";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal2-3";
    const next_task = task2_4;

    showTask(figure_id, survey_modal_id, delay_ms, next_task); 
}
// Task 2-4 function
function task2_4() {
    console.log("Begin Task2_4");
    const figure_id = "map2_4";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal2-4";

    // Show Task 2-4 and after the survey is submitted, start the training task for task3_1
    showTask(figure_id, survey_modal_id, delay_ms, function() {
        // Show training task modal before starting task 3-1
        showTrainingModal_3(task3_1);
    });
}

 // Task 3 
function task3_1() {
    console.log("Begin Task3_1");
    const figure_id = "map3_1";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal3-1";
    const next_task = task3_2;

    showTask(figure_id, survey_modal_id, delay_ms, next_task);
}

function task3_2() {
    console.log("Begin Task3_2");
    const figure_id = "map3_2";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal3-2";
    const next_task = task3_3;

    showTask(figure_id, survey_modal_id, delay_ms, next_task);
}

function task3_3() {
    console.log("Begin Task3_3");
    const figure_id = "map3_3";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal3-3";
    const next_task = task3_4;

    showTask(figure_id, survey_modal_id, delay_ms, next_task); 
}
function task3_4() {
    console.log("Begin Task3_4");
    const figure_id = "map3_4";
    const delay_ms = 7000;
    const survey_modal_id = "survey-modal3-4";
    const next_task = showUserInfoModal;

    showTask(figure_id, survey_modal_id, delay_ms, next_task); 
}

//========================================


function showUserInfoModal() {
	console.log("Showing user info modal");
    show_element(document.getElementById('user-info-modal'));
}

function submitUserInfo() {
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
	const geographyBackground = document.querySelector('input[name="cartography"]:checked').value;

    if (age && gender) {
        console.log('User Information:', `Age: ${age}, Gender: ${gender}, Cartography Background: ${geographyBackground}`);

        // add user information to results
        const userInfo = {'age': age, 'gender': gender ,'geographyBackground': geographyBackground};
        let results = {'user_info': userInfo};

        // save the results including user information only if not already saved
        // results['full_results'] = collectResults(eyeTrackingData, fixationData);

        // submit results to the web app
        // submitResultsToCloud(results);

        // close the user info modal and show thanks message
        hide_element(document.getElementById('user-info-modal'));
        // display a thank you message
        show_element(document.getElementById('final-message'));
        console.log("Finished all surveys.");
    } else {
        alert('Please fill out all fields.');
    }
}
function closeUserInfo() {
    // close the user info modal and show thanks message
    hide_element(document.getElementById('user-info-modal'));
    // display a thank you message
    show_element(document.getElementById('final-message'));
    console.log("Survey finished");
}

// function to close the thank you message
function closeFinalMessage() {
    const modal = document.getElementById("final-message");
    modal.style.display = "none";
}
//========================================

function submitResultsToCloud(results) {
    // submit results to the cloud (Google Apps Script)
    console.log("Submitting the data to cloud");
    const textData = JSON.stringify(results);
    console.log(`Text data:\n"""\n${textData}\n"""`);

    // saveJSONFile(textData); // DEBUG

    const google_script_url = "https://script.google.com/macros/s/AKfycbwSrj7VdOMdmuexJXcvebx8QKIqTfKIAtDmo_R0m1fEKSaNzXAWo3y4ru4I248D0esw/exec";

    fetch(google_script_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',  // no-cors mode
        body: textData,  // Assuming textData is already a JSON string
    })
    .then(() => {
        console.log('Data successfully sent to the cloud');  // Since no response is available, just log a success message
    })
    .catch(error => {
        console.error('Error sending data to the cloud:', error);
    });
}
function saveJSONFile(data_str) {
   let bl = new Blob([data_str], {
      type: "application/json"  // Correct MIME type for JSON file
   });

   let a = document.createElement("a");
   a.href = URL.createObjectURL(bl);
   a.download = "data.json";  // Correct file extension
   a.hidden = true;
   document.body.appendChild(a);
   a.click();  // Automatically triggers the download
}
