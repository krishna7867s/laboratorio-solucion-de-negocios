/**
 * ============================================================================
 * LABORATORIO UNIVERSITARIO: ESCENARIO 2
 * SISTEMA DE VERIFICACIÓN GEOGRÁFICA DE COBERTURA DE PEDIDOS
 * Archivo: main.js (Programación Orientada a Objetos en JavaScript ES6+)
 * ============================================================================
 */

/**
 * Clase que representa la entidad del Pedido en el sistema.
 */
class Pedido {
  /**
   * Crea una nueva instancia de Pedido.
   * Valida estrictamente que todos los parámetros obligatorios estén presentes y sean válidos.
   * 
   * 
   * 
   * 
   * @param {Object} datos - Objeto con los datos del pedido.
   * @param {string|number} datos.id - Identificador único del pedido.
   * @param {string} datos.cliente - Nombre completo del cliente.
   * @param {string} datos.ipCliente - Dirección IP desde donde se realiza la compra.
   * @param {string} datos.producto - Nombre o código del producto adquirido.
   * @param {number} datos.cantidad - Cantidad de unidades solicitadas.
   */
  constructor({ id, cliente, ipCliente, producto, cantidad }) {
    this.validarCamposObligatorios({ id, cliente, ipCliente, producto, cantidad });

    this.id = id;
    this.cliente = cliente.trim();
    this.ipCliente = ipCliente.trim();
    this.producto = producto.trim();
    this.cantidad = Number(cantidad);
    
    // Propiedades de estado inicial
    this.estado = "Pendiente";
    this.costoEnvio = 0;
    this.paisDetectado = null;
    this.motivoRechazo = null;
    this.fechaCreacion = new Date().toISOString();
  }

  /**
   * Valida la existencia y formato de los atributos iniciales.
   * Lanza un Error si algún dato falta o es inconsistente.
   */
  validarCamposObligatorios({ id, cliente, ipCliente, producto, cantidad }) {
    if (!id || String(id).trim() === "") {
      throw new Error("Validación fallida: El campo 'id' es obligatorio y no puede estar vacío.");
    }
    if (!cliente || String(cliente).trim() === "") {
      throw new Error("Validación fallida: El campo 'cliente' es obligatorio y no puede estar vacío.");
    }
    if (!ipCliente || String(ipCliente).trim() === "") {
      throw new Error("Validación fallida: El campo 'ipCliente' es obligatorio y no puede estar vacío.");
    }
    if (!producto || String(producto).trim() === "") {
      throw new Error("Validación fallida: El campo 'producto' es obligatorio y no puede estar vacío.");
    }
    if (cantidad === undefined || cantidad === null || isNaN(cantidad) || Number(cantidad) <= 0) {
      throw new Error("Validación fallida: El campo 'cantidad' debe ser un número entero mayor a cero.");
    }
  }

  /**
   * Asigna el costo de envío calculado al pedido.
   * @param {number} costo - Monto del costo de envío.
   */
  asignarCostoEnvio(costo) {
    if (isNaN(costo) || Number(costo) < 0) {
      throw new Error("El costo de envío debe ser un valor numérico mayor o igual a cero.");
    }
    this.costoEnvio = Number(costo);
  }

  /**
   * Actualiza el estado del pedido a 'Aprobado'.
   * @param {string} pais - País confirmado donde se entregará el pedido.
   */
  aprobar(pais) {
    this.estado = "Aprobado";
    this.paisDetectado = pais;
    this.motivoRechazo = null;
  }

  /**
   * Actualiza el estado del pedido a 'Rechazado'.
   * @param {string} motivo - Razón por la cual no procede el pedido.
   */
  rechazar(motivo) {
    this.estado = "Rechazado";
    this.costoEnvio = 0;
    this.motivoRechazo = motivo;
  }

  /**
   * Devuelve la representación estructurada del pedido en formato JSON.
   * @returns {Object} Representación del pedido.
   */
  obtenerResumen() {
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
      fechaCreacion: this.fechaCreacion
    };
  }
}

/**
 * Clase encargada de validar la cobertura geográfica y calcular tarifas logísticas.
 */
class ValidadorCobertura {
  /**
   * Inicializa la lista blanca de países autorizados y tarifas correspondientes.
   * @param {Array<string>} paisesPermitidos - Lista de países con cobertura activa.
   */
  constructor(paisesPermitidos = ["Costa Rica"]) {
    // Normalizamos los países a minúsculas para comparaciones insensibles a mayúsculas
    this.paisesPermitidos = paisesPermitidos.map(p => p.trim().toLowerCase());
    
    // Configuración de tarifas base por país (en USD)
    this.tarifasBase = {
      "costa rica": 5.00,
      "guatemala": 7.50,
      "panama": 8.00
    };

    // Recargo logístico por unidad adicional
    this.recargoPorUnidad = 1.50;
  }

  /**
   * Valida si el país devuelto por la API externa se encuentra dentro de la zona de cobertura.
   * @param {string} paisAPI - Nombre del país detectado.
   * @returns {boolean} True si está en la lista blanca, False en caso contrario.
   */
  verificarPais(paisAPI) {
    if (!paisAPI || typeof paisAPI !== "string") {
      return false;
    }
    const paisNormalizado = paisAPI.trim().toLowerCase();
    return this.paisesPermitidos.includes(paisNormalizado);
  }

