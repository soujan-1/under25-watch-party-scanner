/*
=========================================================
 UNDER25 WATCH PARTY
 QR TICKET ENTRY SCANNER
=========================================================
*/


/*
=========================================================
 APPS SCRIPT WEB APP URL
=========================================================

 IMPORTANT:

 Put ONLY your Apps Script /exec URL here.

 Example:

 https://script.google.com/macros/s/XXXXXXXX/exec

 DO NOT add:

 ?action=checkTicket
 ?ticket=U25-WP-0001

 The code below adds those automatically.
=========================================================
*/

const API_URL =
  "https://script.google.com/macros/s/AKfycbxUX942IUATzLM8xjRuudQPouiZHNfPeM2PG-x0VnwR92J7CcXICUZ32rYMxlauQAM/exec";


/*
=========================================================
 GLOBAL VARIABLES
=========================================================
*/

let videoStream = null;

let scanning = false;

let scanInterval = null;

let currentTicket = null;

let lastScannedTicket = null;

let lastScanTime = 0;


/*
=========================================================
 DOM ELEMENTS
=========================================================
*/

const video =
  document.getElementById("camera");

const startCameraButton =
  document.getElementById("startCamera");

const stopCameraButton =
  document.getElementById("stopCamera");

const cameraMessage =
  document.getElementById("cameraMessage");

const resultBox =
  document.getElementById("result");

const volunteerSection =
  document.getElementById("volunteerSection");

const volunteerInput =
  document.getElementById("volunteer");

const markUsedButton =
  document.getElementById("markUsed");

const manualTicketInput =
  document.getElementById("manualTicket");

const manualCheckButton =
  document.getElementById("manualCheck");


/*
=========================================================
 RESULT DISPLAY
=========================================================
*/

function showResult(
  title,
  message,
  type = "info"
) {

  let icon = "🎟️";

  if (type === "valid") {
    icon = "✅";
  }

  if (type === "used") {
    icon = "⚠️";
  }

  if (type === "invalid") {
    icon = "❌";
  }

  if (type === "error") {
    icon = "🚨";
  }

  if (type === "loading") {
    icon = "⏳";
  }

  resultBox.className =
    "result " + type;

  resultBox.innerHTML = `
    <div class="result-icon">
      ${icon}
    </div>

    <h2>
      ${escapeHtml(title)}
    </h2>

    <p>
      ${escapeHtml(message)}
    </p>
  `;
}


/*
=========================================================
 HTML ESCAPE
=========================================================
*/

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/*
=========================================================
 CHECK API URL
=========================================================
*/

function validateApiUrl() {

  if (
    !API_URL ||
    API_URL.includes(
      "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE"
    )
  ) {

    showResult(
      "API URL Missing",
      "Add your Google Apps Script /exec URL inside app.js.",
      "error"
    );

    return false;
  }

  if (
    !API_URL.startsWith("https://")
  ) {

    showResult(
      "Invalid API URL",
      "The Apps Script URL must start with https://.",
      "error"
    );

    return false;
  }

  return true;
}


/*
=========================================================
 JSONP API REQUEST
=========================================================

 We use JSONP because Google Apps Script Web Apps can
 redirect and normal browser fetch requests can fail
 because of cross-origin restrictions.

=========================================================
*/

