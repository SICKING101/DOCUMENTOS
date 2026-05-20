// src/backend/controllers/reportController.js

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Document from '../models/Document.js';
import Category from '../models/Category.js';
import Person from '../models/Person.js';
import FileService from '../services/fileService.js';
import NotificationService from '../services/notificationService.js';

class ReportController {

  // ===========================================================================
  // FILTRADO DE DOCUMENTOS (Excel / PDF / CSV)
  // ===========================================================================
  static async filterDocuments(filters, schoolId = null) {
    try {
      let query = { activo: true };

      if (schoolId) query.schoolId = schoolId;

      if (filters.reportType === 'byCategory' && filters.category) {
        query.categoria = filters.category;
      }

      if (filters.reportType === 'byPerson' && filters.person) {
        query['persona_id._id'] = filters.person;
      }

      if (filters.reportType === 'expiring' && filters.days) {
        const now = new Date();
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + parseInt(filters.days));
        query.fecha_vencimiento = { $gte: now, $lte: limitDate };
      }

      if (filters.reportType === 'expired') {
        query.fecha_vencimiento = { $lt: new Date() };
      }

      if (filters.dateFrom || filters.dateTo) {
        query.fecha_subida = {};
        if (filters.dateFrom) query.fecha_subida.$gte = new Date(filters.dateFrom);
        if (filters.dateTo)   query.fecha_subida.$lte = new Date(filters.dateTo);
      }

      let documents = await Document.find(query)
        .populate('persona_id', 'nombre email departamento puesto')
        .sort({ fecha_subida: -1 });

      if (filters.reportType === 'byPerson' && filters.person) {
        documents = documents.filter(
          doc => doc.persona_id && doc.persona_id._id.toString() === filters.person
        );
      }

      return documents;
    } catch (error) {
      console.error('❌ Error en ReportController.filterDocuments:', error);
      throw error;
    }
  }

  // ===========================================================================
  // REPORTE EXCEL
  // ===========================================================================
  static async generateExcel(req, res) {
    try {
      const documents = await ReportController.filterDocuments(req.body, req.schoolId);

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados',
        });
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CBTIS051';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Documentos');

      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        },
      };

      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'Reporte de Documentos - CBTIS051';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF4F46E5' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.mergeCells('A2:H2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `Generado el ${FileService.formatDate(new Date())}`;
      subtitleCell.font = { size: 11, italic: true };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.addRow([]);

      const headers = [
        'Nombre del Documento', 'Tipo', 'Tamaño', 'Categoría',
        'Persona Asignada', 'Fecha de Subida', 'Fecha de Vencimiento', 'Estado',
      ];
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 25;
      headerRow.eachCell(cell => { cell.style = headerStyle; });

      documents.forEach((doc, index) => {
        const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
        const vencimiento = doc.fecha_vencimiento
          ? FileService.formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';

        let estado = 'Activo';
        if (doc.fecha_vencimiento) {
          const diff = Math.ceil(
            (new Date(doc.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (diff <= 0)  estado = 'Vencido';
          else if (diff <= 7) estado = 'Por vencer';
        }

        const row = worksheet.addRow([
          doc.nombre_original,
          doc.tipo_archivo ? doc.tipo_archivo.toUpperCase() : 'DESCONOCIDO',
          FileService.formatFileSize(doc.tamano_archivo || 0),
          doc.categoria || 'Sin categoría',
          person,
          FileService.formatDate(doc.fecha_subida || doc.createdAt),
          vencimiento,
          estado,
        ]);

        if (estado === 'Vencido') {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
          });
        } else if (estado === 'Por vencer') {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          });
        }

        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' },
          };
        });
      });

      worksheet.columns = [
        { width: 40 }, { width: 10 }, { width: 12 }, { width: 20 },
        { width: 25 }, { width: 20 }, { width: 20 }, { width: 15 },
      ];

      worksheet.addRow([]);
      const statsRow = worksheet.addRow(['Total de documentos:', documents.length]);
      statsRow.getCell(1).font = { bold: true };
      statsRow.getCell(1).alignment = { horizontal: 'right' };
      statsRow.getCell(2).font = { bold: true };

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=reporte_documentos_${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();

      try {
        await NotificationService.reporteGenerado(
          req.body.reportType, 'excel', documents.length, req.schoolId
        );
      } catch (e) { console.error('⚠️ Notificación:', e.message); }

    } catch (error) {
      console.error('❌ Error generando reporte Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte Excel: ' + error.message,
      });
    }
  }

  // ===========================================================================
  // REPORTE PDF
  // ===========================================================================
  static async generatePDF(req, res) {
    try {
      const documents = await ReportController.filterDocuments(req.body, req.schoolId);

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados',
        });
      }

      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=reporte_documentos_${Date.now()}.pdf`
      );

      doc.pipe(res);

      doc.fontSize(20).fillColor('#4F46E5')
        .text('Sistema de Gestión de Documentos', { align: 'center' })
        .fontSize(16).text('CBTIS051', { align: 'center' })
        .moveDown(0.5);

      doc.fontSize(12).fillColor('#000000')
        .text(`Reporte generado el ${FileService.formatDate(new Date())}`, { align: 'center' })
        .moveDown(1);

      let reportTitle = 'Reporte General';
      if (req.body.reportType === 'byCategory')
        reportTitle = `Reporte por Categoría${req.body.category ? ': ' + req.body.category : ''}`;
      if (req.body.reportType === 'byPerson')  reportTitle = 'Reporte por Persona';
      if (req.body.reportType === 'expiring')
        reportTitle = `Documentos por Vencer (${req.body.days || 30} días)`;
      if (req.body.reportType === 'expired')   reportTitle = 'Documentos Vencidos';

      doc.fontSize(14).fillColor('#4F46E5').text(reportTitle, { underline: true }).moveDown(1);
      doc.fontSize(11).fillColor('#000000')
        .text(`Total de documentos en este reporte: ${documents.length}`)
        .moveDown(0.5);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

      documents.forEach((document, index) => {
        if (doc.y > 700) doc.addPage();

        const person = document.persona_id ? document.persona_id.nombre : 'No asignado';
        const vencimiento = document.fecha_vencimiento
          ? FileService.formatDate(document.fecha_vencimiento) : 'Sin vencimiento';

        let estado = 'Activo';
        let estadoColor = '#10B981';
        if (document.fecha_vencimiento) {
          const diff = Math.ceil(
            (new Date(document.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (diff <= 0) { estado = 'Vencido';    estadoColor = '#EF4444'; }
          else if (diff <= 7) { estado = 'Por vencer'; estadoColor = '#F59E0B'; }
        }

        doc.fontSize(10).fillColor('#6B7280')
          .text(`${index + 1}.`, 50, doc.y, { continued: true })
          .fillColor('#000000').fontSize(11)
          .text(` ${document.nombre_original}`, { bold: true });

        doc.fontSize(9).fillColor('#6B7280')
          .text(`   Tipo: ${document.tipo_archivo ? document.tipo_archivo.toUpperCase() : 'DESCONOCIDO'} | Tamaño: ${FileService.formatFileSize(document.tamano_archivo || 0)}`, { indent: 15 })
          .text(`   Categoría: ${document.categoria || 'Sin categoría'}`, { indent: 15 })
          .text(`   Asignado a: ${person}`, { indent: 15 })
          .text(`   Fecha de subida: ${FileService.formatDate(document.fecha_subida || document.createdAt)}`, { indent: 15 })
          .text(`   Vencimiento: ${vencimiento}`, { indent: 15 })
          .fillColor(estadoColor).text(`   Estado: ${estado}`, { indent: 15 })
          .fillColor('#000000').moveDown(0.8);
      });

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#6B7280')
          .text(
            `Página ${i + 1} de ${range.count} - Sistema de Gestión de Documentos CBTIS051`,
            50, doc.page.height - 50, { align: 'center', lineBreak: false }
          );
      }

      doc.end();

      try {
        await NotificationService.reporteGenerado(
          req.body.reportType, 'pdf', documents.length, req.schoolId
        );
      } catch (e) { console.error('⚠️ Notificación:', e.message); }

    } catch (error) {
      console.error('❌ Error generando reporte PDF:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte PDF: ' + error.message,
      });
    }
  }

  // ===========================================================================
  // REPORTE CSV
  // ===========================================================================
  static async generateCSV(req, res) {
    try {
      const documents = await ReportController.filterDocuments(req.body, req.schoolId);

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron documentos con los filtros seleccionados',
        });
      }

      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const s = String(value);
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      let csv = '\uFEFF';
      csv += 'Nombre del Documento,Tipo,Tamaño,Categoría,Persona Asignada,Departamento,Puesto,Fecha de Subida,Fecha de Vencimiento,Estado\n';

      documents.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id.nombre : 'No asignado';
        const departamento = doc.persona_id ? (doc.persona_id.departamento || '-') : '-';
        const puesto = doc.persona_id ? (doc.persona_id.puesto || '-') : '-';
        const vencimiento = doc.fecha_vencimiento
          ? FileService.formatDate(doc.fecha_vencimiento) : 'Sin vencimiento';

        let estado = 'Activo';
        if (doc.fecha_vencimiento) {
          const diff = Math.ceil(
            (new Date(doc.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (diff <= 0)  estado = 'Vencido';
          else if (diff <= 7) estado = 'Por vencer';
        }

        csv += [
          escapeCSV(doc.nombre_original),
          doc.tipo_archivo ? doc.tipo_archivo.toUpperCase() : 'DESCONOCIDO',
          FileService.formatFileSize(doc.tamano_archivo || 0),
          escapeCSV(doc.categoria),
          escapeCSV(person),
          escapeCSV(departamento),
          escapeCSV(puesto),
          FileService.formatDate(doc.fecha_subida || doc.createdAt),
          escapeCSV(vencimiento),
          escapeCSV(estado),
        ].join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=reporte_documentos_${Date.now()}.csv`
      );
      res.send(csv);

      try {
        await NotificationService.reporteGenerado(
          req.body.reportType, 'csv', documents.length, req.schoolId
        );
      } catch (e) { console.error('⚠️ Notificación:', e.message); }

    } catch (error) {
      console.error('❌ Error generando reporte CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar reporte CSV: ' + error.message,
      });
    }
  }

  // ===========================================================================
  // DATOS PARA GRÁFICAS — DISTRIBUCIÓN
  // ===========================================================================
  static async getChartData(req, res) {
    try {
      const { type = 'category', period = 'all' } = req.query;
      const schoolId = req.schoolId || null;

      // ── Filtro de fecha ──────────────────────────────────────────
      let dateFilter = {};
      if (period !== 'all') {
        const now = new Date();
        const map = {
          '7d':  () => { const d = new Date(now); d.setDate(d.getDate() - 7);       return d; },
          '30d': () => { const d = new Date(now); d.setDate(d.getDate() - 30);      return d; },
          '90d': () => { const d = new Date(now); d.setDate(d.getDate() - 90);      return d; },
          '1y':  () => { const d = new Date(now); d.setFullYear(d.getFullYear()-1); return d; },
        };
        const startDate = map[period]?.();
        if (startDate) dateFilter.fecha_subida = { $gte: startDate };
      }

      const baseFilter = {
        activo: true,
        isDeleted: { $ne: true },
        ...(schoolId ? { schoolId } : {}),
        ...dateFilter,
      };

      let chartData = [];

      switch (type) {

        case 'category':
          chartData = await Document.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$categoria', count: { $sum: 1 }, totalSize: { $sum: '$tamano_archivo' } } },
            { $sort: { count: -1 } },
          ]);
          break;

        case 'status': {
          const now = new Date();
          const allDocs = await Document.find(baseFilter).select('fecha_vencimiento');
          const counts = { 'Activo': 0, 'Por Vencer': 0, 'Vencido': 0, 'Sin Fecha': 0 };

          allDocs.forEach(doc => {
            if (!doc.fecha_vencimiento) { counts['Sin Fecha']++; return; }
            const diff = Math.ceil(
              (new Date(doc.fecha_vencimiento) - now) / (1000 * 60 * 60 * 24)
            );
            if (diff < 0)       counts['Vencido']++;
            else if (diff <= 7) counts['Por Vencer']++;
            else                counts['Activo']++;
          });

          chartData = Object.entries(counts).map(([name, count]) => ({ _id: name, count }));
          break;
        }

        case 'person':
          chartData = await Document.aggregate([
            { $match: baseFilter },
            { $group: { _id: '$persona_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'people',
                localField: '_id',
                foreignField: '_id',
                as: 'person',
              },
            },
            { $unwind: { path: '$person', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: { $ifNull: ['$person.nombre', 'No asignado'] },
                count: 1,
              },
            },
          ]);
          break;

        case 'type':
          chartData = await Document.aggregate([
            { $match: baseFilter },
            { $group: { _id: { $toUpper: '$tipo_archivo' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]);
          break;

        default:
          return res.status(400).json({ success: false, message: 'Tipo de gráfico no válido' });
      }

      return res.json({
        success: true,
        data: chartData,
        type,
        period,
        total: chartData.reduce((s, i) => s + i.count, 0),
      });

    } catch (error) {
      console.error('❌ Error en getChartData:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener datos de gráficos: ' + error.message,
      });
    }
  }

  // ===========================================================================
  // DATOS PARA GRÁFICAS — SERIES TEMPORALES
  // ===========================================================================
  static async getTimeSeriesData(req, res) {
    try {
      const { period = 'monthly', months = 12 } = req.query;
      const schoolId = req.schoolId || null;

      const now = new Date();
      const startDate = new Date(now.getTime());
      startDate.setMonth(startDate.getMonth() - parseInt(months));

      let groupFormat;
      switch (period) {
        case 'daily':
          groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$fecha_subida' } };
          break;
        case 'weekly':
          // Group by week start (Monday)
          groupFormat = {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateTrunc: {
                  date: '$fecha_subida',
                  unit: 'week',
                  startOfWeek: 'monday',
                },
              },
            },
          };
          break;
        case 'monthly':
        default:
          groupFormat = { $dateToString: { format: '%Y-%m', date: '$fecha_subida' } };
          break;
      }

      const matchFilter = {
        activo: true,
        isDeleted: { $ne: true },
        fecha_subida: { $gte: startDate, $lte: now },
        ...(schoolId ? { schoolId } : {}),
      };

      const data = await Document.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: groupFormat,
            count: { $sum: 1 },
            totalSize: { $sum: '$tamano_archivo' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        success: true,
        data,
        period,
        total: data.reduce((s, i) => s + i.count, 0),
      });

    } catch (error) {
      console.error('❌ Error en getTimeSeriesData:', error);
      // Fallback: try without $dateTrunc (older MongoDB)
      try {
        const { period = 'monthly', months = 12 } = req.query;
        const schoolId = req.schoolId || null;
        const now = new Date();
        const startDate = new Date(now.getTime());
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        const groupFmt = period === 'daily'
          ? { $dateToString: { format: '%Y-%m-%d', date: '$fecha_subida' } }
          : { $dateToString: { format: '%Y-%m', date: '$fecha_subida' } };

        const data = await Document.aggregate([
          {
            $match: {
              activo: true,
              isDeleted: { $ne: true },
              fecha_subida: { $gte: startDate, $lte: now },
              ...(schoolId ? { schoolId } : {}),
            },
          },
          { $group: { _id: groupFmt, count: { $sum: 1 }, totalSize: { $sum: '$tamano_archivo' } } },
          { $sort: { _id: 1 } },
        ]);

        res.json({ success: true, data, period, total: data.reduce((s,i)=>s+i.count,0) });
      } catch (fallbackError) {
        res.status(500).json({
          success: false,
          message: 'Error al obtener series temporales: ' + error.message,
        });
      }
    }
  }

  // ===========================================================================
  // DATOS PARA GRÁFICAS — COMPARATIVA
  // ===========================================================================
  static async getComparisonData(req, res) {
    try {
      const { compareType = 'month' } = req.query;
      const schoolId = req.schoolId || null;

      const now = new Date();
      let currentStart, previousStart, currentEnd, previousEnd;

      switch (compareType) {
        case 'week':
          currentEnd   = now;
          currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousEnd  = new Date(currentStart.getTime());
          previousStart= new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          currentStart  = new Date(now.getFullYear(), 0, 1);
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          currentEnd    = now;
          previousEnd   = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case 'month':
        default:
          currentStart  = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          currentEnd    = now;
          previousEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
      }

      const schoolFilter = schoolId ? { schoolId } : {};
      const baseDoc = { activo: true, isDeleted: { $ne: true }, ...schoolFilter };

      const [currentTotal, previousTotal, currentExpired, previousExpired] = await Promise.all([
        Document.countDocuments({ ...baseDoc, fecha_subida: { $gte: currentStart, $lte: currentEnd } }),
        Document.countDocuments({ ...baseDoc, fecha_subida: { $gte: previousStart, $lte: previousEnd } }),
        Document.countDocuments({ ...baseDoc, fecha_vencimiento: { $lt: now } }),
        Document.countDocuments({
          ...baseDoc,
          fecha_vencimiento: { $lt: currentStart, $gte: previousStart },
        }),
      ]);

      const pct = previousTotal > 0
        ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1)
        : (currentTotal > 0 ? 100 : 0);

      res.json({
        success: true,
        data: {
          current:  { total: currentTotal,  expired: currentExpired,  period: { start: currentStart,  end: currentEnd  } },
          previous: { total: previousTotal, expired: previousExpired, period: { start: previousStart, end: previousEnd } },
          change: {
            total:         currentTotal - previousTotal,
            percentage:    pct,
            expiredChange: currentExpired - previousExpired,
          },
        },
        compareType,
      });

    } catch (error) {
      console.error('❌ Error en getComparisonData:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener comparativas: ' + error.message,
      });
    }
  }

  // ===========================================================================
  // RESUMEN GENERAL PARA EL DASHBOARD DE REPORTES
  // ===========================================================================
  static async getReportsSummary(req, res) {
    try {
      const schoolId = req.schoolId || null;
      const schoolFilter = schoolId ? { schoolId } : {};

      const now = new Date();
      // CORRECCIÓN: no mutar `now`; calcular fecha separada
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const baseDoc = { activo: true, isDeleted: { $ne: true }, ...schoolFilter };

      const [
        totalDocuments,
        totalCategories,
        totalPersons,
        expiringDocuments,
        expiredDocuments,
        recentUploads,
        categoryDistribution,
      ] = await Promise.all([
        Document.countDocuments(baseDoc),
        Category.countDocuments({ activo: true, ...schoolFilter }),
        Person.countDocuments({ activo: true, ...schoolFilter }),
        Document.countDocuments({
          ...baseDoc,
          fecha_vencimiento: { $gte: now, $lte: thirtyDaysAhead },
        }),
        Document.countDocuments({
          ...baseDoc,
          fecha_vencimiento: { $lt: now },
        }),
        Document.countDocuments({
          ...baseDoc,
          fecha_subida: { $gte: thirtyDaysAgo },
        }),
        Document.aggregate([
          { $match: baseDoc },
          { $group: { _id: '$categoria', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
      ]);

      const expiredPct = totalDocuments > 0
        ? ((expiredDocuments / totalDocuments) * 100).toFixed(1) : 0;
      const expiringPct = totalDocuments > 0
        ? ((expiringDocuments / totalDocuments) * 100).toFixed(1) : 0;

      const healthStatus = expiredDocuments === 0 ? 'excellent'
        : expiredDocuments < 5  ? 'good'
        : expiredDocuments < 10 ? 'warning'
        : 'critical';

      res.json({
        success: true,
        data: {
          totals: {
            documents:    totalDocuments,
            categories:   totalCategories,
            persons:      totalPersons,
            recentUploads,
            expiringSoon: expiringDocuments,
            expired:      expiredDocuments,
          },
          topCategories: categoryDistribution,
          health: {
            expiredPercentage:  expiredPct,
            expiringPercentage: expiringPct,
            status:             healthStatus,
          },
        },
      });

    } catch (error) {
      console.error('❌ Error en getReportsSummary:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener resumen: ' + error.message,
      });
    }
  }

  // =============================================================================
// NUEVO: GENERAR EXCEL CON GRÁFICO INCORPORADO
// =============================================================================

static async generateExcelWithChart(req, res) {
    try {
        console.log('📊 Generando Excel con gráfico...');
        
        const { chartImage, data, title, periodLabel, total, chartType } = req.body;
        
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                message: 'Datos del gráfico no proporcionados'
            });
        }
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CBTIS051';
        workbook.created = new Date();
        
        // ── Hoja 1: Datos ──
        const dataSheet = workbook.addWorksheet('Datos', {
            properties: { tabColor: { argb: 'FF6366F1' } }
        });
        
        // Título
        dataSheet.mergeCells('A1:D1');
        const titleCell = dataSheet.getCell('A1');
        titleCell.value = `📊 ${title} - CBTIS051`;
        titleCell.font = { bold: true, size: 18, color: { argb: 'FF6366F1' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        dataSheet.getRow(1).height = 35;
        
        // Subtítulo
        dataSheet.mergeCells('A2:D2');
        const subCell = dataSheet.getCell('A2');
        subCell.value = `Período: ${periodLabel} | Total: ${total} registros | Generado: ${new Date().toLocaleDateString('es-MX')}`;
        subCell.font = { size: 11, color: { argb: 'FF6B7280' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        dataSheet.getRow(2).height = 25;
        
        // Encabezados
        const headerRow = dataSheet.addRow(['#', 'Elemento', 'Cantidad', 'Porcentaje']);
        headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF6366F1' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;
        headerRow.eachCell((cell, col) => {
            cell.border = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        
        // Datos
        data.forEach((item, index) => {
            const count = item.count || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            
            const row = dataSheet.addRow([
                index + 1,
                item._id || 'Sin nombre',
                count,
                `${percentage}%`
            ]);
            
            row.alignment = { vertical: 'middle' };
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(3).alignment = { horizontal: 'center' };
            row.getCell(4).alignment = { horizontal: 'center' };
            
            // Color alternado
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF3F4F6' }
                };
            }
            
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };
            });
        });
        
        // Fila de total
        const totalRow = dataSheet.addRow(['', 'TOTAL', total, '100%']);
        totalRow.font = { bold: true, size: 12 };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEEF2FF' }
        };
        totalRow.eachCell(cell => {
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF6366F1' } },
                bottom: { style: 'medium', color: { argb: 'FF6366F1' } }
            };
        });
        
        // Ajustar anchos
        dataSheet.columns = [
            { width: 6 },
            { width: 40 },
            { width: 15 },
            { width: 15 }
        ];
        
        // ── Hoja 2: Gráfico ──
        const chartSheet = workbook.addWorksheet('Gráfico', {
            properties: { tabColor: { argb: 'FF10B981' } }
        });
        
        // Insertar imagen del gráfico si se proporcionó
        if (chartImage) {
            const imageBuffer = Buffer.from(chartImage.split(',')[1], 'base64');
            const imageId = workbook.addImage({
                buffer: imageBuffer,
                extension: 'png',
            });
            
            chartSheet.addImage(imageId, {
                tl: { col: 1, row: 2 },
                ext: { width: 700, height: 400 }
            });
        }
        
        // Título en hoja de gráfico
        chartSheet.mergeCells('A1:H1');
        const chartTitle = chartSheet.getCell('A1');
        chartTitle.value = `📊 ${title}`;
        chartTitle.font = { bold: true, size: 16, color: { argb: 'FF6366F1' } };
        chartTitle.alignment = { horizontal: 'center', vertical: 'middle' };
        chartSheet.getRow(1).height = 30;
        
        // ── Enviar archivo ──
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_grafico_${Date.now()}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
        
        console.log('✅ Excel con gráfico generado exitosamente');
        
    } catch (error) {
        console.error('❌ Error generando Excel con gráfico:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar Excel: ' + error.message
        });
    }
}
}

export default ReportController;