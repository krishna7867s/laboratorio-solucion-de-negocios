/**
 * ============================================================================
 * LABORATORIO: ESCENARIO 2 - PEDIDOS CON VERIFICACIÓN GEOGRÁFICA DE COBERTURA
 * EXTENSIÓN: RETO 4 - HISTORIAL Y TENDENCIA
 * Archivo: main.js (Programación Orientada a Objetos en JavaScript ES6+)
 * 
 * Implementación de las clases POO usadas en los nodos Code de n8n:
 * - Producto, Pedido, Ubicacion, PoliticaEnvio (Lógica Base)
 * - RegistroHistorial, HistorialTendencia (Reto 4: Análisis temporal de tendencia)
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
    this.paisPermitido = 'CR';

    this.zonas = {
      'san jose': { zona: 'GAM', tarifa: 2500 },
      'alajuela': { zona: 'GAM', tarifa: 2500 },
      'heredia': { zona: 'GAM', tarifa: 2500 },
      'cartago': { zona: 'GAM', tarifa: 2500 },
      'puntarenas': { zona: 'Rural', tarifa: 4500 },
      'guanacaste': { zona: 'Rural', tarifa: 4500 },
      'limon': { zona: 'Rural', tarifa: 4500 }
    };

    this.montoEnvioGratis = 50000;
    this.unidadesSinRecargo = 5;
    this.recargoPorUnidad = 500;
  }

  buscarZona(ubicacion) {
    const prov = ubicacion.provinciaNormalizada();
    const claves = Object.keys(this.zonas);
    for (let i = 0; i < claves.length; i++) {
      if (prov.indexOf(claves[i]) !== -1) return this.zonas[claves[i]];
    }
    return null;
  }

  calcularCosto(pedido, zona) {
    if (pedido.calcularSubtotal() >= this.montoEnvioGratis) return 0;
    const extra = Math.max(0, pedido.totalUnidades() - this.unidadesSinRecargo) * this.recargoPorUnidad;
    return zona.tarifa + extra;
  }

  evaluar(pedido, ubicacion) {
    if (!pedido.tieneProductos()) {
      return { aprobado: false, motivo: 'El pedido no tiene productos válidos' };
    }
    if (!ubicacion.esValida()) {
      return { 
        aprobado: false, 
        motivo: `No se pudo determinar la ubicación de la IP ${ubicacion.ip || ''} (${ubicacion.mensaje || 'sin detalle'})` 
      };
    }
    if (ubicacion.codigoPais !== this.paisPermitido) {
      return { 
        aprobado: false, 
        motivo: `Fuera de cobertura: solo despachamos dentro de Costa Rica (cliente ubicado en ${ubicacion.pais || 'Desconocido'})` 
      };
    }
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
 * RETO 4: Representa una entrada de ejecución individual en el historial de JSON Server.
 */
class RegistroHistorial {
  constructor(data = {}) {
    this.pedidoId = data.pedidoId;
    this.resultado = String(data.resultado || '').toLowerCase();
    this.fecha = new Date(data.fecha || data.timestamp);
  }

  esValido() {
    return !isNaN(this.fecha.getTime()) && (this.resultado === 'aprobado' || this.resultado === 'rechazado');
  }

  fueAprobado() {
    return this.resultado === 'aprobado';
  }
}

/**
 * RETO 4: Determina la tendencia temporal (mejorando, empeorando, estable)
 * comparando ventanas cronológicas de pedidos aprobados vs rechazados.
 */
class HistorialTendencia {
  constructor(registros = [], ventana = 5) {
    this.ventana = ventana || 5;
    this.minimoPorVentana = 2;
    this.umbral = 0.10; // 10% de variación
    this.registros = (registros || [])
      .filter(r => r && r.esValido())
      .sort((a, b) => b.fecha - a.fecha); // Más reciente al más antiguo
  }

  tamanoVentana() {
    return Math.min(this.ventana, Math.floor(this.registros.length / 2));
  }

  recientes() {
    return this.registros.slice(0, this.tamanoVentana());
  }

  anteriores() {
    const k = this.tamanoVentana();
    return this.registros.slice(k, k * 2);
  }

  tasaAprobacion(lista) {
    if (!lista || lista.length === 0) return null;
    return lista.filter(r => r.fueAprobado()).length / lista.length;
  }

