/**
 * Genera el enlace wa.me para enviar recibo de abono por WhatsApp
 * @param {Object} data
 * @param {string} data.telefono
 * @param {string} data.clienteNombre
 * @param {string} data.productoNombre
 * @param {number} data.montoAbono
 * @param {number} data.saldoRestante
 * @param {string} data.vendedorNombre
 * @param {string} [data.numeroRecibo]
 */
export const buildWhatsAppReceiptUrl = ({
  telefono,
  clienteNombre,
  productoNombre,
  montoAbono,
  saldoRestante,
  vendedorNombre,
  numeroRecibo = ''
}) => {
  // Limpiar caracteres no numéricos del teléfono
  const cleanPhone = String(telefono).replace(/\D/g, '');

  const fecha = new Date().toLocaleDateString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const mensaje = 
` *RECIBO DIGITAL DE ABONO*
----------------------------------
*Recibo:* #${numeroRecibo || Date.now().toString().slice(-6)}
*Fecha:* ${fecha}
*Cliente:* ${clienteNombre}
*Artículo:* ${productoNombre}
*Abono recibido:* C$ ${Number(montoAbono).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
*Saldo pendiente:* C$ ${Number(saldoRestante).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
*Atendido por:* ${vendedorNombre}
----------------------------------
¡Muchas gracias por su puntualidad y preferencia!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`;
};
