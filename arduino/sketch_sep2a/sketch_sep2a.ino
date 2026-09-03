#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <time.h>
#include "addons/TokenHelper.h"

// =====
// PREENCHA COM OS DADOS DO SEU PROJETO
#define WIFI_SSID "ESCOLA-PROFESSORES"
#define WIFI_PASSWORD "!Mestres@Piaui#"
#define API_KEY "AIzaSyBWDcTMNN4aUYywXhgUw_gJzlkB45F1foM"
#define FIREBASE_PROJECT_ID "climat-7c7f7"
#define USER_EMAIL "weberemanuel111@gmail.com"
#define USER_PASSWORD "Nanda034"
// =====

#define DHTPIN 4
#define DHTTYPE DHT11 // Definido para o módulo de sensor azul
DHT dht(DHTPIN, DHTTYPE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
unsigned long tempoAnterior = 0;

void setup() {
 Serial.begin(115200);
 dht.begin();

 Serial.println();
 Serial.print("Conectando ao Wi-Fi");
 WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

 while (WiFi.status() != WL_CONNECTED) {
 Serial.print(".");
 delay(300);
 }

 Serial.println("\nWi-Fi Conectado!");

 configTime(0, 0, "pool.ntp.org");

 config.api_key = API_KEY;
 auth.user.email = USER_EMAIL;
 auth.user.password = USER_PASSWORD;
 Firebase.begin(&config, &auth);

 Serial.println("Firebase configurado. Aguardando para ler o sensor...");
}
void loop() {
 // Configurado para enviar os dados a cada 1 minuto (60.000 ms)
 if (Firebase.ready() && (millis() - tempoAnterior > 60000 || tempoAnterior == 0)) {
 tempoAnterior = millis();

 float t = dht.readTemperature();
 float u = dht.readHumidity();
 time_t timestamp = time(NULL);

 if (!isnan(t) && !isnan(u)) {
 Serial.printf("Leitura -> Temp: %.1f°C | Umid: %.1f%%\n", t, u);

 FirebaseJson content;
 content.set("fields/temperatura/doubleValue", t);
 content.set("fields/umidade/doubleValue", u);
 content.set("fields/timestamp/integerValue", timestamp);

if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", "leituras", content.raw())) {
 Serial.println("→ Dado salvo no Firebase com sucesso!");
 } else {
 Serial.println("→ ERRO ao salvar: " + fbdo.errorReason());
 }
 } else {
 Serial.println("Falha ao ler o sensor DHT11!");
 }
 }
}