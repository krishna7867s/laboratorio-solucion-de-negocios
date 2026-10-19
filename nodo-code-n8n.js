/**
 * ============================================================================
 * NODO CODE DE n8n: LÓGICA DE NEGOCIO Y PROCESAMIENTO GEOGRÁFICO
 * Archivo: nodo-code-n8n.js
 * 
 * Instrucciones: Copiar y pegar todo el contenido de este archivo directamente
 * en el editor del nodo "Code" (Modo: "Run Once for All Items").
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. DEFINICIÓN DE CLASES DE NEGOCIO (POO EN EL CONTEXTO DE n8n)
// ----------------------------------------------------------------------------

class Pedido {
  constructor({ id, cliente, ipCliente, producto, cantidad }) {
    this.validarCampos({ id, cliente, ipCliente, producto, cantidad });

    this.id = id;
    this.cliente = String(cliente).trim();
    this.ipCliente = String(ipCliente).trim();
    this.producto = String(producto).trim();
    this.cantidad = Number(cantidad);
    this.estado = "Pendiente";
    this.costoEnvio = 0;
    this.paisDetectado = null;
    this.motivoRechazo = null;
    this.fechaProcesamiento = new Date().toISOString();
  }

  validarCampos({ id, cliente, ipCliente, producto, cantidad }) {
    // MANEJO DE ERROR 2: Datos obligatorios faltantes en la petición del cliente
    if (!id || String(id).trim() === "") {
      throw new Error("ERROR_DATOS_CLIENTE: El campo 'id' del pedido es obligatorio y no puede estar vacío.");
    }
    if (!ipCliente || String(ipCliente).trim() === "") {
      throw new Error("ERROR_DATOS_CLIENTE: El campo 'ipCliente' es obligatorio para la validación geográfica.");
    }
    if (!cliente || String(cliente).trim() === "") {
      throw new Error("ERROR_DATOS_CLIENTE: El campo 'cliente' es obligatorio.");
    }
    if (!producto || String(producto).trim() === "") {
      throw new Error("ERROR_DATOS_CLIENTE: El campo 'producto' es obligatorio.");
    }
    if (cantidad === undefined || isNaN(cantidad) || Number(cantidad) <= 0) {
      throw new Error("ERROR_DATOS_CLIENTE: El campo 'cantidad' debe ser un número mayor a cero.");
    }
  }

  asignarCostoEnvio(costo) {
    this.costoEnvio = Number(costo);
  }

  aprobar(pais) {
    this.estado = "Aprobado";
    this.paisDetectado = pais;
    this.motivoRechazo = null;
  }

  rechazar(motivo) {
    this.estado = "Rechazado";
    this.costoEnvio = 0;
    this.motivoRechazo = motivo;
  }

  aFormatoJsonServer() {
    return {
      id: this.id,
      cliente: this.cliente,
      ipCliente: this.ipCliente,
      producto: this.producto,
      cantidad: this.cantidad,
      paisDetectado: this.paisDetectado,
      costoEnvio: this.costoEnvio,
      estado: this.estado,
      motivoRechazo: this.motivoRechazo,
      fechaProcesamiento: this.fechaProcesamiento
    };
  }
}

class ValidadorCobertura {
  constructor(paisesPermitidos = ["Costa Rica"]) {
    this.paisesPermitidos = paisesPermitidos.map(p => p.trim().toLowerCase());
    this.tarifaBase = 5.00;
    this.recargoPorUnidad = 1.50;
  }

  verificarPais(paisAPI) {
    if (!paisAPI || typeof paisAPI !== "string") {
      return false;
    }
    return this.paisesPermitidos.includes(paisAPI.trim().toLowerCase());
  }

  calcularEnvio(paisAPI, cantidad) {
    if (!this.verificarPais(paisAPI)) {
      throw new Error(`Área no habilitada para despacho: '${paisAPI}'.`);
    }
    return Number((this.tarifaBase + (Number(cantidad) * this.recargoPorUnidad)).toFixed(2));
  }
}

// ----------------------------------------------------------------------------
// 2. CAPTURA Y PROCESAMIENTO DE DATOS CON SINTAXIS NATIVA DE n8n
// ----------------------------------------------------------------------------

const itemsEntrada = $input.all();
const validador = new ValidadorCobertura(["Costa Rica"]);
const salidas = [];

for (const item of itemsEntrada) {
  const datosEntrada = item.json;

  try {
    // ------------------------------------------------------------------------
    // Extracción flexible de datos (Soporta entrada directa o payload de webhook)
    // ------------------------------------------------------------------------
    const payloadCliente = datosEntrada.body || datosEntrada.pedido || datosEntrada;
    
    // Extracción de la respuesta devuelta por la API externa (IP-API)
    // En flujos donde IP-API corre en un nodo previo o viene en los datos del item
    const respuestaGeo = datosEntrada.geoData || datosEntrada;

    // ------------------------------------------------------------------------
    // MANEJO DE ERROR 2: Validación previa de presencia de datos de petición
    // ------------------------------------------------------------------------
    if (!payloadCliente || Object.keys(payloadCliente).length === 0) {
      throw new Error("ERROR_DATOS_CLIENTE: El cuerpo de la petición del cliente está vacío o ausente.");
    }

    // Instanciación del Pedido (Valida internamente id, ipCliente, cliente, etc.)
    const pedido = new Pedido({
      id: payloadCliente.id,
      cliente: payloadCliente.cliente,
      ipCliente: payloadCliente.ipCliente || payloadCliente.ip,
      producto: payloadCliente.producto,
      cantidad: payloadCliente.cantidad
    });

    // ------------------------------------------------------------------------
    // MANEJO DE ERROR 1: Verificación de disponibilidad de la API externa
    // ------------------------------------------------------------------------
    // Se valida si la API externa falló a nivel de red, status !== 'success' o country ausente
    const apiFallo = Boolean(
      respuestaGeo.error || 
      (respuestaGeo.status && respuestaGeo.status === "fail") || 
      !respuestaGeo.country
    );

    if (apiFallo) {
      const detalleError = respuestaGeo.message || respuestaGeo.error || "No se recibieron datos de geolocalización válidos desde IP-API";
      throw new Error(`ERROR_API_EXTERNA: ${detalleError}`);
    }

    // Extracción exitosa del país retornado por la API externa
    const paisDetectado = respuestaGeo.country;

    // ------------------------------------------------------------------------
    // Evaluación de la Regla de Negocio (Cobertura de País)
    // ------------------------------------------------------------------------
    if (validador.verificarPais(paisDetectado)) {
      // Cobertura aprobada: Se calcula el costo de envío
      const costoEnvio = validador.calcularEnvio(paisDetectado, pedido.cantidad);
      pedido.asignarCostoEnvio(costoEnvio);
      pedido.aprobar(paisDetectado);
    } else {
      // Cobertura denegada: País no admitido en la lista blanca
      pedido.rechazar(`País '${paisDetectado}' fuera de la zona de cobertura autorizada.`);
    }

    // Salida estructurada lista para enviar al nodo HTTP Request (JSON Server)
    salidas.push({
      json: pedido.aFormatoJsonServer()
    });

  } catch (error) {
    // ------------------------------------------------------------------------
    // Captura centralizada de errores (Error 1, Error 2 o errores imprevistos)
    // ------------------------------------------------------------------------
    const esErrorCliente = error.message.startsWith("ERROR_DATOS_CLIENTE");
    const esErrorAPI = error.message.startsWith("ERROR_API_EXTERNA");

    const registroError = {
      id: datosEntrada.body?.id || datosEntrada.id || "SIN_ID",
      cliente: datosEntrada.body?.cliente || datosEntrada.cliente || "DESCONOCIDO",
      ipCliente: datosEntrada.body?.ipCliente || datosEntrada.body?.ip || datosEntrada.ipCliente || "NO_DISPONIBLE",
      producto: datosEntrada.body?.producto || datosEntrada.producto || "NO_ESPECIFICADO",
      cantidad: Number(datosEntrada.body?.cantidad || datosEntrada.cantidad || 0),
      paisDetectado: null,
      costoEnvio: 0,
      estado: "Rechazado",
      motivoRechazo: error.message,
      tipoError: esErrorCliente ? "VALIDACION_ENTRADA" : (esErrorAPI ? "FALLO_SERVICIO_EXTERNO" : "ERROR_SISTEMA"),
      fechaProcesamiento: new Date().toISOString()
    };

    salidas.push({
      json: registroError
    });
  }
}

// Retorno del array estructurado de items en formato requerido por n8n
return salidas;
