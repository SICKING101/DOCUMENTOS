// Datos de ejemplo
const filesData = [
  {
    id: 1,
    name: 'Examen_Parcial_Algebra.pdf',
    person: 'María González',
    area: 'Matemáticas',
    type: 'PDF',
    size: 2458000,
    date: new Date('2025-11-15T10:30:00')
  },
  {
    id: 2,
    name: 'Presentacion_Mecanica_Cuantica.pptx',
    person: 'Juan Pérez',
    area: 'Física',
    type: 'PPTX',
    size: 5890000,
    date: new Date('2025-11-14T14:20:00')
  },
  {
    id: 3,
    name: 'Laboratorio_Reacciones.docx',
    person: 'Ana Ramírez',
    area: 'Química',
    type: 'DOCX',
    size: 1240000,
    date: new Date('2025-11-16T09:15:00')
  },
  {
    id: 4,
    name: 'Calculo_Diferencial_Ejercicios.pdf',
    person: 'María González',
    area: 'Matemáticas',
    type: 'PDF',
    size: 3200000,
    date: new Date('2025-11-13T16:45:00')
  },
  {
    id: 5,
    name: 'Tabla_Periodica_Completa.xlsx',
    person: 'Ana Ramírez',
    area: 'Química',
    type: 'XLSX',
    size: 890000,
    date: new Date('2025-11-12T11:00:00')
  },
  {
    id: 6,
    name: 'Genetica_Mendeliana.pdf',
    person: 'Carlos López',
    area: 'Biología',
    type: 'PDF',
    size: 4120000,
    date: new Date('2025-11-17T08:30:00')
  },
  {
    id: 7,
    name: 'Analisis_Literatura_Contemporanea.docx',
    person: 'María González',
    area: 'Literatura',
    type: 'DOCX',
    size: 1680000,
    date: new Date('2025-11-11T13:20:00')
  },
  {
    id: 8,
    name: 'Termodinamica_Apuntes.zip',
    person: 'Juan Pérez',
    area: 'Física',
    type: 'ZIP',
    size: 12450000,
    date: new Date('2025-11-10T15:55:00')
  }
];

// Estado de la aplicación
let currentSort = { column: null, order: null };
let selectedFiles = new Set();
let filteredFiles = [...filesData];

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const filterArea = document.getElementById('filterArea');
const filterType = document.getElementById('filterType');
const filterPerson = document.getElementById('filterPerson');
const filesList = document.getElementById('filesList');
const sortButtons = document.querySelectorAll('.files__header-col');

// Función para formatear bytes a tamaño legible
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para formatear fecha
function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('es-ES', options);
}

// Función para filtrar archivos
function filterFiles() {
  const searchTerm = searchInput.value.toLowerCase();
  const areaValue = filterArea.value;
  const typeValue = filterType.value;
  const personValue = filterPerson.value;

  filteredFiles = filesData.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm);
    const matchesArea = !areaValue || file.area === areaValue;
    const matchesType = !typeValue || file.type === typeValue;
    const matchesPerson = !personValue || file.person === personValue;

    return matchesSearch && matchesArea && matchesType && matchesPerson;
  });

  // Aplicar ordenamiento si existe
  if (currentSort.column) {
    sortFiles(currentSort.column, currentSort.order);
  } else {
    renderFiles();
  }
}

// Función para ordenar archivos
function sortFiles(column, order) {
  filteredFiles.sort((a, b) => {
    let valueA, valueB;

    switch (column) {
      case 'name':
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case 'person':
        valueA = a.person.toLowerCase();
        valueB = b.person.toLowerCase();
        break;
      case 'size':
        valueA = a.size;
        valueB = b.size;
        break;
      case 'date':
        valueA = a.date.getTime();
        valueB = b.date.getTime();
        break;
      default:
        return 0;
    }

    if (order === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });

  renderFiles();
}

// Función para renderizar archivos
function renderFiles() {
  filesList.innerHTML = '';

  if (filteredFiles.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'files__item';
    emptyItem.style.gridColumn = '1 / -1';
    emptyItem.style.textAlign = 'center';
    emptyItem.style.color = 'var(--text-muted)';
    emptyItem.textContent = 'No se encontraron archivos';
    filesList.appendChild(emptyItem);
    return;
  }

  filteredFiles.forEach(file => {
    const item = document.createElement('li');
    item.className = 'files__item';
    item.dataset.fileId = file.id;

    if (selectedFiles.has(file.id)) {
      item.classList.add('files__item--selected');
    }

    item.innerHTML = `
      <span class="files__name">${file.name}</span>
      <span class="files__person">${file.person} - ${file.area}</span>
      <span class="files__size">${formatFileSize(file.size)}</span>
      <span class="files__date">${formatDate(file.date)}</span>
    `;

    // Evento de clic para selección
    item.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Multi-selección con Ctrl/Cmd
        if (selectedFiles.has(file.id)) {
          selectedFiles.delete(file.id);
          item.classList.remove('files__item--selected');
        } else {
          selectedFiles.add(file.id);
          item.classList.add('files__item--selected');
        }
      } else {
        // Selección simple
        selectedFiles.clear();
        document.querySelectorAll('.files__item--selected').forEach(el => {
          el.classList.remove('files__item--selected');
        });
        selectedFiles.add(file.id);
        item.classList.add('files__item--selected');
      }
    });

    filesList.appendChild(item);
  });
}

// Event listeners para filtros
searchInput.addEventListener('input', filterFiles);
filterArea.addEventListener('change', filterFiles);
filterType.addEventListener('change', filterFiles);
filterPerson.addEventListener('change', filterFiles);

// Event listeners para ordenamiento
sortButtons.forEach(button => {
  button.addEventListener('click', () => {
    const column = button.dataset.sort;
    
    // Determinar el orden
    let order = 'asc';
    if (currentSort.column === column) {
      if (currentSort.order === 'asc') {
        order = 'desc';
      } else if (currentSort.order === 'desc') {
        // Tercer clic resetea el ordenamiento
        currentSort = { column: null, order: null };
        sortButtons.forEach(btn => {
          btn.classList.remove('files__header-col--ascending', 'files__header-col--descending');
        });
        filterFiles();
        return;
      }
    }

    // Actualizar estado
    currentSort = { column, order };

    // Actualizar UI de los botones
    sortButtons.forEach(btn => {
      btn.classList.remove('files__header-col--ascending', 'files__header-col--descending');
    });

    if (order === 'asc') {
      button.classList.add('files__header-col--ascending');
    } else {
      button.classList.add('files__header-col--descending');
    }

    // Aplicar ordenamiento
    sortFiles(column, order);
  });
});

// Renderizado inicial
renderFiles();