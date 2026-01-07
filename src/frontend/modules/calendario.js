// ===== CALENDARIO ACADÉMICO - FUNCIONALIDAD COMPLETA =====

class CalendarManager {
    constructor() {
        console.debug('🔧 Constructor de CalendarManager llamado');
        this.currentDate = new Date();
        this.currentYear = this.currentDate.getFullYear();
        this.currentMonth = this.currentDate.getMonth();
        this.selectedDate = new Date();
        this.activeFilter = 'all';
        this.events = this.loadEvents();
        this.editingEvent = null;
        this.editingSeriesId = null;
        
        console.debug('📅 Estado inicial:', {
            currentDate: this.currentDate.toISOString().split('T')[0],
            currentYear: this.currentYear,
            currentMonth: this.currentMonth,
            activeFilter: this.activeFilter,
            eventsCount: this.events.length
        });
        
        // DEBUG: Mostrar todos los eventos cargados
        console.debug('📋 Todos los eventos cargados:', this.events);
        
        this.init();
    }

    // Inicializar el calendario
    init() {
        console.debug('🔧 Inicializando Calendario...');
        
        try {
            // Configurar eventos del DOM
            this.setupEventListeners();
            
            // Renderizar vista inicial
            this.renderCalendar();
            
            // Actualizar eventos próximos
            this.updateUpcomingEvents();
            
            // Renderizar mini calendario
            this.renderMiniCalendar();
            
            // Actualizar fecha actual
            this.updateCurrentDate();
            
            console.debug('✅ Calendario inicializado correctamente');
        } catch (error) {
            console.error('❌ Error en la inicialización del calendario:', error);
            this.showNotification('Error al inicializar el calendario', 'error');
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        console.debug('🎯 Configurando event listeners...');
        
        try {
            // Navegación por meses
            document.getElementById('prevYear')?.addEventListener('click', () => {
                console.debug('⬅️ Navegando al mes anterior');
                this.navigateMonth(-1);
            });
            
            document.getElementById('nextYear')?.addEventListener('click', () => {
                console.debug('➡️ Navegando al mes siguiente');
                this.navigateMonth(1);
            });
            
            // Filtros - AGREGADO DEBUG EXTENDIDO
            document.querySelectorAll('.calendar__filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.currentTarget.dataset.filter;
                    console.debug(`🔍 Aplicando filtro: ${filter}`);
                    
                    // DEBUG: Mostrar qué eventos existen antes de filtrar
                    console.debug('📊 Eventos disponibles antes de filtrar:', this.events.map(e => ({ 
                        title: e.title, 
                        type: e.type 
                    })));
                    
                    this.setFilter(filter);
                });
            });
            
