/**
 * ============================================================================
 * PROJECT: sky - IoT Environment Monitoring & Smart Automation System
 * AUTHORS: Rohit and Vijay, Dept. of Electrical Engineering, Gov. Engg.
 * 
 * HARDWARE CONFIGURATION:
 * - Microcontroller : ESP8266 (NodeMCU v2/v3 / Wemos D1 Mini)
 * - Sensor          : DHT11 on Pin D3 (GPIO 0)
 * - Actuator        : LED on Pin D0 (GPIO 16)
 * - Display         : 16x2 I2C LCD on D1 (SCL / GPIO 5) & D2 (SDA / GPIO 4)
 *                     Default I2C Address: 0x27 (or 0x3F)
 * 
 * NETWORK CREDENTIALS:
 * - WiFi SSID       : COE YAVATMAL
 * - WiFi Password   : shoaib845
 * 
 * TELEMETRY & POLLING:
 * - Interval        : Every 10 Seconds
 * ============================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ==========================================
// 1. PIN DEFINITIONS & CONSTANTS
// ==========================================
#define DHTPIN   D3          // DHT11 Data Pin connected to D3 (GPIO 0)
#define DHTTYPE  DHT11       // DHT 11 Sensor model
#define LEDPIN   D0          // LED connected to D0 (GPIO 16)
#define I2C_SDA  D2          // I2C Data Pin (GPIO 4)
#define I2C_SCL  D1          // I2C Clock Pin (GPIO 5)

// LCD 16x2 I2C Setup: Address 0x27, 16 Columns, 2 Rows
// Note: If text does not appear on your LCD, try 0x3F instead of 0x27
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Initialize DHT Sensor
DHT dht(DHTPIN, DHTTYPE);

// ==========================================
// 2. NETWORK & SERVER CONFIGURATION
// ==========================================
const char* ssid     = "COE YAVATMAL";
const char* password = "shoaib845";

/**
 * SERVER ENDPOINT URL:
 * --------------------
 * OPTION A (Local Testing on same WiFi):
 * Replace with your PC's local IP address (find using 'ipconfig' in cmd):
 * Example: "http://192.168.1.100:3000/api/device/data"
 * 
 * OPTION B (Render Cloud Deployment):
 * Replace with your deployed Render URL:
 * Example: "https://sky-iot-app.onrender.com/api/device/data"
 */
String serverUrl = "http://192.168.1.100:3000/api/device/data";

// Telemetry interval: 10,000 milliseconds (10 seconds)
const unsigned long SEND_INTERVAL = 10000;
unsigned long lastSendTime = 0;

// Variables to avoid LCD flickering
String currentLcdRow1 = "";
String currentLcdRow2 = "";

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

// Simple JSON extraction helper to avoid library version conflicts
String extractJsonValue(String json, String key) {
  int keyIndex = json.indexOf("\"" + key + "\"");
  if (keyIndex == -1) return "";

  int colonIndex = json.indexOf(":", keyIndex);
  if (colonIndex == -1) return "";

  // Check if string value (starts with quote)
  int firstQuote = json.indexOf("\"", colonIndex);
  int nextComma = json.indexOf(",", colonIndex);
  int nextBrace = json.indexOf("}", colonIndex);

  int endPos = (nextComma != -1 && nextComma < nextBrace) ? nextComma : nextBrace;

  if (firstQuote != -1 && firstQuote < endPos) {
    int secondQuote = json.indexOf("\"", firstQuote + 1);
    if (secondQuote != -1) {
      return json.substring(firstQuote + 1, secondQuote);
    }
  }

  // Number / Boolean value
  String val = json.substring(colonIndex + 1, endPos);
  val.trim();
  return val;
}

// Display text on 16x2 LCD
void updateLcd(String row1, String row2) {
  // Pad strings to 16 characters to overwrite previous text cleanly
  while (row1.length() < 16) row1 += " ";
  while (row2.length() < 16) row2 += " ";
  
  row1 = row1.substring(0, 16);
  row2 = row2.substring(0, 16);

  if (row1 != currentLcdRow1 || row2 != currentLcdRow2) {
    currentLcdRow1 = row1;
    currentLcdRow2 = row2;

    lcd.setCursor(0, 0);
    lcd.print(row1);
    lcd.setCursor(0, 1);
    lcd.print(row2);
  }
}

