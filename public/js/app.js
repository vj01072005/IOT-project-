/**
 * sky IoT - Main Frontend Application Logic
 */

let currentPage = 1;
const recordsPerPage = 20;
let sensorChart = null;
let currentLedState = 0;
let pollTimer = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  if (!Auth.isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }

  // Display user info
  const user = Auth.getUser();
  if (user && user.name) {
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-info').classList.remove('hidden');
  }

  // Initialize Lucide icons
  lucide.createIcons();

  // Initial Data Loads
  await Promise.all([
    loadEnvironmentData(),
    loadSensorRecords(1),
    loadChartData(),
    loadControlState()
  ]);

  // Set real-time polling every 10 seconds (User requirement: "Get DHT11 Sensor Data every 10 seconds")
  pollTimer = setInterval(async () => {
    await loadEnvironmentData();
    await loadSensorRecords(currentPage, false);
    await loadChartData();
    await checkHardwarePing();
  }, 10000);
});

// Logout handler
function handleLogout() {
  if (confirm('Are you sure you want to sign out from sky IoT?')) {
    Auth.logout();
  }
}

// TAB SWITCHER
function switchTab(tabId) {
  const tabs = ['tab-environment', 'tab-lcd', 'tab-led'];
  tabs.forEach(id => {
    const el = document.getElementById(id);
    const btn = document.getElementById('tab-btn-' + id.replace('tab-', ''));
    if (id === tabId) {
      el.classList.remove('hidden');
      btn.classList.add('active');
    } else {
      el.classList.add('hidden');
      btn.classList.remove('active');
    }
  });
  lucide.createIcons();

  // Redraw chart if switching to environment tab
  if (tabId === 'tab-environment' && sensorChart) {
    sensorChart.resize();
  }
}

// ==========================================
// TAB 1: ENVIRONMENT MONITORING LOGIC
// ==========================================