function apiRequest(
  action,
  parameters = {}
) {

  return new Promise(
    function(resolve, reject) {

      const callbackName =
        "under25Callback_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2);


      const script =
        document.createElement("script");


      const query =
        new URLSearchParams();


      query.set(
        "action",
        action
      );


      Object.keys(parameters)
        .forEach(function(key) {

          query.set(
            key,
            parameters[key]
          );

        });


      query.set(
        "callback",
        callbackName
      );


      const requestUrl =
        API_URL +
        "?" +
        query.toString();


      let completed = false;


      const cleanup =
        function() {

          clearTimeout(timeout);


          if (
            script.parentNode
          ) {

            script.parentNode
              .removeChild(script);

          }


          try {

            delete window[
              callbackName
            ];

          } catch (_) {

            window[
              callbackName
            ] = undefined;

          }

        };


      const timeout =
        setTimeout(
          function() {

            if (completed) {
              return;
            }

            completed = true;

            cleanup();

            reject(
              new Error(
                "The ticket system did not respond within 15 seconds."
              )
            );

          },
          15000
        );


      window[callbackName] =
        function(data) {

          if (completed) {
            return;
          }

          completed = true;

          cleanup();

          resolve(data);

        };


      script.onerror =
        function() {

          if (completed) {
            return;
          }

          completed = true;

          cleanup();

          reject(
            new Error(
              "Unable to connect to the ticket system."
            )
          );

        };


      script.src =
        requestUrl;


      document.body.appendChild(
        script
      );

    }
  );
}


/*
=========================================================
 CHECK TICKET
=========================================================
*/

async function checkTicket(
  ticketId
) {

  ticketId =
    ticketId
      .trim()
      .toUpperCase();


  if (!ticketId) {

    showResult(
      "Invalid Ticket ID",
      "No ticket ID was detected.",
      "invalid"
    );

    return;
  }


  showResult(
    "Checking Ticket",
    ticketId,
    "loading"
  );


  try {

    const response =
      await apiRequest(
        "checkTicket",
        {
          ticket: ticketId
        }
      );


    console.log(
      "CHECK RESPONSE:",
      response
    );


    if (
      response.status ===
      "VALID"
    ) {

      currentTicket =
        ticketId;


      showResult(
        "VALID TICKET",
        `${ticketId} — This ticket is valid and can be used.`,
        "valid"
      );


      volunteerSection.style.display =
        "block";


      volunteerInput.focus();


      return;
    }


    if (
      response.status ===
      "USED"
    ) {

      currentTicket =
        null;


      volunteerSection.style.display =
        "none";


      showResult(
        "ALREADY USED",
        `${ticketId} has already been used.`,
        "used"
      );


      return;
    }


    currentTicket =
      null;


    volunteerSection.style.display =
      "none";


    showResult(
      "INVALID TICKET",
      response.message ||
        "Ticket not found.",
      "invalid"
    );

  }

  catch (error) {

    console.error(
      "CHECK ERROR:",
      error
    );


    showResult(
      "CONNECTION ERROR",
      error.message,
      "error"
    );

  }
}


/*
=========================================================
 MARK TICKET USED
=========================================================
*/

async function markTicketUsed() {

  if (!currentTicket) {

    showResult(
      "No Ticket",
      "Scan a valid ticket first.",
      "invalid"
    );

    return;
  }


  const volunteer =
    volunteerInput.value.trim();


  if (!volunteer) {

    volunteerInput.focus();

    showResult(
      "Volunteer Name Required",
      "Enter the volunteer/checker name before confirming entry.",
      "invalid"
    );

    return;
  }


  markUsedButton.disabled =
    true;


  markUsedButton.innerText =
    "⏳ CONFIRMING...";


  try {

    const response =
      await apiRequest(
        "markUsed",
        {
          ticket:
            currentTicket,

          volunteer:
            volunteer
        }
      );


    console.log(
      "MARK RESPONSE:",
      response
    );


    if (
      response.status ===
      "SUCCESS"
    ) {

      showResult(
        "ENTRY CONFIRMED",
        `${currentTicket} has been marked as USED.`,
        "valid"
      );


      currentTicket =
        null;


      volunteerInput.value =
        "";


      volunteerSection.style.display =
        "none";


      return;
    }


    if (
      response.status ===
      "USED"
    ) {

      showResult(
        "ALREADY USED",
        "This ticket has already been scanned.",
        "used"
      );


      currentTicket =
        null;


      volunteerInput.value =
        "";


      volunteerSection.style.display =
        "none";


      return;
    }


    showResult(
      "Unable to Confirm",
      response.message ||
        "The ticket could not be marked as used.",
      "error"
    );

  }

  catch (error) {

    console.error(
      "MARK ERROR:",
      error
    );


    showResult(
      "CONNECTION ERROR",
      error.message,
      "error"
    );

  }

  finally {

    markUsedButton.disabled =
      false;

    markUsedButton.innerText =
      "✅ MARK ENTRY";

  }
}


