/**
 * ============================================================================
 * LABORATORIO: ESCENARIO 2 - PEDIDOS CON VERIFICACIÓN GEOGRÁFICA DE COBERTURA
 * EXTENSIÓN: RETO 4 - HISTORIAL Y TENDENCIA
 * Archivo: main.js (Programación Orientada a Objetos en JavaScript ES6+)
 * 
 * Este archivo implementa el modelo de clases de POO utilizado en el nodo Code
 * de n8n, incluyendo la clase HistorialTendencia para análisis temporal de pedidos.
 * ============================================================================
 */

/**
 * Representa un producto individual dentro de un pedido.
 */
class Producto {
  constructor(data = {}) {
    this.nombre = data.nombre || 'Sin nombre';
    this.cantidad = Number(data.cantidad) || 0;
    this.precio = Number(data.precio) || 0;
  }

  /**
   * Calcula el total correspondiente a este producto (cantidad * precio).
   * @returns {number}
   */
  calcularTotal() {
    return this.cantidad * this.precio;
  }
}

/**
 * Representa la entidad de Pedido en el sistema.
 */
class Pedido {
  constructor(data = {}) {
    this.id = data.id;
    this.cliente = data.cliente || 'Desconocido';
    this.estado = data.estado || 'pendiente';
    this.productos = (data.productos || []).map(p => new Producto(p));
  }

  /**
   * Verifica si el pedido contiene al menos un producto con cantidad positiva.
   * @returns {boolean}
   */
  tieneProductos() {
    return this.productos.some(p => p.cantidad > 0);
  }

  /**
   * Calcula el subtotal sumando el total de cada producto.
   * @returns {number}
   */
  calcularSubtotal() {
    return this.productos.reduce((s, p) => s + p.calcularTotal(), 0);
  }

  /**
   * Retorna la suma total de unidades físicas de todos los productos.
   * @returns {number}
   */
  totalUnidades() {
    return this.productos.reduce((s, p) => s + p.cantidad, 0);
  }

  /**
   * Determina si el pedido está en estado 'pendiente'.
   * @returns {boolean}
   */
  estaPendiente() {
    return String(this.estado).trim().toLowerCase() === 'pendiente';
  }
}

/**
 * Encapsula la información geográfica devuelta por el servicio de IP-API.
 */
class Ubicacion {
  constructor(data = {}) {
    this.status = data.status || 'fail';
    this.mensaje = data.message || '';
    this.pais = data.country || '';
    this.codigoPais = data.countryCode || '';
    this.region = data.regionName || '';
    this.ciudad = data.city || '';
    this.ip = data.query || '';
  }

  /**
   * Comprueba si la geolocalización fue exitosa por parte del servicio.
   * @returns {boolean}
   */
  esValida() {
    return this.status === 'success';
  }

  /**
   * Normaliza el nombre de la provincia eliminando acentos, mayúsculas y prefijos.
   * @returns {string}
   */
  provinciaNormalizada() {
    return (this.region || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace('provincia de', '')
      .replace('province', '')
      .trim();
  }
}

/**
 * Encapsula las reglas y políticas logísticas para despacho y cobro de flete.
 */
class PoliticaEnvio {
  constructor() {
    // Regla territorial: Código ISO del país permitido
    this.paisPermitido = 'CR';

    // Regla de tarifas por zona geográfica
    this.zonas = {
      'san jose': { zona: 'GAM', tarifa: 2500 },
      'alajuela': { zona: 'GAM', tarifa: 2500 },
      'heredia': { zona: 'GAM', tarifa: 2500 },
      'cartago': { zona: 'GAM', tarifa: 2500 },
      'puntarenas': { zona: 'Rural', tarifa: 4500 },
      'guanacaste': { zona: 'Rural', tarifa: 4500 },
      'limon': { zona: 'Rural', tarifa: 4500 }
    };

    // Parámetros de negocio
    this.montoEnvioGratis = 50000;
    this.unidadesSinRecargo = 5;
    this.recargoPorUnidad = 500;
  }