// Load Latest Temperature & Humidity
async function loadEnvironmentData() {
  const refreshIcon = document.getElementById('refresh-icon');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  try {
    const res = await fetch('/api/sensor/latest');
    const json = await res.json();

    if (json.success && json.data) {
      const data = json.data;
      const temp = parseFloat(data.temperature);
      const hum = parseFloat(data.humidity);

      // 1. Update Temperature Visuals
      document.getElementById('temp-display-val').textContent = temp.toFixed(1);
      
      // Calculate Temperature Gauge Offset (Scale: 0 to 50°C, arc max dashoffset: 235.6)
      // Percentage of 50°C
      const tempPct = Math.max(0, Math.min(100, (temp / 50) * 100));
      const totalDash = 235.6;
      const tempOffset = totalDash - (tempPct / 100) * totalDash;
      const tempCircle = document.getElementById('temp-gauge-circle');
      tempCircle.style.strokeDashoffset = tempOffset;

      // Color coding temperature gauge
      let tempColor = '#10b981'; // Emerald
      let tempBadgeText = 'Optimal Comfort';
      let tempBadgeClass = 'bg-brand-950 text-brand-400 border-brand-800';

      if (temp < 18) {
        tempColor = '#38bdf8'; // Sky blue / cool
        tempBadgeText = 'Cool Ambient';
        tempBadgeClass = 'bg-sky-950 text-sky-400 border-sky-800';
      } else if (temp > 32) {
        tempColor = '#f97316'; // Orange / Warm
        tempBadgeText = 'High Temp';
        tempBadgeClass = 'bg-orange-950 text-orange-400 border-orange-800';
      }
      tempCircle.style.stroke = tempColor;

      const tempBadge = document.getElementById('temp-comfort-badge');
      tempBadge.textContent = tempBadgeText;
      tempBadge.className = `px-2.5 py-1 rounded-full text-xs font-semibold border ${tempBadgeClass}`;

      // Temperature Seek Bar Update
      document.getElementById('temp-pct-label').textContent = `${Math.round(tempPct)}% (Scale 0-50°C)`;
      document.getElementById('temp-seek-fill').style.width = `${tempPct}%`;
      document.getElementById('temp-seek-thumb').style.left = `${tempPct}%`;

      // Temperature 24h Stats
      if (data.stats) {
        document.getElementById('temp-stat-min').textContent = `${data.stats.minTemp ?? temp} °C`;
        document.getElementById('temp-stat-avg').textContent = `${data.stats.avgTemp ?? temp} °C`;
        document.getElementById('temp-stat-max').textContent = `${data.stats.maxTemp ?? temp} °C`;
      }

      // 2. Update Humidity Visuals
      document.getElementById('hum-display-val').textContent = hum.toFixed(1);

      // Calculate Humidity Gauge Offset (Scale: 0 to 100%)
      const humPct = Math.max(0, Math.min(100, hum));
      const humOffset = totalDash - (humPct / 100) * totalDash;
      const humCircle = document.getElementById('hum-gauge-circle');
      humCircle.style.strokeDashoffset = humOffset;

      let humBadgeText = 'Ideal Humidity';
      let humBadgeClass = 'bg-teal-950 text-teal-400 border-teal-800';

      if (hum < 35) {
        humBadgeText = 'Dry Air';
        humBadgeClass = 'bg-amber-950 text-amber-400 border-amber-800';
      } else if (hum > 70) {
        humBadgeText = 'High Humidity';
        humBadgeClass = 'bg-cyan-950 text-cyan-400 border-cyan-800';
      }
      const humBadge = document.getElementById('hum-comfort-badge');
      humBadge.textContent = humBadgeText;
      humBadge.className = `px-2.5 py-1 rounded-full text-xs font-semibold border ${humBadgeClass}`;

      // Humidity Seek Bar Update
      document.getElementById('hum-pct-label').textContent = `${Math.round(humPct)}% (Scale 0-100%)`;
      document.getElementById('hum-seek-fill').style.width = `${humPct}%`;
      document.getElementById('hum-seek-thumb').style.left = `${humPct}%`;

      // Humidity 24h Stats
      if (data.stats) {
        document.getElementById('hum-stat-min').textContent = `${data.stats.minHum ?? hum} %`;
        document.getElementById('hum-stat-avg').textContent = `${data.stats.avgHum ?? hum} %`;
        document.getElementById('hum-stat-max').textContent = `${data.stats.maxHum ?? hum} %`;
      }

      // Update Last Reading Time Display
      document.getElementById('last-update-time').textContent = data.time || 'Just now';
    }
  } catch (err) {
    console.error('Error fetching environment data:', err);
  } finally {
    if (refreshIcon) {
      setTimeout(() => refreshIcon.classList.remove('animate-spin'), 400);
    }
  }
}

