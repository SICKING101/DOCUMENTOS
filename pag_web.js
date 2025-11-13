document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('profileModal');
  const modalName = document.getElementById('modalName');
  const modalArea = document.getElementById('modalArea');
  const modalTipo = document.getElementById('modalTipo');
  const modalFiles = document.getElementById('modalFiles');
  const closeModal = document.getElementById('closeModal');

  const archivosPorPersona = {
    "María González": ["Guía de Álgebra.pdf", "Examen Final 2024.docx", "Plan de Clases.xlsx"],
    "Juan Pérez": ["Inventario de Laboratorio.pdf", "Informe Semestral.docx"],
    "Ana Ramírez": ["Reactivos 2025.pdf", "Manual de Seguridad.docx", "Resultados de Prácticas.xlsx"]
  };

  document.querySelectorAll('.people__btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.people__item');
      if (!item) return;
      
      const nombre = item.querySelector('.people__name').textContent.trim();
      const area = item.dataset.area || "No especificada";
      const tipo = item.dataset.tipo || "Otro";
      
      modalName.textContent = nombre;
      modalArea.textContent = `Área: ${area}`;
      modalTipo.textContent = `Tipo: ${tipo}`;
      
      modalFiles.innerHTML = "";
      (archivosPorPersona[nombre] || []).forEach(file => {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = file;
        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "Descargar";
        downloadBtn.addEventListener("click", () => {
          alert(`Descargando "${file}"...`);
        });
        li.append(span, downloadBtn);
        modalFiles.appendChild(li);
      });

      modal.showModal();
    });
  });

  closeModal.addEventListener('click', () => modal.close());
});