// Connect to WiFi network
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  updateLcd("Connecting WiFi", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(LEDPIN, !digitalRead(LEDPIN)); // Blink LED while connecting
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LEDPIN, LOW); // Turn off after connecting
    Serial.println("\nWiFi Connected Successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    updateLcd("WiFi Connected!", WiFi.localIP().toString());
    delay(2000);
  } else {
    Serial.println("\nWiFi Connection Failed! Retrying in loop...");
    updateLcd("WiFi Failed!", "Check Credentials");
    delay(2000);
  }
}

// ==========================================
// 4. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n==========================================");
  Serial.println("  sky - IoT Project (ESP8266 Booting)   ");
  Serial.println("  Rohit and Vijay, Dept. of EE          ");
  Serial.println("==========================================");

  // Initialize LED Pin
  pinMode(LEDPIN, OUTPUT);
  digitalWrite(LEDPIN, LOW); // Default OFF

  // Initialize I2C Bus & 16x2 LCD
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  updateLcd("   sky IoT    ", " Initializing...");
  delay(1500);

  // Initialize DHT11 Sensor
  dht.begin();
  Serial.println("DHT11 Sensor initialized on Pin D3");

  // Connect to specified WiFi
  connectWiFi();

  updateLcd("sky IoT Ready", "Waiting Telemetry");
  delay(1000);
}

// ==========================================
// 5. MAIN LOOP
// ==========================================
void loop() {
  // Ensure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }

  unsigned long currentMillis = millis();

  // Send Telemetry every 10 seconds
  if (currentMillis - lastSendTime >= SEND_INTERVAL || lastSendTime == 0) {
    lastSendTime = currentMillis;

    // Read Sensor Data from DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Check if reading succeeded
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[ERROR] Failed to read from DHT11 sensor! Checking connections...");
      updateLcd("DHT11 Read Error", "Check Pin D3");
      return;
    }

    Serial.println("------------------------------------------");
    Serial.printf("[DHT11] Temperature: %.1f °C | Humidity: %.1f %%\n", temperature, humidity);

    // Build JSON Payload
    String jsonPayload = "{\"temperature\":" + String(temperature, 1) + 
                         ",\"humidity\":" + String(humidity, 1) + "}";

    // Execute HTTP POST to Backend
    WiFiClient client;
    WiFiClientSecure secureClient;
    HTTPClient http;

    bool isHttps = serverUrl.startsWith("https://");
    bool beginSuccess = false;

    if (isHttps) {
      secureClient.setInsecure(); // Bypass SSL fingerprint check for Render
      beginSuccess = http.begin(secureClient, serverUrl);
    } else {
      beginSuccess = http.begin(client, serverUrl);
    }

    if (beginSuccess) {
      http.addHeader("Content-Type", "application/json");

      Serial.print("[HTTP] Sending POST to: ");
      Serial.println(serverUrl);

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("[HTTP] Response Code: %d\n", httpResponseCode);
        Serial.println("[HTTP] Server Response: " + response);

        // Parse Response for LED & LCD controls:
        // Expected response: {"success":true,"led":1,"lcd_row1":"...","lcd_row2":"..."}
        
        // 1. Parse and apply LED Automation (Pin D0)
        String ledVal = extractJsonValue(response, "led");
        if (ledVal.length() > 0) {
          int ledState = ledVal.toInt();
          digitalWrite(LEDPIN, ledState == 1 ? HIGH : LOW);
          Serial.printf("[ACTUATOR] LED on Pin D0 set to: %s\n", (ledState == 1 ? "ON (HIGH)" : "OFF (LOW)"));
        }

        // 2. Parse and apply LCD 16x2 text
        String row1 = extractJsonValue(response, "lcd_row1");
        String row2 = extractJsonValue(response, "lcd_row2");

        if (row1.length() > 0 || row2.length() > 0) {
          updateLcd(row1, row2);
          Serial.println("[DISPLAY] LCD Updated: [Row 1: " + row1 + "] [Row 2: " + row2 + "]");
        }

      } else {
        Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
        updateLcd("Server Offline", "Check Backend");
      }

      http.end();
    } else {
      Serial.println("[HTTP] Unable to connect to host");
    }
  }

  // Small non-blocking delay
  delay(100);
}
