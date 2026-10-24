/** Pure business contracts and contact links. No network, DOM, packages or device clock. */
import { calculateElapsed } from '../src/elapsed-time.js';

export const WEEKDAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);
const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ID = /^[a-z][a-z0-9-]*$/;

function requireText(value, label, maximum = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum)
    throw new Error(`Revisar ${label}: texto vacío o demasiado largo.`);
}

function requireHttps(value, hosts, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Enlace ${label} inválido.`);
  }
  if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.username || url.password)
    throw new Error(`Enlace ${label} inválido.`);
}

function validDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

/** Localized labels from ordered ISO weekday names; labels never define the schedule. */
export function formatScheduleDays(days) {
  const labels = days.map((day) => DAY_NAMES[WEEKDAYS.indexOf(day)]);
  const indexes = days.map((day) => WEEKDAYS.indexOf(day));
  const consecutive = indexes.every((day, index) => index === 0 || day === indexes[index - 1] + 1);
  const value =
    consecutive && days.length > 2
      ? `${labels[0]} a ${labels.at(-1)}`
      : new Intl.ListFormat('es-AR', { style: 'long', type: 'conjunction' }).format(labels);
  return value[0].toUpperCase() + value.slice(1);
}

export function formatScheduleTime(time) {
  return time.replace(/^0(?=\d:)/, '');
}

/** null end means only the starting time is known; never infer class duration. */
export function formatSchedulePeriods(periods) {
  return periods
    .map(({ start, end }) =>
      end === null
        ? `${formatScheduleTime(start)} (inicio)`
        : `${formatScheduleTime(start)} a ${formatScheduleTime(end)}`,
    )
    .join(' y ');
}

export function formatOpeningDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date(`${date}T12:00:00-03:00`))
    .replace(',', '');
}

/** The general timetable is referenced, not duplicated between cards, contact and JSON-LD. */
export function getGeneralSchedule(data) {
  return data.activities
    .find((activity) => activity.id === data.hours.generalActivityId)
    ?.schedules.find((schedule) => schedule.id === data.hours.generalScheduleId);
}

export function buildWhatsAppUrl(teacher, message) {
  if (!/^549\d{10}$/.test(teacher?.phoneInternational))
    throw new Error('Teléfono internacional de Argentina inválido.');
  requireText(message, 'mensaje de WhatsApp');
  const url = new URL(`https://wa.me/${teacher.phoneInternational}`);
  url.searchParams.set('text', message);
  return url.href;
}

export function buildScheduleMessage(activity, schedule, teacher) {
  return `Hola ${teacher.name}, quisiera consultar por ${activity.name}, ${formatScheduleDays(schedule.days).toLowerCase()}, ${formatSchedulePeriods(schedule.periods)}${schedule.label ? ` (${schedule.label.toLowerCase()})` : ''}, disponibilidad y cuota.`;
}

/** Keep the business name as fallback: Maps can resolve coordinates to a neighboring shop. */
export function buildDirectionsUrl(data) {
  const map = data.relocation?.maps;
  if (
    !Number.isFinite(map?.latitude) ||
    Math.abs(map.latitude) > 90 ||
    !Number.isFinite(map.longitude) ||
    Math.abs(map.longitude) > 180
  )
    throw new Error('Coordenadas de llegada inválidas.');
  if (typeof map.placeId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(map.placeId))
    throw new Error('Falta la identidad comprobada del negocio en Maps.');
  requireText(data.name, 'nombre del destino', 120);
  requireText(data.address?.locality, 'localidad del destino', 200);
  requireText(data.address?.region, 'provincia del destino', 200);
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set(
    'destination',
    `${data.name}, ${data.address.locality}, ${data.address.region}, Argentina`,
  );
  url.searchParams.set('destination_place_id', map.placeId);
  return url.href;
}