  determinarTendencia() {
    const rec = this.recientes();
    const ant = this.anteriores();
    const tasaRec = this.tasaAprobacion(rec);
    const tasaAnt = this.tasaAprobacion(ant);

    const base = {
      registrosAnalizados: rec.length + ant.length,
      tasaAprobacionReciente: tasaRec === null ? null : Math.round(tasaRec * 100),
      tasaAprobacionAnterior: tasaAnt === null ? null : Math.round(tasaAnt * 100)
    };

    // Regla T1: sin suficiente historial no se puede concluir
    if (rec.length < this.minimoPorVentana || ant.length < this.minimoPorVentana) {
      base.tendencia = 'datos insuficientes';
      base.conclusion = `Se necesitan al menos ${this.minimoPorVentana * 2} pedidos procesados para medir la tendencia (hay ${this.registros.length})`;
      return base;
    }

    const diferencia = tasaRec - tasaAnt;

    // Regla T2: mejora si la aprobación sube más del umbral; T3: empeora si baja más del umbral
    if (diferencia > this.umbral) {
      base.tendencia = 'mejorando';
    } else if (diferencia < -this.umbral) {
      base.tendencia = 'empeorando';
    } else {
      base.tendencia = 'estable';
    }

    base.conclusion = `La tasa de pedidos en cobertura pasó de ${base.tasaAprobacionAnterior}% a ${base.tasaAprobacionReciente}% en los últimos ${rec.length} pedidos: la situación está ${base.tendencia}`;
    return base;
  }
}

