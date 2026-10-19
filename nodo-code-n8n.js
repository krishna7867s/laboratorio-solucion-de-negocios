/**
 * ============================================================================
 * NODO CODE DE n8n: EVALUAR COBERTURA, COSTO Y TENDENCIA HISTÓRICA (POO)
 * EXTENSIÓN: RETO 4 - HISTORIAL Y TENDENCIA
 * Archivo: nodo-code-n8n.js
 * 
 * Instrucciones: Copiar y pegar todo el contenido de este archivo directamente
 * en el editor del nodo "Evaluar cobertura y costo (POO)" en n8n.
 * ============================================================================
 */

// ===== 1. CLASES DE NEGOCIO POO =====

class Producto {
  constructor(data = {}) {
    this.nombre = data.nombre || 'Sin nombre';
    this.cantidad = Number(data.cantidad) || 0;
    this.precio = Number(data.precio) || 0;
  }
  calcularTotal() { 
    return this.cantidad * this.precio; 
  }
}

class Pedido {
  constructor(data = {}) {
    this.id = data.id;
    this.cliente = data.cliente || 'Desconocido';
    this.estado = data.estado || 'pendiente';
    this.productos = (data.productos || []).map(p => new Producto(p));
  }
  tieneProductos() { 
    return this.productos.some(p => p.cantidad > 0); 
  }
  calcularSubtotal() { 
    return this.productos.reduce((s, p) => s + p.calcularTotal(), 0); 
  }
  totalUnidades() { 
    return this.productos.reduce((s, p) => s + p.cantidad, 0); 
  }
  estaPendiente() { 
    return String(this.estado).trim().toLowerCase() === 'pendiente'; 
  }
}

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
  esValida() { 
    return this.status === 'success'; 
  }
  provinciaNormalizada() {
    return (this.region || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace('provincia de', '').replace('province', '').trim();
  }
}

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
      return { aprobado: false, motivo: 'No se pudo determinar la ubicación de la IP ' + (ubicacion.ip || '') + ' (' + (ubicacion.mensaje || 'sin detalle') + ')' };
    }
    if (ubicacion.codigoPais !== this.paisPermitido) {
      return { aprobado: false, motivo: 'Fuera de cobertura: solo despachamos dentro de Costa Rica (cliente ubicado en ' + (ubicacion.pais || 'Desconocido') + ')' };
    }
    const zona = this.buscarZona(ubicacion);
    if (!zona) {
      return { aprobado: false, motivo: 'Fuera de cobertura: la región "' + ubicacion.region + '" no está en nuestras zonas de despacho' };
    }
    const costo = this.calcularCosto(pedido, zona);
    return { 
      aprobado: true, 
      zona: zona.zona, 
      costoEnvio: costo, 
      motivo: costo === 0 ? 'Envío gratis por compra mayor o igual a 50000' : 'Envío a zona ' + zona.zona 
    };
  }
}

/**
 * RETO 4: Clase HistorialTendencia
 */
class HistorialTendencia {
  constructor(registros = []) {
    this.registros = Array.isArray(registros) ? registros : [];
  }
  calcularTasaAprobacion(lista = this.registros) {
    if (!lista || lista.length === 0) return 0;
    const aprobados = lista.filter(r => String(r.resultado || r.estado || '').toLowerCase() === 'aprobado').length;
    return Number(((aprobados / lista.length) * 100).toFixed(1));
  }
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

// ===== 2. APLICACIÓN SOBRE DATOS DEL WORKFLOW EN n8n =====

const pedidoRaw = $('Obtener pedido (JSON Server)').first().json;
const geoRaw = $('Geolocalizar IP (IP-API)').first().json;

// Obtener historial desde JSON Server (si existe el nodo Obtener historial)
let historialRaw = [];
try {
  historialRaw = $('Obtener historial (JSON Server)').all().map(item => item.json);
} catch (e) {
  historialRaw = [];
}

const pedido = new Pedido(pedidoRaw);
const ubicacion = new Ubicacion(geoRaw);
const resultado = new PoliticaEnvio().evaluar(pedido, ubicacion);
const subtotal = pedido.calcularSubtotal();

// Evaluación de tendencia temporal con la clase HistorialTendencia (Reto 4)
const analista = new HistorialTendencia(historialRaw);
const analisisTendencia = analista.determinarTendencia();

return [{ json: {
  pedidoId: pedido.id,
  cliente: pedido.cliente,
  aprobado: resultado.aprobado,
  motivo: resultado.motivo,
  zona: resultado.zona || null,
  subtotal: subtotal,
  costoEnvio: resultado.aprobado ? resultado.costoEnvio : null,
  total: resultado.aprobado ? subtotal + resultado.costoEnvio : null,
  ubicacion: { 
    pais: ubicacion.pais, 
    region: ubicacion.region, 
    ciudad: ubicacion.ciudad, 
    ip: ubicacion.ip 
  },
  tendencia: analisisTendencia,
  jsonServerUrl: $('Validar datos del pedido').first().json.jsonServerUrl
} }];
