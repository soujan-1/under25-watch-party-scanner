const API_URL =
  "https://script.google.com/macros/s/AKfycbxUX942IUATzLM8xjRuudQPouiZHNfPeM2PG-x0VnwR92J7CcXICUZ32rYMxlauQAM/exec";


let scanner = null;

let currentTicket = "";

let scannerRunning = false;


// =====================================================
// START SCANNER
// =====================================================

async function startScanner() {

  const status =
    document.getElementById(
      "scannerStatus"
    );

  try {

    status.textContent =
      "📷 Requesting camera permission...";


    scanner =
      new Html5Qrcode(
        "reader"
      );


    await scanner.start(

      {
        facingMode: "environment"
      },

      {
        fps: 10,

        qrbox: {
          width: 250,
          height: 250
        }
      },

      onScanSuccess,

      onScanError

    );


    scannerRunning = true;


    status.textContent =
      "📷 Point the camera at the ticket QR code";


  } catch (error) {

    console.error(error);


    status.textContent =
      "❌ Camera could not be started.";


    showError(
      "Camera permission was denied or the browser cannot access the camera."
    );

  }

}


// =====================================================
// QR SCANNED
// =====================================================

async function onScanSuccess(decodedText) {

  if (!decodedText) {
    return;
  }


  if (!scannerRunning) {
    return;
  }


  currentTicket =
    decodedText.trim();


  await stopScanner();


  document.getElementById(
    "scannerStatus"
  ).textContent =
    "🔍 Checking ticket...";


  await checkTicket(
    currentTicket
  );

}


// =====================================================
// IGNORE SCAN ERRORS
// =====================================================

function onScanError(error) {

  // QR not detected yet.
  // Ignore continuous scanner errors.

}


// =====================================================
// STOP CAMERA
// =====================================================

async function stopScanner() {

  if (
    scanner &&
    scannerRunning
  ) {

    try {

      await scanner.stop();

      scanner.clear();

    } catch (error) {

      console.log(error);

    }

    scannerRunning = false;

  }

}


// =====================================================
// CHECK TICKET
// =====================================================

async function checkTicket(ticketId) {

  try {

    const response =
      await fetch(
        API_URL +
        "?action=checkTicket&ticket=" +
        encodeURIComponent(
          ticketId
        )
      );


    const result =
      await response.json();


    showResult(
      result
    );


  } catch (error) {

    console.error(error);


    showError(
      "Unable to connect to the ticket system."
    );

  }

}


// =====================================================
// SHOW RESULT
// =====================================================

function showResult(result) {

  const box =
    document.getElementById(
      "result"
    );

  const confirm =
    document.getElementById(
      "confirmButton"
    );

  const scanAgain =
    document.getElementById(
      "scanAgain"
    );


  box.className =
    "result";


  box.classList.remove(
    "hidden"
  );


  confirm.classList.add(
    "hidden"
  );


  scanAgain.classList.add(
    "hidden"
  );


  if (
    result.status ===
    "VALID"
  ) {

    box.classList.add(
      "valid"
    );


    box.innerHTML =
      `
      <strong>✅ VALID TICKET</strong>
      <br><br>

      <strong>Student:</strong>
      ${escapeHtml(result.studentName)}

      <br>

      <strong>USN:</strong>
      ${escapeHtml(result.usn)}

      <br>

      <strong>Ticket:</strong>
      ${escapeHtml(result.ticketId)}
      `;


    confirm.classList.remove(
      "hidden"
    );


    document.getElementById(
      "scannerStatus"
    ).textContent =
      "✅ Ticket verified";

  }


  else if (
    result.status ===
    "USED"
  ) {

    box.classList.add(
      "used"
    );


    box.innerHTML =
      `
      <strong>⚠️ TICKET ALREADY USED</strong>
      <br><br>

      Student:
      ${escapeHtml(result.studentName)}

      <br>

      Ticket:
      ${escapeHtml(result.ticketId)}

      <br>

      Entry:
      ${escapeHtml(result.entryTime)}
      `;


    scanAgain.classList.remove(
      "hidden"
    );


    document.getElementById(
      "scannerStatus"
    ).textContent =
      "⚠️ Ticket already used";

  }


  else {

    box.classList.add(
      "invalid"
    );


    box.innerHTML =
      `
      <strong>❌ INVALID TICKET</strong>
      <br><br>

      ${escapeHtml(
        result.message ||
        "This ticket is not valid."
      )}
      `;


    scanAgain.classList.remove(
      "hidden"
    );


    document.getElementById(
      "scannerStatus"
    ).textContent =
      "❌ Invalid ticket";

  }

}


// =====================================================
// CONFIRM ENTRY
// =====================================================

document
  .getElementById(
    "confirmButton"
  )
  .addEventListener(
    "click",
    confirmEntry
  );


async function confirmEntry() {

  const volunteer =
    prompt(
      "Enter volunteer name:"
    );


  if (!volunteer) {

    return;

  }


  const button =
    document.getElementById(
      "confirmButton"
    );


  button.disabled =
    true;


  button.textContent =
    "PROCESSING...";


  try {

    const response =
      await fetch(
        API_URL +
        "?action=markUsed" +
        "&ticket=" +
        encodeURIComponent(
          currentTicket
        ) +
        "&volunteer=" +
        encodeURIComponent(
          volunteer
        )
      );


    const result =
      await response.json();


    if (
      result.success
    ) {

      const box =
        document.getElementById(
          "result"
        );


      box.className =
        "result valid";


      box.classList.remove(
        "hidden"
      );


      box.innerHTML =
        `
        <strong>
          🎉 ENTRY CONFIRMED
        </strong>

        <br><br>

        Student:
        ${escapeHtml(
          result.studentName
        )}

        <br>

        Ticket:
        ${escapeHtml(
          result.ticketId
        )}

        <br><br>

        🍿 Enjoy the Watch Party!
        `;


      button.classList.add(
        "hidden"
      );


      document.getElementById(
        "scanAgain"
      ).classList.remove(
        "hidden"
      );


      document.getElementById(
        "scannerStatus"
      ).textContent =
        "🎉 Entry successfully recorded";

    }

    else {

      alert(
        result.message
      );

      button.disabled =
        false;

      button.textContent =
        "✓ CONFIRM ENTRY";

    }


  } catch (error) {

    console.error(error);


    alert(
      "Unable to update entry status."
    );


    button.disabled =
      false;

    button.textContent =
      "✓ CONFIRM ENTRY";

  }

}


// =====================================================
// SCAN NEXT
// =====================================================

document
  .getElementById(
    "scanAgain"
  )
  .addEventListener(
    "click",
    function() {

      document
        .getElementById(
          "result"
        )
        .className =
        "result hidden";


      document
        .getElementById(
          "confirmButton"
        )
        .className =
        "confirm hidden";


      currentTicket =
        "";


      startScanner();

    }
  );


// =====================================================
// ERROR
// =====================================================

function showError(message) {

  const box =
    document.getElementById(
      "result"
    );


  box.className =
    "result invalid";


  box.classList.remove(
    "hidden"
  );


  box.innerHTML =
    `
    <strong>❌ ERROR</strong>
    <br><br>
    ${escapeHtml(message)}
    `;

}


// =====================================================
// SECURITY
// =====================================================

function escapeHtml(value) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    value || "";


  return div.innerHTML;

}


// =====================================================
// START
// =====================================================

window.addEventListener(
  "load",
  function() {

    startScanner();

  }
);
