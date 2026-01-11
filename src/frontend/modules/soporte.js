import { api } from '../services/api.js';
import { showAlert, formatDate } from '../utils.js';
import { DOM } from '../dom.js';

class SupportModule {
    constructor() {
        this.currentTickets = [];
        this.currentTicket = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadFAQ();
        await this.loadGuide();
        await this.loadTickets();
    }

    setupEventListeners() {
        // Botón nuevo ticket
        DOM.newTicketBtn?.addEventListener('click', () => this.openTicketModal());
        
        // Botón crear primer ticket
        DOM.createFirstTicket?.addEventListener('click', () => this.openTicketModal());
        
        // Botón iniciar guía
        DOM.startGuideBtn?.addEventListener('click', () => this.startInteractiveGuide());
        
        // Botones del modal de ticket
        DOM.cancelTicketBtn?.addEventListener('click', () => this.closeTicketModal());
        DOM.submitTicketBtn?.addEventListener('click', () => this.submitTicket());
        
        // Botones del modal de detalles
        DOM.closeTicketDetailModal?.addEventListener('click', () => this.closeTicketDetailModal());
        DOM.closeDetailBtn?.addEventListener('click', () => this.closeTicketDetailModal());
        DOM.submitResponseBtn?.addEventListener('click', () => this.submitResponse());
        DOM.closeTicketBtn?.addEventListener('click', () => this.closeTicket());
        DOM.reopenTicketBtn?.addEventListener('click', () => this.reopenTicket());
        
        // Filtros de tickets
        DOM.ticketStatusFilter?.addEventListener('change', () => this.loadTickets());
        DOM.ticketPriorityFilter?.addEventListener('change', () => this.loadTickets());
        
        // Upload de archivos
        if (DOM.ticketFileUpload) {
            DOM.ticketFileUpload.addEventListener('click', () => DOM.ticketFileInput.click());
            DOM.ticketFileUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                DOM.ticketFileUpload.classList.add('dragover');
            });
            DOM.ticketFileUpload.addEventListener('dragleave', () => {
                DOM.ticketFileUpload.classList.remove('dragover');
            });
            DOM.ticketFileUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                DOM.ticketFileUpload.classList.remove('dragover');
                this.handleFileDrop(e.dataTransfer.files);
            });
            DOM.ticketFileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }
    }

    async loadFAQ() {
        try {
            const response = await api.getFAQ();
            
            if (response.success && DOM.faqList) {
                const faqHTML = response.faq.map(item => `
                    <div class="faq-item">
                        <div class="faq-question">
                            <h4>${item.question}</h4>
                            <span class="faq-category">${this.getCategoryName(item.category)}</span>
                        </div>
                        <div class="faq-answer">
                            <p>${item.answer}</p>
                        </div>
                    </div>
                `).join('');
                
                DOM.faqList.innerHTML = faqHTML;
            }
        } catch (error) {
            console.error('Error cargando FAQ:', error);
        }
    }

    async loadGuide() {
        try {
            const response = await api.getSystemGuide();
            
            if (response.success && DOM.guideSteps) {
                const guideHTML = response.guide.map(step => `
                    <div class="guide-step">
                        <div class="guide-step__number">${step.step}</div>
                        <div class="guide-step__content">
                            <div class="guide-step__icon">
                                <i class="fas fa-${step.icon}"></i>
                            </div>
                            <div class="guide-step__info">
                                <h4 class="guide-step__title">${step.title}</h4>
                                <p class="guide-step__description">${step.description}</p>
                                <div class="guide-step__meta">
                                    <span class="guide-step__duration">
                                        <i class="fas fa-clock"></i> ${step.duration}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                DOM.guideSteps.innerHTML = guideHTML;
            }
        } catch (error) {
            console.error('Error cargando guía:', error);
        }
    }

    async loadTickets() {
        try {
            const status = DOM.ticketStatusFilter?.value || 'all';
            const priority = DOM.ticketPriorityFilter?.value || 'all';
            
            const response = await api.getTickets({ status, priority });
            
            if (response.success) {
                this.currentTickets = response.tickets;
                this.renderTickets(response.tickets);
            }
        } catch (error) {
            console.error('Error cargando tickets:', error);
            this.renderTickets([]);
        }
    }

    renderTickets(tickets) {
        if (!DOM.ticketsList) return;
        
        if (tickets.length === 0) {
            DOM.ticketsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt empty-state__icon"></i>
                    <h3 class="empty-state__title">No tienes tickets de soporte</h3>
                    <p class="empty-state__description">Crea tu primer ticket para recibir ayuda</p>
                    <button class="btn btn--primary" id="createFirstTicket">
                        <i class="fas fa-plus-circle"></i> Crear Primer Ticket
                    </button>
                </div>
            `;
            
            // Re-asignar evento al botón
            const createBtn = document.getElementById('createFirstTicket');
            if (createBtn) {
                createBtn.addEventListener('click', () => this.openTicketModal());
            }
            return;
        }
        
        const ticketsHTML = tickets.map(ticket => `
            <div class="ticket-card ${ticket.status}" data-id="${ticket._id}">
                <div class="ticket-card__header">
                    <div class="ticket-card__info">
                        <h4 class="ticket-card__subject">${ticket.subject}</h4>
                        <div class="ticket-card__meta">
                            <span class="ticket-card__number">${ticket.ticketNumber}</span>
                            <span class="ticket-card__date">${formatDate(ticket.createdAt)}</span>
                            <span class="ticket-card__category">${this.getCategoryName(ticket.category)}</span>
                        </div>
                    </div>
                    <div class="ticket-card__status">
                        <span class="status-badge status-${ticket.status}">${this.getStatusName(ticket.status)}</span>
                        <span class="priority-badge priority-${ticket.priority}">${ticket.priority.toUpperCase()}</span>
                    </div>
                </div>
                <div class="ticket-card__preview">
                    <p>${ticket.description.substring(0, 150)}${ticket.description.length > 150 ? '...' : ''}</p>
                </div>
                <div class="ticket-card__footer">
                    <div class="ticket-card__actions">
                        <button class="btn btn--outline btn--sm view-ticket-btn" data-id="${ticket._id}">
                            <i class="fas fa-eye"></i> Ver detalles
                        </button>
                        ${ticket.attachments && ticket.attachments.length > 0 ? 
                            `<span class="ticket-attachments">
                                <i class="fas fa-paperclip"></i> ${ticket.attachments.length}
                            </span>` : ''
                        }
                    </div>
                    <div class="ticket-card__updates">
                        <i class="fas fa-comments"></i> ${ticket.updates?.length || 1} actualizaciones
                    </div>
                </div>
            </div>
        `).join('');
        
        DOM.ticketsList.innerHTML = ticketsHTML;
        
        // Asignar eventos a los botones de ver detalles
        document.querySelectorAll('.view-ticket-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ticketId = e.target.closest('.view-ticket-btn').dataset.id;
                this.viewTicketDetails(ticketId);
            });
        });
    }

    openTicketModal() {
        DOM.ticketModal.style.display = 'flex';
        setTimeout(() => {
            DOM.ticketModal.style.opacity = '1';
            DOM.ticketModal.style.visibility = 'visible';
        }, 10);
        
        // Resetear formulario
        DOM.ticketForm.reset();
        DOM.ticketFileList.innerHTML = '';
        this.selectedFiles = [];
    }

    closeTicketModal() {
        DOM.ticketModal.style.opacity = '0';
        DOM.ticketModal.style.visibility = 'hidden';
        setTimeout(() => {
            DOM.ticketModal.style.display = 'none';
        }, 300);
    }

    handleFileDrop(files) {
        this.handleFileSelect(files);
    }

    handleFileSelect(files) {
        if (!files || files.length === 0) return;
        
        if (!this.selectedFiles) {
            this.selectedFiles = [];
        }
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Validar tamaño (5MB máximo)
            if (file.size > 5 * 1024 * 1024) {
                showAlert(`El archivo "${file.name}" es demasiado grande (máximo 5MB)`, 'error');
                continue;
            }
            
            // Validar tipo
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
                                 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                 'text/plain'];
            
            if (!allowedTypes.includes(file.type)) {
                showAlert(`Tipo de archivo no permitido: "${file.name}"`, 'error');
                continue;
            }
            
            this.selectedFiles.push(file);
            this.renderFileItem(file);
        }
        
        // Resetear input
        DOM.ticketFileInput.value = '';
    }

    renderFileItem(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
            <button class="btn btn--text btn--sm remove-file" type="button">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        fileItem.querySelector('.remove-file').addEventListener('click', () => {
            this.removeFile(file.name);
            fileItem.remove();
        });
        
        DOM.ticketFileList.appendChild(fileItem);
    }

    removeFile(filename) {
        this.selectedFiles = this.selectedFiles.filter(file => file.name !== filename);
    }

    async submitTicket() {
        try {
            const subject = DOM.ticketSubject.value.trim();
            const description = DOM.ticketDescription.value.trim();
            const category = DOM.ticketCategory.value;
            const priority = DOM.ticketPriority.value;
            
            // Validaciones
            if (!subject || !description || !category || !priority) {
                showAlert('Por favor, completa todos los campos obligatorios', 'error');
                return;
            }
            
            if (description.length < 20) {
                showAlert('La descripción debe tener al menos 20 caracteres', 'error');
                return;
            }
            
            // Preparar datos
            const ticketData = {
                subject,
                description,
                category,
                priority,
                emailNotifications: true
            };
            
            // Mostrar loading
            const submitBtn = DOM.submitTicketBtn;
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;

                    const filesToSend = Array.isArray(this.selectedFiles) ? this.selectedFiles : [];
        console.log(`📤 Enviando ${filesToSend.length} archivo(s)`);
            
            // Enviar ticket
            const response = await api.createTicket(ticketData, this.selectedFiles);
            
            if (response.success) {
                showAlert('Ticket creado exitosamente. Recibirás una confirmación por email.', 'success');
                this.closeTicketModal();
                await this.loadTickets();
            } else {
                showAlert(response.message || 'Error al crear el ticket', 'error');
            }
            
        } catch (error) {
            console.error('Error creando ticket:', error);
            showAlert('Error al crear el ticket: ' + error.message, 'error');
        } finally {
            // Restaurar botón
            const submitBtn = DOM.submitTicketBtn;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Ticket';
            submitBtn.disabled = false;
        }
    }

    async viewTicketDetails(ticketId) {
        try {
            const response = await api.getTicketDetails(ticketId);
            
            if (response.success) {
                this.currentTicket = response.ticket;
                this.renderTicketDetails(response.ticket);
                
                DOM.ticketDetailModal.style.display = 'flex';
                setTimeout(() => {
                    DOM.ticketDetailModal.style.opacity = '1';
                    DOM.ticketDetailModal.style.visibility = 'visible';
                }, 10);
            }
        } catch (error) {
            console.error('Error cargando detalles del ticket:', error);
            showAlert('Error al cargar detalles del ticket', 'error');
        }
    }

    renderTicketDetails(ticket) {
        // Información básica
        DOM.detailTicketSubject.textContent = ticket.subject;
        DOM.detailTicketId.textContent = ticket.ticketNumber;
        DOM.detailTicketDate.textContent = formatDate(ticket.createdAt);
        
        // Estado y prioridad
        DOM.detailTicketStatus.textContent = this.getStatusName(ticket.status);
        DOM.detailTicketStatus.className = `status-badge status-${ticket.status}`;
        DOM.detailTicketPriority.textContent = ticket.priority.toUpperCase();
        DOM.detailTicketPriority.className = `priority-badge priority-${ticket.priority}`;
        
        // Descripción
        DOM.detailTicketDescription.textContent = ticket.description;
        
        // Archivos adjuntos
        this.renderTicketAttachments(ticket.attachments);
        
        // Actualizaciones
        this.renderTicketUpdates(ticket.updates);
        
        // Mostrar/ocultar botones según estado
        if (ticket.status === 'cerrado') {
            DOM.closeTicketBtn.style.display = 'none';
            DOM.reopenTicketBtn.style.display = 'inline-block';
        } else {
            DOM.closeTicketBtn.style.display = 'inline-block';
            DOM.reopenTicketBtn.style.display = 'none';
        }
        
        // Mostrar/ocultar sección de respuesta según estado
        if (ticket.status === 'cerrado') {
            DOM.ticketResponseSection.style.display = 'none';
        } else {
            DOM.ticketResponseSection.style.display = 'block';
        }
    }

