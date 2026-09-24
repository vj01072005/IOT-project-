# sky - IoT Environment Monitoring & Smart Automation System

**Designed and Developed by Rohit nand Vijay, Dept. of Electrical Engineering, Gov. Engg............**

`sky` is a full-stack IoT cloud platform and hardware control system engineered for ESP8266 microcontrollers. It features real-time environment telemetry, digital gauge & seek-bar visualizations, pagination with Asia/Kolkata timezone support, remote 16x2 I2C LCD messaging, and instantaneous LED automation.

---

## 🚀 Key Features

- **Tab 1: Environment Monitoring**
  - **10-Second Telemetry Sync**: Real-time polling from DHT11 sensor.
  - **Innovative Gauge / Seek Bar Structure**:
    - Animated radial speedometer gauges with gradient arcs.
    - Linear seek-bar indicators displaying percentage load and comfort zones.
    - 24-hour Min, Max, and Average ambient statistics.
  - **Dynamic Chart.js Visualizer**: Dual-axis historical temperature (°C) and humidity (%) area curves.
  - **Saved Records Table**:
    - Columns: `# | Temperature | Humidity | Time | Date | Action (Delete)`
    - Pagination: 20 records per page (latest records first).
    - **TimeZone: `+5:30 Asia/Kolkata`** format for both Time and Date.
    - One-click deletion of individual sensor records.
    - Quick "Simulate Telemetry" button for instant software testing without hardware.

- **Tab 2: Smart LCD 16x2 Display**
  - Input fields for `Row 1` and `Row 2` (up to 16 characters each).
  - Real-time character counter and authentic 16x2 green phosphor LCD visual simulator.
  - Quick-text presets ("Welcome to sky", "Dept. of EE", etc.).
  - Instant synchronization with hardware via the ESP8266 telemetry loop.

- **Tab 3: LED Automation**
  - Interactive master power switch for remote automation of **Pin D0 (GPIO 16)**.
  - Realistic 3D glowing diode simulation (emerald glow when ON, dark matte when OFF).
  - Synchronous bi-directional control.

- **Security & Authentication**
  - User Registration (`Name`, `Email`, `Password`) & Login (`Email`, `Password`).
  - Passwords hashed with `bcryptjs`.
  - Secure JSON Web Token (JWT) session authorization.
  - Default Admin Account: `admin@sky.iot` / `sky12345`.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Tailwind CSS (Green/Emerald Theme), Vanilla JavaScript, Chart.js, Lucide Icons.