/*
=========================================================
 CAMERA
=========================================================
*/

async function startCamera() {

  if (!validateApiUrl()) {
    return;
  }


  if (scanning) {

    return;
  }


  showResult(
    "Starting Camera",
    "Please allow camera access when your browser asks.",
    "loading"
  );


  cameraMessage.innerText =
    "Requesting camera permission...";


  startCameraButton.disabled =
    true;


  try {

    if (
      !window.isSecureContext
    ) {

      throw new Error(
        "Camera requires HTTPS. Open the Vercel HTTPS URL."
      );

    }


    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      throw new Error(
        "Camera access is not supported by this browser."
      );

    }


    /*
    -------------------------------------------------------
    REQUEST CAMERA
    -------------------------------------------------------
    */

    videoStream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {
            facingMode: {
              ideal: "environment"
            },

            width: {
              ideal: 1280
            },

            height: {
              ideal: 720
            }
          },

          audio: false

        });


    /*
    -------------------------------------------------------
    CONNECT CAMERA TO VIDEO
    -------------------------------------------------------
    */

    video.srcObject =
      videoStream;


    await video.play();


    scanning =
      true;


    cameraMessage.innerText =
      "Camera active — point it at the QR code.";


    startCameraButton.style.display =
      "none";


    stopCameraButton.style.display =
      "block";


    showResult(
      "Camera Ready",
      "Point the camera at the ticket QR code.",
      "info"
    );


    /*
    -------------------------------------------------------
    START QR DETECTION
    -------------------------------------------------------
    */

    startQRDetection();

  }

  catch (error) {

    console.error(
      "CAMERA ERROR:",
      error
    );


    startCameraButton.disabled =
      false;


    cameraMessage.innerText =
      "Camera could not be started.";


    let message =
      error.message ||
      "Unable to access the camera.";


    if (
      error.name ===
      "NotAllowedError"
    ) {

      message =
        "Camera permission was denied. Allow camera access for this Vercel site and reload the page.";

    }


    if (
      error.name ===
      "NotFoundError"
    ) {

      message =
        "No camera was found on this device.";

    }


    if (
      error.name ===
      "NotReadableError"
    ) {

      message =
        "The camera is being used by another application. Close other camera apps and try again.";

    }


    showResult(
      "CAMERA ERROR",
      message,
      "error"
    );

  }
}


/*
=========================================================
 STOP CAMERA
=========================================================
*/

function stopCamera() {

  scanning =
    false;


  if (scanInterval) {

    clearInterval(
      scanInterval
    );

    scanInterval =
      null;
  }


  if (videoStream) {

    videoStream
      .getTracks()
      .forEach(
        function(track) {

          track.stop();

        }
      );

    videoStream =
      null;
  }


  video.srcObject =
    null;


  cameraMessage.innerText =
    "Camera is stopped.";


  startCameraButton.style.display =
    "block";


  startCameraButton.disabled =
    false;


  stopCameraButton.style.display =
    "none";


  showResult(
    "Scanner Stopped",
    "Press START CAMERA to scan again.",
    "info"
  );
}


/*
=========================================================
 QR DETECTION
=========================================================

 Modern browsers can use BarcodeDetector directly.

 If unavailable, we show a clear message instead of
 leaving the user stuck at "Starting camera".

=========================================================
*/

