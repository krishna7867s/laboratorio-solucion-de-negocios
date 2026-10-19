/**
 * ============================================================================
 * NODO CODE DE n8n: EVALUAR COBERTURA Y COSTO (POO)
 * Archivo: nodo-code-n8n.js
 * 
 * Instrucciones: Copiar y pegar todo el contenido de este archivo directamente
 * en el editor del nodo "Evaluar cobertura y costo (POO)" en n8n.
 * ============================================================================
 */

// ===== Clases POO (misma lógica que main.js) =====
class Producto {
  constructor(data) {
    this.nombre = data.nombre || 'Sin nombre';
    this.cantidad = Number(data.cantidad) || 0;
    this.precio = Number(data.precio) || 0;
  }
  calcularTotal() { 
    return this.cantidad * this.precio; 
  }
}

class Pedido {
  constructor(data) {
    this.id = data.id;
    this.cliente = data.cliente;
    this.estado = data.estado;
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
    return String(this.estado).toLowerCase() === 'pendiente'; 
  }
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
    // Regla 5: envío gratis si el subtotal alcanza el mínimo (>= 50000)
    if (pedido.calcularSubtotal() >= this.montoEnvioGratis) return 0;
    // Regla 6: recargo por unidades adicionales (> 5 unidades)
    const extra = Math.max(0, pedido.totalUnidades() - this.unidadesSinRecargo) * this.recargoPorUnidad;
    return zona.tarifa + extra;
  }
  evaluar(pedido, ubicacion) {
    // Regla 1: el pedido debe tener productos
    if (!pedido.tieneProductos()) {
      return { aprobado: false, motivo: 'El pedido no tiene productos válidos' };
    }
    // Regla 2: la IP debe poder geolocalizarse (situación inesperada)
    if (!ubicacion.esValida()) {
      return { aprobado: false, motivo: 'No se pudo determinar la ubicación de la IP ' + (ubicacion.ip || '') + ' (' + (ubicacion.mensaje || 'sin detalle') + ')' };
    }
    // Regla 3: solo se despacha dentro del país permitido (Costa Rica)
    if (ubicacion.codigoPais !== this.paisPermitido) {
      return { aprobado: false, motivo: 'Fuera de cobertura: solo despachamos dentro de Costa Rica (cliente ubicado en ' + (ubicacion.pais || 'Desconocido') + ')' };
    }
    // Regla 4: la provincia debe estar en una zona con cobertura (GAM o Rural)
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

// ===== Aplicación sobre los datos reales en n8n =====
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
  ubicacion: { 
    pais: ubicacion.pais, 
    region: ubicacion.region, 
    ciudad: ubicacion.ciudad, 
    ip: ubicacion.ip 
  },
  jsonServerUrl: $('Validar datos del pedido').first().json.jsonServerUrl
} }];