- **Backend**: Node.js & Express.
- **Database**: SQLite3 with WAL mode enabled.
- **Microcontroller**: ESP8266 (NodeMCU / Wemos D1 Mini / ESP-12E).
- **Sensors & Actuators**: DHT11, 16x2 I2C Character LCD, 5mm LED.
- **Cloud Deployment**: Production-ready for [Render](https://render.com).

---

## 🔌 Hardware Wiring & Pinout Guide

| Hardware Component | Component Pin | ESP8266 Pin | ESP8266 GPIO | Description |
| :--- | :--- | :--- | :--- | :--- |
| **DHT11 Sensor** | DATA / OUT | **D3** | GPIO 0 | Ambient Temp & Humidity Data |
| **DHT11 Sensor** | VCC | 3.3V or 5V (Vin) | - | Power Supply (3.3V - 5V) |
| **DHT11 Sensor** | GND | GND | - | Ground Reference |
| **LED** | Anode (+) | **D0** | GPIO 16 | Actuator Pin (through 220Ω resistor) |
| **LED** | Cathode (-) | GND | - | Ground Reference |
| **16x2 I2C LCD** | SCL | **D1** | GPIO 5 | I2C Clock Line |
| **16x2 I2C LCD** | SDA | **D2** | GPIO 4 | I2C Serial Data Line |
| **16x2 I2C LCD** | VCC | 5V (Vin) | - | 5V Power for Backlight |
| **16x2 I2C LCD** | GND | GND | - | Ground Reference |

*Note on I2C Address*: Default address in code is `0x27`. If characters do not appear on your LCD, adjust the contrast potentiometer on the back of the I2C backpack or change the address to `0x3F` in `arduino/sky_esp8266/sky_esp8266.ino`.

---

## 💻 Local Setup & Execution

### 1. Start the Node.js Server
```powershell
# Navigate to the project root
cd "c:\Users\GCOEY\Desktop\IOT Project"

# Start the server
npm start
```

Open your browser at: **`http://localhost:3000`**

### 2. Default Login Credentials
- **Email**: `admin@sky.iot`
- **Password**: `sky12345`
*(Or register a new account on `/login.html`)*

---

## ☁️ Deploying on Render (Step-by-Step)

This repository includes `render.yaml` and is pre-configured for instant zero-configuration deployment to Render's Free Web Service tier.

### Option A: 1-Click / Blueprint Deploy
1. Push this project to a **GitHub** or **GitLab** repository.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repository. Render will automatically read `render.yaml` and configure:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: Automatic (`process.env.PORT`)
5. Click **Apply**.

### Option B: Manual Web Service Deploy
1. In Render, select **New +** -> **Web Service**.
2. Connect your Git repository.
3. Set the following settings:
   - **Name**: `sky-iot-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = *(any random 32+ character string)*
   - `DATABASE_PATH` = `./data/sky.db`
5. Click **Deploy Web Service**.
6. Once deployed, Render will provide a live URL such as:
   `https://sky-iot-app.onrender.com`

---

## 📟 Arduino ESP8266 Setup

1. Open **Arduino IDE**.
2. Install the **ESP8266 Board Package**:
   - Go to `File` -> `Preferences`.
   - Add this URL to *Additional Boards Manager URLs*:  
     `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Go to `Tools` -> `Board` -> `Boards Manager...`, search for `esp8266` and click **Install**.
3. Install the required libraries via `Tools` -> `Manage Libraries...`:
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
   - `LiquidCrystal_I2C` by Frank de Brabander
4. Open `arduino/sky_esp8266/sky_esp8266.ino`.
5. Verify WiFi Credentials:
   ```cpp
   const char* ssid     = "COE YAVATMAL";
   const char* password = "shoaib845";
   ```
6. Set the `serverUrl` (Pre-configured to your live Render endpoint):
   ```cpp
   String serverUrl = "https://iot-project-mur6.onrender.com/api/device/data";
   ```
7. Select Board: `NodeMCU 1.0 (ESP-12E Module)` and select your USB COM port.
8. Click **Upload** (Arrow icon).
9. Open the Serial Monitor at **115200 baud** to view real-time connection status and telemetry logs!

---

## 📁 Project Directory Structure

```
IOT Project/
├── package.json               # Node.js dependencies & Render engine specs
├── server.js                  # Main Express app, CORS, Render PORT binding
├── render.yaml                # Render Blueprint deployment configuration
├── .env.example               # Environment variables template
├── database/
│   ├── db.js                  # SQLite database schema, connections & helpers
│   └── seed.js                # Initial database seeder (demo records & admin user)
├── middleware/
│   └── auth.js                # JWT verification middleware
├── routes/
│   ├── auth.js                # Register, Login & Profile routes
│   ├── device.js              # ESP8266 telemetry ingestion & command response
│   ├── sensor.js              # Latest reading, paginated logs & chart API
│   └── control.js             # LCD and LED remote state controllers
├── utils/
│   └── timezone.js            # +5:30 Asia/Kolkata date and time formatting
├── public/
│   ├── index.html             # Main dashboard (3 Tabs, Gauges, Seek Bar, LCD, LED)
│   ├── login.html             # Green theme login and registration portal
│   ├── css/
│   │   └── style.css          # Gauge arcs, retro 16x2 LCD styling & LED glowing diode
│   └── js/
│       ├── auth.js            # Client-side JWT session and token manager
│       └── app.js             # Telemetry polling, Chart.js, LCD preview & LED automation
└── arduino/
    └── sky_esp8266/
        └── sky_esp8266.ino    # Complete ESP8266 C++ sketch with DHT11, LCD & LED
```

---

## 👨‍💻 Authors & Credits

**Designed and Developed by Rohit nand Vijay, Dept. of Electrical Engineering, Gov. Engg............**
