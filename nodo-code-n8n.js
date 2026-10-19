/**
 * ============================================================================
 * NODOS CODE DE n8n: LÓGICA POO Y ANÁLISIS DE TENDENCIA (RETO 4)
 * Archivo: nodo-code-n8n.js
 * ============================================================================
 */

// ============================================================================
// PARTE 1: NODO "Evaluar cobertura y costo (POO)"
// Copiar este bloque dentro del nodo "Evaluar cobertura y costo (POO)"
// ============================================================================

/*
// ===== Clases POO (misma lógica que main.js) =====
class Producto {
  constructor(data) {
    this.nombre = data.nombre || 'Sin nombre';
    this.cantidad = Number(data.cantidad) || 0;
    this.precio = Number(data.precio) || 0;
  }
  calcularTotal() { return this.cantidad * this.precio; }
}

class Pedido {
  constructor(data) {
    this.id = data.id;
    this.cliente = data.cliente;
    this.estado = data.estado;
    this.productos = (data.productos || []).map(function (p) { return new Producto(p); });
  }
  tieneProductos() { return this.productos.some(function (p) { return p.cantidad > 0; }); }
  calcularSubtotal() { return this.productos.reduce(function (s, p) { return s + p.calcularTotal(); }, 0); }
  totalUnidades() { return this.productos.reduce(function (s, p) { return s + p.cantidad; }, 0); }
  estaPendiente() { return String(this.estado).toLowerCase() === 'pendiente'; }
}

class Ubicacion {
  constructor(data) {
    this.status = data.status;
    this.mensaje = data.message;
    this.pais = data.country;
    this.codigoPais = data.countryCode;
    this.region = data.regionName || '';
    this.ciudad = data.city || '';
    this.ip = data.query;
  }
  esValida() { return this.status === 'success'; }
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
    if (!pedido.tieneProductos()) return { aprobado: false, motivo: 'El pedido no tiene productos válidos' };
    if (!ubicacion.esValida()) return { aprobado: false, motivo: 'No se pudo determinar la ubicación de la IP ' + (ubicacion.ip || '') + ' (' + (ubicacion.mensaje || 'sin detalle') + ')' };
    if (ubicacion.codigoPais !== this.paisPermitido) return { aprobado: false, motivo: 'Fuera de cobertura: solo despachamos dentro de Costa Rica (cliente ubicado en ' + (ubicacion.pais || 'Desconocido') + ')' };
    const zona = this.buscarZona(ubicacion);
    if (!zona) return { aprobado: false, motivo: 'Fuera de cobertura: la región "' + ubicacion.region + '" no está en nuestras zonas de despacho' };
    const costo = this.calcularCosto(pedido, zona);
    return { aprobado: true, zona: zona.zona, costoEnvio: costo, motivo: costo === 0 ? 'Envío gratis por compra mayor o igual a 50000' : 'Envío a zona ' + zona.zona };
  }
}

// ===== Aplicación sobre los datos reales =====
const pedido = new Pedido($('Obtener pedido (JSON Server)').first().json);
const ubicacion = new Ubicacion($input.first().json);
const resultado = new PoliticaEnvio().evaluar(pedido, ubicacion);
const subtotal = pedido.calcularSubtotal();

return [{ json: {
  pedidoId: pedido.id,
  cliente: pedido.cliente,
  aprobado: resultado.aprobado,
  motivo: resultado.motivo,
  zona: resultado.zona || null,
  subtotal: subtotal,
  costoEnvio: resultado.aprobado ? resultado.costoEnvio : null,
  total: resultado.aprobado ? subtotal + resultado.costoEnvio : null,
  ubicacion: { pais: ubicacion.pais, region: ubicacion.region, ciudad: ubicacion.ciudad, ip: ubicacion.ip },
  jsonServerUrl: $('Validar datos del pedido').first().json.jsonServerUrl
} }];
*/

// ============================================================================
// PARTE 2: NODO "Analizar tendencia (POO)"
// Copiar este bloque dentro del nodo "Analizar tendencia (POO)"
// ============================================================================

/*
// ===== Clases POO del Reto 4 (misma lógica que main.js) =====
class RegistroHistorial {
  constructor(data) {
    this.pedidoId = data.pedidoId;
    this.resultado = String(data.resultado || '').toLowerCase();
    this.fecha = new Date(data.fecha || data.timestamp);
  }
  esValido() { return !isNaN(this.fecha.getTime()) && (this.resultado === 'aprobado' || this.resultado === 'rechazado'); }
  fueAprobado() { return this.resultado === 'aprobado'; }
}

class HistorialTendencia {
  constructor(registros, ventana) {
    this.ventana = ventana || 5;
    this.minimoPorVentana = 2;
    this.umbral = 0.10;
    this.registros = (registros || [])
      .filter(function (r) { return r && r.esValido(); })
      .sort(function (a, b) { return b.fecha - a.fecha; });
  }
  tamanoVentana() { return Math.min(this.ventana, Math.floor(this.registros.length / 2)); }
  recientes() { return this.registros.slice(0, this.tamanoVentana()); }
  anteriores() { const k = this.tamanoVentana(); return this.registros.slice(k, k * 2); }
  tasaAprobacion(lista) {
    if (lista.length === 0) return null;
    return lista.filter(function (r) { return r.fueAprobado(); }).length / lista.length;
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
    if (rec.length < this.minimoPorVentana || ant.length < this.minimoPorVentana) {
      base.tendencia = 'datos insuficientes';
      base.conclusion = 'Se necesitan al menos ' + (this.minimoPorVentana * 2) + ' pedidos procesados para medir la tendencia (hay ' + this.registros.length + ')';
      return base;
    }
    const diferencia = tasaRec - tasaAnt;
    if (diferencia > this.umbral) base.tendencia = 'mejorando';
    else if (diferencia < -this.umbral) base.tendencia = 'empeorando';
    else base.tendencia = 'estable';
    base.conclusion = 'La tasa de pedidos en cobertura pasó de ' + base.tasaAprobacionAnterior + '% a ' + base.tasaAprobacionReciente + '% en los últimos ' + rec.length + ' pedidos: la situación está ' + base.tendencia;
    return base;
  }
}

// ===== Aplicación sobre los datos reales =====
const evaluacion = $('Evaluar cobertura y costo (POO)').first().json;
const registros = $input.all()
  .map(function (i) { return i.json; })
  .filter(function (j) { return j && (j.resultado || j.estado); })
  .map(function (j) { return new RegistroHistorial(j); });
const tendencia = new HistorialTendencia(registros, 5).determinarTendencia();

return [{ json: {
  aprobado: evaluacion.aprobado,
  motivo: evaluacion.motivo,
  pedido: evaluacion,
  tendencia: tendencia
} }];
*/