// Load Section 2: Saved Records Table (Latest First, 20 at a time, Asia/Kolkata +5:30)
async function loadSensorRecords(page = 1, showLoading = true) {
  currentPage = page;
  const tbody = document.getElementById('sensor-records-tbody');

  if (showLoading && tbody.children.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">
          <div class="inline-block animate-spin mr-2">⟳</div> Loading records...
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch(`/api/sensor/records?page=${page}&limit=${recordsPerPage}`);
    const json = await res.json();

    if (!json.success || !json.data) return;

    const records = json.data;
    const pagination = json.pagination;

    // Update records count badge
    document.getElementById('records-count-badge').textContent = `${pagination.total} Records Saved`;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-slate-400">
            No sensor telemetry records found. Start your ESP8266 or click "Simulate Telemetry" above!
          </td>
        </tr>
      `;
      document.getElementById('pagination-info').textContent = 'Showing 0 records';
      document.getElementById('btn-prev-page').disabled = true;
      document.getElementById('btn-next-page').disabled = true;
      return;
    }

    // Build Table Rows: # | Temperature | Humidity | Time | Date | Action (Delete)
    let rowsHtml = '';
    records.forEach(r => {
      rowsHtml += `
        <tr class="hover:bg-[#14221b]/60 transition-colors group">
          <td class="py-3 px-4 text-center font-mono text-slate-400 font-semibold">${r.id}</td>
          <td class="py-3 px-4 font-mono font-bold text-emerald-400">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              ${r.temperature} °C
            </span>
          </td>
          <td class="py-3 px-4 font-mono font-bold text-teal-400">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              ${r.humidity} %
            </span>
          </td>
          <td class="py-3 px-4 font-mono text-slate-200">${r.time}</td>
          <td class="py-3 px-4 text-slate-300 font-mono text-xs">${r.date}</td>
          <td class="py-3 px-4 text-center">
            <button 
              onclick="deleteRecord(${r.id})" 
              title="Delete Record #${r.id}"
              class="p-1.5 rounded-lg bg-red-950/40 border border-red-900/60 hover:bg-red-900/80 hover:border-red-600 text-red-400 hover:text-white transition duration-150"
            >
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
    lucide.createIcons();

    // Update Pagination UI
    const startRecord = (pagination.page - 1) * pagination.limit + 1;
    const endRecord = Math.min(pagination.total, pagination.page * pagination.limit);
    document.getElementById('pagination-info').textContent = 
      `Showing records ${startRecord} - ${endRecord} of ${pagination.total}`;

    document.getElementById('page-number-display').textContent = 
      `Page ${pagination.page} of ${pagination.totalPages}`;

    document.getElementById('btn-prev-page').disabled = !pagination.hasPrev;
    document.getElementById('btn-next-page').disabled = !pagination.hasNext;

  } catch (err) {
    console.error('Error loading records:', err);
  }
}

// Change Pagination Page
function changePage(delta) {
  const newPage = currentPage + delta;
  if (newPage >= 1) {
    loadSensorRecords(newPage, true);
  }
}

// Delete Record Action
async function deleteRecord(id) {
  if (!confirm(`Are you sure you want to delete sensor record #${id}?`)) return;

  try {
    const res = await Auth.fetchAuth(`/api/sensor/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.success) {
      showToast(`Record #${id} deleted successfully`, 'success');
      await loadSensorRecords(currentPage, false);
      await loadChartData();
      await loadEnvironmentData();
    } else {
      showToast(data.error || 'Failed to delete record', 'error');
    }
  } catch (err) {
    showToast('Failed to communicate with server', 'error');
  }
}

// Quick Simulator: adds a realistic reading
async function simulateReading() {
  try {
    const res = await Auth.fetchAuth('/api/sensor/simulate', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`Simulated DHT11 Telemetry: ${data.data.temperature}°C, ${data.data.humidity}%`, 'success');
      await loadEnvironmentData();
      await loadSensorRecords(1, false);
      await loadChartData();
    }
  } catch (err) {
    showToast('Simulation failed', 'error');
  }
}