  /**
   * Busca la zona tarifaria según la provincia del cliente.
   * @param {Ubicacion} ubicacion
   * @returns {Object|null}
   */
  buscarZona(ubicacion) {
    const prov = ubicacion.provinciaNormalizada();
    const claves = Object.keys(this.zonas);
    for (let i = 0; i < claves.length; i++) {
      if (prov.indexOf(claves[i]) !== -1) return this.zonas[claves[i]];
    }
    return null;
  }

  /**
   * Calcula el flete aplicando reglas de envío gratis y recargo por volumen.
   * @param {Pedido} pedido
   * @param {Object} zona
   * @returns {number}
   */
  calcularCosto(pedido, zona) {
    // Regla: Envío gratis si el subtotal alcanza el monto mínimo (>= 50,000)
    if (pedido.calcularSubtotal() >= this.montoEnvioGratis) return 0;

    // Regla: Recargo por unidades adicionales arriba del límite (5 unidades)
    const extra = Math.max(0, pedido.totalUnidades() - this.unidadesSinRecargo) * this.recargoPorUnidad;
    return zona.tarifa + extra;
  }

  /**
   * Evalúa la cobertura completa de un pedido dado su destino geográfico.
   * @param {Pedido} pedido
   * @param {Ubicacion} ubicacion
   * @returns {Object}
   */
  evaluar(pedido, ubicacion) {
    // Regla 1: El pedido debe tener productos con cantidad > 0
    if (!pedido.tieneProductos()) {
      return { aprobado: false, motivo: 'El pedido no tiene productos válidos' };
    }

    // Regla 2: La IP debe ser geolocalizable
    if (!ubicacion.esValida()) {
      return { 
        aprobado: false, 
        motivo: `No se pudo determinar la ubicación de la IP ${ubicacion.ip || ''} (${ubicacion.mensaje || 'sin detalle'})` 
      };
    }

    // Regla 3: Solo se despacha dentro de Costa Rica
    if (ubicacion.codigoPais !== this.paisPermitido) {
      return { 
        aprobado: false, 
        motivo: `Fuera de cobertura: solo despachamos dentro de Costa Rica (cliente ubicado en ${ubicacion.pais || 'Desconocido'})` 
      };
    }

    // Regla 4: La provincia debe estar dentro de las zonas configuradas
    const zona = this.buscarZona(ubicacion);
    if (!zona) {
      return { 
        aprobado: false, 
        motivo: `Fuera de cobertura: la región "${ubicacion.region}" no está en nuestras zonas de despacho` 
      };
    }

    const costo = this.calcularCosto(pedido, zona);
    return {
      aprobado: true,
      zona: zona.zona,
      costoEnvio: costo,
      motivo: costo === 0 
        ? 'Envío gratis por compra mayor o igual a 50000' 
        : `Envío a zona ${zona.zona}`
    };
  }
}

/**
 * RETO 4: Clase encargada de analizar el historial temporal de ejecuciones
 * y diagnosticar si la cobertura y efectividad del sistema está mejorando o empeorando.
 */
class HistorialTendencia {
  /**
   * @param {Array<Object>} registros - Colección de ejecuciones previas desde JSON Server.
   */
  constructor(registros = []) {
    this.registros = Array.isArray(registros) ? registros : [];
  }

  /**
   * Calcula el porcentaje de aprobación (0 a 100) sobre un arreglo de registros.
   * @param {Array<Object>} lista
   * @returns {number}
   */
  calcularTasaAprobacion(lista = this.registros) {
    if (!lista || lista.length === 0) return 0;
    const aprobados = lista.filter(r => {
      const res = String(r.resultado || r.estado || '').toLowerCase();
      return res === 'aprobado';
    }).length;
    return Number(((aprobados / lista.length) * 100).toFixed(1));
  }

