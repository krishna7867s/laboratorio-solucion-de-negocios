# Laboratorio #1: Integración POO + n8n · Soluciones de Negocio
## Escenario 2: Pedidos con Verificación Geográfica de Cobertura
### 🌟 Extensión Implementada: Reto 4 - Historial y Tendencia

Este repositorio contiene la solución completa para el **Escenario 2** del Laboratorio Integrador de Programación Orientada a Objetos y Automatización con n8n, incluyendo la extensión opcional **Reto 4 (Historial y Tendencia)**.

---

## 📁 Estructura del Proyecto

```text
├── main.js              # Clases POO (Producto, Pedido, Ubicacion, PoliticaEnvio, HistorialTendencia) y tests locales
├── nodo-code-n8n.js     # Código POO adaptado para el nodo Code de n8n
├── workflow-n8n.json    # Workflow exportado de n8n listo para importar
├── db.json              # Base de datos simulada con colecciones "pedidos" e "historial"
└── README.md            # Documentación general del repositorio
```

---

## 🚀 Requisitos y Puesta en Marcha

### 1. Pruebas Locales de POO en Node.js (Sin n8n)
Valida todas las clases y reglas de negocio ejecutando:
```bash
node main.js
```
*Ejecuta **10 casos de prueba** que validan la lógica de pedidos, zonas GAM/Rural, recargos y los 3 estados de tendencia temporal (`Mejorando`, `Empeorando` y `Estable`).*

### 2. Iniciar JSON Server (Base de Datos Local)
```bash
npx json-server --watch db.json --port 3000
```
- Endpoint de pedidos: `http://localhost:3000/pedidos`
- Endpoint de historial (Reto 4): `http://localhost:3000/historial`

### 3. Exponer JSON Server para n8n Cloud
Si ejecutas n8n en la nube (n8n Cloud), expón el puerto 3000 con **ngrok**:
```bash
ngrok http 3000
```
Configura la URL generada en el nodo `Configuración` de n8n.

---

## 📌 Reglas de Negocio Implementadas

1. **Cobertura Territorial Nacional:** Solo se autorizan despachos en Costa Rica (`CR`).
2. **Tarifas Regionales:**
   - **GAM** (San José, Alajuela, Heredia, Cartago): **₡2,500**.
   - **Rural** (Puntarenas, Guanacaste, Limón): **₡4,500**.
3. **Envío Gratis:** Si el subtotal de la compra es igual o superior a **₡50,000**.
4. **Recargo por Volumen:** Si el pedido supera **5 unidades físicas**, se suma **₡500** por cada unidad adicional.
5. **Ciclo de Vida y Persistencia:** Solo se procesan pedidos en estado `pendiente`. Al aprobarse o rechazarse se actualiza el registro en JSON Server mediante `PATCH`.
6. **Reto 4 - Historial y Tendencia:** Cada ejecución exitosa o rechazada se registra en la colección `historial` de JSON Server. La clase `HistorialTendencia` analiza las ejecuciones cronológicas para diagnosticar si la tasa de éxito logístico está `Mejorando`, `Empeorando` o `Estable`, y devuelve este diagnóstico en la respuesta final.

---

## 🛡️ Manejo de Errores y Códigos HTTP del Webhook

| Código | Condición | Respuesta |
| :---: | :--- | :--- |
| **200 OK** | Pedido aprobado + diagnóstico de tendencia | `{ ok: true, estado: "aprobado", pedido: { ... }, analisisTendencia: { ... } }` |
| **400 Bad Request** | Faltan datos (ID o IP inválida) | `{ ok: false, estado: "rechazado", motivo: "Solicitud incompleta", errores: [...] }` |
| **404 Not Found** | El pedido no existe en JSON Server | `{ ok: false, estado: "error", motivo: "El pedido X no existe..." }` |
| **409 Conflict** | El pedido ya había sido procesado | `{ ok: false, estado: "...", motivo: "El pedido ya fue procesado anteriormente..." }` |
| **422 Unprocessable** | Fuera de cobertura + diagnóstico de tendencia | `{ ok: false, estado: "rechazado", motivo: "Fuera de cobertura...", tendencia: { ... } }` |
| **503 Unavailable** | Falla o timeout en servicio IP-API | `{ ok: false, estado: "pendiente", motivo: "El servicio de geolocalización no responde..." }` |

---

## 🧪 Cómo Probar el Webhook en n8n y Postman

Envía una petición `POST` al endpoint del Webhook de n8n:
- **Método:** `POST`
- **Path:** `/webhook-test/pedidos-cobertura` (o `/webhook/pedidos-cobertura`)
- **Headers:** `Content-Type: application/json`
- **Body JSON:**
```json
{
  "pedidoId": "1",
  "ip": "186.15.228.12"
}
```
