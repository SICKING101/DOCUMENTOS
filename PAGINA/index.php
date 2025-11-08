<?php
// Configuración y conexión a la base de datos
require_once '../config/database.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Documentos Profesional</title>
    <link rel="stylesheet" href="../CSS/style.css">
</head>
<body>
    <!-- Header principal -->
    <header class="header">
        <h1 class="header__title">Sistema de Documentos</h1>
        <nav class="header__nav">
            <button class="header__button header__button--active" data-section="dashboard">Dashboard</button>
            <button class="header__button" data-section="personas">Personas</button>
            <button class="header__button" data-section="documentos">Documentos</button>
        </nav>
    </header>

    <main class="main">
        <!-- Sección: Dashboard -->
        <section id="dashboard" class="section section--active">
            <h2 class="section__title">Dashboard</h2>
            
            <!-- Tarjetas de estadísticas -->
            <div class="dashboard__stats">
                <article class="stat-card">
                    <h3 class="stat-card__title">Total Personas</h3>
                    <p class="stat-card__number" id="total-personas">0</p>
                </article>
                <article class="stat-card">
                    <h3 class="stat-card__title">Total Documentos</h3>
                    <p class="stat-card__number" id="total-documentos">0</p>
                </article>
                <article class="stat-card">
                    <h3 class="stat-card__title">Próximos a Vencer</h3>
                    <p class="stat-card__number" id="proximos-vencer">0</p>
                </article>
            </div>

            <!-- Lista de documentos recientes -->
            <div class="dashboard__recent">
                <h3 class="dashboard__subtitle">Documentos Recientes</h3>
                <div id="recent-documents" class="documents-list">
                    <!-- Los documentos se cargan via JavaScript -->
                </div>
            </div>
        </section>

        <!-- Sección: Gestión de Personas -->
        <section id="personas" class="section">
            <h2 class="section__title">Gestión de Personas</h2>
            
            <!-- Barra de herramientas -->
            <div class="toolbar">
                <button id="add-person-btn" class="toolbar__button toolbar__button--primary">Agregar Persona</button>
                <div class="toolbar__search">
                    <input type="text" id="search-person" class="toolbar__search-input" placeholder="Buscar personas...">
                </div>
            </div>

            <!-- Lista de personas -->
            <div id="persons-list" class="persons-list">
                <!-- Las personas se cargan via JavaScript -->
            </div>
        </section>

        <!-- Sección: Gestión de Documentos -->
        <section id="documentos" class="section">
            <h2 class="section__title">Gestión de Documentos</h2>
            
            <!-- Barra de herramientas -->
            <div class="toolbar">
                <button id="add-document-btn" class="toolbar__button toolbar__button--primary">Subir Documento</button>
                <button id="download-all-btn" class="toolbar__button">Descargar Todo</button>
                <div class="toolbar__filters">
                    <select id="filter-category" class="toolbar__select">
                        <option value="">Todas las categorías</option>
                    </select>
                    <select id="filter-person" class="toolbar__select">
                        <option value="">Todas las personas</option>
                    </select>
                </div>
            </div>

            <!-- Lista de documentos -->
            <div id="documents-list" class="documents-list">
                <!-- Los documentos se cargan via JavaScript -->
            </div>
        </section>
    </main>

    <!-- Modal: Agregar/Editar Persona -->
    <dialog id="person-modal" class="modal">
        <form class="modal__form" id="person-form">
            <h3 class="modal__title" id="person-modal-title">Agregar Persona</h3>
            <input type="hidden" id="person-id">
            
            <div class="form__group">
                <label for="person-name" class="form__label">Nombre *</label>
                <input type="text" id="person-name" class="form__input" required>
            </div>
            
            <div class="form__group">
                <label for="person-email" class="form__label">Email *</label>
                <input type="email" id="person-email" class="form__input" required>
            </div>
            
            <div class="form__group">
                <label for="person-phone" class="form__label">Teléfono</label>
                <input type="text" id="person-phone" class="form__input">
            </div>
            
            <div class="form__group">
                <label for="person-department" class="form__label">Departamento</label>
                <input type="text" id="person-department" class="form__input">
            </div>
            
            <div class="form__group">
                <label for="person-position" class="form__label">Puesto</label>
                <input type="text" id="person-position" class="form__input">
            </div>
            
            <div class="modal__actions">
                <button type="button" class="modal__button modal__button--secondary" onclick="closePersonModal()">Cancelar</button>
                <button type="submit" class="modal__button modal__button--primary">Guardar</button>
            </div>
        </form>
    </dialog>

    <!-- Modal: Subir Documento -->
    <dialog id="document-modal" class="modal">
        <form class="modal__form" id="document-form" enctype="multipart/form-data">
            <h3 class="modal__title">Subir Documento</h3>
            
            <div class="form__group">
                <label for="document-file" class="form__label">Archivo *</label>
                <input type="file" id="document-file" class="form__input" required accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png">
                <small class="form__help">Tamaño máximo: 10MB</small>
            </div>
            
            <div class="form__group">
                <label for="document-description" class="form__label">Descripción</label>
                <textarea id="document-description" class="form__textarea"></textarea>
            </div>
            
            <div class="form__group">
                <label for="document-category" class="form__label">Categoría</label>
                <input type="text" id="document-category" class="form__input">
            </div>
            
            <div class="form__group">
                <label for="document-expiration" class="form__label">Fecha de Vencimiento</label>
                <input type="date" id="document-expiration" class="form__input">
            </div>
            
            <div class="form__group">
                <label for="document-person" class="form__label">Persona Asociada</label>
                <select id="document-person" class="form__select" required>
                    <option value="">Seleccionar persona...</option>
                </select>
            </div>
            
            <div class="modal__actions">
                <button type="button" class="modal__button modal__button--secondary" onclick="closeDocumentModal()">Cancelar</button>
                <button type="submit" class="modal__button modal__button--primary">Subir</button>
            </div>
        </form>
    </dialog>

    <!-- Modal: Gestión de Archivos por Persona -->
    <dialog id="person-files-modal" class="modal modal--large">
        <form class="modal__form">
            <h3 class="modal__title" id="person-files-title">Archivos de la Persona</h3>
            
            <!-- Información de la persona -->
            <div class="person-info" id="person-info">
                <!-- Se carga dinámicamente -->
            </div>
            
            <!-- Subida de archivos -->
            <div class="form__group">
                <label for="person-files" class="form__label">Subir Archivos</label>
                <input type="file" id="person-files" class="form__input" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png">
                <small class="form__help">Puede seleccionar múltiples archivos. Tamaño máximo por archivo: 10MB</small>
            </div>
            
            <div class="form__group">
                <label for="files-category" class="form__label">Categoría para los archivos</label>
                <input type="text" id="files-category" class="form__input" placeholder="Opcional">
            </div>
            
            <div class="modal__actions">
                <button type="button" class="modal__button modal__button--secondary" onclick="closePersonFilesModal()">Cerrar</button>
                <button type="button" class="modal__button" onclick="uploadPersonFiles()">Subir Archivos</button>
                <button type="button" class="modal__button modal__button--primary" onclick="downloadAllPersonFiles()">Descargar Todo</button>
            </div>
            
            <!-- Lista de archivos de la persona -->
            <div class="person-files-list">
                <h4 class="person-files-list__title">Archivos Existentes</h4>
                <div id="person-files-list" class="files-grid">
                    <!-- Se carga dinámicamente -->
                </div>
            </div>
        </form>
    </dialog>

    <!-- Notificaciones -->
    <div id="notifications" class="notifications"></div>

    <script src="../JAVASCRIPT/app.js"></script>
</body>
</html>