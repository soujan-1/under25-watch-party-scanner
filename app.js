const API_URL = "https://script.google.com/macros/s/AKfycbxUX942IUATzLM8xjRuudQPouiZHNfPeM2PG-x0VnwR92J7CcXICUZ32rYMxlauQAM/exec";

let currentTicket = null;
let scanner = null;
let jsonpCounter = 0;

const resultBox = document.getElementById("result");
const volunteerInput = document.getElementById("volunteer");
const markButton = document.getElementById("markUsed");

function showResult(html, type = "") {
  resultBox.className = "result " + type;
  resultBox.innerHTML = html;
}

function apiRequest(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "under25Callback_" + Date.now() + "_" + (++jsonpCounter);

    const script = document.createElement("script");

    const query = new URLSearchParams({
      action,
      ...params,
      callback: callbackName
    });

    const url = API_URL + "?" + query.toString();

    let finished = false;

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callbackName];
      } catch (_) {
        window[callbackName] = undefined;
      }
    };

    const timeout = setTimeout(() => {
      if (finished) return;

      finished = true;
      cleanup();

      reject(
        new Error(
          "Ticket system did not respond. Check the Apps Script URL."
        )
      );
    }, 15000);

    window[callbackName] = (data) => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      cleanup();

      resolve(data);
    };

    script.onerror = () => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      cleanup();

      reject(
        new Error(
          "Unable to reach the Apps Script ticket system."
        )
      );
    };

    script.src = url;

    document.body.appendChild(script);
  });
}

async function checkTicket(ticketId) {
  try {
    showResult("⏳ Checking ticket...", "loading");

    const data = await apiRequest("checkTicket", {
      ticket: ticketId
    });

    console.log("CHECK RESPONSE:", data);

    if (data.status === "VALID") {
      currentTicket = ticketId;

      showResult(
        `
        <div class="valid-title">✅ VALID TICKET</div>
        <div class="ticket-id">${ticketId}</div>
        <div class="ticket-message">
          This ticket is valid and can be used.
        </div>
        `,
        "valid"
      );

      volunteerInput.style.display = "block";
      markButton.style.display = "block";

      return;
    }

    if (data.status === "USED") {
      currentTicket = null;

      showResult(
        `
        <div class="used-title">⚠️ ALREADY USED</div>
        <div class="ticket-id">${ticketId}</div>
        <div class="ticket-message">
          This ticket has already been used.
        </div>
        `,
        "used"
      );

      volunteerInput.style.display = "none";
      markButton.style.display = "none";

      return;
    }

    showResult(
      `
      <div class="invalid-title">❌ INVALID TICKET</div>
      <div class="ticket-id">${ticketId}</div>
      <div class="ticket-message">
        ${data.message || "Ticket not found."}
      </div>
      `,
      "invalid"
    );

    volunteerInput.style.display = "none";
    markButton.style.display = "none";

  } catch (error) {
    console.error("CHECK ERROR:", error);

    showResult(
      `
      <div class="error-title">❌ ERROR</div>
      <div class="ticket-message">
        ${error.message}
      </div>
      `,
      "error"
    );
  }
}

async function markTicketUsed() {
  if (!currentTicket) {
    alert("Please scan a valid ticket first.");
    return;
  }

  const volunteer =
    volunteerInput.value.trim() || "Volunteer";

  try {
    markButton.disabled = true;
    markButton.innerText = "Confirming...";

    const data = await apiRequest("markUsed", {
      ticket: currentTicket,
      volunteer: volunteer
    });

    console.log("MARK RESPONSE:", data);

    if (data.status === "SUCCESS") {
      showResult(
        `
        <div class="valid-title">✅ ENTRY CONFIRMED</div>
        <div class="ticket-id">${currentTicket}</div>
        <div class="ticket-message">
          Ticket has been successfully marked as USED.
        </div>
        `,
        "valid"
      );

      currentTicket = null;
      volunteerInput.value = "";
      volunteerInput.style.display = "none";
      markButton.style.display = "none";

      return;
    }

    if (data.status === "USED") {
      showResult(
        `
        <div class="used-title">⚠️ ALREADY USED</div>
        <div class="ticket-id">${currentTicket}</div>
        `,
        "used"
      );

      return;
    }

    showResult(
      `
      <div class="invalid-title">❌ ERROR</div>
      <div class="ticket-message">
        ${data.message || "Unable to mark ticket as used."}
      </div>
      `,
      "error"
    );

  } catch (error) {
    console.error("MARK ERROR:", error);

    showResult(
      `
      <div class="error-title">❌ ERROR</div>
      <div class="ticket-message">
        ${error.message}
      </div>
      `,
      "error"
    );

  } finally {
    markButton.disabled = false;
    markButton.innerText = "MARK ENTRY";
  }
}

function onScanSuccess(decodedText) {
  console.log("QR SCANNED:", decodedText);

  let ticketId = decodedText.trim();

  // If QR contains a URL, extract ticket parameter.
  try {
    if (
      ticketId.startsWith("http://") ||
      ticketId.startsWith("https://")
    ) {
      const url = new URL(ticketId);

      ticketId =
        url.searchParams.get("ticket") ||
        url.searchParams.get("id") ||
        ticketId;
    }
  } catch (_) {}

  checkTicket(ticketId);
}

function onScanFailure(error) {
  // Ignore continuous scanner errors.
}

async function startScanner() {
  try {
    showResult("📷 Starting camera...", "loading");

    scanner = new Html5Qrcode("reader");

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250
        }
      },
      onScanSuccess,
      onScanFailure
    );

    showResult(
      "📷 Scanner ready — scan the ticket QR code.",
      "info"
    );

  } catch (error) {
    console.error("CAMERA ERROR:", error);

    showResult(
      `
      <div class="error-title">❌ CAMERA ERROR</div>
      <div class="ticket-message">
        ${error.message}
      </div>
      `,
      "error"
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  markButton.style.display = "none";
  volunteerInput.style.display = "none";

  markButton.addEventListener(
    "click",
    markTicketUsed
  );

  startScanner();
});