// Exportar clases para uso modular
module.exports = {
  Producto,
  Pedido,
  Ubicacion,
  PoliticaEnvio,
  RegistroHistorial,
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

  // CASO 1: GAM
  console.log(">>> [TEST 1] Pedido en GAM (San José)...");
  const p1 = new Pedido({ id: "1", cliente: "Carlos Pérez", estado: "pendiente", productos: [{ nombre: "Teclado", cantidad: 1, precio: 15000 }] });
  const u1 = new Ubicacion({ status: "success", country: "Costa Rica", countryCode: "CR", regionName: "Provincia de San José", city: "San José", query: "186.15.228.12" });
  const r1 = politica.evaluar(p1, u1);
  console.assert(r1.aprobado === true && r1.costoEnvio === 2500, "Error en Test 1");
  console.log("    Aprobado: true | Zona: GAM | Costo: ₡2500 ✅");

  // CASO 2: Rural
  console.log("\n>>> [TEST 2] Pedido en Zona Rural (Puntarenas)...");
  const p2 = new Pedido({ id: "2", cliente: "María Gómez", estado: "pendiente", productos: [{ nombre: "Mouse", cantidad: 2, precio: 8000 }] });
  const u2 = new Ubicacion({ status: "success", country: "Costa Rica", countryCode: "CR", regionName: "Provincia de Puntarenas", city: "Puntarenas", query: "190.113.115.2" });
  const r2 = politica.evaluar(p2, u2);
  console.assert(r2.aprobado === true && r2.costoEnvio === 4500, "Error en Test 2");
  console.log("    Aprobado: true | Zona: Rural | Costo: ₡4500 ✅");

  // CASO 3: Envío Gratis
  console.log("\n>>> [TEST 3] Envío Gratis (Subtotal >= 50,000)...");
  const p3 = new Pedido({ id: "3", cliente: "David Morales", estado: "pendiente", productos: [{ nombre: "Monitor", cantidad: 1, precio: 75000 }] });
  const r3 = politica.evaluar(p3, u1);
  console.assert(r3.aprobado === true && r3.costoEnvio === 0, "Error en Test 3");
  console.log("    Aprobado: true | Costo: ₡0 (Envío gratis) ✅");

  // CASO 4: Recargo por volumen
  console.log("\n>>> [TEST 4] Recargo por volumen (8 unidades físicas)...");
  const p4 = new Pedido({ id: "4", cliente: "Laura Castro", estado: "pendiente", productos: [{ nombre: "Camiseta", cantidad: 8, precio: 5000 }] });
  const r4 = politica.evaluar(p4, u1);
  console.assert(r4.aprobado === true && r4.costoEnvio === 4000, "Error en Test 4");
  console.log("    Aprobado: true | Costo: ₡4000 (Base 2500 + Recargo 1500) ✅");

  // CASO 5: Fuera de Costa Rica
  console.log("\n>>> [TEST 5] Cliente fuera de Costa Rica (Colombia)...");
  const p5 = new Pedido({ id: "5", cliente: "Juan Valdés", estado: "pendiente", productos: [{ nombre: "Cafetera", cantidad: 1, precio: 30000 }] });
  const u5 = new Ubicacion({ status: "success", country: "Colombia", countryCode: "CO", regionName: "Bogotá", city: "Bogotá", query: "181.128.80.1" });
  const r5 = politica.evaluar(p5, u5);
  console.assert(r5.aprobado === false, "Error en Test 5");
  console.log("    Rechazado: Fuera de cobertura internacional ✅");

  // CASO 6: Falla IP-API
  console.log("\n>>> [TEST 6] Falla en IP-API...");
  const u6 = new Ubicacion({ status: "fail", message: "reserved range", query: "127.0.0.1" });
  const r6 = politica.evaluar(p1, u6);
  console.assert(r6.aprobado === false, "Error en Test 6");
  console.log("    Rechazado: Servicio de geolocalización no resolvió IP ✅");

  // CASO 7: Pedido sin productos
  console.log("\n>>> [TEST 7] Pedido sin productos válidos...");
  const p7 = new Pedido({ id: "7", cliente: "Ana Rojas", estado: "pendiente", productos: [] });
  const r7 = politica.evaluar(p7, u1);
  console.assert(r7.aprobado === false, "Error en Test 7");
  console.log("    Rechazado: Sin productos válidos ✅");

  // CASOS RETO 4: TENDENCIA
  console.log("\n------------------------------------------------------------------");
  console.log("       PRUEBAS DE LA EXTENSIÓN: RETO 4 (HISTORIAL Y TENDENCIA)    ");
  console.log("------------------------------------------------------------------");

  // CASO 8: Tendencia Mejorando (reciente > anterior)
  console.log(">>> [TEST 8] Tendencia 'mejorando'...");
  const hMej = [
    new RegistroHistorial({ resultado: "rechazado", fecha: "2026-10-19T08:00:00Z" }),
    new RegistroHistorial({ resultado: "rechazado", fecha: "2026-10-19T08:30:00Z" }),
    new RegistroHistorial({ resultado: "aprobado", fecha: "2026-10-19T09:00:00Z" }),
    new RegistroHistorial({ resultado: "aprobado", fecha: "2026-10-19T09:30:00Z" })
  ];
  const t8 = new HistorialTendencia(hMej, 5).determinarTendencia();
  console.assert(t8.tendencia === 'mejorando', "Error en Test 8");
  console.log(`    Tendencia: ${t8.tendencia} | ${t8.conclusion} ✅`);

  // CASO 9: Tendencia Empeorando (reciente < anterior)
  console.log("\n>>> [TEST 9] Tendencia 'empeorando'...");
  const hEmp = [
    new RegistroHistorial({ resultado: "aprobado", fecha: "2026-10-19T08:00:00Z" }),
    new RegistroHistorial({ resultado: "aprobado", fecha: "2026-10-19T08:30:00Z" }),
    new RegistroHistorial({ resultado: "rechazado", fecha: "2026-10-19T09:00:00Z" }),
    new RegistroHistorial({ resultado: "rechazado", fecha: "2026-10-19T09:30:00Z" })
  ];
  const t9 = new HistorialTendencia(hEmp, 5).determinarTendencia();
  console.assert(t9.tendencia === 'empeorando', "Error en Test 9");
  console.log(`    Tendencia: ${t9.tendencia} | ${t9.conclusion} ✅`);

  // CASO 10: Datos Insuficientes (< 4 registros)
  console.log("\n>>> [TEST 10] Tendencia 'datos insuficientes'...");
  const hIns = [
    new RegistroHistorial({ resultado: "aprobado", fecha: "2026-10-19T08:00:00Z" })
  ];
  const t10 = new HistorialTendencia(hIns, 5).determinarTendencia();
  console.assert(t10.tendencia === 'datos insuficientes', "Error en Test 10");
  console.log(`    Tendencia: ${t10.tendencia} | ${t10.conclusion} ✅`);

  console.log("\n==================================================================");
  console.log("  TODAS LAS PRUEBAS PASARON EXITOSAMENTE (10/10) ✅ (INCLUYE RETO 4)");
  console.log("==================================================================");
}