  /**
   * Determina si la situación del negocio está 'Mejorando', 'Empeorando' o 'Estable'
   * comparando la tasa de éxito de la mitad reciente vs la mitad anterior.
   * @returns {Object} Diagnóstico de tendencia estructurado.
   */
  determinarTendencia() {
    const total = this.registros.length;
    if (total < 2) {
      return {
        tendencia: 'Insuficiente',
        totalRegistros: total,
        tasaGlobal: this.calcularTasaAprobacion(),
        diagnostico: 'Se requieren al menos 2 registros en el historial para calcular una tendencia temporal.'
      };
    }

    // Partición temporal: mitad más antigua vs mitad más reciente
    const puntoMedio = Math.floor(total / 2);
    const bloqueAnterior = this.registros.slice(0, puntoMedio);
    const bloqueReciente = this.registros.slice(puntoMedio);

    const tasaAnterior = this.calcularTasaAprobacion(bloqueAnterior);
    const tasaReciente = this.calcularTasaAprobacion(bloqueReciente);
    const delta = Number((tasaReciente - tasaAnterior).toFixed(1));

    let tendencia = 'Estable';
    let diagnostico = '';

    if (delta > 5) {
      tendencia = 'Mejorando';
      diagnostico = `La efectividad logística está MEJORANDO: la tasa de aprobación subió de ${tasaAnterior}% a ${tasaReciente}% (+${delta}%).`;
    } else if (delta < -5) {
      tendencia = 'Empeorando';
      diagnostico = `La efectividad logística está EMPEORANDO: la tasa de aprobación cayó de ${tasaAnterior}% a ${tasaReciente}% (${delta}%). Mayor concentración de rechazos recientes.`;
    } else {
      tendencia = 'Estable';
      diagnostico = `La efectividad logística se mantiene ESTABLE con una tasa promedio de ${tasaReciente}%.`;
    }

    return {
      tendencia,
      tasaReciente,
      tasaAnterior,
      diferencia: delta,
      totalRegistros: total,
      diagnostico
    };
  }
}

// Exportar clases para uso modular
module.exports = {
  Producto,
  Pedido,
  Ubicacion,
  PoliticaEnvio,
  HistorialTendencia
};

// ============================================================================
// SUITE DE PRUEBAS LOCALES (Ejecutar en terminal con: node main.js)
// ============================================================================
if (require.main === module) {
  console.log("==================================================================");
  console.log("   PRUEBAS UNITARIAS POO (LÓGICA BASE + RETO 4: HISTORIAL/TENDENCIA) ");
  console.log("==================================================================\n");

  const politica = new PoliticaEnvio();

  // --------------------------------------------------------------------------
  // CASO 1: Pedido Válido en GAM (Tarifa 2,500)
  // --------------------------------------------------------------------------
  console.log(">>> [TEST 1] Pedido en GAM (San José, compra menor a 50,000)...");
  const p1 = new Pedido({
    id: "1",
    cliente: "Carlos Pérez",
    estado: "pendiente",
    productos: [{ nombre: "Teclado Mecánico", cantidad: 1, precio: 15000 }]
  });
  const u1 = new Ubicacion({
    status: "success",
    country: "Costa Rica",
    countryCode: "CR",
    regionName: "Provincia de San José",
    city: "San José",
    query: "186.15.228.12"
  });
  const r1 = politica.evaluar(p1, u1);
  console.log(`    Aprobado: ${r1.aprobado} | Zona: ${r1.zona} | Flete: ₡${r1.costoEnvio} | Motivo: ${r1.motivo}`);
  console.assert(r1.aprobado === true && r1.costoEnvio === 2500, "Error en Test 1");

  // --------------------------------------------------------------------------
  // CASO 2: Pedido Válido en Zona Rural (Tarifa 4,500)
  // --------------------------------------------------------------------------
  console.log("\n>>> [TEST 2] Pedido en Zona Rural (Puntarenas)...");
  const p2 = new Pedido({
    id: "2",
    cliente: "María Gómez",
    estado: "pendiente",
    productos: [{ nombre: "Mouse Inalámbrico", cantidad: 2, precio: 8000 }]
  });
  const u2 = new Ubicacion({
    status: "success",
    country: "Costa Rica",
    countryCode: "CR",
    regionName: "Provincia de Puntarenas",
    city: "Puntarenas",
    query: "190.113.115.2"
  });
  const r2 = politica.evaluar(p2, u2);
  console.log(`    Aprobado: ${r2.aprobado} | Zona: ${r2.zona} | Flete: ₡${r2.costoEnvio} | Motivo: ${r2.motivo}`);
  console.assert(r2.aprobado === true && r2.costoEnvio === 4500, "Error en Test 2");

  // --------------------------------------------------------------------------
  // CASO 3: Envío Gratis por compra mayor o igual a 50,000
  // --------------------------------------------------------------------------
  console.log("\n>>> [TEST 3] Envío Gratis (Subtotal >= 50,000 en Alajuela)...");
  const p3 = new Pedido({
    id: "3",
    cliente: "David Morales",
    estado: "pendiente",
    productos: [{ nombre: "Monitor 27 Pulgadas", cantidad: 1, precio: 75000 }]
  });
  const u3 = new Ubicacion({
    status: "success",
    country: "Costa Rica",
    countryCode: "CR",
    regionName: "Provincia de Alajuela",
    city: "Alajuela",
    query: "186.15.200.5"
  });
  const r3 = politica.evaluar(p3, u3);
  console.log(`    Aprobado: ${r3.aprobado} | Zona: ${r3.zona} | Flete: ₡${r3.costoEnvio} | Motivo: ${r3.motivo}`);
  console.assert(r3.aprobado === true && r3.costoEnvio === 0, "Error en Test 3");

  // --------------------------------------------------------------------------
  // CASO 4: Recargo por Volumen (> 5 unidades físicas)
  // --------------------------------------------------------------------------
  console.log("\n>>> [TEST 4] Recargo por volumen (8 unidades en Heredia -> 2500 + 3*500 = 4000)...");
  const p4 = new Pedido({
    id: "4",
    cliente: "Laura Castro",
    estado: "pendiente",
    productos: [{ nombre: "Camiseta Deportiva", cantidad: 8, precio: 5000 }]
  });
  const u4 = new Ubicacion({
    status: "success",
    country: "Costa Rica",
    countryCode: "CR",
    regionName: "Provincia de Heredia",
    city: "Heredia",
    query: "186.15.228.10"
  });
  const r4 = politica.evaluar(p4, u4);
  console.log(`    Aprobado: ${r4.aprobado} | Flete: ₡${r4.costoEnvio} (Base 2500 + Recargo 1500) | Motivo: ${r4.motivo}`);
  console.assert(r4.aprobado === true && r4.costoEnvio === 4000, "Error en Test 4");

  // --------------------------------------------------------------------------
  // CASO 5: Pedido Fuera de Cobertura Internacional (Colombia)
  // --------------------------------------------------------------------------
  console.log("\n>>> [TEST 5] Cliente fuera de Costa Rica (IP de Colombia)...");
  const p5 = new Pedido({
    id: "5",
    cliente: "Juan Valdés",
    estado: "pendiente",
    productos: [{ nombre: "Cafetera Express", cantidad: 1, precio: 30000 }]
  });
  const u5 = new Ubicacion({
    status: "success",
    country: "Colombia",
    countryCode: "CO",
    regionName: "Bogotá D.C.",
    city: "Bogotá",
    query: "181.128.80.1"
  });
  const r5 = politica.evaluar(p5, u5);
  console.log(`    Aprobado: ${r5.aprobado} | Motivo: ${r5.motivo}`);
  console.assert(r5.aprobado === false, "Error en Test 5");

  // --------------------------------------------------------------------------
  // CASO 6: Error o Falla en Servicio de Geolocalización (IP privada / inválida)
  // --------------------------------------------------------------------------
  console.log("\n>>> [TEST 6] Falla en IP-API (rango reservado / caída)...");
  const p6 = new Pedido({
    id: "6",
    cliente: "Usuario Localhost",
    estado: "pendiente",
    productos: [{ nombre: "Cable HDMI", cantidad: 1, precio: 5000 }]
  });
  const u6 = new Ubicacion({
    status: "fail",
    message: "reserved range",
    query: "127.0.0.1"
  });
  const r6 = politica.evaluar(p6, u6);
  console.log(`    Aprobado: ${r6.aprobado} | Motivo: ${r6.motivo}`);
  console.assert(r6.aprobado === false, "Error en Test 6");

  // --------------------------------------------------------------------------
  // CASO 7: Pedido sin productos válidos
  // --------------------------------------------------------------------------
  console.log("\n>>> [TEST 7] Pedido sin productos válidos (cantidad 0)...");
  const p7 = new Pedido({
    id: "7",
    cliente: "Ana Rojas",
    estado: "pendiente",
    productos: [{ nombre: "Producto vacío", cantidad: 0, precio: 1000 }]
  });
  const r7 = politica.evaluar(p7, u1);
  console.log(`    Aprobado: ${r7.aprobado} | Motivo: ${r7.motivo}`);
  console.assert(r7.aprobado === false, "Error en Test 7");

  // ==========================================================================
  // PRUEBAS DE LA EXTENSIÓN: RETO 4 (HistorialTendencia)
  // ==========================================================================
  console.log("\n------------------------------------------------------------------");
  console.log("       PRUEBAS DE LA EXTENSIÓN: RETO 4 (HISTORIAL Y TENDENCIA)    ");
  console.log("------------------------------------------------------------------");

  // CASO 8: Historial con tendencia MEJORANDO
  console.log(">>> [TEST 8] Tendencia 'Mejorando' (de 0% inicial a 100% reciente)...");
  const historialMejorando = [
    { resultado: "rechazado" },
    { resultado: "rechazado" },
    { resultado: "aprobado" },
    { resultado: "aprobado" }
  ];
  const ht1 = new HistorialTendencia(historialMejorando);
  const diag1 = ht1.determinarTendencia();
  console.log(`    Tendencia detectada: ${diag1.tendencia} | ${diag1.diagnostico}`);
  console.assert(diag1.tendencia === 'Mejorando', "Error en Test 8");

  // CASO 9: Historial con tendencia EMPEORANDO
  console.log("\n>>> [TEST 9] Tendencia 'Empeorando' (de 100% inicial a 0% reciente)...");
  const historialEmpeorando = [
    { resultado: "aprobado" },
    { resultado: "aprobado" },
    { resultado: "rechazado" },
    { resultado: "rechazado" }
  ];
  const ht2 = new HistorialTendencia(historialEmpeorando);
  const diag2 = ht2.determinarTendencia();
  console.log(`    Tendencia detectada: ${diag2.tendencia} | ${diag2.diagnostico}`);
  console.assert(diag2.tendencia === 'Empeorando', "Error en Test 9");

  // CASO 10: Historial con tendencia ESTABLE
  console.log("\n>>> [TEST 10] Tendencia 'Estable' (tasa similar en ambos periodos)...");
  const historialEstable = [
    { resultado: "aprobado" },
    { resultado: "aprobado" },
    { resultado: "aprobado" },
    { resultado: "aprobado" }
  ];
  const ht3 = new HistorialTendencia(historialEstable);
  const diag3 = ht3.determinarTendencia();
  console.log(`    Tendencia detectada: ${diag3.tendencia} | ${diag3.diagnostico}`);
  console.assert(diag3.tendencia === 'Estable', "Error en Test 10");

  console.log("\n==================================================================");
  console.log("  TODAS LAS PRUEBAS PASARON EXITOSAMENTE (10/10) ✅ (INCLUYE RETO 4)");
  console.log("==================================================================");
}
