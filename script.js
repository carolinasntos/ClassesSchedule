const fileInput = document.getElementById('fileInput');
const materiasLista = document.getElementById('materiasLista');
let calendar;

document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    editable: true,
    eventOverlap: true
  });
  calendar.render();
});

// Subir archivo
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const { data } = await Tesseract.recognize(file, 'eng', { logger: m => console.log(m) });
  console.log('OCR detectado:', data.text);

  const materias = parseMaterias(data.text);
  renderMaterias(materias);
  agregarAlCalendario(materias);
});

// Parsear materias con regex
function parseMaterias(text) {
  const materias = [];
  const lineas = text.split('\n').map(l => l.trim()).filter(l => l);

  const regexMateria = /(.*?)\s+\|\s+(.*?)\s+\|\s*([A-Za-z\s]+)?\s*\|\s*(Mon|Tue|Wed|Thu|Fri)\((\d{1,2}:\d{2})-(\d{1,2}:\d{2})\)/i;

  for (const linea of lineas) {
    const match = linea.match(regexMateria);
    if (match) {
      materias.push({
        codigo: match[1].trim(),
        nombre: match[2].trim(),
        profesor: match[3]?.trim() || '',
        horarios: [
          { dia: match[4], horaInicio: match[5], horaFin: match[6] }
        ]
      });
    }
  }
  return materias;
}

// Mostrar materias detectadas
function renderMaterias(materias) {
  materiasLista.innerHTML = '';
  materias.forEach(m => {
    const div = document.createElement('div');
    div.className = 'materia';
    div.innerText = `${m.codigo} - ${m.nombre}\nProfesor: ${m.profesor}`;
    materiasLista.appendChild(div);
  });
}

// Agregar automáticamente al calendario
function agregarAlCalendario(materias) {
  materias.forEach(materia => {
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