            // Agregar evento
            document.getElementById('addEvent')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.debug('➕ Abriendo modal para nuevo evento');
                this.openEventModal();
            });
            
            // Imprimir calendario
            document.getElementById('printCalendar')?.addEventListener('click', () => {
                console.debug('🖨️ Preparando para imprimir calendario');
                this.printCalendar();
            });
            
            // Mini calendario
            document.getElementById('miniPrev')?.addEventListener('click', () => {
                console.debug('⬅️ Navegando mini calendario anterior');
                this.navigateMiniCalendar(-1);
            });
            
            document.getElementById('miniNext')?.addEventListener('click', () => {
                console.debug('➡️ Navegando mini calendario siguiente');
                this.navigateMiniCalendar(1);
            });
            
            // Reiniciar calendario
            document.getElementById('resetCalendar')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.debug('🔄 Solicitando reinicio del calendario');
                this.showResetCalendarModal();
            });
            
            // Modal de eventos
            this.setupModalEvents();
            
            console.debug('✅ Event listeners configurados correctamente');
        } catch (error) {
            console.error('❌ Error configurando event listeners:', error);
        }
    }

    // Configurar eventos del modal
    setupModalEvents() {
        console.debug('🎯 Configurando eventos del modal...');
        
        try {
            const modal = document.getElementById('calendarEventModal');
            const closeBtn = document.getElementById('closeCalendarModal');
            const cancelBtn = document.getElementById('cancelCalendarEvent');
            const saveBtn = document.getElementById('saveCalendarEvent');
            const deleteBtn = document.getElementById('deleteCalendarEvent');
            const colorPicker = document.getElementById('eventColor');
            
            if (!modal) {
                console.error('❌ Modal no encontrado en el DOM');
                return;
            }
            
            // Cerrar modal
            const closeModal = () => {
                console.debug('❌ Cerrando modal de evento');
                modal.removeAttribute('open');
                this.editingEvent = null;
                this.editingSeriesId = null;
                document.getElementById('deleteCalendarEvent').style.display = 'none';
                document.getElementById('modalEventTitle').textContent = 'Nuevo Evento';
                document.getElementById('calendarEventForm').reset();
            };
            
            closeBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
            
            cancelBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
            
            // Cerrar al hacer clic fuera
            modal?.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal__backdrop')) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeModal();
                }
            });
            
            // Guardar evento
            saveBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.debug('💾 Guardando evento...');
                this.saveEvent();
            });
            
            // Eliminar evento
            deleteBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.debug('🗑️ Eliminando evento...');
                this.deleteEvent();
            });
            
            // Actualizar vista previa del color
            if (colorPicker) {
                colorPicker.addEventListener('input', (e) => {
                    const colorPreview = document.getElementById('colorPreview');
                    if (colorPreview) {
                        colorPreview.style.backgroundColor = e.target.value;
                    }
                });
            }
            
            // Fecha de fin por defecto igual a inicio
            document.getElementById('eventStartDate')?.addEventListener('change', (e) => {
                const endDateInput = document.getElementById('eventEndDate');
                if (endDateInput && !endDateInput.value) {
                    endDateInput.value = e.target.value;
                }
            });
            
            // Prevenir que el clic en el formulario cierre el modal
            document.getElementById('calendarEventForm')?.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            console.debug('✅ Eventos del modal configurados correctamente');
        } catch (error) {
            console.error('❌ Error configurando eventos del modal:', error);
        }
    }

    // Navegar entre meses
    navigateMonth(direction) {
        console.debug(`📅 Navegando ${direction > 0 ? 'siguiente' : 'anterior'} mes`);
        
        this.currentMonth += direction;
        
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        
        console.debug(`📍 Nueva fecha: ${this.currentMonth + 1}/${this.currentYear}`);
        
        this.renderCalendar();
        this.renderMiniCalendar();
        this.updateCurrentDate();
    }

    // Navegar mini calendario
    navigateMiniCalendar(direction) {
        console.debug(`📅 Navegando mini calendario ${direction > 0 ? 'siguiente' : 'anterior'}`);
        
        const miniMonthElement = document.getElementById('miniMonth');
        const current = miniMonthElement.dataset.month || this.currentMonth;
        const currentYear = miniMonthElement.dataset.year || this.currentYear;
        
        let newMonth = parseInt(current) + direction;
        let newYear = parseInt(currentYear);
        
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        
        console.debug(`📍 Nuevo mes mini: ${newMonth + 1}/${newYear}`);
        
        this.renderMiniCalendar(newMonth, newYear);
    }

    // Establecer filtro - FUNCIÓN CORREGIDA
    setFilter(filter) {
        console.debug(`🔍 Cambiando filtro a: ${filter}`);
        
        this.activeFilter = filter;
        
        // Actualizar botones activos
        document.querySelectorAll('.calendar__filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // DEBUG: Mostrar qué eventos coinciden con el filtro
        console.debug(`🔍 Filtro activo: ${this.activeFilter}`);
        
        // Re-renderizar eventos
        this.renderCalendar();
        this.updateUpcomingEvents();
    }

    // Renderizar calendario
    renderCalendar() {
        console.debug('🎨 Renderizando calendario...');
        
        try {
            // Actualizar encabezados
            this.updateHeaders();
            
            // Renderizar vista mensual
            this.renderMonthView();
            
            console.debug('✅ Calendario renderizado correctamente');
        } catch (error) {
            console.error('❌ Error renderizando calendario:', error);
        }
    }

    // Actualizar encabezados
    updateHeaders() {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        // Actualizar mes y año
        const monthElement = document.getElementById('currentMonth');
        
        if (monthElement) {
            monthElement.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }
        
        // Actualizar mini calendario
        const miniMonth = this.currentMonth;
        const miniYear = this.currentYear;
        const miniMonthElement = document.getElementById('miniMonth');
        
        if (miniMonthElement) {
            miniMonthElement.textContent = `${monthNames[miniMonth].substring(0, 3)} ${miniYear}`;
            miniMonthElement.dataset.month = miniMonth;
            miniMonthElement.dataset.year = miniYear;
        }
    }

    // Actualizar fecha actual
    updateCurrentDate() {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateElement.textContent = `Hoy: ${today.toLocaleDateString('es-ES', options)}`;
        }
    }

    // Renderizar vista mensual
    renderMonthView() {
        console.debug('📅 Renderizando vista mensual...');
        
        const grid = document.getElementById('calendarGrid');
        if (!grid) {
            console.error('❌ Grid de calendario no encontrado');
            return;
        }
        
        grid.innerHTML = '';
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const firstDayIndex = firstDay.getDay();
        
        console.debug(`📊 Mes: ${daysInMonth} días, Primer día índice: ${firstDayIndex}`);
        
        // DEBUG: Mostrar información de filtro actual
        console.debug(`🔍 Filtro actual en renderMonthView: ${this.activeFilter}`);
        
        // Días del mes anterior
        const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const day = document.createElement('div');
            day.className = 'calendar__day other-month';
            day.innerHTML = `<div class="calendar__day-number">${prevMonthLastDay - i}</div>`;
            grid.appendChild(day);
        }
        
        // Días del mes actual
        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(this.currentYear, this.currentMonth, i);
            const isToday = this.isSameDay(date, today);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            // Obtener eventos para este día (incluyendo eventos de múltiples días)
            const dayEvents = this.getEventsForDate(date);
            const filteredEvents = this.filterEvents(dayEvents);
            const visibleEvents = filteredEvents.slice(0, 3);
            const hasMoreEvents = filteredEvents.length > 3;
            
            // DEBUG para el día actual
            if (i === today.getDate() && this.currentMonth === today.getMonth() && this.currentYear === today.getFullYear()) {
                console.debug(`📅 Día ${i}:`, {
                    totalEventos: dayEvents.length,
                    eventosFiltrados: filteredEvents.length,
                    filtroActivo: this.activeFilter,
                    eventos: dayEvents.map(e => ({ 
                        title: e.title, 
                        type: e.type,
                        coincideFiltro: this.doesEventMatchFilter(e, this.activeFilter)
                    }))
                });
            }
            
            const day = document.createElement('div');
            day.className = `calendar__day ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`;
            day.dataset.date = date.toISOString().split('T')[0];
            day.dataset.day = i;
            
            // Calcular si el día tiene eventos de múltiples días
            const multiDayEvents = dayEvents.filter(event => 
                event.endDate && event.startDate !== event.endDate
            );
            
            // Aplicar color de fondo para eventos de múltiples días
            multiDayEvents.forEach(event => {
                const eventStart = new Date(event.startDate);
                const eventEnd = new Date(event.endDate);
                
                if (date >= eventStart && date <= eventEnd) {
                    // Día de inicio - color completo
                    if (this.isSameDay(date, eventStart)) {
                        day.style.backgroundColor = event.color;
                        day.style.color = 'white';
                    } 
                    // Días intermedios - color con opacidad
                    else {
                        day.style.backgroundColor = this.hexToRgba(event.color, 0.2);
                        day.style.borderLeft = `3px solid ${event.color}`;
                    }
                }
            });
            
            day.innerHTML = `
                <div class="calendar__day-number">${i}</div>
                <div class="calendar__events">
                    ${visibleEvents.map(event => {
                        const isMultiDay = event.endDate && event.startDate !== event.endDate;
                        const isStartDay = this.isSameDay(date, new Date(event.startDate));
                        const eventClass = isMultiDay && !isStartDay ? 'calendar__event--multi-day' : '';
                        
                        return `
                            <div class="calendar__event ${eventClass}" 
                                 data-event-id="${event.id}"
                                 data-series-id="${event.seriesId || ''}"
                                 title="${event.title}"
                                 style="background-color: ${event.color}; ${isMultiDay && !isStartDay ? 'opacity: 0.7;' : ''}">
                                ${event.title}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${hasMoreEvents ? `<div class="calendar__more-events">+${filteredEvents.length - 3} más</div>` : ''}
            `;
            
            // Event listeners para el día
            day.addEventListener('click', (e) => {
                if (!e.target.closest('.calendar__event') && !e.target.closest('.calendar__more-events')) {
                    this.selectedDate = date;
                    this.openEventModal(date);
                }
            });
            
            // Event listeners para eventos individuales
            day.querySelectorAll('.calendar__event').forEach(eventEl => {
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const eventId = eventEl.dataset.eventId;
                    const seriesId = eventEl.dataset.seriesId;
                    
                    if (seriesId && seriesId !== 'single') {
                        // Si es un evento recurrente, mostrar modal de opciones
                        this.showRecurringEventOptions(eventId, seriesId);
                    } else {
                        this.editEvent(eventId);
                    }
                });
            });
            
            if (hasMoreEvents) {
                day.querySelector('.calendar__more-events')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showAllEventsForDate(date);
                });
            }
            
            grid.appendChild(day);
        }
        
        // Días del siguiente mes
        const totalCells = 42; // 6 semanas * 7 días
        const cellsUsed = firstDayIndex + daysInMonth;
        const nextMonthDays = totalCells - cellsUsed;
        
        for (let i = 1; i <= nextMonthDays; i++) {
            const day = document.createElement('div');
            day.className = 'calendar__day other-month';
            day.innerHTML = `<div class="calendar__day-number">${i}</div>`;
            grid.appendChild(day);
        }
    }

    // Renderizar mini calendario
    renderMiniCalendar(month = this.currentMonth, year = this.currentYear) {
        console.debug(`📅 Renderizando mini calendario: ${month + 1}/${year}`);
        
        const miniCalendar = document.getElementById('miniCalendar');
        if (!miniCalendar) return;
        
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                           'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        document.getElementById('miniMonth').textContent = `${monthNames[month]} ${year}`;
        document.getElementById('miniMonth').dataset.month = month;
        document.getElementById('miniMonth').dataset.year = year;
        
        miniCalendar.innerHTML = '';
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const firstDayIndex = (firstDay.getDay() + 6) % 7; // Lunes como primer día
        
        // Días vacíos al inicio
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar__mini-day other-month';
            miniCalendar.appendChild(emptyDay);
        }
        
        // Días del mes
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = this.isSameDay(date, today);
            
            // Obtener eventos filtrados para este día
            const dayEvents = this.getEventsForDate(date);
            const filteredEvents = this.filterEvents(dayEvents);
            const hasEvents = filteredEvents.length > 0;
            
            const dayDiv = document.createElement('div');
            dayDiv.className = `calendar__mini-day ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`;
            dayDiv.textContent = day;
            dayDiv.dataset.date = date.toISOString().split('T')[0];
            
            dayDiv.addEventListener('click', () => {
                console.debug(`📅 Mini calendario: clic en día ${day}`);
                this.currentMonth = month;
                this.currentYear = year;
                this.selectedDate = date;
                this.renderCalendar();
                this.updateCurrentDate();
            });
            
            miniCalendar.appendChild(dayDiv);
        }
    }

    // Abrir modal de evento
    openEventModal(date = this.selectedDate) {
        console.debug(`📋 Abriendo modal de evento para fecha: ${date.toISOString().split('T')[0]}`);
        
        const modal = document.getElementById('calendarEventModal');
        const form = document.getElementById('calendarEventForm');
        
        if (!modal) {
            console.error('❌ Modal no encontrado en el DOM');
            return;
        }
        
        // Configurar fecha por defecto
        const dateStr = date.toISOString().split('T')[0];
        const startDateInput = document.getElementById('eventStartDate');
        const endDateInput = document.getElementById('eventEndDate');
        
        if (startDateInput) startDateInput.value = dateStr;
        if (endDateInput && !endDateInput.value) endDateInput.value = dateStr;
        
        // Limpiar formulario si no se está editando
        if (!this.editingEvent) {
            form.reset();
            document.getElementById('deleteCalendarEvent').style.display = 'none';
            document.getElementById('modalEventTitle').textContent = 'Nuevo Evento';
            
            // Establecer fechas por defecto
            if (startDateInput) startDateInput.value = dateStr;
            if (endDateInput) endDateInput.value = dateStr;
            
            // Resetear color picker
            const colorPicker = document.getElementById('eventColor');
            const colorPreview = document.getElementById('colorPreview');
            if (colorPicker) colorPicker.value = '#3b82f6';
            if (colorPreview) colorPreview.style.backgroundColor = '#3b82f6';
            
            // Establecer valores por defecto
            document.getElementById('eventStartTime').value = '09:00';
            document.getElementById('eventEndTime').value = '17:00';
            
            // Establecer tipo por defecto basado en el filtro actual
            const eventTypeSelect = document.getElementById('eventType');
            if (eventTypeSelect && this.activeFilter !== 'all') {
                eventTypeSelect.value = this.activeFilter;
            }
        }
        
        // Usar atributo [open] para mostrar el modal
        modal.setAttribute('open', '');
        console.debug('✅ Modal de evento abierto correctamente');
    }

    // Guardar evento
    saveEvent() {
        console.debug('💾 Guardando evento...');
        
        try {
            const eventData = {
                id: this.editingEvent?.id || this.generateEventId(),
                title: document.getElementById('eventTitle').value.trim(),
                type: document.getElementById('eventType').value,
                color: document.getElementById('eventColor').value,
                startDate: document.getElementById('eventStartDate').value,
                startTime: document.getElementById('eventStartTime').value || '09:00',
                endDate: document.getElementById('eventEndDate').value || document.getElementById('eventStartDate').value,
                endTime: document.getElementById('eventEndTime').value || '17:00',
                location: document.getElementById('eventLocation').value.trim(),
                description: document.getElementById('eventDescription').value.trim(),
                reminder: document.getElementById('eventReminder').value,
                recurrence: document.querySelector('input[name="recurrence"]:checked')?.value || 'none',
                seriesId: this.editingEvent?.seriesId || this.generateSeriesId(),
                createdAt: this.editingEvent?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.debug('📝 Datos del evento:', eventData);
            
            // Validar campos requeridos
            if (!eventData.title || !eventData.startDate) {
                console.error('❌ Campos requeridos faltantes');
                this.showNotification('Por favor, complete los campos obligatorios', 'error');
                return;
            }
            
            // Validar fecha de fin
            if (eventData.endDate && new Date(eventData.endDate) < new Date(eventData.startDate)) {
                console.error('❌ Fecha de fin anterior a fecha de inicio');
                this.showNotification('La fecha de fin no puede ser anterior a la fecha de inicio', 'error');
                return;
            }
            
            // Si estamos editando una serie completa, eliminar todos los eventos de la serie
            if (this.editingSeriesId && this.editingSeriesId !== 'single') {
                console.debug(`🗑️ Eliminando serie completa: ${this.editingSeriesId}`);
                this.events = this.events.filter(e => e.seriesId !== this.editingSeriesId);
            } 
            // Si estamos editando un solo evento, eliminar solo ese evento
            else if (this.editingEvent) {
                console.debug(`🗑️ Eliminando evento individual: ${this.editingEvent.id}`);
                this.events = this.events.filter(e => e.id !== this.editingEvent.id);
            }
            
            // Generar eventos recurrentes si es necesario
            const eventsToSave = this.generateRecurringEvents(eventData);
            
            console.debug(`📊 Guardando ${eventsToSave.length} evento(s)`);
            
            // Agregar nuevos eventos
            eventsToSave.forEach(event => {
                this.events.push(event);
            });
            
            // Guardar en localStorage
            this.saveEvents();
            
            // Actualizar UI
            this.renderCalendar();
            this.updateUpcomingEvents();
            this.renderMiniCalendar();
            
            // Mostrar notificación
            const notificationText = eventsToSave.length > 1 
                ? `${eventsToSave.length} eventos guardados correctamente` 
                : `Evento "${eventData.title}" guardado correctamente`;
            
            this.showNotification(notificationText, 'success');
            
            // Cerrar modal y limpiar
            this.closeEventModal();
            
        } catch (error) {
            console.error('❌ Error guardando evento:', error);
            this.showNotification('Error al guardar el evento', 'error');
        }
    }

    // Generar eventos recurrentes
    generateRecurringEvents(eventData) {
        console.debug(`🔄 Generando eventos recurrentes para: ${eventData.title}`);
        
        const events = [];
        const startDate = new Date(eventData.startDate);
        const endDate = new Date(eventData.endDate || eventData.startDate);
        
        // Si no hay recurrencia, solo guardar el evento original
        if (eventData.recurrence === 'none') {
            eventData.seriesId = 'single';
            events.push(eventData);
            return events;
        }
        
        // Calcular la duración del evento en días
        const eventDurationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        // Generar eventos según el patrón de recurrencia
        let currentDate = new Date(startDate);
        const seriesId = eventData.seriesId;
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 2); // Limitar a 2 años en el futuro
        
        while (currentDate <= maxDate) {
            const eventStart = new Date(currentDate);
            const eventEnd = new Date(eventStart);
            eventEnd.setDate(eventEnd.getDate() + eventDurationDays);
            
            const eventCopy = {
                ...eventData,
                id: this.generateEventId(),
                seriesId: seriesId,
                startDate: eventStart.toISOString().split('T')[0],
                endDate: eventEnd.toISOString().split('T')[0]
            };
            
            events.push(eventCopy);
            
            // Determinar siguiente fecha según el patrón de recurrencia
            switch (eventData.recurrence) {
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
                default:
                    console.error(`❌ Patrón de recurrencia no válido: ${eventData.recurrence}`);
                    return events;
            }
        }
        
        console.debug(`📊 Generados ${events.length} eventos recurrentes`);
        return events;
    }

    // Mostrar modal de opciones para evento recurrente
    showRecurringEventOptions(eventId, seriesId) {
        console.debug(`🔄 Mostrando opciones para evento recurrente. Evento: ${eventId}, Serie: ${seriesId}`);
        
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;
        
        const seriesEvents = this.getEventsInSeries(seriesId);
        const currentMonthEvents = this.getEventsInSeriesForMonth(seriesId, new Date(event.startDate));
        
        // Crear modal de opciones
        const optionsModal = document.createElement('div');
        optionsModal.className = 'modal';
        optionsModal.innerHTML = `
            <div class="modal__backdrop"></div>
            <article class="modal__content">
                <header class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-redo me-2"></i>
                        Evento Recurrente
                    </h3>
                    <button class="modal__close" id="closeOptionsModal">&times;</button>
                </header>
                <section class="modal__body">
                    <div class="action-modal__content">
                        <div class="action-modal__icon action-modal__icon--info">
                            <i class="fas fa-calendar-week"></i>
                        </div>
                        <p class="action-modal__message">
                            <strong>"${event.title}"</strong><br>
                            Este evento es parte de una serie recurrente.<br>
                            <small>${seriesEvents.length} eventos en total</small>
                        </p>
                        <div class="recurring-options">
                            <div class="option-card" data-action="single">
                                <div class="option-icon">
                                    <i class="fas fa-calendar-day"></i>
                                </div>
                                <div class="option-content">
                                    <h4>Solo este evento</h4>
                                    <p>Editar o eliminar solo el evento de esta fecha específica</p>
                                </div>
                            </div>
                            <div class="option-card" data-action="month">
                                <div class="option-icon">
                                    <i class="fas fa-calendar-alt"></i>
                                </div>
                                <div class="option-content">
                                    <h4>Este mes (${currentMonthEvents.length})</h4>
                                    <p>Afectar a los ${currentMonthEvents.length} eventos de este mes</p>
                                </div>
                            </div>
                            <div class="option-card" data-action="series">
                                <div class="option-icon">
                                    <i class="fas fa-layer-group"></i>
                                </div>
                                <div class="option-content">
                                    <h4>Toda la serie (${seriesEvents.length})</h4>
                                    <p>Afectar a los ${seriesEvents.length} eventos de toda la serie</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <footer class="modal__footer modal__footer--centered">
                    <button type="button" class="btn btn--outline" id="cancelOptions">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                </footer>
            </article>
        `;
        
        document.body.appendChild(optionsModal);
        optionsModal.setAttribute('open', '');
        
        // Añadir estilos para las opciones
        const optionsStyles = document.createElement('style');
        optionsStyles.textContent = `
            .recurring-options {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-top: 1.5rem;
            }
            .option-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: var(--bg-secondary);
                border-radius: var(--radius-md);
                border: 2px solid var(--border);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .option-card:hover {
                border-color: var(--primary);
                transform: translateY(-2px);
                box-shadow: var(--shadow-sm);
            }
            .option-card[data-action="month"] {
                border-color: var(--warning);
            }
            .option-card[data-action="series"] {
                border-color: var(--danger);
            }
            .option-icon {
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-tertiary);
                border-radius: var(--radius-md);
                color: var(--primary);
                font-size: 1.25rem;
                flex-shrink: 0;
            }
            .option-card[data-action="month"] .option-icon {
                background: rgba(245, 158, 11, 0.1);
                color: var(--warning);
            }
            .option-card[data-action="series"] .option-icon {
                background: rgba(239, 68, 68, 0.1);
                color: var(--danger);
            }
            .option-content {
                flex: 1;
            }
            .option-content h4 {
                margin: 0 0 0.25rem;
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-primary);
            }
            .option-content p {
                margin: 0;
                font-size: 0.875rem;
                color: var(--text-secondary);
                line-height: 1.4;
            }
        `;
        document.head.appendChild(optionsStyles);
        
        // Configurar event listeners para el modal
        const closeModal = () => {
            optionsModal.remove();
            optionsStyles.remove();
        };
        
        optionsModal.querySelector('#closeOptionsModal').addEventListener('click', closeModal);
        optionsModal.querySelector('#cancelOptions').addEventListener('click', closeModal);
        optionsModal.querySelector('.modal__backdrop').addEventListener('click', closeModal);
        
        // Event listeners para las opciones
        optionsModal.querySelectorAll('.option-card').forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                closeModal();
                
                if (action === 'single') {
                    this.editEvent(eventId, 'single');
                } else if (action === 'month') {
                    this.editEvent(eventId, 'month');
                } else if (action === 'series') {
                    this.editEvent(eventId, seriesId);
                }
            });
        });
    }

    // Editar evento
    editEvent(eventId, seriesAction = null) {
        console.debug(`✏️ Editando evento ID: ${eventId}, Acción: ${seriesAction || 'individual'}`);
        
        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            console.error(`❌ Evento no encontrado: ${eventId}`);
            this.showNotification('Evento no encontrado', 'error');
            return;
        }
        
        this.editingEvent = event;
        
        if (seriesAction === 'single') {
            this.editingSeriesId = 'single';
        } else if (seriesAction === 'month') {
            this.editingSeriesId = 'month';
        } else if (seriesAction === event.seriesId) {
            this.editingSeriesId = event.seriesId;
        } else {
            this.editingSeriesId = event.seriesId === 'single' ? 'single' : null;
        }
        
        console.debug('📝 Cargando datos del evento:', {
            evento: event,
            serieId: this.editingSeriesId,
            accion: seriesAction
        });
        
        // Llenar formulario con datos del evento
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventType').value = event.type;
        document.getElementById('eventColor').value = event.color;
        document.getElementById('eventStartDate').value = event.startDate;
        document.getElementById('eventStartTime').value = event.startTime || '09:00';
        document.getElementById('eventEndDate').value = event.endDate || event.startDate;
        document.getElementById('eventEndTime').value = event.endTime || '17:00';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventReminder').value = event.reminder || '';
        
        // Actualizar vista previa del color
        const colorPreview = document.getElementById('colorPreview');
        if (colorPreview) colorPreview.style.backgroundColor = event.color;
        
        // Seleccionar recurrencia
        const recurrenceInput = document.querySelector(`input[name="recurrence"][value="${event.recurrence || 'none'}"]`);
        if (recurrenceInput) recurrenceInput.checked = true;
        
        // Actualizar UI del modal
        let modalTitle = 'Editar Evento';
        if (this.editingSeriesId === 'single') {
            modalTitle = 'Editar Evento (Solo este)';
        } else if (this.editingSeriesId === 'month') {
            const monthEvents = this.getEventsInSeriesForMonth(event.seriesId, new Date(event.startDate));
            modalTitle = `Editar Eventos del Mes (${monthEvents.length})`;
        } else if (this.editingSeriesId && this.editingSeriesId !== 'single') {
            const seriesEvents = this.getEventsInSeries(event.seriesId);
            modalTitle = `Editar Serie Completa (${seriesEvents.length})`;
        }
        
        document.getElementById('modalEventTitle').textContent = modalTitle;
        document.getElementById('deleteCalendarEvent').style.display = 'block';
        
        // Abrir modal
        this.openEventModal(new Date(event.startDate));
    }

    // Eliminar evento
    deleteEvent() {
        if (!this.editingEvent) {
            console.error('❌ No hay evento para eliminar');
            return;
        }
        
        const event = this.editingEvent;
        const isRecurring = event.recurrence && event.recurrence !== 'none';
        const isSeries = event.seriesId && event.seriesId !== 'single';
        
        if (isRecurring && isSeries) {
            // Para eventos recurrentes, mostrar modal de opciones
            this.showDeleteRecurringOptions();
            return;
        } else {
            // Para eventos individuales
            this.showConfirmDeleteModal('single');
        }
    }

    // Mostrar opciones para eliminar evento recurrente
    showDeleteRecurringOptions() {
        const event = this.editingEvent;
        const seriesId = event.seriesId;
        const seriesEvents = this.getEventsInSeries(seriesId);
        const currentMonthEvents = this.getEventsInSeriesForMonth(seriesId, new Date(event.startDate));
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal__backdrop"></div>
            <article class="modal__content">
                <header class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-trash me-2"></i>
                        Eliminar Evento Recurrente
                    </h3>
                    <button class="modal__close" id="closeDeleteOptionsModal">&times;</button>
                </header>
                <section class="modal__body">
                    <div class="action-modal__content">
                        <div class="action-modal__icon action-modal__icon--warning">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <p class="action-modal__message">
                            <strong>"${event.title}"</strong><br>
                            Este evento es parte de una serie recurrente.<br>
                            <small>${seriesEvents.length} eventos en total</small>
                        </p>
                        <div class="recurring-options">
                            <div class="option-card delete-option" data-action="single">
                                <div class="option-icon delete-icon">
                                    <i class="fas fa-calendar-day"></i>
                                </div>
                                <div class="option-content">
                                    <h4>Solo este evento</h4>
                                    <p>Eliminar solo el evento de esta fecha específica</p>
                                    <div class="option-details">
                                        <span class="badge badge--light">1 evento</span>
                                    </div>
                                </div>
                            </div>
                            <div class="option-card delete-option" data-action="month">
                                <div class="option-icon delete-icon">
                                    <i class="fas fa-calendar-alt"></i>
                                </div>
                                <div class="option-content">
                                    <h4>Este mes</h4>
                                    <p>Eliminar los ${currentMonthEvents.length} eventos de este mes</p>
                                    <div class="option-details">
                                        <span class="badge badge--warning">${currentMonthEvents.length} eventos</span>
                                    </div>
                                </div>
                            </div>
                            <div class="option-card delete-option" data-action="series">
                                <div class="option-icon delete-icon">
                                    <i class="fas fa-layer-group"></i>
                                </div>
                                <div class="option-content">
                                    <h4>Toda la serie</h4>
                                    <p>Eliminar los ${seriesEvents.length} eventos de toda la serie</p>
                                    <div class="option-details">
                                        <span class="badge badge--danger">${seriesEvents.length} eventos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <footer class="modal__footer modal__footer--centered">
                    <button type="button" class="btn btn--outline" id="cancelDeleteOptions">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                </footer>
            </article>
        `;
        
        document.body.appendChild(modal);
        modal.setAttribute('open', '');
        
        // Añadir estilos para las opciones de eliminación
        const deleteStyles = document.createElement('style');
        deleteStyles.textContent = `
            .recurring-options {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-top: 1.5rem;
            }
            .delete-option {
                border: 2px solid var(--border);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .delete-option:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-sm);
            }
            .delete-option[data-action="single"]:hover {
                border-color: var(--primary);
            }
            .delete-option[data-action="month"]:hover {
                border-color: var(--warning);
            }
            .delete-option[data-action="series"]:hover {
                border-color: var(--danger);
            }
            .delete-icon {
                background: var(--bg-tertiary);
                color: var(--primary);
            }
            .delete-option[data-action="month"] .delete-icon {
                background: rgba(245, 158, 11, 0.1);
                color: var(--warning);
            }
            .delete-option[data-action="series"] .delete-icon {
                background: rgba(239, 68, 68, 0.1);
                color: var(--danger);
            }
            .option-details {
                margin-top: 0.5rem;
                display: flex;
                gap: 0.5rem;
            }
            .badge--warning {
                background: rgba(245, 158, 11, 0.1);
                color: var(--warning);
                border: 1px solid rgba(245, 158, 11, 0.2);
            }
            .badge--danger {
                background: rgba(239, 68, 68, 0.1);
                color: var(--danger);
                border: 1px solid rgba(239, 68, 68, 0.2);
            }
        `;
        document.head.appendChild(deleteStyles);
        
        const closeModal = () => {
            modal.remove();
            deleteStyles.remove();
        };
        
        modal.querySelector('#closeDeleteOptionsModal').addEventListener('click', closeModal);
        modal.querySelector('#cancelDeleteOptions').addEventListener('click', closeModal);
        modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);
        
        // Event listeners para las opciones de eliminación
        modal.querySelectorAll('.delete-option').forEach(card => {
            card.addEventListener('click', () => {
                const action = card.dataset.action;
                closeModal();
                
                if (action === 'single') {
                    this.showConfirmDeleteModal('single');
                } else if (action === 'month') {
                    this.showConfirmDeleteModal('month');
                } else if (action === 'series') {
                    this.showConfirmDeleteModal('series');
                }
            });
        });
    }

    // Mostrar modal de confirmación para eliminar
    showConfirmDeleteModal(actionType) {
        const event = this.editingEvent;
        let eventCount = 1;
        let description = '';
        
        if (actionType === 'single') {
            description = `¿Está seguro de eliminar el evento "<strong>${event.title}</strong>"?<br><br>
                          Esta acción no se puede deshacer.`;
        } else if (actionType === 'month') {
            const currentMonthEvents = this.getEventsInSeriesForMonth(event.seriesId, new Date(event.startDate));
            eventCount = currentMonthEvents.length;
            description = `¿Está seguro de eliminar <strong>${eventCount} eventos</strong> del mes?<br><br>
                          Esta acción eliminará todos los eventos de "<strong>${event.title}</strong>" 
                          de este mes y no se puede deshacer.`;
        } else if (actionType === 'series') {
            const seriesEvents = this.getEventsInSeries(event.seriesId);
            eventCount = seriesEvents.length;
            description = `¿Está seguro de eliminar <strong>${eventCount} eventos</strong> de toda la serie?<br><br>
                          Esta acción eliminará todos los eventos de "<strong>${event.title}</strong>" 
                          y no se puede deshacer.`;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <div class="modal__backdrop"></div>
            <article class="modal__content modal__content--sm">
                <header class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-trash me-2"></i>
                        ${actionType === 'single' ? 'Eliminar Evento' : 
                          actionType === 'month' ? 'Eliminar Eventos del Mes' : 
                          'Eliminar Serie Completa'}
                    </h3>
                    <button class="modal__close" id="closeConfirmModal">&times;</button>
                </header>
                <section class="modal__body">
                    <div class="action-modal__content">
                        <div class="action-modal__icon action-modal__icon--warning">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <p class="action-modal__message">
                            ${description}
                        </p>
                    </div>
                </section>
                <footer class="modal__footer modal__footer--centered">
                    <button type="button" class="btn btn--outline" id="cancelDelete">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                    <button type="button" class="btn btn--danger" id="confirmDelete">
                        <i class="fas fa-trash"></i>
                        ${actionType === 'single' ? 'Eliminar Evento' : 
                          actionType === 'month' ? `Eliminar ${eventCount} Eventos` : 
                          `Eliminar Serie (${eventCount})`}
                    </button>
                </footer>
            </article>
        `;
        
        document.body.appendChild(modal);
        modal.setAttribute('open', '');
        
        const closeModal = () => {
            modal.remove();
        };
        
        modal.querySelector('#closeConfirmModal').addEventListener('click', closeModal);
        modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);
        modal.querySelector('#cancelDelete').addEventListener('click', closeModal);
        
        modal.querySelector('#confirmDelete').addEventListener('click', () => {
            closeModal();
            this.executeDelete(actionType);
        });
    }

    // Ejecutar eliminación
    executeDelete(actionType) {
        const event = this.editingEvent;
        let deletedCount = 0;
        
        // Realizar la eliminación
        if (actionType === 'single') {
            console.debug(`🗑️ Eliminando evento individual: ${event.id}`);
            this.events = this.events.filter(e => e.id !== event.id);
            deletedCount = 1;
        } 
        else if (actionType === 'month') {
            // Eliminar eventos del mismo mes
            const eventDate = new Date(event.startDate);
            const eventMonth = eventDate.getMonth();
            const eventYear = eventDate.getFullYear();
            
            const eventsToDelete = this.events.filter(e => 
                e.seriesId === event.seriesId && 
                this.isEventInMonth(e, eventMonth, eventYear)
            );
            
            console.debug(`🗑️ Eliminando ${eventsToDelete.length} eventos del mes`);
            this.events = this.events.filter(e => 
                !(e.seriesId === event.seriesId && this.isEventInMonth(e, eventMonth, eventYear))
            );
            
            deletedCount = eventsToDelete.length;
        } 
        else if (actionType === 'series') {
            // Eliminar toda la serie
            const seriesId = event.seriesId;
            const seriesEvents = this.getEventsInSeries(seriesId);
            
            console.debug(`🗑️ Eliminando serie completa: ${seriesId} (${seriesEvents.length} eventos)`);
            this.events = this.events.filter(e => e.seriesId !== seriesId);
            
            deletedCount = seriesEvents.length;
        }
        
        // Guardar cambios
        this.saveEvents();
        
        // Actualizar UI
        this.renderCalendar();
        this.updateUpcomingEvents();
        
        // Mostrar notificación
        let notificationText = '';
        if (actionType === 'single') {
            notificationText = `Evento "${event.title}" eliminado`;
        } else if (actionType === 'month') {
            notificationText = `${deletedCount} eventos del mes eliminados`;
        } else if (actionType === 'series') {
            notificationText = `Serie completa (${deletedCount} eventos) eliminada`;
        }
        
        this.showNotification(notificationText, 'info');
        
        // Cerrar modal
        this.closeEventModal();
    }

    // Verificar si un evento está en un mes específico
    isEventInMonth(event, month, year) {
        const eventDate = new Date(event.startDate);
        return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    }

    // Obtener eventos en una serie para un mes específico
    getEventsInSeriesForMonth(seriesId, date) {
        const targetMonth = date.getMonth();
        const targetYear = date.getFullYear();
        
        return this.events.filter(event => 
            event.seriesId === seriesId && 
            this.isEventInMonth(event, targetMonth, targetYear)
        );
    }

    // Cerrar modal de evento
    closeEventModal() {
        const modal = document.getElementById('calendarEventModal');
        if (modal) {
            modal.removeAttribute('open');
        }
        this.editingEvent = null;
        this.editingSeriesId = null;
        document.getElementById('calendarEventForm').reset();
    }

    // Obtener eventos en una serie
    getEventsInSeries(seriesId) {
        return this.events.filter(event => event.seriesId === seriesId);
    }

    // Mostrar todos los eventos de una fecha
    showAllEventsForDate(date) {
        console.debug(`📅 Mostrando todos los eventos para: ${date.toISOString().split('T')[0]}`);
        
        const events = this.getEventsForDate(date);
        const filteredEvents = this.filterEvents(events);
        
        if (filteredEvents.length === 0) {
            console.debug('📅 No hay eventos para esta fecha');
            this.showNotification('No hay eventos para esta fecha', 'info');
            return;
        }
        
        // Crear modal para mostrar eventos
        const eventsModal = document.createElement('div');
        eventsModal.className = 'modal';
        
        const formattedDate = date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let eventsHTML = '';
        filteredEvents.forEach((event, index) => {
            const time = event.startTime ? ` a las ${event.startTime}` : '';
            const isRecurring = event.recurrence && event.recurrence !== 'none';
            const recurringText = isRecurring ? ` (${event.recurrence})` : '';
            
            eventsHTML += `
                <div class="event-detail-item">
                    <div class="event-detail-header">
                        <span class="event-index">${index + 1}.</span>
                        <strong class="event-title">${event.title}${time}${recurringText}</strong>
                    </div>
                    ${event.location ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : ''}
                    ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                </div>
            `;
        });
        
        eventsModal.innerHTML = `
            <div class="modal__backdrop"></div>
            <article class="modal__content">
                <header class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-calendar-day me-2"></i>
                        Eventos del ${formattedDate}
                    </h3>
                    <button class="modal__close" id="closeEventsModal">&times;</button>
                </header>
                <section class="modal__body">
                    <div class="events-list">
                        ${eventsHTML}
                    </div>
                </section>
                <footer class="modal__footer">
                    <button type="button" class="btn btn--primary" id="closeEventsModalBtn">
                        <i class="fas fa-times"></i>
                        Cerrar
                    </button>
                </footer>
            </article>
        `;
        
        document.body.appendChild(eventsModal);
        eventsModal.setAttribute('open', '');
        
        // Añadir estilos para la lista de eventos
        const eventsStyles = document.createElement('style');
        eventsStyles.textContent = `
            .events-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            .event-detail-item {
                padding: 1rem;
                background: var(--bg-secondary);
                border-radius: var(--radius-md);
                border-left: 4px solid var(--primary);
            }
            .event-detail-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            .event-index {
                color: var(--primary);
                font-weight: bold;
                font-size: 1.1rem;
            }
            .event-title {
                color: var(--text-primary);
                font-size: 1rem;
            }
            .event-location {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--text-secondary);
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }
            .event-location i {
                color: var(--primary);
            }
            .event-description {
                color: var(--text-secondary);
                font-size: 0.9rem;
                line-height: 1.4;
                padding-left: 1.5rem;
                border-left: 2px solid var(--border);
            }
        `;
        document.head.appendChild(eventsStyles);
        
        // Configurar eventos del modal
        const closeModal = () => {
            eventsModal.remove();
            eventsStyles.remove();
        };
        
        eventsModal.querySelector('#closeEventsModal').addEventListener('click', closeModal);
        eventsModal.querySelector('#closeEventsModalBtn').addEventListener('click', closeModal);
        eventsModal.querySelector('.modal__backdrop').addEventListener('click', closeModal);
    }

    // Actualizar eventos próximos - FUNCIÓN MODIFICADA
    updateUpcomingEvents() {
        console.debug('📅 Actualizando eventos próximos...');
        
        const upcomingList = document.getElementById('upcomingEvents');
        const countElement = document.getElementById('upcomingCount');
        
        if (!upcomingList || !countElement) {
            console.error('❌ Elementos de eventos próximos no encontrados');
            return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Obtener eventos próximos (próximos 7 días)
        const upcomingEvents = this.events
            .filter(event => {
                const eventDate = new Date(event.startDate);
                eventDate.setHours(0, 0, 0, 0);
                const diffTime = eventDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
            })
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, 10); // Mostrar hasta 10 eventos
        
        // Aplicar filtro
        const filteredEvents = this.filterEvents(upcomingEvents);
        
        // DEBUG: Mostrar información sobre eventos próximos
        console.debug('📅 Eventos próximos encontrados:', {
            total: upcomingEvents.length,
            filtrados: filteredEvents.length,
            filtro: this.activeFilter,
            eventos: filteredEvents.map(e => ({ title: e.title, type: e.type }))
        });
        
        // Actualizar contador
        countElement.textContent = filteredEvents.length;
        
        // Renderizar eventos
        if (filteredEvents.length === 0) {
            upcomingList.innerHTML = `
                <div class="calendar__upcoming-empty">
                    <i class="fas fa-calendar-times"></i>
                    <p>No hay eventos próximos ${this.activeFilter !== 'all' ? `para ${this.getFilterName(this.activeFilter)}` : ''}</p>
                </div>
            `;
        } else {
            upcomingList.innerHTML = filteredEvents.map(event => {
                const eventDate = new Date(event.startDate);
                const diffTime = eventDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let dateText = '';
                if (diffDays === 0) {
                    dateText = `Hoy - ${event.startTime || 'Todo el día'}`;
                } else if (diffDays === 1) {
                    dateText = `Mañana - ${event.startTime || 'Todo el día'}`;
                } else {
                    dateText = `${eventDate.toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short' 
                    })} - ${event.startTime || 'Todo el día'}`;
                }
                
                const isUrgent = diffDays === 0;
                const isImportant = diffDays <= 2;
                
                return `
                    <div class="calendar__upcoming-item ${isUrgent ? 'calendar__upcoming-item--urgent' : ''} ${isImportant ? 'calendar__upcoming-item--important' : ''}" 
                         data-event-id="${event.id}"
                         data-series-id="${event.seriesId || ''}">
                        <div class="calendar__upcoming-date">
                            <i class="fas fa-calendar-day"></i>
                            ${dateText}
                        </div>
                        <div class="calendar__upcoming-event">${event.title}</div>
                        ${event.location ? `<div class="calendar__upcoming-details">${event.location}</div>` : ''}
                    </div>
                `;
            }).join('');
        }
        
        // Agregar event listeners
        upcomingList.querySelectorAll('.calendar__upcoming-item').forEach(item => {
            item.addEventListener('click', () => {
                const eventId = item.dataset.eventId;
                const seriesId = item.dataset.seriesId;
                
                if (seriesId && seriesId !== 'single') {
                    this.showRecurringEventOptions(eventId, seriesId);
                } else {
                    this.editEvent(eventId);
                }
            });
        });
        
        console.debug(`✅ Eventos próximos actualizados: ${filteredEvents.length} eventos`);
    }

    // Imprimir calendario
    printCalendar() {
        console.debug('🖨️ Generando vista para impresión...');
        
        try {
            // Crear una ventana de impresión
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                console.error('❌ No se pudo abrir ventana de impresión');
                this.showNotification('Por favor, habilite las ventanas emergentes para imprimir', 'error');
                return;
            }
            
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            
            // Contenido HTML para impresión
            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Calendario Académico - ${monthNames[this.currentMonth]} ${this.currentYear}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .print-header { text-align: center; margin-bottom: 30px; }
                        .print-header h1 { color: #333; margin: 0; }
                        .print-header .subtitle { color: #666; margin-top: 5px; }
                        .print-calendar { width: 100%; border-collapse: collapse; }
                        .print-calendar th { background: #f0f0f0; padding: 10px; text-align: center; border: 1px solid #ddd; }
                        .print-calendar td { padding: 10px; border: 1px solid #ddd; vertical-align: top; height: 100px; }
                        .print-day { font-weight: bold; margin-bottom: 5px; }
                        .print-event { font-size: 11px; margin: 2px 0; padding: 2px 5px; border-radius: 3px; color: white; }
                        .print-today { background: #e3f2fd; }
                        .print-weekend { background: #f9f9f9; }
                        .print-footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
                        @media print {
                            body { margin: 0; }
                            .print-header { margin-bottom: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>Calendario Académico</h1>
                        <div class="subtitle">${monthNames[this.currentMonth]} ${this.currentYear}</div>
                        <div class="subtitle">Generado el ${new Date().toLocaleDateString()}</div>
                    </div>
                    
                    <table class="print-calendar">
                        <thead>
                            <tr>
                                <th>Dom</th><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generatePrintCalendarGrid()}
                        </tbody>
                    </table>
                    
                    <div class="print-footer">
                        Sistema de Gestión Documental - Calendario Académico
                    </div>
                    
                    <script>
                        window.onload = () => window.print();
                    </script>
                </body>
                </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            console.debug('✅ Vista de impresión generada correctamente');
        } catch (error) {
            console.error('❌ Error generando vista de impresión:', error);
            this.showNotification('Error al generar la vista de impresión', 'error');
        }
    }

    // Generar grid para impresión
    generatePrintCalendarGrid() {
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const firstDayIndex = firstDay.getDay();
        
        let rows = '';
        let dayCounter = 0;
        
        for (let week = 0; week < 6; week++) {
            rows += '<tr>';
            
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                const cellIndex = week * 7 + dayOfWeek;
                let cellContent = '';
                let cellClass = '';
                
                if (cellIndex >= firstDayIndex && dayCounter < daysInMonth) {
                    dayCounter++;
                    const date = new Date(this.currentYear, this.currentMonth, dayCounter);
                    const isToday = this.isSameDay(date, new Date());
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const events = this.getEventsForDate(date);
                    
                    cellClass = `${isToday ? 'print-today' : ''} ${isWeekend ? 'print-weekend' : ''}`;
                    cellContent = `
                        <div class="print-day">${dayCounter}</div>
                        ${events.map(event => `
                            <div class="print-event" style="background-color: ${event.color}">
                                ${event.startTime ? event.startTime.substring(0,5) : ''} ${event.title}
                            </div>
                        `).join('')}
                    `;
                }
                
                rows += `<td class="${cellClass}">${cellContent}</td>`;
            }
            
            rows += '</tr>';
            
            if (dayCounter >= daysInMonth) break;
        }
        
        return rows;
    }

    // ===== FUNCIONES AUXILIARES CORREGIDAS =====

    // Obtener eventos para una fecha específica (incluyendo eventos de múltiples días)
    getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.events.filter(event => {
            const eventStart = new Date(event.startDate);
            const eventEnd = new Date(event.endDate || event.startDate);
            const targetDate = new Date(dateStr);
            
            // El evento ocurre en esta fecha si la fecha está entre startDate y endDate
            return targetDate >= eventStart && targetDate <= eventEnd;
        });
    }

    // CORRECCIÓN PRINCIPAL: Función para verificar si un evento coincide con el filtro
    doesEventMatchFilter(event, filter) {
        if (filter === 'all') return true;
        
        // Mapeo de tipos de evento a los filtros disponibles
        const typeMap = {
            'academic': ['academic', 'academico', 'académico'],
            'meetings': ['meetings', 'reunion', 'reunión', 'reuniones'],
            'deadlines': ['deadlines', 'plazo', 'plazos', 'deadline'],
            'holidays': ['holidays', 'festivo', 'festivos', 'vacaciones']
        };
        
        const eventType = (event.type || '').toLowerCase().trim();
        const filterTypes = typeMap[filter] || [filter];
        
        return filterTypes.some(type => eventType.includes(type.toLowerCase()));
    }

    // Filtrar eventos según el filtro activo - FUNCIÓN CORREGIDA
    filterEvents(events) {
        console.debug(`🔍 Filtrando ${events.length} eventos con filtro: ${this.activeFilter}`);
        
        if (this.activeFilter === 'all') {
            console.debug(`✅ Mostrando todos los ${events.length} eventos`);
            return events;
        }
        
        const filtered = events.filter(event => this.doesEventMatchFilter(event, this.activeFilter));
        
        // DEBUG: Mostrar qué eventos fueron filtrados
        console.debug(`🔍 Eventos filtrados (${filtered.length}/${events.length}):`, 
            filtered.map(e => ({ title: e.title, type: e.type }))
        );
        
        return filtered;
    }

    // Obtener nombre legible del filtro
    getFilterName(filter) {
        const filterNames = {
            'all': 'todos los eventos',
            'academic': 'académicos',
            'meetings': 'reuniones',
            'deadlines': 'plazos',
            'holidays': 'festivos'
        };
        return filterNames[filter] || filter;
    }

    // Verificar si dos fechas son el mismo día
    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // Convertir hex a rgba
    hexToRgba(hex, alpha = 1) {
        try {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } catch (error) {
            console.error('❌ Error convirtiendo color hex:', error);
            return `rgba(59, 130, 246, ${alpha})`; // Color por defecto
        }
    }

    // Generar ID único para evento
    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Generar ID único para serie de eventos
    generateSeriesId() {
        return 'series_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Cargar eventos desde localStorage - CON EVENTOS DE EJEMPLO MEJORADOS
    loadEvents() {
        try {
            const saved = localStorage.getItem('calendar_events');
            if (saved) {
                const events = JSON.parse(saved);
                console.debug(`📂 Eventos cargados desde localStorage: ${events.length} eventos`);
                
                // DEBUG: Mostrar todos los tipos de eventos disponibles
                const uniqueTypes = [...new Set(events.map(e => e.type))];
                console.debug('🔍 Tipos de eventos encontrados:', uniqueTypes);
                
                // Asegurarnos de que todos los eventos tengan seriesId
                events.forEach(event => {
                    if (!event.seriesId) {
                        event.seriesId = event.recurrence && event.recurrence !== 'none' 
                            ? this.generateSeriesId() 
                            : 'single';
                    }
                });
                
                return events;
            }
        } catch (error) {
            console.error('❌ Error al cargar eventos desde localStorage:', error);
        }
        
        console.debug('📂 No hay eventos guardados, creando eventos de ejemplo con todos los tipos');
        return this.getSampleEvents();
    }

    // Crear eventos de ejemplo con todos los tipos - NUEVA FUNCIÓN MEJORADA
    getSampleEvents() {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const sampleEvents = [
            {
                id: this.generateEventId(),
                title: 'Examen Final Matemáticas',
                type: 'academic',
                color: '#3b82f6',
                startDate: this.formatDate(today),
                startTime: '09:00',
                endDate: this.formatDate(today),
                endTime: '11:00',
                location: 'Aula 101',
                description: 'Examen final del curso de Matemáticas Avanzadas',
                reminder: '1_day',
                recurrence: 'none',
                seriesId: 'single',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: this.generateEventId(),
                title: 'Reunión de Departamento',
                type: 'meetings',
                color: '#10b981',
                startDate: this.formatDate(this.addDays(today, 1)),
                startTime: '14:00',
                endDate: this.formatDate(this.addDays(today, 1)),
                endTime: '16:00',
                location: 'Sala de Conferencias',
                description: 'Reunión mensual del departamento académico',
                reminder: '30_minutes',
                recurrence: 'monthly',
                seriesId: this.generateSeriesId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: this.generateEventId(),
                title: 'Entrega Proyecto Final',
                type: 'deadlines',
                color: '#f59e0b',
                startDate: this.formatDate(this.addDays(today, 3)),
                startTime: '23:59',
                endDate: this.formatDate(this.addDays(today, 3)),
                endTime: '23:59',
                location: 'Plataforma Virtual',
                description: 'Fecha límite para entrega del proyecto final',
                reminder: '2_days',
                recurrence: 'none',
                seriesId: 'single',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: this.generateEventId(),
                title: 'Día Festivo Nacional',
                type: 'holidays',
                color: '#ef4444',
                startDate: this.formatDate(this.addDays(today, 5)),
                startTime: '00:00',
                endDate: this.formatDate(this.addDays(today, 5)),
                endTime: '23:59',
                location: '',
                description: 'Día festivo nacional - No hay clases',
                reminder: '',
                recurrence: 'yearly',
                seriesId: this.generateSeriesId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: this.generateEventId(),
                title: 'Conferencia Invitado Especial',
                type: 'academic',
                color: '#8b5cf6',
                startDate: this.formatDate(this.addDays(today, 2)),
                startTime: '10:00',
                endDate: this.formatDate(this.addDays(today, 2)),
                endTime: '12:00',
                location: 'Auditorio Principal',
                description: 'Conferencia sobre Inteligencia Artificial',
                reminder: '1_hour',
                recurrence: 'none',
                seriesId: 'single',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: this.generateEventId(),
                title: 'Reunión de Estudiantes',
                type: 'meetings',
                color: '#06b6d4',
                startDate: this.formatDate(this.addDays(today, 4)),
                startTime: '16:00',
                endDate: this.formatDate(this.addDays(today, 4)),
                endTime: '18:00',
                location: 'Cafetería',
                description: 'Reunión del consejo estudiantil',
                reminder: '15_minutes',
                recurrence: 'weekly',
                seriesId: this.generateSeriesId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        console.debug('📋 Eventos de ejemplo creados con todos los tipos');
        sampleEvents.forEach(event => {
            console.debug(`  • ${event.title} - Tipo: ${event.type}`);
        });
        
        return sampleEvents;
    }

    // Función auxiliar para formatear fechas
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Función auxiliar para añadir días
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    // Guardar eventos en localStorage
    saveEvents() {
        try {
            localStorage.setItem('calendar_events', JSON.stringify(this.events));
            console.debug(`💾 Eventos guardados en localStorage: ${this.events.length} eventos`);
        } catch (error) {
            console.error('❌ Error al guardar eventos en localStorage:', error);
        }
    }

    // Mostrar modal de reinicio del calendario
    showResetCalendarModal() {
        console.debug('🔄 Mostrando modal de reinicio del calendario');
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal__backdrop"></div>
            <article class="modal__content modal__content--sm">
                <header class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-trash-alt me-2"></i>
                        Reiniciar Calendario
                    </h3>
                    <button class="modal__close" id="closeResetModal">&times;</button>
                </header>
                <section class="modal__body">
                    <div class="action-modal__content">
                        <div class="action-modal__icon action-modal__icon--warning">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <p class="action-modal__message">
                            <strong>¿Estás seguro de reiniciar el calendario?</strong><br><br>
                            Esta acción eliminará <strong>todos los eventos</strong> y restaurará 
                            los eventos de ejemplo.<br><br>
                            <small>Esta acción no se puede deshacer.</small>
                        </p>
                    </div>
                </section>
                <footer class="modal__footer modal__footer--centered">
                    <button type="button" class="btn btn--outline" id="cancelReset">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                    <button type="button" class="btn btn--danger" id="confirmReset">
                        <i class="fas fa-trash-alt"></i>
                        Reiniciar Calendario
                    </button>
                </footer>
            </article>
        `;
        
        document.body.appendChild(modal);
        modal.setAttribute('open', '');
        
        // Añadir estilos específicos si es necesario
        const modalStyles = document.createElement('style');
        modalStyles.textContent = `
            .action-modal__icon--warning i {
                color: var(--warning-color, #f59e0b);
                font-size: 3rem;
            }
            .action-modal__message strong {
                color: var(--warning-color, #f59e0b);
            }
            .action-modal__message small {
                font-size: 0.875rem;
                color: var(--text-secondary);
                display: block;
                margin-top: 0.5rem;
            }
            #confirmReset .fa-trash-alt {
                margin-right: 0.5rem;
            }
        `;
        document.head.appendChild(modalStyles);
        
        // Configurar event listeners del modal
        const closeModal = () => {
            modal.remove();
            modalStyles.remove();
        };
        
        modal.querySelector('#closeResetModal').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        modal.querySelector('#cancelReset').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
        
        modal.querySelector('.modal__backdrop').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal__backdrop')) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            }
        });
        
        modal.querySelector('#confirmReset').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.debug('🔄 Confirmado: Reiniciando calendario...');
            this.resetCalendar();
            closeModal();
        });
    }

    // Reiniciar calendario
    resetCalendar() {
        try {
            console.debug('🔄 Reiniciando calendario...');
            
            // 1. Eliminar del localStorage
            localStorage.removeItem('calendar_events');
            
            // 2. Cargar eventos de ejemplo
            this.events = this.getSampleEvents();
            
            // 3. Guardar los eventos de ejemplo
            this.saveEvents();
            
            // 4. Actualizar la UI
            this.renderCalendar();
            this.updateUpcomingEvents();
            this.renderMiniCalendar();
            
            // 5. Mostrar notificación de éxito
            this.showNotification('Calendario reiniciado con eventos de ejemplo', 'success');
            
            console.debug('✅ Calendario reiniciado correctamente');
        } catch (error) {
            console.error('❌ Error reiniciando calendario:', error);
            this.showNotification('Error al reiniciar el calendario', 'error');
        }
    }

    // Mostrar notificación
    showNotification(message, type = 'info') {
        console.debug(`🔔 Notificación (${type}): ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <div class="notification__content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Debug: Mostrar información del estado actual
    debugInfo() {
        console.debug('=== DEBUG CALENDARIO ===');
        console.debug(`Fecha actual: ${this.currentDate.toISOString().split('T')[0]}`);
        console.debug(`Año actual: ${this.currentYear}`);
        console.debug(`Mes actual: ${this.currentMonth}`);
        console.debug(`Fecha seleccionada: ${this.selectedDate.toISOString().split('T')[0]}`);
        console.debug(`Filtro activo: ${this.activeFilter}`);
        console.debug(`Total eventos: ${this.events.length}`);
        console.debug('Eventos por tipo:');
        const eventTypes = {};
        this.events.forEach(event => {
            eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
        });
        Object.entries(eventTypes).forEach(([type, count]) => {
            console.debug(`  ${type}: ${count} eventos`);
        });
        console.debug('Eventos próximos (próximos 7 días):');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = this.events.filter(event => {
            const eventDate = new Date(event.startDate);
            eventDate.setHours(0, 0, 0, 0);
            const diffTime = eventDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 7;
        });
        upcomingEvents.forEach(event => {
            const eventDate = new Date(event.startDate);
            console.debug(`  • ${eventDate.toLocaleDateString()}: ${event.title} (${event.type})`);
        });
        console.debug('=======================');
    }
}

// ===== INICIALIZACIÓN =====

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    console.debug('📅 Inicializando Módulo de Calendario...');
    
    try {
        // Verificar si estamos en la página de calendario
        const calendarSection = document.getElementById('calendario');
        if (calendarSection) {
            // Verificar si ya está activo
            if (calendarSection.classList.contains('active')) {
                // Inicializar el calendario
                window.calendarManager = new CalendarManager();
                
                // Exponer función de debug para la consola
                window.debugCalendar = () => {
                    if (window.calendarManager) {
                        window.calendarManager.debugInfo();
                    } else {
                        console.error('❌ CalendarManager no está inicializado');
                    }
                };
                
                console.debug('🚀 Módulo de Calendario listo para usar');
                console.debug('💡 Usa debugCalendar() en la consola para ver información de debug');
            } else {
                console.debug('⏳ Calendario encontrado pero no activo. Esperando activación...');
                
                // Observar cambios en la clase active
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === 'class' && 
                            calendarSection.classList.contains('active') && 
                            !window.calendarManager) {
                            
                            console.debug('🎬 Calendario activado, inicializando...');
                            window.calendarManager = new CalendarManager();
                            window.debugCalendar = () => window.calendarManager.debugInfo();
                            
                            // Dejar de observar
                            observer.disconnect();
                        }
                    });
                });
                
                observer.observe(calendarSection, { attributes: true });
            }
        } else {
            console.debug('⚠️ Sección de calendario no encontrada');
        }
    } catch (error) {
        console.error('❌ Error inicializando calendario:', error);
    }
});

// Manejo de errores global
window.addEventListener('error', (event) => {
    console.error('❌ Error no manejado en el calendario:', event.error);
    
    // Intentar recuperar el calendario
    if (window.calendarManager) {
        console.debug('🔄 Intentando recuperar calendario...');
        try {
            window.calendarManager.renderCalendar();
        } catch (recoveryError) {
            console.error('❌ No se pudo recuperar el calendario:', recoveryError);
        }
    }
});

// Manejo de promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
});

// Añadir estilos para notificaciones
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 350px;
    }
    
    .notification--success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-left: 4px solid #047857;
    }
    
    .notification--error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border-left: 4px solid #b91c1c;
    }
    
    .notification--info {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border-left: 4px solid #1e40af;
    }
    
    .notification__content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification__content i {
        font-size: 18px;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .calendar__upcoming-empty {
        text-align: center;
        padding: 2rem;
        color: var(--text-secondary);
    }
    
    .calendar__upcoming-empty i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
    
    .calendar__upcoming-empty p {
        margin: 0;
        font-size: 0.9rem;
    }
`;

document.head.appendChild(notificationStyles);