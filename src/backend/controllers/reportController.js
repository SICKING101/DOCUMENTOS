import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Document from '../models/Document.js';
import FileService from '../services/fileService.js';
import NotificationService from '../services/notificationService.js';

class ReportController {
  // Función estática para filtrar documentos según parámetros
  static async filterDocuments(filters) {
    try {
      console.log('🔍 ReportController.filterDocuments - Iniciando filtrado con:', filters);
      
      let query = { activo: true };
      
      // Aplicar filtros según el tipo de reporte
      if (filters.reportType === 'byCategory' && filters.category) {
        query.categoria = filters.category;
      }

      if (filters.reportType === 'byPerson' && filters.person) {
        query['persona_id._id'] = filters.person; // Ajustar según tu esquema
      }

      if (filters.reportType === 'expiring' && filters.days) {
        const now = new Date();
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + parseInt(filters.days));
        query.fecha_vencimiento = {
          $gte: now,
          $lte: limitDate
        };
      }

      if (filters.reportType === 'expired') {
        const now = new Date();
        query.fecha_vencimiento = { $lt: now };
      }

      // Filtrar por rango de fechas si está presente
      if (filters.dateFrom || filters.dateTo) {
        query.fecha_subida = {};
        if (filters.dateFrom) query.fecha_subida.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.fecha_subida.$lte = new Date(filters.dateTo);
      }

      console.log('📝 Query de búsqueda:', JSON.stringify(query, null, 2));
      
      // Buscar documentos con el query construido
      let documents = await Document.find(query)
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ fecha_subida: -1 });

      console.log(`✅ Encontrados ${documents.length} documentos`);

      // Para el filtro por persona, necesitamos hacer un filtro adicional en memoria
      // porque el query con populate no funciona directamente con _id en string
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

  // Generar reporte en Excel
  static async generateExcel(req, res) {
    try {
      console.log('📊 ReportController.generateExcel - Iniciando...');
      console.log('📋 Filtros recibidos:', req.body);
      
      // CORRECCIÓN: Usar ReportController.filterDocuments en lugar de this.filterDocuments
      const documents = await ReportController.filterDocuments(req.body);

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados'
        });
      }

      // Crear libro de Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CBTIS051';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Documentos');

      // Estilos para el encabezado
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

      // Título del reporte
      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Reporte de Documentos - CBTIS051`;
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF4F46E5' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.mergeCells('A2:H2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `Generado el ${FileService.formatDate(new Date())}`;
      subtitleCell.font = { size: 11, italic: true };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.addRow([]);

      // Encabezados de columnas
      const headers = ['Nombre del Documento', 'Tipo', 'Tamaño', 'Categoría', 'Persona Asignada', 'Fecha de Subida', 'Fecha de Vencimiento', 'Estado'];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });

      // Datos
      documents.forEach((doc, index) => {
        const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
        const vencimiento = doc.fecha_vencimiento ? FileService.formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';
        
        let estado = 'Activo';
        let estadoColor = 'FF10B981'; // Verde por defecto
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

        // Colorear filas según estado
        if (estado === 'Vencido') {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
          });
        } else if (estado === 'Por vencer') {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          });
        }

        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        
        // Mostrar progreso cada 50 documentos
        if (index % 50 === 0) {
          console.log(`📄 Procesando documento ${index + 1} de ${documents.length}`);
        }
      });

      // Ajustar ancho de columnas
      worksheet.columns = [
        { width: 40 },
        { width: 10 },
        { width: 12 },
        { width: 20 },
        { width: 25 },
        { width: 20 },
        { width: 20 },
        { width: 15 }
      ];

      // Agregar estadísticas al final
      worksheet.addRow([]);
      const statsRow = worksheet.addRow(['Total de documentos:', documents.length]);
      statsRow.getCell(1).font = { bold: true };
      statsRow.getCell(1).alignment = { horizontal: 'right' };
      statsRow.getCell(2).font = { bold: true };

      // Enviar archivo
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.xlsx`);

      console.log('💾 Guardando archivo Excel...');
      await workbook.xlsx.write(res);
      res.end();

      console.log(`✅ Reporte Excel generado exitosamente con ${documents.length} documentos`);

      // Crear notificación de reporte generado
      try {
        await NotificationService.reporteGenerado(req.body.reportType, 'excel', documents.length);
      } catch (notifError) {
        console.error('⚠️ Error creando notificación:', notifError.message);
      }

    } catch (error) {
      console.error('❌ Error generando reporte Excel:', error);
      console.error('📋 Stack trace:', error.stack);
      
      res.status(500).json({ 
        success: false, 
        message: 'Error al generar reporte Excel: ' + error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // Generar reporte en PDF
  static async generatePDF(req, res) {
    try {
      console.log('📊 ReportController.generatePDF - Iniciando...');
      
      // CORRECCIÓN: Usar ReportController.filterDocuments
      const documents = await ReportController.filterDocuments(req.body);

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados'
        });
      }

      // Crear documento PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      // Headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.pdf`);

      doc.pipe(res);

      // Encabezado del reporte
      doc.fontSize(20)
        .fillColor('#4F46E5')
        .text('Sistema de Gestión de Documentos', { align: 'center' })
        .fontSize(16)
        .text('CBTIS051', { align: 'center' })
        .moveDown(0.5);

      doc.fontSize(12)
        .fillColor('#000000')
        .text(`Reporte generado el ${FileService.formatDate(new Date())}`, { align: 'center' })
        .moveDown(1);

      // Información del reporte
      let reportTitle = 'Reporte General';
      if (req.body.reportType === 'byCategory') reportTitle = `Reporte por Categoría${req.body.category ? ': ' + req.body.category : ''}`;
      if (req.body.reportType === 'byPerson') reportTitle = 'Reporte por Persona';
      if (req.body.reportType === 'expiring') reportTitle = `Documentos por Vencer (${req.body.days || 30} días)`;
      if (req.body.reportType === 'expired') reportTitle = 'Documentos Vencidos';

      doc.fontSize(14)
        .fillColor('#4F46E5')
        .text(reportTitle, { underline: true })
        .moveDown(1);

      // Estadísticas generales
      doc.fontSize(11)
        .fillColor('#000000')
        .text(`Total de documentos en este reporte: ${documents.length}`, { continued: false })
        .moveDown(0.5);

      // Línea separadora
      doc.moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Lista de documentos
      documents.forEach((document, index) => {
        // Verificar si hay espacio suficiente, si no, agregar nueva página
        if (doc.y > 700) {
          doc.addPage();
        }

        const person = document.persona_id ? document.persona_id.nombre : 'No asignado';
        const vencimiento = document.fecha_vencimiento ? FileService.formatDate(document.fecha_vencimiento) : 'Sin vencimiento';
        
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

        // Número de documento
        doc.fontSize(10)
          .fillColor('#6B7280')
          .text(`${index + 1}.`, 50, doc.y, { continued: true })
          .fillColor('#000000')
          .fontSize(11)
          .text(` ${document.nombre_original}`, { bold: true });

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

      // Obtener el rango de páginas
      const range = doc.bufferedPageRange();
      const pageCount = range.count;
      
      console.log(`📄 Total de páginas generadas: ${pageCount}`);

      // Agregar pie de página en cada página
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        doc.fontSize(8)
          .fillColor('#6B7280')
          .text(
            `Página ${i + 1} de ${pageCount} - Sistema de Gestión de Documentos CBTIS051`,
            50,
            doc.page.height - 50,
            { align: 'center', lineBreak: false }
          );
      }

      // Finalizar documento
      doc.end();

      console.log(`✅ Reporte PDF generado exitosamente con ${documents.length} documentos`);

      // Crear notificación de reporte generado
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

  // Generar reporte en CSV
  static async generateCSV(req, res) {
    try {
      console.log('📊 ReportController.generateCSV - Iniciando...');
      
      // CORRECCIÓN: Usar ReportController.filterDocuments
      const documents = await ReportController.filterDocuments(req.body);

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados'
        });
      }

      // Crear CSV
      let csv = '\uFEFF'; // BOM para UTF-8
      csv += 'Nombre del Documento,Tipo,Tamaño,Categoría,Persona Asignada,Departamento,Puesto,Fecha de Subida,Fecha de Vencimiento,Estado\n';

      documents.forEach((doc, index) => {
        const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
        const departamento = doc.persona_id ? doc.persona_id.departamento || '-' : '-';
        const puesto = doc.persona_id ? doc.persona_id.puesto || '-' : '-';
        const vencimiento = doc.fecha_vencimiento ? FileService.formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';
        
        let estado = 'Activo';
        if (doc.fecha_vencimiento) {
          const now = new Date();
          const vencimientoDate = new Date(doc.fecha_vencimiento);
          const diff = Math.ceil((vencimientoDate - now) / (1000 * 60 * 60 * 24));
          if (diff <= 0) estado = 'Vencido';
          else if (diff <= 7) estado = 'Por vencer';
        }

        // Escapar comillas y comas en los valores
        const escapeCSV = (value) => {
          if (value === null || value === undefined) return '';
          const valueStr = String(value);
          if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n') || valueStr.includes('\r')) {
            return `"${valueStr.replace(/"/g, '""')}"`;
          }
          return valueStr;
        };

        csv += `${escapeCSV(doc.nombre_original)},${doc.tipo_archivo ? doc.tipo_archivo.toUpperCase() : 'DESCONOCIDO'},${FileService.formatFileSize(doc.tamano_archivo || 0)},${escapeCSV(doc.categoria)},${escapeCSV(person)},${escapeCSV(departamento)},${escapeCSV(puesto)},${FileService.formatDate(doc.fecha_subida || doc.createdAt)},${escapeCSV(vencimiento)},${escapeCSV(estado)}\n`;
        
        // Mostrar progreso cada 100 documentos
        if (index % 100 === 0) {
          console.log(`📄 Procesando documento ${index + 1} de ${documents.length}`);
        }
      });

      // Enviar archivo
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_documentos_${Date.now()}.csv`);
      res.send(csv);

      console.log(`✅ Reporte CSV generado exitosamente con ${documents.length} documentos`);

      // Crear notificación de reporte generado
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