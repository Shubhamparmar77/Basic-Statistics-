// Utility: Format number nicely
function formatNumber(num) {
  if (Number.isNaN(num) || !Number.isFinite(num)) return "—";
  const fixed = num.toFixed(4);
  return fixed.replace(/\.?0+$/, "");
}

const calcTypeSelect = document.getElementById("calcType");
const tableBody = document.getElementById("tableBody");
const dataTable = document.getElementById("dataTable");
const helperText = document.getElementById("helperText");
const addRowBtn = document.getElementById("addRowBtn");
const calculateBtn = document.getElementById("calculateBtn");
const resultArea = document.getElementById("resultArea");

// Initialize with 3 rows
function initTable() {
  tableBody.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    addRow();
  }
}

function addRow(midVal = "", freqVal = "") {
  const tr = document.createElement("tr");

  const midTd = document.createElement("td");
  const midInput = document.createElement("input");
  midInput.type = "number";
  midInput.step = "any";
  midInput.placeholder = "e.g. 10.5";
  midInput.className = "mid-input";
  midInput.value = midVal;
  midTd.appendChild(midInput);

  const freqTd = document.createElement("td");
  const freqInput = document.createElement("input");
  freqInput.type = "number";
  freqInput.step = "1";
  freqInput.min = "0";
  freqInput.placeholder = "e.g. 4";
  freqInput.className = "freq-input";
  freqInput.value = freqVal;
  freqTd.appendChild(freqInput);

  const actionTd = document.createElement("td");
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "✕";
  removeBtn.type = "button";
  removeBtn.className = "remove-row-btn";
  removeBtn.addEventListener("click", () => {
    if (tableBody.rows.length > 1) {
      tr.remove();
    }
  });
  actionTd.appendChild(removeBtn);

  tr.appendChild(midTd);
  tr.appendChild(freqTd);
  tr.appendChild(actionTd);

  tableBody.appendChild(tr);
}

function updateModeUI() {
  const mode = calcTypeSelect.value;

  if (mode === "mean") {
    dataTable.classList.add("hide-frequency");
    helperText.innerHTML =
      'For <span>Mean</span>, only midpoint values are used (frequency is ignored). Each midpoint is equally weighted.';
  } else if (mode === "median") {
    dataTable.classList.remove("hide-frequency");
    helperText.innerHTML =
      'For <span>Median</span>, enter midpoint and frequency. The calculator expands data conceptually and finds the median.';
  } else if (mode === "mode") {
    dataTable.classList.remove("hide-frequency");
    helperText.innerHTML =
      'For <span>Mode</span>, enter midpoint and frequency. The midpoint with highest frequency is the mode (ties supported).';
  }
}

function readData() {
  const rows = Array.from(tableBody.querySelectorAll("tr"));
  const data = [];

  rows.forEach((row) => {
    const midInput = row.querySelector(".mid-input");
    const freqInput = row.querySelector(".freq-input");

    const mid = parseFloat(midInput.value);
    const freqRaw = parseFloat(freqInput.value);

    if (!Number.isNaN(mid)) {
      data.push({
        mid,
        freq: Number.isNaN(freqRaw) || freqRaw <= 0 ? 1 : freqRaw,
      });
    }
  });

  return data;
}

function calculateMean(data) {
  if (data.length === 0) {
    return null;
  }
  const sum = data.reduce((acc, item) => acc + item.mid, 0);
  return sum / data.length;
}

function calculateMedianFromExpanded(data) {
  if (data.length === 0) return null;

  // Build expanded array based on frequency
  const values = [];
  data.forEach((item) => {
    const count = Math.max(1, Math.round(item.freq));
    for (let i = 0; i < count; i++) {
      values.push(item.mid);
    }
  });

  if (values.length === 0) return null;

  values.sort((a, b) => a - b);
  const n = values.length;

  if (n % 2 === 1) {
    return values[(n - 1) / 2];
  } else {
    const mid1 = values[n / 2 - 1];
    const mid2 = values[n / 2];
    return (mid1 + mid2) / 2;
  }
}

