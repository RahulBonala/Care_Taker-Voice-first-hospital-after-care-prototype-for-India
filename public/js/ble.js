// Bluetooth health devices in Chrome (Web Bluetooth). Uses the standard Bluetooth SIG health services,
// so any blood pressure monitor, glucose meter or heart rate strap that follows them can pair:
//   Blood Pressure 0x1810 (measurement 0x2A35), Glucose 0x1808 (0x2A18, records via 0x2A52),
//   Heart Rate 0x180D (0x2A37).
// Watches and rings do not share steps or sleep over these services; they go through the phone's
// health app (Apple Health or Health Connect) instead.

// IEEE 11073 16-bit SFLOAT: 4-bit exponent, 12-bit mantissa, both signed.
export function sfloat(raw) {
  if ([0x07FF, 0x0800, 0x07FE, 0x0802, 0x0801].includes(raw)) return NaN;
  let mantissa = raw & 0x0FFF;
  let exponent = raw >> 12;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (exponent >= 0x08) exponent -= 0x10;
  return mantissa * 10 ** exponent;
}

function dateTime(dv, o) {
  const y = dv.getUint16(o, true);
  if (!y) return null;
  return new Date(y, dv.getUint8(o + 2) - 1, dv.getUint8(o + 3), dv.getUint8(o + 4), dv.getUint8(o + 5), dv.getUint8(o + 6));
}

// Blood Pressure Measurement (0x2A35)
export function parseBloodPressure(dv) {
  const flags = dv.getUint8(0);
  const kpa = flags & 0x01;
  let o = 1;
  let sys = sfloat(dv.getUint16(o, true)); o += 2;
  let dia = sfloat(dv.getUint16(o, true)); o += 2;
  o += 2; // mean arterial pressure
  let time = null;
  if (flags & 0x02) { time = dateTime(dv, o); o += 7; }
  let pulse = null;
  if (flags & 0x04) { pulse = sfloat(dv.getUint16(o, true)); o += 2; }
  if (kpa) { sys *= 7.50062; dia *= 7.50062; }
  return { sys: Math.round(sys), dia: Math.round(dia), pulse: pulse !== null && !Number.isNaN(pulse) ? Math.round(pulse) : undefined, time };
}

// Glucose Measurement (0x2A18)
export function parseGlucose(dv) {
  const flags = dv.getUint8(0);
  let o = 3; // flags, sequence number
  const base = dateTime(dv, o); o += 7;
  let time = base;
  if (flags & 0x01) { const off = dv.getInt16(o, true); o += 2; if (base) time = new Date(base.getTime() + off * 60000); }
  if (!(flags & 0x02)) return null;
  const value = sfloat(dv.getUint16(o, true)); o += 2;
  const typeLoc = dv.getUint8(o);
  // Units: kg/L (flag bit 2 clear) or mol/L (set). Convert to mg/dL.
  const mgdl = flags & 0x04 ? value * 1000 * 18.016 : value * 100000;
  const sampleType = typeLoc & 0x0F;
  return { mgdl: Math.round(mgdl), time, sampleType };
}

// Heart Rate Measurement (0x2A37)
export function parseHeartRate(dv) {
  const flags = dv.getUint8(0);
  return { bpm: flags & 0x01 ? dv.getUint16(1, true) : dv.getUint8(1) };
}

export const bluetoothAvailable = () => !!(navigator.bluetooth && window.isSecureContext);

const SERVICES = {
  bp: { service: 'blood_pressure', char: 'blood_pressure_measurement', mode: 'indicate' },
  glucose: { service: 'glucose', char: 'glucose_measurement', mode: 'notify' },
  hr: { service: 'heart_rate', char: 'heart_rate_measurement', mode: 'notify' },
};

// Pairs one device and calls onReading({ type, value, at }) for every measurement it sends.
// Returns { name, disconnect }.
export async function pair(kind, onReading) {
  const spec = SERVICES[kind];
  if (!spec) throw new Error('This device pairs through the phone health app, not Bluetooth');
  if (!bluetoothAvailable()) throw new Error('Bluetooth pairing needs Chrome on a computer or Android, on https or localhost');
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [spec.service] }] });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(spec.service);
  const ch = await service.getCharacteristic(spec.char);
  ch.addEventListener('characteristicvaluechanged', (e) => {
    const dv = e.target.value;
    try {
      if (kind === 'bp') { const r = parseBloodPressure(dv); onReading({ type: 'bp', value: { sys: r.sys, dia: r.dia, ...(r.pulse ? { pulse: r.pulse } : {}) }, at: r.time }); }
      if (kind === 'hr') onReading({ type: 'heartRate', value: parseHeartRate(dv) });
      if (kind === 'glucose') { const r = parseGlucose(dv); if (r) onReading({ type: 'glucose', value: { mgdl: r.mgdl }, at: r.time }); }
    } catch (err) { console.warn('Could not read a measurement', err); }
  });
  await ch.startNotifications();
  if (kind === 'glucose') {
    // Ask the meter for every stored record: Record Access Control Point, "report stored records", "all records".
    const racp = await service.getCharacteristic('record_access_control_point');
    await racp.startNotifications();
    await racp.writeValue(new Uint8Array([0x01, 0x01]));
  }
  return { name: device.name || 'Bluetooth device', disconnect: () => device.gatt.connected && device.gatt.disconnect() };
}
