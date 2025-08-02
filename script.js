const fileInput = document.getElementById('fileInput');
const materiasLista = document.getElementById('materiasLista');
let calendar;

// Inicializar calendario
document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    editable: true,
    droppable: true,
    eventReceive: function(info) {
      console.log('Evento añadido:', info.event);
    }
  });
  calendar.render();
});

// Escuchar la carga de imagen
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const { data } = await Tesseract.recognize(file, 'eng', { logger: m => console.log(m) });
  console.log('OCR con coordenadas:', data);

  const materias = parseWithCoordinates(data.words);
  renderMaterias(materias);
});

// Analizar el OCR usando posiciones (coordenadas)
function parseWithCoordinates(words) {
  const materias = [];
  const columnRanges = [
    { col: 'codigo', min: 0, max: 180 },
    { col: 'nombre', min: 180, max: 600 },
    { col: 'creditos', min: 600, max: 700 },
    { col: 'profesor', min: 700, max: 950 },
    { col: 'horario', min: 950, max: 1400 }
  ];

  const rows = {};

  for (const w of words) {
    const rowKey = Math.round(w.bbox.y0 / 25); // agrupación por fila
    if (!rows[rowKey]) rows[rowKey] = {};

    const col = columnRanges.find(c => w.bbox.x0 >= c.min && w.bbox.x0 < c.max);
    if (col) {
      rows[rowKey][col.col] = (rows[rowKey][col.col] || '') + ' ' + w.text;
    }
  }

  for (const r of Object.values(rows)) {
    if (r.codigo && r.nombre) {
      const horarios = [...(r.horario || '').matchAll(/(Mon|Tue|Wed|Thu|Fri)\((\d{2}:\d{2})-(\d{2}:\d{2})\)/g)]
        .map(h => ({ dia: h[1], horaInicio: h[2], horaFin: h[3] }));

      materias.push({
        codigo: r.codigo.trim(),
        nombre: r.nombre.trim(),
        creditos: (r.creditos || '').trim(),
        profesor: (r.profesor || '').trim(),
        horarios
      });
    }
  }

  return materias;
}

// Mostrar materias detectadas
function renderMaterias(materias) {
  materiasLista.innerHTML = '';
  materias.forEach(materia => {
    const div = document.createElement('div');
    div.className = 'materia';
    div.draggable = true;
    div.innerText = `${materia.codigo} - ${materia.nombre}\nProfesor: ${materia.profesor}\nCréditos: ${materia.creditos}`;
    div.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', JSON.stringify(materia));
    });
    materiasLista.appendChild(div);
  });

  // Hacer que los eventos se puedan arrastrar al calendario
  document.getElementById('calendar').addEventListener('dragover', e => e.preventDefault());
  document.getElementById('calendar').addEventListener('drop', e => {
    e.preventDefault();
    const materia = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (materia.horarios.length > 0) {
      materia.horarios.forEach(h => {
        const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
        const start = getDateForDay(dayMap[h.dia], h.horaInicio);
        const end = getDateForDay(dayMap[h.dia], h.horaFin);
        calendar.addEvent({
          title: `${materia.codigo} - ${materia.nombre}`,
          start,
          end
        });
      });
    }
  });
}

// Convertir día y hora a objeto Date
function getDateForDay(dayIndex, time) {
  const today = new Date();
  const startOfWeek = today.getDate() - today.getDay();
  const date = new Date(today.setDate(startOfWeek + dayIndex));
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}