function startQRDetection() {

  if (
    !("BarcodeDetector" in window)
  ) {

    cameraMessage.innerText =
      "Camera active. QR detection may not be supported by this browser.";

    showResult(
      "Camera Active",
      "Your browser does not support native QR detection. Use Chrome on Android or Safari on a supported iPhone.",
      "info"
    );

    return;
  }


  let detector;


  try {

    detector =
      new BarcodeDetector({
        formats: ["qr_code"]
      });

  }

  catch (error) {

    console.error(
      "BarcodeDetector error:",
      error
    );

    showResult(
      "QR Scanner Unsupported",
      "This browser cannot detect QR codes. Please use the latest Chrome or Safari.",
      "error"
    );

    return;
  }


  const canvas =
    document.createElement(
      "canvas"
    );

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true
      }
    );


  scanInterval =
    setInterval(
      async function() {

        if (
          !scanning ||
          video.readyState <
            2 ||
          video.videoWidth === 0
        ) {

          return;
        }


        try {

          canvas.width =
            video.videoWidth;

          canvas.height =
            video.videoHeight;


          context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
          );


          const codes =
            await detector.detect(
              canvas
            );


          if (
            !codes ||
            codes.length === 0
          ) {

            return;
          }


          const decodedText =
            codes[0].rawValue;


          if (!decodedText) {
            return;
          }


          const now =
            Date.now();


          /*
          Prevent the same QR from firing
          repeatedly every few milliseconds.
          */

          if (
            decodedText ===
              lastScannedTicket &&
            now - lastScanTime <
              3000
          ) {

            return;
          }


          lastScannedTicket =
            decodedText;

          lastScanTime =
            now;


          processScannedCode(
            decodedText
          );

        }

        catch (error) {

          console.log(
            "QR detection:",
            error
          );

        }

      },
      300
    );
}


/*
=========================================================
 PROCESS QR VALUE
=========================================================
*/

function processScannedCode(
  decodedText
) {

  let ticketId =
    decodedText.trim();


  /*
  If QR contains a URL, try to
  extract ?ticket= or ?id=
  */

  try {

    if (
      ticketId.startsWith(
        "http://"
      ) ||
      ticketId.startsWith(
        "https://"
      )
    ) {

      const url =
        new URL(
          ticketId
        );


      ticketId =
        url.searchParams.get(
          "ticket"
        ) ||
        url.searchParams.get(
          "id"
        ) ||
        ticketId;

    }

  }

  catch (_) {}


  /*
  Expected ticket format:
  U25-WP-0001
  */

  if (
    !ticketId
  ) {

    return;
  }


  checkTicket(
    ticketId
  );

}


/*
=========================================================
 MANUAL CHECK
=========================================================
*/

function manualCheck() {

  const ticketId =
    manualTicketInput.value.trim();


  if (!ticketId) {

    showResult(
      "Enter Ticket ID",
      "Enter a ticket ID such as U25-WP-0001.",
      "invalid"
    );

    return;
  }


  checkTicket(
    ticketId
  );
}


/*
=========================================================
 EVENT LISTENERS
=========================================================
*/

startCameraButton
  .addEventListener(
    "click",
    startCamera
  );


stopCameraButton
  .addEventListener(
    "click",
    stopCamera
  );


markUsedButton
  .addEventListener(
    "click",
    markTicketUsed
  );


manualCheckButton
  .addEventListener(
    "click",
    manualCheck
  );


manualTicketInput
  .addEventListener(
    "keydown",
    function(event) {

      if (
        event.key ===
        "Enter"
      ) {

        manualCheck();

      }

    }
  );


/*
=========================================================
 INITIAL STATE
=========================================================
*/

document.addEventListener(
  "DOMContentLoaded",
  function() {

    cameraMessage.innerText =
      "Camera is not started.";

    volunteerSection.style.display =
      "none";

  }
);


/*
=========================================================
 PAGE EXIT
=========================================================
*/

window.addEventListener(
  "beforeunload",
  function() {

    stopCamera();

  }
);