  /**
   * Calcula el costo de envío dinámico según el país de destino y la cantidad de productos.
   * Fórmula de negocio: Tarifa Base + (Cantidad * Recargo por Unidad)
   * 
   * @param {string} paisAPI - País donde se encuentra el cliente.
   * @param {number} cantidad - Cantidad de artículos en la orden.
   * @returns {number} Costo total del flete.
   */
  calcularEnvio(paisAPI, cantidad) {
    if (!this.verificarPais(paisAPI)) {
      throw new Error(`No se puede calcular el envío: '${paisAPI}' está fuera del área de servicio.`);
    }

    const paisNormalizado = paisAPI.trim().toLowerCase();
    const tarifaBase = this.tarifasBase[paisNormalizado] || 6.00;
    const costoVariables = Number(cantidad) * this.recargoPorUnidad;

    return Number((tarifaBase + costoVariables).toFixed(2));
  }
}

// ============================================================================
// BLOQUE DE PRUEBAS LOCALES (Ejecutable con: node main.js)
// ============================================================================
if (require.main === module) {
  console.log("==================================================================");
  console.log("       PRUEBAS LOCALES DE LÓGICA DE NEGOCIO (POO EN NODE.JS)      ");
  console.log("==================================================================\n");

  const validador = new ValidadorCobertura(["Costa Rica", "Panama"]);

  // --------------------------------------------------------------------------
  // CASO DE PRUEBA 1: Pedido Válido con Cobertura Permitida (Costa Rica)
  // --------------------------------------------------------------------------
  console.log(">>> [TEST 1]: Procesando pedido con cobertura válida (Costa Rica)...");
  try {
    const pedidoValido = new Pedido({
      id: "PED-1001",
      cliente: "Valeria Fernández",
      ipCliente: "186.15.228.12",
      producto: "Laptop Gamer Asus",
      cantidad: 2
    });

    // Simulación de respuesta exitosa de IP-API
    const mockRespuestaIP_API = {
      status: "success",
      country: "Costa Rica",
      countryCode: "CR",
      city: "San José",
      query: "186.15.228.12"
    };

    if (validador.verificarPais(mockRespuestaIP_API.country)) {
      const costo = validador.calcularEnvio(mockRespuestaIP_API.country, pedidoValido.cantidad);
      pedidoValido.asignarCostoEnvio(costo);
      pedidoValido.aprobar(mockRespuestaIP_API.country);
      console.log("✔ Resultado Exitoso:");
      console.log(pedidoValido.obtenerResumen());
    } else {
      pedidoValido.rechazar("País fuera de cobertura");
      console.log("✖ Pedido rechazado:", pedidoValido.obtenerResumen());
    }
  } catch (error) {
    console.error("Error inesperado en TEST 1:", error.message);
  }

  console.log("\n------------------------------------------------------------------");

  // --------------------------------------------------------------------------
  // CASO DE PRUEBA 2: Pedido Rechazado por Estar Fuera de Cobertura (México)
  // --------------------------------------------------------------------------
  console.log(">>> [TEST 2]: Procesando pedido con país fuera de cobertura (México)...");
  try {
    const pedidoFueraZona = new Pedido({
      id: "PED-1002",
      cliente: "Carlos Mendoza",
      ipCliente: "187.189.15.4",
      producto: "Monitor Dell 27",
      cantidad: 1
    });

    // Simulación de respuesta de IP-API detectando México
    const mockRespuestaIP_API = {
      status: "success",
      country: "Mexico",
      countryCode: "MX",
      city: "Ciudad de México",
      query: "187.189.15.4"
    };

    if (validador.verificarPais(mockRespuestaIP_API.country)) {
      const costo = validador.calcularEnvio(mockRespuestaIP_API.country, pedidoFueraZona.cantidad);
      pedidoFueraZona.asignarCostoEnvio(costo);
      pedidoFueraZona.aprobar(mockRespuestaIP_API.country);
    } else {
      pedidoFueraZona.rechazar(`El país '${mockRespuestaIP_API.country}' no cuenta con envíos disponibles.`);
    }

    console.log("✔ Rechazo controlado correctamente por cobertura:");
    console.log(pedidoFueraZona.obtenerResumen());
  } catch (error) {
    console.error("Error inesperado en TEST 2:", error.message);
  }

  console.log("\n------------------------------------------------------------------");

  // --------------------------------------------------------------------------
  // CASO DE PRUEBA 3: Manejo de Error por Datos Obligatorios Faltantes (ID / IP)
  // --------------------------------------------------------------------------
  console.log(">>> [TEST 3]: Captura de error al instanciar Pedido sin ID ni IP...");
  try {
    new Pedido({
      id: "", // ID vacío intencional
      cliente: "Lucía Morales",
      ipCliente: "", // IP vacía intencional
      producto: "Teclado Mecánico",
      cantidad: 3
    });
  } catch (error) {
    console.log("✔ Excepción de validación capturada con éxito en try/catch:");
    console.log("  Mensaje:", error.message);
  }

  console.log("\n------------------------------------------------------------------");

  // --------------------------------------------------------------------------
  // CASO DE PRUEBA 4: Manejo de Error por Cantidad Inválida
  // --------------------------------------------------------------------------
  console.log(">>> [TEST 4]: Captura de error con cantidad inválida (0 o negativa)...");
  try {
    new Pedido({
      id: "PED-1004",
      cliente: "Esteban Gómez",
      ipCliente: "186.15.228.12",
      producto: "Mouse Inalámbrico",
      cantidad: -5 // Cantidad inválida intencional
    });
  } catch (error) {
    console.log("✔ Excepción de validación capturada con éxito en try/catch:");
    console.log("  Mensaje:", error.message);
  }

  console.log("\n==================================================================");
  console.log("                 FIN DE LAS PRUEBAS LOCALES                       ");
  console.log("==================================================================");
}

// Exportación modular para su reutilización
module.exports = { Pedido, ValidadorCobertura };