function calculateMode(data) {
  if (data.length === 0) return null;

  const freqMap = new Map();
  data.forEach((item) => {
    const key = item.mid;
    const existing = freqMap.get(key) || 0;
    freqMap.set(key, existing + item.freq);
  });

  let maxFreq = -Infinity;
  freqMap.forEach((f) => {
    if (f > maxFreq) maxFreq = f;
  });

  const modes = [];
  freqMap.forEach((f, mid) => {
    if (f === maxFreq) {
      modes.push({ mid, freq: f });
    }
  });

  return { maxFreq, modes };
}

function showError(message) {
  resultArea.innerHTML = `
    <p class="result-label">Error</p>
    <p class="error">${message}</p>
  `;
}

function renderResult() {
  const mode = calcTypeSelect.value;
  const data = readData();

  if (data.length === 0) {
    showError("Please enter at least one midpoint value.");
    return;
  }

  if (mode === "mean") {
    const mean = calculateMean(data);
    if (mean === null) {
      showError("Unable to calculate mean. Check your inputs.");
      return;
    }

    resultArea.innerHTML = `
      <p class="result-label">Mean (Midpoints only)</p>
      <p class="result-main">${formatNumber(mean)}</p>
      <p class="result-details">
        • Number of midpoints used: <strong>${data.length}</strong><br />
        • All midpoints are assumed to have equal weight (frequency = 1).
      </p>
      <div class="chip">
        ✔ <span>Tip:</span> For grouped data mean with class & frequency, you can modify this logic easily.
      </div>
    `;
  } else if (mode === "median") {
    const median = calculateMedianFromExpanded(data);
    if (median === null) {
      showError("Unable to calculate median. Check your inputs.");
      return;
    }

    const totalFreq = data.reduce(
      (acc, item) => acc + Math.max(1, Math.round(item.freq)),
      0
    );

    resultArea.innerHTML = `
      <p class="result-label">Median (From midpoint & frequency)</p>
      <p class="result-main">${formatNumber(median)}</p>
      <p class="result-details">
        • Total frequency (Σf): <strong>${totalFreq}</strong><br />
        • Conceptually, data is expanded by repeating each midpoint according to its frequency, then median is found.
      </p>
      <div class="chip">
        ℹ <span>Note:</span> This is equivalent to median of discrete distribution on midpoints.
      </div>
    `;
  } else if (mode === "mode") {
    const result = calculateMode(data);
    if (!result) {
      showError("Unable to calculate mode. Check your inputs.");
      return;
    }

    const { maxFreq, modes } = result;
    const modeValues = modes.map((m) => formatNumber(m.mid)).join(", ");

    const pillHtml = modes
      .map(
        (m) =>
          `<span class="pill">Midpoint ${formatNumber(m.mid)} (f = ${formatNumber(
            m.freq
          )})</span>`
      )
      .join("");

    resultArea.innerHTML = `
      <p class="result-label">Mode (From midpoint & frequency)</p>
      <p class="result-main">${modeValues}</p>
      <p class="result-details">
        • Highest frequency: <strong>${formatNumber(maxFreq)}</strong><br />
        • ${
          modes.length > 1
            ? "There are multiple modes (multimodal distribution)."
            : "Single modal midpoint found."
        }
      </p>
      <div class="pill-group">
        ${pillHtml}
      </div>
    `;
  }
}

// Event listeners
calcTypeSelect.addEventListener("change", () => {
  updateModeUI();
  resultArea.innerHTML = `
    <p class="result-label">Mode changed to: ${calcTypeSelect.value.toUpperCase()}</p>
    <p class="result-details">
      Update your inputs if needed, then press <strong>Calculate</strong> again.
    </p>
  `;
});

addRowBtn.addEventListener("click", () => addRow());
calculateBtn.addEventListener("click", renderResult);

// Initial UI setup
initTable();
updateModeUI();