renderTicketAttachments(attachments) {
    const container = document.querySelector('.attachments-list');
    if (!container) return;
    
    if (!attachments || attachments.length === 0) {
        container.innerHTML = `
            <div class="no-attachments">
                <i class="fas fa-paperclip"></i>
                <p>No hay archivos adjuntos en este ticket</p>
            </div>
        `;
        return;
    }
    
    // Contar imágenes vs otros archivos
    const imageAttachments = attachments.filter(att => 
        att.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    );
    const otherAttachments = attachments.filter(att => 
        !att.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    );
    
    let attachmentsHTML = '';
    
    // Mostrar imágenes como galería
    if (imageAttachments.length > 0) {
        attachmentsHTML += `
        <div class="attachments-section">
            <h4 class="attachments-section-title">
                <i class="fas fa-images"></i> Imágenes adjuntas (${imageAttachments.length})
            </h4>
            <div class="attachments-gallery">
                ${imageAttachments.map((att, index) => `
                <div class="attachment-image-item" data-index="${index}">
                    <div class="image-preview">
                        <img src="${att.cloudinary_url}" 
                             alt="${att.originalname}" 
                             class="attachment-thumbnail"
                             loading="lazy">
                        <div class="image-overlay">
                            <div class="overlay-content">
                                <span class="view-full">
                                    <i class="fas fa-expand"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="image-info">
                        <div class="image-name" title="${att.originalname}">
                            ${att.originalname.length > 30 ? att.originalname.substring(0, 27) + '...' : att.originalname}
                        </div>
                        <div class="image-meta">
                            <span class="image-size">${this.formatFileSize(att.size)}</span>
                            <div class="image-actions">
                                <a href="${att.cloudinary_url}" 
                                   target="_blank" 
                                   class="btn-icon" 
                                   title="Ver en tamaño completo">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                                <a href="${att.cloudinary_url}" 
                                   download="${att.originalname}"
                                   class="btn-icon" 
                                   title="Descargar">
                                    <i class="fas fa-download"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        `;
    }
    
    // Mostrar otros archivos
    if (otherAttachments.length > 0) {
        attachmentsHTML += `
        <div class="attachments-section" ${imageAttachments.length > 0 ? 'style="margin-top: 25px;"' : ''}>
            <h4 class="attachments-section-title">
                <i class="fas fa-file-alt"></i> Otros archivos (${otherAttachments.length})
            </h4>
            <div class="attachments-list-other">
                ${otherAttachments.map(att => `
                <div class="attachment-other-item">
                    <div class="attachment-icon">
                        <i class="fas fa-file"></i>
                    </div>
                    <div class="attachment-details">
                        <div class="attachment-name" title="${att.originalname}">
                            ${att.originalname}
                        </div>
                        <div class="attachment-info">
                            <span class="attachment-size">${this.formatFileSize(att.size)}</span>
                            <span class="attachment-type">${att.originalname.split('.').pop().toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="attachment-actions">
                        <a href="${att.cloudinary_url}" 
                           target="_blank" 
                           class="btn btn--outline btn--xs" 
                           title="Ver archivo">
                            <i class="fas fa-eye"></i>
                        </a>
                        <a href="${att.cloudinary_url}" 
                           download="${att.originalname}"
                           class="btn btn--outline btn--xs" 
                           title="Descargar">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        `;
    }
    
    // Modal para vista completa de imágenes
    attachmentsHTML += `
    <div class="image-modal" id="imageModal" style="display: none;">
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Vista de imagen</h3>
                <button class="modal-close" id="closeImageModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="image-viewer">
                    <img id="modalImage" src="" alt="" class="full-image">
                    <div class="image-navigation">
                        <button class="nav-btn prev-btn" id="prevImage">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="nav-btn next-btn" id="nextImage">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="image-details">
                    <div class="detail-item">
                        <span class="detail-label">Nombre:</span>
                        <span id="imageName" class="detail-value"></span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tamaño:</span>
                        <span id="imageSize" class="detail-value"></span>
                    </div>
                    <div class="detail-actions">
                        <a href="#" id="downloadFullImage" class="btn btn--primary">
                            <i class="fas fa-download"></i> Descargar imagen completa
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    container.innerHTML = attachmentsHTML;
    
    // Inicializar funcionalidad del modal de imágenes
    if (imageAttachments.length > 0) {
        this.initImageGallery(imageAttachments);
    }
}

// Nueva función para inicializar la galería de imágenes
initImageGallery(images) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageName = document.getElementById('imageName');
    const imageSize = document.getElementById('imageSize');
    const downloadLink = document.getElementById('downloadFullImage');
    const closeBtn = document.getElementById('closeImageModal');
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');
    
    let currentIndex = 0;
    
    // Abrir modal al hacer clic en una imagen
    document.querySelectorAll('.attachment-image-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            currentIndex = index;
            updateModal();
            modal.style.display = 'block';
        });
    });
    
    // Cerrar modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.querySelector('.modal-overlay').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Navegación
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateModal();
    });
    
    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % images.length;
        updateModal();
    });
    
    // Navegación con teclado
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'block') {
            if (e.key === 'Escape') modal.style.display = 'none';
            if (e.key === 'ArrowLeft') prevBtn.click();
            if (e.key === 'ArrowRight') nextBtn.click();
        }
    });
    
    function updateModal() {
        const image = images[currentIndex];
        modalImage.src = image.cloudinary_url;
        modalImage.alt = image.originalname;
        imageName.textContent = image.originalname;
        imageSize.textContent = this.formatFileSize(image.size);
        downloadLink.href = image.cloudinary_url;
        downloadLink.download = image.originalname;
        
        // Actualizar estado de botones de navegación
        prevBtn.style.visibility = images.length > 1 ? 'visible' : 'hidden';
        nextBtn.style.visibility = images.length > 1 ? 'visible' : 'hidden';
    }
    
    // Vincular this.formatFileSize
    updateModal = updateModal.bind(this);
}

    renderTicketUpdates(updates) {
        const container = DOM.ticketUpdatesList;
        if (!container) return;
        
        if (!updates || updates.length === 0) {
            container.innerHTML = '<p class="no-updates">No hay actualizaciones</p>';
            return;
        }
        
        const updatesHTML = updates.map(update => `
            <div class="update-item ${update.internalNote ? 'internal-note' : ''}">
                <div class="update-header">
                    <div class="update-user">
                        <i class="fas fa-user"></i>
                        <span>${update.userName || 'Sistema'}</span>
                    </div>
                    <div class="update-date">${formatDate(update.createdAt)}</div>
                </div>
                <div class="update-message">${update.message}</div>
                ${update.statusChange ? `
                    <div class="update-status-change">
                        <i class="fas fa-exchange-alt"></i>
                        Estado cambiado: ${this.getStatusName(update.statusChange.from)} → ${this.getStatusName(update.statusChange.to)}
                    </div>
                ` : ''}
                ${update.internalNote ? `
                    <div class="update-internal-note">
                        <i class="fas fa-lock"></i> Nota interna
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        container.innerHTML = updatesHTML;
    }

    closeTicketDetailModal() {
        DOM.ticketDetailModal.style.opacity = '0';
        DOM.ticketDetailModal.style.visibility = 'hidden';
        setTimeout(() => {
            DOM.ticketDetailModal.style.display = 'none';
        }, 300);
    }

    async submitResponse() {
        try {
            const responseText = DOM.ticketResponseText.value.trim();
            
            if (!responseText) {
                showAlert('Por favor, escribe una respuesta', 'error');
                return;
            }
            
            const response = await api.addTicketResponse(this.currentTicket._id, responseText);
            
            if (response.success) {
                showAlert('Respuesta enviada exitosamente', 'success');
                DOM.ticketResponseText.value = '';
                await this.viewTicketDetails(this.currentTicket._id);
                await this.loadTickets();
            }
            
        } catch (error) {
            console.error('Error enviando respuesta:', error);
            showAlert('Error al enviar respuesta: ' + error.message, 'error');
        }
    }

    async closeTicket() {
        if (!confirm('¿Estás seguro de que quieres cerrar este ticket?')) return;
        
        try {
            const response = await api.changeTicketStatus(
                this.currentTicket._id, 
                'cerrado', 
                'Ticket cerrado por el usuario'
            );
            
            if (response.success) {
                showAlert('Ticket cerrado exitosamente', 'success');
                this.closeTicketDetailModal();
                await this.loadTickets();
            }
            
        } catch (error) {
            console.error('Error cerrando ticket:', error);
            showAlert('Error al cerrar ticket: ' + error.message, 'error');
        }
    }

    async reopenTicket() {
        try {
            const response = await api.changeTicketStatus(
                this.currentTicket._id, 
                'abierto', 
                'Ticket reabierto por el usuario'
            );
            
            if (response.success) {
                showAlert('Ticket reabierto exitosamente', 'success');
                this.closeTicketDetailModal();
                await this.loadTickets();
            }
            
        } catch (error) {
            console.error('Error reabriendo ticket:', error);
            showAlert('Error al reabrir ticket: ' + error.message, 'error');
        }
    }

    startInteractiveGuide() {
        showAlert('La guía interactiva se mostrará paso a paso. ¡Comenzamos!', 'info');
        
        // Implementación básica - se puede expandir
        const steps = [
            { title: "Dashboard", selector: "#dashboard", description: "Aquí ves el resumen del sistema" },
            { title: "Personas", selector: "#personas", description: "Gestiona usuarios y personal" },
            { title: "Documentos", selector: "#documentos", description: "Sube y organiza documentos" }
        ];
        
        let currentStep = 0;
        
        const showNextStep = () => {
            if (currentStep >= steps.length) {
                showAlert('¡Guía completada! Ahora conoces las funciones principales del sistema.', 'success');
                return;
            }
            
            const step = steps[currentStep];
            
            // Navegar a la pestaña
            const tabLink = document.querySelector(`[data-tab="${step.selector.substring(1)}"]`);
            if (tabLink) {
                tabLink.click();
                
                // Mostrar tooltip
                setTimeout(() => {
                    showAlert(`${step.title}: ${step.description}`, 'info');
                }, 500);
            }
            
            currentStep++;
            
            // Preguntar si continuar
            if (currentStep < steps.length) {
                setTimeout(() => {
                    if (confirm(`Paso ${currentStep}/${steps.length}: ${steps[currentStep].title}\n\n¿Continuar con el siguiente paso?`)) {
                        showNextStep();
                    }
                }, 1000);
            }
        };
        
        showNextStep();
    }

    // =========================================================================
    // FUNCIONES UTILITARIAS
    // =========================================================================

    getCategoryName(category) {
        const categories = {
            'tecnico': 'Problema Técnico',
            'uso': 'Uso del Sistema',
            'documentos': 'Gestión de Documentos',
            'personas': 'Gestión de Personas',
            'reportes': 'Reportes',
            'seguridad': 'Seguridad',
            'otros': 'Otros',
            'soporte': 'Soporte'
        };
        return categories[category] || category;
    }

    getStatusName(status) {
        const statuses = {
            'abierto': 'Abierto',
            'en_proceso': 'En Proceso',
            'cerrado': 'Cerrado',
            'esperando_respuesta': 'Esperando Respuesta'
        };
        return statuses[status] || status;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Función para debug - verificar que las imágenes se cargan
async viewTicketDetails(ticketId) {
    try {
        const response = await api.getTicketDetails(ticketId);
        
        if (response.success) {
            this.currentTicket = response.ticket;
            
            // DEBUG: Verificar información de archivos
            console.log('🔍 ========== DEBUG DETALLES TICKET ==========');
            console.log('📋 Ticket ID:', response.ticket._id);
            console.log('📋 Ticket Number:', response.ticket.ticketNumber);
            console.log('📎 Total archivos:', response.ticket.attachments?.length || 0);
            
            if (response.ticket.attachments && response.ticket.attachments.length > 0) {
                response.ticket.attachments.forEach((att, index) => {
                    console.log(`\n📄 Archivo ${index + 1}:`);
                    console.log('   Nombre:', att.originalname);
                    console.log('   URL Cloudinary:', att.cloudinary_url);
                    console.log('   Tamaño:', att.size, 'bytes');
                    console.log('   Es imagen:', /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(att.originalname));
                    console.log('   Tipo MIME:', att.mimetype);
                    
                    // Verificar que la URL sea accesible
                    if (att.cloudinary_url) {
                        console.log('   ✅ URL disponible');
                    } else {
                        console.log('   ❌ URL no disponible');
                    }
                });
            } else {
                console.log('ℹ️ No hay archivos adjuntos');
            }
            console.log('🔍 ===========================================\n');
            
            this.renderTicketDetails(response.ticket);
            
            DOM.ticketDetailModal.style.display = 'flex';
            setTimeout(() => {
                DOM.ticketDetailModal.style.opacity = '1';
                DOM.ticketDetailModal.style.visibility = 'visible';
            }, 10);
        }
    } catch (error) {
        console.error('Error cargando detalles del ticket:', error);
        showAlert('Error al cargar detalles del ticket', 'error');
    }
}
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.supportModule = new SupportModule();
});

export default SupportModule;