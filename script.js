const fileInput = document.getElementById('fileInput');
const materiasLista = document.getElementById('materiasLista');
let calendar;

document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    editable: false,
    eventOverlap: true
  });
  calendar.render();
});

// Subir archivo y ejecutar OCR
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const { data } = await Tesseract.recognize(file, 'eng', { logger: m => console.log(m) });
  console.log('Texto OCR detectado:', data.text);

  const materias = parseMaterias(data.text);
  renderMaterias(materias);
  agregarAlCalendario(materias);
});

// Extraer materias y múltiples horarios
function parseMaterias(text) {
  const materias = [];
  const regex = /(Mon|Tue|Wed|Thu|Fri)\s*\(?(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\)?/gi;
  const lineas = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const linea of lineas) {
    const horarios = [];
    let match;
    while ((match = regex.exec(linea)) !== null) {
      const [, dia, horaInicio, horaFin] = match;
      horarios.push({ dia, horaInicio, horaFin });
    }

    if (horarios.length > 0) {
      const nombre = linea.replace(regex, '').trim() || 'Materia sin nombre';
      materias.push({ nombre, horarios });
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
    div.innerText = `${m.nombre}\n${m.horarios.map(h => `${h.dia} ${h.horaInicio}-${h.horaFin}`).join(', ')}`;
    materiasLista.appendChild(div);
  });
}

// Agregar materias al calendario sin fechas (solo días de la semana)
function agregarAlCalendario(materias) {
  materias.forEach(materia => {
    materia.horarios.forEach(h => {
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const startTime = h.horaInicio;
      const endTime = h.horaFin;

      calendar.addEvent({
        title: materia.nombre,
        startTime: startTime,
        endTime: endTime,
        daysOfWeek: [dayMap[h.dia]] // Repetición semanal
      });
    });
  });
}