/** Reject unsafe/inconsistent content before HTML, contact links or JSON-LD are generated. */
export function validateBusinessData(data, project) {
  if (data.name !== 'Tu Gimnasio' || data.foundedYear !== 1996 || data.foundedDate !== '1996-11-04')
    throw new Error('Conservar nombre oficial y fecha confirmada de apertura.');
  if (project.publicUrl !== 'https://tu-gimnasio-santa-lucia.github.io/tu-gimnasio-santa-lucia/')
    throw new Error('La dirección pública principal debe conservarse.');
  const anniversary = data.anniversary;
  if (
    !anniversary ||
    anniversary.commemorative !== false ||
    !validDate(anniversary.snapshotDate) ||
    !Number.isSafeInteger(anniversary.referenceYear) ||
    !Number.isSafeInteger(anniversary.years) ||
    anniversary.years < 1 ||
    !Array.isArray(anniversary.metrics) ||
    anniversary.metrics.length !== 4
  )
    throw new Error('Snapshot de antigüedad inválido.');
  const snapshot = calculateElapsed(
    data.foundedDate,
    new Date(`${anniversary.snapshotDate}T00:00:00-03:00`),
  );
  if (
    snapshot.years !== anniversary.years ||
    Number(anniversary.snapshotDate.slice(0, 4)) !== anniversary.referenceYear
  )
    throw new Error('La fecha y los años del snapshot no coinciden.');
  anniversary.metrics.forEach((metric, index) => {
    if (
      metric.id !== ['days', 'hours', 'minutes', 'seconds'][index] ||
      !Number.isSafeInteger(metric.value) ||
      metric.value < 1 ||
      metric.value !== snapshot[metric.id]
    )
      throw new Error('Cifra de antigüedad inválida.');
    requireText(metric.label, 'etiqueta de antigüedad', 40);
  });
  if (data.relocation?.status !== 'scheduled' || !validDate(data.relocation.openingDate))
    throw new Error('La nueva sede tiene una apertura anunciada; no inferir que ya está abierta.');
  const map = data.relocation.maps;
  if (
    !map ||
    map.locationUpdated !== true ||
    typeof map.streetNameUpdated !== 'boolean' ||
    !validDate(map.verifiedAt) ||
    map.coordinateSource !== 'business-profile'
  )
    throw new Error('Falta la comprobación del punto de la nueva sede.');
  buildDirectionsUrl(data);
  requireText(map.displayedStreet, 'calle mostrada por Maps', 200);
  requireHttps(map.referenceUrl, ['maps.app.goo.gl', 'www.google.com'], 'referencia de Maps');
  for (const field of ['street', 'locality', 'region', 'postalCode', 'plusCode'])
    requireText(data.address?.[field], `dirección: ${field}`, 200);
  if (data.address.country !== 'AR') throw new Error('Revisar el país del gimnasio.');
  if (map.streetNameUpdated && map.displayedStreet !== data.address.street)
    throw new Error('Maps actualizado debe coincidir con la dirección confirmada.');
  requireHttps(data.contacts?.instagram, ['www.instagram.com', 'instagram.com'], 'Instagram');
  requireHttps(data.contacts?.maps, ['maps.app.goo.gl', 'www.google.com'], 'Maps');
  requireText(data.contacts.whatsappMessage, 'mensaje general de consulta');
  if (!data.teachers || !Object.keys(data.teachers).length)
    throw new Error('Faltan los profesores.');
  for (const [id, teacher] of Object.entries(data.teachers)) {
    if (!ID.test(id)) throw new Error('Identificador de profesor inválido.');
    requireText(teacher.name, 'nombre del profesor', 80);
    requireText(teacher.phoneDisplay, 'teléfono del profesor', 50);
    buildWhatsAppUrl(teacher, 'Consulta');
  }
  if (!Object.hasOwn(data.teachers, data.contacts.defaultTeacherId))
    throw new Error('Contacto general sin profesor válido.');
  if (!Array.isArray(data.activities) || !data.activities.length)
    throw new Error('Faltan las actividades.');
  const activityIds = new Set();
  for (const activity of data.activities) {
    if (!ID.test(activity.id) || activityIds.has(activity.id))
      throw new Error('Identificador de actividad inválido o duplicado.');
    activityIds.add(activity.id);
    requireText(activity.name, 'actividad', 120);
    requireText(activity.description, 'descripción');
    if (!['yellow', 'blue', 'red', 'white'].includes(activity.accent))
      throw new Error('Acento visual desconocido.');
    if (!Array.isArray(activity.schedules) || !activity.schedules.length)
      throw new Error('Actividad sin horarios confirmados.');
    const scheduleIds = new Set();
    for (const schedule of activity.schedules) {
      if (!ID.test(schedule.id) || scheduleIds.has(schedule.id))
        throw new Error('Identificador de horario inválido o duplicado.');
      scheduleIds.add(schedule.id);
      if (!Object.hasOwn(data.teachers, schedule.teacherId))
        throw new Error('Horario sin profesor válido.');
      if (schedule.label !== null) requireText(schedule.label, 'modalidad de horario', 120);
      if (
        !Array.isArray(schedule.days) ||
        !schedule.days.length ||
        schedule.days.length > 7 ||
        schedule.days.some(
          (day, index) =>
            !WEEKDAYS.includes(day) ||
            (index > 0 && WEEKDAYS.indexOf(day) <= WEEKDAYS.indexOf(schedule.days[index - 1])),
        )
      )
        throw new Error('Días de clase inválidos, repetidos o desordenados.');
      if (!Array.isArray(schedule.periods) || !schedule.periods.length)
        throw new Error('Horario sin franjas.');
      schedule.periods.forEach((period, index) => {
        if (
          !TIME.test(period.start) ||
          (period.end !== null && (!TIME.test(period.end) || period.end <= period.start))
        )
          throw new Error('Franja horaria inválida.');
        if (
          index > 0 &&
          (schedule.periods[index - 1].end === null ||
            schedule.periods[index - 1].end > period.start)
        )
          throw new Error('Franjas de una modalidad superpuestas o sin duración conocida.');
      });
      // Different activities may legitimately overlap; never invent availability or substitutes.
    }
  }
  const general = getGeneralSchedule(data);
  if (!general || general.periods.some((period) => period.end === null))
    throw new Error('La atención general debe referenciar franjas completas.');
  for (const field of ['weekendLabel', 'weekendNotice', 'notice'])
    requireText(data.hours[field], `aviso de atención: ${field}`);
  const mottos = {
    equality: 'Todos somos iguales, la diferencia está en los detalles.',
    returnToBasics: 'Volvamos a las bases.',
    yourPlace: 'Tu lugar, tu gimnasio.',
  };
  if (Object.entries(mottos).some(([key, value]) => data.mottos?.[key] !== value))
    throw new Error('Conservar los tres lemas oficiales.');
  if (/\bFuncional\b/i.test(JSON.stringify(data)))
    throw new Error('Los datos incluyen una actividad retirada.');
  const rating = data.googleRating;
  if (!(
    rating?.value > 0 &&
    rating.value <= 5 &&
    Number.isSafeInteger(rating.reviewCount) &&
    rating.reviewCount > 0 &&
    validDate(rating.verifiedAt)
  ))
    throw new Error('Valoración de Google inválida.');
  requireHttps(rating.source, ['maps.app.goo.gl', 'www.google.com'], 'reseñas de Google');
  return data;
}