// Load and render Chart.js historical line graphs
async function loadChartData() {
  try {
    const res = await fetch('/api/sensor/chart?limit=25');
    const json = await res.json();

    if (!json.success) return;

    const ctx = document.getElementById('sensorChart').getContext('2d');

    // Create gradient fills
    const tempGradient = ctx.createLinearGradient(0, 0, 0, 250);
    tempGradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
    tempGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const humGradient = ctx.createLinearGradient(0, 0, 0, 250);
    humGradient.addColorStop(0, 'rgba(20, 184, 166, 0.35)');
    humGradient.addColorStop(1, 'rgba(20, 184, 166, 0.0)');

    const chartData = {
      labels: json.labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: json.temperatures,
          borderColor: '#10b981',
          backgroundColor: tempGradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
          pointHoverRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Humidity (%)',
          data: json.humidities,
          borderColor: '#14b8a6',
          backgroundColor: humGradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#14b8a6',
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    };

    if (sensorChart) {
      sensorChart.data = chartData;
      sensorChart.update();
    } else {
      sensorChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0e1713',
              titleColor: '#34d399',
              bodyColor: '#e2e8f0',
              borderColor: '#1c3427',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  const unit = context.datasetIndex === 0 ? ' °C' : ' %';
                  return `${context.dataset.label}: ${context.parsed.y}${unit}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#64748b', font: { size: 10, family: 'monospace' } }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'Temp (°C)', color: '#10b981', font: { size: 11, weight: 'bold' } },
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#10b981', font: { size: 10, family: 'monospace' } },
              suggestedMin: 15,
              suggestedMax: 45
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: { display: true, text: 'Humidity (%)', color: '#14b8a6', font: { size: 11, weight: 'bold' } },
              grid: { drawOnChartArea: false },
              ticks: { color: '#14b8a6', font: { size: 10, family: 'monospace' } },
              suggestedMin: 20,
              suggestedMax: 100
            }
          }
        }
      });
    }
  } catch (err) {
    console.error('Error loading chart:', err);
  }
}

// ==========================================
// TAB 2: SMART LCD LOGIC
// ==========================================

// Mirror user typing to the virtual 16x2 LCD display
function updateLcdPreview() {
  const row1Input = document.getElementById('lcd-input-row1').value || '';
  const row2Input = document.getElementById('lcd-input-row2').value || '';

  // Character counts
  document.getElementById('char-count-row1').textContent = `${row1Input.length} / 16`;
  document.getElementById('char-count-row2').textContent = `${row2Input.length} / 16`;

  // Pad to 16 characters for LCD visual fidelity
  const padRow1 = (row1Input + '                ').substring(0, 16);
  const padRow2 = (row2Input + '                ').substring(0, 16);

  document.getElementById('lcd-preview-row1').textContent = padRow1;
  document.getElementById('lcd-preview-row2').textContent = padRow2;
}

// Preset helper
function setLcdPreset(row1, row2) {
  document.getElementById('lcd-input-row1').value = row1;
  document.getElementById('lcd-input-row2').value = row2;
  updateLcdPreview();
}

// Handle LCD Update Form Submission
async function handleLcdUpdate(e) {
  e.preventDefault();
  const row1 = document.getElementById('lcd-input-row1').value;
  const row2 = document.getElementById('lcd-input-row2').value;
  const btn = document.getElementById('btn-lcd-update');

  try {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-2">⟳</span> Sending to LCD...`;

    const res = await Auth.fetchAuth('/api/control/lcd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row1, row2 })
    });

    const data = await res.json();
    if (data.success) {
      showToast('LCD Display updated! ESP8266 will render on next heartbeat', 'success');
      document.getElementById('lcd-last-updated').textContent = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
    } else {
      showToast(data.error || 'Failed to update LCD', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="send" class="w-4 h-4 mr-2"></i><span>Update LCD Display</span>`;
    lucide.createIcons();
  }
}

// ==========================================
// TAB 3: LED AUTOMATION LOGIC
// ==========================================

// Load LED & LCD initial state
async function loadControlState() {
  try {
    const res = await fetch('/api/control/state');
    const json = await res.json();

    if (json.success && json.data) {
      const state = json.data;
      
      // Update LCD inputs & preview
      if (state.lcd_row1 !== undefined) {
        document.getElementById('lcd-input-row1').value = state.lcd_row1;
      }
      if (state.lcd_row2 !== undefined) {
        document.getElementById('lcd-input-row2').value = state.lcd_row2;
      }
      updateLcdPreview();
      if (state.formatted_time) {
        document.getElementById('lcd-last-updated').textContent = state.formatted_time;
      }

      // Update LED
      updateLedUI(state.led_state, state.formatted_time);
    }
  } catch (err) {
    console.error('Error fetching control state:', err);
  }
}

// Update LED UI Elements
function updateLedUI(state, timeStr) {
  currentLedState = state === 1 ? 1 : 0;
  const diode = document.getElementById('led-diode-element');
  const diodeIcon = document.getElementById('led-diode-icon');
  const statusPill = document.getElementById('led-status-pill');
  const btnToggle = document.getElementById('btn-led-toggle');
  const btnText = document.getElementById('btn-led-text');
  const logicLevel = document.getElementById('led-logic-level');
  const lastSwitched = document.getElementById('led-last-switched');

  if (currentLedState === 1) {
    // LED IS ON
    diode.className = 'led-diode led-on';
    diodeIcon.className = 'w-8 h-8 text-black fill-white';
    statusPill.textContent = 'LED State: ACTIVE (ON)';
    statusPill.className = 'px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-950 text-brand-400 border border-brand-700 shadow-md shadow-brand-500/20';
    
    btnToggle.className = 'group relative inline-flex items-center justify-center px-10 py-5 text-lg font-black tracking-wide rounded-2xl transition-all duration-300 shadow-2xl bg-brand-500 border-2 border-brand-400 text-black hover:bg-brand-400 shadow-brand-500/30';
    btnText.textContent = 'TURN LED OFF';
    
    logicLevel.textContent = 'HIGH (3.3V)';
    logicLevel.className = 'text-brand-400 font-mono font-bold text-sm';
  } else {
    // LED IS OFF
    diode.className = 'led-diode led-off';
    diodeIcon.className = 'w-8 h-8 text-slate-500';
    statusPill.textContent = 'LED State: INACTIVE (OFF)';
    statusPill.className = 'px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700';
    
    btnToggle.className = 'group relative inline-flex items-center justify-center px-10 py-5 text-lg font-black tracking-wide rounded-2xl transition-all duration-300 shadow-2xl bg-[#14221b] border-2 border-slate-700 text-slate-300 hover:border-brand-500 hover:text-white';
    btnText.textContent = 'TURN LED ON';

    logicLevel.textContent = 'LOW (0V)';
    logicLevel.className = 'text-slate-400 font-mono font-bold text-sm';
  }

  if (timeStr) {
    lastSwitched.textContent = timeStr;
  }
}

// Toggle LED via POST API
async function toggleLed() {
  const newState = currentLedState === 1 ? 0 : 1;
  const btn = document.getElementById('btn-led-toggle');

  try {
    btn.disabled = true;
    const res = await Auth.fetchAuth('/api/control/led', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState })
    });

    const data = await res.json();
    if (data.success) {
      const nowStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
      updateLedUI(data.led_state, nowStr);
      showToast(`Pin D0 LED commanded ${data.led_state === 1 ? 'ON' : 'OFF'}!`, 'success');
    } else {
      showToast(data.error || 'Failed to toggle LED', 'error');
    }
  } catch (err) {
    showToast('Failed to communicate with server', 'error');
  } finally {
    btn.disabled = false;
  }
}

// Hardware Status Ping Check
async function checkHardwarePing() {
  try {
    const res = await fetch('/api/device/ping');
    const data = await res.json();
    const dot = document.getElementById('hardware-status-dot');
    const text = document.getElementById('hardware-status-text');

    if (data.isOnline) {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      const secAgo = Math.round(data.lastPingMsAgo / 1000);
      text.textContent = `ESP8266: Online (${secAgo}s ago)`;
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-amber-400';
      text.textContent = 'ESP8266: Telemetry every 10s';
    }
  } catch (e) {
    // Ignore ping error
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const isSuccess = type === 'success';
  const isError = type === 'error';
  
  let bgClass = 'bg-[#14221b] border-brand-600 text-slate-100';
  let iconName = 'info';

  if (isSuccess) {
    bgClass = 'bg-brand-950 border-brand-500 text-brand-300';
    iconName = 'check-circle';
  } else if (isError) {
    bgClass = 'bg-red-950 border-red-500 text-red-300';
    iconName = 'alert-triangle';
  }

  toast.className = `p-4 rounded-xl border shadow-2xl flex items-center space-x-3 pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0"></i>
    <span class="text-xs font-semibold">${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
