import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Document from '../models/Document.js';
import FileService from '../services/fileService.js';
import NotificationService from '../services/notificationService.js';

// ============================================================================
// SECCIÓN: CONTROLADOR DE REPORTES
// ============================================================================
// Este archivo maneja la generación de reportes en diferentes formatos (Excel, PDF, CSV)
// a partir de los documentos del sistema. Incluye filtrado avanzado, formateo de datos
// y creación de archivos listos para descarga con diseño profesional.
// ============================================================================

class ReportController {
  
  // ********************************************************************
  // MÓDULO 1: FILTRADO DE DOCUMENTOS PARA REPORTES
  // ********************************************************************
  // Descripción: Función centralizada que aplica filtros a los documentos
  // según parámetros específicos del reporte. Construye queries dinámicos
  // basados en el tipo de reporte solicitado y devuelve los documentos
  // con datos poblados de personas relacionadas.
  // ********************************************************************
  static async filterDocuments(filters) {
    try {
      console.log('🔍 ReportController.filterDocuments - Iniciando filtrado con:', filters);
      
      // ----------------------------------------------------------------
      // BLOQUE 1.1: Construcción inicial del query base
      // ----------------------------------------------------------------
      // Siempre filtra por documentos activos como condición base.
      // Todos los reportes deben excluir documentos eliminados o inactivos.
      let query = { activo: true };
      
      // ----------------------------------------------------------------
      // BLOQUE 1.2: Aplicación de filtros por tipo de reporte
      // ----------------------------------------------------------------
      // Según el reportType proporcionado, aplica filtros específicos:
      // - byCategory: Filtra por categoría específica
      // - byPerson: Filtra por persona asignada
      // - expiring: Filtra documentos próximos a vencer (dentro de X días)
      // - expired: Filtra documentos ya vencidos
      if (filters.reportType === 'byCategory' && filters.category) {
        query.categoria = filters.category;
      }

      if (filters.reportType === 'byPerson' && filters.person) {
        // NOTA: Se usa una sintaxis especial porque persona_id es un campo
        // poblado (referencia a otra colección). El filtro exacto se aplica
        // posteriormente en memoria.
        query['persona_id._id'] = filters.person;
      }

      if (filters.reportType === 'expiring' && filters.days) {
        // Calcula rango de fechas para documentos que vencen dentro de X días
        const now = new Date();
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + parseInt(filters.days));
        query.fecha_vencimiento = {
          $gte: now,      // Mayor o igual a hoy
          $lte: limitDate // Menor o igual a la fecha límite
        };
      }

      if (filters.reportType === 'expired') {
        // Documentos cuya fecha de vencimiento ya pasó
        const now = new Date();
        query.fecha_vencimiento = { $lt: now };
      }

      // ----------------------------------------------------------------
      // BLOQUE 1.3: Filtro adicional por rango de fechas
      // ----------------------------------------------------------------
      // Filtro opcional que puede combinarse con otros filtros.
      // Permite restringir documentos a un período específico de subida.
      if (filters.dateFrom || filters.dateTo) {
        query.fecha_subida = {};
        if (filters.dateFrom) query.fecha_subida.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.fecha_subida.$lte = new Date(filters.dateTo);
      }

      console.log('📝 Query de búsqueda:', JSON.stringify(query, null, 2));
      
      // ----------------------------------------------------------------
      // BLOQUE 1.4: Ejecución de consulta con población de datos
      // ----------------------------------------------------------------
      // Busca documentos aplicando el query construido, popula los datos
      // de la persona relacionada (solo campos específicos para optimización)
      // y ordena por fecha de subida descendente (más recientes primero).
      let documents = await Document.find(query)
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ fecha_subida: -1 });

      console.log(`✅ Encontrados ${documents.length} documentos`);

      // ----------------------------------------------------------------
      // BLOQUE 1.5: Filtrado en memoria para casos especiales
      // ----------------------------------------------------------------
      // Para el filtro por persona, MongoDB no puede hacer el match directo
      // con campos poblados usando string IDs, así que se filtra en memoria
      // después de obtener los resultados.
      if (filters.reportType === 'byPerson' && filters.person) {
        documents = documents.filter(doc => {
          return doc.persona_id && doc.persona_id._id.toString() === filters.person;
        });
        console.log(`📊 Documentos después de filtrar por persona: ${documents.length}`);
      }

      return documents;

    } catch (error) {
      console.error('❌ Error en ReportController.filterDocuments:', error);
      throw error;
    }
  }

  // ********************************************************************
  // MÓDULO 2: GENERACIÓN DE REPORTE EN EXCEL
  // ********************************************************************
  // Descripción: Crea un reporte profesional en formato Excel (.xlsx) con
  // formato avanzado, colores condicionales, estilos y estadísticas.
  // Ideal para análisis detallado y procesamiento posterior en hojas de cálculo.
  // ********************************************************************
  static async generateExcel(req, res) {
    try {
      console.log('📊 ReportController.generateExcel - Iniciando...');
      console.log('📋 Filtros recibidos:', req.body);
      
      // ----------------------------------------------------------------
      // BLOQUE 2.1: Obtención de documentos filtrados
      // ----------------------------------------------------------------
      // Llama a la función de filtrado centralizada pasando los parámetros
      // del cuerpo de la solicitud (req.body).
      const documents = await ReportController.filterDocuments(req.body);

      // Validación de resultados: si no hay documentos, responde con error 404
      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados'
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 2.2: Configuración inicial del libro de Excel
      // ----------------------------------------------------------------
      // Crea un nuevo libro de trabajo con metadatos básicos.
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CBTIS051';
      workbook.created = new Date();

      // Añade una hoja de cálculo con nombre descriptivo.
      const worksheet = workbook.addWorksheet('Documentos');

      // ----------------------------------------------------------------
      // BLOQUE 2.3: Definición de estilos para encabezados
      // ----------------------------------------------------------------
      // Estilo profesional para la fila de encabezados: texto blanco en
      // fondo morado (#4F46E5), negrita, centrado y bordes delgados.
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // ----------------------------------------------------------------
      // BLOQUE 2.4: Título y subtítulo del reporte
      // ----------------------------------------------------------------
      // Crea una celda combinada para el título principal con formato destacado.
      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Reporte de Documentos - CBTIS051`;
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF4F46E5' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Celda combinada para la fecha de generación del reporte.
      worksheet.mergeCells('A2:H2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `Generado el ${FileService.formatDate(new Date())}`;
      subtitleCell.font = { size: 11, italic: true };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Línea en blanco para separar título de datos.
      worksheet.addRow([]);

      // ----------------------------------------------------------------
      // BLOQUE 2.5: Encabezados de columnas
      // ----------------------------------------------------------------
      // Define los nombres de las columnas según la estructura de datos.
      const headers = ['Nombre del Documento', 'Tipo', 'Tamaño', 'Categoría', 'Persona Asignada', 'Fecha de Subida', 'Fecha de Vencimiento', 'Estado'];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 25; // Altura mayor para mejor visibilidad
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });

      // ----------------------------------------------------------------
      // BLOQUE 2.6: Procesamiento de datos y llenado de filas
      // ----------------------------------------------------------------
      // Itera sobre cada documento para crear una fila en la hoja de cálculo.
      documents.forEach((doc, index) => {
        // Formateo de datos para presentación amigable
        const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
        const vencimiento = doc.fecha_vencimiento ? FileService.formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';
        
        // Cálculo de estado con lógica condicional
        let estado = 'Activo';
        let estadoColor = 'FF10B981'; // Verde por defecto (hex sin #)
        if (doc.fecha_vencimiento) {
          const now = new Date();
          const vencimientoDate = new Date(doc.fecha_vencimiento);
          const diff = Math.ceil((vencimientoDate - now) / (1000 * 60 * 60 * 24));
          if (diff <= 0) {
            estado = 'Vencido';
            estadoColor = 'FFEF4444'; // Rojo
          } else if (diff <= 7) {
            estado = 'Por vencer';
            estadoColor = 'FFF59E0B'; // Amarillo
          }
        }

        // Creación de la fila con datos formateados
        const row = worksheet.addRow([
          doc.nombre_original,
          doc.tipo_archivo ? doc.tipo_archivo.toUpperCase() : 'DESCONOCIDO',
          FileService.formatFileSize(doc.tamano_archivo || 0),
          doc.categoria || 'Sin categoría',
          person,
          FileService.formatDate(doc.fecha_subida || doc.createdAt),
          vencimiento,
          estado
        ]);

        // ----------------------------------------------------------------
        // BLOQUE 2.7: Aplicación de colores condicionales
        // ----------------------------------------------------------------
        // Resalta visualmente documentos vencidos (fondo rojo claro)
        // y documentos por vencer (fondo amarillo claro).
        if (estado === 'Vencido') {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
          });
        } else if (estado === 'Por vencer') {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          });
        }

        // Aplicar bordes a todas las celdas de la fila
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        
        // Log de progreso para reportes muy grandes
        if (index % 50 === 0) {
          console.log(`📄 Procesando documento ${index + 1} de ${documents.length}`);
        }
      });

      // ----------------------------------------------------------------
      // BLOQUE 2.8: Ajuste de ancho de columnas
      // ----------------------------------------------------------------
      // Define anchos personalizados para cada columna para mejor legibilidad.
      worksheet.columns = [
        { width: 40 },  // Nombre del Documento
        { width: 10 },  // Tipo
        { width: 12 },  // Tamaño
        { width: 20 },  // Categoría
        { width: 25 },  // Persona Asignada
        { width: 20 },  // Fecha de Subida
        { width: 20 },  // Fecha de Vencimiento
        { width: 15 }   // Estado
      ];

      // ----------------------------------------------------------------
      // BLOQUE 2.9: Agregar estadísticas finales
      // ----------------------------------------------------------------
      // Línea en blanco y fila con el total de documentos procesados.
      worksheet.addRow([]);
      const statsRow = worksheet.addRow(['Total de documentos:', documents.length]);
      statsRow.getCell(1).font = { bold: true };
      statsRow.getCell(1).alignment = { horizontal: 'right' };
      statsRow.getCell(2).font = { bold: true };

      // ----------------------------------------------------------------
      // BLOQUE 2.10: Configuración de headers HTTP para descarga
      // ----------------------------------------------------------------
      // Establece el tipo MIME correcto para Excel y un nombre de archivo
      // con timestamp para evitar caché y conflictos de nombres.
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.xlsx`);

      // ----------------------------------------------------------------
      // BLOQUE 2.11: Escritura del archivo y envío al cliente
      // ----------------------------------------------------------------
      console.log('💾 Guardando archivo Excel...');
      await workbook.xlsx.write(res);
      res.end();

      console.log(`✅ Reporte Excel generado exitosamente con ${documents.length} documentos`);

      // ----------------------------------------------------------------
      // BLOQUE 2.12: Notificación de actividad (opcional)
      // ----------------------------------------------------------------
      // Intenta crear una notificación en el sistema sobre la generación
      // del reporte. Si falla, solo se registra el error sin afectar
      // la operación principal.
      try {
        await NotificationService.reporteGenerado(req.body.reportType, 'excel', documents.length);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

    } catch (error) {
      console.error('❌ Error generando reporte Excel:', error);
      console.error('📋 Stack trace:', error.stack);
      
      // Respuesta de error detallada en desarrollo, genérica en producción
      res.status(500).json({ 
        success: false, 
        message: 'Error al generar reporte Excel: ' + error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // ********************************************************************
  // MÓDULO 3: GENERACIÓN DE REPORTE EN PDF
  // ********************************************************************
  // Descripción: Crea un reporte en formato PDF con diseño profesional,
  // paginación automática, encabezados y pies de página. Ideal para
  // impresión, archivado o distribución formal.
  // ********************************************************************
  static async generatePDF(req, res) {
    try {
      console.log('📊 ReportController.generatePDF - Iniciando...');
      
      // ----------------------------------------------------------------
      // BLOQUE 3.1: Obtención de documentos filtrados
      // ----------------------------------------------------------------
      const documents = await ReportController.filterDocuments(req.body);

      // Validación de resultados
      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados'
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.2: Configuración inicial del documento PDF
      // ----------------------------------------------------------------
      // Crea un nuevo documento PDF con márgenes de 50px y tamaño A4.
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Configura headers HTTP para descarga de PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.pdf`);

      // Conecta el stream del PDF directamente a la respuesta HTTP
      doc.pipe(res);

      // ----------------------------------------------------------------
      // BLOQUE 3.3: Encabezado y título del reporte
      // ----------------------------------------------------------------
      // Título principal con nombre del sistema y escuela
      doc.fontSize(20)
        .fillColor('#4F46E5')
        .text('Sistema de Gestión de Documentos', { align: 'center' })
        .fontSize(16)
        .text('CBTIS051', { align: 'center' })
        .moveDown(0.5);

      // Fecha de generación del reporte
      doc.fontSize(12)
        .fillColor('#000000')
        .text(`Reporte generado el ${FileService.formatDate(new Date())}`, { align: 'center' })
        .moveDown(1);

      // ----------------------------------------------------------------
      // BLOQUE 3.4: Título específico según tipo de reporte
      // ----------------------------------------------------------------
      // Determina el título adecuado basado en el tipo de filtro aplicado.
      let reportTitle = 'Reporte General';
      if (req.body.reportType === 'byCategory') reportTitle = `Reporte por Categoría${req.body.category ? ': ' + req.body.category : ''}`;
      if (req.body.reportType === 'byPerson') reportTitle = 'Reporte por Persona';
      if (req.body.reportType === 'expiring') reportTitle = `Documentos por Vencer (${req.body.days || 30} días)`;
      if (req.body.reportType === 'expired') reportTitle = 'Documentos Vencidos';

      // Escribe el título con subrayado para énfasis
      doc.fontSize(14)
        .fillColor('#4F46E5')
        .text(reportTitle, { underline: true })
        .moveDown(1);

      // ----------------------------------------------------------------
      // BLOQUE 3.5: Estadísticas del reporte
      // ----------------------------------------------------------------
      doc.fontSize(11)
        .fillColor('#000000')
        .text(`Total de documentos en este reporte: ${documents.length}`, { continued: false })
        .moveDown(0.5);

      // ----------------------------------------------------------------
      // BLOQUE 3.6: Línea separadora visual
      // ----------------------------------------------------------------
      doc.moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // ----------------------------------------------------------------
      // BLOQUE 3.7: Lista detallada de documentos
      // ----------------------------------------------------------------
      documents.forEach((document, index) => {
        // Verifica si hay espacio suficiente en la página actual
        // Si el cursor está cerca del fondo, crea una nueva página
        if (doc.y > 700) {
          doc.addPage();
        }

        // Formateo de datos para presentación
        const person = document.persona_id ? document.persona_id.nombre : 'No asignado';
        const vencimiento = document.fecha_vencimiento ? FileService.formatDate(document.fecha_vencimiento) : 'Sin vencimiento';
        
        // Cálculo de estado con colores correspondientes
        let estado = 'Activo';
        let estadoColor = '#10B981';
        if (document.fecha_vencimiento) {
          const now = new Date();
          const vencimientoDate = new Date(document.fecha_vencimiento);
          const diff = Math.ceil((vencimientoDate - now) / (1000 * 60 * 60 * 24));
          if (diff <= 0) {
            estado = 'Vencido';
            estadoColor = '#EF4444';
          } else if (diff <= 7) {
            estado = 'Por vencer';
            estadoColor = '#F59E0B';
          }
        }

        // ----------------------------------------------------------------
        // BLOQUE 3.8: Formato de cada documento en el PDF
        // ----------------------------------------------------------------
        // Número de documento (índice + 1) en gris
        doc.fontSize(10)
          .fillColor('#6B7280')
          .text(`${index + 1}.`, 50, doc.y, { continued: true })
          .fillColor('#000000')
          .fontSize(11)
          .text(` ${document.nombre_original}`, { bold: true });

        // Detalles del documento con sangría
        doc.fontSize(9)
          .fillColor('#6B7280')
          .text(`   Tipo: ${document.tipo_archivo ? document.tipo_archivo.toUpperCase() : 'DESCONOCIDO'} | Tamaño: ${FileService.formatFileSize(document.tamano_archivo || 0)}`, { indent: 15 })
          .text(`   Categoría: ${document.categoria || 'Sin categoría'}`, { indent: 15 })
          .text(`   Asignado a: ${person}`, { indent: 15 })
          .text(`   Fecha de subida: ${FileService.formatDate(document.fecha_subida || document.createdAt)}`, { indent: 15 })
          .text(`   Vencimiento: ${vencimiento}`, { indent: 15 })
          .fillColor(estadoColor)
          .text(`   Estado: ${estado}`, { indent: 15 })
          .fillColor('#000000')
          .moveDown(0.8);
      });

      // ----------------------------------------------------------------
      // BLOQUE 3.9: Paginación y pie de página
      // ----------------------------------------------------------------
      // Obtiene el rango de páginas generadas
      const range = doc.bufferedPageRange();
      const pageCount = range.count;
      
      console.log(`📄 Total de páginas generadas: ${pageCount}`);

      // Agrega pie de página en cada página del documento
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Pie de página centrado en la parte inferior
        doc.fontSize(8)
          .fillColor('#6B7280')
          .text(
            `Página ${i + 1} de ${pageCount} - Sistema de Gestión de Documentos CBTIS051`,
            50,
            doc.page.height - 50,
            { align: 'center', lineBreak: false }
          );
      }

      // ----------------------------------------------------------------
      // BLOQUE 3.10: Finalización del documento
      // ----------------------------------------------------------------
      doc.end();

      console.log(`✅ Reporte PDF generado exitosamente con ${documents.length} documentos`);

      // ----------------------------------------------------------------
      // BLOQUE 3.11: Notificación de actividad
      // ----------------------------------------------------------------
      try {
        await NotificationService.reporteGenerado(req.body.reportType, 'pdf', documents.length);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

    } catch (error) {
      console.error('❌ Error generando reporte PDF:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al generar reporte PDF: ' + error.message 
      });
    }
  }

  // ********************************************************************
  // MÓDULO 4: GENERACIÓN DE REPORTE EN CSV
  // ********************************************************************
  // Descripción: Crea un reporte en formato CSV (valores separados por comas)
  // con codificación UTF-8 y manejo adecuado de caracteres especiales.
  // Ideal para importación en otros sistemas o procesamiento con scripts.
  // ********************************************************************
  static async generateCSV(req, res) {
    try {
      console.log('📊 ReportController.generateCSV - Iniciando...');
      
      // ----------------------------------------------------------------
      // BLOQUE 4.1: Obtención de documentos filtrados
      // ----------------------------------------------------------------
      const documents = await ReportController.filterDocuments(req.body);

      // Validación de resultados
      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados'
        });
      }

      // ----------------------------------------------------------------
      // BLOQUE 4.2: Construcción del encabezado CSV
      // ----------------------------------------------------------------
      // BOM (\uFEFF) para asegurar correcta interpretación UTF-8 en Excel
      let csv = '\uFEFF';
      // Encabezados de columnas en español
      csv += 'Nombre del Documento,Tipo,Tamaño,Categoría,Persona Asignada,Departamento,Puesto,Fecha de Subida,Fecha de Vencimiento,Estado\n';

      // ----------------------------------------------------------------
      // BLOQUE 4.3: Procesamiento de cada documento
      // ----------------------------------------------------------------
      documents.forEach((doc, index) => {
        // Extracción y formateo de datos
        const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
        const departamento = doc.persona_id ? doc.persona_id.departamento || '-' : '-';
        const puesto = doc.persona_id ? doc.persona_id.puesto || '-' : '-';
        const vencimiento = doc.fecha_vencimiento ? FileService.formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';
        
        // Cálculo de estado
        let estado = 'Activo';
        if (doc.fecha_vencimiento) {
          const now = new Date();
          const vencimientoDate = new Date(doc.fecha_vencimiento);
          const diff = Math.ceil((vencimientoDate - now) / (1000 * 60 * 60 * 24));
          if (diff <= 0) estado = 'Vencido';
          else if (diff <= 7) estado = 'Por vencer';
        }

        // ----------------------------------------------------------------
        // BLOQUE 4.4: Función de escape para valores CSV
        // ----------------------------------------------------------------
        // Envuelve en comillas dobles los valores que contienen comas,
        // saltos de línea o comillas, y escapa comillas internas duplicándolas.
        const escapeCSV = (value) => {
          if (value === null || value === undefined) return '';
          const valueStr = String(value);
          if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n') || valueStr.includes('\r')) {
            return `"${valueStr.replace(/"/g, '""')}"`;
          }
          return valueStr;
        };

        // ----------------------------------------------------------------
        // BLOQUE 4.5: Construcción de línea CSV
        // ----------------------------------------------------------------
        // Concatena todos los valores separados por comas, aplicando
        // escape a cada uno para garantizar integridad del formato.
        csv += `${escapeCSV(doc.nombre_original)},${doc.tipo_archivo ? doc.tipo_archivo.toUpperCase() : 'DESCONOCIDO'},${FileService.formatFileSize(doc.tamano_archivo || 0)},${escapeCSV(doc.categoria)},${escapeCSV(person)},${escapeCSV(departamento)},${escapeCSV(puesto)},${FileService.formatDate(doc.fecha_subida || doc.createdAt)},${escapeCSV(vencimiento)},${escapeCSV(estado)}\n`;
        
        // Log de progreso para grandes volúmenes de datos
        if (index % 100 === 0) {
          console.log(`📄 Procesando documento ${index + 1} de ${documents.length}`);
        }
      });

      // ----------------------------------------------------------------
      // BLOQUE 4.6: Configuración de headers HTTP para descarga CSV
      // ----------------------------------------------------------------
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.csv`);
      res.send(csv);

      console.log(`✅ Reporte CSV generado exitosamente con ${documents.length} documentos`);

      // ----------------------------------------------------------------
      // BLOQUE 4.7: Notificación de actividad
      // ----------------------------------------------------------------
      try {
        await NotificationService.reporteGenerado(req.body.reportType, 'csv', documents.length);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

    } catch (error) {
      console.error('❌ Error generando reporte CSV:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al generar reporte CSV: ' + error.message 
      });
    }
  }
}

export default ReportController;