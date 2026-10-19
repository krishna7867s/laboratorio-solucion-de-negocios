# Laboratorio #1: Integración POO + n8n · Soluciones de Negocio
## Escenario 2: Pedidos con Verificación Geográfica de Cobertura

Este repositorio contiene la solución completa para el **Escenario 2** del Laboratorio Integrador de Programación Orientada a Objetos y Automatización con n8n.

---

## 📁 Estructura del Proyecto

```text
├── main.js                     # Clases POO en JavaScript puro y pruebas independientes
├── nodo-code-n8n.js            # Código adaptado para el nodo Code de n8n ($input.all())
├── workflow-n8n.json           # Definición completa del flujo de n8n exportado
├── db.json                     # Base de datos simulada para JSON Server (puerto 3000)
├── DOCUMENTO_LOGICA_NEGOCIO.md # Documento formal de lógica de negocio (2-4 páginas)
└── README.md                   # Documentación general del repositorio
```

---

## 🚀 Requisitos Previos

- **Node.js** (v18 o superior)
- **n8n** (`npm install -g n8n` o ejecutado mediante `npx n8n`)
- **JSON Server** (`npx json-server`)

---

## 🛠️ Instrucciones de Ejecución

### 1. Ejecutar Pruebas Locales de POO (sin n8n)
Para validar las clases `Pedido` y `ValidadorCobertura`, sus reglas de negocio y captura de excepciones:
```bash
node main.js
```

### 2. Iniciar JSON Server (Base de Datos Local)
En una terminal independiente:
```bash
npx json-server --watch db.json --port 3000
```
El endpoint de pedidos estará disponible en `http://localhost:3000/pedidos`.

### 3. Iniciar e Importar en n8n
1. Inicia n8n en tu terminal:
   ```bash
   n8n start
   ```
2. Abre tu navegador en `http://localhost:5678`.
3. Crea un nuevo flujo y en los tres puntos (`...`) selecciona **Import from File**.
4. Selecciona el archivo `workflow-n8n.json`.
5. Activa el flujo con el botón **Active**.

---

## 📌 Reglas de Negocio Implementadas
1. **Cobertura Territorial Estricta:** Admisión exclusiva para países en lista blanca (por defecto: `Costa Rica`).
2. **Tarifa Base Regionalizada:** Costo fijo inicial de transporte por país habilitado.
3. **Recargo Logístico por Volumen:** Incremento de $1.50 USD por cada artículo del pedido.
4. **Ciclo de Vida Auditable:** Transición de estado (`Pendiente` -> `Aprobado` o `Rechazado`).
5. **No Persistencia de Rechazos:** Órdenes fuera de cobertura no se guardan en JSON Server para evitar despachos erróneos.

---

## 🛡️ Manejo de Errores
- **Error 1 (API Externa Indisponible):** Fallo o timeout al consultar `IP-API`. Se captura y rechaza el pedido de forma controlada sin detener el workflow.
- **Error 2 (Datos de Cliente Incompletos):** Omisión de ID, IP inválida o cantidad no positiva. Se valida tanto en el constructor de `Pedido` como en el nodo IF, respondiendo con HTTP 400 Bad Request.
